import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface AwardXPRequest {
  userId: string;
  actionType: 'video_create' | 'video_share' | 'video_public' | 'video_like' | 'referral' | 'video_watch_complete';
  referenceId?: string;
  ipAddress?: string;
}

// Level calculation formula: Level N requires (N^2 * 10) additional XP from previous level
function calculateLevelFromXP(totalXP: number): number {
  if (totalXP < 50) return 1;
  
  let level = 1;
  let requiredXP = 0;
  
  while (requiredXP <= totalXP) {
    level++;
    requiredXP += (level * level * 10);
  }
  
  return level - 1;
}

function getXPForNextLevel(currentLevel: number): number {
  return ((currentLevel + 1) * (currentLevel + 1) * 10);
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { userId, actionType, referenceId, ipAddress }: AwardXPRequest = await req.json();

    if (!userId || !actionType) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    console.log(`🎯 Awarding XP for user ${userId}, action: ${actionType}, reference: ${referenceId}`);

    // Get XP configuration for this action
    const { data: xpConfig, error: configError } = await supabaseAdmin
      .from('xp_config')
      .select('*')
      .eq('action_type', actionType)
      .eq('is_active', true)
      .single();

    if (configError || !xpConfig) {
      console.log(`❌ No XP config found for action: ${actionType}`);
      return new Response(
        JSON.stringify({ error: "Invalid action type or inactive config" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Check daily cap if it exists
    if (xpConfig.daily_cap > 0) {
      const { data: dailyCap } = await supabaseAdmin
        .from('daily_xp_caps')
        .select('current_count')
        .eq('user_id', userId)
        .eq('action_type', actionType)
        .eq('cap_date', new Date().toISOString().split('T')[0])
        .single();

      if (dailyCap && dailyCap.current_count >= xpConfig.daily_cap) {
        console.log(`🚫 Daily cap reached for ${actionType}: ${dailyCap.current_count}/${xpConfig.daily_cap}`);
        return new Response(
          JSON.stringify({ 
            error: "Daily cap reached",
            currentCount: dailyCap.current_count,
            dailyCap: xpConfig.daily_cap
          }),
          { status: 429, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }
    }

    // Check for duplicate XP transaction (anti-abuse)
    if (referenceId && actionType !== 'video_like') { // likes can be from different users
      const { data: existingTransaction } = await supabaseAdmin
        .from('xp_transactions')
        .select('id')
        .eq('user_id', userId)
        .eq('action_type', actionType)
        .eq('reference_id', referenceId)
        .eq('transaction_date', new Date().toISOString().split('T')[0])
        .single();

      if (existingTransaction) {
        console.log(`🔄 Duplicate XP transaction prevented for ${actionType}:${referenceId}`);
        return new Response(
          JSON.stringify({ error: "XP already awarded for this action today" }),
          { status: 409, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }
    }

    // Start transaction to award XP
    const { data: currentGamification, error: gamificationError } = await supabaseAdmin
      .from('user_gamification')
      .select('*')
      .eq('user_id', userId)
      .single();

    let totalXP = xpConfig.xp_amount;
    let currentLevel = 1;
    let wasLevelUp = false;
    let newBadge = null;

    if (gamificationError && gamificationError.code === 'PGRST116') {
      // User doesn't have gamification record yet, create one
      const newLevel = calculateLevelFromXP(totalXP);
      
      const { error: insertError } = await supabaseAdmin
        .from('user_gamification')
        .insert({
          user_id: userId,
          total_xp: totalXP,
          current_level: newLevel
        });

      if (insertError) throw insertError;
      
      currentLevel = newLevel;
      console.log(`🆕 Created new gamification record for user ${userId}: Level ${newLevel}, ${totalXP} XP`);
    } else if (!gamificationError && currentGamification) {
      // Update existing record
      const previousLevel = currentGamification.current_level;
      totalXP = currentGamification.total_xp + xpConfig.xp_amount;
      currentLevel = calculateLevelFromXP(totalXP);
      wasLevelUp = currentLevel > previousLevel;

      const { error: updateError } = await supabaseAdmin
        .from('user_gamification')
        .update({
          total_xp: totalXP,
          current_level: currentLevel
        })
        .eq('user_id', userId);

      if (updateError) throw updateError;

      console.log(`📈 Updated gamification: ${previousLevel} → ${currentLevel}, ${currentGamification.total_xp} → ${totalXP} XP`);
    } else {
      throw gamificationError;
    }

    // Get badge info for current level
    const { data: badge } = await supabaseAdmin
      .from('badge_definitions')
      .select('*')
      .eq('level_required', currentLevel)
      .single();

    if (badge && wasLevelUp) {
      newBadge = badge;
    }

    // Record XP transaction
    const { error: transactionError } = await supabaseAdmin
      .from('xp_transactions')
      .insert({
        user_id: userId,
        action_type: actionType,
        xp_amount: xpConfig.xp_amount,
        reference_id: referenceId || null,
        transaction_date: new Date().toISOString().split('T')[0]
      });

    if (transactionError) {
      console.error('❌ Failed to record XP transaction:', transactionError);
      // Don't fail the whole operation for transaction logging
    }

    // Update daily cap counter
    if (xpConfig.daily_cap > 0) {
      const { error: capError } = await supabaseAdmin
        .from('daily_xp_caps')
        .upsert({
          user_id: userId,
          action_type: actionType,
          cap_date: new Date().toISOString().split('T')[0],
          current_count: 1
        }, {
          onConflict: 'user_id,action_type,cap_date',
          ignoreDuplicates: false
        });

      if (capError) {
        console.error('❌ Failed to update daily cap:', capError);
      }
    }

    const response = {
      success: true,
      xpAwarded: xpConfig.xp_amount,
      totalXP,
      currentLevel,
      wasLevelUp,
      newBadge,
      xpToNextLevel: currentLevel < 5 ? getXPForNextLevel(currentLevel) : null,
      actionDescription: xpConfig.description
    };

    console.log(`✅ XP awarded successfully:`, response);

    return new Response(
      JSON.stringify(response),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );

  } catch (error: any) {
    console.error("❌ Error in award-xp function:", error);
    return new Response(
      JSON.stringify({ 
        error: error.message || "Internal server error",
        details: error.details || null
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);