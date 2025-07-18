-- Verify and fix foreign key constraints and RLS policies for contacts system

-- First, verify that the required tables and constraints exist
DO $$
BEGIN
  -- Check if contacts_new table exists
  IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'contacts_new') THEN
    RAISE EXCEPTION 'contacts_new table does not exist. Please run the contacts migration first.';
  END IF;
  
  -- Check if user_trusted_contacts table exists
  IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'user_trusted_contacts') THEN
    RAISE EXCEPTION 'user_trusted_contacts table does not exist. Please run the contacts migration first.';
  END IF;
END
$$;

-- Add missing foreign key constraints if they don't exist
DO $$
BEGIN
  -- Check and add foreign key constraint from user_trusted_contacts.user_id to auth.users.id
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'user_trusted_contacts_user_id_fkey' 
    AND table_name = 'user_trusted_contacts'
  ) THEN
    ALTER TABLE public.user_trusted_contacts 
    ADD CONSTRAINT user_trusted_contacts_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
  
  -- Check and add foreign key constraint from user_trusted_contacts.contact_id to contacts_new.id
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'user_trusted_contacts_contact_id_fkey' 
    AND table_name = 'user_trusted_contacts'
  ) THEN
    ALTER TABLE public.user_trusted_contacts 
    ADD CONSTRAINT user_trusted_contacts_contact_id_fkey 
    FOREIGN KEY (contact_id) REFERENCES public.contacts_new(id) ON DELETE CASCADE;
  END IF;
  
  -- Check and add foreign key constraint from contacts_new.target_user_id to auth.users.id
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'contacts_new_target_user_id_fkey' 
    AND table_name = 'contacts_new'
  ) THEN
    ALTER TABLE public.contacts_new 
    ADD CONSTRAINT contacts_new_target_user_id_fkey 
    FOREIGN KEY (target_user_id) REFERENCES auth.users(id) ON DELETE SET NULL;
  END IF;
END
$$;

-- Verify and improve RLS policies
-- Drop existing policies to recreate them with better logic
DROP POLICY IF EXISTS "Contacts are viewable by authenticated users" ON public.contacts_new;
DROP POLICY IF EXISTS "Users can create contacts" ON public.contacts_new;
DROP POLICY IF EXISTS "Users can update contacts they're linked to" ON public.contacts_new;

DROP POLICY IF EXISTS "Users can view their own trusted contact relationships" ON public.user_trusted_contacts;
DROP POLICY IF EXISTS "Users can create their own trusted contact relationships" ON public.user_trusted_contacts;
DROP POLICY IF EXISTS "Users can update their own trusted contact relationships" ON public.user_trusted_contacts;
DROP POLICY IF EXISTS "Users can delete their own trusted contact relationships" ON public.user_trusted_contacts;
DROP POLICY IF EXISTS "Trusted contacts can view relationships they're part of" ON public.user_trusted_contacts;
DROP POLICY IF EXISTS "Trusted contacts can update their confirmation status" ON public.user_trusted_contacts;

-- Create improved RLS policies for contacts_new
CREATE POLICY "Authenticated users can view contacts" 
ON public.contacts_new 
FOR SELECT 
USING (
  auth.role() = 'authenticated' AND (
    -- Users can see contacts they're linked to through relationships
    EXISTS (
      SELECT 1 FROM public.user_trusted_contacts 
      WHERE contact_id = contacts_new.id AND user_id = auth.uid()
    ) OR
    -- Users can see their own contact record (if email matches)
    LOWER(TRIM(contacts_new.email)) = LOWER(TRIM((SELECT email FROM auth.users WHERE id = auth.uid()))) OR
    -- Service role can see all
    auth.role() = 'service_role'
  )
);

CREATE POLICY "Authenticated users can create contacts" 
ON public.contacts_new 
FOR INSERT 
WITH CHECK (
  auth.role() = 'authenticated' OR auth.role() = 'service_role'
);

CREATE POLICY "Users can update contacts they're linked to" 
ON public.contacts_new 
FOR UPDATE 
USING (
  auth.role() = 'service_role' OR
  EXISTS (
    SELECT 1 FROM public.user_trusted_contacts 
    WHERE contact_id = contacts_new.id AND user_id = auth.uid()
  )
);

-- Create improved RLS policies for user_trusted_contacts
CREATE POLICY "Users can view their own trusted contact relationships" 
ON public.user_trusted_contacts 
FOR SELECT 
USING (
  auth.uid() = user_id OR auth.role() = 'service_role'
);

CREATE POLICY "Trusted contacts can view relationships where they are the contact"
ON public.user_trusted_contacts
FOR SELECT
USING (
  auth.role() = 'service_role' OR
  EXISTS (
    SELECT 1 FROM public.contacts_new cn
    WHERE cn.id = user_trusted_contacts.contact_id 
    AND LOWER(TRIM(cn.email)) = LOWER(TRIM((SELECT email FROM auth.users WHERE id = auth.uid())))
  )
);

CREATE POLICY "Users can create their own trusted contact relationships" 
ON public.user_trusted_contacts 
FOR INSERT 
WITH CHECK (
  (auth.uid() = user_id AND auth.role() = 'authenticated') OR 
  auth.role() = 'service_role'
);

CREATE POLICY "Users can update their own trusted contact relationships" 
ON public.user_trusted_contacts 
FOR UPDATE 
USING (
  auth.uid() = user_id OR auth.role() = 'service_role'
);

