import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

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
    
    // Call the generate-daily-prompts function
    const response = await fetch(`${supabaseUrl}/functions/v1/generate-daily-prompts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!}`,
      }
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(`Failed to trigger daily prompts: ${data.error || response.statusText}`);
    }

    console.log('✅ Daily prompt notifications triggered successfully:', data);

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Daily prompt notifications triggered successfully',
        timestamp: new Date().toISOString(),
        result: data
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ Error triggering daily prompt notifications:', error);
    
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
}); 