-- Enhanced contact relationships for better existing user handling
-- Add fields to track confirmed relationships and link to actual user accounts

-- Add new columns to contacts table
ALTER TABLE public.contacts 
ADD COLUMN confirmed_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
ADD COLUMN target_user_id UUID DEFAULT NULL REFERENCES auth.users(id) ON DELETE SET NULL;

-- Create index for efficient queries on target_user_id
CREATE INDEX idx_contacts_target_user_id ON public.contacts(target_user_id) WHERE target_user_id IS NOT NULL;

-- Create index for efficient queries on invitation_status
CREATE INDEX idx_contacts_invitation_status ON public.contacts(invitation_status) WHERE invitation_status IS NOT NULL;

-- Add comment for documentation
COMMENT ON COLUMN public.contacts.confirmed_at IS 'When the trusted contact relationship was confirmed (immediate for existing users)';
COMMENT ON COLUMN public.contacts.target_user_id IS 'The actual user ID if the contact email corresponds to an existing user account';

-- Update existing 'registered' contacts to have confirmed_at timestamp
UPDATE public.contacts 
SET confirmed_at = created_at 
WHERE invitation_status = 'registered' AND confirmed_at IS NULL;

-- Create function to automatically link contacts to users when they sign up
CREATE OR REPLACE FUNCTION public.link_pending_contacts()
RETURNS TRIGGER AS $$
BEGIN
  -- When a new user signs up, link any pending contacts with their email
  UPDATE public.contacts 
  SET 
    target_user_id = NEW.id,
    invitation_status = 'registered',
    confirmed_at = NOW()
  WHERE 
    email = NEW.email 
    AND invitation_status = 'pending' 
    AND target_user_id IS NULL;
    
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to automatically link contacts when users sign up
CREATE TRIGGER on_user_signup_link_contacts
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.link_pending_contacts();

-- Create function to get contact relationship status
CREATE OR REPLACE FUNCTION public.get_contact_status(contact_id UUID)
RETURNS TEXT AS $$
DECLARE
  contact_record RECORD;
BEGIN
  SELECT invitation_status, target_user_id, confirmed_at, contact_type
  INTO contact_record
  FROM public.contacts
  WHERE id = contact_id;
  
  IF NOT FOUND THEN
    RETURN 'not_found';
  END IF;
  
  -- For trusted contacts with target_user_id and confirmed_at, they're active
  IF contact_record.contact_type = 'trusted' 
     AND contact_record.target_user_id IS NOT NULL 
     AND contact_record.confirmed_at IS NOT NULL THEN
    RETURN 'active_trusted';
  END IF;
  
  -- For regular contacts with registered status
  IF contact_record.invitation_status = 'registered' THEN
    RETURN 'active';
  END IF;
  
  -- For pending invitations
  IF contact_record.invitation_status = 'pending' THEN
    RETURN 'pending_invite';
  END IF;
  
  -- For bounced emails
  IF contact_record.invitation_status = 'bounced' THEN
    RETURN 'invite_failed';
  END IF;
  
  -- Default fallback
  RETURN contact_record.invitation_status;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER; 