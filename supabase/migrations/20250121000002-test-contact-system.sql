-- Test the improved contact system functionality
-- This migration contains tests to verify the system works correctly

-- Create a test function to verify the contact system
CREATE OR REPLACE FUNCTION public.test_contact_system()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  test_results JSONB := '{}'::JSONB;
  test_user_id UUID;
  test_contact_email TEXT := 'test.contact@example.com';
  test_contact_email_2 TEXT := 'test.contact2@example.com';
  test_result JSONB;
  validation_result JSONB;
  contact_check_result JSONB;
  duplicate_test_result JSONB;
  contact_list JSONB;
  cleanup_count INTEGER;
BEGIN
  -- Test 1: Validate contact data function
  test_results := jsonb_set(test_results, '{test_1_description}', to_jsonb('Validate contact data function'));
  
  -- Test with valid data
  validation_result := public.validate_contact_data(jsonb_build_object(
    'email', '  Test@Example.COM  ',
    'full_name', '  John Doe  ',
    'contact_type', 'trusted',
    'role', 'executor'
  ));
  
  test_results := jsonb_set(test_results, '{test_1_valid_data}', validation_result);
  
  -- Test with invalid data
  validation_result := public.validate_contact_data(jsonb_build_object(
    'email', 'invalid-email',
    'full_name', '',
    'contact_type', 'invalid_type'
  ));
  
  test_results := jsonb_set(test_results, '{test_1_invalid_data}', validation_result);
  
  -- Test 2: Check contact relationships function with email normalization
  test_results := jsonb_set(test_results, '{test_2_description}', to_jsonb('Check contact relationships with email normalization'));
  
  contact_check_result := public.check_contact_relationships('  ' || upper(test_contact_email) || '  ');
  test_results := jsonb_set(test_results, '{test_2_result}', contact_check_result);
  
  -- Test 3: Add trusted contact relationship (this will test the main function)
  test_results := jsonb_set(test_results, '{test_3_description}', to_jsonb('Add trusted contact relationship'));
  
  -- Create a test user (using a UUID that won't conflict)
  test_user_id := '00000000-0000-0000-0000-000000000001'::UUID;
  
  -- Test adding a contact with normalized email
  test_result := public.add_trusted_contact_relationship(
    test_user_id,
    jsonb_build_object(
      'email', '  ' || upper(test_contact_email) || '  ',
      'full_name', '  Test Contact  ',
      'phone', '+1234567890',
      'relationship', 'Family',
      'contact_type', 'trusted',
      'role', 'executor',
      'is_primary', true
    )
  );
  
  test_results := jsonb_set(test_results, '{test_3_result}', test_result);
  
  -- Test 4: Attempt to add duplicate contact (should fail)
  test_results := jsonb_set(test_results, '{test_4_description}', to_jsonb('Attempt to add duplicate contact'));
  
  duplicate_test_result := public.add_trusted_contact_relationship(
    test_user_id,
    jsonb_build_object(
      'email', test_contact_email,
      'full_name', 'Test Contact Duplicate',
      'contact_type', 'trusted',
      'role', 'legacy_messenger'
    )
  );
  
  test_results := jsonb_set(test_results, '{test_4_result}', duplicate_test_result);
  
  -- Test 5: Add a second different contact
  test_results := jsonb_set(test_results, '{test_5_description}', to_jsonb('Add second different contact'));
  
  test_result := public.add_trusted_contact_relationship(
    test_user_id,
    jsonb_build_object(
      'email', test_contact_email_2,
      'full_name', 'Second Test Contact',
      'contact_type', 'trusted',
      'role', 'guardian'
    )
  );
  
  test_results := jsonb_set(test_results, '{test_5_result}', test_result);
  
  -- Test 6: Retrieve user contacts
  test_results := jsonb_set(test_results, '{test_6_description}', to_jsonb('Retrieve user contacts'));
  
  -- Get contacts as JSON (simulating the function call)
  SELECT jsonb_agg(row_to_json(contacts.*)) INTO contact_list
  FROM public.get_user_contacts(test_user_id) AS contacts;
  
  test_results := jsonb_set(test_results, '{test_6_result}', COALESCE(contact_list, '[]'::jsonb));
  
  -- Test 7: Test invalid inputs
  test_results := jsonb_set(test_results, '{test_7_description}', to_jsonb('Test invalid inputs'));
  
  -- Test with null user ID
  test_result := public.add_trusted_contact_relationship(
    NULL,
    jsonb_build_object('email', 'test@example.com', 'full_name', 'Test')
  );
  
  test_results := jsonb_set(test_results, '{test_7_null_user_result}', test_result);
  
  -- Test with invalid email
  test_result := public.add_trusted_contact_relationship(
    test_user_id,
    jsonb_build_object('email', 'invalid-email', 'full_name', 'Test')
  );
  
  test_results := jsonb_set(test_results, '{test_7_invalid_email_result}', test_result);
  
  -- Test with missing full name
  test_result := public.add_trusted_contact_relationship(
    test_user_id,
    jsonb_build_object('email', 'test3@example.com', 'full_name', '')
  );
  
  test_results := jsonb_set(test_results, '{test_7_missing_name_result}', test_result);
  
  -- Test 8: Diagnose system health
  test_results := jsonb_set(test_results, '{test_8_description}', to_jsonb('System health diagnostics'));
  
  test_result := public.diagnose_contact_system();
  test_results := jsonb_set(test_results, '{test_8_system_health}', test_result);
  
  test_result := public.diagnose_contact_constraints();
  test_results := jsonb_set(test_results, '{test_8_constraints_health}', test_result);
  
  -- Cleanup: Remove test data
  test_results := jsonb_set(test_results, '{cleanup_description}', to_jsonb('Cleanup test data'));
  
  -- Delete test relationships
  DELETE FROM public.user_trusted_contacts 
  WHERE user_id = test_user_id;
  
  GET DIAGNOSTICS cleanup_count = ROW_COUNT;
  test_results := jsonb_set(test_results, '{cleanup_relationships_deleted}', to_jsonb(cleanup_count));
  
  -- Delete test contacts
  DELETE FROM public.contacts_new 
  WHERE email IN (lower(trim(test_contact_email)), lower(trim(test_contact_email_2)));
  
  GET DIAGNOSTICS cleanup_count = ROW_COUNT;
  test_results := jsonb_set(test_results, '{cleanup_contacts_deleted}', to_jsonb(cleanup_count));
  
  -- Add overall test summary
  test_results := jsonb_set(test_results, '{test_completed_at}', to_jsonb(NOW()));
  test_results := jsonb_set(test_results, '{test_status}', to_jsonb('completed'));
  
  RETURN test_results;
  
EXCEPTION WHEN OTHERS THEN
  -- If any error occurs, return error details
  RETURN jsonb_build_object(
    'test_status', 'failed',
    'error', 'Test failed with error: ' || SQLERRM,
    'completed_at', NOW()
  );
END;
$$;

-- Create a function to test email normalization across all functions
CREATE OR REPLACE FUNCTION public.test_email_normalization()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  test_results JSONB := '{}'::JSONB;
  test_emails TEXT[] := ARRAY[
    'test@example.com',
    'TEST@EXAMPLE.COM',
    '  test@example.com  ',
    '  TEST@EXAMPLE.COM  ',
    'Test@Example.Com'
  ];
  email_test TEXT;
  check_result JSONB;
  validation_result JSONB;
  all_results JSONB[] := ARRAY[]::JSONB[];
BEGIN
  test_results := jsonb_set(test_results, '{test_description}', 
    to_jsonb('Test email normalization consistency across all functions'));
  
  -- Test each email variation
  FOREACH email_test IN ARRAY test_emails
  LOOP
    -- Test check_contact_relationships
    check_result := public.check_contact_relationships(email_test);
    
    -- Test validate_contact_data
    validation_result := public.validate_contact_data(
      jsonb_build_object('email', email_test, 'full_name', 'Test User')
    );
    
    -- Collect results
    all_results := array_append(all_results, jsonb_build_object(
      'input_email', email_test,
      'check_result_normalized_email', check_result -> 'debug_info' -> 'normalized_email',
      'validation_normalized_email', validation_result -> 'normalized_email'
    ));
  END LOOP;
  
  test_results := jsonb_set(test_results, '{email_tests}', to_jsonb(all_results));
  test_results := jsonb_set(test_results, '{test_completed_at}', to_jsonb(NOW()));
  
  RETURN test_results;
END;
$$;

-- Grant permissions for test functions
GRANT EXECUTE ON FUNCTION public.test_contact_system() TO authenticated;
GRANT EXECUTE ON FUNCTION public.test_contact_system() TO service_role;
GRANT EXECUTE ON FUNCTION public.test_email_normalization() TO authenticated;
GRANT EXECUTE ON FUNCTION public.test_email_normalization() TO service_role;

-- Add comments
COMMENT ON FUNCTION public.test_contact_system IS 'Comprehensive test of the contact system functionality';
COMMENT ON FUNCTION public.test_email_normalization IS 'Test email normalization consistency across functions';

-- Note: These test functions can be run manually to verify the system
-- Example usage:
-- SELECT public.test_contact_system();
-- SELECT public.test_email_normalization(); 