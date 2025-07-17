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

    if (contact_type === 'trusted') {
      subject = `You've been invited as a Trusted Contact on One Final Moment`
      htmlContent = `
        <h1>You're a Trusted Contact</h1>
        <p>Hi <strong>${contact_name}</strong>,</p>
        <p><strong>${inviter_name}</strong> has invited you to join One Final Moment as a <strong>Trusted Contact</strong>.</p>
        <p>Visit the platform to learn more about your important role.</p>
        <p>Best regards,<br>The One Final Moment Team</p>
      `
    } else {
      subject = `${inviter_name} invited you to One Final Moment`
      htmlContent = `
        <h1>You're Invited!</h1>
        <p>Hi <strong>${contact_name}</strong>,</p>
        <p><strong>${inviter_name}</strong> has invited you to join One Final Moment.</p>
        <p>Join us to preserve and share meaningful memories.</p>
        <p>Best regards,<br>The One Final Moment Team</p>
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