-- Allow users to view other users' basic gamification data for public display
CREATE POLICY "Users can view other users' basic gamification data"
ON public.user_gamification
FOR SELECT
USING (true);

-- Update existing policy to be more specific
DROP POLICY IF EXISTS "Users can view their own gamification data" ON public.user_gamification;

-- Add legacy release functionality to video_shares table
ALTER TABLE public.video_shares 
ADD COLUMN is_legacy_release BOOLEAN DEFAULT FALSE,
ADD COLUMN released_by_name TEXT DEFAULT NULL,
ADD COLUMN deceased_user_id UUID DEFAULT NULL,
ADD COLUMN legacy_release_date TIMESTAMP WITH TIME ZONE DEFAULT NULL;

-- Add index for efficient queries on legacy releases
CREATE INDEX idx_video_shares_legacy_release ON public.video_shares(is_legacy_release, recipient_id) WHERE is_legacy_release = TRUE;

-- Add comment for documentation
COMMENT ON COLUMN public.video_shares.is_legacy_release IS 'True when this video was released by a trusted contact following user death';
COMMENT ON COLUMN public.video_shares.released_by_name IS 'Name of the trusted contact who released this legacy video';
COMMENT ON COLUMN public.video_shares.deceased_user_id IS 'Original user ID who passed away (for legacy releases)';
COMMENT ON COLUMN public.video_shares.legacy_release_date IS 'When the legacy video was released by trusted contact';