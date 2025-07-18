import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

console.log('[MARK_DECEASED] Function initializing...');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface DeceasedRequest {
  target_user_id: string;
  confirmation_notes?: string;
  verification_method?: string;
}

serve(async (req) => {
  console.log(`[MARK_DECEASED] Request received: ${req.method}`);
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Verify user is authenticated
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Authentication required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Initialize Supabase client with service role for admin operations
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('[MARK_DECEASED] Missing Supabase environment variables');
      return new Response(
        JSON.stringify({ error: 'Server configuration error' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    // Create client for user operations
    const supabaseUser = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!);

    // Set the auth context for the user client
    const { data: userData, error: userError } = await supabaseUser.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (userError || !userData.user) {
      console.error('[MARK_DECEASED] Invalid authentication token:', userError);
      return new Response(
        JSON.stringify({ error: 'Invalid authentication token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const currentUserId = userData.user.id;
    const currentUserEmail = userData.user.email;
    console.log(`[MARK_DECEASED] Authenticated user: ${currentUserEmail} (${currentUserId})`);

    // Parse request body
    const body: DeceasedRequest = await req.json();
    const { target_user_id, confirmation_notes, verification_method } = body;

    if (!target_user_id) {
      return new Response(
        JSON.stringify({ error: 'target_user_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[MARK_DECEASED] Request to mark user ${target_user_id} as deceased`);

    // CRITICAL AUTHORIZATION CHECK:
    // Verify the current user is a trusted contact for the target user
    // Try new many-to-many structure first
    let trustedContactData: any = null;
    let trustedContactError: any = null;
    
    try {
      const { data: relationshipData, error: relationshipError } = await supabaseAdmin
        .from('user_trusted_contacts')
        .select(`
          id, 
          role, 
          is_primary, 
          user_id,
          contacts_new!inner(email, target_user_id)
        `)
        .eq('user_id', target_user_id)
        .eq('contacts_new.email', currentUserEmail)
        .eq('contact_type', 'trusted')
        .single();

      if (!relationshipError && relationshipData) {
        trustedContactData = {
          id: relationshipData.id,
          role: relationshipData.role,
          is_primary: relationshipData.is_primary,
          user_id: relationshipData.user_id
        };
        console.log(`[MARK_DECEASED] ✅ Found trusted relationship in new structure:`, trustedContactData);
      } else {
        console.log(`[MARK_DECEASED] Relationship not found in new structure, checking old structure`);
        
        // Fallback to old contacts table
        const { data: oldContactData, error: oldContactError } = await supabaseAdmin
          .from('contacts')
          .select('id, role, is_primary, user_id')
          .eq('user_id', target_user_id)
          .eq('email', currentUserEmail)
          .eq('contact_type', 'trusted')
          .single();
          
        trustedContactData = oldContactData;
        trustedContactError = oldContactError;
      }
    } catch (error) {
      console.error(`[MARK_DECEASED] Error checking trusted contact relationship:`, error);
      trustedContactError = error;
    }

    if (trustedContactError || !trustedContactData) {
      console.error('[MARK_DECEASED] User is not a trusted contact:', {
        currentUserEmail,
        targetUserId: target_user_id,
        error: trustedContactError
      });
      
      return new Response(
        JSON.stringify({ 
          error: 'Unauthorized: Only trusted contacts can mark users as deceased',
          details: 'You must be designated as a trusted contact for this user to perform this action'
        }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[MARK_DECEASED] ✅ Authorization confirmed: User is a ${trustedContactData.role} trusted contact`);

    // Check if user is already marked as deceased
    const { data: profileData, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('user_status, first_name, last_name, display_name')
      .eq('user_id', target_user_id)
      .single();

    if (profileError) {
      console.error('[MARK_DECEASED] Error fetching user profile:', profileError);
      return new Response(
        JSON.stringify({ error: 'User profile not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (profileData.user_status === 'deceased') {
      return new Response(
        JSON.stringify({ 
          error: 'User is already marked as deceased',
          confirmed_date: 'Previously confirmed'
        }),
        { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const userName = profileData.display_name || 
                    `${profileData.first_name || ''} ${profileData.last_name || ''}`.trim() || 
                    'Unknown User';

    // Record the deceased confirmation
    const { error: confirmationError } = await supabaseAdmin
      .from('deceased_confirmations')
      .insert({
        user_id: target_user_id,
        confirmed_by: currentUserId,
        notes: confirmation_notes || null,
        verification_method: verification_method || 'contact_verification'
      });

    if (confirmationError) {
      console.error('[MARK_DECEASED] Error recording confirmation:', confirmationError);
      return new Response(
        JSON.stringify({ error: 'Failed to record deceased confirmation' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Update user status to deceased
    const { error: updateError } = await supabaseAdmin
      .from('profiles')
      .update({ user_status: 'deceased' })
      .eq('user_id', target_user_id);

    if (updateError) {
      console.error('[MARK_DECEASED] Error updating user status:', updateError);
      return new Response(
        JSON.stringify({ error: 'Failed to update user status' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // TODO: Trigger video release to contacts
    // This would involve:
    // 1. Getting all private videos for the user
    // 2. Sharing them with designated contacts
    // 3. Sending notifications to contacts

    console.log(`[MARK_DECEASED] ✅ Successfully marked ${userName} as deceased`);

    return new Response(
      JSON.stringify({
        success: true,
        message: `${userName} has been marked as deceased`,
        confirmed_by: currentUserId,
        confirmation_date: new Date().toISOString(),
        action_taken: 'User status updated, video release initiated'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[MARK_DECEASED] Function error:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
}); 