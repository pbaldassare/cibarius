import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

/*
 * Email al titolare per una temperatura HACCP fuori soglia.
 *
 * La chiama il trigger haccp_temperature_alert con il solo id della lettura.
 * Siccome la funzione e' raggiungibile senza JWT, non si fida di nulla che
 * arrivi dalla richiesta: rilegge la lettura, ricalcola la soglia nel database
 * e manda al massimo un'email per lettura.
 */
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { temperature_log_id } = await req.json();
    if (typeof temperature_log_id !== "string") return json({ skipped: "missing id" }, 400);

    const { data: log } = await supabase
      .from("haccp_temperature_logs")
      .select("id, restaurant_id, equipment_type, equipment_name, temperature_value, recorded_by_name, recorded_at")
      .eq("id", temperature_log_id)
      .maybeSingle();
    if (!log) return json({ skipped: "not found" });

    const { data: max } = await supabase.rpc("haccp_temperature_max", { _equipment_type: log.equipment_type });
    if (max === null || max === undefined || Number(log.temperature_value) <= Number(max)) {
      return json({ skipped: "within limit" });
    }

    const { data: restaurant } = await supabase
      .from("restaurants")
      .select("name, owner_id")
      .eq("id", log.restaurant_id)
      .single();
    if (!restaurant?.owner_id) return json({ skipped: "no owner" });

    const { data: alreadySent } = await supabase
      .from("email_notifications_log")
      .select("id")
      .eq("user_id", restaurant.owner_id)
      .eq("email_type", "temperature_alert")
      .eq("metadata->>temperature_log_id", log.id)
      .limit(1);
    if (alreadySent && alreadySent.length > 0) return json({ skipped: "already sent" });

    const { data: profile } = await supabase
      .from("profiles")
      .select("email, full_name")
      .eq("id", restaurant.owner_id)
      .single();
    if (!profile?.email) return json({ skipped: "no email" });

    const sendRes = await fetch(`${supabaseUrl}/functions/v1/send-email`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${supabaseServiceKey}`,
      },
      body: JSON.stringify({
        type: "temperature_alert",
        email: profile.email,
        name: profile.full_name || "utente",
        restaurant_name: restaurant.name,
        temperature: {
          equipment_name: log.equipment_name,
          value: Number(log.temperature_value),
          max: Number(max),
          recorded_by: log.recorded_by_name,
          recorded_at: log.recorded_at,
        },
        app_url: "https://cibarius.online",
      }),
    });
    if (!sendRes.ok) throw new Error(await sendRes.text());
    const { id: resendId } = await sendRes.json();

    await supabase.from("email_notifications_log").insert({
      user_id: restaurant.owner_id,
      email_type: "temperature_alert",
      status: "sent",
      metadata: { resend_id: resendId, temperature_log_id: log.id },
    });

    return json({ success: true });
  } catch (error) {
    console.error("send-temperature-alert error:", error);
    return json({ success: false, error: (error as Error).message }, 500);
  }
});
