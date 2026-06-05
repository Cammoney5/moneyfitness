// Supabase Edge Function: send-push
// Uses Web Push with VAPID keys — no third-party service, no expiring API keys
// Deploy: supabase functions deploy send-push --project-ref ebphyejgauwgguwcbmgj --no-verify-jwt

const VAPID_PUBLIC_KEY = "F13aHInf2a8ZZX3DqRfvdTy91EA2cUaeXoX0ONh6vS6RaNG7QGZkKK1G5alMbKMFXp71svsN-cAidq0wcn7ZIA";
const VAPID_PRIVATE_KEY = "x_5Sr-yI63Z6lGoBmxNnjS0N7ftDMzB9XV3qj0HtM6k";
const VAPID_SUBJECT = "mailto:cameronmoney5@hotmail.com";
const SUPABASE_URL = "https://ebphyejgauwgguwcbmgj.supabase.co";
const SUPABASE_SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVicGh5ZWpnYXV3Z2d1d2NibWdqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MDE2Mzc0NywiZXhwIjoyMDk1NzM5NzQ3fQ.1KTmFrzz-OHJAcqco1OaDw0n5uVkARX1ubEISJnSnpI";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function base64urlToUint8Array(base64url: string): Uint8Array {
  const base64 = base64url.replace(/-/g, '+').replace(/_/g, '/');
  const padded = base64.padEnd(base64.length + (4 - base64.length % 4) % 4, '=');
  const binary = atob(padded);
  return new Uint8Array([...binary].map(c => c.charCodeAt(0)));
}

function uint8ArrayToBase64url(arr: Uint8Array): string {
  return btoa(String.fromCharCode(...arr)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

async function createVapidJWT(audience: string): Promise<string> {
  const header = { typ: "JWT", alg: "ES256" };
  const now = Math.floor(Date.now() / 1000);
  const payload = { aud: audience, exp: now + 12 * 3600, sub: VAPID_SUBJECT };

  const headerB64 = uint8ArrayToBase64url(new TextEncoder().encode(JSON.stringify(header)));
  const payloadB64 = uint8ArrayToBase64url(new TextEncoder().encode(JSON.stringify(payload)));
  const sigInput = `${headerB64}.${payloadB64}`;

  const keyData = base64urlToUint8Array(VAPID_PRIVATE_KEY);
  const cryptoKey = await crypto.subtle.importKey(
    "raw", keyData, { name: "ECDSA", namedCurve: "P-256" }, false, ["sign"]
  );
  const sig = await crypto.subtle.sign(
    { name: "ECDSA", hash: "SHA-256" },
    cryptoKey,
    new TextEncoder().encode(sigInput)
  );

  return `${sigInput}.${uint8ArrayToBase64url(new Uint8Array(sig))}`;
}

async function sendWebPush(subscription: any, title: string, body: string, url: string) {
  const endpoint = subscription.endpoint;
  const origin = new URL(endpoint).origin;

  const jwt = await createVapidJWT(origin);
  const authHeader = `vapid t=${jwt},k=${VAPID_PUBLIC_KEY}`;

  const payload = JSON.stringify({ title, body, url, icon: "/icon-192.png" });
  const encoded = new TextEncoder().encode(payload);

  // Simple web push without content encryption (works for most browsers)
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Authorization": authHeader,
      "Content-Type": "application/json",
      "TTL": "86400",
    },
    body: encoded,
  });

  return response;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { user_id, title, body, url } = await req.json();
    if (!user_id) return new Response(JSON.stringify({ error: "missing user_id" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    // Get user's push subscription from Supabase
    const subRes = await fetch(
      `${SUPABASE_URL}/rest/v1/push_subscriptions?user_id=eq.${user_id}&select=subscription&limit=1`,
      { headers: { "apikey": SUPABASE_SERVICE_KEY, "Authorization": `Bearer ${SUPABASE_SERVICE_KEY}` } }
    );
    const subs = await subRes.json();

    if (!subs?.length || !subs[0]?.subscription) {
      console.log("No push subscription found for user:", user_id);
      return new Response(JSON.stringify({ error: "no subscription" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const subscription = typeof subs[0].subscription === "string" ? JSON.parse(subs[0].subscription) : subs[0].subscription;
    const result = await sendWebPush(subscription, title || "MoneyFitness", body || "You have a new notification", url || "https://moneyfitness.app");

    console.log("Web push result:", result.status, result.statusText);
    return new Response(JSON.stringify({ status: result.status }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.log("Error:", e);
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
