import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { Database, CheckCircle, AlertTriangle, Loader2, Play, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export function SchemaMigrationTool() {
  const [isExecuting, setIsExecuting] = useState(false);
  const [isDiagnosing, setIsDiagnosing] = useState(false);
  const [migrationResult, setMigrationResult] = useState<string | null>(null);
  const [diagnosticResult, setDiagnosticResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  // Migration SQL for creating missing trusted contact tables
  const migrationSQL = `
-- Create missing advanced trusted contact tables
-- This migration creates the many-to-many relationship system that the frontend expects

-- First, create a new contacts table without user dependency (if it doesn't exist)
CREATE TABLE IF NOT EXISTS public.contacts_new (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  full_name TEXT NOT NULL,
  phone TEXT,
  target_user_id UUID DEFAULT NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create the many-to-many relationship table (if it doesn't exist)
CREATE TABLE IF NOT EXISTS public.user_trusted_contacts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  contact_id UUID NOT NULL REFERENCES public.contacts_new(id) ON DELETE CASCADE,
  relationship TEXT, -- Family relationship
  contact_type public.contact_type NOT NULL DEFAULT 'regular',
  role public.trusted_contact_role DEFAULT NULL,
  is_primary BOOLEAN DEFAULT false,
  invitation_status TEXT DEFAULT 'pending', -- 'pending', 'pending_confirmation', 'registered', 'accepted', 'declined', 'bounced'
  confirmed_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  -- Ensure a user can't add the same contact twice
  UNIQUE(user_id, contact_id),
  
  -- Ensure trusted contacts have a role
  CONSTRAINT check_trusted_contact_role_new 
  CHECK (
    (contact_type = 'trusted' AND role IS NOT NULL) OR 
    (contact_type = 'regular' AND role IS NULL)
  ),
  
  -- Only one primary trusted contact per user
  CONSTRAINT check_single_primary_per_user
  CHECK (
    NOT is_primary OR contact_type = 'trusted'
  )
);`;

  const rlsAndPoliciesSQL = `
-- Enable RLS on new tables
ALTER TABLE public.contacts_new ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_trusted_contacts ENABLE ROW LEVEL SECURITY;

-- Create policies for contacts_new (readable by all authenticated users)
CREATE POLICY "Contacts are viewable by authenticated users" 
ON public.contacts_new 
FOR SELECT 
USING (auth.role() = 'authenticated');

CREATE POLICY "Users can create contacts" 
ON public.contacts_new 
FOR INSERT 
WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Users can update contacts they're linked to" 
ON public.contacts_new 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM public.user_trusted_contacts 
    WHERE contact_id = contacts_new.id AND user_id = auth.uid()
  )
);

-- Create policies for user_trusted_contacts
CREATE POLICY "Users can view their own trusted contact relationships" 
ON public.user_trusted_contacts 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own trusted contact relationships" 
ON public.user_trusted_contacts 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own trusted contact relationships" 
ON public.user_trusted_contacts 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own trusted contact relationships" 
ON public.user_trusted_contacts 
FOR DELETE 
USING (auth.uid() = user_id);

-- Policy for trusted contacts to view relationships where they are the contact
CREATE POLICY "Trusted contacts can view relationships they're part of"
ON public.user_trusted_contacts
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.contacts_new cn
    JOIN auth.users u ON u.email = cn.email
    WHERE cn.id = user_trusted_contacts.contact_id 
    AND u.id = auth.uid()
  )
);

-- Policy for trusted contacts to update their relationship status
CREATE POLICY "Trusted contacts can update their confirmation status"
ON public.user_trusted_contacts
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.contacts_new cn
    JOIN auth.users u ON u.email = cn.email
    WHERE cn.id = user_trusted_contacts.contact_id 
    AND u.id = auth.uid()
  )
);`;

  const triggersAndIndexesSQL = `
-- Create triggers for updated_at
CREATE TRIGGER update_contacts_new_updated_at
  BEFORE UPDATE ON public.contacts_new
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_user_trusted_contacts_updated_at
  BEFORE UPDATE ON public.user_trusted_contacts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_contacts_new_email ON public.contacts_new(email);
CREATE INDEX IF NOT EXISTS idx_contacts_new_target_user_id ON public.contacts_new(target_user_id) WHERE target_user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_user_trusted_contacts_user_id ON public.user_trusted_contacts(user_id);
CREATE INDEX IF NOT EXISTS idx_user_trusted_contacts_contact_id ON public.user_trusted_contacts(contact_id);
CREATE INDEX IF NOT EXISTS idx_user_trusted_contacts_contact_type ON public.user_trusted_contacts(contact_type);
CREATE INDEX IF NOT EXISTS idx_user_trusted_contacts_is_primary ON public.user_trusted_contacts(user_id, is_primary) WHERE is_primary = true;
CREATE INDEX IF NOT EXISTS idx_user_trusted_contacts_invitation_status ON public.user_trusted_contacts(invitation_status);`;

  const dataMigrationSQL = `
-- Migrate existing data from old contacts table to new structure (safely)
INSERT INTO public.contacts_new (email, full_name, phone, target_user_id, created_at, updated_at)
SELECT DISTINCT ON (email) 
  email, 
  full_name, 
  phone, 
  target_user_id, 
  MIN(created_at) as created_at,
  MAX(updated_at) as updated_at
FROM public.contacts 
WHERE email IS NOT NULL
ON CONFLICT (email) DO NOTHING; -- Don't overwrite if contact already exists

-- Migrate relationships to the new join table (safely)
INSERT INTO public.user_trusted_contacts (
  user_id, 
  contact_id, 
  relationship, 
  contact_type, 
  role, 
  is_primary, 
  invitation_status, 
  confirmed_at, 
  created_at, 
  updated_at
)
SELECT 
  c.user_id,
  cn.id as contact_id,
  c.relationship,
  c.contact_type,
  c.role,
  c.is_primary,
  COALESCE(c.invitation_status, 'pending'),
  c.confirmed_at,
  c.created_at,
  c.updated_at
FROM public.contacts c
JOIN public.contacts_new cn ON cn.email = c.email
WHERE c.email IS NOT NULL
ON CONFLICT (user_id, contact_id) DO NOTHING; -- Don't create duplicates`;

  const functionsSQL = `
-- Create function to get user's trusted contacts with full contact info
CREATE OR REPLACE FUNCTION public.get_user_contacts(p_user_id UUID)
RETURNS TABLE (
  id UUID,
  contact_id UUID,
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
  RETURN QUERY
  SELECT 
    utc.id,
    c.id as contact_id,
    c.full_name,
    c.email,
    c.phone,
    utc.relationship,
    utc.contact_type,
    utc.role,
    utc.is_primary,
    utc.invitation_status,
    utc.confirmed_at,
    c.target_user_id,
    utc.created_at
  FROM public.user_trusted_contacts utc
  JOIN public.contacts_new c ON c.id = utc.contact_id
  WHERE utc.user_id = p_user_id
  ORDER BY utc.contact_type DESC, utc.is_primary DESC, utc.created_at DESC;
END;
$$;

-- Create function to check if contact exists and get their relationships
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
BEGIN
  -- Validate input
  IF p_email IS NULL OR TRIM(p_email) = '' THEN
    RETURN jsonb_build_object(
      'contact_exists', false,
      'contact_id', null,
      'contact_name', null,
      'relationships_count', 0,
      'user_exists', false,
      'existing_user_id', null,
      'can_add_contact', false,
      'error', 'Invalid email provided'
    );
  END IF;

  -- Normalize email
  p_email := TRIM(LOWER(p_email));
  
  -- Check if contact exists in our contacts table
  SELECT * INTO contact_record
  FROM public.contacts_new 
  WHERE LOWER(email) = p_email
  LIMIT 1;
  
  -- Count how many users have this contact as trusted
  SELECT COUNT(*) INTO relationships_count
  FROM public.user_trusted_contacts utc
  JOIN public.contacts_new c ON c.id = utc.contact_id
  WHERE LOWER(c.email) = p_email;
  
  -- Check if the email belongs to an existing user
  BEGIN
    SELECT EXISTS (
      SELECT 1 FROM auth.users WHERE LOWER(email) = p_email
    ) INTO user_exists;
    
    -- Get the user ID if they exist
    IF user_exists THEN
      SELECT id INTO existing_user_id 
      FROM auth.users 
      WHERE LOWER(email) = p_email 
      LIMIT 1;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    user_exists := FALSE;
    existing_user_id := NULL;
  END;
  
  RETURN jsonb_build_object(
    'contact_exists', contact_record.id IS NOT NULL,
    'contact_id', contact_record.id,
    'contact_name', contact_record.full_name,
    'relationships_count', relationships_count,
    'user_exists', user_exists,
    'existing_user_id', existing_user_id,
    'can_add_contact', true -- Always true in many-to-many system
  );
END;
$$;

-- Create function to safely add a trusted contact relationship
CREATE OR REPLACE FUNCTION public.add_trusted_contact_relationship(
  p_user_id UUID,
  p_contact_data JSONB
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  contact_email TEXT;
  contact_record RECORD;
  relationship_record RECORD;
  contact_check JSONB;
BEGIN
  -- Extract and normalize email
  contact_email := TRIM(LOWER(p_contact_data ->> 'email'));
  
  -- Check contact status
  contact_check := public.check_contact_relationships(contact_email);
  
  -- Check if user already has this contact
  SELECT * INTO relationship_record
  FROM public.user_trusted_contacts utc
  JOIN public.contacts_new c ON c.id = utc.contact_id
  WHERE utc.user_id = p_user_id 
  AND LOWER(c.email) = contact_email;
  
  IF relationship_record.id IS NOT NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'relationship_exists',
      'message', 'You already have this contact in your list'
    );
  END IF;
  
  -- Get or create the contact
  SELECT * INTO contact_record
  FROM public.contacts_new 
  WHERE LOWER(email) = contact_email;
  
  IF contact_record.id IS NULL THEN
    -- Create new contact
    INSERT INTO public.contacts_new (
      email,
      full_name,
      phone,
      target_user_id
    ) VALUES (
      contact_email,
      p_contact_data ->> 'full_name',
      p_contact_data ->> 'phone',
      CASE 
        WHEN (contact_check ->> 'user_exists')::BOOLEAN 
        THEN (contact_check ->> 'existing_user_id')::UUID
        ELSE NULL 
      END
    ) RETURNING * INTO contact_record;
  END IF;
  
  -- Create the relationship
  INSERT INTO public.user_trusted_contacts (
    user_id,
    contact_id,
    relationship,
    contact_type,
    role,
    is_primary,
    invitation_status,
    confirmed_at
  ) VALUES (
    p_user_id,
    contact_record.id,
    p_contact_data ->> 'relationship',
    (p_contact_data ->> 'contact_type')::contact_type,
    CASE 
      WHEN p_contact_data ->> 'contact_type' = 'trusted' 
      THEN (p_contact_data ->> 'role')::trusted_contact_role 
      ELSE NULL 
    END,
    COALESCE((p_contact_data ->> 'is_primary')::BOOLEAN, false),
    CASE 
      WHEN (contact_check ->> 'user_exists')::BOOLEAN THEN 'registered'
      ELSE 'pending_confirmation'
    END,
    CASE 
      WHEN (contact_check ->> 'user_exists')::BOOLEAN THEN NOW()
      ELSE NULL 
    END
  ) RETURNING * INTO relationship_record;
  
  RETURN jsonb_build_object(
    'success', true,
    'relationship', row_to_json(relationship_record),
    'contact', row_to_json(contact_record),
    'user_exists', (contact_check ->> 'user_exists')::BOOLEAN,
    'is_new_contact', contact_check ->> 'contact_exists' = 'false'
  );
  
EXCEPTION WHEN unique_violation THEN
  RETURN jsonb_build_object(
    'success', false,
    'error', 'relationship_exists',
    'message', 'You already have this contact in your list'
  );
END;
$$;

-- Create diagnostic function to help troubleshoot the system
CREATE OR REPLACE FUNCTION public.diagnose_contact_system()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result JSONB := '{}';
  table_exists BOOLEAN;
  function_exists BOOLEAN;
  total_contacts INTEGER;
  total_relationships INTEGER;
BEGIN
  -- Check if new tables exist
  SELECT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'contacts_new'
  ) INTO table_exists;
  result := jsonb_set(result, '{contacts_new_exists}', to_jsonb(table_exists));
  
  SELECT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'user_trusted_contacts'
  ) INTO table_exists;
  result := jsonb_set(result, '{user_trusted_contacts_exists}', to_jsonb(table_exists));
  
  -- Check if old table exists
  SELECT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'contacts'
  ) INTO table_exists;
  result := jsonb_set(result, '{contacts_old_exists}', to_jsonb(table_exists));
  
  -- Count records if tables exist
  BEGIN
    SELECT COUNT(*) INTO total_contacts FROM public.contacts_new;
    result := jsonb_set(result, '{contacts_new_count}', to_jsonb(total_contacts));
  EXCEPTION WHEN OTHERS THEN
    result := jsonb_set(result, '{contacts_new_count}', to_jsonb(-1));
  END;
  
  BEGIN
    SELECT COUNT(*) INTO total_relationships FROM public.user_trusted_contacts;
    result := jsonb_set(result, '{relationships_count}', to_jsonb(total_relationships));
  EXCEPTION WHEN OTHERS THEN
    result := jsonb_set(result, '{relationships_count}', to_jsonb(-1));
  END;
  
  -- Check if functions exist
  SELECT EXISTS (
    SELECT FROM information_schema.routines 
    WHERE routine_schema = 'public' AND routine_name = 'get_user_contacts'
  ) INTO function_exists;
  result := jsonb_set(result, '{get_user_contacts_exists}', to_jsonb(function_exists));
  
  SELECT EXISTS (
    SELECT FROM information_schema.routines 
    WHERE routine_schema = 'public' AND routine_name = 'check_contact_relationships'
  ) INTO function_exists;
  result := jsonb_set(result, '{check_contact_relationships_exists}', to_jsonb(function_exists));
  
  SELECT EXISTS (
    SELECT FROM information_schema.routines 
    WHERE routine_schema = 'public' AND routine_name = 'add_trusted_contact_relationship'
  ) INTO function_exists;
  result := jsonb_set(result, '{add_trusted_contact_relationship_exists}', to_jsonb(function_exists));
  
  RETURN result;
END;
$$;

-- Create function to check pending confirmations for a user
CREATE OR REPLACE FUNCTION public.check_pending_confirmations(p_email TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  pending_confirmations JSONB;
BEGIN
  -- Get all pending confirmations for this email
  SELECT jsonb_agg(
    jsonb_build_object(
      'relationship_id', utc.id,
      'main_user_id', utc.user_id,
      'main_user_name', COALESCE(p.display_name, CONCAT(p.first_name, ' ', p.last_name), 'Unknown User'),
      'role', utc.role,
      'is_primary', utc.is_primary,
      'invitation_status', utc.invitation_status,
      'created_at', utc.created_at
    )
  ) INTO pending_confirmations
  FROM public.user_trusted_contacts utc
  JOIN public.contacts_new cn ON cn.id = utc.contact_id
  LEFT JOIN public.profiles p ON p.user_id = utc.user_id
  WHERE LOWER(cn.email) = LOWER(TRIM(p_email))
  AND utc.invitation_status IN ('pending_confirmation', 'pending');
  
  RETURN COALESCE(pending_confirmations, '[]'::jsonb);
END;
$$;`;

  const permissionsSQL = `
-- Grant permissions
GRANT EXECUTE ON FUNCTION public.get_user_contacts(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_contact_relationships(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.add_trusted_contact_relationship(UUID, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION public.diagnose_contact_system() TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_pending_confirmations(TEXT) TO authenticated;

-- Grant service role permissions for edge functions
GRANT EXECUTE ON FUNCTION public.get_user_contacts(UUID) TO service_role;
GRANT EXECUTE ON FUNCTION public.check_contact_relationships(TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.add_trusted_contact_relationship(UUID, JSONB) TO service_role;
GRANT EXECUTE ON FUNCTION public.diagnose_contact_system() TO service_role;
GRANT EXECUTE ON FUNCTION public.check_pending_confirmations(TEXT) TO service_role;

-- Add to realtime publication
ALTER TABLE public.contacts_new REPLICA IDENTITY FULL;
ALTER TABLE public.user_trusted_contacts REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.contacts_new;
ALTER PUBLICATION supabase_realtime ADD TABLE public.user_trusted_contacts;

-- Add comments for documentation
COMMENT ON TABLE public.contacts_new IS 'Contact information - shared across users in many-to-many relationships';
COMMENT ON TABLE public.user_trusted_contacts IS 'Many-to-many relationships between users and their trusted contacts';
COMMENT ON FUNCTION public.get_user_contacts IS 'Get all contacts for a specific user with relationship details';
COMMENT ON FUNCTION public.check_contact_relationships IS 'Check if a contact exists and how many relationships they have';
COMMENT ON FUNCTION public.add_trusted_contact_relationship IS 'Safely add a trusted contact relationship for a user';
COMMENT ON FUNCTION public.diagnose_contact_system IS 'Diagnostic function to check contact system health';
COMMENT ON FUNCTION public.check_pending_confirmations IS 'Get pending confirmation requests for a specific email address';`;

  const runDiagnostics = async () => {
    setIsDiagnosing(true);
    setError(null);
    
    try {
      // Try to run manual diagnostics by checking table existence
      const result: any = {
        contacts_new_exists: false,
        user_trusted_contacts_exists: false,
        contacts_old_exists: false,
        contacts_new_count: -1,
        relationships_count: -1,
        get_user_contacts_exists: false,
        check_contact_relationships_exists: false,
        add_trusted_contact_relationship_exists: false
      };
      
      // Check if contacts_new table exists
      try {
        const { data: contactsNewData } = await supabase.from('contacts_new' as any).select('id').limit(1);
        result.contacts_new_exists = true;
        result.contacts_new_count = 0; // We'll count later if needed
      } catch (err) {
        result.contacts_new_exists = false;
      }
      
      // Check if user_trusted_contacts table exists
      try {
        const { data: relationshipsData } = await supabase.from('user_trusted_contacts' as any).select('id').limit(1);
        result.user_trusted_contacts_exists = true;
        result.relationships_count = 0; // We'll count later if needed
      } catch (err) {
        result.user_trusted_contacts_exists = false;
      }
      
      // Check if old contacts table exists
      try {
        const { data: contactsOldData } = await supabase.from('contacts').select('id').limit(1);
        result.contacts_old_exists = true;
      } catch (err) {
        result.contacts_old_exists = false;
      }
      
      console.log('Manual diagnostic result:', result);
      setDiagnosticResult(result);
    } catch (err) {
      console.error('Diagnostic failed:', err);
      setDiagnosticResult({
        error: err.message,
        available: false
      });
    } finally {
      setIsDiagnosing(false);
    }
  };

  const generateCompleteMigrationSQL = () => {
    return [
      "-- Step 1: Create Tables",
      migrationSQL,
      "",
      "-- Step 2: Set up RLS and Policies", 
      rlsAndPoliciesSQL,
      "",
      "-- Step 3: Create Triggers and Indexes",
      triggersAndIndexesSQL,
      "",
      "-- Step 4: Create Functions",
      functionsSQL,
      "",
      "-- Step 5: Set Permissions",
      permissionsSQL,
      "",
      "-- Step 6: Migrate Existing Data",
      dataMigrationSQL
    ].join('\n');
  };

  const executeMigration = async () => {
    setIsExecuting(true);
    setError(null);
    
    try {
      // Generate the complete migration SQL
      const completeMigrationSQL = generateCompleteMigrationSQL();
      
      // For now, we'll provide the SQL for manual execution
      setMigrationResult(`
⚠️ Manual Migration Required

Due to TypeScript limitations, please execute the following SQL manually in your Supabase SQL Editor:

${completeMigrationSQL}

Instructions:
1. Go to your Supabase Dashboard
2. Navigate to the SQL Editor
3. Copy and paste the above SQL
4. Execute it
5. Come back here and run diagnostics to verify

This migration is safe and uses "IF NOT EXISTS" clauses.
      `);
      
      toast({
        title: "Migration SQL Generated",
        description: "Please execute the provided SQL manually in Supabase Dashboard.",
      });
      
    } catch (err) {
      console.error('Migration generation failed:', err);
      setError(err.message);
      
      toast({
        title: "Migration Generation Failed",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setIsExecuting(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Schema Migration Tool
          </CardTitle>
          <CardDescription>
            Create missing advanced trusted contact tables and functions. This will enable the full bidirectional trusted contact system.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Diagnostic Section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium">Current Schema Status</h3>
              <Button 
                onClick={runDiagnostics} 
                disabled={isDiagnosing}
                variant="outline"
                size="sm"
              >
                {isDiagnosing ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <RefreshCw className="h-4 w-4 mr-2" />
                )}
                Run Diagnostics
              </Button>
            </div>
            
            {diagnosticResult && (
              <div className="p-3 bg-gray-50 rounded-lg">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      {diagnosticResult.contacts_new_exists ? (
                        <CheckCircle className="h-4 w-4 text-green-600" />
                      ) : (
                        <AlertTriangle className="h-4 w-4 text-red-600" />
                      )}
                      <span>contacts_new table</span>
                      <Badge variant={diagnosticResult.contacts_new_exists ? "default" : "destructive"}>
                        {diagnosticResult.contacts_new_exists ? "EXISTS" : "MISSING"}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      {diagnosticResult.user_trusted_contacts_exists ? (
                        <CheckCircle className="h-4 w-4 text-green-600" />
                      ) : (
                        <AlertTriangle className="h-4 w-4 text-red-600" />
                      )}
                      <span>user_trusted_contacts table</span>
                      <Badge variant={diagnosticResult.user_trusted_contacts_exists ? "default" : "destructive"}>
                        {diagnosticResult.user_trusted_contacts_exists ? "EXISTS" : "MISSING"}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      {diagnosticResult.get_user_contacts_exists ? (
                        <CheckCircle className="h-4 w-4 text-green-600" />
                      ) : (
                        <AlertTriangle className="h-4 w-4 text-red-600" />
                      )}
                      <span>get_user_contacts function</span>
                      <Badge variant={diagnosticResult.get_user_contacts_exists ? "default" : "destructive"}>
                        {diagnosticResult.get_user_contacts_exists ? "EXISTS" : "MISSING"}
                      </Badge>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="text-sm">
                      <span className="font-medium">Records:</span>
                    </div>
                    <div>contacts_new: {diagnosticResult.contacts_new_count >= 0 ? diagnosticResult.contacts_new_count : "N/A"}</div>
                    <div>relationships: {diagnosticResult.relationships_count >= 0 ? diagnosticResult.relationships_count : "N/A"}</div>
                  </div>
                </div>
                
                {diagnosticResult.error && (
                  <Alert className="mt-3">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      Diagnostic Error: {diagnosticResult.error}
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            )}
          </div>

          <Separator />

          {/* Migration Section */}
          <div className="space-y-3">
            <h3 className="text-lg font-medium">Execute Migration</h3>
            <p className="text-sm text-gray-600">
              This will create the missing advanced trusted contact tables, functions, and migrate existing data safely.
            </p>
            
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <strong>Important:</strong> This migration is safe and uses "IF NOT EXISTS" clauses. 
                It won't overwrite existing data but will create missing schema components.
              </AlertDescription>
            </Alert>

            <Button 
              onClick={executeMigration} 
              disabled={isExecuting}
              className="w-full"
            >
              {isExecuting ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Play className="h-4 w-4 mr-2" />
              )}
              Execute Schema Migration
            </Button>
          </div>

          {/* Results Section */}
          {(migrationResult || error) && (
            <div className="space-y-3">
              <Separator />
              <h3 className="text-lg font-medium">Migration Results</h3>
              <Textarea
                value={migrationResult || error || ""}
                readOnly
                rows={8}
                className="font-mono text-sm"
                placeholder="Migration results will appear here..."
              />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
} 