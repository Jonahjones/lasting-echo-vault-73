-- STEP 1: Add missing columns to the contacts table
-- This fixes the "target_user_id column not found" error

ALTER TABLE public.contacts 
ADD COLUMN IF NOT EXISTS target_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS confirmed_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;

-- STEP 2: Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_contacts_normalized_email 
ON public.contacts(LOWER(TRIM(email)));

CREATE INDEX IF NOT EXISTS idx_contacts_target_user_id 
ON public.contacts(target_user_id) WHERE target_user_id IS NOT NULL;

-- STEP 3: Fix existing data - link contacts to actual users
UPDATE public.contacts 
SET 
  target_user_id = u.id,
  invitation_status = CASE 
    WHEN invitation_status IN ('pending', 'pending_confirmation') THEN 'registered'
    ELSE invitation_status
  END,
  confirmed_at = CASE 
    WHEN confirmed_at IS NULL THEN NOW()
    ELSE confirmed_at
  END
FROM auth.users u
WHERE LOWER(TRIM(contacts.email)) = LOWER(TRIM(u.email))
AND contacts.target_user_id IS NULL;

-- STEP 4: Create the enhanced contact checking function
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
  SELECT * INTO contact_record
  FROM public.contacts 
  WHERE LOWER(TRIM(email)) = p_email
  LIMIT 1;
  
  debug_info := jsonb_set(debug_info, '{contact_found}', to_jsonb(contact_record.id IS NOT NULL));
  
  -- Count how many users have this contact as trusted (using normalized email)
  SELECT COUNT(*) INTO relationships_count
  FROM public.contacts
  WHERE LOWER(TRIM(email)) = p_email;
  
  debug_info := jsonb_set(debug_info, '{relationships_count}', to_jsonb(relationships_count));
  
  -- Check if the email belongs to an existing user (using normalized email)
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
  
  RETURN jsonb_build_object(
    'contact_exists', contact_record.id IS NOT NULL,
    'contact_id', contact_record.id,
    'contact_name', contact_record.full_name,
    'relationships_count', relationships_count,
    'user_exists', user_exists,
    'existing_user_id', existing_user_id,
    'can_add_contact', true,
    'debug_info', debug_info
  );
END;
$$;

-- STEP 5: Create the enhanced contact addition function
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
  contact_check JSONB;
  debug_info JSONB := '{}'::JSONB;
BEGIN
  -- Extract and normalize contact data
  contact_email := TRIM(LOWER(p_contact_data ->> 'email'));
  contact_full_name := TRIM(p_contact_data ->> 'full_name');
  contact_phone := TRIM(p_contact_data ->> 'phone');
  
  debug_info := jsonb_set(debug_info, '{normalized_email}', to_jsonb(contact_email));
  
  -- Check contact status
  contact_check := public.check_contact_relationships(contact_email);
  debug_info := jsonb_set(debug_info, '{contact_check_result}', contact_check);
  
  -- Check if user already has this contact
  SELECT * INTO contact_record
  FROM public.contacts
  WHERE user_id = p_user_id 
  AND LOWER(TRIM(email)) = contact_email;
  
  IF contact_record.id IS NOT NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'relationship_exists',
      'message', 'You already have this contact in your list',
      'debug_info', debug_info
    );
  END IF;
  
  -- Create the contact relationship
  INSERT INTO public.contacts (
    user_id,
    full_name,
    email,
    phone,
    relationship,
    contact_type,
    role,
    is_primary,
    invitation_status,
    target_user_id,
    confirmed_at
  ) VALUES (
    p_user_id,
    contact_full_name,
    contact_email,
    contact_phone,
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
      WHEN (contact_check ->> 'user_exists')::BOOLEAN 
      THEN (contact_check ->> 'existing_user_id')::UUID
      ELSE NULL 
    END,
    CASE 
      WHEN (contact_check ->> 'user_exists')::BOOLEAN THEN NOW()
      ELSE NULL 
    END
  ) RETURNING * INTO contact_record;
  
  RETURN jsonb_build_object(
    'success', true,
    'message', 'Trusted contact relationship created successfully',
    'relationship', row_to_json(contact_record),
    'user_exists', (contact_check ->> 'user_exists')::BOOLEAN,
    'debug_info', debug_info
  );
END;
$$;

-- STEP 6: Create function to get trusted contact relationships
CREATE OR REPLACE FUNCTION public.get_trusted_contact_relationships(p_user_email TEXT)
RETURNS TABLE (
  id UUID,
  main_user_id UUID,
  main_user_name TEXT,
  main_user_email TEXT,
  role trusted_contact_role,
  is_primary BOOLEAN,
  invitation_status TEXT,
  confirmed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Validate input
  IF p_user_email IS NULL OR TRIM(p_user_email) = '' THEN
    RETURN;
  END IF;
  
  -- Normalize email
  p_user_email := TRIM(LOWER(p_user_email));
  
  RETURN QUERY
  SELECT 
    c.id,
    c.user_id as main_user_id,
    COALESCE(p.display_name, CONCAT(p.first_name, ' ', p.last_name), 'Unknown User') as main_user_name,
    u.email as main_user_email,
    c.role,
    c.is_primary,
    c.invitation_status,
    c.confirmed_at,
    c.created_at
  FROM public.contacts c
  JOIN auth.users u ON u.id = c.user_id
  LEFT JOIN public.profiles p ON p.user_id = c.user_id
  WHERE LOWER(TRIM(c.email)) = p_user_email
  AND c.contact_type = 'trusted'
  ORDER BY c.is_primary DESC, c.created_at DESC;
END;
$$;

-- STEP 7: Grant permissions
GRANT EXECUTE ON FUNCTION public.check_contact_relationships(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.add_trusted_contact_relationship(UUID, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_trusted_contact_relationships(TEXT) TO authenticated;

GRANT EXECUTE ON FUNCTION public.check_contact_relationships(TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.add_trusted_contact_relationship(UUID, JSONB) TO service_role;
GRANT EXECUTE ON FUNCTION public.get_trusted_contact_relationships(TEXT) TO service_role;

-- STEP 8: Verify the fix worked
SELECT 
  c.email,
  c.full_name,
  c.invitation_status,
  c.target_user_id,
  u.email as target_user_email,
  CASE 
    WHEN c.target_user_id IS NOT NULL THEN 'LINKED' 
    ELSE 'NOT_LINKED' 
  END as status
FROM contacts c
LEFT JOIN auth.users u ON u.id = c.target_user_id
WHERE c.contact_type = 'trusted'
ORDER BY c.created_at DESC
LIMIT 10; 