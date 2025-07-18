# Trusted Contact System Migration Guide

This guide provides step-by-step instructions to fix the trusted contact system for SSO users and implement proper email normalization.

## Overview of Issues Fixed

1. **Email Normalization**: All email comparisons now use `LOWER(TRIM(email))` consistently
2. **SSO User Linking**: Contacts are properly linked to existing users via `target_user_id`
3. **Many-to-Many Structure**: Prepared for future many-to-many contact relationships
4. **Status Detection**: Improved detection of existing users when adding contacts
5. **Debug Tools**: Comprehensive debugging and fixing functions

## Step 1: Apply Core Migration

Run this SQL to add missing columns and create improved functions:

```sql
-- Add missing columns to contacts table for SSO user linking
ALTER TABLE public.contacts 
ADD COLUMN IF NOT EXISTS target_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS confirmed_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;

-- Create index for normalized email lookups
CREATE INDEX IF NOT EXISTS idx_contacts_normalized_email 
ON public.contacts(LOWER(TRIM(email)));

-- Create index for target_user_id
CREATE INDEX IF NOT EXISTS idx_contacts_target_user_id 
ON public.contacts(target_user_id) WHERE target_user_id IS NOT NULL;

-- Fix existing data - link contacts to actual users and update status
UPDATE public.contacts 
SET 
  target_user_id = u.id,
  invitation_status = 'registered',
  confirmed_at = NOW()
FROM auth.users u
WHERE LOWER(TRIM(contacts.email)) = LOWER(TRIM(u.email))
AND contacts.target_user_id IS NULL;
```

## Step 2: Create Enhanced Functions

### Enhanced Contact Checking Function

```sql
-- Enhanced function to check contact relationships with proper SSO user detection
CREATE OR REPLACE FUNCTION public.check_contact_relationships(p_email TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  contact_record RECORD;
  relationships_count INTEGER;
  user_exists BOOLEAN := FALSE;
  existing_user_id UUID := NULL;
  debug_info JSONB := '{}'::JSONB;
BEGIN
  -- Input validation and normalization
  IF p_email IS NULL OR TRIM(p_email) = '' THEN
    RETURN jsonb_build_object(
      'contact_exists', false,
      'contact_id', null,
      'contact_name', null,
      'relationships_count', 0,
      'user_exists', false,
      'existing_user_id', null,
      'can_add_contact', false,
      'error', 'Invalid email provided',
      'debug_info', debug_info
    );
  END IF;

  -- Normalize email (trim whitespace and convert to lowercase)
  p_email := TRIM(LOWER(p_email));
  debug_info := jsonb_set(debug_info, '{normalized_email}', to_jsonb(p_email));
  
  -- Check if contact exists in our contacts table (using normalized email)
  SELECT * INTO contact_record
  FROM public.contacts 
  WHERE LOWER(TRIM(email)) = p_email
  LIMIT 1;
  
  debug_info := jsonb_set(debug_info, '{contact_found}', to_jsonb(contact_record.id IS NOT NULL));
  
  -- Count how many users have this contact as trusted (using normalized email)
  SELECT COUNT(*) INTO relationships_count
  FROM public.contacts
  WHERE LOWER(TRIM(email)) = p_email;
  
  debug_info := jsonb_set(debug_info, '{relationships_count}', to_jsonb(relationships_count));
  
  -- Check if the email belongs to an existing user (using normalized email)
  SELECT EXISTS (
    SELECT 1 FROM auth.users WHERE LOWER(TRIM(email)) = p_email
  ) INTO user_exists;
  
  -- Get the user ID if they exist
  IF user_exists THEN
    SELECT id INTO existing_user_id 
    FROM auth.users 
    WHERE LOWER(TRIM(email)) = p_email 
    LIMIT 1;
  END IF;
  
  debug_info := jsonb_set(debug_info, '{user_exists}', to_jsonb(user_exists));
  debug_info := jsonb_set(debug_info, '{existing_user_id}', to_jsonb(existing_user_id));
  
  RETURN jsonb_build_object(
    'contact_exists', contact_record.id IS NOT NULL,
    'contact_id', contact_record.id,
    'contact_name', contact_record.full_name,
    'relationships_count', relationships_count,
    'user_exists', user_exists,
    'existing_user_id', existing_user_id,
    'can_add_contact', true,
    'debug_info', debug_info
  );
END;
$$;
```

### Enhanced Contact Addition Function

