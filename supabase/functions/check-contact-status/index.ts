import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

console.log('[CONTACT_CHECK] Function initializing...');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface ContactCheckRequest {
  email: string;
  user_id?: string; // Optional - if checking for specific user
}

interface ContactCheckResponse {
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

serve(async (req) => {
  console.log(`[CONTACT_CHECK] Request received: ${req.method}`);
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Get authorization header for authenticated requests
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Authentication required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { email, user_id }: ContactCheckRequest = await req.json();
    console.log(`[CONTACT_CHECK] Checking email: ${email}, for user: ${user_id || 'auto-detect'}`);

    // Validate email
    if (!email || typeof email !== 'string') {
      return new Response(
        JSON.stringify({ error: 'Valid email required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      return new Response(
        JSON.stringify({ error: 'Invalid email format' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Initialize Supabase clients
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');

    if (!supabaseUrl || !supabaseServiceKey || !supabaseAnonKey) {
      console.error('[CONTACT_CHECK] Missing Supabase environment variables');
      return new Response(
        JSON.stringify({ error: 'Server configuration error' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create user client for authentication
    const supabaseUser = createClient(supabaseUrl, supabaseAnonKey);
    
    // Verify user authentication
    const { data: userData, error: userError } = await supabaseUser.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (userError || !userData.user) {
      console.error('[CONTACT_CHECK] Invalid authentication token:', userError);
      return new Response(
        JSON.stringify({ error: 'Invalid authentication token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const currentUserId = user_id || userData.user.id;
    const normalizedEmail = email.trim().toLowerCase();

    // Create admin client for database operations
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    console.log(`[CONTACT_CHECK] Calling check_contact_relationships function for email: ${normalizedEmail}`);

    // Try the new database function for many-to-many relationships first
    let globalCheckResult: any = null;
    let globalCheckError: any = null;
    
    try {
      const result = await supabaseAdmin.rpc(
        'check_contact_relationships',
        { p_email: normalizedEmail }
      );
      globalCheckResult = result.data;
      globalCheckError = result.error;
    } catch (rpcError: any) {
      console.error('[CONTACT_CHECK] RPC call failed:', rpcError);
      globalCheckError = rpcError;
    }

    if (globalCheckError) {
      console.error('[CONTACT_CHECK] Error checking global contact relationships:', globalCheckError);
      
      // Try fallback to old system
      console.log('[CONTACT_CHECK] Attempting fallback to old contact checking method');
      try {
        const { data: fallbackResult, error: fallbackError } = await supabaseAdmin.rpc(
          'check_existing_contact',
          { p_user_id: currentUserId, p_email: normalizedEmail }
        );
        
        if (fallbackError) {
          console.error('[CONTACT_CHECK] Fallback method also failed:', fallbackError);
          return new Response(
            JSON.stringify({ 
              success: false,
              error: 'Database function not available',
              message: 'Contact checking service is temporarily unavailable. Please try again later.',
              details: `RPC Error: ${globalCheckError.message}, Fallback Error: ${fallbackError.message}`
            }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        
        // Convert old format to new format
        globalCheckResult = {
          contact_exists: fallbackResult.contact_exists,
          contact_id: fallbackResult.contact_id,
          contact_name: fallbackResult.contact_name,
          relationships_count: fallbackResult.contact_exists ? 1 : 0,
          user_exists: fallbackResult.user_exists,
          existing_user_id: fallbackResult.existing_user_id,
          can_add_contact: fallbackResult.can_add_contact
        };
        
        console.log('[CONTACT_CHECK] Fallback successful:', globalCheckResult);
      } catch (fallbackError: any) {
        console.error('[CONTACT_CHECK] Complete failure:', fallbackError);
        return new Response(
          JSON.stringify({ 
            success: false,
            error: 'Service unavailable',
            message: 'Contact checking service is currently unavailable. Please try again in a few minutes.',
            details: `Primary: ${globalCheckError.message}, Fallback: ${fallbackError.message}`
          }),
          { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Check if current user already has this contact
    const { data: userRelationship, error: relationshipError } = await supabaseAdmin
      .from('user_trusted_contacts')
      .select(`
        id,
        contact_type,
        role,
        invitation_status,
        contacts_new!inner(id, full_name, email)
      `)
      .eq('user_id', currentUserId)
      .eq('contacts_new.email', normalizedEmail)
      .single();

    console.log(`[CONTACT_CHECK] Global check result:`, globalCheckResult);
    console.log(`[CONTACT_CHECK] User relationship:`, userRelationship);

    const userHasContact = !relationshipError && userRelationship;
    
    const response: ContactCheckResponse = {
      success: true,
      contact_exists: userHasContact ? true : false,
      contact_id: userHasContact ? userRelationship.contacts_new.id : globalCheckResult.contact_id,
      contact_name: userHasContact ? userRelationship.contacts_new.full_name : globalCheckResult.contact_name,
      contact_type: userHasContact ? userRelationship.contact_type as 'trusted' | 'regular' : undefined,
      invitation_status: userHasContact ? userRelationship.invitation_status : undefined,
      user_exists: globalCheckResult.user_exists || false,
      existing_user_id: globalCheckResult.existing_user_id || undefined,
      can_add_contact: !userHasContact // Can add if user doesn't already have this contact
    };

    // Add helpful messages based on the results
    if (userHasContact) {
      response.message = `You already have ${response.contact_name} as a ${response.contact_type} contact`;
    } else if (globalCheckResult.relationships_count > 0) {
      response.message = `Contact is trusted by ${globalCheckResult.relationships_count} other user(s) - can be added to your contacts`;
    } else if (response.user_exists) {
      response.message = `User exists in platform but not yet a trusted contact - can be added`;
    } else {
      response.message = `Email not found in platform - will send invitation`;
    }

    return new Response(
      JSON.stringify(response),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('[CONTACT_CHECK] Function error:', {
      message: error.message,
      stack: error.stack,
      cause: error.cause
    });
    
    // Return more specific error information for debugging
    return new Response(
      JSON.stringify({ 
        success: false,
        error: 'Internal server error',
        message: error.message || 'Unknown error occurred',
        details: error.stack ? error.stack.split('\n').slice(0, 3).join('\n') : 'No stack trace available'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
}); 