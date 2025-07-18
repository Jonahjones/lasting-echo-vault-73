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
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    // Get current cycling prompt (changes every 5 minutes)
    const { data: currentPrompt, error: promptError } = await supabase
      .rpc('get_current_cycling_prompt')
      .single();

    if (promptError) {
      console.error('Error getting current cycling prompt:', promptError);
      throw promptError;
    }

    if (!currentPrompt) {
      throw new Error('No cycling prompt found');
    }

    // Calculate the current 5-minute interval to avoid duplicate notifications
    const currentInterval = Math.floor(Date.now() / 1000 / 300); // 5-minute intervals
    const notificationId = `cycling_prompt_${currentInterval}`;

    // Check if we've already sent notifications for this interval
    const { data: existingNotification } = await supabase
      .from('notifications')
      .select('id')
      .eq('data->notification_id', notificationId)
      .maybeSingle();

    if (existingNotification) {
      return new Response(
        JSON.stringify({ 
          message: 'Notifications already sent for this interval', 
          interval: currentInterval,
          prompt: currentPrompt.prompt_text
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get all active users (users who have completed onboarding)
    const { data: activeUsers, error: usersError } = await supabase
      .from('profiles')
      .select('user_id')
      .eq('onboarding_completed', true);

    if (usersError) {
      console.error('Error fetching active users:', usersError);
      throw usersError;
    }

    // Create notifications for all active users
    const notifications = activeUsers?.map(profile => ({
      user_id: profile.user_id,
      type: 'daily_prompt',
      title: 'Fresh Memory Prompt Available!',
      message: `New inspiring prompt: "${currentPrompt.prompt_text}" - Record your thoughts and earn XP!`,
      data: {
        prompt_text: currentPrompt.prompt_text,
        prompt_id: currentPrompt.id,
        action: 'cycling_prompt',
        notification_id: notificationId,
        interval_number: currentPrompt.interval_number,
        next_change_at: currentPrompt.next_change_at
      }
    })) || [];

    if (notifications.length > 0) {
      const { error: notificationError } = await supabase
        .from('notifications')
        .insert(notifications);

      if (notificationError) {
        console.error('Error creating notifications:', notificationError);
        throw notificationError;
      }
    }

    return new Response(
      JSON.stringify({
        message: 'Cycling prompt notifications sent successfully',
        prompt: currentPrompt.prompt_text,
        interval: currentInterval,
        next_change_at: currentPrompt.next_change_at,
        notificationsSent: notifications.length
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in generate-daily-prompts function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});