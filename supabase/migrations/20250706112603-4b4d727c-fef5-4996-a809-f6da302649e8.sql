-- Update the handle_new_user function to better extract names from Google SSO and manual signup
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
  BEGIN
    -- Try to get first_name and last_name from raw_user_meta_data
    extracted_first_name := NEW.raw_user_meta_data ->> 'first_name';
    extracted_last_name := NEW.raw_user_meta_data ->> 'last_name';
    
    -- If not available, try to extract from 'name' field (common with Google SSO)
    IF extracted_first_name IS NULL OR extracted_first_name = '' THEN
      full_name := NEW.raw_user_meta_data ->> 'name';
      IF full_name IS NOT NULL AND full_name != '' THEN
        -- Split the full name into first and last
        extracted_first_name := split_part(full_name, ' ', 1);
        extracted_last_name := trim(substring(full_name from position(' ' in full_name) + 1));
        
        -- If there's no space, the entire name becomes first_name
        IF position(' ' in full_name) = 0 THEN
          extracted_last_name := '';
        END IF;
      END IF;
    END IF;
    
    -- Fallback to email username if still no first name
    IF extracted_first_name IS NULL OR extracted_first_name = '' THEN
      extracted_first_name := split_part(NEW.email, '@', 1);
      extracted_last_name := '';
    END IF;

    -- Insert the profile
    INSERT INTO public.profiles (
      user_id, 
      first_name, 
      last_name,
      display_name,
      onboarding_completed
    )
    VALUES (
      NEW.id, 
      extracted_first_name,
      extracted_last_name,
      CASE 
        WHEN extracted_last_name IS NOT NULL AND extracted_last_name != '' 
        THEN extracted_first_name || ' ' || extracted_last_name
        ELSE extracted_first_name
      END,
      false  -- Force users through profile setup to ensure consistent experience
    );
    
    RETURN NEW;
  END;
END;
$function$;