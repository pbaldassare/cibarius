import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import {
  verifyRestaurantApiKey,
  ingestStockForRestaurant,
  type IngestPayload,
} from "./ingestStock.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-restaurant-key",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const authHeader = req.headers.get("authorization");
    const rawKey =
      req.headers.get("x-restaurant-key") ||
      (authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null);

    if (!rawKey) {
      return new Response(JSON.stringify({ error: "Chiave API mancante (x-restaurant-key o Bearer)" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const sb = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const verified = await verifyRestaurantApiKey(sb, rawKey);
    if (!verified) {
      return new Response(JSON.stringify({ error: "Chiave API non valida" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const payload = (await req.json()) as IngestPayload;
    const restaurantId = verified.restaurantId;

    const { data: runRow, error: runErr } = await sb
      .from("integration_runs")
      .insert({
        restaurant_id: restaurantId,
        connector_type: "rest_api",
        status: "running",
        idempotency_key: payload.idempotency_key?.trim() ?? null,
      })
      .select("id")
      .single();

    if (runErr || !runRow) {
      console.error("integration_runs insert:", runErr);
      return new Response(JSON.stringify({ error: "Impossibile avviare il run" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const outcome = await ingestStockForRestaurant(sb, restaurantId, payload);

    const status =
      outcome.skipped
        ? "skipped"
        : outcome.created === 0
        ? "failed"
        : outcome.created < outcome.total
        ? "partial"
        : "success";

    if (!outcome.skipped && outcome.created > 0 && payload.idempotency_key?.trim()) {
      await sb.from("integration_idempotency").insert({
        restaurant_id: restaurantId,
        idempotency_key: payload.idempotency_key.trim(),
        run_id: runRow.id,
      });
    }

    await sb
      .from("integration_runs")
      .update({
        status,
        stats: {
          created: outcome.created,
          total: outcome.total,
          skip_reason: outcome.skipReason ?? null,
          errors: outcome.errors,
        },
        error_message: outcome.errors[0] ?? null,
        finished_at: new Date().toISOString(),
      })
      .eq("id", runRow.id);

    await sb
      .from("restaurant_api_keys")
      .update({ last_used_at: new Date().toISOString() })
      .eq("id", verified.keyId);

    const httpStatus = outcome.skipped && outcome.skipReason === "already_imported" ? 409 : 200;

    return new Response(
      JSON.stringify({
        run_id: runRow.id,
        status,
        ...outcome,
      }),
      {
        status: httpStatus,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (e) {
    console.error("restaurant-ingest error:", e);
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
