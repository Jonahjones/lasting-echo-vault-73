-- Fix contact creation logic to prevent duplicates
-- Add unique constraint and improve duplicate handling

-- Add unique constraint to prevent duplicate contacts per user
-- Use conditional creation to avoid conflicts if constraint already exists
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'unique_user_contact_email'
  ) THEN
    ALTER TABLE public.contacts 
    ADD CONSTRAINT unique_user_contact_email UNIQUE (user_id, email);
  END IF;
END $$;

-- Create index for efficient lookups on email (case-insensitive)
CREATE INDEX IF NOT EXISTS idx_contacts_email_lower 
ON public.contacts (user_id, LOWER(email)) 
WHERE email IS NOT NULL;

-- Create function to check if contact already exists for a user
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
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.check_existing_contact(UUID, TEXT) TO authenticated;

-- Create function to safely create or update contact
CREATE OR REPLACE FUNCTION public.create_or_update_contact(
  p_user_id UUID,
  p_contact_data JSONB
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result JSONB;
  existing_check JSONB;
  contact_email TEXT;
  new_contact RECORD;
BEGIN
  -- Extract and normalize email
  contact_email := TRIM(LOWER(p_contact_data ->> 'email'));
  
  -- Check if contact already exists
  existing_check := public.check_existing_contact(p_user_id, contact_email);
  
  -- If contact already exists, return error
  IF (existing_check ->> 'contact_exists')::BOOLEAN THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'contact_exists',
      'message', 'A contact with this email already exists',
      'existing_contact', existing_check
    );
  END IF;
  
  -- Prepare contact data with target_user_id if user exists
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
    p_contact_data ->> 'full_name',
    contact_email,
    p_contact_data ->> 'phone',
    p_contact_data ->> 'relationship',
    (p_contact_data ->> 'contact_type')::contact_type,
    CASE 
      WHEN p_contact_data ->> 'contact_type' = 'trusted' 
      THEN (p_contact_data ->> 'role')::trusted_contact_role 
      ELSE NULL 
    END,
    COALESCE((p_contact_data ->> 'is_primary')::BOOLEAN, false),
    CASE 
      WHEN (existing_check ->> 'user_exists')::BOOLEAN THEN 'registered'
      ELSE 'pending'
    END,
    CASE 
      WHEN (existing_check ->> 'user_exists')::BOOLEAN 
      THEN (existing_check ->> 'existing_user_id')::UUID
      ELSE NULL 
    END,
    CASE 
      WHEN (existing_check ->> 'user_exists')::BOOLEAN THEN NOW()
      ELSE NULL 
    END
  ) RETURNING * INTO new_contact;
  
  RETURN jsonb_build_object(
    'success', true,
    'contact', row_to_json(new_contact),
    'user_exists', (existing_check ->> 'user_exists')::BOOLEAN,
    'existing_user_id', existing_check ->> 'existing_user_id'
  );
  
EXCEPTION WHEN unique_violation THEN
  -- Handle race condition where contact was created between check and insert
  RETURN jsonb_build_object(
    'success', false,
    'error', 'contact_exists',
    'message', 'A contact with this email already exists'
  );
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.create_or_update_contact(UUID, JSONB) TO authenticated;

-- Add comment for documentation
COMMENT ON FUNCTION public.check_existing_contact IS 'Check if a contact already exists for a user and if the email belongs to an existing user';
COMMENT ON FUNCTION public.create_or_update_contact IS 'Safely create a new contact with duplicate checking and proper user linking';
COMMENT ON CONSTRAINT unique_user_contact_email ON public.contacts IS 'Prevent duplicate contacts with same email for same user'; 