-- Add policy to allow viewing public videos from other users
CREATE POLICY "Users can view public videos" 
ON public.videos 
FOR SELECT 
USING (is_public = true);