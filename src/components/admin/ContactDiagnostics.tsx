import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { AlertCircle, CheckCircle, XCircle, Loader2, Eye, RefreshCw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

export function ContactDiagnostics() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [testEmail, setTestEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [systemDiagnostics, setSystemDiagnostics] = useState<any>(null);
  const [contactTestResult, setContactTestResult] = useState<any>(null);
  const [edgeFunctionTest, setEdgeFunctionTest] = useState<any>(null);

  const runSystemDiagnostics = async () => {
    setIsLoading(true);
    try {
      console.log('🔍 Running system diagnostics...');
      
      const { data, error } = await supabase.rpc('diagnose_contact_system');
      
      if (error) {
        console.error('❌ System diagnostics failed:', error);
        setSystemDiagnostics({ error: error.message });
      } else {
        console.log('✅ System diagnostics result:', data);
        setSystemDiagnostics(data);
      }
    } catch (error: any) {
      console.error('❌ System diagnostics exception:', error);
      setSystemDiagnostics({ error: error.message });
    } finally {
      setIsLoading(false);
    }
  };

  const testContactChecking = async () => {
    if (!testEmail.trim()) {
      toast({
        title: "Email Required",
        description: "Please enter an email address to test.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    setContactTestResult(null);
    setEdgeFunctionTest(null);

    try {
      const email = testEmail.trim().toLowerCase();
      console.log('🧪 Testing contact checking for:', email);

      // Test direct database function call
      const { data: dbResult, error: dbError } = await supabase.rpc(
        'check_contact_relationships',
        { p_email: email }
      );

      setContactTestResult({
        email,
        dbResult,
        dbError: dbError?.message,
        success: !dbError
      });

      // Test Edge Function
      const { data: edgeResult, error: edgeError } = await supabase.functions.invoke('check-contact-status', {
        body: { 
          email: email,
          user_id: user?.id 
        }
      });

      setEdgeFunctionTest({
        email,
        edgeResult,
        edgeError: edgeError?.message,
        success: !edgeError
      });

      console.log('✅ Contact test completed:', { dbResult, edgeResult });

    } catch (error: any) {
      console.error('❌ Contact test failed:', error);
      setContactTestResult({
        email: testEmail,
        error: error.message,
        success: false
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusIcon = (success?: boolean) => {
    if (success === undefined) return <AlertCircle className="w-4 h-4 text-muted-foreground" />;
    return success ? 
      <CheckCircle className="w-4 h-4 text-green-600" /> : 
      <XCircle className="w-4 h-4 text-red-600" />;
  };

  const getStatusBadge = (success?: boolean, label?: string) => {
    if (success === undefined) return <Badge variant="secondary">{label || "Unknown"}</Badge>;
    return success ? 
      <Badge variant="default" className="bg-green-100 text-green-800">{label || "Working"}</Badge> : 
      <Badge variant="destructive">{label || "Failed"}</Badge>;
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <AlertCircle className="w-5 h-5" />
            <span>Contact System Diagnostics</span>
          </CardTitle>
          <CardDescription>
            Diagnose issues with contact addition and Edge Function deployment
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex space-x-2">
            <Button 
              onClick={runSystemDiagnostics} 
              disabled={isLoading}
              variant="outline"
            >
              {isLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-2" />}
              Run System Check
            </Button>
          </div>

          {systemDiagnostics && (
            <Alert>
              <Eye className="w-4 h-4" />
              <AlertDescription>
                <div className="space-y-2">
                  <div className="font-medium">System Status:</div>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="flex items-center justify-between">
                      <span>New Contacts Table:</span>
                      {getStatusBadge(systemDiagnostics.contacts_new_exists)}
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Relationships Table:</span>
                      {getStatusBadge(systemDiagnostics.user_trusted_contacts_exists)}
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Old Contacts Table:</span>
                      {getStatusBadge(systemDiagnostics.contacts_old_exists)}
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Contact Check Function:</span>
                      {getStatusBadge(systemDiagnostics.check_contact_relationships_exists)}
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Legacy Check Function:</span>
                      {getStatusBadge(systemDiagnostics.check_existing_contact_exists)}
                    </div>
                  </div>
                  {systemDiagnostics.error && (
                    <div className="text-red-600 text-sm mt-2">
                      Error: {systemDiagnostics.error}
                    </div>
                  )}
                </div>
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Eye className="w-5 h-5" />
            <span>Contact Checking Test</span>
          </CardTitle>
          <CardDescription>
            Test contact checking functionality with a specific email
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex space-x-2">
            <div className="flex-1">
              <Label htmlFor="test-email">Test Email Address</Label>
              <Input
                id="test-email"
                type="email"
                placeholder="test@example.com"
                value={testEmail}
                onChange={(e) => setTestEmail(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && testContactChecking()}
              />
            </div>
            <div className="flex items-end">
              <Button 
                onClick={testContactChecking} 
                disabled={isLoading || !testEmail.trim()}
              >
                {isLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Eye className="w-4 h-4 mr-2" />}
                Test
              </Button>
            </div>
          </div>

          {contactTestResult && (
            <Alert>
              <AlertDescription>
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    {getStatusIcon(contactTestResult.success)}
                    <span className="font-medium">Database Function Test</span>
                  </div>
                  {contactTestResult.success ? (
                    <div className="text-sm space-y-1">
                      <div>Email: {contactTestResult.email}</div>
                      <div>Contact Exists: {contactTestResult.dbResult?.contact_exists ? 'Yes' : 'No'}</div>
                      <div>User Exists: {contactTestResult.dbResult?.user_exists ? 'Yes' : 'No'}</div>
                      <div>Can Add: {contactTestResult.dbResult?.can_add_contact ? 'Yes' : 'No'}</div>
                      <div>Relationships: {contactTestResult.dbResult?.relationships_count || 0}</div>
                    </div>
                  ) : (
                    <div className="text-red-600 text-sm">
                      Error: {contactTestResult.dbError || contactTestResult.error}
                    </div>
                  )}
                </div>
              </AlertDescription>
            </Alert>
          )}

          {edgeFunctionTest && (
            <Alert>
              <AlertDescription>
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    {getStatusIcon(edgeFunctionTest.success)}
                    <span className="font-medium">Edge Function Test</span>
                  </div>
                  {edgeFunctionTest.success ? (
                    <div className="text-sm space-y-1">
                      <div>Email: {edgeFunctionTest.email}</div>
                      <div>Contact Exists: {edgeFunctionTest.edgeResult?.contact_exists ? 'Yes' : 'No'}</div>
                      <div>User Exists: {edgeFunctionTest.edgeResult?.user_exists ? 'Yes' : 'No'}</div>
                      <div>Can Add: {edgeFunctionTest.edgeResult?.can_add_contact ? 'Yes' : 'No'}</div>
                      <div>Success: {edgeFunctionTest.edgeResult?.success ? 'Yes' : 'No'}</div>
                      {edgeFunctionTest.edgeResult?.message && (
                        <div>Message: {edgeFunctionTest.edgeResult.message}</div>
                      )}
                    </div>
                  ) : (
                    <div className="text-red-600 text-sm">
                      Error: {edgeFunctionTest.edgeError || 'Edge Function failed'}
                    </div>
                  )}
                </div>
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Common Issues & Solutions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-2">
            <div className="font-medium">Edge Function Not Deployed:</div>
            <div className="text-sm text-muted-foreground">
              Run: <code className="bg-muted px-1 rounded">supabase functions deploy check-contact-status</code>
            </div>
          </div>
          <Separator />
          <div className="space-y-2">
            <div className="font-medium">Database Functions Missing:</div>
            <div className="text-sm text-muted-foreground">
              Run the latest migrations: <code className="bg-muted px-1 rounded">supabase db reset</code>
            </div>
          </div>
          <Separator />
          <div className="space-y-2">
            <div className="font-medium">Permission Issues:</div>
            <div className="text-sm text-muted-foreground">
              Check RLS policies and function permissions in the database
            </div>
          </div>
          <Separator />
          <div className="space-y-2">
            <div className="font-medium">Environment Variables:</div>
            <div className="text-sm text-muted-foreground">
              Ensure SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, and SUPABASE_ANON_KEY are set in Edge Function
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 