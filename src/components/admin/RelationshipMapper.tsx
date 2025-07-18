import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { RefreshCw, Loader2, CheckCircle, AlertTriangle, Database, Search, Mail, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface ContactRecord {
  id: string;
  email: string;
  fullName: string;
  userId?: string;
  tableName: 'contacts' | 'contacts_new';
  needsMapping: boolean;
}

interface RelationshipFix {
  email: string;
  tableName: string;
  contactId: string;
  oldUserId?: string;
  newUserId: string;
  userName: string;
  status: 'fixed' | 'failed' | 'no_user_found';
  error?: string;
}

interface ScanResults {
  oldSystemContacts: ContactRecord[];
  newSystemContacts: ContactRecord[];
  authUsers: Array<{ id: string; email: string }>;
  fixes: RelationshipFix[];
  summary: {
    totalScanned: number;
    needMapping: number;
    fixed: number;
    failed: number;
  };
}

export function RelationshipMapper() {
  const [isScanning, setIsScanning] = useState(false);
  const [scanResults, setScanResults] = useState<ScanResults | null>(null);
  const { toast } = useToast();

  const scanAndFixRelationships = async () => {
    setIsScanning(true);
    setScanResults(null);

    try {
      console.log('🔍 Starting comprehensive relationship mapping scan...');

      // Step 1: Get existing profiles for reference (since we can't directly query auth.users)
      console.log('📊 Fetching user profiles for reference...');
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('user_id, display_name, first_name, last_name');
      
      const authUsers: Array<{ id: string; email: string }> = [];
      if (!profilesError && profilesData) {
        // We'll build this as we go since we can't get emails directly from profiles
        console.log(`📊 Found ${profilesData.length} user profiles for reference`);
      } else {
        console.warn('⚠️ Could not fetch profiles, will use email-based approach only');
      }

      // Step 2: Scan old contacts table
      console.log('📋 Scanning old contacts table...');
      const { data: oldContacts, error: oldError } = await supabase
        .from('contacts')
        .select('id, email, full_name, user_id, contact_type')
        .not('email', 'is', null);

      const oldSystemContacts: ContactRecord[] = [];
      if (!oldError && oldContacts) {
        oldSystemContacts.push(...oldContacts.map(contact => ({
          id: contact.id,
          email: contact.email,
          fullName: contact.full_name,
          userId: contact.user_id,
          tableName: 'contacts' as const,
          needsMapping: !contact.user_id || contact.user_id === null
        })));
      }

      // Step 3: Scan new contacts system
      console.log('📋 Scanning new contacts system...');
      const { data: newContacts, error: newError } = await supabase
        .from('contacts_new')
        .select('id, email, full_name, target_user_id');

      const newSystemContacts: ContactRecord[] = [];
      if (!newError && newContacts) {
        newSystemContacts.push(...newContacts.map(contact => ({
          id: contact.id,
          email: contact.email,
          fullName: contact.full_name,
          userId: contact.target_user_id,
          tableName: 'contacts_new' as const,
          needsMapping: !contact.target_user_id || contact.target_user_id === null
        })));
      }

      console.log(`📊 Found ${oldSystemContacts.length} old contacts, ${newSystemContacts.length} new contacts`);

      // Step 4: Fix relationships by linking emails to user_ids
      const fixes: RelationshipFix[] = [];
      const allContacts = [...oldSystemContacts, ...newSystemContacts];
      const contactsNeedingMapping = allContacts.filter(c => c.needsMapping);

      console.log(`🔧 Found ${contactsNeedingMapping.length} contacts needing user mapping`);

      for (const contact of contactsNeedingMapping) {
        try {
          console.log(`🔗 Processing ${contact.email} from ${contact.tableName}`);

          // Find matching user by email (try multiple approaches)
          let matchingUser = null;

          // Approach 1: Try to find in auth users if we have them
          if (authUsers.length > 0) {
            matchingUser = authUsers.find(user => 
              user.email.toLowerCase().trim() === contact.email.toLowerCase().trim()
            );
          }

          // Approach 2: Try to find via profiles table
          if (!matchingUser) {
            const emailUsername = contact.email.split('@')[0];
            const { data: profiles, error: profileError } = await supabase
              .from('profiles')
              .select('user_id, display_name, first_name, last_name')
              .or(`display_name.ilike.%${emailUsername}%,first_name.ilike.%${emailUsername}%`)
              .limit(3);

            if (!profileError && profiles && profiles.length > 0) {
              // Use the first matching profile
              const profile = profiles[0];
              matchingUser = { id: profile.user_id, email: contact.email };
              console.log(`✅ Found user via profiles: ${profile.user_id}`);
            }
          }

          if (!matchingUser) {
            console.log(`⚠️ No user found for ${contact.email}`);
            fixes.push({
              email: contact.email,
              tableName: contact.tableName,
              contactId: contact.id,
              oldUserId: contact.userId,
              newUserId: '',
              userName: 'Not Found',
              status: 'no_user_found',
              error: 'No matching user account found'
            });
            continue;
          }

          // Fix the relationship by updating the user_id
          const userIdField = contact.tableName === 'contacts' ? 'user_id' : 'target_user_id';
          const { error: updateError } = await supabase
            .from(contact.tableName)
            .update({ 
              [userIdField]: matchingUser.id,
              updated_at: new Date().toISOString()
            })
            .eq('id', contact.id);

          if (updateError) {
            console.error(`❌ Error updating ${contact.email}:`, updateError);
            fixes.push({
              email: contact.email,
              tableName: contact.tableName,
              contactId: contact.id,
              oldUserId: contact.userId,
              newUserId: matchingUser.id,
              userName: matchingUser.email,
              status: 'failed',
              error: updateError.message
            });
          } else {
            console.log(`🔗 Successfully linked ${contact.email} to ${matchingUser.id}`);
            fixes.push({
              email: contact.email,
              tableName: contact.tableName,
              contactId: contact.id,
              oldUserId: contact.userId,
              newUserId: matchingUser.id,
              userName: matchingUser.email,
              status: 'fixed'
            });
          }

        } catch (error) {
          console.error(`❌ Unexpected error processing ${contact.email}:`, error);
          fixes.push({
            email: contact.email,
            tableName: contact.tableName,
            contactId: contact.id,
            oldUserId: contact.userId,
            newUserId: '',
            userName: 'Error',
            status: 'failed',
            error: error instanceof Error ? error.message : String(error)
          });
        }
      }

      const results: ScanResults = {
        oldSystemContacts,
        newSystemContacts,
        authUsers,
        fixes,
        summary: {
          totalScanned: allContacts.length,
          needMapping: contactsNeedingMapping.length,
          fixed: fixes.filter(f => f.status === 'fixed').length,
          failed: fixes.filter(f => f.status === 'failed').length + fixes.filter(f => f.status === 'no_user_found').length
        }
      };

      setScanResults(results);

      // Show summary toast
      const fixedCount = results.summary.fixed;
      const failedCount = results.summary.failed;

      if (fixedCount > 0) {
        toast({
          title: "Relationships Fixed",
          description: `Successfully fixed ${fixedCount} trusted contact relationships. ${failedCount} failed.`,
        });
      } else if (results.summary.needMapping === 0) {
        toast({
          title: "All Good",
          description: "All trusted contact relationships are properly mapped.",
        });
      } else {
        toast({
          title: "No Fixes Possible",
          description: `Found ${results.summary.needMapping} contacts needing fixes, but could not fix any.`,
          variant: "destructive",
        });
      }

    } catch (error) {
      console.error('❌ Error during relationship mapping:', error);
      toast({
        title: "Scan Failed",
        description: error instanceof Error ? error.message : "Unknown error occurred",
        variant: "destructive",
      });
    } finally {
      setIsScanning(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="w-5 h-5" />
            Email-Centric Relationship Mapper
          </CardTitle>
          <CardDescription>
            Scans both old and new contact systems to find contacts with emails that should be linked to existing user accounts.
            Uses email as the primary identifier and fixes user_id mappings.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button
            onClick={scanAndFixRelationships}
            disabled={isScanning}
            className="w-full"
            size="lg"
          >
            {isScanning ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Scanning All Contact Systems...
              </>
            ) : (
              <>
                <Search className="w-4 h-4 mr-2" />
                Scan & Fix Email → User Mappings
              </>
            )}
          </Button>

          {scanResults && (
            <div className="space-y-4">
              <Separator />
              
              {/* Summary Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center p-4 bg-muted rounded-lg">
                  <div className="text-2xl font-bold">{scanResults.summary.totalScanned}</div>
                  <div className="text-sm text-muted-foreground">Total Contacts</div>
                </div>
                <div className="text-center p-4 bg-amber-50 dark:bg-amber-950 rounded-lg">
                  <div className="text-2xl font-bold text-amber-600">{scanResults.summary.needMapping}</div>
                  <div className="text-sm text-muted-foreground">Need Mapping</div>
                </div>
                <div className="text-center p-4 bg-green-50 dark:bg-green-950 rounded-lg">
                  <div className="text-2xl font-bold text-green-600">{scanResults.summary.fixed}</div>
                  <div className="text-sm text-muted-foreground">Fixed</div>
                </div>
                <div className="text-center p-4 bg-red-50 dark:bg-red-950 rounded-lg">
                  <div className="text-2xl font-bold text-red-600">{scanResults.summary.failed}</div>
                  <div className="text-sm text-muted-foreground">Failed</div>
                </div>
              </div>

              {/* System Overview */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Database className="w-4 h-4" />
                      Old System (contacts)
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{scanResults.oldSystemContacts.length}</div>
                    <div className="text-sm text-muted-foreground">
                      {scanResults.oldSystemContacts.filter(c => c.needsMapping).length} need mapping
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Users className="w-4 h-4" />
                      New System (contacts_new)
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{scanResults.newSystemContacts.length}</div>
                    <div className="text-sm text-muted-foreground">
                      {scanResults.newSystemContacts.filter(c => c.needsMapping).length} need mapping
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Fixed Relationships */}
              {scanResults.fixes.filter(f => f.status === 'fixed').length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-medium text-green-600 flex items-center gap-2">
                    <CheckCircle className="w-4 h-4" />
                    Successfully Fixed Mappings ({scanResults.fixes.filter(f => f.status === 'fixed').length})
                  </h4>
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {scanResults.fixes.filter(f => f.status === 'fixed').map((fix, index) => (
                      <Alert key={index} className="border-green-200 bg-green-50 dark:bg-green-950">
                        <CheckCircle className="h-4 w-4 text-green-600" />
                        <AlertDescription>
                          <div className="flex items-center gap-2">
                            <Mail className="w-4 h-4" />
                            <span className="font-medium">{fix.email}</span>
                            <Badge variant="outline">{fix.tableName}</Badge>
                          </div>
                          <div className="text-sm text-muted-foreground mt-1">
                            Linked to user: {fix.newUserId}
                            {fix.oldUserId && <span> (was: {fix.oldUserId})</span>}
                          </div>
                        </AlertDescription>
                      </Alert>
                    ))}
                  </div>
                </div>
              )}

              {/* Failed Relationships */}
              {scanResults.fixes.filter(f => f.status !== 'fixed').length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-medium text-red-600 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4" />
                    Failed to Fix ({scanResults.fixes.filter(f => f.status !== 'fixed').length})
                  </h4>
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {scanResults.fixes.filter(f => f.status !== 'fixed').map((fix, index) => (
                      <Alert key={index} variant="destructive">
                        <AlertTriangle className="h-4 w-4" />
                        <AlertDescription>
                          <div className="flex items-center gap-2">
                            <Mail className="w-4 h-4" />
                            <span className="font-medium">{fix.email}</span>
                            <Badge variant="outline">{fix.tableName}</Badge>
                          </div>
                          <div className="text-sm mt-1">{fix.error}</div>
                        </AlertDescription>
                      </Alert>
                    ))}
                  </div>
                </div>
              )}

              {/* No Issues Found */}
              {scanResults.summary.needMapping === 0 && (
                <Alert>
                  <CheckCircle className="h-4 w-4" />
                  <AlertDescription>
                    All contact relationships are properly mapped to user accounts. No fixes needed.
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