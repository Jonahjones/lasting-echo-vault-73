import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { CheckCircle, XCircle, AlertTriangle, Loader2, Mail, Shield, Settings } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export function EmailVerificationDiagnostics() {
  const { toast } = useToast();
  const [testEmail, setTestEmail] = useState('');
  const [isTestingSignup, setIsTestingSignup] = useState(false);
  const [isTestingResend, setIsTestingResend] = useState(false);
  const [diagnosticResults, setDiagnosticResults] = useState<any>(null);

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email.trim());
  };

  const testSignupEmailVerification = async () => {
    if (!testEmail.trim()) {
      toast({
        title: "Email Required",
        description: "Please enter an email address to test signup verification.",
        variant: "destructive",
      });
      return;
    }

    if (!validateEmail(testEmail)) {
      toast({
        title: "Invalid Email",
        description: "Please enter a valid email address.",
        variant: "destructive",
      });
      return;
    }

    setIsTestingSignup(true);
    setDiagnosticResults(null);

    try {
      console.log('🧪 Testing signup email verification for:', testEmail);
      
      // Test signup with a temporary password
      const { data, error } = await supabase.auth.signUp({
        email: testEmail.trim(),
        password: 'TempPassword123!', // Temporary password for testing
        options: {
          emailRedirectTo: `${window.location.origin}/auth`,
          data: {
            first_name: 'Test',
            last_name: 'User',
            name: 'Test User'
          }
        }
      });

      const result = {
        success: !error,
        user_created: !!data.user,
        user_id: data.user?.id,
        email_sent: !error && data.user && !data.user.email_confirmed_at,
        needs_verification: !data.user?.email_confirmed_at,
        error: error?.message,
        session_created: !!data.session,
        timestamp: new Date().toISOString()
      };

      setDiagnosticResults(result);

      if (error) {
        toast({
          title: "Signup Test Failed",
          description: error.message,
          variant: "destructive",
        });
      } else if (data.user && !data.user.email_confirmed_at) {
        toast({
          title: "Verification Email Sent",
          description: `Check ${testEmail} for the verification email. You may need to delete this test user afterward.`,
          variant: "default",
        });
      } else {
        toast({
          title: "User Already Verified",
          description: "This email address is already registered and verified.",
          variant: "default",
        });
      }

      console.log('✅ Signup test completed:', result);

    } catch (error: any) {
      console.error('❌ Signup test failed:', error);
      setDiagnosticResults({
        success: false,
        error: error.message || 'Test failed',
        timestamp: new Date().toISOString()
      });
      
      toast({
        title: "Test Error",
        description: error.message || 'An unexpected error occurred during testing.',
        variant: "destructive",
      });
    } finally {
      setIsTestingSignup(false);
    }
  };

  const testResendVerification = async () => {
    if (!testEmail.trim()) {
      toast({
        title: "Email Required",
        description: "Please enter an email address to test resend verification.",
        variant: "destructive",
      });
      return;
    }

    setIsTestingResend(true);

    try {
      console.log('🔄 Testing resend verification for:', testEmail);
      
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: testEmail.trim(),
        options: {
          emailRedirectTo: `${window.location.origin}/auth`
        }
      });

      if (error) {
        toast({
          title: "Resend Failed",
          description: error.message,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Verification Email Resent",
          description: `A new verification email has been sent to ${testEmail}`,
          variant: "default",
        });
      }

      console.log('✅ Resend test completed:', { success: !error, error: error?.message });

    } catch (error: any) {
      console.error('❌ Resend test failed:', error);
      toast({
        title: "Resend Error",
        description: error.message || 'Failed to resend verification email.',
        variant: "destructive",
      });
    } finally {
      setIsTestingResend(false);
    }
  };

  const getStatusIcon = (success: boolean) => {
    return success ? 
      <CheckCircle className="w-4 h-4 text-green-600" /> : 
      <XCircle className="w-4 h-4 text-red-600" />;
  };

  const getStatusBadge = (success: boolean) => {
    return success ? 
      <Badge variant="default">Working</Badge> : 
      <Badge variant="destructive">Failed</Badge>;
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5" />
            Email Verification Diagnostics
          </CardTitle>
          <CardDescription>
            Test Supabase email verification system for user signup and account confirmation.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          
          {/* Test Email Input */}
          <div className="space-y-2">
            <Label htmlFor="test-email">Test Email Address</Label>
            <Input
              id="test-email"
              type="email"
              value={testEmail}
              onChange={(e) => setTestEmail(e.target.value)}
              placeholder="Enter email to test verification system"
            />
            <p className="text-xs text-muted-foreground">
              ⚠️ This will create a test user account. Use a test email address.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3">
            <Button 
              onClick={testSignupEmailVerification}
              disabled={isTestingSignup || isTestingResend}
              className="flex-1"
            >
              {isTestingSignup ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Testing Signup...
                </>
              ) : (
                <>
                  <Mail className="w-4 h-4 mr-2" />
                  Test Signup Verification
                </>
              )}
            </Button>
            
            <Button 
              variant="outline"
              onClick={testResendVerification}
              disabled={isTestingSignup || isTestingResend}
              className="flex-1"
            >
              {isTestingResend ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Resending...
                </>
              ) : (
                'Resend Verification'
              )}
            </Button>
          </div>

          {/* Diagnostic Results */}
          {diagnosticResults && (
            <>
              <Separator />
              <Alert className={
                diagnosticResults.success ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'
              }>
                <div className="flex items-start gap-3">
                  {getStatusIcon(diagnosticResults.success)}
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="font-medium">Test Results</span>
                      {getStatusBadge(diagnosticResults.success)}
                    </div>
                    <AlertDescription>
                      {diagnosticResults.success ? 
                        'Signup email verification system is working correctly.' : 
                        'Email verification system has issues.'}
                    </AlertDescription>
                    
                    {/* Detailed result breakdown */}
                    <div className="mt-3 p-3 bg-white/50 rounded border text-xs space-y-1">
                      <div><strong>Success:</strong> {diagnosticResults.success ? 'Yes' : 'No'}</div>
                      <div><strong>User Created:</strong> {diagnosticResults.user_created ? 'Yes' : 'No'}</div>
                      {diagnosticResults.user_id && (
                        <div><strong>User ID:</strong> {diagnosticResults.user_id}</div>
                      )}
                      <div><strong>Email Sent:</strong> {diagnosticResults.email_sent ? 'Yes' : 'No'}</div>
                      <div><strong>Needs Verification:</strong> {diagnosticResults.needs_verification ? 'Yes' : 'No'}</div>
                      <div><strong>Session Created:</strong> {diagnosticResults.session_created ? 'Yes' : 'No'}</div>
                      {diagnosticResults.error && (
                        <div><strong>Error:</strong> {diagnosticResults.error}</div>
                      )}
                      <div><strong>Test Time:</strong> {new Date(diagnosticResults.timestamp).toLocaleString()}</div>
                    </div>
                  </div>
                </div>
              </Alert>
            </>
          )}

          <Separator />

          {/* Troubleshooting Guide */}
          <div className="space-y-4">
            <h4 className="font-semibold text-sm flex items-center gap-2">
              <Settings className="w-4 h-4" />
              Email Verification Troubleshooting
            </h4>
            
            <div className="space-y-3 text-sm">
              <div className="p-3 bg-muted/50 rounded">
                <div className="font-medium mb-2">Common Issues & Solutions:</div>
                <ul className="space-y-2 text-muted-foreground">
                  <li>• <strong>No verification email received:</strong> Check Supabase Auth settings → Email Templates</li>
                  <li>• <strong>Email in spam folder:</strong> Verify sender domain and SMTP configuration</li>
                  <li>• <strong>SMTP not configured:</strong> Set up email provider in Supabase dashboard</li>
                  <li>• <strong>Template errors:</strong> Check email template syntax in Supabase</li>
                  <li>• <strong>Rate limiting:</strong> Too many signup attempts from same IP</li>
                </ul>
              </div>

              <div className="p-3 bg-blue-50 border border-blue-200 rounded">
                <div className="font-medium mb-2 text-blue-800">Supabase Email Setup Steps:</div>
                <ol className="space-y-1 text-blue-700 text-xs">
                  <li>1. Go to Supabase Dashboard → Authentication → Settings</li>
                  <li>2. Configure SMTP settings (or use Supabase's built-in email)</li>
                  <li>3. Customize email templates in Templates section</li>
                  <li>4. Verify site URL matches your domain</li>
                  <li>5. Test with a real email address</li>
                </ol>
              </div>

              <div className="p-3 bg-orange-50 border border-orange-200 rounded">
                <div className="font-medium mb-2 text-orange-800">Quick Fixes:</div>
                <ul className="space-y-1 text-orange-700 text-xs">
                  <li>• Add your domain to email template allowlist</li>
                  <li>• Check if "Confirm email" is enabled in Auth settings</li>
                  <li>• Verify redirect URLs include your domain</li>
                  <li>• Use a different email provider (Gmail, Outlook) for testing</li>
                </ul>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 