import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const STRAVA_CLIENT_ID = "255151";
const STRAVA_CLIENT_SECRET = "2549ba504c10124e859196f90fd26e80e1c015d4";

serve(async (req) => {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const userId = url.searchParams.get("state");

  console.log("strava-auth called, code:", code ? "present" : "missing", "userId:", userId);

  if (!code || !userId) {
    return new Response("Missing code or state", { status: 400 });
  }

  // Exchange code for tokens
  const tokenRes = await fetch("https://www.strava.com/oauth/token", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: STRAVA_CLIENT_ID,
      client_secret: STRAVA_CLIENT_SECRET,
      code,
      grant_type: "authorization_code",
    }),
  });

  const tokens = await tokenRes.json();
  console.log("Token exchange status:", tokenRes.status, "athlete:", tokens.athlete?.id);

  if (!tokens.access_token) {
    console.error("Token exchange failed:", JSON.stringify(tokens));
    return new Response("Token exchange failed", { status: 400 });
  }

  // Save tokens to Supabase
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const { error } = await supabase.from("strava_tokens").upsert({
    user_id: userId,
    strava_athlete_id: tokens.athlete.id,
    access_token: tokens.access_token,
    refresh_token: tokens.refresh_token,
    expires_at: tokens.expires_at,
  }, { onConflict: "strava_athlete_id" });

  if (error) {
    console.error("Supabase save error:", JSON.stringify(error));
  } else {
    console.log("Token saved successfully for user:", userId);
  }

  // Redirect back to app
  return new Response(null, {
    status: 302,
    headers: { Location: "https://moneyfitness.app?strava=connected" },
  });
});
