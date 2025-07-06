-- Fix infinite recursion issue by dropping problematic policies
DROP POLICY IF EXISTS "Admins can update video moderation status" ON public.videos;
DROP POLICY IF EXISTS "Admins can view all videos for moderation" ON public.videos;

-- Create a security definer function to safely check admin status
CREATE OR REPLACE FUNCTION public.is_user_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.admin_users 
    WHERE user_id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Re-create admin policies using the safe function
CREATE POLICY "Admins can update video moderation status" 
ON public.videos 
FOR UPDATE 
USING (public.is_user_admin());

CREATE POLICY "Admins can view all videos for moderation" 
ON public.videos 
FOR SELECT 
USING (public.is_user_admin());