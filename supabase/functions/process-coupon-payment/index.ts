import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

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

    const callerClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user } } = await callerClient.auth.getUser();
    if (!user) throw new Error("Unauthorized");

    const { coupon_id, original_amount } = await req.json();
    if (!original_amount || original_amount <= 0) throw new Error("original_amount required");

    const adminClient = createClient(supabaseUrl, serviceKey);

    let discount_percent = 0;
    let commission_percent = 0;
    let coupon: any = null;

    if (coupon_id) {
      const { data, error } = await adminClient
        .from("nutritionist_coupons")
        .select("*")
        .eq("id", coupon_id)
        .eq("is_active", true)
        .single();
      if (error || !data) throw new Error("Coupon non valido");
      if (data.nutritionist_user_id === user.id) throw new Error("Non puoi usare il tuo coupon");
      if (data.max_uses && data.current_uses >= data.max_uses) throw new Error("Coupon esaurito");

      coupon = data;
      discount_percent = data.client_discount_percent;
      commission_percent = data.nutritionist_commission_percent;
    }

    const discount_amount = round2(original_amount * discount_percent / 100);
    const final_amount = round2(original_amount - discount_amount);
    const commission_amount = round2(final_amount * commission_percent / 100);

    // 1. Create payment record
    const { data: payment, error: payErr } = await adminClient
      .from("subscription_payments")
      .insert({
        user_id: user.id,
        original_amount,
        discount_percent,
        discount_amount,
        final_amount,
        coupon_id: coupon?.id || null,
        coupon_code: coupon?.coupon_code || null,
        payment_status: "completed",
      })
      .select()
      .single();
    if (payErr) throw payErr;

    if (coupon) {
      // 2. Increment coupon uses
      await adminClient
        .from("nutritionist_coupons")
        .update({ current_uses: coupon.current_uses + 1 })
        .eq("id", coupon.id);

      // 3. Create client-nutritionist link
      await adminClient
        .from("user_nutritionist_links")
        .upsert({
          client_user_id: user.id,
          nutritionist_user_id: coupon.nutritionist_user_id,
          coupon_id: coupon.id,
          link_source: "coupon",
          is_active: true,
        }, { onConflict: "client_user_id,nutritionist_user_id" });

      // 4. Create commission
      await adminClient
        .from("nutritionist_commissions")
        .insert({
          nutritionist_user_id: coupon.nutritionist_user_id,
          client_user_id: user.id,
          payment_id: payment.id,
          coupon_id: coupon.id,
          original_amount,
          final_paid_amount: final_amount,
          commission_percent,
          commission_amount,
          status: "pending",
        });
    }

    return new Response(JSON.stringify({
      success: true,
      payment_id: payment.id,
      final_amount,
      discount_amount,
      commission_amount: coupon ? commission_amount : 0,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
