-- Add featured field to videos table for admin moderation
ALTER TABLE public.videos 
ADD COLUMN is_featured BOOLEAN NOT NULL DEFAULT false;

-- Create index for better performance when querying featured videos
CREATE INDEX idx_videos_featured ON public.videos(is_featured) WHERE is_featured = true;

-- Create admin access logs table for security tracking
CREATE TABLE public.admin_access_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  action TEXT NOT NULL,
  details JSONB,
  ip_address TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on admin logs
ALTER TABLE public.admin_access_logs ENABLE ROW LEVEL SECURITY;

-- Only system/admins can manage logs
CREATE POLICY "System can manage admin logs" 
ON public.admin_access_logs 
FOR ALL 
USING (true);