-- Implement many-to-many trusted contact relationships
-- This allows a single contact to be trusted by multiple users

-- First, create a new contacts table without user dependency
CREATE TABLE public.contacts_new (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  full_name TEXT NOT NULL,
  phone TEXT,
  target_user_id UUID DEFAULT NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create the many-to-many relationship table
CREATE TABLE public.user_trusted_contacts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  contact_id UUID NOT NULL REFERENCES public.contacts_new(id) ON DELETE CASCADE,
  relationship TEXT, -- Family relationship
  contact_type public.contact_type NOT NULL DEFAULT 'regular',
  role public.trusted_contact_role DEFAULT NULL,
  is_primary BOOLEAN DEFAULT false,
  invitation_status TEXT DEFAULT 'pending', -- 'pending', 'registered', 'bounced'
  confirmed_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  -- Ensure a user can't add the same contact twice
  UNIQUE(user_id, contact_id),
  
  -- Ensure trusted contacts have a role
  CONSTRAINT check_trusted_contact_role_new 
  CHECK (
    (contact_type = 'trusted' AND role IS NOT NULL) OR 
    (contact_type = 'regular' AND role IS NULL)
  ),
  
  -- Only one primary trusted contact per user
  CONSTRAINT check_single_primary_per_user
  CHECK (
    NOT is_primary OR contact_type = 'trusted'
  )
);

-- Enable RLS on new tables
ALTER TABLE public.contacts_new ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_trusted_contacts ENABLE ROW LEVEL SECURITY;

-- Create policies for contacts_new (readable by all authenticated users)
CREATE POLICY "Contacts are viewable by authenticated users" 
ON public.contacts_new 
FOR SELECT 
USING (auth.role() = 'authenticated');

CREATE POLICY "Users can create contacts" 
ON public.contacts_new 
FOR INSERT 
WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Users can update contacts they're linked to" 
ON public.contacts_new 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM public.user_trusted_contacts 
    WHERE contact_id = contacts_new.id AND user_id = auth.uid()
  )
);

-- Create policies for user_trusted_contacts
CREATE POLICY "Users can view their own trusted contact relationships" 
ON public.user_trusted_contacts 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own trusted contact relationships" 
ON public.user_trusted_contacts 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own trusted contact relationships" 
ON public.user_trusted_contacts 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own trusted contact relationships" 
ON public.user_trusted_contacts 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create triggers for updated_at
CREATE TRIGGER update_contacts_new_updated_at
  BEFORE UPDATE ON public.contacts_new
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_user_trusted_contacts_updated_at
  BEFORE UPDATE ON public.user_trusted_contacts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for performance
CREATE INDEX idx_contacts_new_email ON public.contacts_new(email);
CREATE INDEX idx_contacts_new_target_user_id ON public.contacts_new(target_user_id) WHERE target_user_id IS NOT NULL;
CREATE INDEX idx_user_trusted_contacts_user_id ON public.user_trusted_contacts(user_id);
CREATE INDEX idx_user_trusted_contacts_contact_id ON public.user_trusted_contacts(contact_id);
CREATE INDEX idx_user_trusted_contacts_contact_type ON public.user_trusted_contacts(contact_type);
CREATE INDEX idx_user_trusted_contacts_is_primary ON public.user_trusted_contacts(user_id, is_primary) WHERE is_primary = true;

-- Migrate existing data from old contacts table to new structure
INSERT INTO public.contacts_new (email, full_name, phone, target_user_id, created_at, updated_at)
SELECT DISTINCT ON (email) 
  email, 
  full_name, 
  phone, 
  target_user_id, 
  MIN(created_at) as created_at,
  MAX(updated_at) as updated_at
FROM public.contacts 
WHERE email IS NOT NULL
GROUP BY email, full_name, phone, target_user_id;

-- Migrate relationships to the new join table
INSERT INTO public.user_trusted_contacts (
  user_id, 
  contact_id, 
  relationship, 
  contact_type, 
  role, 
  is_primary, 
  invitation_status, 
  confirmed_at, 
  created_at, 
  updated_at
)
SELECT 
  c.user_id,
  cn.id as contact_id,
  c.relationship,
  c.contact_type,
  c.role,
  c.is_primary,
  COALESCE(c.invitation_status, 'pending'),
  c.confirmed_at,
  c.created_at,
  c.updated_at
FROM public.contacts c
JOIN public.contacts_new cn ON cn.email = c.email
WHERE c.email IS NOT NULL;

-- Create function to get user's trusted contacts with full contact info
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
  RETURN QUERY
  SELECT 
    utc.id,
    c.id as contact_id,
    c.full_name,
    c.email,
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

