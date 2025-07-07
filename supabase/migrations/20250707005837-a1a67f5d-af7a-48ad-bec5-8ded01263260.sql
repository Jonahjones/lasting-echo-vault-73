-- Fix infinite recursion in admin_users RLS policies
-- Drop the problematic policy
DROP POLICY IF EXISTS "Admins can view admin users" ON public.admin_users;

-- Create a security definer function to safely check admin status without recursion
CREATE OR REPLACE FUNCTION public.is_current_user_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.admin_users 
    WHERE user_id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Create new policy using the safe function
CREATE POLICY "Admins can view admin users" ON public.admin_users
FOR SELECT USING (public.is_current_user_admin());

-- Allow authenticated users to insert into admin_users (for auto-registration)
CREATE POLICY "Users can register as admin with valid passcode" ON public.admin_users
FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Allow admins to update admin_users
CREATE POLICY "Admins can update admin users" ON public.admin_users
FOR UPDATE USING (public.is_current_user_admin());