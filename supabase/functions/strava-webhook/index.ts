import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const STRAVA_CLIENT_ID = "255151";
const STRAVA_CLIENT_SECRET = "2549ba504c10124e859196f90fd26e80e1c015d4";
const VERIFY_TOKEN = "moneyfitness_strava_verify";

serve(async (req) => {
  if (req.method === "GET") {
    const url = new URL(req.url);
    const mode = url.searchParams.get("hub.mode");
    const token = url.searchParams.get("hub.verify_token");
    const challenge = url.searchParams.get("hub.challenge");
    if (mode === "subscribe" && token === VERIFY_TOKEN) {
      return new Response(JSON.stringify({ "hub.challenge": challenge }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }
    return new Response("OK", { status: 200 });
  }

  if (req.method === "OPTIONS") return new Response("ok");

  const event = await req.json();
  console.log("Webhook event:", JSON.stringify(event));

  if (event.object_type !== "activity") {
    console.log("Skipping non-activity event:", event.object_type);
    return new Response("OK", { status: 200 });
  }

  if (event.aspect_type !== "create") {
    console.log("Skipping non-create event:", event.aspect_type);
    return new Response("OK", { status: 200 });
  }

  const stravaAthleteId = event.owner_id;
  const stravaActivityId = event.object_id;
  console.log("Processing activity:", stravaActivityId, "for athlete:", stravaAthleteId);

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const { data: tokenRow, error: tokenError } = await supabase
    .from("strava_tokens")
    .select("*")
    .eq("strava_athlete_id", stravaAthleteId)
    .single();

  console.log("Token lookup:", tokenRow ? "found" : "not found", tokenError ? JSON.stringify(tokenError) : "no error");

  if (!tokenRow) return new Response("OK", { status: 200 });

  let accessToken = tokenRow.access_token;
  if (tokenRow.expires_at < Date.now() / 1000) {
    console.log("Refreshing expired token");
    const refreshRes = await fetch("https://www.strava.com/oauth/token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        client_id: STRAVA_CLIENT_ID,
        client_secret: STRAVA_CLIENT_SECRET,
        refresh_token: tokenRow.refresh_token,
        grant_type: "refresh_token",
      }),
    });
    const refreshed = await refreshRes.json();
    accessToken = refreshed.access_token;
    await supabase.from("strava_tokens").update({
      access_token: refreshed.access_token,
      refresh_token: refreshed.refresh_token,
      expires_at: refreshed.expires_at,
    }).eq("strava_athlete_id", stravaAthleteId);
  }

  const actRes = await fetch(`https://www.strava.com/api/v3/activities/${stravaActivityId}`, {
    headers: { "Authorization": `Bearer ${accessToken}` },
  });
  const activity = await actRes.json();
  console.log("Activity fetched:", activity.name, activity.type, activity.distance);

  const typeMap: Record<string, string> = {
    Run: "run", Ride: "bike", Swim: "swim", Walk: "walk",
    Hike: "walk", WeightTraining: "workout", Workout: "workout",
    Yoga: "maintenance", Crossfit: "workout",
  };
  const type = typeMap[activity.type] || "workout";
  const miles = activity.distance ? (activity.distance / 1609.344).toFixed(2) : null;
  const duration = activity.moving_time ? String(Math.floor(activity.moving_time / 60)) + "min" : null;
  const pace = activity.average_speed && type === "run"
    ? (function() {
        const secPerMile = 1609.344 / activity.average_speed;
        const m = Math.floor(secPerMile / 60);
        const s = Math.round(secPerMile % 60);
        return m + ":" + (s < 10 ? "0" : "") + s;
      })()
    : null;

  const startDate = new Date(activity.start_date_local);
  const loggedDate = startDate.toISOString().split("T")[0];

  const { error: insertError } = await supabase.from("activity_logs").insert({
    client_id: tokenRow.user_id,
    logged_date: loggedDate,
    type,
    notes: activity.name || "",
    miles: miles ? parseFloat(miles) : null,
    duration,
    calories: activity.calories || null,
    pace,
    source: "strava",
  });

  if (insertError) {
    console.error("Insert error:", JSON.stringify(insertError));
  } else {
    console.log("Activity saved successfully:", activity.name);
  }

  return new Response("OK", { status: 200 });
});