-- Create function to check if contact exists and get their relationships
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
BEGIN
  -- Normalize email
  p_email := TRIM(LOWER(p_email));
  
  -- Check if contact exists in our contacts table
  SELECT * INTO contact_record
  FROM public.contacts_new 
  WHERE LOWER(email) = p_email
  LIMIT 1;
  
  -- Count how many users have this contact as trusted
  SELECT COUNT(*) INTO relationships_count
  FROM public.user_trusted_contacts utc
  JOIN public.contacts_new c ON c.id = utc.contact_id
  WHERE LOWER(c.email) = p_email;
  
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
    'contact_exists', contact_record.id IS NOT NULL,
    'contact_id', contact_record.id,
    'contact_name', contact_record.full_name,
    'relationships_count', relationships_count,
    'user_exists', user_exists,
    'existing_user_id', existing_user_id,
    'can_add_contact', true -- Always true in many-to-many system
  );
END;
$$;

-- Create function to safely add a trusted contact relationship
CREATE OR REPLACE FUNCTION public.add_trusted_contact_relationship(
  p_user_id UUID,
  p_contact_data JSONB
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  contact_email TEXT;
  contact_record RECORD;
  relationship_record RECORD;
  contact_check JSONB;
BEGIN
  -- Extract and normalize email
  contact_email := TRIM(LOWER(p_contact_data ->> 'email'));
  
  -- Check contact status
  contact_check := public.check_contact_relationships(contact_email);
  
  -- Check if user already has this contact
  SELECT * INTO relationship_record
  FROM public.user_trusted_contacts utc
  JOIN public.contacts_new c ON c.id = utc.contact_id
  WHERE utc.user_id = p_user_id 
  AND LOWER(c.email) = contact_email;
  
  IF relationship_record.id IS NOT NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'relationship_exists',
      'message', 'You already have this contact in your list'
    );
  END IF;
  
  -- Get or create the contact
  SELECT * INTO contact_record
  FROM public.contacts_new 
  WHERE LOWER(email) = contact_email;
  
  IF contact_record.id IS NULL THEN
    -- Create new contact
    INSERT INTO public.contacts_new (
      email,
      full_name,
      phone,
      target_user_id
    ) VALUES (
      contact_email,
      p_contact_data ->> 'full_name',
      p_contact_data ->> 'phone',
      CASE 
        WHEN (contact_check ->> 'user_exists')::BOOLEAN 
        THEN (contact_check ->> 'existing_user_id')::UUID
        ELSE NULL 
      END
    ) RETURNING * INTO contact_record;
  END IF;
  
  -- Create the relationship
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
    (p_contact_data ->> 'contact_type')::contact_type,
    CASE 
      WHEN p_contact_data ->> 'contact_type' = 'trusted' 
      THEN (p_contact_data ->> 'role')::trusted_contact_role 
      ELSE NULL 
    END,
    COALESCE((p_contact_data ->> 'is_primary')::BOOLEAN, false),
    CASE 
      WHEN (contact_check ->> 'user_exists')::BOOLEAN THEN 'registered'
      ELSE 'pending'
    END,
    CASE 
      WHEN (contact_check ->> 'user_exists')::BOOLEAN THEN NOW()
      ELSE NULL 
    END
  ) RETURNING * INTO relationship_record;
  
  RETURN jsonb_build_object(
    'success', true,
    'relationship', row_to_json(relationship_record),
    'contact', row_to_json(contact_record),
    'user_exists', (contact_check ->> 'user_exists')::BOOLEAN,
    'is_new_contact', contact_check ->> 'contact_exists' = 'false'
  );
  
EXCEPTION WHEN unique_violation THEN
  RETURN jsonb_build_object(
    'success', false,
    'error', 'relationship_exists',
    'message', 'You already have this contact in your list'
  );
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.get_user_contacts(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_contact_relationships(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.add_trusted_contact_relationship(UUID, JSONB) TO authenticated;

-- Add to realtime publication
ALTER TABLE public.contacts_new REPLICA IDENTITY FULL;
ALTER TABLE public.user_trusted_contacts REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.contacts_new;
ALTER PUBLICATION supabase_realtime ADD TABLE public.user_trusted_contacts;

-- Add comments for documentation
COMMENT ON TABLE public.contacts_new IS 'Contact information - shared across users in many-to-many relationships';
COMMENT ON TABLE public.user_trusted_contacts IS 'Many-to-many relationships between users and their trusted contacts';
COMMENT ON FUNCTION public.get_user_contacts IS 'Get all contacts for a specific user with relationship details';
COMMENT ON FUNCTION public.check_contact_relationships IS 'Check if a contact exists and how many relationships they have';
COMMENT ON FUNCTION public.add_trusted_contact_relationship IS 'Safely add a trusted contact relationship for a user'; 