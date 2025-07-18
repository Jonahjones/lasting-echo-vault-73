-- Add user status tracking for trusted contact functionality
-- This allows trusted contacts to mark users as deceased and trigger video release

-- Add status field to profiles table
ALTER TABLE public.profiles 
ADD COLUMN user_status TEXT DEFAULT 'active' CHECK (user_status IN ('active', 'deceased', 'suspended'));

-- Add deceased marking tracking table
CREATE TABLE public.deceased_confirmations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  confirmed_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  confirmation_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  notes TEXT,
  verification_method TEXT, -- 'contact_verification', 'document_verification', etc.
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on deceased_confirmations
ALTER TABLE public.deceased_confirmations ENABLE ROW LEVEL SECURITY;

-- Policy: Only trusted contacts of the user can confirm death
CREATE POLICY "Trusted contacts can confirm user death"
ON public.deceased_confirmations
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.contacts 
    WHERE user_id = deceased_confirmations.user_id 
    AND auth.uid() IN (
      SELECT user_id FROM public.profiles 
      WHERE email = (
        SELECT email FROM public.contacts 
        WHERE id = contacts.id
      )
    )
    AND contact_type = 'trusted'
  )
);

-- Policy: Users and their trusted contacts can view confirmations
CREATE POLICY "View deceased confirmations"
ON public.deceased_confirmations
FOR SELECT
USING (
  auth.uid() = user_id OR 
  EXISTS (
    SELECT 1 FROM public.contacts 
    WHERE user_id = deceased_confirmations.user_id 
    AND auth.uid() IN (
      SELECT user_id FROM public.profiles 
      WHERE email = (
        SELECT email FROM public.contacts 
        WHERE id = contacts.id
      )
    )
    AND contact_type = 'trusted'
  )
);

-- Function to mark user as deceased (requires trusted contact confirmation)
CREATE OR REPLACE FUNCTION public.mark_user_deceased(
  target_user_id UUID,
  confirmation_notes TEXT DEFAULT NULL,
  verification_method TEXT DEFAULT 'contact_verification'
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result JSONB;
  confirming_user_id UUID;
  is_trusted_contact BOOLEAN DEFAULT FALSE;
BEGIN
  -- Get the current user
  confirming_user_id := auth.uid();
  
  IF confirming_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;
  
  -- Check if the confirming user is a trusted contact of the target user
  SELECT EXISTS (
    SELECT 1 FROM public.contacts c
    JOIN public.profiles p ON p.email = c.email
    WHERE c.user_id = target_user_id 
    AND p.user_id = confirming_user_id
    AND c.contact_type = 'trusted'
  ) INTO is_trusted_contact;
  
  IF NOT is_trusted_contact THEN
    RETURN jsonb_build_object('success', false, 'error', 'Only trusted contacts can confirm death');
  END IF;
  
  -- Check if user is already marked as deceased
  IF EXISTS (SELECT 1 FROM public.profiles WHERE user_id = target_user_id AND user_status = 'deceased') THEN
    RETURN jsonb_build_object('success', false, 'error', 'User already marked as deceased');
  END IF;
  
  -- Insert the confirmation record
  INSERT INTO public.deceased_confirmations (
    user_id, 
    confirmed_by, 
    notes, 
    verification_method
  ) VALUES (
    target_user_id,
    confirming_user_id,
    confirmation_notes,
    verification_method
  );
  
  -- Update user status to deceased
  UPDATE public.profiles 
  SET user_status = 'deceased' 
  WHERE user_id = target_user_id;
  
  -- TODO: Trigger video release to contacts
  -- This would involve updating video sharing permissions
  -- and sending notifications to contacts
  
  RETURN jsonb_build_object(
    'success', true, 
    'message', 'User marked as deceased',
    'confirmed_by', confirming_user_id,
    'confirmation_date', now()
  );
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.mark_user_deceased TO authenticated; 