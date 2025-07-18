-- Fix add_trusted_contact_relationship function with comprehensive improvements
-- This migration addresses email normalization, debugging, error handling, and validation

-- Drop and recreate the function with improvements
DROP FUNCTION IF EXISTS public.add_trusted_contact_relationship(UUID, JSONB);

-- Create improved version of add_trusted_contact_relationship function
CREATE OR REPLACE FUNCTION public.add_trusted_contact_relationship(
  p_user_id UUID,
  p_contact_data JSONB
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  contact_email TEXT;
  contact_full_name TEXT;
  contact_phone TEXT;
  contact_record RECORD;
  relationship_record RECORD;
  contact_check JSONB;
  debug_info JSONB := '{}'::JSONB;
  step_info TEXT;
BEGIN
  -- Step 1: Input validation and normalization
  step_info := 'input_validation';
  debug_info := jsonb_set(debug_info, '{step}', to_jsonb(step_info));
  debug_info := jsonb_set(debug_info, '{input_user_id}', to_jsonb(p_user_id));
  debug_info := jsonb_set(debug_info, '{input_data}', p_contact_data);
  
  -- Validate required inputs
  IF p_user_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'invalid_input',
      'message', 'User ID is required',
      'debug_info', debug_info
    );
  END IF;
  
  IF p_contact_data IS NULL OR p_contact_data ->> 'email' IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'invalid_input',
      'message', 'Contact email is required',
      'debug_info', debug_info
    );
  END IF;
  
  -- Extract and normalize contact data
  contact_email := TRIM(LOWER(p_contact_data ->> 'email'));
  contact_full_name := TRIM(p_contact_data ->> 'full_name');
  contact_phone := TRIM(p_contact_data ->> 'phone');
  
  -- Validate email format (basic check)
  IF contact_email !~ '^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$' THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'invalid_email',
      'message', 'Invalid email format',
      'debug_info', debug_info
    );
  END IF;
  
  -- Validate full name is provided
  IF contact_full_name IS NULL OR contact_full_name = '' THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'invalid_input',
      'message', 'Contact full name is required',
      'debug_info', debug_info
    );
  END IF;
  
  debug_info := jsonb_set(debug_info, '{normalized_email}', to_jsonb(contact_email));
  debug_info := jsonb_set(debug_info, '{normalized_name}', to_jsonb(contact_full_name));
  
  -- Step 2: Check contact status
  step_info := 'check_contact_status';
  debug_info := jsonb_set(debug_info, '{step}', to_jsonb(step_info));
  
  BEGIN
    contact_check := public.check_contact_relationships(contact_email);
    debug_info := jsonb_set(debug_info, '{contact_check_result}', contact_check);
  EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'check_contact_failed',
      'message', 'Failed to check contact status: ' || SQLERRM,
      'debug_info', debug_info
    );
  END;
  
  -- Step 3: Check if user already has this contact (with normalized email)
  step_info := 'check_existing_relationship';
  debug_info := jsonb_set(debug_info, '{step}', to_jsonb(step_info));
  
  BEGIN
    SELECT * INTO relationship_record
    FROM public.user_trusted_contacts utc
    JOIN public.contacts_new c ON c.id = utc.contact_id
    WHERE utc.user_id = p_user_id 
    AND LOWER(TRIM(c.email)) = contact_email;
    
    debug_info := jsonb_set(debug_info, '{existing_relationship_found}', to_jsonb(relationship_record.id IS NOT NULL));
    
    IF relationship_record.id IS NOT NULL THEN
      RETURN jsonb_build_object(
        'success', false,
        'error', 'relationship_exists',
        'message', 'You already have this contact in your list',
        'existing_relationship_id', relationship_record.id,
        'debug_info', debug_info
      );
    END IF;
  EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'relationship_check_failed',
      'message', 'Failed to check existing relationships: ' || SQLERRM,
      'debug_info', debug_info
    );
  END;
  
  -- Step 4: Get or create the contact record
  step_info := 'get_or_create_contact';
  debug_info := jsonb_set(debug_info, '{step}', to_jsonb(step_info));
  
  BEGIN
    SELECT * INTO contact_record
    FROM public.contacts_new 
    WHERE LOWER(TRIM(email)) = contact_email;
    
    debug_info := jsonb_set(debug_info, '{contact_exists}', to_jsonb(contact_record.id IS NOT NULL));
    
    IF contact_record.id IS NULL THEN
      -- Create new contact with normalized data
      INSERT INTO public.contacts_new (
        email,
        full_name,
        phone,
        target_user_id
      ) VALUES (
        contact_email,
        contact_full_name,
        contact_phone,
        CASE 
          WHEN (contact_check ->> 'user_exists')::BOOLEAN 
          THEN (contact_check ->> 'existing_user_id')::UUID
          ELSE NULL 
        END
      ) RETURNING * INTO contact_record;
      
      debug_info := jsonb_set(debug_info, '{created_new_contact}', to_jsonb(true));
      debug_info := jsonb_set(debug_info, '{new_contact_id}', to_jsonb(contact_record.id));
    ELSE
      debug_info := jsonb_set(debug_info, '{used_existing_contact}', to_jsonb(true));
      debug_info := jsonb_set(debug_info, '{existing_contact_id}', to_jsonb(contact_record.id));
    END IF;
  EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'contact_creation_failed',
      'message', 'Failed to create or retrieve contact: ' || SQLERRM,
      'debug_info', debug_info
    );
  END;
  
  -- Step 5: Create the relationship
  step_info := 'create_relationship';
  debug_info := jsonb_set(debug_info, '{step}', to_jsonb(step_info));
  
  BEGIN
    INSERT INTO public.user_trusted_contacts (
      user_id,
      contact_id,
      relationship,
      contact_type,
      role,
      is_primary,
      invitation_status,
      confirmed_at
    ) VALUES (
      p_user_id,
      contact_record.id,
      p_contact_data ->> 'relationship',
      COALESCE((p_contact_data ->> 'contact_type')::contact_type, 'trusted'),
      CASE 
        WHEN COALESCE(p_contact_data ->> 'contact_type', 'trusted') = 'trusted' 
        THEN COALESCE((p_contact_data ->> 'role')::trusted_contact_role, 'legacy_messenger')
        ELSE NULL 
      END,
      COALESCE((p_contact_data ->> 'is_primary')::BOOLEAN, false),
      CASE 
        WHEN (contact_check ->> 'user_exists')::BOOLEAN THEN 'registered'
        ELSE 'pending_confirmation'
      END,
      CASE 
        WHEN (contact_check ->> 'user_exists')::BOOLEAN THEN NOW()
        ELSE NULL 
      END
    ) RETURNING * INTO relationship_record;
    
    debug_info := jsonb_set(debug_info, '{relationship_created}', to_jsonb(true));
    debug_info := jsonb_set(debug_info, '{relationship_id}', to_jsonb(relationship_record.id));
    
  EXCEPTION WHEN unique_violation THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'relationship_exists',
      'message', 'A relationship between this user and contact already exists',
      'debug_info', debug_info
    );
  EXCEPTION WHEN foreign_key_violation THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'foreign_key_violation',
      'message', 'Foreign key constraint violation - invalid user ID or contact ID',
      'debug_info', debug_info
    );
  EXCEPTION WHEN check_violation THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'check_constraint_violation',
      'message', 'Check constraint violation - invalid role or contact type combination',
      'debug_info', debug_info
    );
  EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'relationship_creation_failed',
      'message', 'Failed to create relationship: ' || SQLERRM,
      'debug_info', debug_info
    );
  END;
  
  -- Step 6: Success response
  step_info := 'success';
  debug_info := jsonb_set(debug_info, '{step}', to_jsonb(step_info));
  
  RETURN jsonb_build_object(
    'success', true,
    'message', 'Trusted contact relationship created successfully',
    'relationship', row_to_json(relationship_record),
    'contact', row_to_json(contact_record),
    'user_exists', (contact_check ->> 'user_exists')::BOOLEAN,
    'is_new_contact', contact_check ->> 'contact_exists' = 'false',
    'debug_info', debug_info
  );
  
