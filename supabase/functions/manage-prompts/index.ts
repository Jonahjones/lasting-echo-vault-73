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
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    
    // Get authorization header
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Authorization header required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Create client with user's JWT for auth checks
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      global: {
        headers: { Authorization: authHeader }
      }
    })

    // Verify user is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid or expired token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Handle GET requests - public access for active prompts
    if (req.method === 'GET') {
      const url = new URL(req.url)
      const context = url.searchParams.get('context') // 'general', 'daily', 'alternative', 'followup'
      const category = url.searchParams.get('category')
      const limit = parseInt(url.searchParams.get('limit') || '50')
      const includeInactive = url.searchParams.get('include_inactive') === 'true'

      let query = supabase
        .from('video_prompts' as any)
        .select('*')

      // Apply filters
      if (!includeInactive) {
        query = query.eq('is_active', true)
      }
      
      if (context) {
        query = query.eq('usage_context', context)
      }
      
      if (category) {
        query = query.eq('category', category)
      }

      // Order by priority (desc) then created_at (desc)
      query = query
        .order('priority', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(limit)

      const { data: prompts, error: fetchError } = await query

      if (fetchError) throw fetchError

      return new Response(
        JSON.stringify({ prompts: prompts || [] }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // For write operations, verify admin status
    const { data: profile } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('user_id', user.id)
      .single()

    if (!profile?.is_admin) {
      return new Response(
        JSON.stringify({ error: 'Admin access required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Create service client for admin operations
    const adminClient = createClient(supabaseUrl, supabaseServiceKey)

    // Handle POST requests - create new prompt
    if (req.method === 'POST') {
      const { prompt_text, category, usage_context, tags, priority, is_featured, min_user_level } = await req.json()

      if (!prompt_text || !category || !usage_context) {
        return new Response(
          JSON.stringify({ error: 'prompt_text, category, and usage_context are required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      const { data: newPrompt, error: createError } = await adminClient
        .from('video_prompts' as any)
        .insert({
          prompt_text,
          category,
          usage_context,
          tags: tags || [],
          priority: priority || 0,
          is_featured: is_featured || false,
          min_user_level: min_user_level || 1,
          created_by: user.id
        })
        .select()
        .single()

      if (createError) throw createError

      return new Response(
        JSON.stringify({ prompt: newPrompt, message: 'Prompt created successfully' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Handle PUT requests - update existing prompt
    if (req.method === 'PUT') {
      const url = new URL(req.url)
      const promptId = url.searchParams.get('id')
      
      if (!promptId) {
        return new Response(
          JSON.stringify({ error: 'Prompt ID is required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      const updateData = await req.json()
      
      // Remove id and timestamps from update data
      delete updateData.id
      delete updateData.created_at
      delete updateData.updated_at

      const { data: updatedPrompt, error: updateError } = await adminClient
        .from('video_prompts' as any)
        .update(updateData)
        .eq('id', promptId)
        .select()
        .single()

      if (updateError) throw updateError

      return new Response(
        JSON.stringify({ prompt: updatedPrompt, message: 'Prompt updated successfully' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Handle DELETE requests - delete prompt
    if (req.method === 'DELETE') {
      const url = new URL(req.url)
      const promptId = url.searchParams.get('id')
      
      if (!promptId) {
        return new Response(
          JSON.stringify({ error: 'Prompt ID is required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      const { error: deleteError } = await adminClient
        .from('video_prompts' as any)
        .delete()
        .eq('id', promptId)

      if (deleteError) throw deleteError

      return new Response(
        JSON.stringify({ message: 'Prompt deleted successfully' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Handle PATCH requests - bulk operations
    if (req.method === 'PATCH') {
      const { action, prompt_ids, update_data } = await req.json()

      if (action === 'bulk_activate') {
        const { error: bulkError } = await adminClient
          .from('video_prompts' as any)
          .update({ is_active: true })
          .in('id', prompt_ids)

        if (bulkError) throw bulkError

        return new Response(
          JSON.stringify({ message: `Activated ${prompt_ids.length} prompts` }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      if (action === 'bulk_deactivate') {
        const { error: bulkError } = await adminClient
          .from('video_prompts' as any)
          .update({ is_active: false })
          .in('id', prompt_ids)

        if (bulkError) throw bulkError

        return new Response(
          JSON.stringify({ message: `Deactivated ${prompt_ids.length} prompts` }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      if (action === 'bulk_update') {
        const { error: bulkError } = await adminClient
          .from('video_prompts' as any)
          .update(update_data)
          .in('id', prompt_ids)

        if (bulkError) throw bulkError

        return new Response(
          JSON.stringify({ message: `Updated ${prompt_ids.length} prompts` }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      return new Response(
        JSON.stringify({ error: 'Invalid bulk action' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error in manage-prompts function:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
}) 