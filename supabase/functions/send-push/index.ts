// send-push: FCM HTTP v1 API with service account JWT
// Deploy: supabase functions deploy send-push --project-ref ebphyejgauwgguwcbmgj --no-verify-jwt

const PROJECT_ID = "moneyfitness-4c7df";
const CLIENT_EMAIL = "firebase-adminsdk-fbsvc@moneyfitness-4c7df.iam.gserviceaccount.com";
const PRIVATE_KEY_B64 = "MIIEvAIBADANBgkqhkiG9w0BAQEFAASCBKYwggSiAgEAAoIBAQCrVZFHXzv92BGaWlcS04Vk5XfM0xvEj9GjBQP142fN8MrYdoOBCrN98D5ks1rt5udq1QOcuz8LvtWVDWWTYUHF8sZS/oIlGxX33mStn4J0CgJvyag+AxdwGvOJzyInlgxE/IYJamBCaodG/Uds0eokSMYz+AXvKqY+e9BMN1ru6pdTEYTxCEYy01uo0rB0nCPJqn0dEU0SskbManbuLoKjXHsPQxs/I6wYI316L/tl2PqE5nzV/4JSvYlZwt5Qu031IaXbQhrubkknQaqBuOeWWxxkxk1NCVP/gCFbhumHFUDmV0Fl0V4iN619uTEsZYfwIRA5n982oMx9UM27iXLhAgMBAAECggEAATwvfRuptJyQ0mt3rJkhoVrB3oQwU147yzR9XQG52SdE6BLxI15Q0U3ovjw4geXn6cpNsYzcQUz7sEyRnJKPOUKE9VrUNHklszTrRgDkDWr3zedezw0hx28rTaVUjENhtOLa4sEdfucSkPOBFv7LpL2xT5U4cjsdCg7lj1IYFcgwP0x8wgzZRrQGEWxoufQQ8lpGvW0Fp24cSQAYGLwVr4PXFJ2l9Ly+l+RRJ3ObsUsBxJqhPpyKKelGqDRGdHv8ZkpfDDViFxXbgEXzuMkRHOV+uSRx5LCJNQ0CvkdKDDB5FC+aLPgxcYLYaasgDDk3bwqv60kKPqtQNVrPNqHKgQKBgQDdNEb4FJA2G0qdlRinJm2J0YfMFTY0nsz1D5cLXA9SF0gOGoXzvY64FOg64BQX9vlkEcZgKo6fMoKWjFv+J/wnYan+K5VuQGffeV8f8RkoVJXkwJ+uOO0O++VdVuxRXqPU3kG3HKhFHc/teFa84H4z70PnMtJDByXXmEV43gTswQKBgQDGSRDCaxeri/m2AvDr0Gk+z0XUPotdBnbDO7kNlMz4V4Ee2VFz1iP2nT0zFLNUtCibB4STWBNvSzTIErJHWLNK3fabsB5ONUi2FHWYFaqJu7NWqBcF9gqC8Yl4PIjOj1HQdmRjvX8quHRjyz+W9ORL55n0pjyktUp1MXA3zixuIQKBgGVPzDFTObmORl5mKyRjNUgp70hJbsoq8TRML6HESEAQ6a+L9k3sQ7GL4dEVUB6pvw9WFMV2uFuxhp3tKzT8m0BuOq1uyMH2PZzcufSnOB6AnyZmErx41hpGxIY7iYC7F84m/XIgbfE59kGNHCzlpOekbjU10ZdhbrOPykHRbfABAoGAJcoDAAp7RlxU6NVCqQ59IFVMT5jj4oS62ZZmPCphreqvVvu/xD3JeNSat0N4senr2y/hmlssyQciNgcqJuLGuLv4pc8411rcUqcvih6G89zr3tYGHUK42h/CPUH8KLGzu/D0TPXuaGvi8qnnopNldvnao3+TCyjp2c/kPR5z5UECgYB+mZj0FgVd02IoV8ZUYtAxLMdQOtitIUgT1vHo8A8zeUEm7PipXSklOdIxTkIxkBH4klPqj5jnP6yL4PEVGqO9ba3oyGonN3VE82wQ7H0BpXGWoc7f9WVjUXIubxXLM1hv7xyXQlufJARowlwuACiklAB7xDgt5unZItmcrQ0THQ==";

