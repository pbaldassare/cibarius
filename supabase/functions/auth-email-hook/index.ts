import { Webhook } from "https://esm.sh/standardwebhooks@1.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const RESEND_API_URL = "https://api.resend.com/emails";

// Cibarius brand
const PRIMARY = "#22B6F2";
const PRIMARY_DARK = "#0B7DBE";
const BG = "#F3F5F8";
const TEXT_DARK = "#1E2530";
const TEXT_MUTED = "#6B7280";
const FROM = "Cibarius <noreply@cibarius.online>";

const SITE_URL = "https://simple-blue-frame.lovable.app";

// Function to construct base HTML email template
// Function to construct base HTML email template
// Function to construct base HTML email template

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

function buildConfirmUrl(tokenHash: string, type: string, redirectTo?: string): string {
  let url = `${SITE_URL}/auth/callback?token_hash=${tokenHash}&type=${type}`;
  if (redirectTo) url += `&next=${encodeURIComponent(redirectTo)}`;
  return url;
}

interface EmailResult {
  subject: string;
  html: string;
  text: string;
}

function signupEmail(name: string, confirmUrl: string): EmailResult {
  return {
    subject: "Conferma il tuo account Cibarius",
    html: baseHtml("Conferma account", `
      <h1 style="font-size:22px;color:${TEXT_DARK};margin:0 0 16px;font-family:'Fredoka',Arial,sans-serif;">Benvenuto, ${name}! 🎉</h1>
      <p style="font-size:15px;color:${TEXT_DARK};line-height:1.6;margin:0 0 24px;">
        Grazie per esserti registrato su Cibarius. Per iniziare, conferma il tuo indirizzo email.
      </p>
      <table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center">
        <a href="${confirmUrl}" style="display:inline-block;background:${PRIMARY};color:#ffffff;padding:14px 32px;border-radius:12px;font-size:16px;font-weight:600;text-decoration:none;">
          Conferma email
        </a>
      </td></tr></table>
      <p style="font-size:13px;color:${TEXT_MUTED};margin:24px 0 0;line-height:1.5;">
        Se non hai creato un account su Cibarius, puoi ignorare questa email.
      </p>
    `),
    text: `Benvenuto ${name}! Conferma il tuo account Cibarius: ${confirmUrl}`,
  };
}

function recoveryEmail(name: string, confirmUrl: string): EmailResult {
  return {
    subject: "Recupera la password del tuo account Cibarius",
    html: baseHtml("Reset password", `
      <h1 style="font-size:22px;color:${TEXT_DARK};margin:0 0 16px;font-family:'Fredoka',Arial,sans-serif;">Ciao, ${name}</h1>
      <p style="font-size:15px;color:${TEXT_DARK};line-height:1.6;margin:0 0 24px;">
        Hai richiesto di reimpostare la password del tuo account Cibarius.
      </p>
      <table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center">
        <a href="${confirmUrl}" style="display:inline-block;background:${PRIMARY};color:#ffffff;padding:14px 32px;border-radius:12px;font-size:16px;font-weight:600;text-decoration:none;">
          Reimposta password
        </a>
      </td></tr></table>
      <p style="font-size:13px;color:${TEXT_MUTED};margin:24px 0 0;line-height:1.5;">
        ⏳ Il link scade tra 1 ora. Se non hai richiesto il reset, ignora questa email.
      </p>
    `),
    text: `Ciao ${name}, reimposta la tua password Cibarius: ${confirmUrl}`,
  };
}

function emailChangeEmail(name: string, confirmUrl: string): EmailResult {
  return {
    subject: "Conferma il cambio email su Cibarius",
    html: baseHtml("Cambio email", `
      <h1 style="font-size:22px;color:${TEXT_DARK};margin:0 0 16px;font-family:'Fredoka',Arial,sans-serif;">Ciao, ${name}</h1>
      <p style="font-size:15px;color:${TEXT_DARK};line-height:1.6;margin:0 0 24px;">
        Hai richiesto di cambiare l'indirizzo email del tuo account Cibarius. Conferma cliccando il pulsante.
      </p>
      <table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center">
        <a href="${confirmUrl}" style="display:inline-block;background:${PRIMARY};color:#ffffff;padding:14px 32px;border-radius:12px;font-size:16px;font-weight:600;text-decoration:none;">
          Conferma nuova email
        </a>
      </td></tr></table>
      <p style="font-size:13px;color:${TEXT_MUTED};margin:24px 0 0;line-height:1.5;">
        Se non hai richiesto questa modifica, ignora questa email.
      </p>
    `),
    text: `Ciao ${name}, conferma il cambio email Cibarius: ${confirmUrl}`,
  };
}

