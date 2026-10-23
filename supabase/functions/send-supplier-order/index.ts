import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

/*
 * Email al fornitore per un nuovo ordine.
 *
 * La chiama create_supplier_order con il solo id dell'ordine. La funzione e'
 * raggiungibile senza JWT, quindi rilegge tutto dal database e manda al
 * massimo un'email per ordine.
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

    const { order_id } = await req.json();
    if (typeof order_id !== "string") return json({ skipped: "missing id" }, 400);

    const { data: order } = await supabase
      .from("supplier_orders")
      .select("id, supplier_id, restaurant_id, status, total, notes, requested_delivery_date, created_at")
      .eq("id", order_id)
      .maybeSingle();
    if (!order || order.status !== "inviato") return json({ skipped: "not found or not new" });

    const [{ data: supplier }, { data: restaurant }, { data: items }] = await Promise.all([
      supabase.from("suppliers").select("name, email, owner_user_id").eq("id", order.supplier_id).single(),
      supabase.from("restaurants").select("name, address, phone").eq("id", order.restaurant_id).single(),
      supabase.from("supplier_order_items").select("product_name, unit, unit_price, quantity, line_total").eq("order_id", order.id),
    ]);
    if (!supplier?.owner_user_id) return json({ skipped: "no supplier" });

    const { data: alreadySent } = await supabase
      .from("email_notifications_log")
      .select("id")
      .eq("user_id", supplier.owner_user_id)
      .eq("email_type", "supplier_order")
      .eq("metadata->>order_id", order.id)
      .limit(1);
    if (alreadySent && alreadySent.length > 0) return json({ skipped: "already sent" });

    let email = supplier.email as string | null;
    let name = supplier.name as string;
    if (!email) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("email, full_name")
        .eq("id", supplier.owner_user_id)
        .single();
      email = profile?.email ?? null;
      name = name || profile?.full_name || "fornitore";
    }
    if (!email) return json({ skipped: "no email" });

    const sendRes = await fetch(`${supabaseUrl}/functions/v1/send-email`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${supabaseServiceKey}`,
      },
      body: JSON.stringify({
        type: "supplier_order",
        email,
        name,
        restaurant_name: restaurant?.name ?? "Ristorante",
        order: {
          created_at: order.created_at,
          total: Number(order.total ?? 0),
          notes: order.notes,
          requested_delivery_date: order.requested_delivery_date,
          restaurant_address: restaurant?.address ?? null,
          restaurant_phone: restaurant?.phone ?? null,
          items: (items ?? []).map((i) => ({
            name: i.product_name,
            unit: i.unit,
            quantity: Number(i.quantity),
            unit_price: i.unit_price === null ? null : Number(i.unit_price),
            line_total: i.line_total === null ? null : Number(i.line_total),
          })),
        },
        app_url: "https://cibarius.online",
      }),
    });
    if (!sendRes.ok) throw new Error(await sendRes.text());
    const { id: resendId } = await sendRes.json();

    await supabase.from("email_notifications_log").insert({
      user_id: supplier.owner_user_id,
      email_type: "supplier_order",
      status: "sent",
      metadata: { resend_id: resendId, order_id: order.id },
    });

    return json({ success: true });
  } catch (error) {
    console.error("send-supplier-order error:", error);
    return json({ success: false, error: (error as Error).message }, 500);
  }
});
