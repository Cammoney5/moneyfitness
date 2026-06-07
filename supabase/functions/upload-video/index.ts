// upload-video: Proxies video uploads to Cloudflare Stream
// Deploy: supabase functions deploy upload-video --project-ref ebphyejgauwgguwcbmgj --no-verify-jwt

const CF_ACCOUNT_ID = Deno.env.get("CF_ACCOUNT_ID") || "";
const CF_API_TOKEN = Deno.env.get("CF_API_TOKEN") || "";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;
    if (!file) return new Response(JSON.stringify({ error: "no file" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const cfForm = new FormData();
    cfForm.append("file", file);

    const res = await fetch(`https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT_ID}/stream`, {
      method: "POST",
      headers: { "Authorization": `Bearer ${CF_API_TOKEN}` },
      body: cfForm,
    });

    const data = await res.json();
    if (!data.success) throw new Error(JSON.stringify(data.errors));

    const videoId = data.result.uid;
    const playbackUrl = `https://customer-kupjzu67w3p3e7y5.cloudflarestream.com/${videoId}/iframe`;

    return new Response(JSON.stringify({ videoId, playbackUrl }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  } catch (e) {
    console.error("upload-video error:", e);
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
