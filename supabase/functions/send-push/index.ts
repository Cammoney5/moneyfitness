// Supabase Edge Function: send-push
// Deploy: supabase functions deploy send-push --project-ref ebphyejgauwgguwcbmgj --no-verify-jwt

const VAPID_PUBLIC_KEY = "BPIDYZgs4SObjFGTEkQ99oOgebgyEqKnhHKyJI4P5iXNsAlun0HyLPDMfeUwRRrTXAVT5dVxmdfgSwrYQTqhiS8";
const VAPID_PRIVATE_KEY = "KZjRmb2YFrkBT4FnZn8yxpfx2zDSoht3wim8QNi-puE";
const VAPID_SUBJECT = "mailto:cameronmoney@hotmail.com";
const SUPABASE_URL = "https://ebphyejgauwgguwcbmgj.supabase.co";
const SUPABASE_SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVicGh5ZWpnYXV3Z2d1d2NibWdqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MDE2Mzc0NywiZXhwIjoyMDk1NzM5NzQ3fQ.1KTmFrzz-OHJAcqco1OaDw0n5uVkARX1ubEISJnSnpI";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function base64urlToUint8Array(base64url: string): Uint8Array {
  const base64 = base64url.replace(/-/g, "+").replace(/_/g, "/");
  const padded = base64.padEnd(base64.length + (4 - base64.length % 4) % 4, "=");
  const binary = atob(padded);
  return new Uint8Array([...binary].map(c => c.charCodeAt(0)));
}

function uint8ArrayToBase64url(arr: Uint8Array): string {
  return btoa(String.fromCharCode(...arr)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
}

async function importVapidPrivateKey(base64urlKey: string): Promise<CryptoKey> {
  // Use jwk format instead of pkcs8 — more reliable in Deno
  const keyBytes = base64urlToUint8Array(base64urlKey);
  const jwk = {
    kty: "EC",
    crv: "P-256",
    d: uint8ArrayToBase64url(keyBytes),
    x: "placeholder",
    y: "placeholder",
    key_ops: ["sign"],
    ext: true,
  };

  // We need x and y from the public key
  const pubKeyBytes = base64urlToUint8Array(VAPID_PUBLIC_KEY);
  // pubKeyBytes is uncompressed: 0x04 + 32 bytes x + 32 bytes y
  // But VAPID public key is raw 65 bytes starting with 0x04
  // Actually it may just be the 64-byte x||y without prefix
  let xBytes: Uint8Array;
  let yBytes: Uint8Array;
  if (pubKeyBytes.length === 65 && pubKeyBytes[0] === 0x04) {
    xBytes = pubKeyBytes.slice(1, 33);
    yBytes = pubKeyBytes.slice(33, 65);
  } else {
    xBytes = pubKeyBytes.slice(0, 32);
    yBytes = pubKeyBytes.slice(32, 64);
  }

  jwk.x = uint8ArrayToBase64url(xBytes);
  jwk.y = uint8ArrayToBase64url(yBytes);

  return await crypto.subtle.importKey(
    "jwk",
    jwk,
    { name: "ECDSA", namedCurve: "P-256" },
    false,
    ["sign"]
  );
}

async function createVapidJWT(audience: string): Promise<string> {
  const header = { typ: "JWT", alg: "ES256" };
  const now = Math.floor(Date.now() / 1000);
  const payload = { aud: audience, exp: now + 12 * 3600, sub: VAPID_SUBJECT };

  const headerB64 = uint8ArrayToBase64url(new TextEncoder().encode(JSON.stringify(header)));
  const payloadB64 = uint8ArrayToBase64url(new TextEncoder().encode(JSON.stringify(payload)));
  const sigInput = `${headerB64}.${payloadB64}`;

  const cryptoKey = await importVapidPrivateKey(VAPID_PRIVATE_KEY);
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

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Authorization": authHeader,
      "Content-Type": "application/json",
      "TTL": "86400",
    },
    body: new TextEncoder().encode(JSON.stringify({ title, body, url, icon: "/icon-192.png" })),
  });

  return response;
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
      console.log("[sendPush] No subscription found for user:", user_id);
      return new Response(JSON.stringify({ error: "no subscription" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const subscription = typeof subs[0].subscription === "string"
      ? JSON.parse(subs[0].subscription)
      : subs[0].subscription;

    console.log("[sendPush] Sending to endpoint:", subscription.endpoint);
    const result = await sendWebPush(subscription, title || "MoneyFitness", body || "You have a new notification", url || "https://moneyfitness.app");
    console.log("[sendPush] Push result:", result.status, result.statusText);

    return new Response(JSON.stringify({ status: result.status }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("[sendPush] Error:", e);
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
