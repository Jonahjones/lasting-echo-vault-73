import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, TestTube, CheckCircle, AlertTriangle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';

export function TrustedContactInvitationTest() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [testResults, setTestResults] = useState<any[]>([]);
  
  const [testForm, setTestForm] = useState({
    testContactEmail: '',
    testContactName: '',
    testRole: 'legacy_messenger' as 'executor' | 'legacy_messenger' | 'guardian',
    isPrimary: false
  });

  // Test function to create a test invitation (for testing purposes)
  const createTestInvitation = async () => {
    setIsLoading(true);
    try {
      const { data: result, error } = await (supabase as any).rpc('add_contact', {
        p_email: testForm.testContactEmail,
        p_full_name: testForm.testContactName,
        p_phone: null,
        p_relationship_type: 'trusted',
        p_role: testForm.testRole,
        p_relationship: 'Test relationship',
        p_is_primary: testForm.isPrimary
      });

      if (error) throw error;

      toast({
        title: "Test Invitation Created",
        description: `Created test invitation for ${testForm.testContactEmail}`,
      });

      setTestResults(prev => [...prev, {
        timestamp: new Date().toLocaleTimeString(),
        action: 'CREATE_INVITATION',
        status: 'SUCCESS',
        details: result
      }]);

    } catch (error) {
      console.error('Error creating test invitation:', error);
      toast({
        title: "Test Failed",
        description: "Failed to create test invitation",
        variant: "destructive"
      });
      
      setTestResults(prev => [...prev, {
        timestamp: new Date().toLocaleTimeString(),
        action: 'CREATE_INVITATION',
        status: 'ERROR',
        details: error
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  // Test function to fetch pending invitations
  const testFetchPendingInvitations = async () => {
    setIsLoading(true);
    try {
      const { data: invitations, error } = await (supabase as any)
        .rpc('get_pending_trusted_contact_invitations');

      if (error) throw error;

      toast({
        title: "Fetch Test Complete",
        description: `Found ${invitations?.length || 0} pending invitations`,
      });

      setTestResults(prev => [...prev, {
        timestamp: new Date().toLocaleTimeString(),
        action: 'FETCH_PENDING',
        status: 'SUCCESS',
        details: invitations
      }]);

    } catch (error) {
      console.error('Error fetching pending invitations:', error);
      toast({
        title: "Fetch Test Failed",
        description: "Failed to fetch pending invitations",
        variant: "destructive"
      });
      
      setTestResults(prev => [...prev, {
        timestamp: new Date().toLocaleTimeString(),
        action: 'FETCH_PENDING',
        status: 'ERROR',
        details: error
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  // Test function to verify database structure
  const testDatabaseStructure = async () => {
    setIsLoading(true);
    try {
      // Test if all tables exist
      const { data: tables, error: tablesError } = await supabase
        .from('information_schema.tables')
        .select('table_name')
        .eq('table_schema', 'public')
        .in('table_name', ['contacts', 'user_contacts']);

      if (tablesError) throw tablesError;

      // Test if all functions exist
      const { data: functions, error: functionsError } = await supabase
        .from('information_schema.routines')
        .select('routine_name')
        .eq('routine_schema', 'public')
        .in('routine_name', [
          'get_pending_trusted_contact_invitations',
          'respond_to_trusted_contact_invitation',
          'get_trusted_contact_invitation_details'
        ]);

      if (functionsError) throw functionsError;

      toast({
        title: "Database Test Complete",
        description: `Found ${tables?.length || 0} tables, ${functions?.length || 0} functions`,
      });

      setTestResults(prev => [...prev, {
        timestamp: new Date().toLocaleTimeString(),
        action: 'DATABASE_STRUCTURE',
        status: 'SUCCESS',
        details: { tables, functions }
      }]);

    } catch (error) {
      console.error('Error testing database structure:', error);
      toast({
        title: "Database Test Failed",
        description: "Failed to verify database structure",
        variant: "destructive"
      });
      
      setTestResults(prev => [...prev, {
        timestamp: new Date().toLocaleTimeString(),
        action: 'DATABASE_STRUCTURE',
        status: 'ERROR',
        details: error
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const clearResults = () => {
    setTestResults([]);
  };

  if (process.env.NODE_ENV !== 'development') {
    return (
      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          This test component is only available in development mode.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <TestTube className="w-5 h-5" />
            <span>Trusted Contact Invitations Test Suite</span>
          </CardTitle>
          <CardDescription>
            Test the pending trusted contact invitations system in development
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Test Controls */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Button
              onClick={testDatabaseStructure}
              disabled={isLoading}
              variant="outline"
            >
              {isLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              Test Database
            </Button>
            
            <Button
              onClick={testFetchPendingInvitations}
              disabled={isLoading}
              variant="outline"
            >
              {isLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              Fetch Pending
            </Button>

            <Button
              onClick={clearResults}
              disabled={isLoading}
              variant="outline"
            >
              Clear Results
            </Button>
          </div>

          {/* Test Invitation Creation */}
          <div className="border rounded-lg p-4 space-y-4">
            <h3 className="font-semibold">Create Test Invitation</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="testContactEmail">Test Contact Email</Label>
                <Input
                  id="testContactEmail"
                  value={testForm.testContactEmail}
                  onChange={(e) => setTestForm(prev => ({ ...prev, testContactEmail: e.target.value }))}
                  placeholder="test@example.com"
                />
              </div>
              <div>
                <Label htmlFor="testContactName">Test Contact Name</Label>
                <Input
                  id="testContactName"
                  value={testForm.testContactName}
                  onChange={(e) => setTestForm(prev => ({ ...prev, testContactName: e.target.value }))}
                  placeholder="Test Contact"
                />
              </div>
              <div>
                <Label htmlFor="testRole">Test Role</Label>
                <Select
                  value={testForm.testRole}
                  onValueChange={(value: any) => setTestForm(prev => ({ ...prev, testRole: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="executor">Executor</SelectItem>
                    <SelectItem value="legacy_messenger">Legacy Messenger</SelectItem>
                    <SelectItem value="guardian">Guardian</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="testIsPrimary"
                  checked={testForm.isPrimary}
                  onChange={(e) => setTestForm(prev => ({ ...prev, isPrimary: e.target.checked }))}
                />
                <Label htmlFor="testIsPrimary">Primary Contact</Label>
              </div>
            </div>
            <Button
              onClick={createTestInvitation}
              disabled={isLoading || !testForm.testContactEmail || !testForm.testContactName}
            >
              {isLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              Create Test Invitation
            </Button>
          </div>

          {/* Test Results */}
          {testResults.length > 0 && (
            <div className="border rounded-lg p-4 space-y-3">
              <h3 className="font-semibold">Test Results</h3>
              <div className="max-h-96 overflow-y-auto space-y-2">
                {testResults.map((result, index) => (
                  <div
                    key={index}
                    className={`p-3 rounded border-l-4 ${
                      result.status === 'SUCCESS' 
                        ? 'border-l-green-500 bg-green-50 dark:bg-green-950/20'
                        : 'border-l-red-500 bg-red-50 dark:bg-red-950/20'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-2">
                        {result.status === 'SUCCESS' ? (
                          <CheckCircle className="w-4 h-4 text-green-600" />
                        ) : (
                          <AlertTriangle className="w-4 h-4 text-red-600" />
                        )}
                        <span className="font-medium">{result.action}</span>
                        <Badge variant={result.status === 'SUCCESS' ? 'default' : 'destructive'}>
                          {result.status}
                        </Badge>
                      </div>
                      <span className="text-sm text-muted-foreground">{result.timestamp}</span>
                    </div>
                    <details className="text-sm">
                      <summary className="cursor-pointer text-muted-foreground">View Details</summary>
                      <pre className="mt-2 p-2 bg-gray-100 dark:bg-gray-800 rounded text-xs overflow-auto">
                        {JSON.stringify(result.details, null, 2)}
                      </pre>
                    </details>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Current User Info */}
          <div className="border rounded-lg p-4">
            <h3 className="font-semibold mb-2">Current User Info</h3>
            <div className="text-sm space-y-1">
              <p><strong>User ID:</strong> {user?.id}</p>
              <p><strong>Email:</strong> {user?.email}</p>
              <p><strong>Auth Status:</strong> {user ? 'Authenticated' : 'Not authenticated'}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 