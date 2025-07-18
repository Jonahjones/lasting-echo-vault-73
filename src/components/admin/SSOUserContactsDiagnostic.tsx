import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { 
  User, 
  Search, 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  Info,
  Mail,
  Database,
  Link
} from 'lucide-react';

interface SSODiagnosticResult {
  section: string;
  status: 'success' | 'error' | 'warning' | 'info';
  data: any;
  message?: string;
}

export function SSOUserContactsDiagnostic() {
  const [ssoEmail, setSSOEmail] = useState("20attpkz@gmail.com");
  const [trustedEmail, setTrustedEmail] = useState("delivered@resend.dev");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<SSODiagnosticResult[]>([]);
  const { toast } = useToast();

  const runDiagnosis = async () => {
    if (!ssoEmail.trim() || !trustedEmail.trim()) {
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
      // 1. Check if SSO user exists in auth.users
      const ssoUserResult = await checkSSOUserExists(ssoEmail);
      setResults(prev => [...prev, ssoUserResult]);

      // 2. Check SSO user's profile
      const ssoProfileResult = await checkSSOUserProfile(ssoEmail);
      setResults(prev => [...prev, ssoProfileResult]);

      // 3. Check trusted contact user exists
      const trustedUserResult = await checkTrustedUserExists(trustedEmail);
      setResults(prev => [...prev, trustedUserResult]);

      // 4. Check current contact relationships in old table
      const oldContactsResult = await checkOldContactsTable(ssoEmail, trustedEmail);
      setResults(prev => [...prev, oldContactsResult]);

      // 5. Check for advanced table availability
      const advancedTablesResult = await checkAdvancedTablesExist();
      setResults(prev => [...prev, advancedTablesResult]);

      // 6. Simulate contact creation process
      const creationSimResult = await simulateContactCreation(ssoEmail, trustedEmail);
      setResults(prev => [...prev, creationSimResult]);

      // 7. Check current trusted contact recognition
      const recognitionResult = await checkTrustedContactRecognition(trustedEmail);
      setResults(prev => [...prev, recognitionResult]);

      // 8. Propose fixes
      const fixesResult = await generateFixRecommendations();
      setResults(prev => [...prev, fixesResult]);

    } catch (error) {
      console.error('Diagnosis failed:', error);
      toast({
        title: "Diagnosis Failed",
        description: error instanceof Error ? error.message : "Unknown error occurred",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const checkSSOUserExists = async (email: string): Promise<SSODiagnosticResult> => {
    try {
      console.log('🔍 Checking SSO user existence for:', email);
      
      const { data, error } = await supabase.functions.invoke('check-user-exists', {
        body: { email: email.toLowerCase() }
      });

      if (error) {
        return {
          section: "SSO User Account",
          status: 'error',
          data: { error: error.message },
          message: "Failed to check user existence"
        };
      }

      return {
        section: "SSO User Account",
        status: data?.exists ? 'success' : 'warning',
        data: {
          exists: data?.exists,
          user_id: data?.user_id,
          email: data?.email,
          provider: "Google SSO (inferred)"
        },
        message: data?.exists ? 
          `SSO user found with ID: ${data.user_id}` : 
          "SSO user not found in auth.users"
      };
    } catch (error) {
      return {
        section: "SSO User Account",
        status: 'error',
        data: { error: error.message },
        message: "Exception checking SSO user"
      };
    }
  };

  const checkSSOUserProfile = async (email: string): Promise<SSODiagnosticResult> => {
    try {
      // Try to find profile by username pattern (common for SSO users)
      const username = email.split('@')[0];
      
      const { data: profiles, error } = await supabase
        .from('profiles')
        .select('*')
        .or(`display_name.ilike.%${username}%,first_name.ilike.%${username}%`)
        .limit(5);

      if (error) {
        return {
          section: "SSO User Profile",
          status: 'error',
          data: { error: error.message },
          message: "Failed to query profiles"
        };
      }

      // Find best match
      const bestMatch = profiles?.find(p => 
        p.display_name?.toLowerCase().includes(username.toLowerCase()) ||
        p.first_name?.toLowerCase().includes(username.toLowerCase())
      );

      return {
        section: "SSO User Profile",
        status: bestMatch ? 'success' : 'warning',
        data: {
          profiles_found: profiles?.length || 0,
          best_match: bestMatch,
          search_pattern: username,
          all_profiles: profiles
        },
        message: bestMatch ? 
          `Profile found: ${bestMatch.display_name || bestMatch.first_name}` :
          `No profile found matching pattern: ${username}`
      };
    } catch (error) {
      return {
        section: "SSO User Profile",
        status: 'error',
        data: { error: error.message },
        message: "Exception checking SSO user profile"
      };
    }
  };

  const checkTrustedUserExists = async (email: string): Promise<SSODiagnosticResult> => {
    try {
      const { data, error } = await supabase.functions.invoke('check-user-exists', {
        body: { email: email.toLowerCase() }
      });

      return {
        section: "Trusted Contact User",
        status: data?.exists ? 'success' : 'info',
        data: {
          exists: data?.exists,
          user_id: data?.user_id,
          email: data?.email
        },
        message: data?.exists ? 
          `Trusted contact is a registered user: ${data.user_id}` :
          "Trusted contact is not a registered user (invitation pending)"
      };
    } catch (error) {
      return {
        section: "Trusted Contact User",
        status: 'error',
        data: { error: error.message },
        message: "Exception checking trusted contact user"
      };
    }
  };

  const checkOldContactsTable = async (ssoEmail: string, trustedEmail: string): Promise<SSODiagnosticResult> => {
    try {
      // Look for contact relationships in old table
      const { data: relationships, error } = await supabase
        .from('contacts')
        .select('*')
        .eq('email', trustedEmail.toLowerCase())
        .eq('contact_type', 'trusted');

      if (error) {
        return {
          section: "Old Contacts Table",
          status: 'error',
          data: { error: error.message },
          message: "Failed to query old contacts table"
        };
      }

      // Check if any relationship involves the SSO user
      const ssoRelated = relationships?.filter(rel => {
        // Try to match by user_id or target_user_id (need to cross-reference)
        return true; // We'll examine all for now
      });

      return {
        section: "Old Contacts Table",
        status: relationships?.length ? 'success' : 'warning',
        data: {
          total_relationships: relationships?.length || 0,
          relationships: relationships,
          sso_related: ssoRelated?.length || 0
        },
        message: relationships?.length ? 
          `Found ${relationships.length} trusted contact relationships` :
          "No trusted contact relationships found in old table"
      };
    } catch (error) {
      return {
        section: "Old Contacts Table",
        status: 'error',
        data: { error: error.message },
        message: "Exception checking old contacts table"
      };
    }
  };

  const checkAdvancedTablesExist = async (): Promise<SSODiagnosticResult> => {
    try {
      // Try to query the advanced tables to see if they exist
      let contactsNewExists = false;
      let userTrustedContactsExists = false;
      
      try {
        const { data, error } = await (supabase as any)
          .from('contacts_new')
          .select('id')
          .limit(1);
        contactsNewExists = !error;
      } catch (e) {
        contactsNewExists = false;
      }

      try {
        const { data, error } = await (supabase as any)
          .from('user_trusted_contacts')
          .select('id')
          .limit(1);
        userTrustedContactsExists = !error;
      } catch (e) {
        userTrustedContactsExists = false;
      }

      const bothExist = contactsNewExists && userTrustedContactsExists;

      return {
        section: "Advanced Tables",
        status: bothExist ? 'success' : 'warning',
        data: {
          contacts_new_exists: contactsNewExists,
          user_trusted_contacts_exists: userTrustedContactsExists,
          migration_needed: !bothExist
        },
        message: bothExist ? 
          "Advanced many-to-many tables exist" :
          "Advanced tables missing - migration needed"
      };
    } catch (error) {
      return {
        section: "Advanced Tables",
        status: 'error',
        data: { error: error.message },
        message: "Exception checking advanced tables"
      };
    }
  };

  const simulateContactCreation = async (ssoEmail: string, trustedEmail: string): Promise<SSODiagnosticResult> => {
    try {
      // Simulate what happens when SSO user tries to add trusted contact
      console.log('🧪 Simulating contact creation process...');

      // Step 1: Check if contact exists function works
      let contactCheckResult = null;
      try {
        const { data, error } = await supabase.rpc('check_contact_relationships', {
          p_email: trustedEmail.toLowerCase()
        });
        contactCheckResult = { success: !error, data, error };
      } catch (e) {
        contactCheckResult = { success: false, error: e.message };
      }

      // Step 2: Check if add function exists  
      let addFunctionExists = false;
      try {
        // This will fail if function doesn't exist, but we catch it
        const { data, error } = await supabase.rpc('add_trusted_contact_relationship', {
          p_user_id: '00000000-0000-0000-0000-000000000000', // dummy UUID
          p_contact_data: {
            email: 'test@example.com',
            full_name: 'Test',
            contact_type: 'trusted',
            role: 'executor'
          }
        });
        addFunctionExists = true; // If we get here, function exists (even if it errors on data)
      } catch (e) {
        addFunctionExists = e.message?.includes('function') === false;
      }

      return {
        section: "Contact Creation Simulation",
        status: (contactCheckResult?.success && addFunctionExists) ? 'success' : 'warning',
        data: {
          check_function_works: contactCheckResult?.success,
          check_function_result: contactCheckResult,
          add_function_exists: addFunctionExists,
          simulation_complete: true
        },
        message: (contactCheckResult?.success && addFunctionExists) ? 
          "Contact creation functions are available" :
          "Contact creation functions missing or broken"
      };
    } catch (error) {
      return {
        section: "Contact Creation Simulation",
        status: 'error',
        data: { error: error.message },
        message: "Exception during simulation"
      };
    }
  };

  const checkTrustedContactRecognition = async (trustedEmail: string): Promise<SSODiagnosticResult> => {
    try {
      // Check how the system currently recognizes this email as trusted contact
      const { data: currentRecognition, error } = await supabase
        .from('contacts')
        .select(`
          id,
          user_id,
          role,
          is_primary,
          email,
          full_name,
          contact_type,
          invitation_status,
          target_user_id,
          profiles!contacts_user_id_fkey(
            user_id,
            first_name,
            last_name,
            display_name
          )
        `)
        .eq('email', trustedEmail.toLowerCase())
        .eq('contact_type', 'trusted');

      if (error) {
        return {
          section: "Trusted Contact Recognition",
          status: 'error',
          data: { error: error.message },
          message: "Failed to check trusted contact recognition"
        };
      }

      const mainUsers = currentRecognition?.map(contact => ({
        user_id: contact.user_id,
        user_name: contact.profiles?.display_name || 
                  `${contact.profiles?.first_name || ''} ${contact.profiles?.last_name || ''}`.trim() ||
                  'Unknown User',
        role: contact.role,
        is_primary: contact.is_primary,
        target_user_id: contact.target_user_id
      })) || [];

      return {
        section: "Trusted Contact Recognition",
        status: currentRecognition?.length ? 'success' : 'warning',
        data: {
          recognized_relationships: currentRecognition?.length || 0,
          relationships: currentRecognition,
          main_users: mainUsers,
          properly_linked: mainUsers.filter(u => u.target_user_id).length
        },
        message: currentRecognition?.length ? 
          `Recognized as trusted contact for ${currentRecognition.length} users` :
          "Not recognized as trusted contact for any users"
      };
    } catch (error) {
      return {
        section: "Trusted Contact Recognition",
        status: 'error',
        data: { error: error.message },
        message: "Exception checking trusted contact recognition"
      };
    }
  };

  const generateFixRecommendations = async (): Promise<SSODiagnosticResult> => {
    const fixes = [
      {
        issue: "Missing Advanced Schema",
        solution: "Apply the Schema Migration Tool to create contacts_new and user_trusted_contacts tables",
        priority: "High",
        action: "Go to Admin Panel → Schema Migration and run the migration"
      },
      {
        issue: "SSO User Email Resolution",
        solution: "Update contact creation to use check-user-exists Edge Function for proper user ID mapping",
        priority: "High", 
        action: "Backend needs to properly link SSO emails to user IDs during contact creation"
      },
      {
        issue: "Target User ID Missing",
        solution: "Populate target_user_id field in contacts when the email belongs to an existing user",
        priority: "Medium",
        action: "Run RelationshipMapper tool to fix existing contact relationships"
      },
      {
        issue: "Trusted Contact Recognition",
        solution: "Update useTrustedContactStatus hook to work with both old and new schemas",
        priority: "Medium",
        action: "Frontend needs fallback logic for both contact systems"
      }
    ];

    return {
      section: "Fix Recommendations",
      status: 'info',
      data: { fixes },
      message: "Recommended steps to resolve SSO user contact issues"
    };
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success': return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'error': return <XCircle className="h-4 w-4 text-red-600" />;
      case 'warning': return <AlertTriangle className="h-4 w-4 text-yellow-600" />;
      default: return <Info className="h-4 w-4 text-blue-600" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success': return 'border-green-200 bg-green-50';
      case 'error': return 'border-red-200 bg-red-50';
      case 'warning': return 'border-yellow-200 bg-yellow-50';
      default: return 'border-blue-200 bg-blue-50';
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            SSO User Contacts Diagnostic
          </CardTitle>
          <CardDescription>
            Diagnose SSO user identification issues in the trusted contact system
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium">SSO User Email (Main User)</label>
              <Input
                value={ssoEmail}
                onChange={(e) => setSSOEmail(e.target.value)}
                placeholder="20attpkz@gmail.com"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Trusted Contact Email</label>
              <Input
                value={trustedEmail}
                onChange={(e) => setTrustedEmail(e.target.value)}
                placeholder="delivered@resend.dev"
              />
            </div>
          </div>

          <Button 
            onClick={runDiagnosis} 
            disabled={loading}
            className="w-full"
          >
            {loading ? (
              <>
                <Search className="mr-2 h-4 w-4 animate-spin" />
                Running Diagnosis...
              </>
            ) : (
              <>
                <Search className="mr-2 h-4 w-4" />
                Run SSO Diagnosis
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {results.length > 0 && (
        <div className="space-y-4">
          {results.map((result, index) => (
            <Card key={index} className={getStatusColor(result.status)}>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                  {getStatusIcon(result.status)}
                  {result.section}
                  <Badge variant={result.status === 'success' ? 'default' : 'secondary'}>
                    {result.status}
                  </Badge>
                </CardTitle>
                {result.message && (
                  <CardDescription>{result.message}</CardDescription>
                )}
              </CardHeader>
              <CardContent>
                <pre className="text-xs bg-white/50 p-3 rounded border overflow-auto max-h-64">
                  {JSON.stringify(result.data, null, 2)}
                </pre>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
} 