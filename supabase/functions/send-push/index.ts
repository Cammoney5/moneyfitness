import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const ONESIGNAL_APP_ID = "18d1d0a8-484d-48eb-a8f2-c577a7a5fd16";
const ONESIGNAL_API_KEY = "os_v2_app_ddi5bkcijveoxkhsyv32pjp5cygfyumdzmbe2gncajv4p4agrb3xth3vutjwpybd2ng3auawjugdxyif6abzlfgpp5l2povpxs535iy";
const SUPABASE_URL = "https://ebphyejgauwgguwcbmgj.supabase.co";
const SUPABASE_SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVicGh5ZWpnYXV3Z2d1d2NibWdqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MDE2Mzc0NywiZXhwIjoyMDk1NzM5NzQ3fQ.1KTmFrzz-OHJAcqco1OaDw0n5uVkARX1ubEISJnSnpI";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { user_id, external_id, title, body, url } = await req.json();
    const targetUserId = user_id || external_id;

    if (!targetUserId) {
      return new Response(JSON.stringify({ error: "no user_id" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Look up the user's OneSignal subscription ID from profiles
    const profileRes = await fetch(`${SUPABASE_URL}/rest/v1/profiles?id=eq.${targetUserId}&select=onesignal_subscription_id`, {
      headers: { "apikey": SUPABASE_SERVICE_KEY, "Authorization": `Bearer ${SUPABASE_SERVICE_KEY}` }
    });
    const profiles = await profileRes.json();
    const subId = profiles?.[0]?.onesignal_subscription_id;

    let payload: any;

    if (subId) {
      // Target by specific subscription ID (most reliable)
      payload = {
        app_id: ONESIGNAL_APP_ID,
        include_subscription_ids: [subId],
        headings: { en: title },
        contents: { en: body },
        url: url || "/",
      };
    } else {
      // Fallback: target by external_id
      payload = {
        app_id: ONESIGNAL_APP_ID,
        include_aliases: { external_id: [targetUserId] },
        target_channel: "push",
        headings: { en: title },
        contents: { en: body },
        url: url || "/",
      };
    }

    const res = await fetch("https://api.onesignal.com/notifications", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `key ${ONESIGNAL_API_KEY}`,
      },
      body: JSON.stringify(payload),
    });

    const result = await res.json();
    console.log("OneSignal response:", JSON.stringify(result));

    return new Response(JSON.stringify(result), {
      status: res.ok ? 200 : 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
