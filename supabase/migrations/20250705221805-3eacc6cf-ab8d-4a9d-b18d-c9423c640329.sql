-- Add admin role support and video flagging
CREATE TYPE public.admin_role AS ENUM ('super_admin', 'moderator');

-- Admin users table
CREATE TABLE public.admin_users (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role admin_role NOT NULL DEFAULT 'moderator',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

-- Enable RLS
ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;

-- Admin policies
CREATE POLICY "Admins can view admin users" ON public.admin_users
FOR SELECT USING (EXISTS (
  SELECT 1 FROM public.admin_users 
  WHERE user_id = auth.uid()
));

-- Add flagging support to videos
ALTER TABLE public.videos 
ADD COLUMN is_flagged BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN flag_reason TEXT,
ADD COLUMN flagged_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN flagged_by_user_id UUID;

-- Video reports table
CREATE TABLE public.video_reports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  video_id UUID NOT NULL REFERENCES public.videos(id) ON DELETE CASCADE,
  reporter_user_id UUID NOT NULL,
  reason TEXT NOT NULL,
  details TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.video_reports ENABLE ROW LEVEL SECURITY;

-- Report policies
CREATE POLICY "Users can create reports" ON public.video_reports
FOR INSERT WITH CHECK (auth.uid() = reporter_user_id);

CREATE POLICY "Admins can view all reports" ON public.video_reports
FOR SELECT USING (EXISTS (
  SELECT 1 FROM public.admin_users 
  WHERE user_id = auth.uid()
));

-- Admin access logs already exists, add index for performance
CREATE INDEX IF NOT EXISTS idx_admin_access_logs_user_id ON public.admin_access_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_admin_access_logs_created_at ON public.admin_access_logs(created_at);

-- Helper function to check if user is admin
CREATE OR REPLACE FUNCTION public.is_admin(user_uuid UUID)
RETURNS BOOLEAN
LANGUAGE SQL
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.admin_users 
    WHERE user_id = user_uuid
  );
$$;