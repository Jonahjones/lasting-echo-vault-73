-- Create video shares system for many-to-many sharing relationships
CREATE TABLE public.video_shares (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  video_id UUID NOT NULL REFERENCES public.videos(id) ON DELETE CASCADE,
  owner_id UUID NOT NULL, -- The person sharing the video
  recipient_id UUID NOT NULL, -- The person receiving the video  
  recipient_email TEXT NOT NULL, -- Email for validation and invites
  status TEXT NOT NULL DEFAULT 'active', -- 'active', 'revoked', 'pending'
  shared_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  viewed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  -- Prevent duplicate shares
  UNIQUE(video_id, recipient_email)
);

-- Enable RLS on video_shares
ALTER TABLE public.video_shares ENABLE ROW LEVEL SECURITY;

-- Policies for video_shares
CREATE POLICY "Users can view shares they own"
ON public.video_shares
FOR SELECT 
USING (auth.uid() = owner_id);

CREATE POLICY "Users can view shares for them"
ON public.video_shares  
FOR SELECT
USING (auth.uid() = recipient_id);

CREATE POLICY "Users can create shares for their videos"
ON public.video_shares
FOR INSERT
WITH CHECK (
  auth.uid() = owner_id AND 
  EXISTS (
    SELECT 1 FROM public.videos 
    WHERE id = video_id AND user_id = auth.uid()
  )
);

CREATE POLICY "Users can update shares they own"
ON public.video_shares
FOR UPDATE
USING (auth.uid() = owner_id);

CREATE POLICY "Users can delete shares they own" 
ON public.video_shares
FOR DELETE
USING (auth.uid() = owner_id);

-- Add contact invitation status to contacts table
ALTER TABLE public.contacts ADD COLUMN invitation_status TEXT DEFAULT 'registered';
-- 'registered' = user exists and is active
-- 'pending' = invitation sent but not accepted
-- 'bounced' = email delivery failed

-- Add trigger for updated_at on video_shares
CREATE TRIGGER update_video_shares_updated_at
  BEFORE UPDATE ON public.video_shares
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Add table to realtime publication
ALTER TABLE public.video_shares REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.video_shares;

-- Create indexes for performance
CREATE INDEX idx_video_shares_recipient_id ON public.video_shares(recipient_id);
CREATE INDEX idx_video_shares_owner_id ON public.video_shares(owner_id);
CREATE INDEX idx_video_shares_video_id ON public.video_shares(video_id);
CREATE INDEX idx_video_shares_status ON public.video_shares(status);
CREATE INDEX idx_contacts_invitation_status ON public.contacts(invitation_status);