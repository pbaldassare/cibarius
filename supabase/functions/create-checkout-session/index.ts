import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Stripe from "https://esm.sh/stripe@14.21.0?target=deno";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY not configured");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing auth");

    const callerClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user } } = await callerClient.auth.getUser();
    if (!user) throw new Error("Unauthorized");

    const { plan_id, success_url, cancel_url, coupon_code } = await req.json();
    if (!plan_id) throw new Error("plan_id required");

    const adminClient = createClient(supabaseUrl, serviceKey);

    // Get plan
    const { data: plan, error: planErr } = await adminClient
      .from("subscription_plans")
      .select("*")
      .eq("id", plan_id)
      .eq("is_active", true)
      .single();
    if (planErr || !plan) throw new Error("Piano non trovato");

    // Get or create Stripe customer
    const stripe = new Stripe(stripeKey, { apiVersion: "2023-10-16" });

    // Check existing subscription for stripe_customer_id
    const { data: existingSub } = await adminClient
      .from("subscriptions")
      .select("stripe_customer_id")
      .eq("user_id", user.id)
      .not("stripe_customer_id", "is", null)
      .limit(1)
      .maybeSingle();

    let customerId = existingSub?.stripe_customer_id;

    if (!customerId) {
      // Get profile email
      const { data: profile } = await adminClient
        .from("profiles")
        .select("email, full_name")
        .eq("id", user.id)
        .single();

      const customer = await stripe.customers.create({
        email: profile?.email || user.email,
        name: profile?.full_name || undefined,
        metadata: { supabase_user_id: user.id },
      });
      customerId = customer.id;
    }

    // Build line items - use stripe_price_id if available, else create price from product
    let priceId = plan.stripe_price_id;

    if (!priceId && plan.stripe_product_id) {
      // List prices for this product to find matching one
      const prices = await stripe.prices.list({
        product: plan.stripe_product_id,
        active: true,
      });

      const interval = plan.billing_interval === "yearly" ? "year" : "month";
      const matchingPrice = prices.data.find(
        (p: any) => p.recurring?.interval === interval
      );

      if (matchingPrice) {
        priceId = matchingPrice.id;
        // Save it back for next time
        await adminClient
          .from("subscription_plans")
          .update({ stripe_price_id: priceId })
          .eq("id", plan.id);
      }
    }

    if (!priceId) {
      throw new Error("Nessun prezzo Stripe trovato per questo piano");
    }

    // Handle coupon
    let stripeDiscounts: any[] = [];
    if (coupon_code) {
      const { data: coupon } = await adminClient
        .from("custom_coupons")
        .select("*")
        .eq("code", coupon_code.toUpperCase())
        .eq("is_active", true)
        .single();

      if (coupon) {
        // Check validity
        const now = new Date();
        if (coupon.valid_from && new Date(coupon.valid_from) > now) throw new Error("Coupon non ancora valido");
        if (coupon.valid_until && new Date(coupon.valid_until) < now) throw new Error("Coupon scaduto");
        if (coupon.max_uses && coupon.current_uses >= coupon.max_uses) throw new Error("Coupon esaurito");
        if (coupon.applies_to_role_type && coupon.applies_to_role_type !== plan.role_type) throw new Error("Coupon non applicabile a questo piano");

        // Create Stripe coupon on-the-fly
        const stripeCoupon = await stripe.coupons.create({
          ...(coupon.discount_type === "percent"
            ? { percent_off: Number(coupon.discount_value) }
            : { amount_off: Math.round(Number(coupon.discount_value) * 100), currency: "eur" }),
          duration: "once",
          metadata: { cibarius_coupon_id: coupon.id },
        });

        stripeDiscounts = [{ coupon: stripeCoupon.id }];

        // Increment uses
        await adminClient
          .from("custom_coupons")
          .update({ current_uses: coupon.current_uses + 1 })
          .eq("id", coupon.id);
      }
    }

    // Create checkout session
    const sessionParams: any = {
      customer: customerId,
      mode: "subscription",
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: success_url || `${req.headers.get("origin") || "https://simple-blue-frame.lovable.app"}/subscription?success=true`,
      cancel_url: cancel_url || `${req.headers.get("origin") || "https://simple-blue-frame.lovable.app"}/subscription?cancelled=true`,
      metadata: {
        supabase_user_id: user.id,
        plan_id: plan.id,
        plan_type: plan.role_type,
      },
      subscription_data: {
        metadata: {
          supabase_user_id: user.id,
          plan_id: plan.id,
          plan_type: plan.role_type,
        },
      },
    };

    // Add trial for restaurant plans
    if (plan.trial_days > 0) {
      sessionParams.subscription_data.trial_period_days = plan.trial_days;
    }

    if (stripeDiscounts.length > 0) {
      sessionParams.discounts = stripeDiscounts;
    }

    const session = await stripe.checkout.sessions.create(sessionParams);

    return new Response(
      JSON.stringify({ url: session.url, session_id: session.id }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e: any) {
    console.error("Checkout error:", e);
    return new Response(
      JSON.stringify({ error: e.message }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
