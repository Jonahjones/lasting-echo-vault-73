-- Create gamification system tables

-- XP and level tracking for users
CREATE TABLE public.user_gamification (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  total_xp INTEGER NOT NULL DEFAULT 0,
  current_level INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- XP transactions for transparency and audit
CREATE TABLE public.xp_transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL, -- 'video_create', 'video_share', 'video_public', 'video_like', 'referral', 'video_watch'
  xp_amount INTEGER NOT NULL,
  reference_id UUID, -- video_id, referral_id, etc.
  transaction_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Daily XP caps tracking
CREATE TABLE public.daily_xp_caps (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL,
  cap_date DATE NOT NULL DEFAULT CURRENT_DATE,
  current_count INTEGER NOT NULL DEFAULT 0,
  UNIQUE(user_id, action_type, cap_date)
);

-- Badge definitions (configurable)
CREATE TABLE public.badge_definitions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  level_required INTEGER NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  svg_icon TEXT NOT NULL, -- SVG markup for the badge
  color TEXT NOT NULL DEFAULT '#3B82F6',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- XP configuration (admin configurable)
CREATE TABLE public.xp_config (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  action_type TEXT NOT NULL UNIQUE,
  xp_amount INTEGER NOT NULL,
  daily_cap INTEGER NOT NULL DEFAULT 0, -- 0 means no cap
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all gamification tables
ALTER TABLE public.user_gamification ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.xp_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_xp_caps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.badge_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.xp_config ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own gamification data"
ON public.user_gamification
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own XP transactions"
ON public.xp_transactions
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own daily caps"
ON public.daily_xp_caps
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Badge definitions are public"
ON public.badge_definitions
FOR SELECT
USING (true);

CREATE POLICY "XP config is public"
ON public.xp_config
FOR SELECT
USING (true);

-- System policies for edge functions (using service role)
CREATE POLICY "System can manage all gamification"
ON public.user_gamification
FOR ALL
USING (true);

CREATE POLICY "System can manage XP transactions"
ON public.xp_transactions
FOR ALL
USING (true);

CREATE POLICY "System can manage daily caps"
ON public.daily_xp_caps
FOR ALL
USING (true);

-- Add triggers for updated_at
CREATE TRIGGER update_user_gamification_updated_at
  BEFORE UPDATE ON public.user_gamification
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_xp_config_updated_at
  BEFORE UPDATE ON public.xp_config
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default XP configuration
INSERT INTO public.xp_config (action_type, xp_amount, daily_cap, description) VALUES
('video_create', 10, 5, 'Creating a video or prompt'),
('video_share', 20, 0, 'Sharing a video with contacts'),
('video_public', 20, 0, 'Making a video public'),
('video_like', 2, 10, 'Receiving a like on public video'),
('referral', 25, 0, 'Successful referral of verified user'),
('video_watch_complete', 5, 0, 'Shared video watched completely');

-- Insert default badge definitions with SVG icons
INSERT INTO public.badge_definitions (level_required, name, description, svg_icon, color) VALUES
(1, 'Storyteller', 'Welcome to your memory journey', '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2L13.09 6.26L18 5L16.74 9.74L22 11L17.74 12.26L19 17L14.26 15.74L13 20L11.74 15.74L7 17L8.26 12.26L2 11L6.26 9.74L5 5L9.74 6.26L12 2Z"/></svg>', '#8B5CF6'),
(2, 'Memory Keeper', 'Building your legacy collection', '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2L15.09 8.26L22 9L17 14L18.18 21L12 17.77L5.82 21L7 14L2 9L8.91 8.26L12 2Z"/></svg>', '#06B6D4'),
(3, 'Heritage Guardian', 'Sharing precious memories', '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2L14.5 8.5L22 9L17 14L18.5 22L12 18.5L5.5 22L7 14L2 9L9.5 8.5L12 2Z"/></svg>', '#10B981'),
(4, 'Legacy Master', 'Inspiring others with your stories', '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2L15.5 9L22 9.5L17.5 14.5L19 22L12 18L5 22L6.5 14.5L2 9.5L8.5 9L12 2Z"/></svg>', '#F59E0B'),
(5, 'Eternal Narrator', 'A true master of memories', '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 1L16 9L24 10L18 16L20 24L12 20L4 24L6 16L0 10L8 9L12 1Z"/></svg>', '#EF4444');

-- Add real-time replication
ALTER TABLE public.user_gamification REPLICA IDENTITY FULL;
ALTER TABLE public.xp_transactions REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.user_gamification;
ALTER PUBLICATION supabase_realtime ADD TABLE public.xp_transactions;

-- Create indexes for performance
CREATE INDEX idx_user_gamification_user_id ON public.user_gamification(user_id);
CREATE INDEX idx_user_gamification_level ON public.user_gamification(current_level);
CREATE INDEX idx_xp_transactions_user_id ON public.xp_transactions(user_id);
CREATE INDEX idx_xp_transactions_created_at ON public.xp_transactions(created_at);
CREATE INDEX idx_xp_transactions_unique_daily ON public.xp_transactions(user_id, action_type, reference_id, transaction_date);
CREATE INDEX idx_daily_xp_caps_user_date ON public.daily_xp_caps(user_id, cap_date);
CREATE INDEX idx_badge_definitions_level ON public.badge_definitions(level_required);