```sql
-- Enhanced function to safely add a trusted contact relationship
CREATE OR REPLACE FUNCTION public.add_trusted_contact_relationship(
  p_user_id UUID,
  p_contact_data JSONB
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  contact_email TEXT;
  contact_full_name TEXT;
  contact_phone TEXT;
  contact_record RECORD;
  contact_check JSONB;
  debug_info JSONB := '{}'::JSONB;
  step_info TEXT;
BEGIN
  -- Step 1: Input validation and normalization
  step_info := 'input_validation';
  debug_info := jsonb_set(debug_info, '{step}', to_jsonb(step_info));
  debug_info := jsonb_set(debug_info, '{input_user_id}', to_jsonb(p_user_id));
  debug_info := jsonb_set(debug_info, '{input_data}', p_contact_data);
  
  -- Validate required inputs
  IF p_user_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'invalid_input',
      'message', 'User ID is required',
      'debug_info', debug_info
    );
  END IF;
  
  IF p_contact_data IS NULL OR p_contact_data ->> 'email' IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'invalid_input',
      'message', 'Contact email is required',
      'debug_info', debug_info
    );
  END IF;
  
  -- Extract and normalize contact data
  contact_email := TRIM(LOWER(p_contact_data ->> 'email'));
  contact_full_name := TRIM(p_contact_data ->> 'full_name');
  contact_phone := TRIM(p_contact_data ->> 'phone');
  
  -- Validate email format (basic check)
  IF contact_email !~ '^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$' THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'invalid_email',
      'message', 'Invalid email format',
      'debug_info', debug_info
    );
  END IF;
  
  -- Validate full name is provided
  IF contact_full_name IS NULL OR contact_full_name = '' THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'invalid_input',
      'message', 'Contact full name is required',
      'debug_info', debug_info
    );
  END IF;
  
  debug_info := jsonb_set(debug_info, '{normalized_email}', to_jsonb(contact_email));
  debug_info := jsonb_set(debug_info, '{normalized_name}', to_jsonb(contact_full_name));
  
  -- Step 2: Check contact status
  step_info := 'check_contact_status';
  debug_info := jsonb_set(debug_info, '{step}', to_jsonb(step_info));
  
  contact_check := public.check_contact_relationships(contact_email);
  debug_info := jsonb_set(debug_info, '{contact_check_result}', contact_check);
  
  -- Step 3: Check if user already has this contact (with normalized email)
  step_info := 'check_existing_relationship';
  debug_info := jsonb_set(debug_info, '{step}', to_jsonb(step_info));
  
  SELECT * INTO contact_record
  FROM public.contacts
  WHERE user_id = p_user_id 
  AND LOWER(TRIM(email)) = contact_email;
  
  debug_info := jsonb_set(debug_info, '{existing_relationship_found}', to_jsonb(contact_record.id IS NOT NULL));
  
  IF contact_record.id IS NOT NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'relationship_exists',
      'message', 'You already have this contact in your list',
      'existing_relationship_id', contact_record.id,
      'debug_info', debug_info
    );
  END IF;
  
  -- Step 4: Create the contact relationship
  step_info := 'create_relationship';
  debug_info := jsonb_set(debug_info, '{step}', to_jsonb(step_info));
  
  BEGIN
    INSERT INTO public.contacts (
      user_id,
      full_name,
      email,
      phone,
      relationship,
      contact_type,
      role,
      is_primary,
      invitation_status,
      target_user_id,
      confirmed_at
    ) VALUES (
      p_user_id,
      contact_full_name,
      contact_email,
      contact_phone,
      p_contact_data ->> 'relationship',
      COALESCE((p_contact_data ->> 'contact_type')::contact_type, 'trusted'),
      CASE 
        WHEN COALESCE(p_contact_data ->> 'contact_type', 'trusted') = 'trusted' 
        THEN COALESCE((p_contact_data ->> 'role')::trusted_contact_role, 'legacy_messenger')
        ELSE NULL 
      END,
      COALESCE((p_contact_data ->> 'is_primary')::BOOLEAN, false),
      CASE 
        WHEN (contact_check ->> 'user_exists')::BOOLEAN THEN 'registered'
        ELSE 'pending_confirmation'
      END,
      CASE 
        WHEN (contact_check ->> 'user_exists')::BOOLEAN 
        THEN (contact_check ->> 'existing_user_id')::UUID
        ELSE NULL 
      END,
      CASE 
        WHEN (contact_check ->> 'user_exists')::BOOLEAN THEN NOW()
        ELSE NULL 
      END
    ) RETURNING * INTO contact_record;
    
    debug_info := jsonb_set(debug_info, '{relationship_created}', to_jsonb(true));
    debug_info := jsonb_set(debug_info, '{relationship_id}', to_jsonb(contact_record.id));
    
  EXCEPTION WHEN unique_violation THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'relationship_exists',
      'message', 'A relationship between this user and contact already exists',
      'debug_info', debug_info
    );
  EXCEPTION WHEN foreign_key_violation THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'foreign_key_violation',
      'message', 'Foreign key constraint violation - invalid user ID or contact ID',
      'debug_info', debug_info
    );
  EXCEPTION WHEN check_violation THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'check_constraint_violation',
      'message', 'Check constraint violation - invalid role or contact type combination',
      'debug_info', debug_info
    );
  EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'relationship_creation_failed',
      'message', 'Failed to create relationship: ' || SQLERRM,
      'debug_info', debug_info
    );
  END;
  
  -- Step 5: Success response
  step_info := 'success';
  debug_info := jsonb_set(debug_info, '{step}', to_jsonb(step_info));
  
  RETURN jsonb_build_object(
    'success', true,
    'message', 'Trusted contact relationship created successfully',
    'relationship', row_to_json(contact_record),
    'user_exists', (contact_check ->> 'user_exists')::BOOLEAN,
    'is_new_contact', contact_check ->> 'contact_exists' = 'false',
    'debug_info', debug_info
  );
  
-- Catch any unexpected errors
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object(
    'success', false,
    'error', 'unexpected_error',
    'message', 'An unexpected error occurred: ' || SQLERRM,
    'debug_info', debug_info
  );
END;
$$;
```

