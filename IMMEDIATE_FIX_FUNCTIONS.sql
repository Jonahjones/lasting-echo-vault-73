-- IMMEDIATE FIX: Essential functions for Trusted Contact Center
-- Run this in your Supabase SQL Editor to fix the pending confirmations issue

-- 1. Function to get trusted contact relationships for a user (this fixes the main data flow)
CREATE OR REPLACE FUNCTION public.get_trusted_contact_relationships(p_user_email TEXT)
RETURNS TABLE (
  id UUID,
  main_user_id UUID,
  main_user_name TEXT,
  main_user_email TEXT,
  role trusted_contact_role,
  is_primary BOOLEAN,
  invitation_status TEXT,
  confirmed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Validate input
  IF p_user_email IS NULL OR TRIM(p_user_email) = '' THEN
    RETURN;
  END IF;
  
  -- Normalize email
  p_user_email := TRIM(LOWER(p_user_email));
  
  RETURN QUERY
  SELECT 
    c.id,
    c.user_id as main_user_id,
    COALESCE(p.display_name, CONCAT(p.first_name, ' ', p.last_name), 'Unknown User') as main_user_name,
    u.email as main_user_email,
    c.role,
    c.is_primary,
    c.invitation_status,
    c.created_at as confirmed_at, -- Use created_at since confirmed_at column doesn't exist yet
    c.created_at
  FROM public.contacts c
  JOIN auth.users u ON u.id = c.user_id
  LEFT JOIN public.profiles p ON p.user_id = c.user_id
  WHERE LOWER(TRIM(c.email)) = p_user_email
  AND c.contact_type = 'trusted'
  ORDER BY c.is_primary DESC, c.created_at DESC;
END;
$$;

-- 2. Function to check pending confirmations (requested by user)
CREATE OR REPLACE FUNCTION public.check_pending_confirmations(p_email TEXT)
RETURNS TABLE (
  id UUID,
  main_user_id UUID,
  main_user_name TEXT,
  main_user_email TEXT,
  role trusted_contact_role,
  is_primary BOOLEAN,
  created_at TIMESTAMP WITH TIME ZONE
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Validate input
  IF p_email IS NULL OR TRIM(p_email) = '' THEN
    RETURN;
  END IF;
  
  -- Normalize email
  p_email := TRIM(LOWER(p_email));
  
  RETURN QUERY
  SELECT 
    c.id,
    c.user_id as main_user_id,
    COALESCE(p.display_name, CONCAT(p.first_name, ' ', p.last_name), 'Unknown User') as main_user_name,
    u.email as main_user_email,
    c.role,
    c.is_primary,
    c.created_at
  FROM public.contacts c
  JOIN auth.users u ON u.id = c.user_id
  LEFT JOIN public.profiles p ON p.user_id = c.user_id
  WHERE LOWER(TRIM(c.email)) = p_email
  AND c.contact_type = 'trusted'
  AND c.invitation_status IN ('pending_confirmation', 'pending')
  ORDER BY c.created_at DESC;
END;
$$;

-- 3. Function to fix SSO user statuses (converts pending_confirmation to registered for existing users)
CREATE OR REPLACE FUNCTION public.fix_sso_user_statuses()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  fix_count INTEGER := 0;
BEGIN
  -- Update contacts where the email matches an existing user
  UPDATE public.contacts 
  SET invitation_status = 'registered'
  FROM auth.users u
  WHERE LOWER(TRIM(contacts.email)) = LOWER(TRIM(u.email))
  AND contacts.invitation_status IN ('pending_confirmation', 'pending')
  AND contacts.contact_type = 'trusted';
  
  GET DIAGNOSTICS fix_count = ROW_COUNT;
  
  RETURN jsonb_build_object(
    'success', true,
    'fixed_count', fix_count,
    'message', 'Updated ' || fix_count || ' contacts to registered status'
  );
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.get_trusted_contact_relationships(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_pending_confirmations(TEXT) TO authenticated;  
GRANT EXECUTE ON FUNCTION public.fix_sso_user_statuses() TO authenticated;

GRANT EXECUTE ON FUNCTION public.get_trusted_contact_relationships(TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.check_pending_confirmations(TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.fix_sso_user_statuses() TO service_role;

-- Test the functions immediately after creation
SELECT 'Testing get_trusted_contact_relationships...' as test;
SELECT * FROM public.get_trusted_contact_relationships('delivered@resend.dev');
SELECT * FROM public.get_trusted_contact_relationships('20attpkz@gmail.com');

SELECT 'Testing pending confirmations...' as test;
SELECT * FROM public.check_pending_confirmations('delivered@resend.dev');
SELECT * FROM public.check_pending_confirmations('20attpkz@gmail.com');

SELECT 'Fixing SSO statuses...' as test;
SELECT public.fix_sso_user_statuses(); 