import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Stripe from "https://esm.sh/stripe@14.21.0?target=deno";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, stripe-signature",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY not configured");

    const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
    const stripe = new Stripe(stripeKey, { apiVersion: "2023-10-16" });

    const body = await req.text();
    let event: Stripe.Event;

    if (webhookSecret) {
      const sig = req.headers.get("stripe-signature");
      if (!sig) throw new Error("Missing stripe-signature header");
      event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
    } else {
      // Dev mode: parse without verification
      event = JSON.parse(body);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const adminClient = createClient(supabaseUrl, serviceKey);

    console.log("Stripe webhook event:", event.type);

    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as any;
        const userId = session.metadata?.supabase_user_id;
        const planId = session.metadata?.plan_id;
        const planType = session.metadata?.plan_type;
        const stripeSubId = session.subscription;
        const stripeCustomerId = session.customer;

        if (!userId) break;

        // Deactivate old subs of same type
        await adminClient
          .from("subscriptions")
          .update({ status: "cancelled", updated_at: new Date().toISOString() })
          .eq("user_id", userId)
          .eq("plan_type", planType)
          .in("status", ["trial", "active"]);

        // Create new subscription
        await adminClient.from("subscriptions").insert({
          user_id: userId,
          plan_type: planType,
          plan_id: planId,
          status: "active",
          stripe_customer_id: stripeCustomerId,
          stripe_subscription_id: stripeSubId,
          stripe_checkout_session_id: session.id,
          start_date: new Date().toISOString(),
          current_period_start: new Date().toISOString(),
        });

        console.log(`Subscription created for user ${userId}, plan ${planType}`);
        break;
      }

      case "customer.subscription.updated": {
        const sub = event.data.object as any;
        const userId = sub.metadata?.supabase_user_id;
        if (!userId) break;

        const status = sub.status === "active" ? "active"
          : sub.status === "trialing" ? "trial"
          : sub.status === "past_due" ? "past_due"
          : sub.status === "canceled" ? "cancelled"
          : sub.status;

        await adminClient
          .from("subscriptions")
          .update({
            status,
            cancel_at_period_end: sub.cancel_at_period_end || false,
            current_period_start: sub.current_period_start
              ? new Date(sub.current_period_start * 1000).toISOString()
              : null,
            current_period_end: sub.current_period_end
              ? new Date(sub.current_period_end * 1000).toISOString()
              : null,
            trial_end_date: sub.trial_end
              ? new Date(sub.trial_end * 1000).toISOString()
              : null,
            updated_at: new Date().toISOString(),
          })
          .eq("stripe_subscription_id", sub.id);

        console.log(`Subscription ${sub.id} updated to ${status}`);
        break;
      }

      case "customer.subscription.deleted": {
        const sub = event.data.object as any;
        await adminClient
          .from("subscriptions")
          .update({
            status: "cancelled",
            updated_at: new Date().toISOString(),
          })
          .eq("stripe_subscription_id", sub.id);

        console.log(`Subscription ${sub.id} cancelled`);
        break;
      }

      case "invoice.paid": {
        const invoice = event.data.object as any;
        const subId = invoice.subscription;

        // Find our subscription
        const { data: ourSub } = await adminClient
          .from("subscriptions")
          .select("id, user_id")
          .eq("stripe_subscription_id", subId)
          .maybeSingle();

        if (ourSub) {
          await adminClient.from("stripe_payments").insert({
            user_id: ourSub.user_id,
            subscription_id: ourSub.id,
            stripe_invoice_id: invoice.id,
            stripe_payment_intent_id: invoice.payment_intent,
            amount: (invoice.amount_paid || 0) / 100,
            currency: invoice.currency || "eur",
            status: "paid",
            paid_at: new Date().toISOString(),
          });
        }

        console.log(`Invoice ${invoice.id} paid`);
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as any;
        const subId = invoice.subscription;

        await adminClient
          .from("subscriptions")
          .update({
            status: "past_due",
            updated_at: new Date().toISOString(),
          })
          .eq("stripe_subscription_id", subId);

        const { data: ourSub } = await adminClient
          .from("subscriptions")
          .select("id, user_id")
          .eq("stripe_subscription_id", subId)
          .maybeSingle();

        if (ourSub) {
          await adminClient.from("stripe_payments").insert({
            user_id: ourSub.user_id,
            subscription_id: ourSub.id,
            stripe_invoice_id: invoice.id,
            stripe_payment_intent_id: invoice.payment_intent,
            amount: (invoice.amount_due || 0) / 100,
            currency: invoice.currency || "eur",
            status: "failed",
          });
        }

        console.log(`Invoice ${invoice.id} payment failed`);
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error("Webhook error:", e);
    return new Response(
      JSON.stringify({ error: e.message }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
