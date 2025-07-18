import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, XCircle, AlertTriangle, Loader2, Mail } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

interface ContactStatusResult {
  success: boolean;
  contact_exists: boolean;
  contact_id?: string;
  contact_name?: string;
  contact_type?: 'trusted' | 'regular';
  invitation_status?: string;
  user_exists: boolean;
  existing_user_id?: string;
  can_add_contact: boolean;
  error?: string;
  message?: string;
}

export function ContactEmailValidator() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [testEmail, setTestEmail] = useState('');
  const [isValidating, setIsValidating] = useState(false);
  const [validationResult, setValidationResult] = useState<ContactStatusResult | null>(null);
  const [validationHistory, setValidationHistory] = useState<Array<{
    email: string;
    result: ContactStatusResult;
    timestamp: string;
  }>>([]);

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email.trim());
  };

  const checkContactStatus = async (email: string) => {
    try {
      console.log(`🔍 Testing contact status for: ${email}`);
      
      // Get the current session for authentication
      const { data: session } = await supabase.auth.getSession();
      if (!session.session) {
        return { 
          success: false,
          contact_exists: false, 
          user_exists: false, 
          can_add_contact: false,
          error: 'Authentication required. Please refresh the page and try again.' 
        };
      }

      // Call the Edge Function using the Supabase client
      const { data, error } = await supabase.functions.invoke('check-contact-status', {
        body: { 
          email: email.trim().toLowerCase(),
          user_id: user?.id 
        }
      });

      console.log(`📡 Edge Function Response:`, { data, error });

      if (error) {
        return { 
          success: false,
          contact_exists: false, 
          user_exists: false, 
          can_add_contact: false,
          error: error.message || 'Edge Function call failed. Please try again.'
        };
      }

      if (!data) {
        return { 
          success: false,
          contact_exists: false, 
          user_exists: false, 
          can_add_contact: false,
          error: 'No response from server. Please try again.' 
        };
      }

      return data;

    } catch (error: any) {
      console.error('❌ Exception checking contact status:', error);
      return { 
        success: false,
        contact_exists: false, 
        user_exists: false, 
        can_add_contact: false,
        error: error.message || 'Network error. Please check your connection and try again.'
      };
    }
  };

  const handleValidateEmail = async () => {
    if (!testEmail.trim()) {
      toast({
        title: "Email Required",
        description: "Please enter an email address to validate.",
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

    setIsValidating(true);
    setValidationResult(null);

    try {
      const result = await checkContactStatus(testEmail);
      setValidationResult(result);
      
      // Add to history
      setValidationHistory(prev => [{
        email: testEmail.trim(),
        result,
        timestamp: new Date().toLocaleTimeString()
      }, ...prev.slice(0, 4)]); // Keep last 5 results

      console.log('✅ Validation completed:', result);

    } catch (error: any) {
      console.error('❌ Validation failed:', error);
      setValidationResult({
        success: false,
        contact_exists: false,
        user_exists: false,
        can_add_contact: false,
        error: error.message || 'Validation failed'
      });
    } finally {
      setIsValidating(false);
    }
  };

  const getStatusIcon = (result: ContactStatusResult) => {
    if (!result.success) return <XCircle className="w-4 h-4 text-red-600" />;
    if (result.contact_exists) return <AlertTriangle className="w-4 h-4 text-orange-600" />;
    if (result.user_exists) return <CheckCircle className="w-4 h-4 text-blue-600" />;
    return <CheckCircle className="w-4 h-4 text-green-600" />;
  };

  const getStatusBadge = (result: ContactStatusResult) => {
    if (!result.success) return <Badge variant="destructive">Error</Badge>;
    if (result.contact_exists) return <Badge variant="destructive">Duplicate</Badge>;
    if (result.user_exists) return <Badge variant="secondary">Existing User</Badge>;
    return <Badge variant="default">Available</Badge>;
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="w-5 h-5" />
            Email Validation Tester
          </CardTitle>
          <CardDescription>
            Test the contact email validation system to verify duplicate detection and user existence checking.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-3">
            <div className="flex-1">
              <Label htmlFor="test-email">Email Address</Label>
              <Input
                id="test-email"
                type="email"
                value={testEmail}
                onChange={(e) => setTestEmail(e.target.value)}
                placeholder="Enter email to validate"
                onKeyDown={(e) => e.key === 'Enter' && handleValidateEmail()}
              />
            </div>
            <div className="flex items-end">
              <Button 
                onClick={handleValidateEmail}
                disabled={isValidating}
                className="min-w-[100px]"
              >
                {isValidating ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Checking...
                  </>
                ) : (
                  'Validate'
                )}
              </Button>
            </div>
          </div>

          {validationResult && (
            <Alert className={
              !validationResult.success ? 'border-red-200 bg-red-50' :
              validationResult.contact_exists ? 'border-orange-200 bg-orange-50' :
              validationResult.user_exists ? 'border-blue-200 bg-blue-50' :
              'border-green-200 bg-green-50'
            }>
              <div className="flex items-start gap-3">
                {getStatusIcon(validationResult)}
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="font-medium">Validation Result</span>
                    {getStatusBadge(validationResult)}
                  </div>
                  <AlertDescription>
                    {validationResult.message || validationResult.error || 'Validation completed'}
                  </AlertDescription>
                  
                  {/* Detailed result breakdown */}
                  <div className="mt-3 p-3 bg-white/50 rounded border text-xs space-y-1">
                    <div><strong>Success:</strong> {validationResult.success ? 'Yes' : 'No'}</div>
                    <div><strong>Contact Exists:</strong> {validationResult.contact_exists ? 'Yes' : 'No'}</div>
                    <div><strong>User Exists:</strong> {validationResult.user_exists ? 'Yes' : 'No'}</div>
                    <div><strong>Can Add:</strong> {validationResult.can_add_contact ? 'Yes' : 'No'}</div>
                    {validationResult.contact_name && (
                      <div><strong>Contact Name:</strong> {validationResult.contact_name}</div>
                    )}
                    {validationResult.contact_type && (
                      <div><strong>Contact Type:</strong> {validationResult.contact_type}</div>
                    )}
                  </div>
                </div>
              </div>
            </Alert>
          )}

          {/* Validation History */}
          {validationHistory.length > 0 && (
            <div className="space-y-2">
              <Label className="text-sm font-medium">Recent Validations</Label>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {validationHistory.map((item, index) => (
                  <div key={index} className="flex items-center justify-between p-2 bg-muted/30 rounded text-xs">
                    <div className="flex items-center gap-2">
                      {getStatusIcon(item.result)}
                      <span className="font-mono">{item.email}</span>
                      {getStatusBadge(item.result)}
                    </div>
                    <span className="text-muted-foreground">{item.timestamp}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
} 