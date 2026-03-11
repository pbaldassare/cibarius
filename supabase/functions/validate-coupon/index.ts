import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing auth");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Get caller
    const callerClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user } } = await callerClient.auth.getUser();
    if (!user) throw new Error("Unauthorized");

    const { coupon_code } = await req.json();
    if (!coupon_code) throw new Error("coupon_code required");

    const adminClient = createClient(supabaseUrl, serviceKey);

    // Fetch coupon
    const { data: coupon, error: couponErr } = await adminClient
      .from("nutritionist_coupons")
      .select("*")
      .eq("coupon_code", coupon_code.toUpperCase().trim())
      .eq("is_active", true)
      .single();

    if (couponErr || !coupon) {
      return new Response(JSON.stringify({ valid: false, error: "Codice coupon non valido" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Can't use own coupon
    if (coupon.nutritionist_user_id === user.id) {
      return new Response(JSON.stringify({ valid: false, error: "Non puoi usare il tuo coupon" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check max uses
    if (coupon.max_uses && coupon.current_uses >= coupon.max_uses) {
      return new Response(JSON.stringify({ valid: false, error: "Coupon esaurito" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check validity dates
    const now = new Date();
    if (coupon.valid_from && new Date(coupon.valid_from) > now) {
      return new Response(JSON.stringify({ valid: false, error: "Coupon non ancora valido" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (coupon.valid_until && new Date(coupon.valid_until) < now) {
      return new Response(JSON.stringify({ valid: false, error: "Coupon scaduto" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get nutritionist name
    const { data: nutProfile } = await adminClient
      .from("profiles")
      .select("full_name")
      .eq("id", coupon.nutritionist_user_id)
      .single();

    return new Response(JSON.stringify({
      valid: true,
      coupon_id: coupon.id,
      coupon_code: coupon.coupon_code,
      client_discount_percent: coupon.client_discount_percent,
      nutritionist_name: nutProfile?.full_name || "Nutrizionista",
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ valid: false, error: e.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