const SUPABASE_URL = "https://ebphyejgauwgguwcbmgj.supabase.co";
const SUPABASE_SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVicGh5ZWpnYXV3Z2d1d2NibWdqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MDE2Mzc0NywiZXhwIjoyMDk1NzM5NzQ3fQ.1KTmFrzz-OHJAcqco1OaDw0n5uVkARX1ubEISJnSnpI";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

async function getAccessToken(): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const header = btoa(JSON.stringify({ alg: "RS256", typ: "JWT" })).replace(/\+/g,"-").replace(/\//g,"_").replace(/=/g,"");
  const payload = btoa(JSON.stringify({
    iss: CLIENT_EMAIL,
    scope: "https://www.googleapis.com/auth/firebase.messaging",
    aud: "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600,
  })).replace(/\+/g,"-").replace(/\//g,"_").replace(/=/g,"");

  const sigInput = `${header}.${payload}`;

  // Import RSA private key from PKCS8 DER
  const der = Uint8Array.from(atob(PRIVATE_KEY_B64), c => c.charCodeAt(0));
  const key = await crypto.subtle.importKey(
    "pkcs8", der,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false, ["sign"]
  );

  const sig = new Uint8Array(await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5", key,
    new TextEncoder().encode(sigInput)
  ));
  const sigB64 = btoa(String.fromCharCode(...sig)).replace(/\+/g,"-").replace(/\//g,"_").replace(/=/g,"");
  const jwt = `${sigInput}.${sigB64}`;

  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion=${jwt}`,
  });
  const tokenData = await tokenRes.json();
  if (!tokenData.access_token) throw new Error("Failed to get access token: " + JSON.stringify(tokenData));
  return tokenData.access_token;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const { user_id, title, body, url } = await req.json();
    if (!user_id) return new Response(JSON.stringify({ error: "missing user_id" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const subRes = await fetch(
      `${SUPABASE_URL}/rest/v1/push_subscriptions?user_id=eq.${user_id}&select=subscription&limit=1`,
      { headers: { "apikey": SUPABASE_SERVICE_KEY, "Authorization": `Bearer ${SUPABASE_SERVICE_KEY}` } }
    );
    const subs = await subRes.json();
    if (!subs?.length || !subs[0]?.subscription) {
      return new Response(JSON.stringify({ error: "no subscription" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const sub = typeof subs[0].subscription === "string" ? JSON.parse(subs[0].subscription) : subs[0].subscription;

    // Extract FCM token - new format stores it directly, legacy format extracts from endpoint
    const fcmToken = sub.fcm_token || (sub.endpoint && sub.endpoint.split("/").pop());
    console.log("[sendPush] FCM token:", fcmToken?.slice(0, 20) + "...");

    const accessToken = await getAccessToken();

    const message = {
      message: {
        token: fcmToken,
        notification: { title: title || "MoneyFitness", body: body || "New notification" },
        webpush: {
          notification: { title: title || "MoneyFitness", body: body || "New notification", icon: "/icon-192.png" },
          fcm_options: { link: url || "https://moneyfitness.app" },
        },
      },
    };

    const result = await fetch(`https://fcm.googleapis.com/v1/projects/${PROJECT_ID}/messages:send`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(message),
    });

    const resultData = await result.json();
    console.log("[sendPush] FCM result:", result.status, JSON.stringify(resultData));

    return new Response(JSON.stringify({ status: result.status, data: resultData }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("[sendPush] Error:", e);
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
