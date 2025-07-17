import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface VideoCategory {
  id?: string;
  value: string;
  label: string;
  description?: string;
  icon_name: string;
  emoji: string;
  color: string;
  sort_order: number;
  is_active: boolean;
  is_default: boolean;
}

// Check if user is admin
async function isUserAdmin(authHeader: string): Promise<boolean> {
  try {
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

    // Extract JWT token from header
    const token = authHeader.replace('Bearer ', '')
    
    // Verify the token and get user
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token)
    if (userError || !user) {
      console.log('Authentication failed:', userError)
      return false
    }

    // Check if user is admin
    const { data: adminData, error: adminError } = await supabaseAdmin
      .from('admin_users')
      .select('id')
      .eq('user_id', user.id)
      .single()

    return !adminError && !!adminData
  } catch (error) {
    console.error('Admin check error:', error)
    return false
  }
}

// Get all categories
async function handleGetCategories() {
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

  const { data, error } = await supabaseAdmin
    .from('video_categories')
    .select('*')
    .order('sort_order')

  if (error) {
    throw new Error(`Failed to fetch categories: ${error.message}`)
  }

  return { categories: data }
}

// Create new category
async function handleCreateCategory(category: Omit<VideoCategory, 'id'>) {
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

  // If this is set as default, clear other defaults first
  if (category.is_default) {
    await supabaseAdmin
      .from('video_categories')
      .update({ is_default: false })
      .eq('is_default', true)
  }

  const { data, error } = await supabaseAdmin
    .from('video_categories')
    .insert(category)
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to create category: ${error.message}`)
  }

  return { category: data }
}

// Update category
async function handleUpdateCategory(id: string, updates: Partial<VideoCategory>) {
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

  // If this is set as default, clear other defaults first
  if (updates.is_default) {
    await supabaseAdmin
      .from('video_categories')
      .update({ is_default: false })
      .eq('is_default', true)
      .neq('id', id)
  }

  const { data, error } = await supabaseAdmin
    .from('video_categories')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to update category: ${error.message}`)
  }

  return { category: data }
}

// Delete category
async function handleDeleteCategory(id: string) {
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

  // Check if category has videos
  const { data: videos, error: videosError } = await supabaseAdmin
    .from('videos')
    .select('id')
    .eq('category', id)
    .limit(1)

  if (videosError) {
    throw new Error(`Failed to check category usage: ${videosError.message}`)
  }

  if (videos && videos.length > 0) {
    throw new Error('Cannot delete category that contains videos. Please move videos to another category first.')
  }

  const { error } = await supabaseAdmin
    .from('video_categories')
    .delete()
    .eq('id', id)

  if (error) {
    throw new Error(`Failed to delete category: ${error.message}`)
  }

  return { success: true }
}

// Reorder categories
async function handleReorderCategories(categoryIds: string[]) {
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

  // Update sort orders
  const updates = categoryIds.map((id, index) => ({
    id,
    sort_order: index
  }))

  for (const update of updates) {
    const { error } = await supabaseAdmin
      .from('video_categories')
      .update({ sort_order: update.sort_order })
      .eq('id', update.id)

    if (error) {
      throw new Error(`Failed to reorder categories: ${error.message}`)
    }
  }

  return { success: true }
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const url = new URL(req.url)
    const method = req.method
    const pathname = url.pathname

    // GET requests are public (for fetching categories)
    if (method === 'GET') {
      const data = await handleGetCategories()
      return new Response(
        JSON.stringify(data),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // All other operations require admin access
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const isAdmin = await isUserAdmin(authHeader)
    if (!isAdmin) {
      return new Response(
        JSON.stringify({ error: 'Admin access required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    let result

    if (method === 'POST') {
      const body = await req.json()
      
      if (pathname.endsWith('/reorder')) {
        // Reorder categories
        result = await handleReorderCategories(body.categoryIds)
      } else {
        // Create new category
        result = await handleCreateCategory(body)
      }
    } else if (method === 'PUT') {
      // Update category
      const pathParts = pathname.split('/')
      const categoryId = pathParts[pathParts.length - 1]
      const body = await req.json()
      result = await handleUpdateCategory(categoryId, body)
    } else if (method === 'DELETE') {
      // Delete category
      const pathParts = pathname.split('/')
      const categoryId = pathParts[pathParts.length - 1]
      result = await handleDeleteCategory(categoryId)
    } else {
      return new Response(
        JSON.stringify({ error: 'Method not allowed' }),
        { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Categories API error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
}) 