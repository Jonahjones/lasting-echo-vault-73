import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface ContactData {
  full_name: string;
  email: string;
  contact_type: 'trusted' | 'regular';
}

export const sendWelcomeEmail = async (
  contactData: ContactData, 
  inviterName: string,
  isExistingUser: boolean = false,
  toast: ReturnType<typeof useToast>['toast']
) => {
  try {
    console.log('Attempting to send welcome email to:', contactData.email);
    
    // Call Supabase function to send welcome email
    const { data, error } = await supabase.functions.invoke('send-welcome-email', {
      body: {
        contact_email: contactData.email,
        contact_name: contactData.full_name,
        inviter_name: inviterName,
        contact_type: contactData.contact_type,
        is_existing_user: isExistingUser
      }
    });

    if (error) {
      console.error('Supabase function error:', error);
      throw error;
    }

    console.log('Email function response:', data);

    // Check if email was actually sent
    if (data?.success) {
      toast({
        title: "Contact Added",
        description: `${contactData.full_name} has been invited! Welcome email sent to ${contactData.email}.`,
        variant: "default",
      });
    } else if (data?.warning || data?.message?.includes('not configured')) {
      // Email service not configured
      toast({
        title: "Contact Added",
        description: `${contactData.full_name} has been added. Note: Email service not configured - no invitation email sent.`,
        variant: "default",
      });
    } else if (data?.error) {
      // Specific error from backend
      let errorMessage = `${contactData.full_name} has been added but welcome email could not be sent.`;
      
      if (data.error.includes('domain')) {
        errorMessage += " The sender domain may need verification.";
      } else if (data.error.includes('API')) {
        errorMessage += " Email service is experiencing issues.";
      } else if (data.error.includes('rate limit')) {
        errorMessage += " Rate limit reached. Please try again later.";
      } else if (data.details) {
        errorMessage += ` Error: ${data.details}`;
      }
      
      toast({
        title: "Contact Added",
        description: errorMessage,
        variant: "default",
      });
    } else {
      // Email failed but function succeeded
      toast({
        title: "Contact Added",
        description: `${contactData.full_name} has been added but welcome email could not be sent. Please inform them manually.`,
        variant: "default",
      });
    }
  } catch (error) {
    console.error('Error sending welcome email:', error);
    
    // Provide specific error feedback
    let errorMessage = "Contact was added but welcome email could not be sent.";
    
    if (error.message?.includes('not configured')) {
      errorMessage = "Contact was added but email service is not configured.";
    } else if (error.message?.includes('invalid email')) {
      errorMessage = "Contact was added but the email address appears to be invalid.";
    } else if (error.message?.includes('rate limit')) {
      errorMessage = "Contact was added but email sending is temporarily limited. Try again later.";
    } else if (error.message?.includes('domain')) {
      errorMessage = "Contact was added but there's an issue with the email domain configuration.";
    } else if (error.message?.includes('API')) {
      errorMessage = "Contact was added but the email service is currently unavailable.";
    }
    
    toast({
      title: "Contact Added",
      description: errorMessage,
      variant: "default",
    });
  }
};

// Email utilities for testing and validation

export interface EmailTestResult {
  success: boolean;
  message: string;
  error?: string;
  details?: any;
}

export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email.trim());
}

export async function testEmailConfiguration(testEmail: string): Promise<EmailTestResult> {
  try {
    console.log('🧪 Testing email configuration with:', testEmail);
    
    if (!isValidEmail(testEmail)) {
      return {
        success: false,
        message: 'Invalid email format',
        error: 'Please provide a valid email address'
      };
    }

    // Test by attempting to send a test email via our Edge Function
    const response = await fetch('/api/test-email', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to_email: testEmail,
        test_mode: true
      })
    });

    const result = await response.json();

    if (!response.ok) {
      return {
        success: false,
        message: 'Email test failed',
        error: result.error || 'Unknown error occurred',
        details: result
      };
    }

    return {
      success: true,
      message: 'Email configuration is working correctly',
      details: result
    };

  } catch (error: any) {
    console.error('❌ Email test error:', error);
    return {
      success: false,
      message: 'Email test failed',
      error: error.message || 'Network error occurred',
      details: error
    };
  }
}

export function getResendSetupInstructions(): string[] {
  return [
    "1. Sign up at https://resend.com",
    "2. Get your API key from the dashboard", 
    "3. Add RESEND_API_KEY to your Supabase project secrets:",
    "   - Go to your Supabase project dashboard",
    "   - Navigate to Project Settings > Edge Functions",
    "   - Add RESEND_API_KEY as a secret",
    "4. Verify your sending domain in Resend",
    "5. Test using the form above"
  ];
}

export function getEmailConfigurationStatus(): {
  hasApiKey: boolean;
  hasFromEmail: boolean;
  isConfigured: boolean;
  issues: string[];
} {
  // Note: We can't access Edge Function environment variables from the frontend
  // This is mainly for UI guidance
  const issues: string[] = [];
  
  // These would need to be checked on the backend
  const hasApiKey = true; // Assume configured unless we get errors
  const hasFromEmail = true; // Assume configured unless we get errors
  
  if (!hasApiKey) {
    issues.push('RESEND_API_KEY not configured');
  }
  
  if (!hasFromEmail) {
    issues.push('RESEND_FROM_EMAIL not configured');
  }
  
  return {
    hasApiKey,
    hasFromEmail,
    isConfigured: hasApiKey && hasFromEmail,
    issues
  };
} 