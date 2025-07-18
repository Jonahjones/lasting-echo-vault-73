-- Social Feed System Migration
-- Creates tables for comments, enhanced sharing, and social feed optimization

-- ========================================
-- VIDEO COMMENTS SYSTEM
-- ========================================

-- Comments table with nested replies support
CREATE TABLE public.video_comments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  video_id UUID NOT NULL REFERENCES public.videos(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  parent_comment_id UUID REFERENCES public.video_comments(id) ON DELETE CASCADE,
  content TEXT NOT NULL CHECK (char_length(content) <= 1000),
  is_edited BOOLEAN NOT NULL DEFAULT FALSE,
  edited_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Comments count cache on videos table
ALTER TABLE public.videos ADD COLUMN IF NOT EXISTS comments_count INTEGER DEFAULT 0 NOT NULL;

-- Enable RLS on comments
ALTER TABLE public.video_comments ENABLE ROW LEVEL SECURITY;

-- Comments policies - users can see comments on videos they have access to
CREATE POLICY "Users can view comments on accessible videos"
ON public.video_comments
FOR SELECT
USING (
  -- Public videos
  EXISTS (
    SELECT 1 FROM public.videos 
    WHERE id = video_comments.video_id AND is_public = true
  )
  OR
  -- Videos shared with user
  EXISTS (
    SELECT 1 FROM public.video_shares vs 
    WHERE vs.video_id = video_comments.video_id 
    AND vs.recipient_id = auth.uid() 
    AND vs.status = 'active'
  )
  OR
  -- User's own videos
  EXISTS (
    SELECT 1 FROM public.videos 
    WHERE id = video_comments.video_id AND user_id = auth.uid()
  )
);

CREATE POLICY "Users can create comments on accessible videos"
ON public.video_comments
FOR INSERT
WITH CHECK (
  auth.uid() = user_id AND
  (
    -- Public videos
    EXISTS (
      SELECT 1 FROM public.videos 
      WHERE id = video_id AND is_public = true
    )
    OR
    -- Videos shared with user
    EXISTS (
      SELECT 1 FROM public.video_shares vs 
      WHERE vs.video_id = video_comments.video_id 
      AND vs.recipient_id = auth.uid() 
      AND vs.status = 'active'
    )
    OR
    -- User's own videos
    EXISTS (
      SELECT 1 FROM public.videos 
      WHERE id = video_id AND user_id = auth.uid()
    )
  )
);

CREATE POLICY "Users can update their own comments"
ON public.video_comments
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own comments"
ON public.video_comments
FOR DELETE
USING (auth.uid() = user_id);

-- ========================================
-- CONTACT RELATIONSHIPS ENHANCEMENT
-- ========================================

-- Add contact relationship types to existing contacts table
ALTER TABLE public.contacts ADD COLUMN IF NOT EXISTS relationship_type TEXT DEFAULT 'regular' CHECK (relationship_type IN ('regular', 'trusted'));
ALTER TABLE public.contacts ADD COLUMN IF NOT EXISTS is_confirmed BOOLEAN DEFAULT FALSE;

-- Create contact invitations table for pending relationships
CREATE TABLE IF NOT EXISTS public.contact_invitations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  inviter_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  invitee_email TEXT NOT NULL,
  invitee_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  relationship_type TEXT NOT NULL DEFAULT 'regular' CHECK (relationship_type IN ('regular', 'trusted')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'expired')),
  message TEXT CHECK (char_length(message) <= 500),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + INTERVAL '7 days'),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  UNIQUE(inviter_id, invitee_email)
);

-- Enable RLS on contact invitations
ALTER TABLE public.contact_invitations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own invitations"
ON public.contact_invitations
FOR SELECT
USING (auth.uid() = inviter_id OR auth.uid() = invitee_id);

CREATE POLICY "Users can create invitations"
ON public.contact_invitations
FOR INSERT
WITH CHECK (auth.uid() = inviter_id);

CREATE POLICY "Users can update invitations they're involved in"
ON public.contact_invitations
FOR UPDATE
USING (auth.uid() = inviter_id OR auth.uid() = invitee_id);

-- ========================================
-- SOCIAL FEED OPTIMIZATION
-- ========================================

-- Enhanced video sharing with feed optimization
ALTER TABLE public.video_shares ADD COLUMN IF NOT EXISTS share_type TEXT DEFAULT 'direct' CHECK (share_type IN ('direct', 'trusted_release', 'legacy_release'));
ALTER TABLE public.video_shares ADD COLUMN IF NOT EXISTS visibility_level TEXT DEFAULT 'private' CHECK (visibility_level IN ('private', 'contacts', 'public'));

-- Create social feed cache table for performance
CREATE TABLE public.social_feed_cache (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  video_id UUID NOT NULL REFERENCES public.videos(id) ON DELETE CASCADE,
  feed_score INTEGER NOT NULL DEFAULT 0, -- For ranking algorithm
  share_relationship TEXT NOT NULL, -- 'own', 'shared_direct', 'shared_trusted', 'public'
  added_to_feed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  UNIQUE(user_id, video_id)
);

