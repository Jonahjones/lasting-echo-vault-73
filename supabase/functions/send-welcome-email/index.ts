import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { Resend } from "npm:resend@2.0.0"

console.log('🔧 Initializing send-welcome-email function');

const resendApiKey = Deno.env.get("RESEND_API_KEY");
console.log('🔑 RESEND_API_KEY configured:', resendApiKey ? 'YES' : 'NO');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  console.log('📨 Function called with method:', req.method);
  console.log('📨 Request headers:', Object.fromEntries(req.headers.entries()));
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    console.log('✅ Handling CORS preflight request');
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    console.log('📥 Request body received:', body);
    
    const { contact_email, contact_name, inviter_name, contact_type, is_existing_user } = body;

    // Validate required fields
    if (!contact_email || !contact_name || !inviter_name || !contact_type) {
      console.log('❌ Missing required fields:', { contact_email, contact_name, inviter_name, contact_type });
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Check if Resend API key is available
    if (!resendApiKey) {
      console.log('❌ RESEND_API_KEY not configured');
      return new Response(
        JSON.stringify({ error: 'RESEND_API_KEY not configured' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Prepare email content based on contact type
    let subject: string
    let htmlContent: string
    
    // Generate signup link (placeholder for now)
    const signupLink = `${Deno.env.get('SUPABASE_URL')?.replace('/supabase', '') || 'https://app.onefinalmoment.com'}/auth`

    if (contact_type === 'trusted') {
      subject = `You've been chosen as a Trusted Contact 💙`
      htmlContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333;">
          <h1 style="color: #2563eb; margin-bottom: 24px;">You've been chosen for something really special.</h1>
          
          <p style="font-size: 16px; line-height: 1.6; margin-bottom: 20px;">
            <strong>${inviter_name}</strong> has invited you to be their <strong>Trusted Contact</strong> on One Final Moment—a platform where people preserve heartfelt video messages for their loved ones to receive in the future.
          </p>
          
          <div style="background: #f8fafc; padding: 20px; border-radius: 8px; margin: 24px 0;">
            <h3 style="color: #1e40af; margin-bottom: 12px;">Here's why this matters:</h3>
            <p style="margin-bottom: 16px;">As their Trusted Contact, you'll help ensure their meaningful memories reach the right people at the right time. You're someone they trust deeply, and that trust is at the heart of what makes this platform so special.</p>
            
            <h4 style="color: #1e40af; margin-bottom: 8px;">What you'll do:</h4>
            <ul style="margin: 0; padding-left: 20px;">
              <li>Help manage their contact list when needed</li>
              <li>Assist with video delivery if they're ever unable to</li>
              <li>Be part of preserving memories that truly matter</li>
            </ul>
          </div>
          
          <p style="font-size: 16px; line-height: 1.6; margin-bottom: 24px;">
            This isn't just about technology—it's about being there for someone who cares about you.
          </p>
          
          <div style="text-align: center; margin: 32px 0;">
            <a href="${signupLink}" style="background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Get Started - Accept Your Role</a>
          </div>
          
          <p style="color: #64748b; font-size: 14px; text-align: center; margin-top: 32px;">
            Thank you for being someone they can count on.<br><br>
            Warmly,<br>The One Final Moment Team
          </p>
        </div>
      `
    } else {
      subject = `${inviter_name} invited you to One Final Moment`
      htmlContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333;">
          <h1 style="color: #2563eb; margin-bottom: 24px;">You're Invited!</h1>
          
          <p style="font-size: 16px; line-height: 1.6; margin-bottom: 20px;">
            Hi <strong>${contact_name}</strong>,
          </p>
          
          <p style="font-size: 16px; line-height: 1.6; margin-bottom: 20px;">
            <strong>${inviter_name}</strong> has invited you to join One Final Moment—a meaningful platform where people preserve heartfelt video messages for their loved ones.
          </p>
          
          <p style="font-size: 16px; line-height: 1.6; margin-bottom: 24px;">
            Join us to preserve and share memories that truly matter.
          </p>
          
          <div style="text-align: center; margin: 32px 0;">
            <a href="${signupLink}" style="background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Join One Final Moment</a>
          </div>
          
          <p style="color: #64748b; font-size: 14px; text-align: center; margin-top: 32px;">
            Best regards,<br>The One Final Moment Team
          </p>
        </div>
      `
    }

    console.log('📧 Sending email to:', contact_email);
    console.log('📧 Subject:', subject);
    console.log('📧 Contact type:', contact_type);

    // Initialize Resend with API key
    const resend = new Resend(resendApiKey);

    // Send email using Resend
    const emailResponse = await resend.emails.send({
      from: 'One Final Moment <onboarding@resend.dev>',
      to: [contact_email],
      subject: subject,
      html: htmlContent,
    });

    console.log('✅ Email sent successfully:', emailResponse);
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Welcome email sent successfully',
        contact_type,
        is_existing_user,
        email_id: emailResponse.data?.id,
        resend_response: emailResponse
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('❌ Error in function:', error);
    console.error('❌ Error stack:', error.stack);
    
    return new Response(
      JSON.stringify({ 
        error: 'Failed to send welcome email',
        details: error.message,
        stack: error.stack
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
})