-- Catch any unexpected errors
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object(
    'success', false,
    'error', 'unexpected_error',
    'message', 'An unexpected error occurred: ' || SQLERRM,
    'debug_info', debug_info
  );
END;
$$;

-- Also improve the check_contact_relationships function with better email normalization
CREATE OR REPLACE FUNCTION public.check_contact_relationships(p_email TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  contact_record RECORD;
  relationships_count INTEGER;
  user_exists BOOLEAN := FALSE;
  existing_user_id UUID := NULL;
  debug_info JSONB := '{}'::JSONB;
BEGIN
  -- Input validation and normalization
  IF p_email IS NULL OR TRIM(p_email) = '' THEN
    RETURN jsonb_build_object(
      'contact_exists', false,
      'contact_id', null,
      'contact_name', null,
      'relationships_count', 0,
      'user_exists', false,
      'existing_user_id', null,
      'can_add_contact', false,
      'error', 'Invalid email provided',
      'debug_info', debug_info
    );
  END IF;

  -- Normalize email (trim whitespace and convert to lowercase)
  p_email := TRIM(LOWER(p_email));
  debug_info := jsonb_set(debug_info, '{normalized_email}', to_jsonb(p_email));
  
  -- Check if contact exists in our contacts table (using normalized email)
  BEGIN
    SELECT * INTO contact_record
    FROM public.contacts_new 
    WHERE LOWER(TRIM(email)) = p_email
    LIMIT 1;
    
    debug_info := jsonb_set(debug_info, '{contact_found}', to_jsonb(contact_record.id IS NOT NULL));
  EXCEPTION WHEN OTHERS THEN
    debug_info := jsonb_set(debug_info, '{contact_search_error}', to_jsonb(SQLERRM));
  END;
  
  -- Count how many users have this contact as trusted (using normalized email)
  BEGIN
    SELECT COUNT(*) INTO relationships_count
    FROM public.user_trusted_contacts utc
    JOIN public.contacts_new c ON c.id = utc.contact_id
    WHERE LOWER(TRIM(c.email)) = p_email;
    
    debug_info := jsonb_set(debug_info, '{relationships_count}', to_jsonb(relationships_count));
  EXCEPTION WHEN OTHERS THEN
    relationships_count := 0;
    debug_info := jsonb_set(debug_info, '{relationships_count_error}', to_jsonb(SQLERRM));
  END;
  
  -- Check if the email belongs to an existing user (using normalized email)
  BEGIN
    SELECT EXISTS (
      SELECT 1 FROM auth.users WHERE LOWER(TRIM(email)) = p_email
    ) INTO user_exists;
    
    -- Get the user ID if they exist
    IF user_exists THEN
      SELECT id INTO existing_user_id 
      FROM auth.users 
      WHERE LOWER(TRIM(email)) = p_email 
      LIMIT 1;
    END IF;
    
    debug_info := jsonb_set(debug_info, '{user_exists}', to_jsonb(user_exists));
    debug_info := jsonb_set(debug_info, '{existing_user_id}', to_jsonb(existing_user_id));
  EXCEPTION WHEN OTHERS THEN
    user_exists := FALSE;
    existing_user_id := NULL;
    debug_info := jsonb_set(debug_info, '{user_check_error}', to_jsonb(SQLERRM));
  END;
  
  RETURN jsonb_build_object(
    'contact_exists', contact_record.id IS NOT NULL,
    'contact_id', contact_record.id,
    'contact_name', contact_record.full_name,
    'relationships_count', relationships_count,
    'user_exists', user_exists,
    'existing_user_id', existing_user_id,
    'can_add_contact', true, -- Always true in many-to-many system
    'debug_info', debug_info
  );
END;
$$;

-- Update the get_user_contacts function to use normalized email comparisons
CREATE OR REPLACE FUNCTION public.get_user_contacts(p_user_id UUID)
RETURNS TABLE (
  id UUID,
  contact_id UUID,
  full_name TEXT,
  email TEXT,
  phone TEXT,
  relationship TEXT,
  contact_type contact_type,
  role trusted_contact_role,
  is_primary BOOLEAN,
  invitation_status TEXT,
  confirmed_at TIMESTAMP WITH TIME ZONE,
  target_user_id UUID,
  created_at TIMESTAMP WITH TIME ZONE
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Validate input
  IF p_user_id IS NULL THEN
    RAISE EXCEPTION 'User ID cannot be null';
  END IF;
  
  RETURN QUERY
  SELECT 
    utc.id,
    c.id as contact_id,
    c.full_name,
    LOWER(TRIM(c.email)) as email, -- Return normalized email
    c.phone,
    utc.relationship,
    utc.contact_type,
    utc.role,
    utc.is_primary,
    utc.invitation_status,
    utc.confirmed_at,
    c.target_user_id,
    utc.created_at
  FROM public.user_trusted_contacts utc
  JOIN public.contacts_new c ON c.id = utc.contact_id
  WHERE utc.user_id = p_user_id
  ORDER BY utc.contact_type DESC, utc.is_primary DESC, utc.created_at DESC;
END;
$$;

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION public.add_trusted_contact_relationship(UUID, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_contact_relationships(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_contacts(UUID) TO authenticated;

-- Grant service role permissions for edge functions
GRANT EXECUTE ON FUNCTION public.add_trusted_contact_relationship(UUID, JSONB) TO service_role;
GRANT EXECUTE ON FUNCTION public.check_contact_relationships(TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.get_user_contacts(UUID) TO service_role;

-- Update comments for documentation
COMMENT ON FUNCTION public.add_trusted_contact_relationship IS 'Safely add a trusted contact relationship with comprehensive validation, email normalization, and debug logging';
COMMENT ON FUNCTION public.check_contact_relationships IS 'Check if a contact exists with normalized email handling and debug information';
COMMENT ON FUNCTION public.get_user_contacts IS 'Get all contacts for a user with normalized email output'; 