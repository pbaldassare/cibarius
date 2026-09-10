import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const today = new Date();
    const todayStr = today.toISOString().slice(0, 10);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().slice(0, 10);
    const threeDays = new Date(today);
    threeDays.setDate(threeDays.getDate() + 3);
    const threeDaysStr = threeDays.toISOString().slice(0, 10);

    // Find all inventory items expiring within 3 days (user items only)
    const { data: items, error: itemsErr } = await supabase
      .from("inventory_items")
      .select("owner_user_id, expiry_date, product_id, products(name)")
      .not("owner_user_id", "is", null)
      .not("expiry_date", "is", null)
      .lte("expiry_date", threeDaysStr)
      .gte("expiry_date", todayStr);

    if (itemsErr) throw itemsErr;

    const urgencyOf = (expiry: string): string => {
      if (expiry === todayStr) return "oggi";
      if (expiry === tomorrowStr) return "domani";
      return "3_giorni";
    };

    // Group by user
    const byUser: Record<string, { name: string; expiry_date: string; urgency: string }[]> = {};
    for (const item of items ?? []) {
      const uid = item.owner_user_id!;
      if (!byUser[uid]) byUser[uid] = [];
      const productName = (item as any).products?.name || "Prodotto";
      byUser[uid].push({
        name: productName,
        expiry_date: item.expiry_date!,
        urgency: urgencyOf(item.expiry_date!),
      });
    }

    let sentCount = 0;
    const errors: string[] = [];

    for (const [userId, products] of Object.entries(byUser)) {
      // Check email preferences
      const { data: prefs } = await supabase
        .from("email_preferences")
        .select("receive_expiry_alerts")
        .eq("user_id", userId)
        .single();

      if (prefs && !prefs.receive_expiry_alerts) continue;

      // Check if already sent today
      const { data: existingLog } = await supabase
        .from("email_notifications_log")
        .select("id")
        .eq("user_id", userId)
        .eq("email_type", "expiry_alert")
        .gte("sent_at", todayStr + "T00:00:00Z")
        .limit(1);

      if (existingLog && existingLog.length > 0) continue;

      // Get user profile
      const { data: profile } = await supabase
        .from("profiles")
        .select("email, full_name")
        .eq("id", userId)
        .single();

      if (!profile?.email) continue;

      // Call send-email function
      try {
        const sendRes = await fetch(`${supabaseUrl}/functions/v1/send-email`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${supabaseServiceKey}`,
          },
          body: JSON.stringify({
            type: "expiry_alert",
            email: profile.email,
            name: profile.full_name || "utente",
            products,
            user_id: userId,
            app_url: "https://simple-blue-frame.lovable.app",
          }),
        });

        if (!sendRes.ok) {
          const errText = await sendRes.text();
          errors.push(`User ${userId}: ${errText}`);
        } else {
          sentCount++;
        }
      } catch (e) {
        errors.push(`User ${userId}: ${(e as Error).message}`);
      }
    }

    /*
     * Passaggio ristorante.
     *
     * La query sopra filtra `owner_user_id not null`, cioe' solo la dispensa
     * dei consumer: l'inventario dei ristoranti (che ha `restaurant_id` e
     * `owner_user_id` nullo) non e' mai stato coperto, quindi in cucina non
     * arrivava nessun avviso di scadenza. Anche le preparazioni interne
     * rientrano, perche' hanno la stessa urgenza dei lotti acquistati.
     */
    const [restItemsRes, restPrepsRes] = await Promise.all([
      supabase
        .from("inventory_items")
        .select("restaurant_id, expiry_date, products(name)")
        .not("restaurant_id", "is", null)
        .not("expiry_date", "is", null)
        .lte("expiry_date", threeDaysStr)
        .gte("expiry_date", todayStr),
      supabase
        .from("preparations")
        .select("restaurant_id, name, use_by_date")
        .not("restaurant_id", "is", null)
        .lte("use_by_date", threeDaysStr)
        .gte("use_by_date", todayStr),
    ]);

    const byRestaurant: Record<string, { name: string; expiry_date: string; urgency: string }[]> = {};

    for (const item of restItemsRes.data ?? []) {
      const rid = (item as any).restaurant_id as string;
      if (!byRestaurant[rid]) byRestaurant[rid] = [];
      byRestaurant[rid].push({
        name: (item as any).products?.name || "Prodotto",
        expiry_date: (item as any).expiry_date,
        urgency: urgencyOf((item as any).expiry_date),
      });
    }

    for (const prep of restPrepsRes.data ?? []) {
      const rid = (prep as any).restaurant_id as string;
      if (!byRestaurant[rid]) byRestaurant[rid] = [];
      byRestaurant[rid].push({
        name: `${(prep as any).name} (preparazione)`,
        expiry_date: (prep as any).use_by_date,
        urgency: urgencyOf((prep as any).use_by_date),
      });
    }

    let restaurantSent = 0;

    for (const [restaurantId, products] of Object.entries(byRestaurant)) {
      const { data: restaurant } = await supabase
        .from("restaurants")
        .select("name, owner_id")
        .eq("id", restaurantId)
        .single();

      if (!restaurant?.owner_id) continue;
      const ownerId = restaurant.owner_id as string;

      const { data: prefs } = await supabase
        .from("email_preferences")
        .select("receive_expiry_alerts")
        .eq("user_id", ownerId)
        .single();

      if (prefs && !prefs.receive_expiry_alerts) continue;

      // Un solo avviso al giorno per ristorante, come per i consumer.
      const { data: existingLog } = await supabase
        .from("email_notifications_log")
        .select("id")
        .eq("user_id", ownerId)
        .eq("email_type", "expiry_alert_restaurant")
        .gte("sent_at", todayStr + "T00:00:00Z")
        .limit(1);

      if (existingLog && existingLog.length > 0) continue;

      const { data: profile } = await supabase
        .from("profiles")
        .select("email, full_name")
        .eq("id", ownerId)
        .single();

      if (!profile?.email) continue;

      try {
        const sendRes = await fetch(`${supabaseUrl}/functions/v1/send-email`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${supabaseServiceKey}`,
          },
          body: JSON.stringify({
            type: "expiry_alert_restaurant",
            email: profile.email,
            name: profile.full_name || "utente",
            restaurant_name: restaurant.name,
            products: products.sort((a, b) => a.expiry_date.localeCompare(b.expiry_date)),
            user_id: ownerId,
            app_url: "https://simple-blue-frame.lovable.app",
          }),
        });

        if (!sendRes.ok) {
          errors.push(`Restaurant ${restaurantId}: ${await sendRes.text()}`);
        } else {
          restaurantSent++;
        }
      } catch (e) {
        errors.push(`Restaurant ${restaurantId}: ${(e as Error).message}`);
      }
    }

    return new Response(
      JSON.stringify({
        message: "Expiry alerts processed",
        sent: sentCount + restaurantSent,
        users: sentCount,
        restaurants: restaurantSent,
        errors,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("send-expiry-alerts error:", error);
    return new Response(
      JSON.stringify({ success: false, error: (error as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