-- Enable RLS on social feed cache
ALTER TABLE public.social_feed_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own feed cache"
ON public.social_feed_cache
FOR SELECT
USING (auth.uid() = user_id);

-- ========================================
-- FUNCTIONS FOR MAINTAINING COUNTS
-- ========================================

-- Function to update comments count
CREATE OR REPLACE FUNCTION public.update_video_comments_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.videos 
    SET comments_count = comments_count + 1 
    WHERE id = NEW.video_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.videos 
    SET comments_count = comments_count - 1 
    WHERE id = OLD.video_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Trigger for comments count
DROP TRIGGER IF EXISTS update_video_comments_count_trigger ON public.video_comments;
CREATE TRIGGER update_video_comments_count_trigger
  AFTER INSERT OR DELETE ON public.video_comments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_video_comments_count();

-- Function to populate social feed cache
CREATE OR REPLACE FUNCTION public.refresh_user_social_feed(target_user_id UUID)
RETURNS VOID AS $$
BEGIN
  -- Clear existing cache for user
  DELETE FROM public.social_feed_cache WHERE user_id = target_user_id;
  
  -- Add user's own public videos
  INSERT INTO public.social_feed_cache (user_id, video_id, feed_score, share_relationship)
  SELECT 
    target_user_id,
    v.id,
    100, -- High score for own videos
    'own'
  FROM public.videos v
  WHERE v.user_id = target_user_id AND v.is_public = true;
  
  -- Add videos shared directly with user
  INSERT INTO public.social_feed_cache (user_id, video_id, feed_score, share_relationship)
  SELECT 
    target_user_id,
    vs.video_id,
    CASE 
      WHEN vs.share_type = 'trusted_release' THEN 90
      WHEN vs.share_type = 'direct' THEN 80
      ELSE 70
    END,
    CASE 
      WHEN vs.share_type = 'trusted_release' THEN 'shared_trusted'
      ELSE 'shared_direct'
    END
  FROM public.video_shares vs
  WHERE vs.recipient_id = target_user_id 
    AND vs.status = 'active'
  ON CONFLICT (user_id, video_id) DO NOTHING;
  
  -- Add public videos from contacts
  INSERT INTO public.social_feed_cache (user_id, video_id, feed_score, share_relationship)
  SELECT 
    target_user_id,
    v.id,
    50, -- Lower score for public videos from contacts
    'public'
  FROM public.videos v
  JOIN public.contacts c ON c.contact_user_id = v.user_id
  WHERE c.user_id = target_user_id 
    AND c.is_confirmed = true
    AND v.is_public = true
    AND v.user_id != target_user_id -- Don't duplicate own videos
  ON CONFLICT (user_id, video_id) DO NOTHING;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ========================================
-- INDEXES FOR PERFORMANCE
-- ========================================

-- Comments indexes
CREATE INDEX idx_video_comments_video_id ON public.video_comments(video_id);
CREATE INDEX idx_video_comments_user_id ON public.video_comments(user_id);
CREATE INDEX idx_video_comments_parent_id ON public.video_comments(parent_comment_id);
CREATE INDEX idx_video_comments_created_at ON public.video_comments(created_at DESC);

-- Social feed cache indexes
CREATE INDEX idx_social_feed_cache_user_feed_score ON public.social_feed_cache(user_id, feed_score DESC, added_to_feed_at DESC);
CREATE INDEX idx_social_feed_cache_video_id ON public.social_feed_cache(video_id);

-- Contact invitations indexes
CREATE INDEX idx_contact_invitations_invitee_email ON public.contact_invitations(invitee_email);
CREATE INDEX idx_contact_invitations_status ON public.contact_invitations(status);
CREATE INDEX idx_contact_invitations_expires_at ON public.contact_invitations(expires_at);

-- Enhanced video sharing indexes
CREATE INDEX idx_video_shares_share_type ON public.video_shares(share_type);
CREATE INDEX idx_video_shares_visibility_level ON public.video_shares(visibility_level);

-- ========================================
-- REALTIME SUBSCRIPTIONS
-- ========================================

-- Enable realtime for new tables
ALTER TABLE public.video_comments REPLICA IDENTITY FULL;
ALTER TABLE public.contact_invitations REPLICA IDENTITY FULL;
ALTER TABLE public.social_feed_cache REPLICA IDENTITY FULL;

-- Add to realtime publication (if exists)
DO $$
BEGIN
  -- Add tables to realtime publication if it exists
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.video_comments;
    ALTER PUBLICATION supabase_realtime ADD TABLE public.contact_invitations;
    ALTER PUBLICATION supabase_realtime ADD TABLE public.social_feed_cache;
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    -- Publication might not exist, that's ok
    NULL;
END $$;

-- ========================================
-- TRIGGERS FOR UPDATED_AT
-- ========================================

CREATE TRIGGER update_video_comments_updated_at
  BEFORE UPDATE ON public.video_comments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_contact_invitations_updated_at
  BEFORE UPDATE ON public.contact_invitations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column(); 