import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const RESEND_API_URL = "https://api.resend.com/emails";

// Cibarius brand colors
const PRIMARY = "#22B6F2";
const PRIMARY_DARK = "#0B7DBE";
const BG = "#F3F5F8";
const TEXT_DARK = "#1E2530";
const TEXT_MUTED = "#6B7280";

const FROM = "Cibarius <onboarding@resend.dev>"; // change to noreply@tuodominio.com when domain verified

function baseHtml(title: string, body: string): string {
  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${title}</title></head>
<body style="margin:0;padding:0;background:${BG};font-family:'Inter',Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:${BG};padding:40px 0;">
<tr><td align="center">
<table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.06);">
<tr><td style="background:linear-gradient(135deg,${PRIMARY},${PRIMARY_DARK});padding:28px 32px;text-align:center;">
<span style="font-size:24px;font-weight:700;color:#ffffff;font-family:'Fredoka',Arial,sans-serif;">Cibarius</span>
</td></tr>
<tr><td style="padding:32px;">${body}</td></tr>
<tr><td style="padding:0 32px 24px;text-align:center;">
<p style="font-size:12px;color:${TEXT_MUTED};margin:0;">© ${new Date().getFullYear()} Cibarius. Tutti i diritti riservati.</p>
</td></tr>
</table></td></tr></table></body></html>`;
}

function verificationEmail(name: string, link: string): { subject: string; html: string; text: string } {
  return {
    subject: "Conferma il tuo account Cibarius",
    html: baseHtml("Conferma account", `
      <h1 style="font-size:22px;color:${TEXT_DARK};margin:0 0 16px;font-family:'Fredoka',Arial,sans-serif;">Benvenuto, ${name}! 🎉</h1>
      <p style="font-size:15px;color:${TEXT_DARK};line-height:1.6;margin:0 0 24px;">
        Grazie per esserti registrato su Cibarius. Per iniziare a gestire la tua alimentazione in modo intelligente, conferma il tuo indirizzo email.
      </p>
      <table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center">
        <a href="${link}" style="display:inline-block;background:${PRIMARY};color:#ffffff;padding:14px 32px;border-radius:12px;font-size:16px;font-weight:600;text-decoration:none;">
          Conferma email
        </a>
      </td></tr></table>
      <p style="font-size:13px;color:${TEXT_MUTED};margin:24px 0 0;line-height:1.5;">
        Se non hai creato un account su Cibarius, puoi ignorare questa email.
      </p>
    `),
    text: `Benvenuto ${name}! Conferma il tuo account Cibarius: ${link}`,
  };
}

function passwordResetEmail(name: string, link: string): { subject: string; html: string; text: string } {
  return {
    subject: "Recupera la password del tuo account Cibarius",
    html: baseHtml("Reset password", `
      <h1 style="font-size:22px;color:${TEXT_DARK};margin:0 0 16px;font-family:'Fredoka',Arial,sans-serif;">Ciao, ${name}</h1>
      <p style="font-size:15px;color:${TEXT_DARK};line-height:1.6;margin:0 0 24px;">
        Hai richiesto di reimpostare la password del tuo account Cibarius. Clicca il pulsante qui sotto per procedere.
      </p>
      <table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center">
        <a href="${link}" style="display:inline-block;background:${PRIMARY};color:#ffffff;padding:14px 32px;border-radius:12px;font-size:16px;font-weight:600;text-decoration:none;">
          Reimposta password
        </a>
      </td></tr></table>
      <p style="font-size:13px;color:${TEXT_MUTED};margin:24px 0 0;line-height:1.5;">
        ⏳ Il link scade tra 1 ora. Se non hai richiesto il reset, ignora questa email.
      </p>
    `),
    text: `Ciao ${name}, reimposta la tua password Cibarius: ${link} (scade tra 1 ora)`,
  };
}

interface ExpiryProduct {
  name: string;
  expiry_date: string;
  urgency: "oggi" | "domani" | "3_giorni";
}

function expiryAlertEmail(name: string, products: ExpiryProduct[], appUrl: string): { subject: string; html: string; text: string } {
  const badges: Record<string, { label: string; color: string }> = {
    oggi: { label: "Scade oggi", color: "#EF4444" },
    domani: { label: "Scade domani", color: "#F59E0B" },
    "3_giorni": { label: "Scade tra 3 giorni", color: "#3B82F6" },
  };

  const rows = products
    .map((p) => {
      const b = badges[p.urgency];
      return `<tr>
        <td style="padding:10px 12px;border-bottom:1px solid #f0f0f0;font-size:14px;color:${TEXT_DARK};">${p.name}</td>
        <td style="padding:10px 12px;border-bottom:1px solid #f0f0f0;text-align:right;">
          <span style="display:inline-block;background:${b.color};color:#fff;padding:3px 10px;border-radius:20px;font-size:12px;font-weight:600;">${b.label}</span>
        </td>
      </tr>`;
    })
    .join("");

  return {
    subject: "Hai prodotti da consumare presto su Cibarius",
    html: baseHtml("Avviso scadenze", `
      <h1 style="font-size:22px;color:${TEXT_DARK};margin:0 0 8px;font-family:'Fredoka',Arial,sans-serif;">Ciao, ${name} 👋</h1>
      <p style="font-size:15px;color:${TEXT_DARK};line-height:1.6;margin:0 0 20px;">
        Hai <strong>${products.length}</strong> prodott${products.length === 1 ? "o" : "i"} in scadenza nella tua dispensa.
      </p>
      <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e5e7eb;border-radius:12px;overflow:hidden;margin-bottom:24px;">
        <tr style="background:#f9fafb;">
          <th style="padding:10px 12px;text-align:left;font-size:13px;color:${TEXT_MUTED};font-weight:600;">Prodotto</th>
          <th style="padding:10px 12px;text-align:right;font-size:13px;color:${TEXT_MUTED};font-weight:600;">Stato</th>
        </tr>
        ${rows}
      </table>
      <table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center">
        <a href="${appUrl}" style="display:inline-block;background:${PRIMARY};color:#ffffff;padding:14px 32px;border-radius:12px;font-size:16px;font-weight:600;text-decoration:none;margin-right:8px;">
          Apri Cibarius
        </a>
      </td></tr></table>
    `),
    text: `Ciao ${name}, hai ${products.length} prodotti in scadenza su Cibarius. Apri l'app: ${appUrl}`,
  };
}

