-- Fix the handle_new_user function to be more robust and avoid creating incomplete profiles
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
  -- Extract first and last names from different possible sources
  DECLARE
    extracted_first_name TEXT;
    extracted_last_name TEXT;
    full_name TEXT;
    is_sso_signup BOOLEAN DEFAULT false;
    has_complete_name BOOLEAN DEFAULT false;
  BEGIN
    -- Detect if this is an SSO signup
    is_sso_signup := (NEW.raw_user_meta_data ->> 'provider') IS NOT NULL 
                     AND (NEW.raw_user_meta_data ->> 'provider') != 'email';
    
    -- Try to get first_name and last_name from raw_user_meta_data
    extracted_first_name := TRIM(NEW.raw_user_meta_data ->> 'first_name');
    extracted_last_name := TRIM(NEW.raw_user_meta_data ->> 'last_name');
    
    -- If not available, try to extract from 'name' field (common with Google SSO)
    IF (extracted_first_name IS NULL OR extracted_first_name = '') THEN
      full_name := TRIM(NEW.raw_user_meta_data ->> 'name');
      IF full_name IS NOT NULL AND full_name != '' THEN
        -- Split the full name into first and last
        extracted_first_name := TRIM(split_part(full_name, ' ', 1));
        
        -- Get everything after the first space as last name
        IF position(' ' in full_name) > 0 THEN
          extracted_last_name := TRIM(substring(full_name from position(' ' in full_name) + 1));
        ELSE
          extracted_last_name := '';
        END IF;
      END IF;
    END IF;
    
    -- Fallback to email username if still no first name
    IF extracted_first_name IS NULL OR extracted_first_name = '' THEN
      extracted_first_name := split_part(NEW.email, '@', 1);
      extracted_last_name := '';
    END IF;
    
    -- Clean up any weird characters or formatting
    extracted_first_name := REGEXP_REPLACE(extracted_first_name, '[^a-zA-Z\s\-\'']+', '', 'g');
    extracted_last_name := REGEXP_REPLACE(extracted_last_name, '[^a-zA-Z\s\-\'']+', '', 'g');
    
    -- Check if we have a complete name from SSO
    has_complete_name := (extracted_first_name IS NOT NULL AND extracted_first_name != '') 
                        AND (extracted_last_name IS NOT NULL AND extracted_last_name != '');

    -- Insert the profile
    INSERT INTO public.profiles (
      user_id, 
      first_name, 
      last_name,
      display_name,
      onboarding_completed,
      first_video_recorded
    )
    VALUES (
      NEW.id, 
      CASE WHEN is_sso_signup AND has_complete_name THEN extracted_first_name ELSE NULL END,
      CASE WHEN is_sso_signup AND has_complete_name THEN extracted_last_name ELSE NULL END,
      CASE 
        WHEN is_sso_signup AND has_complete_name THEN extracted_first_name || ' ' || extracted_last_name
        ELSE NULL
      END,
      -- Skip onboarding only if SSO user has complete name
      CASE WHEN is_sso_signup AND has_complete_name THEN true ELSE false END,
      false
    );
    
    RETURN NEW;
  END;
END;
$function$;