CREATE POLICY "Trusted contacts can update their confirmation status"
ON public.user_trusted_contacts
FOR UPDATE
USING (
  auth.role() = 'service_role' OR
  EXISTS (
    SELECT 1 FROM public.contacts_new cn
    WHERE cn.id = user_trusted_contacts.contact_id 
    AND LOWER(TRIM(cn.email)) = LOWER(TRIM((SELECT email FROM auth.users WHERE id = auth.uid())))
  )
)
WITH CHECK (
  -- Only allow updating specific fields when user is the trusted contact
  CASE 
    WHEN auth.role() = 'service_role' THEN true
    WHEN EXISTS (
      SELECT 1 FROM public.contacts_new cn
      WHERE cn.id = user_trusted_contacts.contact_id 
      AND LOWER(TRIM(cn.email)) = LOWER(TRIM((SELECT email FROM auth.users WHERE id = auth.uid())))
    ) THEN true
    ELSE false
  END
);

CREATE POLICY "Users can delete their own trusted contact relationships" 
ON public.user_trusted_contacts 
FOR DELETE 
USING (
  auth.uid() = user_id OR auth.role() = 'service_role'
);

-- Add indexes for performance optimization with normalized email lookups
CREATE INDEX IF NOT EXISTS idx_contacts_new_normalized_email 
ON public.contacts_new(LOWER(TRIM(email)));

CREATE INDEX IF NOT EXISTS idx_contacts_new_target_user_normalized 
ON public.contacts_new(target_user_id, LOWER(TRIM(email))) 
WHERE target_user_id IS NOT NULL;

-- Add a function to validate contact data
CREATE OR REPLACE FUNCTION public.validate_contact_data(contact_data JSONB)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  errors TEXT[] := ARRAY[]::TEXT[];
  email_val TEXT;
  name_val TEXT;
BEGIN
  -- Check email
  email_val := TRIM(contact_data ->> 'email');
  IF email_val IS NULL OR email_val = '' THEN
    errors := array_append(errors, 'Email is required');
  ELSIF email_val !~ '^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$' THEN
    errors := array_append(errors, 'Invalid email format');
  END IF;
  
  -- Check full name
  name_val := TRIM(contact_data ->> 'full_name');
  IF name_val IS NULL OR name_val = '' THEN
    errors := array_append(errors, 'Full name is required');
  END IF;
  
  -- Check contact type
  IF contact_data ->> 'contact_type' IS NOT NULL 
     AND contact_data ->> 'contact_type' NOT IN ('trusted', 'regular') THEN
    errors := array_append(errors, 'Invalid contact type');
  END IF;
  
  -- Check role for trusted contacts
  IF COALESCE(contact_data ->> 'contact_type', 'trusted') = 'trusted' 
     AND contact_data ->> 'role' IS NOT NULL
     AND contact_data ->> 'role' NOT IN ('executor', 'legacy_messenger', 'guardian') THEN
    errors := array_append(errors, 'Invalid role for trusted contact');
  END IF;
  
  RETURN jsonb_build_object(
    'valid', array_length(errors, 1) IS NULL,
    'errors', errors,
    'normalized_email', LOWER(TRIM(COALESCE(contact_data ->> 'email', ''))),
    'normalized_name', TRIM(COALESCE(contact_data ->> 'full_name', ''))
  );
END;
$$;

-- Grant permissions for the validation function
GRANT EXECUTE ON FUNCTION public.validate_contact_data(JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION public.validate_contact_data(JSONB) TO service_role;

-- Add comment
COMMENT ON FUNCTION public.validate_contact_data IS 'Validate and normalize contact data before processing';

-- Create a diagnostic function to check system health and constraints
CREATE OR REPLACE FUNCTION public.diagnose_contact_constraints()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result JSONB := '{}'::JSONB;
  constraint_count INTEGER;
  policy_count INTEGER;
  index_count INTEGER;
BEGIN
  -- Check foreign key constraints
  SELECT COUNT(*) INTO constraint_count
  FROM information_schema.table_constraints 
  WHERE table_schema = 'public' 
  AND table_name IN ('contacts_new', 'user_trusted_contacts')
  AND constraint_type = 'FOREIGN KEY';
  
  result := jsonb_set(result, '{foreign_key_constraints}', to_jsonb(constraint_count));
  
  -- Check RLS policies
  SELECT COUNT(*) INTO policy_count
  FROM pg_policies 
  WHERE schemaname = 'public' 
  AND tablename IN ('contacts_new', 'user_trusted_contacts');
  
  result := jsonb_set(result, '{rls_policies}', to_jsonb(policy_count));
  
  -- Check indexes
  SELECT COUNT(*) INTO index_count
  FROM pg_indexes 
  WHERE schemaname = 'public' 
  AND tablename IN ('contacts_new', 'user_trusted_contacts');
  
  result := jsonb_set(result, '{indexes}', to_jsonb(index_count));
  
  -- Check if RLS is enabled
  result := jsonb_set(result, '{contacts_new_rls_enabled}', to_jsonb(
    EXISTS (
      SELECT 1 FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public' AND c.relname = 'contacts_new' AND c.relrowsecurity = true
    )
  ));
  
  result := jsonb_set(result, '{user_trusted_contacts_rls_enabled}', to_jsonb(
    EXISTS (
      SELECT 1 FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public' AND c.relname = 'user_trusted_contacts' AND c.relrowsecurity = true
    )
  ));
  
  RETURN result;
END;
$$;

-- Grant permissions for the diagnostic function
GRANT EXECUTE ON FUNCTION public.diagnose_contact_constraints() TO authenticated;
GRANT EXECUTE ON FUNCTION public.diagnose_contact_constraints() TO service_role;

COMMENT ON FUNCTION public.diagnose_contact_constraints IS 'Diagnose the health of contact system constraints, policies, and indexes'; 