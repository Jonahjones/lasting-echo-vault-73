-- Create enum for contact types
CREATE TYPE public.contact_type AS ENUM ('trusted', 'regular');

-- Create enum for trusted contact roles
CREATE TYPE public.trusted_contact_role AS ENUM ('executor', 'legacy_messenger', 'guardian');

-- Add new columns to contacts table
ALTER TABLE public.contacts 
ADD COLUMN contact_type public.contact_type NOT NULL DEFAULT 'regular',
ADD COLUMN role public.trusted_contact_role DEFAULT NULL;

-- Update existing contacts to be trusted if they were primary
UPDATE public.contacts 
SET contact_type = 'trusted', 
    role = 'executor' 
WHERE is_primary = true;

-- Update remaining contacts to be trusted (since current app treats all as trusted)
UPDATE public.contacts 
SET contact_type = 'trusted', 
    role = 'legacy_messenger' 
WHERE contact_type = 'regular';

-- Add constraint to ensure trusted contacts have a role
ALTER TABLE public.contacts 
ADD CONSTRAINT check_trusted_contact_role 
CHECK (
  (contact_type = 'trusted' AND role IS NOT NULL) OR 
  (contact_type = 'regular' AND role IS NULL)
);

-- Add constraint to ensure trusted contacts have both email and phone
ALTER TABLE public.contacts 
ADD CONSTRAINT check_trusted_contact_details 
CHECK (
  (contact_type = 'trusted' AND email IS NOT NULL AND phone IS NOT NULL) OR 
  (contact_type = 'regular')
);