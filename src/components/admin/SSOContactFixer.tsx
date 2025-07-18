import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { 
  Wrench, 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  Info,
  Mail,
  User,
  Link,
  Database,
  Settings
} from 'lucide-react';

interface FixResult {
  step: string;
  status: 'success' | 'error' | 'warning' | 'info';
  message: string;
  data?: any;
}

export function SSOContactFixer() {
  const [ssoEmail, setSSOEmail] = useState("20attpkz@gmail.com");
  const [trustedEmail, setTrustedEmail] = useState("delivered@resend.dev");
  const [isFixing, setIsFixing] = useState(false);
  const [fixResults, setFixResults] = useState<FixResult[]>([]);
  const { toast } = useToast();

  const runComprehensiveFix = async () => {
    if (!ssoEmail.trim() || !trustedEmail.trim()) {
      toast({
        title: "Missing Information",
        description: "Please enter both email addresses",
        variant: "destructive",
      });
      return;
    }

    setIsFixing(true);
    setFixResults([]);
    
    try {
      console.log('🔧 Starting comprehensive SSO contact fix...');

      // Step 1: Verify SSO user exists and get their ID
      const ssoUserStep = await verifySSOUser(ssoEmail);
      setFixResults(prev => [...prev, ssoUserStep]);
      
      if (ssoUserStep.status === 'error') {
        throw new Error("Cannot proceed without valid SSO user");
      }

      const ssoUserId = ssoUserStep.data?.user_id;

      // Step 2: Verify trusted contact user exists
      const trustedUserStep = await verifyTrustedUser(trustedEmail);
      setFixResults(prev => [...prev, trustedUserStep]);

      const trustedUserId = trustedUserStep.data?.user_id || null;

      // Step 3: Fix existing contact relationships
      const fixContactsStep = await fixExistingContacts(ssoUserId, trustedEmail, trustedUserId);
      setFixResults(prev => [...prev, fixContactsStep]);

      // Step 4: Create missing contact relationship if needed
      const createContactStep = await createMissingContact(ssoUserId, trustedEmail, trustedUserId);
      setFixResults(prev => [...prev, createContactStep]);

      // Step 5: Fix target_user_id mappings
      const fixMappingsStep = await fixTargetUserMappings(trustedEmail, trustedUserId);
      setFixResults(prev => [...prev, fixMappingsStep]);

      // Step 6: Verify fix worked
      const verifyFixStep = await verifyFixSuccess(trustedEmail);
      setFixResults(prev => [...prev, verifyFixStep]);

      toast({
        title: "Fix Complete",
        description: "SSO contact relationship fix completed. Check results below.",
      });

    } catch (error) {
      console.error('❌ Fix failed:', error);
      setFixResults(prev => [...prev, {
        step: "Fix Failed",
        status: 'error',
        message: error instanceof Error ? error.message : "Unknown error occurred"
      }]);
      toast({
        title: "Fix Failed",
        description: error instanceof Error ? error.message : "Unknown error occurred",
        variant: "destructive",
      });
    } finally {
      setIsFixing(false);
    }
  };

  const verifySSOUser = async (email: string): Promise<FixResult> => {
    try {
      console.log('1️⃣ Verifying SSO user:', email);
      
      const { data, error } = await supabase.functions.invoke('check-user-exists', {
        body: { email: email.toLowerCase() }
      });

      if (error) {
        return {
          step: "Verify SSO User",
          status: 'error',
          message: `Failed to verify SSO user: ${error.message}`,
          data: { error }
        };
      }

      if (!data?.exists) {
        return {
          step: "Verify SSO User",
          status: 'error',
          message: `SSO user ${email} not found in auth.users. They need to sign up first.`,
          data: { exists: false }
        };
      }

      return {
        step: "Verify SSO User",
        status: 'success',
        message: `SSO user verified: ${data.user_id}`,
        data: { 
          exists: true, 
          user_id: data.user_id, 
          email: data.email 
        }
      };
    } catch (error) {
      return {
        step: "Verify SSO User",
        status: 'error',
        message: `Exception verifying SSO user: ${error.message}`,
        data: { error }
      };
    }
  };

  const verifyTrustedUser = async (email: string): Promise<FixResult> => {
    try {
      console.log('2️⃣ Verifying trusted contact user:', email);
      
      const { data, error } = await supabase.functions.invoke('check-user-exists', {
        body: { email: email.toLowerCase() }
      });

      if (error) {
        return {
          step: "Verify Trusted Contact User",
          status: 'warning',
          message: `Could not verify trusted contact user: ${error.message}`,
          data: { error }
        };
      }

      return {
        step: "Verify Trusted Contact User",
        status: data?.exists ? 'success' : 'info',
        message: data?.exists ? 
          `Trusted contact is registered user: ${data.user_id}` :
          "Trusted contact is not registered (invitation will be sent)",
        data: { 
          exists: data?.exists || false, 
          user_id: data?.user_id || null, 
          email: data?.email || null 
        }
      };
    } catch (error) {
      return {
        step: "Verify Trusted Contact User",
        status: 'warning',
        message: `Exception verifying trusted contact: ${error.message}`,
        data: { error }
      };
    }
  };

  const fixExistingContacts = async (ssoUserId: string, trustedEmail: string, trustedUserId: string | null): Promise<FixResult> => {
    try {
      console.log('3️⃣ Fixing existing contact relationships...');
      
      // Check for existing contacts that need fixing
      const { data: existingContacts, error: queryError } = await supabase
        .from('contacts')
        .select('*')
        .eq('email', trustedEmail.toLowerCase());

      if (queryError) {
        return {
          step: "Fix Existing Contacts",
          status: 'error',
          message: `Failed to query existing contacts: ${queryError.message}`,
          data: { error: queryError }
        };
      }

      let fixedCount = 0;
      let errors = [];

      for (const contact of existingContacts || []) {
        try {
          // Fix target_user_id if missing and we have the user ID
          const updates: any = {};
          
          if (!contact.target_user_id && trustedUserId) {
            updates.target_user_id = trustedUserId;
            updates.invitation_status = 'registered';
            updates.confirmed_at = new Date().toISOString();
          }

          // Ensure contact_type is set
          if (!contact.contact_type) {
            updates.contact_type = 'trusted';
          }

          // Ensure role is set for trusted contacts
          if (contact.contact_type === 'trusted' && !contact.role) {
            updates.role = 'legacy_messenger';
          }

          if (Object.keys(updates).length > 0) {
            const { error: updateError } = await supabase
              .from('contacts')
              .update(updates)
              .eq('id', contact.id);

            if (updateError) {
              errors.push(`Contact ${contact.id}: ${updateError.message}`);
            } else {
              fixedCount++;
              console.log(`✅ Fixed contact ${contact.id}`);
            }
          }
        } catch (error) {
          errors.push(`Contact ${contact.id}: ${error.message}`);
        }
      }

      return {
        step: "Fix Existing Contacts",
        status: errors.length > 0 ? 'warning' : 'success',
        message: `Fixed ${fixedCount} existing contacts. ${errors.length ? `Errors: ${errors.length}` : ''}`,
        data: { 
          total_found: existingContacts?.length || 0,
          fixed_count: fixedCount,
          errors: errors
        }
      };
    } catch (error) {
      return {
        step: "Fix Existing Contacts",
        status: 'error',
        message: `Exception fixing existing contacts: ${error.message}`,
        data: { error }
      };
    }
  };

  const createMissingContact = async (ssoUserId: string, trustedEmail: string, trustedUserId: string | null): Promise<FixResult> => {
    try {
      console.log('4️⃣ Creating missing contact relationship if needed...');
      
      // Check if SSO user already has this trusted contact
      const { data: existingRelation, error: checkError } = await supabase
        .from('contacts')
        .select('*')
        .eq('user_id', ssoUserId)
        .eq('email', trustedEmail.toLowerCase())
        .eq('contact_type', 'trusted');

      if (checkError) {
        return {
          step: "Create Missing Contact",
          status: 'error',
          message: `Failed to check existing relationship: ${checkError.message}`,
          data: { error: checkError }
        };
      }

      if (existingRelation && existingRelation.length > 0) {
        return {
          step: "Create Missing Contact",
          status: 'info',
          message: "Contact relationship already exists - no creation needed",
          data: { existing: existingRelation[0] }
        };
      }

      // Create the missing contact relationship
      const contactData = {
        user_id: ssoUserId,
        full_name: trustedEmail.split('@')[0], // Default name from email
        email: trustedEmail.toLowerCase(),
        contact_type: 'trusted',
        role: 'legacy_messenger', // Default role
        is_primary: false,
        invitation_status: trustedUserId ? 'registered' : 'pending',
        target_user_id: trustedUserId,
        confirmed_at: trustedUserId ? new Date().toISOString() : null
      };

      const { data: newContact, error: insertError } = await supabase
        .from('contacts')
        .insert(contactData)
        .select()
        .single();

      if (insertError) {
        return {
          step: "Create Missing Contact",
          status: 'error',
          message: `Failed to create contact relationship: ${insertError.message}`,
          data: { error: insertError }
        };
      }

      return {
        step: "Create Missing Contact",
        status: 'success',
        message: "Successfully created missing contact relationship",
        data: { created_contact: newContact }
      };
    } catch (error) {
      return {
        step: "Create Missing Contact",
        status: 'error',
        message: `Exception creating missing contact: ${error.message}`,
        data: { error }
      };
    }
  };

  const fixTargetUserMappings = async (trustedEmail: string, trustedUserId: string | null): Promise<FixResult> => {
    try {
      console.log('5️⃣ Fixing target_user_id mappings...');
      
      if (!trustedUserId) {
        return {
          step: "Fix Target User Mappings",
          status: 'info',
          message: "Trusted contact is not a registered user - no user ID mapping needed",
          data: { skipped: true }
        };
      }

      // Find all contacts with this email that don't have target_user_id set
      const { data: unmappedContacts, error: queryError } = await supabase
        .from('contacts')
        .select('*')
        .eq('email', trustedEmail.toLowerCase())
        .is('target_user_id', null);

      if (queryError) {
        return {
          step: "Fix Target User Mappings",
          status: 'error',
          message: `Failed to query unmapped contacts: ${queryError.message}`,
          data: { error: queryError }
        };
      }

      if (!unmappedContacts || unmappedContacts.length === 0) {
        return {
          step: "Fix Target User Mappings",
          status: 'success',
          message: "All contacts already have proper user ID mappings",
          data: { already_mapped: true }
        };
      }

      // Update all unmapped contacts with the correct target_user_id
      const { data: updatedContacts, error: updateError } = await supabase
        .from('contacts')
        .update({
          target_user_id: trustedUserId,
          invitation_status: 'registered',
          confirmed_at: new Date().toISOString()
        })
        .eq('email', trustedEmail.toLowerCase())
        .is('target_user_id', null)
        .select();

      if (updateError) {
        return {
          step: "Fix Target User Mappings",
          status: 'error',
          message: `Failed to update user ID mappings: ${updateError.message}`,
          data: { error: updateError }
        };
      }

      return {
        step: "Fix Target User Mappings",
        status: 'success',
        message: `Updated ${updatedContacts?.length || 0} contacts with proper user ID mappings`,
        data: { 
          updated_count: updatedContacts?.length || 0,
          updated_contacts: updatedContacts
        }
      };
    } catch (error) {
      return {
        step: "Fix Target User Mappings",
        status: 'error',
        message: `Exception fixing target user mappings: ${error.message}`,
        data: { error }
      };
    }
  };

  const verifyFixSuccess = async (trustedEmail: string): Promise<FixResult> => {
    try {
      console.log('6️⃣ Verifying fix success...');
      
      // Check if trusted contact is now properly recognized
      const { data: trustedRelationships, error: queryError } = await supabase
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
          confirmed_at,
          profiles!contacts_user_id_fkey(
            user_id,
            first_name,
            last_name,
            display_name
          )
        `)
        .eq('email', trustedEmail.toLowerCase())
        .eq('contact_type', 'trusted');

      if (queryError) {
        return {
          step: "Verify Fix Success",
          status: 'error',
          message: `Failed to verify fix: ${queryError.message}`,
          data: { error: queryError }
        };
      }

      const relationshipCount = trustedRelationships?.length || 0;
      const properlyLinked = trustedRelationships?.filter(r => r.target_user_id).length || 0;

      return {
        step: "Verify Fix Success",
        status: relationshipCount > 0 ? 'success' : 'warning',
        message: relationshipCount > 0 ? 
          `Fix successful! Found ${relationshipCount} trusted relationships (${properlyLinked} properly linked)` :
          "No trusted relationships found after fix",
        data: { 
          relationship_count: relationshipCount,
          properly_linked: properlyLinked,
          relationships: trustedRelationships
        }
      };
    } catch (error) {
      return {
        step: "Verify Fix Success",
        status: 'error',
        message: `Exception verifying fix: ${error.message}`,
        data: { error }
      };
    }
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
            <Wrench className="h-5 w-5" />
            SSO Contact Relationship Fixer
          </CardTitle>
          <CardDescription>
            Comprehensive fix for SSO user identification issues in trusted contacts
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              This tool fixes common issues where SSO users (like Google SSO) are not properly recognized 
              as trusted contacts due to user ID mapping problems.
            </AlertDescription>
          </Alert>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium">SSO User Email (Main User)</label>
              <Input
                value={ssoEmail}
                onChange={(e) => setSSOEmail(e.target.value)}
                placeholder="20attpkz@gmail.com"
              />
              <p className="text-xs text-muted-foreground mt-1">
                The SSO user who should have trusted contacts
              </p>
            </div>
            <div>
              <label className="text-sm font-medium">Trusted Contact Email</label>
              <Input
                value={trustedEmail}
                onChange={(e) => setTrustedEmail(e.target.value)}
                placeholder="delivered@resend.dev"
              />
              <p className="text-xs text-muted-foreground mt-1">
                The email that should be recognized as a trusted contact
              </p>
            </div>
          </div>

          <Button 
            onClick={runComprehensiveFix} 
            disabled={isFixing}
            className="w-full"
          >
            {isFixing ? (
              <>
                <Settings className="mr-2 h-4 w-4 animate-spin" />
                Running Comprehensive Fix...
              </>
            ) : (
              <>
                <Wrench className="mr-2 h-4 w-4" />
                Run Comprehensive Fix
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {fixResults.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Fix Results</h3>
          {fixResults.map((result, index) => (
            <Card key={index} className={getStatusColor(result.status)}>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                  {getStatusIcon(result.status)}
                  {result.step}
                  <Badge variant={result.status === 'success' ? 'default' : 'secondary'}>
                    {result.status}
                  </Badge>
                </CardTitle>
                <CardDescription>{result.message}</CardDescription>
              </CardHeader>
              {result.data && (
                <CardContent>
                  <pre className="text-xs bg-white/50 p-3 rounded border overflow-auto max-h-48">
                    {JSON.stringify(result.data, null, 2)}
                  </pre>
                </CardContent>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
} 