## Step 3: Create Support Functions

### Get User Contacts Function

```sql
-- Enhanced function to get user's trusted contacts
CREATE OR REPLACE FUNCTION public.get_user_contacts(p_user_id UUID)
RETURNS TABLE (
  id UUID,
  full_name TEXT,
  email TEXT,
  phone TEXT,
  relationship TEXT,
  contact_type contact_type,
  role trusted_contact_role,
  is_primary BOOLEAN,
  invitation_status TEXT,
  confirmed_at TIMESTAMP WITH TIME ZONE,
  target_user_id UUID,
  created_at TIMESTAMP WITH TIME ZONE
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Validate input
  IF p_user_id IS NULL THEN
    RAISE EXCEPTION 'User ID cannot be null';
  END IF;
  
  RETURN QUERY
  SELECT 
    c.id,
    c.full_name,
    LOWER(TRIM(c.email)) as email, -- Return normalized email
    c.phone,
    c.relationship,
    c.contact_type,
    c.role,
    c.is_primary,
    c.invitation_status,
    c.confirmed_at,
    c.target_user_id,
    c.created_at
  FROM public.contacts c
  WHERE c.user_id = p_user_id
  ORDER BY c.contact_type DESC, c.is_primary DESC, c.created_at DESC;
END;
$$;
```

### Get Trusted Contact Relationships Function

```sql
-- Function to get trusted contact relationships for a specific user (where they are the trusted contact)
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
    c.confirmed_at,
    c.created_at
  FROM public.contacts c
  JOIN auth.users u ON u.id = c.user_id
  LEFT JOIN public.profiles p ON p.user_id = c.user_id
  WHERE LOWER(TRIM(c.email)) = p_user_email
  AND c.contact_type = 'trusted'
  ORDER BY c.is_primary DESC, c.created_at DESC;
END;
$$;
```

### Debug Function

```sql
-- Debug function to list all trusted contacts and relationships with user info
CREATE OR REPLACE FUNCTION public.debug_trusted_contacts()
RETURNS TABLE (
  contact_id UUID,
  contact_email TEXT,
  contact_name TEXT,
  contact_type contact_type,
  role trusted_contact_role,
  invitation_status TEXT,
  main_user_id UUID,
  main_user_email TEXT,
  main_user_name TEXT,
  target_user_id UUID,
  target_user_email TEXT,
  target_user_name TEXT,
  is_linked_correctly BOOLEAN
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c.id as contact_id,
    c.email as contact_email,
    c.full_name as contact_name,
    c.contact_type,
    c.role,
    c.invitation_status,
    c.user_id as main_user_id,
    mu.email as main_user_email,
    COALESCE(mp.display_name, CONCAT(mp.first_name, ' ', mp.last_name), 'Unknown') as main_user_name,
    c.target_user_id,
    tu.email as target_user_email,
    COALESCE(tp.display_name, CONCAT(tp.first_name, ' ', tp.last_name), 'Unknown') as target_user_name,
    -- Check if the contact email matches the target user email (normalized)
    CASE 
      WHEN c.target_user_id IS NOT NULL AND tu.email IS NOT NULL 
      THEN LOWER(TRIM(c.email)) = LOWER(TRIM(tu.email))
      ELSE false 
    END as is_linked_correctly
  FROM public.contacts c
  LEFT JOIN auth.users mu ON mu.id = c.user_id
  LEFT JOIN public.profiles mp ON mp.user_id = c.user_id
  LEFT JOIN auth.users tu ON tu.id = c.target_user_id
  LEFT JOIN public.profiles tp ON tp.user_id = c.target_user_id
  WHERE c.contact_type = 'trusted'
  ORDER BY c.created_at DESC;
END;
$$;
```

