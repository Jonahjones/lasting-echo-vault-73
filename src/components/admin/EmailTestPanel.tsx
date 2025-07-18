import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Mail, Send, CheckCircle, XCircle, AlertTriangle, Info, ChevronDown, ChevronUp, ExternalLink } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { testEmailConfiguration, isValidEmail, getResendSetupInstructions } from "@/lib/email-utils";

export function EmailTestPanel() {
  const [testEmail, setTestEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSetupExpanded, setIsSetupExpanded] = useState(false);
  const [lastTestResult, setLastTestResult] = useState<'success' | 'error' | null>(null);
  const { toast } = useToast();

  const handleTestEmail = async () => {
    if (!testEmail.trim()) {
      toast({
        title: "Email Required",
        description: "Please enter an email address for testing.",
        variant: "destructive",
      });
      return;
    }

    if (!isValidEmail(testEmail)) {
      toast({
        title: "Invalid Email",
        description: "Please enter a valid email address.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    setLastTestResult(null);
    
    try {
      const result = await testEmailConfiguration(testEmail);
      
      setLastTestResult(result.success ? 'success' : 'error');
      
      toast({
        title: result.success ? "Email Test Successful" : "Email Test Failed",
        description: result.message,
        variant: result.success ? "default" : "destructive",
      });
      
      if (result.error) {
        console.error('Email test error details:', result);
      } else {
        console.log('Email test success details:', result);
      }
    } catch (error) {
      console.error('Error testing email:', error);
      setLastTestResult('error');
      toast({
        title: "Email Test Error",
        description: "An unexpected error occurred while testing email configuration.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const setupInstructions = getResendSetupInstructions();

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="w-5 h-5" />
            Email Service Diagnostics
          </CardTitle>
          <CardDescription>
            Test email configuration and troubleshoot invitation delivery issues
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Test Email Section */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="test-email">Test Email Address</Label>
              <div className="flex gap-2">
                <Input
                  id="test-email"
                  type="email"
                  placeholder="jonahrehbeinjones@gmail.com"
                  value={testEmail}
                  onChange={(e) => setTestEmail(e.target.value)}
                  disabled={isLoading}
                  className={
                    lastTestResult === 'success' ? 'border-green-500 focus:border-green-500' :
                    lastTestResult === 'error' ? 'border-red-500 focus:border-red-500' : ''
                  }
                />
                <Button 
                  onClick={handleTestEmail} 
                  disabled={isLoading || !testEmail.trim()}
                  className="whitespace-nowrap"
                >
                  <Send className="w-4 h-4 mr-2" />
                  {isLoading ? "Sending..." : "Send Test"}
                </Button>
              </div>
              {lastTestResult === 'success' && (
                <div className="flex items-center gap-2 text-sm text-green-600">
                  <CheckCircle className="w-4 h-4" />
                  Test email sent successfully! Check your inbox and spam folder.
                </div>
              )}
              {lastTestResult === 'error' && (
                <div className="flex items-center gap-2 text-sm text-red-600">
                  <XCircle className="w-4 h-4" />
                  Test failed. Check the error message above and setup instructions below.
                </div>
              )}
            </div>
            
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                This sends a test email to verify email service configuration. 
                <strong> Check both inbox and spam folder</strong> for the test message.
              </AlertDescription>
            </Alert>
          </div>

          <Separator />

          {/* Setup Instructions */}
          <Collapsible open={isSetupExpanded} onOpenChange={setIsSetupExpanded}>
            <CollapsibleTrigger asChild>
              <Button variant="outline" className="w-full justify-between">
                <span className="flex items-center gap-2">
                  <Mail className="w-4 h-4" />
                  Resend Email Service Setup Instructions
                </span>
                {isSetupExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-4">
              <div className="space-y-4 p-4 bg-muted/50 rounded-lg">
                <div className="space-y-3">
                  {setupInstructions.map((instruction, index) => (
                    <div key={index} className="flex items-start gap-3">
                      <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center flex-shrink-0 mt-0.5">
                        {index + 1}
                      </div>
                      <div className="text-sm">
                        {instruction.includes('https://') ? (
                          <div className="flex items-center gap-2">
                            {instruction.split('https://')[0]}
                            <a
                              href={`https://${instruction.split('https://')[1].split(' ')[0]}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-primary hover:underline flex items-center gap-1"
                            >
                              https://{instruction.split('https://')[1].split(' ')[0]}
                              <ExternalLink className="w-3 h-3" />
                            </a>
                            {instruction.split('https://')[1].includes(' ') && (
                              <span>{instruction.split('https://')[1].substring(instruction.split('https://')[1].indexOf(' '))}</span>
                            )}
                          </div>
                        ) : (
                          instruction
                        )}
                      </div>
                    </div>
                  ))}
                </div>
                
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Important:</strong> The API key you provided earlier (re_V9jaigXF_...) needs to be added to your Supabase Edge Functions environment variables for the email service to work.
                  </AlertDescription>
                </Alert>
              </div>
            </CollapsibleContent>
          </Collapsible>

          <Separator />

          {/* Troubleshooting Checklist */}
          <div className="space-y-4">
            <h4 className="font-semibold text-sm">Email Troubleshooting Checklist</h4>
            
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                <div className="text-sm">
                  <div className="font-medium">1. Environment Configuration</div>
                  <div className="text-muted-foreground">
                    Verify RESEND_API_KEY is set in Supabase edge function environment (starts with 're_')
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <AlertTriangle className="w-4 h-4 text-yellow-500 mt-0.5 flex-shrink-0" />
                <div className="text-sm">
                  <div className="font-medium">2. Domain Verification</div>
                  <div className="text-muted-foreground">
                    Either verify your custom domain in Resend dashboard OR use the default 'onboarding@resend.dev'
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <XCircle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
                <div className="text-sm">
                  <div className="font-medium">3. Deliverability Issues</div>
                  <div className="text-muted-foreground">
                    Check recipient spam folder, sender reputation, and rate limits
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Info className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
                <div className="text-sm">
                  <div className="font-medium">4. API Status & Logs</div>
                  <div className="text-muted-foreground">
                    Monitor Resend API status and check browser console for detailed error logs
                  </div>
                </div>
              </div>
            </div>
          </div>

          <Separator />

          {/* Common Issues */}
          <div className="space-y-4">
            <h4 className="font-semibold text-sm">Common Issues & Solutions</h4>
            
            <div className="space-y-3 text-sm">
              <div>
                <Badge variant="outline" className="mb-2">Configuration</Badge>
                <div className="text-muted-foreground">
                  <strong>Issue:</strong> "Email service not configured"<br/>
                  <strong>Solution:</strong> Add RESEND_API_KEY to Supabase edge function environment variables
                </div>
              </div>

              <div>
                <Badge variant="outline" className="mb-2">API Key</Badge>
                <div className="text-muted-foreground">
                  <strong>Issue:</strong> "Invalid or expired API key"<br/>
                  <strong>Solution:</strong> Verify your API key in Resend dashboard and ensure it starts with 're_'
                </div>
              </div>

              <div>
                <Badge variant="outline" className="mb-2">Domain</Badge>
                <div className="text-muted-foreground">
                  <strong>Issue:</strong> "Domain verification required"<br/>
                  <strong>Solution:</strong> Verify your sending domain in Resend dashboard or use onboarding@resend.dev
                </div>
              </div>

              <div>
                <Badge variant="outline" className="mb-2">Delivery</Badge>
                <div className="text-muted-foreground">
                  <strong>Issue:</strong> Emails not received<br/>
                  <strong>Solution:</strong> Check spam folder, verify email address, test with different providers
                </div>
              </div>

              <div>
                <Badge variant="outline" className="mb-2">Rate Limits</Badge>
                <div className="text-muted-foreground">
                  <strong>Issue:</strong> "Rate limit reached"<br/>
                  <strong>Solution:</strong> Wait for rate limit reset or upgrade Resend plan (free tier: 100 emails/day)
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 