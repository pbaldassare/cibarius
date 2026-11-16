import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

/**
 * Il titolare invita un operatore: crea l'account (ruolo restaurant_staff),
 * lo collega al ristorante e Supabase manda la mail di invito (auth-email-hook,
 * tipo "invite") con il link per scegliere la password.
 */
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Non autenticato" }, 401);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const callerClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user: caller } } = await callerClient.auth.getUser();
    if (!caller) return json({ error: "Non autenticato" }, 401);

    const admin = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    const { data: restaurant } = await admin.from("restaurants").select("id").eq("owner_id", caller.id).maybeSingle();
    if (!restaurant) return json({ error: "Solo il titolare del ristorante può invitare operatori" }, 403);

    const body = await req.json().catch(() => ({}));
    const email = String(body.email ?? "").trim().toLowerCase();
    const fullName = String(body.full_name ?? "").trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return json({ error: "Email non valida" }, 400);
    if (!fullName) return json({ error: "Inserisci il nome dell'operatore" }, 400);

    const { data: existing } = await admin.from("profiles").select("id").eq("email", email).maybeSingle();
    if (existing) return json({ error: "Questa email ha già un account Cibarius: usa un'altra email per l'operatore" }, 409);

    const { data: invited, error: inviteError } = await admin.auth.admin.inviteUserByEmail(email, {
      data: { full_name: fullName, email },
    });
    if (inviteError || !invited.user) return json({ error: inviteError?.message ?? "Invito non riuscito" }, 400);

    const userId = invited.user.id;
    const { error: roleError } = await admin.from("profiles").update({ role: "restaurant_staff", full_name: fullName }).eq("id", userId);
    const { error: memberError } = await admin.from("restaurant_members")
      .insert({ restaurant_id: restaurant.id, user_id: userId, member_role: "staff" });
    if (roleError || memberError) {
      // Senza ruolo o collegamento l'account non serve a niente: meglio toglierlo.
      await admin.auth.admin.deleteUser(userId);
      return json({ error: (roleError ?? memberError)!.message }, 500);
    }

    return json({ success: true, user_id: userId });
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});
