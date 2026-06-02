import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

serve(async (req) => {
  const { user_id, title, body, url } = await req.json();
  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const { data: subs } = await supabase.from("push_subscriptions").select("subscription").eq("user_id", user_id);
  if (!subs || subs.length === 0) return new Response(JSON.stringify({ sent: 0 }), { status: 200 });
  const payload = JSON.stringify({ title, body, url: url || "/" });
  let sent = 0;
  for (const row of subs) {
    try {
      const sub = typeof row.subscription === "string" ? JSON.parse(row.subscription) : row.subscription;
      const res = await fetch(sub.endpoint, { method: "POST", headers: { "Content-Type": "application/octet-stream", "TTL": "86400" }, body: payload });
      if (res.ok) sent++;
    } catch (e) { console.error("Push failed:", e); }
  }
  return new Response(JSON.stringify({ sent }), { status: 200 });
});