### Fix All Relationships Function

```sql
-- Function to fix all existing contact relationships
CREATE OR REPLACE FUNCTION public.fix_all_contact_relationships()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  fix_count INTEGER := 0;
  total_count INTEGER := 0;
  fixed_contacts JSONB := '[]'::JSONB;
BEGIN
  -- Count total contacts that need fixing
  SELECT COUNT(*) INTO total_count
  FROM public.contacts c
  LEFT JOIN auth.users u ON LOWER(TRIM(c.email)) = LOWER(TRIM(u.email))
  WHERE c.target_user_id IS NULL AND u.id IS NOT NULL;
  
  -- Fix contacts by linking them to existing users
  WITH fixed AS (
    UPDATE public.contacts 
    SET 
      target_user_id = u.id,
      invitation_status = CASE 
        WHEN invitation_status IN ('pending', 'pending_confirmation') THEN 'registered'
        ELSE invitation_status
      END,
      confirmed_at = CASE 
        WHEN confirmed_at IS NULL THEN NOW()
        ELSE confirmed_at
      END
    FROM auth.users u
    WHERE LOWER(TRIM(contacts.email)) = LOWER(TRIM(u.email))
    AND contacts.target_user_id IS NULL
    RETURNING contacts.id, contacts.email, u.id as user_id, u.email as user_email
  )
  SELECT COUNT(*), jsonb_agg(row_to_json(fixed.*))
  INTO fix_count, fixed_contacts
  FROM fixed;
  
  RETURN jsonb_build_object(
    'success', true,
    'total_contacts_checked', total_count,
    'contacts_fixed', fix_count,
    'fixed_details', fixed_contacts,
    'timestamp', NOW()
  );
END;
$$;
```

## Step 4: Grant Permissions

```sql
-- Grant permissions
GRANT EXECUTE ON FUNCTION public.check_contact_relationships(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.add_trusted_contact_relationship(UUID, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_contacts(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_trusted_contact_relationships(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.debug_trusted_contacts() TO authenticated;
GRANT EXECUTE ON FUNCTION public.fix_all_contact_relationships() TO authenticated;

-- Grant service role permissions for edge functions
GRANT EXECUTE ON FUNCTION public.check_contact_relationships(TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.add_trusted_contact_relationship(UUID, JSONB) TO service_role;
GRANT EXECUTE ON FUNCTION public.get_user_contacts(UUID) TO service_role;
GRANT EXECUTE ON FUNCTION public.get_trusted_contact_relationships(TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.debug_trusted_contacts() TO service_role;
GRANT EXECUTE ON FUNCTION public.fix_all_contact_relationships() TO service_role;
```

## Step 5: Test the System

After applying the migrations, you can test the system using these SQL queries:

### Check Current Relationships
```sql
SELECT * FROM public.debug_trusted_contacts();
```

### Fix Existing Relationships
```sql
SELECT public.fix_all_contact_relationships();
```

### Test Contact Addition
```sql
SELECT public.add_trusted_contact_relationship(
  'your-user-id'::UUID,
  '{"email": "test@example.com", "full_name": "Test User", "contact_type": "trusted", "role": "legacy_messenger"}'::JSONB
);
```

### Check Specific Email Status
```sql
SELECT public.check_contact_relationships('test@example.com');
```

### Get Trusted Contact Relationships
```sql
SELECT * FROM public.get_trusted_contact_relationships('your-email@example.com');
```

## Expected Results

After applying this migration:

1. **SSO Users Properly Linked**: Existing SSO users like `20attpkz@gmail.com` and `delivered@resend.dev` will be properly linked to their user accounts
2. **Email Normalization**: All email comparisons will be case-insensitive and trimmed
3. **Status Updates**: Contact invitation statuses will be updated to reflect actual user registration state
4. **Frontend Visibility**: The Trusted Contact Center will show for users who have trusted contact relationships
5. **Comprehensive Debugging**: Admin tools will provide detailed information about all relationships

## Troubleshooting

If you encounter issues:

1. **Check Permissions**: Ensure your database user has necessary permissions
2. **Verify Functions**: Use the admin debug panel to test each function
3. **Check Logs**: Review the `debug_info` output from functions for detailed error information
4. **Manual Fix**: Use the `fix_all_contact_relationships()` function to automatically fix existing data

## Frontend Changes

The frontend has been updated to:

1. Use the improved `add_trusted_contact_relationship` function
2. Show proper error messages and debug information
3. Display the Trusted Contact Center when relationships exist
4. Provide comprehensive debugging tools in the admin panel

## Notes

- All functions include comprehensive error handling and debug logging
- The system is backward compatible with existing data
- Email normalization is applied consistently across all operations
- The functions are designed to be idempotent (safe to run multiple times) 