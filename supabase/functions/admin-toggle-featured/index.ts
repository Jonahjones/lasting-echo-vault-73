import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

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
    const { videoId, is_featured, admin_password } = await req.json()

    // Verify admin password
    if (admin_password !== 'Admin3272!') {
      return new Response(
        JSON.stringify({ error: 'Invalid admin password' }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Create Supabase client with service role key (bypasses RLS)
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    // Update video with admin privileges (bypasses RLS)
    const { data, error } = await supabaseAdmin
      .from('videos')
      .update({ 
        is_featured,
        is_public: true  // Ensure public when featuring
      })
      .eq('id', videoId)
      .select()

    if (error) {
      console.error('Admin toggle error:', error)
      return new Response(
        JSON.stringify({ error: error.message }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    if (!data || data.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Video not found' }),
        { 
          status: 404, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Log admin action
    await supabaseAdmin
      .from('admin_access_logs')
      .insert({
        action: is_featured ? 'FEATURE_VIDEO' : 'UNFEATURE_VIDEO',
        details: { videoId, title: data[0].title, success: true },
        ip_address: req.headers.get('x-forwarded-for') || 'unknown'
      })

    return new Response(
      JSON.stringify({ success: true, video: data[0] }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )

  } catch (error) {
    console.error('Admin function error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})