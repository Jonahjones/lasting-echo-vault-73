import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { Resend } from "npm:resend@2.0.0"

const resend = new Resend(Deno.env.get("RESEND_API_KEY"))

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { contact_email, contact_name, inviter_name, contact_type, is_existing_user } = await req.json()

    // Validate required fields
    if (!contact_email || !contact_name || !inviter_name || !contact_type) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Initialize Supabase client for admin operations
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Prepare email content based on contact type
    let subject: string
    let htmlContent: string

    if (contact_type === 'trusted') {
      subject = `You've been invited as a Trusted Contact on One Final Moment`
      htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 20px; background-color: #f9fafb; }
            .container { max-width: 600px; margin: 0 auto; background-color: white; padding: 40px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
            .header { text-align: center; margin-bottom: 40px; }
            .logo { font-size: 24px; font-weight: bold; color: #f59e0b; margin-bottom: 10px; }
            .title { font-size: 28px; font-weight: bold; color: #111827; margin-bottom: 10px; }
            .subtitle { font-size: 16px; color: #6b7280; }
            .content { line-height: 1.6; color: #374151; margin-bottom: 30px; }
            .highlight { background-color: #fef3c7; padding: 15px; border-radius: 6px; border-left: 4px solid #f59e0b; margin: 20px 0; }
            .button { display: inline-block; background-color: #f59e0b; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600; margin: 20px 0; }
            .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e7eb; text-align: center; color: #6b7280; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <div class="logo">🕊️ One Final Moment</div>
              <div class="title">You're a Trusted Contact</div>
              <div class="subtitle">An important role in preserving memories</div>
            </div>
            
            <div class="content">
              <p>Hi <strong>${contact_name}</strong>,</p>
              
              <p><strong>${inviter_name}</strong> has invited you to join One Final Moment as a <strong>Trusted Contact</strong>.</p>
              
              <div class="highlight">
                <strong>Your Important Role:</strong><br>
                As a Trusted Contact, you have special responsibilities including:
                <ul>
                  <li>Helping confirm their passing when the time comes</li>
                  <li>Managing the release of private memories to selected family and friends</li>
                  <li>Ensuring their final messages reach the right people</li>
                </ul>
              </div>
              
              <p>This platform allows people to record meaningful video messages that can be shared with loved ones, either immediately or at predetermined times. Your role ensures their wishes are respected and their memories are preserved.</p>
              
              <a href="${supabaseUrl.replace('/rest/v1', '')}" class="button">Join & Learn More</a>
              
              <p>Thank you for accepting this meaningful responsibility.</p>
            </div>
            
            <div class="footer">
              <p>With gratitude,<br>The One Final Moment Team</p>
              <p>This email was sent because ${inviter_name} added you as a trusted contact. If you believe this was sent in error, please contact us.</p>
            </div>
          </div>
        </body>
        </html>
      `
    } else {
      subject = `${inviter_name} invited you to One Final Moment`
      htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 20px; background-color: #f9fafb; }
            .container { max-width: 600px; margin: 0 auto; background-color: white; padding: 40px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
            .header { text-align: center; margin-bottom: 40px; }
            .logo { font-size: 24px; font-weight: bold; color: #3b82f6; margin-bottom: 10px; }
            .title { font-size: 28px; font-weight: bold; color: #111827; margin-bottom: 10px; }
            .subtitle { font-size: 16px; color: #6b7280; }
            .content { line-height: 1.6; color: #374151; margin-bottom: 30px; }
            .highlight { background-color: #dbeafe; padding: 15px; border-radius: 6px; border-left: 4px solid #3b82f6; margin: 20px 0; }
            .button { display: inline-block; background-color: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600; margin: 20px 0; }
            .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e7eb; text-align: center; color: #6b7280; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <div class="logo">🕊️ One Final Moment</div>
              <div class="title">You're Invited!</div>
              <div class="subtitle">Join ${inviter_name} on One Final Moment</div>
            </div>
            
            <div class="content">
              <p>Hi <strong>${contact_name}</strong>,</p>
              
              <p><strong>${inviter_name}</strong> has invited you to join One Final Moment, a platform for preserving and sharing meaningful memories through video messages.</p>
              
              <div class="highlight">
                <strong>What is One Final Moment?</strong><br>
                A place where people record heartfelt video messages to share with family and friends, capturing precious memories, wisdom, and love that can be treasured forever.
              </div>
              
              <p>By joining, you'll be able to receive memories that ${inviter_name} chooses to share with you, and you can also create your own meaningful video messages for your loved ones.</p>
              
              <a href="${supabaseUrl.replace('/rest/v1', '')}" class="button">Join One Final Moment</a>
              
              <p>We're honored to help preserve these precious moments.</p>
            </div>
            
            <div class="footer">
              <p>With gratitude,<br>The One Final Moment Team</p>
              <p>This email was sent because ${inviter_name} added you to their contacts. If you believe this was sent in error, please contact us.</p>
            </div>
          </div>
        </body>
        </html>
      `
    }

    // Send email using Resend
    try {
      const emailResponse = await resend.emails.send({
        from: 'One Final Moment <noreply@onefinalmoment.com>',
        to: [contact_email],
        subject: subject,
        html: htmlContent,
      })

      console.log('Email sent successfully:', emailResponse)
      
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Welcome email sent successfully',
          contact_type,
          is_existing_user,
          email_id: emailResponse.data?.id
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    } catch (emailError) {
      console.error('Error sending email:', emailError)
      return new Response(
        JSON.stringify({ 
          error: 'Failed to send email',
          details: emailError.message 
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

  } catch (error) {
    console.error('Error sending welcome email:', error)
    return new Response(
      JSON.stringify({ error: 'Failed to send welcome email' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
}) 