async function sendWithResend(apiKey: string, to: string, emailData: { subject: string; html: string; text: string }) {
  const res = await fetch(RESEND_API_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: FROM,
      to: [to],
      subject: emailData.subject,
      html: emailData.html,
      text: emailData.text,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Resend error ${res.status}: ${err}`);
  }
  return await res.json();
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (!RESEND_API_KEY) throw new Error("RESEND_API_KEY not configured");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { type, email, name, link, products, app_url, user_id } = await req.json();

    let emailData: { subject: string; html: string; text: string };

    switch (type) {
      case "verification":
        emailData = verificationEmail(name || "utente", link);
        break;
      case "password_reset":
        emailData = passwordResetEmail(name || "utente", link);
        break;
      case "expiry_alert":
        emailData = expiryAlertEmail(name || "utente", products || [], app_url || "https://simple-blue-frame.lovable.app");
        break;
      default:
        throw new Error(`Unknown email type: ${type}`);
    }

    const result = await sendWithResend(RESEND_API_KEY, email, emailData);

    // Log the email
    if (user_id) {
      await supabase.from("email_notifications_log").insert({
        user_id,
        email_type: type,
        status: "sent",
        metadata: { resend_id: result.id },
      });
    }

    return new Response(JSON.stringify({ success: true, id: result.id }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("send-email error:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
