-- Run this manually in your Supabase SQL Editor to add essential functions
-- This enables the enhanced functions that the frontend tries to use

-- Simple function to get trusted contact relationships
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
  IF p_user_email IS NULL OR TRIM(p_user_email) = '' THEN
    RETURN;
  END IF;
  
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
    c.created_at as confirmed_at,
    c.created_at
  FROM public.contacts c
  JOIN auth.users u ON u.id = c.user_id
  LEFT JOIN public.profiles p ON p.user_id = c.user_id
  WHERE LOWER(TRIM(c.email)) = p_user_email
  AND c.contact_type = 'trusted'
  ORDER BY c.is_primary DESC, c.created_at DESC;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.get_trusted_contact_relationships(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_trusted_contact_relationships(TEXT) TO service_role; 