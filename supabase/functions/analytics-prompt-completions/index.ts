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

    const url = new URL(req.url);
    const days = parseInt(url.searchParams.get('days') || '30');
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Get prompt completion analytics
    const { data: videos, error: videosError } = await supabase
      .from('videos')
      .select('prompt, created_at')
      .gte('created_at', startDate.toISOString())
      .not('prompt', 'is', null);

    if (videosError) {
      throw videosError;
    }

    // Get daily prompts for the period
    const { data: dailyPrompts, error: promptsError } = await supabase
      .from('daily_prompts')
      .select('*')
      .gte('date', startDate.toISOString().split('T')[0]);

    if (promptsError) {
      throw promptsError;
    }

    // Get notification engagement
    const { data: notifications, error: notificationsError } = await supabase
      .from('notifications')
      .select('type, created_at, is_read, data')
      .eq('type', 'daily_prompt')
      .gte('created_at', startDate.toISOString());

    if (notificationsError) {
      throw notificationsError;
    }

    // Analyze prompt completions
    const promptCompletions = {};
    videos?.forEach(video => {
      const prompt = video.prompt;
      if (prompt) {
        promptCompletions[prompt] = (promptCompletions[prompt] || 0) + 1;
      }
    });

    // Calculate notification engagement rates
    const totalNotifications = notifications?.length || 0;
    const readNotifications = notifications?.filter(n => n.is_read).length || 0;
    const engagementRate = totalNotifications > 0 ? (readNotifications / totalNotifications) * 100 : 0;

    // Get top performing prompts
    const topPrompts = Object.entries(promptCompletions)
      .sort(([,a], [,b]) => (b as number) - (a as number))
      .slice(0, 10)
      .map(([prompt, count]) => ({ prompt, completions: count }));

    // Daily prompt performance
    const dailyPromptPerformance = dailyPrompts?.map(dp => {
      const completions = videos?.filter(v => 
        v.prompt === dp.prompt_text && 
        v.created_at >= dp.date
      ).length || 0;
      
      return {
        date: dp.date,
        prompt: dp.prompt_text,
        completions
      };
    }) || [];

    // Weekly engagement trends
    const weeklyEngagement = [];
    for (let i = 0; i < Math.ceil(days / 7); i++) {
      const weekStart = new Date(startDate);
      weekStart.setDate(startDate.getDate() + (i * 7));
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 6);

      const weekVideos = videos?.filter(v => {
        const videoDate = new Date(v.created_at);
        return videoDate >= weekStart && videoDate <= weekEnd;
      }).length || 0;

      weeklyEngagement.push({
        week: `${weekStart.toISOString().split('T')[0]} to ${weekEnd.toISOString().split('T')[0]}`,
        completions: weekVideos
      });
    }

    const analytics = {
      period: {
        days,
        startDate: startDate.toISOString().split('T')[0],
        endDate: new Date().toISOString().split('T')[0]
      },
      summary: {
        totalPrompts: Object.keys(promptCompletions).length,
        totalCompletions: Object.values(promptCompletions).reduce((a, b) => (a as number) + (b as number), 0),
        totalNotifications: totalNotifications,
        engagementRate: Math.round(engagementRate * 100) / 100,
        averageCompletionsPerDay: videos?.length ? Math.round((videos.length / days) * 100) / 100 : 0
      },
      topPerformingPrompts: topPrompts,
      dailyPromptPerformance,
      weeklyEngagement,
      recentActivity: videos?.slice(-10).map(v => ({
        date: v.created_at.split('T')[0],
        prompt: v.prompt?.substring(0, 100) + (v.prompt?.length > 100 ? '...' : '')
      })) || []
    };

    return new Response(
      JSON.stringify(analytics),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in analytics function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});