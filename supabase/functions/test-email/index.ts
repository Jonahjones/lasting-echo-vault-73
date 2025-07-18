import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  console.log(`[${new Date().toISOString()}] Test email function invoked`)
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { test_email } = await req.json()
    
    if (!test_email) {
      return new Response(
        JSON.stringify({ error: 'test_email parameter required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(test_email)) {
      console.error('[TEST_EMAIL] Invalid email format:', test_email);
      return new Response(
        JSON.stringify({ 
          success: false,
          error: 'Invalid email format',
          details: 'Please provide a valid email address'
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Check environment configuration
    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

    console.log('[TEST_EMAIL] Environment check:', {
      RESEND_API_KEY: RESEND_API_KEY ? `present (${RESEND_API_KEY.substring(0, 8)}...)` : 'missing',
      SUPABASE_URL: SUPABASE_URL ? 'present' : 'missing',
      SUPABASE_SERVICE_ROLE_KEY: SUPABASE_SERVICE_ROLE_KEY ? 'present' : 'missing'
    })

    // Validate API key format
    if (RESEND_API_KEY && !RESEND_API_KEY.startsWith('re_')) {
      console.error('[TEST_EMAIL] Invalid API key format - should start with "re_"');
      return new Response(
        JSON.stringify({ 
          success: false,
          error: 'Invalid RESEND_API_KEY format',
          details: 'API key should start with "re_"',
          diagnostics: { api_key_prefix: RESEND_API_KEY ? RESEND_API_KEY.substring(0, 3) : 'none' }
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const diagnostics = {
      timestamp: new Date().toISOString(),
      environment: {
        RESEND_API_KEY: !!RESEND_API_KEY,
        SUPABASE_URL: !!SUPABASE_URL,
        SUPABASE_SERVICE_ROLE_KEY: !!SUPABASE_SERVICE_ROLE_KEY,
        api_key_format_valid: RESEND_API_KEY ? RESEND_API_KEY.startsWith('re_') : false,
        all_env_vars: Object.keys(Deno.env.toObject()).sort()
      },
      test_email: test_email
    }

    if (!RESEND_API_KEY) {
      return new Response(
        JSON.stringify({ 
          success: false,
          error: 'RESEND_API_KEY not configured',
          details: 'Please add your Resend API key to Supabase Edge Function environment variables',
          diagnostics
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Test email content
    const testEmailContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 8px; }
          .success { color: #22c55e; font-weight: bold; }
        </style>
      </head>
      <body>
        <div class="container">
          <h2>Email Configuration Test</h2>
          <p class="success">✅ Email service is working correctly!</p>
          <p>This is a test email sent from One Final Moment to verify email configuration.</p>
          <p><strong>Test details:</strong></p>
          <ul>
            <li>Timestamp: ${new Date().toISOString()}</li>
            <li>Recipient: ${test_email}</li>
            <li>Service: Resend API</li>
            <li>Sender: onboarding@resend.dev</li>
          </ul>
          <p>If you receive this email, the email invitation system should be working properly.</p>
        </div>
      </body>
      </html>
    `

    // Attempt to send test email
    console.log('[TEST_EMAIL] Sending test email to:', test_email)
    
    const emailPayload = {
      from: 'One Final Moment <onboarding@resend.dev>',
      to: [test_email],
      subject: 'One Final Moment - Email Configuration Test',
      html: testEmailContent,
    }

    console.log('[TEST_EMAIL] Email payload:', {
      from: emailPayload.from,
      to: emailPayload.to,
      subject: emailPayload.subject,
      html_length: emailPayload.html.length
    })

    const resendRequestHeaders = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${RESEND_API_KEY}`,
    }

    console.log('[TEST_EMAIL] Making request to Resend API...')
    console.log('[TEST_EMAIL] Request headers:', {
      'Content-Type': resendRequestHeaders['Content-Type'],
      'Authorization': `Bearer ${RESEND_API_KEY.substring(0, 8)}...`
    })

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: resendRequestHeaders,
      body: JSON.stringify(emailPayload),
    })

    console.log('[TEST_EMAIL] Resend API response status:', res.status)
    console.log('[TEST_EMAIL] Resend API response headers:', Object.fromEntries(res.headers.entries()))
    
    let resendResult;
    try {
      resendResult = await res.json()
      console.log('[TEST_EMAIL] Resend API response body:', resendResult)
    } catch (parseError) {
      console.error('[TEST_EMAIL] Failed to parse Resend response as JSON:', parseError)
      const textResponse = await res.text()
      console.log('[TEST_EMAIL] Raw response:', textResponse)
      
      return new Response(
        JSON.stringify({ 
          success: false,
          error: `Resend API returned invalid JSON (Status: ${res.status})`,
          details: textResponse,
          status: res.status,
          diagnostics
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!res.ok) {
      console.error('[TEST_EMAIL] Resend API error - Status:', res.status, 'Body:', resendResult)
      
      // Parse specific Resend error types
      let errorMessage = 'Unknown Resend API error';
      let errorDetails = resendResult.message || 'No additional details provided';
      
      if (res.status === 401) {
        errorMessage = 'Invalid or expired API key';
        errorDetails = 'Please check your RESEND_API_KEY in Supabase environment variables';
      } else if (res.status === 403) {
        errorMessage = 'Permission denied or domain not verified';
        errorDetails = 'Verify your sending domain in Resend dashboard or use onboarding@resend.dev';
      } else if (res.status === 422) {
        errorMessage = 'Invalid request data';
        errorDetails = resendResult.message || 'Check email format and content';
      } else if (res.status === 429) {
        errorMessage = 'Rate limit exceeded';
        errorDetails = 'Too many emails sent. Wait before retrying or upgrade your Resend plan';
      } else if (resendResult.message) {
        errorMessage = resendResult.message;
        errorDetails = resendResult.details || JSON.stringify(resendResult);
      }

      return new Response(
        JSON.stringify({ 
          success: false,
          error: errorMessage,
          details: errorDetails,
          status: res.status,
          resend_response: resendResult,
          diagnostics: {
            ...diagnostics,
            request_payload: emailPayload,
            response_headers: Object.fromEntries(res.headers.entries())
          }
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('[TEST_EMAIL] Test email sent successfully!')
    
    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'Test email sent successfully',
        email_id: resendResult.id,
        resend_response: resendResult,
        diagnostics,
        next_steps: [
          'Check the recipient email inbox (including spam folder)',
          'If email was received, the service is working correctly',
          'If not received, check domain verification in Resend dashboard',
          'Verify sender domain onboarding@resend.dev is allowed'
        ]
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('[TEST_EMAIL] Critical error in test-email function:', error)
    console.error('[TEST_EMAIL] Error stack:', error.stack)
    
    return new Response(
      JSON.stringify({ 
        success: false,
        error: 'Failed to send test email',
        details: error.message,
        diagnostics: {
          timestamp: new Date().toISOString(),
          error_type: error.name,
          error_message: error.message,
          error_stack: error.stack
        }
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
}) 