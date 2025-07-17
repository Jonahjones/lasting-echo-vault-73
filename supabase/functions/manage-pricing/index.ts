import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

interface PricingPlan {
  id?: string
  plan_id: string
  name: string
  price: number
  is_one_time: boolean
  storage_gb: number | null
  max_videos: number
  features: string[]
  is_popular: boolean
  is_active: boolean
  display_order: number
  icon_name: string
  description?: string
  promotional_price?: number
  promo_valid_until?: string
}

interface SystemLimits {
  id?: string
  tier: 'free' | 'premium'
  max_videos: number
  max_storage_gb: number
}

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
)

async function isUserAdmin(authHeader: string): Promise<boolean> {
  try {
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error } = await supabase.auth.getUser(token)
    
    if (error || !user) {
      return false
    }

    const { data: adminUser } = await supabase
      .from('admin_users')
      .select('role')
      .eq('user_id', user.id)
      .single()
    
    return !!adminUser
  } catch {
    return false
  }
}

async function handleGetPricing() {
  // Get all active pricing plans
  const { data: plans, error: plansError } = await supabase
    .from('pricing_plans')
    .select('*')
    .eq('is_active', true)
    .order('display_order')

  if (plansError) {
    throw new Error(`Failed to fetch pricing plans: ${plansError.message}`)
  }

  // Get system limits
  const { data: limits, error: limitsError } = await supabase
    .from('system_limits')
    .select('*')

  if (limitsError) {
    throw new Error(`Failed to fetch system limits: ${limitsError.message}`)
  }

  return {
    plans: plans || [],
    limits: limits || []
  }
}

async function handleUpdatePricingPlan(plan: PricingPlan) {
  const { data, error } = await supabase
    .from('pricing_plans')
    .upsert({
      ...plan,
      updated_at: new Date().toISOString()
    }, {
      onConflict: 'plan_id'
    })
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to update pricing plan: ${error.message}`)
  }

  return data
}

async function handleUpdateSystemLimits(limits: SystemLimits) {
  const { data, error } = await supabase
    .from('system_limits')
    .upsert({
      ...limits,
      updated_at: new Date().toISOString()
    }, {
      onConflict: 'tier'
    })
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to update system limits: ${error.message}`)
  }

  return data
}

async function handleDeletePricingPlan(planId: string) {
  const { error } = await supabase
    .from('pricing_plans')
    .update({ is_active: false })
    .eq('plan_id', planId)

  if (error) {
    throw new Error(`Failed to deactivate pricing plan: ${error.message}`)
  }

  return { success: true }
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // GET requests are public (for fetching pricing)
    if (req.method === 'GET') {
      const data = await handleGetPricing()
      return new Response(
        JSON.stringify(data),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Other operations require admin access
    const isAdmin = await isUserAdmin(authHeader)
    if (!isAdmin) {
      return new Response(
        JSON.stringify({ error: 'Admin access required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { action, ...payload } = await req.json()

    let result
    switch (action) {
      case 'update_plan':
        result = await handleUpdatePricingPlan(payload.plan)
        break
      case 'update_limits':
        result = await handleUpdateSystemLimits(payload.limits)
        break
      case 'delete_plan':
        result = await handleDeletePricingPlan(payload.plan_id)
        break
      default:
        throw new Error(`Unknown action: ${action}`)
    }

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Manage pricing error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
}) 