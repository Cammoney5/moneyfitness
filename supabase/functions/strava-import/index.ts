// Supabase Edge Function: strava-import
// Fetches past 200 Strava activities for a user and saves them to activity_logs
// Deploy: supabase functions deploy strava-import
// Called from frontend: POST with { userId, authToken }

const STRAVA_CLIENT_ID = "255151";
const STRAVA_CLIENT_SECRET = "2549ba504c10124e859196f90fd26e80e1c015d4";
const SUPABASE_URL = "https://ebphyejgauwgguwcbmgj.supabase.co";
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

async function refreshStravaToken(refreshToken: string) {
  const res = await fetch("https://www.strava.com/oauth/token", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: STRAVA_CLIENT_ID,
      client_secret: STRAVA_CLIENT_SECRET,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });
  return res.json();
}

function mapStravaType(stravaType: string): string {
  const t = stravaType.toLowerCase();
  if (t.includes("run")) return "run";
  if (t.includes("ride") || t.includes("cycling") || t.includes("bike")) return "bike";
  if (t.includes("swim")) return "swim";
  return "workout";
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "authorization, content-type, apikey",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
      },
    });
  }

  const headers = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
  };

  try {
    const { userId } = await req.json();
    if (!userId) return new Response(JSON.stringify({ error: "missing userId" }), { status: 400, headers });

    // Get user's Strava tokens from Supabase
    const profileRes = await fetch(
      `${SUPABASE_URL}/rest/v1/profiles?id=eq.${userId}&select=strava_access_token,strava_refresh_token,strava_token_expires_at`,
      {
        headers: {
          "apikey": SUPABASE_SERVICE_KEY,
          "Authorization": `Bearer ${SUPABASE_SERVICE_KEY}`,
        },
      }
    );
    const profiles = await profileRes.json();
    if (!profiles?.length || !profiles[0].strava_access_token) {
      return new Response(JSON.stringify({ error: "Strava not connected" }), { status: 401, headers });
    }

    let { strava_access_token, strava_refresh_token, strava_token_expires_at } = profiles[0];

    // Refresh token if expired
    const nowSecs = Math.floor(Date.now() / 1000);
    if (strava_token_expires_at && nowSecs >= strava_token_expires_at - 300) {
      const refreshed = await refreshStravaToken(strava_refresh_token);
      if (refreshed.access_token) {
        strava_access_token = refreshed.access_token;
        await fetch(`${SUPABASE_URL}/rest/v1/profiles?id=eq.${userId}`, {
          method: "PATCH",
          headers: {
            "apikey": SUPABASE_SERVICE_KEY,
            "Authorization": `Bearer ${SUPABASE_SERVICE_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            strava_access_token: refreshed.access_token,
            strava_refresh_token: refreshed.refresh_token || strava_refresh_token,
            strava_token_expires_at: refreshed.expires_at,
          }),
        });
      }
    }

    // Fetch up to 200 activities from Strava (2 pages of 100)
    const allActivities: any[] = [];
    for (let page = 1; page <= 2; page++) {
      const actRes = await fetch(
        `https://www.strava.com/api/v3/athlete/activities?per_page=100&page=${page}`,
        { headers: { "Authorization": `Bearer ${strava_access_token}` } }
      );
      const acts = await actRes.json();
      if (!Array.isArray(acts) || acts.length === 0) break;
      allActivities.push(...acts);
    }

    if (allActivities.length === 0) {
      return new Response(JSON.stringify({ imported: 0 }), { status: 200, headers });
    }

    // Map Strava activities to activity_logs rows
    const rows = allActivities.map((a: any) => {
      const date = new Date(a.start_date_local);
      const dateStr = date.getFullYear() + "-" +
        String(date.getMonth() + 1).padStart(2, "0") + "-" +
        String(date.getDate()).padStart(2, "0");
      const miles = a.distance ? Math.round((a.distance / 1609.34) * 100) / 100 : null;
      const durationMins = a.moving_time ? Math.round(a.moving_time / 60) : null;
      const pace = (mapStravaType(a.type) === "run" && miles && durationMins && miles > 0)
        ? (function() {
            const minsPerMile = durationMins / miles;
            const m = Math.floor(minsPerMile);
            const s = Math.round((minsPerMile - m) * 60);
            return `${m}:${String(s).padStart(2, "0")}`;
          })()
        : null;

      return {
        client_id: userId,
        logged_date: dateStr,
        type: mapStravaType(a.type),
        notes: a.name || "",
        duration: durationMins ? `${durationMins} min` : "",
        miles: miles,
        calories: a.calories || null,
        steps: null,
        pace: pace || "",
        source: "strava",
        strava_activity_id: String(a.id),
      };
    });

    // Upsert into activity_logs (using strava_activity_id to avoid duplicates)
    const upsertRes = await fetch(`${SUPABASE_URL}/rest/v1/activity_logs`, {
      method: "POST",
      headers: {
        "apikey": SUPABASE_SERVICE_KEY,
        "Authorization": `Bearer ${SUPABASE_SERVICE_KEY}`,
        "Content-Type": "application/json",
        "Prefer": "resolution=merge-duplicates,return=minimal",
      },
      body: JSON.stringify(rows),
    });

    if (!upsertRes.ok) {
      const errText = await upsertRes.text();
      // If strava_activity_id column doesn't exist yet, retry without it
      if (errText.includes("strava_activity_id")) {
        const rowsWithoutStravaId = rows.map(function(r: any) {
          const { strava_activity_id, ...rest } = r;
          return rest;
        });
        await fetch(`${SUPABASE_URL}/rest/v1/activity_logs`, {
          method: "POST",
          headers: {
            "apikey": SUPABASE_SERVICE_KEY,
            "Authorization": `Bearer ${SUPABASE_SERVICE_KEY}`,
            "Content-Type": "application/json",
            "Prefer": "return=minimal",
          },
          body: JSON.stringify(rowsWithoutStravaId),
        });
      }
    }

    return new Response(JSON.stringify({ imported: rows.length }), { status: 200, headers });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers });
  }
});
