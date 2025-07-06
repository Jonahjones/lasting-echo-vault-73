-- Add admin policies to allow admins to update any video for moderation
-- This allows users with admin_users records to update video featured status

-- Policy to allow admins to update videos for moderation
CREATE POLICY "Admins can update video moderation status" 
ON public.videos 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM public.admin_users 
    WHERE user_id = auth.uid()
  )
);

-- Policy to allow admins to view all videos for moderation  
CREATE POLICY "Admins can view all videos for moderation" 
ON public.videos 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.admin_users 
    WHERE user_id = auth.uid()
  )
);