function magicLinkEmail(name: string, confirmUrl: string): EmailResult {
  return {
    subject: "Il tuo link di accesso a Cibarius",
    html: baseHtml("Magic Link", `
      <h1 style="font-size:22px;color:${TEXT_DARK};margin:0 0 16px;font-family:'Fredoka',Arial,sans-serif;">Ciao, ${name}</h1>
      <p style="font-size:15px;color:${TEXT_DARK};line-height:1.6;margin:0 0 24px;">
        Clicca il pulsante per accedere al tuo account Cibarius.
      </p>
      <table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center">
        <a href="${confirmUrl}" style="display:inline-block;background:${PRIMARY};color:#ffffff;padding:14px 32px;border-radius:12px;font-size:16px;font-weight:600;text-decoration:none;">
          Accedi a Cibarius
        </a>
      </td></tr></table>
      <p style="font-size:13px;color:${TEXT_MUTED};margin:24px 0 0;line-height:1.5;">
        ⏳ Il link scade tra 1 ora.
      </p>
    `),
    text: `Accedi a Cibarius: ${confirmUrl}`,
  };
}

async function sendWithResend(apiKey: string, to: string, emailData: EmailResult) {
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

    const HOOK_SECRET = Deno.env.get("SEND_EMAIL_HOOK_SECRET");
    if (!HOOK_SECRET) throw new Error("SEND_EMAIL_HOOK_SECRET not configured");

    // Read raw payload for signature verification
    const payloadText = await req.text();
    console.log("Raw payload received, length:", payloadText.length);

    // Verify webhook signature
    // The secret from Supabase dashboard has prefix "v1,whsec_" - we need just the base64 part
    const secretPart = HOOK_SECRET.startsWith("v1,whsec_")
      ? HOOK_SECRET.replace("v1,whsec_", "")
      : HOOK_SECRET;

    const wh = new Webhook(`whsec_${secretPart}`);

    const headers = {
      "webhook-id": req.headers.get("webhook-id") || "",
      "webhook-timestamp": req.headers.get("webhook-timestamp") || "",
      "webhook-signature": req.headers.get("webhook-signature") || "",
    };

    // deno-lint-ignore no-explicit-any
    const payload = wh.verify(payloadText, headers) as any;
    console.log("Webhook verified successfully, type:", payload.type);

    // Extract user and email_data from verified payload
    const user = payload.user;
    const emailData = payload.email_data;

    if (!user || !emailData) {
      throw new Error("Invalid auth hook payload - missing user or email_data");
    }

    const email = user.email;
    const name = user.user_metadata?.full_name || "utente";
    const tokenHash = emailData.token_hash;
    const emailActionType = emailData.email_action_type;
    const redirectTo = emailData.redirect_to;

    console.log(`Processing email: type=${emailActionType}, to=${email}`);

    let emailContent: EmailResult;

    switch (emailActionType) {
      case "signup": {
        const confirmUrl = buildConfirmUrl(tokenHash, "signup", redirectTo);
        emailContent = signupEmail(name, confirmUrl);
        break;
      }
      case "recovery": {
        const confirmUrl = buildConfirmUrl(tokenHash, "recovery", redirectTo || "/reset-password");
        emailContent = recoveryEmail(name, confirmUrl);
        break;
      }
      case "email_change": {
        const confirmUrl = buildConfirmUrl(tokenHash, "email_change", redirectTo);
        emailContent = emailChangeEmail(name, confirmUrl);
        break;
      }
      case "magiclink": {
        const confirmUrl = buildConfirmUrl(tokenHash, "magiclink", redirectTo);
        emailContent = magicLinkEmail(name, confirmUrl);
        break;
      }
      default: {
        const confirmUrl = buildConfirmUrl(tokenHash, emailActionType, redirectTo);
        emailContent = signupEmail(name, confirmUrl);
        break;
      }
    }

    const result = await sendWithResend(RESEND_API_KEY, email, emailContent);
    console.log("Email sent via Resend:", result);

    // Return expected response for Supabase Auth Hook
    return new Response(JSON.stringify({}), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("auth-email-hook error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
