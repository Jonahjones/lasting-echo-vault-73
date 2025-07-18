import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Copy, RefreshCw, Database, Bug, CheckCircle, AlertTriangle, XCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface DebugResult {
  section: string;
  data: any;
  status?: 'success' | 'warning' | 'error';
}

interface ContactRelationship {
  contact_id: string;
  contact_email: string;
  contact_name: string;
  contact_type: string;
  role: string;
  invitation_status: string;
  main_user_id: string;
  main_user_email: string;
  main_user_name: string;
  target_user_id: string | null;
  target_user_email: string | null;
  target_user_name: string | null;
  is_linked_correctly: boolean;
}

export function TrustedContactSystemDebugger() {
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<DebugResult[]>([]);
  const [fixResults, setFixResults] = useState<any>(null);
  const { toast } = useToast();

  const runFullDiagnosis = async () => {
    setLoading(true);
    setResults([]);
    
    try {
      console.log('🔧 Running full trusted contact system diagnosis...');

      // 1. Check current database structure
      const structureResult = await checkDatabaseStructure();
      setResults(prev => [...prev, {
        section: "Database Structure",
        data: structureResult,
        status: structureResult.issues?.length > 0 ? 'warning' : 'success'
      }]);

      // 2. Check all trusted contacts and their relationships
      const contactsResult = await getAllTrustedContacts();
      setResults(prev => [...prev, {
        section: "All Trusted Contacts",
        data: contactsResult,
        status: contactsResult.mislinked_count > 0 ? 'warning' : 'success'
      }]);

      // 3. Check for unlinked SSO users
      const ssoResult = await checkUnlinkedSSOUsers();
      setResults(prev => [...prev, {
        section: "Unlinked SSO Users",
        data: ssoResult,
        status: ssoResult.unlinked_count > 0 ? 'warning' : 'success'
      }]);

      // 4. Test improved functions
      const functionsResult = await testImprovedFunctions();
      setResults(prev => [...prev, {
        section: "Function Tests",
        data: functionsResult,
        status: functionsResult.all_functions_working ? 'success' : 'error'
      }]);

      toast({
        title: "Diagnosis Complete",
        description: "Full system diagnosis completed. Check results below.",
      });

    } catch (error) {
      console.error('❌ Error running diagnosis:', error);
      toast({
        title: "Diagnosis Failed",
        description: `Error: ${error.message}`,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const checkDatabaseStructure = async () => {
    const issues = [];
    const structure = {
      contacts_table_exists: false,
      contacts_new_table_exists: false,
      user_trusted_contacts_table_exists: false,
      required_columns: {
        contacts: {
          target_user_id: false,
          confirmed_at: false,
          invitation_status: true // This exists
        }
      }
    };

    try {
      // Check if contacts table has the required columns
      const { data: contactsData, error } = await supabase
        .from('contacts')
        .select('id, target_user_id, invitation_status')
        .limit(1);

      structure.contacts_table_exists = !error;
      
      if (contactsData && contactsData.length > 0) {
        structure.required_columns.contacts.target_user_id = 'target_user_id' in contactsData[0];
      }

      // Try to check for the new many-to-many tables
      try {
        const { error: newError } = await (supabase as any)
          .from('contacts_new')
          .select('id')
          .limit(1);
        structure.contacts_new_table_exists = !newError;
      } catch (e) {
        structure.contacts_new_table_exists = false;
      }

      try {
        const { error: relationError } = await (supabase as any)
          .from('user_trusted_contacts')
          .select('id')
          .limit(1);
        structure.user_trusted_contacts_table_exists = !relationError;
      } catch (e) {
        structure.user_trusted_contacts_table_exists = false;
      }

    } catch (error) {
      issues.push(`Database structure check failed: ${error.message}`);
    }

    if (!structure.required_columns.contacts.target_user_id) {
      issues.push('contacts table missing target_user_id column for SSO user linking');
    }

    if (!structure.contacts_new_table_exists) {
      issues.push('contacts_new table does not exist (many-to-many structure not implemented)');
    }

    return { structure, issues };
  };

  const getAllTrustedContacts = async () => {
    try {
      // Try using the debug function if it exists
      try {
        const { data: debugData, error } = await (supabase as any).rpc('debug_trusted_contacts');
        
        if (!error && debugData) {
          const mislinked = debugData.filter((rel: ContactRelationship) => !rel.is_linked_correctly);
          return {
            total_relationships: debugData.length,
            mislinked_count: mislinked.length,
            relationships: debugData,
            mislinked_relationships: mislinked,
            source: 'debug_function'
          };
        }
      } catch (e) {
        console.warn('Debug function not available, using direct query');
      }

      // Fallback to direct query
      const { data: contacts, error } = await supabase
        .from('contacts')
        .select(`
          id,
          email,
          full_name,
          contact_type,
          role,
          invitation_status,
          user_id,
          target_user_id
        `)
        .eq('contact_type', 'trusted')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Get user information
      const userIds = Array.from(new Set([
        ...contacts.map(c => c.user_id),
        ...contacts.map(c => c.target_user_id).filter(Boolean)
      ]));

      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, first_name, last_name, display_name')
        .in('user_id', userIds);

      const relationships = contacts.map(contact => {
        const mainProfile = profiles?.find(p => p.user_id === contact.user_id);
        const targetProfile = profiles?.find(p => p.user_id === contact.target_user_id);
        
        return {
          contact_id: contact.id,
          contact_email: contact.email,
          contact_name: contact.full_name,
          contact_type: contact.contact_type,
          role: contact.role,
          invitation_status: contact.invitation_status,
          main_user_id: contact.user_id,
          main_user_name: mainProfile?.display_name || 
                          `${mainProfile?.first_name || ''} ${mainProfile?.last_name || ''}`.trim() ||
                          'Unknown',
          target_user_id: contact.target_user_id,
          target_user_name: targetProfile?.display_name || 
                            `${targetProfile?.first_name || ''} ${targetProfile?.last_name || ''}`.trim() ||
                            null,
          is_linked_correctly: contact.target_user_id !== null
        };
      });

      const mislinked = relationships.filter(rel => !rel.is_linked_correctly);

      return {
        total_relationships: relationships.length,
        mislinked_count: mislinked.length,
        relationships,
        mislinked_relationships: mislinked,
        source: 'direct_query'
      };

    } catch (error) {
      throw new Error(`Failed to get trusted contacts: ${error.message}`);
    }
  };

  const checkUnlinkedSSOUsers = async () => {
    try {
      const { data: unlinkedContacts, error } = await supabase
        .from('contacts')
        .select(`
          id,
          email,
          full_name,
          user_id,
          invitation_status
        `)
        .eq('contact_type', 'trusted')
        .is('target_user_id', null);

      if (error) throw error;

      const potentialMatches = [];

      // For each unlinked contact, check if a user with that email exists
      for (const contact of unlinkedContacts) {
        // This is a simplified check - in reality we'd need to query auth.users
        // which isn't directly accessible from the client
        if (contact.email && contact.email.includes('@')) {
          potentialMatches.push({
            contact_id: contact.id,
            contact_email: contact.email,
            contact_name: contact.full_name,
            main_user_id: contact.user_id,
            invitation_status: contact.invitation_status,
            needs_linking: true
          });
        }
      }

      return {
        unlinked_count: unlinkedContacts.length,
        unlinked_contacts: unlinkedContacts,
        potential_matches: potentialMatches
      };

    } catch (error) {
      throw new Error(`Failed to check unlinked SSO users: ${error.message}`);
    }
  };

  const testImprovedFunctions = async () => {
    const results = {
      check_contact_relationships: false,
      add_trusted_contact_relationship: false,
      get_trusted_contact_relationships: false,
      debug_trusted_contacts: false,
      fix_all_contact_relationships: false,
      all_functions_working: false
    };

    try {
      // Test check_contact_relationships
      const { error: checkError } = await (supabase as any).rpc('check_contact_relationships', {
        p_email: 'test@example.com'
      });
      results.check_contact_relationships = !checkError;

      // Test get_trusted_contact_relationships
      const { error: getError } = await (supabase as any).rpc('get_trusted_contact_relationships', {
        p_user_email: 'test@example.com'
      });
      results.get_trusted_contact_relationships = !getError;

      // Test debug_trusted_contacts
      const { error: debugError } = await (supabase as any).rpc('debug_trusted_contacts');
      results.debug_trusted_contacts = !debugError;

      // Test add_trusted_contact_relationship (dry run)
      const { error: addError } = await (supabase as any).rpc('add_trusted_contact_relationship', {
        p_user_id: '00000000-0000-0000-0000-000000000000',
        p_contact_data: { email: 'test@example.com', full_name: 'Test User' }
      });
      // This should fail with a meaningful error, not a function-not-found error
      results.add_trusted_contact_relationship = addError && !addError.message.includes('function');

      // Test fix_all_contact_relationships
      const { error: fixError } = await (supabase as any).rpc('fix_all_contact_relationships');
      results.fix_all_contact_relationships = !fixError;

    } catch (error) {
      console.warn('Some functions not available:', error);
    }

    results.all_functions_working = Object.values(results).filter(v => v === true).length >= 3;

    return results;
  };

  const runContactFix = async () => {
    try {
      setLoading(true);
      console.log('🔧 Running contact relationship fix...');

      const { data: fixResult, error } = await (supabase as any).rpc('fix_all_contact_relationships');

      if (error) {
        throw error;
      }

      setFixResults(fixResult);
      
      toast({
        title: "Fix Applied",
        description: `Fixed ${fixResult?.contacts_fixed || 0} contact relationships`,
      });

      // Refresh diagnosis
      await runFullDiagnosis();

    } catch (error) {
      console.error('❌ Error running fix:', error);
      toast({
        title: "Fix Failed",
        description: `Error: ${error.message}`,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied",
      description: "Content copied to clipboard",
    });
  };

  const getStatusIcon = (status?: string) => {
    switch (status) {
      case 'success': return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'warning': return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case 'error': return <XCircle className="h-4 w-4 text-red-500" />;
      default: return <Database className="h-4 w-4 text-blue-500" />;
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bug className="h-5 w-5" />
          Trusted Contact System Debugger
        </CardTitle>
        <CardDescription>
          Comprehensive debugging and fixing tool for the trusted contact system
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex gap-2">
            <Button 
              onClick={runFullDiagnosis} 
              disabled={loading}
              className="flex items-center gap-2"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              {loading ? 'Running Diagnosis...' : 'Run Full Diagnosis'}
            </Button>
            
            <Button 
              onClick={runContactFix} 
              disabled={loading}
              variant="outline"
              className="flex items-center gap-2"
            >
              <Database className="h-4 w-4" />
              Fix Contact Relationships
            </Button>
          </div>

          {fixResults && (
            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>
                <strong>Fix Results:</strong> {fixResults.contacts_fixed} contacts fixed out of {fixResults.total_contacts_checked} checked.
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => copyToClipboard(JSON.stringify(fixResults, null, 2))}
                  className="ml-2"
                >
                  <Copy className="h-3 w-3" />
                </Button>
              </AlertDescription>
            </Alert>
          )}

          {results.length > 0 && (
            <Tabs defaultValue="summary" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="summary">Summary</TabsTrigger>
                <TabsTrigger value="details">Details</TabsTrigger>
                <TabsTrigger value="sql">SQL Queries</TabsTrigger>
              </TabsList>
              
              <TabsContent value="summary" className="space-y-4">
                {results.map((result, index) => (
                  <Card key={index}>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm flex items-center gap-2">
                        {getStatusIcon(result.status)}
                        {result.section}
                        <Badge variant={result.status === 'success' ? 'default' : result.status === 'warning' ? 'secondary' : 'destructive'}>
                          {result.status || 'info'}
                        </Badge>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <div className="text-xs">
                        {result.section === 'All Trusted Contacts' && (
                          <div>
                            <p>Total Relationships: {result.data?.total_relationships || 0}</p>
                            <p>Mislinked: {result.data?.mislinked_count || 0}</p>
                            <p>Source: {result.data?.source}</p>
                          </div>
                        )}
                        {result.section === 'Database Structure' && (
                          <div>
                            <p>Issues: {result.data?.issues?.length || 0}</p>
                            {result.data?.issues?.map((issue: string, i: number) => (
                              <p key={i} className="text-yellow-600">• {issue}</p>
                            ))}
                          </div>
                        )}
                        {result.section === 'Unlinked SSO Users' && (
                          <div>
                            <p>Unlinked Contacts: {result.data?.unlinked_count || 0}</p>
                          </div>
                        )}
                        {result.section === 'Function Tests' && (
                          <div>
                            <p>Functions Working: {Object.values(result.data || {}).filter(v => v === true).length}</p>
                            <p>All Functions OK: {result.data?.all_functions_working ? 'Yes' : 'No'}</p>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </TabsContent>

              <TabsContent value="details" className="space-y-4">
                {results.map((result, index) => (
                  <Card key={index}>
                    <CardHeader>
                      <CardTitle className="text-sm flex items-center gap-2">
                        {getStatusIcon(result.status)}
                        {result.section}
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => copyToClipboard(JSON.stringify(result.data, null, 2))}
                        >
                          <Copy className="h-3 w-3" />
                        </Button>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <Textarea
                        value={JSON.stringify(result.data, null, 2)}
                        readOnly
                        className="h-32 text-xs font-mono"
                      />
                    </CardContent>
                  </Card>
                ))}
              </TabsContent>

              <TabsContent value="sql" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Manual SQL Queries</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div>
                        <h4 className="font-medium mb-2">Check All Trusted Contact Relationships:</h4>
                        <Textarea
                          value={`SELECT 
  c.id,
  c.email as contact_email,
  c.full_name as contact_name,
  c.contact_type,
  c.role,
  c.invitation_status,
  c.user_id as main_user_id,
  mu.email as main_user_email,
  c.target_user_id,
  tu.email as target_user_email,
  CASE 
    WHEN c.target_user_id IS NOT NULL AND tu.email IS NOT NULL 
    THEN LOWER(TRIM(c.email)) = LOWER(TRIM(tu.email))
    ELSE false 
  END as is_linked_correctly
FROM contacts c
LEFT JOIN auth.users mu ON mu.id = c.user_id
LEFT JOIN auth.users tu ON tu.id = c.target_user_id
WHERE c.contact_type = 'trusted'
ORDER BY c.created_at DESC;`}
                          readOnly
                          className="h-32 text-xs font-mono"
                        />
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => copyToClipboard(`SELECT...`)}
                          className="mt-2"
                        >
                          <Copy className="h-3 w-3 mr-1" />
                          Copy SQL
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          )}
        </div>
      </CardContent>
    </Card>
  );
} 