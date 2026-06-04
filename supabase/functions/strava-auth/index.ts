// Supabase Edge Function: strava-auth
// Handles Strava OAuth callback — exchanges code for token, then redirects back to app
// Deploy: supabase functions deploy strava-auth

const STRAVA_CLIENT_ID = "255151";
const STRAVA_CLIENT_SECRET = "2549ba504c10124e859196f90fd26e80e1c015d4";
const SUPABASE_URL = "https://ebphyejgauwgguwcbmgj.supabase.co";
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVicGh5ZWpnYXV3Z2d1d2NibWdqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MDE2Mzc0NywiZXhwIjoyMDk1NzM5NzQ3fQ.1KTmFrzz-OHJAcqco1OaDw0n5uVkARX1ubEISJnSnpI";
const APP_URL = "https://moneyfitness.app";

Deno.serve(async (req: Request) => {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const userId = url.searchParams.get("state");
  const error = url.searchParams.get("error");

  if (error || !code || !userId) {
    return Response.redirect(`${APP_URL}?strava=error`, 302);
  }

  try {
    // Exchange code for Strava access token
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
    const tokenData = await tokenRes.json();

    if (!tokenData.access_token) {
      return Response.redirect(`${APP_URL}?strava=error`, 302);
    }

    // Save Strava tokens to Supabase profiles table
    await fetch(`${SUPABASE_URL}/rest/v1/profiles?id=eq.${userId}`, {
      method: "PATCH",
      headers: {
        "apikey": SUPABASE_SERVICE_KEY,
        "Authorization": `Bearer ${SUPABASE_SERVICE_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        strava_access_token: tokenData.access_token,
        strava_refresh_token: tokenData.refresh_token,
        strava_token_expires_at: tokenData.expires_at,
        strava_athlete_id: tokenData.athlete?.id,
      }),
    });

    // Redirect back to app with success flag
    return Response.redirect(`${APP_URL}?strava=connected&tab=watch`, 302);
  } catch (e) {
    return Response.redirect(`${APP_URL}?strava=error`, 302);
  }
});
