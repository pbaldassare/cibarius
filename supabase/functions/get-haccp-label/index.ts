import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const url = new URL(req.url);
    const token = url.searchParams.get("token") || url.pathname.split("/").pop();
    if (!token || token.length < 16) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: label, error } = await supabase
      .from("haccp_preparation_labels")
      .select("id, restaurant_id, preparation_name, quantity, unit, production_date, expiration_date, conservation_type, internal_lot_code, operator_name, notes, allergens, status, cancel_reason, finalized_at")
      .eq("qr_token", token)
      .maybeSingle();

    if (error || !label) {
      return new Response(JSON.stringify({ error: "Etichetta non trovata" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const [{ data: rest }, { data: ingredients }, { data: pdocs }, { data: events }] = await Promise.all([
      supabase.from("restaurants").select("name, address").eq("id", label.restaurant_id).maybeSingle(),
      supabase.from("haccp_preparation_ingredients").select("ingredient_name, quantity_used, unit, source_lot_code, supplier_name, ingredient_expiration_date, origin_document_id").eq("preparation_label_id", label.id),
      supabase.from("haccp_preparation_documents").select("document_id").eq("preparation_label_id", label.id),
      supabase.from("haccp_label_audit_log").select("action, user_name, reason, metadata, created_at").eq("preparation_label_id", label.id).order("created_at", { ascending: true }),
    ]);

    let documents: any[] = [];
    if (pdocs && pdocs.length > 0) {
      const ids = pdocs.map((d: any) => d.document_id);
      const { data: docs } = await supabase
        .from("haccp_documents")
        .select("id, document_type, supplier_name, document_number, document_date, file_url, photo_url")
        .in("id", ids);
      documents = docs || [];
    }

    const today = new Date().toISOString().slice(0, 10);
    let computedStatus = "valido";
    if (label.status === "cancelled") computedStatus = "ritirato";
    else if (label.expiration_date < today) computedStatus = "scaduto";
    else if (label.status === "draft") computedStatus = "bozza";

    return new Response(
      JSON.stringify({
        label: { ...label, computed_status: computedStatus },
        restaurant: rest,
        ingredients: ingredients || [],
        documents,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e?.message || "Errore interno" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
