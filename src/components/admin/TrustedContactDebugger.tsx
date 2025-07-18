import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Search, Database, Users, Mail, AlertTriangle, CheckCircle, RefreshCw, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface DebugResult {
  section: string;
  data: any;
  error?: string;
}

interface RelationshipFixResult {
  scanned?: {
    total: number;
    needsMapping: number;
  };
  fixed?: Array<{
    email: string;
    userName: string;
    userId: string;
  }>;
  errors?: string[];
}

export function TrustedContactDebugger() {
  const [email, setEmail] = useState("delivered@resend.dev");
  const [targetUserEmail, setTargetUserEmail] = useState("20attpkz@gmail.com");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<DebugResult[]>([]);
  const [relationshipFixResults, setRelationshipFixResults] = useState<RelationshipFixResult | null>(null);
  const { toast } = useToast();

  const runDiagnosis = async () => {
    if (!email.trim() || !targetUserEmail.trim()) {
      toast({
        title: "Missing Information",
        description: "Please enter both email addresses",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    setResults([]);
    
    try {
      // 1. Check if trusted contact user exists
      const trustedUserResult = await checkUserExists(email);
      setResults(prev => [...prev, {
        section: "User Account Check",
        data: trustedUserResult
      }]);

      // 2. Check if main user exists  
      const mainUserResult = await checkUserExists(targetUserEmail);
      setResults(prev => [...prev, {
        section: "Main User Account Check", 
        data: mainUserResult
      }]);

      // 3. Special Google SSO Profile Check for main user
      const ssoProfileResult = await checkGoogleSSOProfile(targetUserEmail);
      setResults(prev => [...prev, {
        section: "Google SSO Profile Check",
        data: ssoProfileResult
      }]);

      // 4. Check raw contact records - what actually exists
      const rawContactsResult = await checkRawContacts(email, targetUserEmail);
      setResults(prev => [...prev, {
        section: "Raw Contact Records",
        data: rawContactsResult
      }]);

      // 5. Try new structure query
      const newStructureResult = await checkNewStructure(email);
      setResults(prev => [...prev, {
        section: "New Structure Query",
        data: newStructureResult
      }]);

      // 6. Try old structure query
      const oldStructureResult = await checkOldStructure(email);
      setResults(prev => [...prev, {
        section: "Old Structure Query", 
        data: oldStructureResult
      }]);

      // 7. Check specific relationship
      const relationshipResult = await checkSpecificRelationship(email, targetUserEmail);
      setResults(prev => [...prev, {
        section: "Specific Relationship",
        data: relationshipResult
      }]);

      // 8. Check what the target user sees
      const targetUserResult = await checkTargetUserContacts(targetUserEmail);
      setResults(prev => [...prev, {
        section: "Target User's Contacts",
        data: targetUserResult
      }]);

      // 9. Check database schema
      const schemaResult = await checkDatabaseSchema();
      setResults(prev => [...prev, {
        section: "Database Schema Check",
        data: schemaResult
      }]);

      // 10. Check trusted contact responsibilities (bidirectional view)
      const responsibilitiesResult = await checkTrustedContactResponsibilities(email, targetUserEmail);
      setResults(prev => [...prev, {
        section: "Trusted Contact Responsibilities",
        data: responsibilitiesResult
      }]);

      // 11. Check pending confirmation requests specifically
      const pendingResult = await checkPendingConfirmations(email);
      setResults(prev => [...prev, {
        section: "Pending Confirmation Requests",
        data: pendingResult
      }]);

    } catch (error) {
      console.error('Diagnosis error:', error);
      toast({
        title: "Diagnosis Failed",
        description: error instanceof Error ? error.message : "Unknown error occurred",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const checkUserExists = async (email: string) => {
    try {
      // Check auth.users via RPC (since we can't query it directly)
      const { data, error } = await supabase.functions.invoke('check-user-exists', {
        body: { email }
      });
      
      if (error) throw error;
      
      return {
        email,
        exists: data?.exists || false,
        user_id: data?.user_id || null,
        message: data?.exists ? "User account exists" : "No user account found"
      };
    } catch (error) {
      return {
        email,
        exists: false,
        error: error.message,
        message: "Error checking user account"
      };
    }
  };

  const checkNewStructure = async (email: string) => {
    try {
      const { data, error } = await (supabase as any)
        .from('user_trusted_contacts')
        .select(`
          id,
          user_id,
          role,
          is_primary,
          invitation_status,
          confirmed_at,
          created_at,
          contacts_new!inner(id, email, full_name, target_user_id),
          profiles!user_trusted_contacts_user_id_fkey(
            user_id,
            first_name,
            last_name,
            display_name,
            email
          )
        `)
        .eq('contacts_new.email', email.toLowerCase())
        .eq('contact_type', 'trusted');

      return {
        table: 'user_trusted_contacts + contacts_new',
        count: data?.length || 0,
        relationships: data || [],
        error: error?.message,
        message: data?.length ? `Found ${data.length} relationships` : "No relationships found"
      };
    } catch (error) {
      return {
        table: 'user_trusted_contacts + contacts_new',
        count: 0,
        error: error.message,
        message: "Error querying new structure (might not exist)"
      };
    }
  };

  const checkOldStructure = async (email: string) => {
    try {
      const { data, error } = await supabase
        .from('contacts')
        .select(`
          id,
          user_id,
          role,
          is_primary,
          invitation_status,
          confirmed_at,
          contact_type,
          full_name,
          email,
          target_user_id,
          created_at
        `)
        .eq('email', email.toLowerCase())
        .eq('contact_type', 'trusted');

      return {
        table: 'contacts',
        count: data?.length || 0,
        relationships: data || [],
        error: error?.message,
        message: data?.length ? `Found ${data.length} relationships` : "No relationships found"
      };
    } catch (error) {
      return {
        table: 'contacts',
        count: 0,
        error: error.message,
        message: "Error querying old structure"
      };
    }
  };

  const checkSpecificRelationship = async (trustedEmail: string, mainUserEmail: string) => {
    try {
      // Use the Edge Function to check if main user exists
      const { data: userCheckResult, error: userCheckError } = await supabase.functions.invoke('check-user-exists', {
        body: { email: mainUserEmail }
      });

      if (userCheckError || !userCheckResult?.exists) {
        return {
          error: `Main user ${mainUserEmail} not found`,
          message: "Main user doesn't exist",
          user_check_result: userCheckResult
        };
      }

      // Check contacts table for any relationships involving these emails
      const { data: contactData, error: contactError } = await supabase
        .from('contacts')
        .select('*')
        .eq('email', trustedEmail.toLowerCase())
        .eq('contact_type', 'trusted');

      return {
        main_user_exists: true,
        trusted_email: trustedEmail,
        relationship_exists: contactData?.length > 0,
        relationship_data: contactData || [],
        message: contactData?.length ? "Relationship exists" : "No relationship found"
      };
    } catch (error) {
      return {
        error: error.message,
        message: "Error checking specific relationship"
      };
    }
  };

  const checkTargetUserContacts = async (userEmail: string) => {
    try {
      // Get user ID
      const { data: userData, error: userError } = await supabase
        .from('profiles')
        .select('user_id')
        .eq('display_name', userEmail.split('@')[0])
        .single();

      if (userError || !userData) {
        return {
          error: `User ${userEmail} not found`,
          message: "User doesn't exist"
        };
      }

      // Get all their contacts
      const { data: contactsData, error: contactsError } = await supabase
        .from('contacts')
        .select('*')
        .eq('user_id', userData.user_id)
        .order('created_at', { ascending: false });

      return {
        user: userData,
        total_contacts: contactsData?.length || 0,
        trusted_contacts: contactsData?.filter(c => c.contact_type === 'trusted').length || 0,
        contacts: contactsData || [],
        message: `Found ${contactsData?.length || 0} total contacts`
      };
    } catch (error) {
      return {
        error: error.message,
        message: "Error checking user's contacts"
      };
    }
  };

  const checkDatabaseSchema = async () => {
    try {
      console.log('🔍 Checking database schema...');
      
      // Use the diagnostic function to check what tables exist
      const { data: systemDiag, error: diagError } = await (supabase as any).rpc('diagnose_contact_system');
      
      // Try to query both old and new tables to see what actually exists
      const oldContactsTest = await (supabase as any)
        .from('contacts')
        .select('*')
        .limit(1);
      
      const newContactsTest = await (supabase as any)
        .from('contacts_new')
        .select('*')
        .limit(1);
        
      const userContactsTest = await (supabase as any)
        .from('user_trusted_contacts')
        .select('*')
        .limit(1);

      // Get column info for contacts table
      const { data: contactColumns, error: columnsError } = await (supabase as any)
        .rpc('get_table_columns', { table_name: 'contacts' });

      return {
        success: true,
        system_diagnosis: systemDiag,
        system_diagnosis_error: diagError?.message,
        table_tests: {
          contacts_old: {
            exists: !oldContactsTest.error,
            error: oldContactsTest.error?.message,
            sample_count: oldContactsTest.data?.length || 0
          },
          contacts_new: {
            exists: !newContactsTest.error,
            error: newContactsTest.error?.message,
            sample_count: newContactsTest.data?.length || 0
          },
          user_trusted_contacts: {
            exists: !userContactsTest.error,
            error: userContactsTest.error?.message,
            sample_count: userContactsTest.data?.length || 0
          }
        },
        contact_columns: contactColumns,
        columns_error: columnsError?.message,
        message: "Database schema analysis complete"
      };

    } catch (error) {
      console.error('❌ checkDatabaseSchema error:', error);
      return {
        error: error instanceof Error ? error.message : 'Unknown error',
        message: "Exception in database schema check"
      };
    }
  };

  const checkPendingConfirmations = async (userEmail: string) => {
    try {
      console.log('🔍 Checking pending confirmations for:', userEmail);
      
      // Look for ALL contacts with this email and see their invitation_status
      const { data: allMatches, error: allError } = await (supabase as any)
        .from('contacts')
        .select('*')
        .eq('email', userEmail.toLowerCase());

      console.log('📧 All contacts with this email:', allMatches);

      // Specifically look for pending_confirmation status
      const { data: pendingMatches, error: pendingError } = await (supabase as any)
        .from('contacts')
        .select('*')
        .eq('email', userEmail.toLowerCase())
        .eq('invitation_status', 'pending_confirmation');

      console.log('⏳ Contacts with pending_confirmation status:', pendingMatches);

      // Check what the useTrustedContactStatus hook would see
      const { data: hookQuery, error: hookError } = await (supabase as any)
        .from('contacts')
        .select('*')
        .eq('email', userEmail.toLowerCase())
        .eq('contact_type', 'trusted')
        .in('invitation_status', ['pending', 'registered', 'pending_confirmation']);

      console.log('🪝 What the hook query would return:', hookQuery);

      return {
        success: true,
        user_email: userEmail,
        all_email_matches: allMatches || [],
        all_email_count: allMatches?.length || 0,
        pending_confirmation_matches: pendingMatches || [],
        pending_confirmation_count: pendingMatches?.length || 0,
        hook_query_matches: hookQuery || [],
        hook_query_count: hookQuery?.length || 0,
        message: `Found ${pendingMatches?.length || 0} pending confirmation requests`,
        errors: {
          all_query: allError?.message,
          pending_query: pendingError?.message,
          hook_query: hookError?.message
        }
      };
    } catch (error) {
      console.error('❌ Error checking pending confirmations:', error);
      return {
        success: false,
        error: error.message,
        message: "Failed to check pending confirmations"
      };
    }
  };

  const checkTrustedContactResponsibilities = async (trustedEmail: string, targetUserEmail: string) => {
    try {
      console.log('🔍 Checking trusted contact responsibilities for:', trustedEmail);
      
      // Get the trusted user's ID first  
      const { data: userCheckResult, error: userCheckError } = await supabase.functions.invoke('check-user-exists', {
        body: { email: trustedEmail.toLowerCase() }
      });

      if (userCheckError || !userCheckResult?.exists) {
        return {
          error: `User ${trustedEmail} not found`,
          message: "User doesn't exist, so can't have responsibilities"
        };
      }

      const trustedUserId = userCheckResult?.user_id;

      // SIMPLIFIED APPROACH: Just look for raw contacts with this email (no joins)
      const { data: directEmailContacts, error: emailError } = await (supabase as any)
        .from('contacts')
        .select('*')
        .eq('email', trustedEmail.toLowerCase());

      if (emailError) {
        console.error('❌ Direct email query failed:', emailError);
      }

      // Additional debugging: Check for ANY contacts with similar email patterns
      const { data: allContactsWithEmail, error: allContactsError } = await (supabase as any)
        .from('contacts')
        .select('*')
        .ilike('email', `%${trustedEmail.split('@')[0]}%`);

      // Check for contacts by the user who should have added this trusted contact
      const { data: mainUserContactsCheck, error: mainUserError } = await supabase.functions.invoke('check-user-exists', {
        body: { email: targetUserEmail.toLowerCase() }
      });

      let mainUserContacts = [];
      if (mainUserContactsCheck?.exists && mainUserContactsCheck.user_id) {
        const { data: contacts, error: contactsError } = await (supabase as any)
          .from('contacts')
          .select('*')
          .eq('user_id', mainUserContactsCheck.user_id);
        mainUserContacts = contacts || [];
      }

      // Simplified profile data without joins
      const profileData = [];
      if (directEmailContacts && directEmailContacts.length > 0) {
        for (const contact of directEmailContacts) {
          profileData.push({
            contact,
            relationship_summary: `Contact ID ${contact.id} - ${contact.full_name} (${contact.relationship || 'Unknown relationship'}) trusts ${trustedEmail}`
          });
        }
      }

      return {
        success: true,
        trusted_user_id: trustedUserId,
        trusted_email: trustedEmail,
        schema_type: 'basic_contacts_table',
        responsibilities_found: directEmailContacts?.length || 0,
        responsibilities: directEmailContacts || [],
        profile_enhanced_data: profileData,
        message: `Found ${directEmailContacts?.length || 0} people who trust ${trustedEmail} (using basic schema)`,
        note: "Using basic contacts table schema. Advanced bidirectional relationships not available.",
        debugging_info: {
          similar_email_contacts: allContactsWithEmail || [],
          similar_email_count: allContactsWithEmail?.length || 0,
          main_user_exists: mainUserContactsCheck?.exists || false,
          main_user_id: mainUserContactsCheck?.user_id || null,
          main_user_contacts: mainUserContacts,
          main_user_contact_count: mainUserContacts.length,
          target_user_email: targetUserEmail
        },
        errors: {
          email_query: emailError?.message,
          user_check: userCheckError?.message,
          all_contacts_query: allContactsError?.message,
          main_user_check: mainUserError?.message
        },
        raw_results: {
          direct_email_contacts: directEmailContacts,
          user_exists: userCheckResult?.exists,
          user_id: trustedUserId
        }
      };

    } catch (error) {
      console.error('❌ checkTrustedContactResponsibilities error:', error);
      return {
        error: error instanceof Error ? error.message : 'Unknown error',
        message: "Exception in responsibilities check"
      };
    }
  };

  const checkRawContacts = async (trustedEmail: string, mainEmail: string) => {
    try {
      console.log('🔍 Checking raw contact records...');
      
      // Check contact records by email
      const { data: contactsByEmail, error: emailError } = await supabase
        .from('contacts')
        .select('*')
        .eq('email', trustedEmail);

      if (emailError) {
        console.error('❌ Contacts by email query error:', emailError);
      }

      // Check for any contacts that might reference the main user's email
      const { data: contactsWithMainEmail, error: mainEmailError } = await supabase
        .from('contacts')
        .select('*')
        .ilike('email', `%${mainEmail}%`);

      if (mainEmailError) {
        console.error('❌ Contacts with main email query error:', mainEmailError);
      }

             // Get all contacts table records to see what exists
      const { data: allRelevantContacts, error: allContactsError } = await supabase
        .from('contacts')
        .select('*')
        .limit(100); // Limit to avoid too much data

      if (allContactsError) {
        console.error('❌ All contacts query error:', allContactsError);
      }

      const totalFound = (contactsByEmail?.length || 0) + 
                        (contactsWithMainEmail?.length || 0);

      return {
        success: true,
        contacts_by_email: contactsByEmail || [],
        contacts_with_main_email: contactsWithMainEmail || [],
        all_contacts_sample: allRelevantContacts?.slice(0, 10) || [], // Show first 10 for debugging
        total_found: totalFound,
        message: `Found ${totalFound} relevant contact records. Sample of all contacts included for debugging.`,
        errors: {
          email_query: emailError?.message,
          main_email_query: mainEmailError?.message,
          all_contacts_query: allContactsError?.message
        }
      };

    } catch (error) {
      console.error('❌ checkRawContacts error:', error);
      return {
        error: error instanceof Error ? error.message : 'Unknown error',
        message: "Exception in raw contacts check"
      };
    }
  };

  const checkGoogleSSOProfile = async (email: string) => {
    try {
      console.log('🔍 Checking Google SSO profile for:', email);
      
      // First check if there's a profile with this user's email through the profiles table
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select(`
          *,
          user_id
        `)
        .limit(10); // Get some profiles to see the structure

      if (profileError) {
        console.error('❌ Profile query error:', profileError);
      }

      // Try to find profiles where the user_id corresponds to someone with this email
      // We can't directly query auth.users, but we can use the Edge Function
      const { data: userCheckResult, error: userCheckError } = await supabase.functions.invoke('check-user-exists', {
        body: { email: email.toLowerCase() }
      });

      if (userCheckError) {
        console.error('❌ User check error:', userCheckError);
      }

      // Get all contacts that reference this email
      const { data: contactsReferencing, error: contactsError } = await supabase
        .from('contacts')
        .select('*')
        .eq('email', email.toLowerCase());

      if (contactsError) {
        console.error('❌ Contacts referencing error:', contactsError);
      }

      return {
        success: true,
        email_checked: email,
        user_exists_check: userCheckResult,
        sample_profiles: profileData?.slice(0, 3) || [], // Show first 3 profiles for structure
        total_profiles_found: profileData?.length || 0,
        contacts_referencing_email: contactsReferencing || [],
        message: `Google SSO check complete. User exists: ${userCheckResult?.exists || false}. Found ${contactsReferencing?.length || 0} contact records.`,
        errors: {
          profile_query: profileError?.message,
          user_check: userCheckError?.message,
          contacts_query: contactsError?.message
        }
      };

    } catch (error) {
      console.error('❌ checkGoogleSSOProfile error:', error);
      return {
        error: error instanceof Error ? error.message : 'Unknown error',
        message: "Exception in Google SSO profile check"
      };
    }
  };

  const scanAndFixRelationships = async () => {
    setLoading(true);
    setRelationshipFixResults(null);
    const errors: string[] = [];
    let scannedCount = 0;
    let fixedCount = 0;

    try {
      // 1. Scan for contacts that need profile mapping
      const { data: contactsToFix, error: scanError } = await supabase
        .from('contacts')
        .select('id, email, user_id, full_name')
        .eq('contact_type', 'trusted')
        .is('user_id', null); // Find contacts where user_id is null

      if (scanError) {
        errors.push(`Error scanning for contacts to fix: ${scanError.message}`);
      } else {
        scannedCount = contactsToFix?.length || 0;
        if (scannedCount > 0) {
          console.log(`Found ${scannedCount} contacts that need profile mapping.`);
          const fixedPromises = contactsToFix.map(async (contact) => {
            try {
                             const { data: profile, error: profileError } = await supabase
                 .from('profiles')
                 .select('user_id, first_name, last_name')
                 .eq('display_name', contact.email.split('@')[0])
                 .single();

              if (profileError) {
                errors.push(`Error finding profile for contact ${contact.email}: ${profileError.message}`);
                return null;
              }

              if (profile?.user_id) {
                const { error: updateError } = await supabase
                  .from('contacts')
                  .update({ user_id: profile.user_id })
                  .eq('id', contact.id);

                if (updateError) {
                  errors.push(`Error updating contact ${contact.email} with user_id ${profile.user_id}: ${updateError.message}`);
                  return null;
                }
                fixedCount++;
                return {
                  email: contact.email,
                  userName: profile.first_name + ' ' + profile.last_name,
                  userId: profile.user_id
                };
              }
              return null;
            } catch (e) {
              errors.push(`Error fixing contact ${contact.email}: ${e instanceof Error ? e.message : String(e)}`);
              return null;
            }
          });

          const fixedResults = await Promise.all(fixedPromises);
          setRelationshipFixResults({
            scanned: { total: scannedCount, needsMapping: scannedCount - fixedCount },
            fixed: fixedResults.filter(Boolean) as Array<{ email: string; userName: string; userId: string }>
          });
        } else {
          setRelationshipFixResults({ scanned: { total: scannedCount, needsMapping: 0 } });
        }
      }

    } catch (error) {
      console.error('Error during relationship scan and fix:', error);
      errors.push(`Error during relationship scan and fix: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setLoading(false);
      if (errors.length > 0) {
        toast({
          title: "Relationship Fix Failed",
          description: errors.join('\n'),
          variant: "destructive",
        });
      } else {
        toast({
          title: "Relationship Fix Complete",
          description: `Scanned ${scannedCount} contacts. Fixed ${fixedCount} relationships.`,
        });
      }
    }
  };

  const renderResult = (result: DebugResult) => {
    const hasError = result.error || result.data?.error;
    const isEmpty = result.data?.count === 0 || result.data?.relationships?.length === 0;
    
    return (
      <Card key={result.section} className="mb-4">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">{result.section}</CardTitle>
            <Badge variant={hasError ? "destructive" : isEmpty ? "secondary" : "default"}>
              {hasError ? "Error" : isEmpty ? "Empty" : "Found Data"}
            </Badge>
          </div>
          {result.data?.message && (
            <CardDescription>{result.data.message}</CardDescription>
          )}
        </CardHeader>
        <CardContent>
          {hasError && (
            <Alert className="mb-4" variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                {result.error || result.data?.error}
              </AlertDescription>
            </Alert>
          )}
          
          <div className="bg-muted p-3 rounded-md">
            <pre className="text-sm overflow-auto">
              {JSON.stringify(result.data, null, 2)}
            </pre>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="w-5 h-5" />
            Trusted Contact Relationship Debugger
          </CardTitle>
          <CardDescription>
            Debug tool to diagnose trusted contact relationship issues between specific users
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="trusted-email">Trusted Contact Email</Label>
              <Input
                id="trusted-email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="delivered@resend.dev"
              />
            </div>
            <div>
              <Label htmlFor="target-email">Main User Email</Label>
              <Input
                id="target-email"
                value={targetUserEmail}
                onChange={(e) => setTargetUserEmail(e.target.value)}
                placeholder="20attpkz@gmail.com"
              />
            </div>
          </div>
          
          <Button 
            onClick={runDiagnosis} 
            disabled={loading || !email || !targetUserEmail}
            className="w-full"
          >
            {loading ? (
              <>
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                Running Diagnosis...
              </>
            ) : (
              <>
                <Search className="w-4 h-4 mr-2" />
                Run Diagnosis
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {results.length > 0 && (
        <div className="space-y-4">
          <Separator />
          <h3 className="text-lg font-semibold">Diagnosis Results</h3>
          {results.map(renderResult)}
        </div>
      )}

      <Separator className="my-6" />

      {/* Relationship Mapper Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <RefreshCw className="w-5 h-5" />
            Relationship Mapper
          </CardTitle>
          <CardDescription>
            Scan and fix existing trusted contact relationships that may be broken due to missing profiles
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button
            onClick={scanAndFixRelationships}
            disabled={loading} // Changed from isLoading to loading
            className="w-full"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <RefreshCw className="w-4 h-4 mr-2" />
            )}
            Scan & Fix All Relationships
          </Button>
          
          {relationshipFixResults && (
            <div className="space-y-3">
              <h4 className="font-medium">Relationship Fix Results:</h4>
              
              {relationshipFixResults.scanned && (
                <Alert>
                  <CheckCircle className="h-4 w-4" />
                  <AlertDescription>
                    Scanned {relationshipFixResults.scanned.total} contact records. 
                    Found {relationshipFixResults.scanned.needsMapping} that need mapping fixes.
                  </AlertDescription>
                </Alert>
              )}

              {relationshipFixResults.fixed && relationshipFixResults.fixed.length > 0 && (
                <Alert>
                  <CheckCircle className="h-4 w-4" />
                  <AlertDescription>
                    Fixed {relationshipFixResults.fixed.length} relationships:
                    <ul className="mt-2 space-y-1">
                      {relationshipFixResults.fixed.map((fix, index) => (
                        <li key={index} className="text-sm">
                          • {fix.email} → {fix.userName} (now properly linked)
                        </li>
                      ))}
                    </ul>
                  </AlertDescription>
                </Alert>
              )}

              {relationshipFixResults.errors && relationshipFixResults.errors.length > 0 && (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    {relationshipFixResults.errors.length} errors occurred:
                    <ul className="mt-2 space-y-1">
                      {relationshipFixResults.errors.map((error, index) => (
                        <li key={index} className="text-sm">• {error}</li>
                      ))}
                    </ul>
                  </AlertDescription>
                </Alert>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
} 