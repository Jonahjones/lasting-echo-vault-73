-- Fix contact-related database functions and permissions
-- This migration ensures all required functions exist and are properly configured

-- Ensure the check_contact_relationships function exists with proper error handling
CREATE OR REPLACE FUNCTION public.check_contact_relationships(p_email TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  contact_record RECORD;
  relationships_count INTEGER := 0;
  user_exists BOOLEAN := FALSE;
  existing_user_id UUID := NULL;
BEGIN
  -- Validate input
  IF p_email IS NULL OR p_email = '' THEN
    RETURN jsonb_build_object(
      'contact_exists', false,
      'contact_id', null,
      'contact_name', null,
      'relationships_count', 0,
      'user_exists', false,
      'existing_user_id', null,
      'can_add_contact', false,
      'error', 'Invalid email provided'
    );
  END IF;

  -- Normalize email
  p_email := TRIM(LOWER(p_email));
  
  -- Check if contact exists in our contacts table (try new structure first)
  BEGIN
    SELECT * INTO contact_record
    FROM public.contacts_new 
    WHERE LOWER(email) = p_email
    LIMIT 1;
    
    -- Count how many users have this contact as trusted
    SELECT COUNT(*) INTO relationships_count
    FROM public.user_trusted_contacts utc
    JOIN public.contacts_new c ON c.id = utc.contact_id
    WHERE LOWER(c.email) = p_email;
    
  EXCEPTION WHEN OTHERS THEN
    -- Fallback to old contacts table if new structure doesn't exist
    SELECT * INTO contact_record
    FROM public.contacts 
    WHERE LOWER(email) = p_email
    LIMIT 1;
    
    SELECT COUNT(*) INTO relationships_count
    FROM public.contacts
    WHERE LOWER(email) = p_email;
  END;
  
  -- Check if the email belongs to an existing user
  BEGIN
    SELECT EXISTS (
      SELECT 1 FROM auth.users WHERE LOWER(email) = p_email
    ) INTO user_exists;
    
    -- Get the user ID if they exist
    IF user_exists THEN
      SELECT id INTO existing_user_id 
      FROM auth.users 
      WHERE LOWER(email) = p_email 
      LIMIT 1;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    -- If we can't access auth.users, assume user doesn't exist
    user_exists := FALSE;
    existing_user_id := NULL;
  END;
  
  RETURN jsonb_build_object(
    'contact_exists', contact_record.id IS NOT NULL,
    'contact_id', contact_record.id,
    'contact_name', contact_record.full_name,
    'relationships_count', relationships_count,
    'user_exists', user_exists,
    'existing_user_id', existing_user_id,
    'can_add_contact', true -- Always true in many-to-many system
  );
  
EXCEPTION WHEN OTHERS THEN
  -- Return error information for debugging
  RETURN jsonb_build_object(
    'contact_exists', false,
    'contact_id', null,
    'contact_name', null,
    'relationships_count', 0,
    'user_exists', false,
    'existing_user_id', null,
    'can_add_contact', false,
    'error', SQLERRM,
    'error_code', SQLSTATE
  );
END;
$$;

-- Ensure the check_existing_contact function exists as fallback
CREATE OR REPLACE FUNCTION public.check_existing_contact(
  p_user_id UUID, 
  p_email TEXT
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  existing_contact RECORD;
  user_exists BOOLEAN := FALSE;
  existing_user_id UUID := NULL;
BEGIN
  -- Validate inputs
  IF p_user_id IS NULL OR p_email IS NULL OR p_email = '' THEN
    RETURN jsonb_build_object(
      'contact_exists', false,
      'contact_id', null,
      'contact_name', null,
      'contact_type', null,
      'invitation_status', null,
      'user_exists', false,
      'existing_user_id', null,
      'can_add_contact', false,
      'error', 'Invalid parameters provided'
    );
  END IF;

  -- Normalize email
  p_email := TRIM(LOWER(p_email));
  
  -- Check if contact already exists for this user
  SELECT id, full_name, contact_type, invitation_status, target_user_id
  INTO existing_contact
  FROM public.contacts 
  WHERE user_id = p_user_id 
  AND LOWER(email) = p_email
  LIMIT 1;
  
  -- Check if the email belongs to an existing user
  BEGIN
    SELECT EXISTS (
      SELECT 1 FROM auth.users WHERE LOWER(email) = p_email
    ) INTO user_exists;
    
    -- Get the user ID if they exist
    IF user_exists THEN
      SELECT id INTO existing_user_id 
      FROM auth.users 
      WHERE LOWER(email) = p_email 
      LIMIT 1;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    user_exists := FALSE;
    existing_user_id := NULL;
  END;
  
  RETURN jsonb_build_object(
    'contact_exists', existing_contact.id IS NOT NULL,
    'contact_id', existing_contact.id,
    'contact_name', existing_contact.full_name,
    'contact_type', existing_contact.contact_type,
    'invitation_status', existing_contact.invitation_status,
    'user_exists', user_exists,
    'existing_user_id', existing_user_id,
    'can_add_contact', existing_contact.id IS NULL
  );
  
EXCEPTION WHEN OTHERS THEN
  -- Return error information for debugging
  RETURN jsonb_build_object(
    'contact_exists', false,
    'contact_id', null,
    'contact_name', null,
    'contact_type', null,
    'invitation_status', null,
    'user_exists', false,
    'existing_user_id', null,
    'can_add_contact', false,
    'error', SQLERRM,
    'error_code', SQLSTATE
  );
END;
$$;

-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION public.check_contact_relationships(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_existing_contact(UUID, TEXT) TO authenticated;

-- Grant execute permissions to service role for Edge Functions
GRANT EXECUTE ON FUNCTION public.check_contact_relationships(TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.check_existing_contact(UUID, TEXT) TO service_role;

-- Add comments for documentation
COMMENT ON FUNCTION public.check_contact_relationships IS 'Check if a contact exists globally and count their relationships (with error handling)';
COMMENT ON FUNCTION public.check_existing_contact IS 'Check if a contact already exists for a specific user (fallback function with error handling)';

-- Create a diagnostic function to help troubleshoot issues
CREATE OR REPLACE FUNCTION public.diagnose_contact_system()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result JSONB := '{}';
  table_exists BOOLEAN;
  function_exists BOOLEAN;
BEGIN
  -- Check if new tables exist
  SELECT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'contacts_new'
  ) INTO table_exists;
  result := jsonb_set(result, '{contacts_new_exists}', to_jsonb(table_exists));
  
  SELECT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'user_trusted_contacts'
  ) INTO table_exists;
  result := jsonb_set(result, '{user_trusted_contacts_exists}', to_jsonb(table_exists));
  
  -- Check if old table exists
  SELECT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'contacts'
  ) INTO table_exists;
  result := jsonb_set(result, '{contacts_old_exists}', to_jsonb(table_exists));
  
  -- Check if functions exist
  SELECT EXISTS (
    SELECT FROM information_schema.routines 
    WHERE routine_schema = 'public' AND routine_name = 'check_contact_relationships'
  ) INTO function_exists;
  result := jsonb_set(result, '{check_contact_relationships_exists}', to_jsonb(function_exists));
  
  SELECT EXISTS (
    SELECT FROM information_schema.routines 
    WHERE routine_schema = 'public' AND routine_name = 'check_existing_contact'
  ) INTO function_exists;
  result := jsonb_set(result, '{check_existing_contact_exists}', to_jsonb(function_exists));
  
  RETURN result;
END;
$$;

-- Grant execute permission to authenticated users for diagnostics
GRANT EXECUTE ON FUNCTION public.diagnose_contact_system() TO authenticated;
GRANT EXECUTE ON FUNCTION public.diagnose_contact_system() TO service_role; 