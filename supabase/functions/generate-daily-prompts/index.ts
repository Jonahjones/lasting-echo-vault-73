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

    // Array of meaningful prompts for memory creation
    const prompts = [
      "Share a favorite story from your childhood that still makes you smile.",
      "Describe a family tradition you hope will be passed down forever.",
      "What is the best lesson you learned from your parents or grandparents?",
      "What advice would you give your younger self if you could?",
      "Tell the story of how you met your closest friend.",
      "What was the proudest moment of your life?",
      "Share a funny or embarrassing moment from your school years.",
      "What challenge in life taught you the most?",
      "Describe the day you became a parent.",
      "What dream do you still hope to achieve or wish you had pursued?",
      "Tell us about a family holiday or vacation you'll always remember.",
      "What's your favorite family recipe, and what memories are connected to it?",
      "Share a story about your favorite pet or animal companion.",
      "Describe the bravest thing you've ever done.",
      "What does happiness look like to you?",
      "Tell about a time you felt scared and what helped you through it.",
      "Who has had the biggest impact on your life, and why?",
      "Share a lesson you learned from making a mistake.",
      "What's the kindest thing someone ever did for you?",
      "What is a habit or routine that made your life better?",
      "Tell the story of your first job and what you learned from it.",
      "What advice would you give about friendship?",
      "What does love mean to you?",
      "Share a memory from a special family celebration.",
      "What is your favorite memory with your children or grandchildren?",
      "Tell about a tradition you started in your own family.",
      "What do you hope your children or grandchildren learn from you?",
      "What is the best piece of advice you ever received?",
      "What makes your family unique?",
      "Describe a time you overcame a fear.",
      "Share a moment when you laughed until you cried.",
      "What's a place that feels like home to you?",
      "Tell a story about an important teacher or mentor.",
      "Share a moment that changed your life.",
      "What are you most grateful for right now?",
      "What do you hope your legacy will be?",
      "Tell us about your favorite season or time of year and why it's meaningful.",
      "Share a memory of helping someone in need.",
      "What advice would you give about handling tough times?",
      "Describe a perfect day spent with the people you love.",
      "What family value or belief do you hope is passed on?",
      "Tell us about your first car or your first driving experience.",
      "What's a story from your parents' or grandparents' childhood that you want remembered?",
      "What's a simple pleasure that always makes you happy?",
      "What are you most proud of accomplishing in your life?",
      "What's something you admire about each of your children or family members?",
      "Share a memory from a family gathering or reunion.",
      "What do you wish for the future of our family?",
      "Tell us about a family challenge you faced together and how you got through it.",
      "What is a hope, wish, or blessing you want to leave for your loved ones?",
      "What's your earliest childhood memory?",
      "Describe a moment when you felt truly loved.",
      "What's a skill or talent you're proud of?",
      "Share a story about forgiveness—giving or receiving it.",
      "What's the most beautiful place you've ever seen?",
      "Tell about a time when you helped someone without expecting anything in return.",
      "What's a book, movie, or song that deeply affected you?",
      "Share a memory of your first day at a new school or job.",
      "What's something you wish you could tell someone who has passed away?",
      "Describe a moment when you felt proud of someone else.",
      "What's a hobby or interest that brings you joy?",
      "Tell about a time when you stood up for what you believed in.",
      "What's your favorite way to spend a quiet evening?",
      "Share a story about learning something new later in life.",
      "What's a compliment you received that you'll never forget?",
      "Describe your dream for your children's future.",
      "What's a family photo that tells a special story?",
      "Tell about a time when you felt grateful for your health.",
      "What's something about your generation that you want preserved?",
      "Share a memory of celebrating a special achievement.",
      "What's a piece of wisdom you learned from a difficult experience?",
      "Describe a moment when you felt completely at peace.",
      "What's something you hope your grandchildren will know about you?"
    ];

    const today = new Date().toISOString().split('T')[0];

    // Check if today's prompt already exists
    const { data: existingPrompt } = await supabase
      .from('daily_prompts')
      .select('id')
      .eq('date', today)
      .maybeSingle();

    if (existingPrompt) {
      return new Response(
        JSON.stringify({ message: 'Today\'s prompt already exists', date: today }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Generate a random prompt
    const randomPrompt = prompts[Math.floor(Math.random() * prompts.length)];

    // Insert today's prompt
    const { data: newPrompt, error: promptError } = await supabase
      .from('daily_prompts')
      .insert({
        date: today,
        prompt_text: randomPrompt
      })
      .select()
      .single();

    if (promptError) {
      console.error('Error creating daily prompt:', promptError);
      throw promptError;
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
      title: 'Today\'s Memory Prompt',
      message: `Take a moment to reflect: "${randomPrompt}"`,
      data: {
        prompt_text: randomPrompt,
        prompt_id: newPrompt.id,
        action: 'daily_prompt'
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
        message: 'Daily prompt generated successfully',
        prompt: randomPrompt,
        date: today,
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