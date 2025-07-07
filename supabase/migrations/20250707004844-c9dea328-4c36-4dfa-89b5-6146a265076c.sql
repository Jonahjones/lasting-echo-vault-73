-- Create dedicated admin user and add to admin_users table
-- This allows guest access to admin panel with just the passcode

-- First, ensure the admin user exists (this would typically be done via Supabase Auth)
-- We'll add the user ID to admin_users table assuming the account is created

-- Insert admin user into admin_users table
-- Note: The user account admin@lovable-admin.com with password AdminAccess2024! 
-- needs to be created in Supabase Auth manually first

INSERT INTO public.admin_users (user_id, role) 
VALUES (
  -- This is a placeholder UUID - replace with actual admin user ID after creating the account
  '00000000-0000-0000-0000-000000000001',
  'super_admin'
) ON CONFLICT (user_id) DO NOTHING;

-- Grant additional permissions for the admin system
GRANT ALL ON public.admin_users TO authenticated;
GRANT ALL ON public.admin_access_logs TO authenticated;