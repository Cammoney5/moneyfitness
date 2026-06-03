import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const ONESIGNAL_APP_ID = "18d1d0a8-484d-48eb-a8f2-c577a7a5fd16";
const ONESIGNAL_API_KEY = "os_v2_app_ddi5bkcijveoxkhsyv32pjp5czyf3n7n35jum5vckany2i7zqm5r5qxmeez2cwvvor2dq6eomeolpgbkoymztal3fghaqoc5x7tzpba";

serve(async (req) => {
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  };
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const { user_id, external_id, title, body, url } = await req.json();
  const targetId = external_id || user_id;

  const payload = {
    app_id: ONESIGNAL_APP_ID,
    include_aliases: { external_id: [targetId] },
    target_channel: "push",
    headings: { en: title },
    contents: { en: body },
    url: url || "/",
  };

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
});
