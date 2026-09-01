import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const ip = req.headers.get('cf-connecting-ip') || 
               req.headers.get('x-forwarded-for')?.split(',')[0].trim() || 
               req.headers.get('x-real-ip') || 
               'unknown'

    const payload = await req.json()
    
    // Construct the insert object.
    const insertData = {
      visitor_ip: ip,
      device_type: payload.device_type,
      // Store browser_version alongside browser_name if available, or modify table if you want a separate column
      browser_name: payload.browser_version ? `${payload.browser_name} ${payload.browser_version}` : payload.browser_name,
      operating_system: payload.operating_system,
      screen_width: payload.screen_width,
      screen_height: payload.screen_height,
      language: payload.language,
      page_path: payload.page_path,
      referrer: payload.referrer,
      session_id: payload.session_id,
      user_agent: payload.user_agent
    };

    const { error } = await supabaseClient
      .from('site_visits')
      .insert([insertData])

    if (error) {
       console.error("Supabase Error:", error);
       throw error;
    }

    return new Response(
      JSON.stringify({ success: true, data: insertData }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  } catch (error: any) {
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    )
  }
})
