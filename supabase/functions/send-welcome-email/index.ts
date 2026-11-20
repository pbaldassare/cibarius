import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const reply = (body: object, status = 200) => Response.json(body, { status, headers: corsHeaders });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return reply({ error: "Method not allowed" }, 405);
  const token = req.headers.get("Authorization")?.match(/^Bearer (.+)$/i)?.[1];
  if (!token) return reply({ error: "Unauthorized" }, 401);

  try {
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const verified = await supabase.auth.getUser(token);
    const user = verified.data.user;
    if (verified.error || !user?.email || !user.email_confirmed_at || user.user_metadata.welcome_email_requested !== "v1") {
      return reply({ error: "Unauthorized" }, 401);
    }

    const previous = await supabase.from("email_notifications_log").select("id")
      .eq("user_id", user.id).eq("email_type", "welcome").eq("status", "sent").limit(1);
    if (previous.error) throw new Error("Unable to read notification history");
    if (previous.data.length) return reply({ success: true });

    const keyResult = await supabase.rpc("get_resend_api_key");
    const apiKey = keyResult.data || Deno.env.get("RESEND_API_KEY");
    if (!apiKey) throw new Error("Email provider not configured");

    const appUrl = "https://cibarius.online/auth/login";
    const subject = "Benvenuto in Cibarius!";
    const text = `${subject} Il tuo account è pronto. Accedi qui: ${appUrl}`;
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "Idempotency-Key": `cibarius-welcome/${user.id}`,
      },
      body: JSON.stringify({
        from: "Cibarius <noreply@cibarius.online>",
        to: [user.email],
        subject,
        text,
        html: `<h1>${subject}</h1><p>Il tuo account è pronto. Accedi per iniziare a usare Cibarius.</p>
          <p><a href="${appUrl}">Apri Cibarius</a></p>`,
      }),
    });
    if (!res.ok) throw new Error(`Email provider rejected request (${res.status})`);
    const result = await res.json();
    if (typeof result.id !== "string") throw new Error("Missing email delivery identifier");

    const logged = await supabase.from("email_notifications_log").insert({
      user_id: user.id, email_type: "welcome", status: "sent", metadata: { resend_id: result.id },
    });
    if (logged.error) throw new Error("Unable to record notification");
    return reply({ success: true });
  } catch (error) {
    console.error("welcome-email:", error instanceof Error ? error.message : "unexpected error");
    return reply({ error: "Unable to send welcome email" }, 500);
  }
});
