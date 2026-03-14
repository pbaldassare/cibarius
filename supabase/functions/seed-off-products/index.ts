import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const sb = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  try {
    const body = await req.json().catch(() => ({}));
    const maxPages = Math.min(body.max_pages ?? 50, 50);
    const pageSize = 100;

    let totalSaved = 0;
    let totalSkipped = 0;

    for (let page = 1; page <= maxPages; page++) {
      try {
        const url = `https://it.openfoodfacts.org/api/v2/search?countries_tags=en:italy&sort_by=unique_scans_n&page_size=${pageSize}&page=${page}&fields=product_name,product_name_it,brands,code,image_front_url,image_url,nutriments`;

        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 15000);
        const res = await fetch(url, { signal: controller.signal });
        clearTimeout(timer);

        if (!res.ok) {
          console.error(`Page ${page}: HTTP ${res.status}`);
          continue;
        }

        const json = await res.json();
        const products = json.products ?? [];

        if (products.length === 0) {
          console.log(`Page ${page}: no more products, stopping.`);
          break;
        }

        const rows = products
          .filter((p: any) => {
            const name = p.product_name_it || p.product_name;
            const code = p.code;
            const kcal = p.nutriments?.["energy-kcal_100g"];
            return name && code && kcal != null && kcal > 0;
          })
          .map((p: any) => {
            const n = p.nutriments ?? {};
            return {
              name: (p.product_name_it || p.product_name).slice(0, 255),
              brand: p.brands || null,
              barcode: p.code,
              image_url: p.image_front_url || p.image_url || null,
              calories_100g: Math.round((n["energy-kcal_100g"] ?? 0) * 100) / 100,
              macros_100g: {
                p: Math.round((n.proteins_100g ?? 0) * 100) / 100,
                c: Math.round((n.carbohydrates_100g ?? 0) * 100) / 100,
                f: Math.round((n.fat_100g ?? 0) * 100) / 100,
              },
              data_source: "openfoodfacts",
            };
          });

        if (rows.length > 0) {
          const { error } = await sb.from("products").upsert(rows, { onConflict: "barcode" });
          if (error) {
            console.error(`Page ${page} upsert error:`, error.message);
            totalSkipped += rows.length;
          } else {
            totalSaved += rows.length;
          }
        }

        console.log(`Page ${page}/${maxPages}: ${rows.length} saved (total: ${totalSaved})`);

        // Small delay to be nice to OFF API
        if (page < maxPages) await new Promise(r => setTimeout(r, 500));
      } catch (pageErr) {
        console.error(`Page ${page} error:`, pageErr);
        continue;
      }
    }

    return new Response(
      JSON.stringify({ success: true, total_saved: totalSaved, total_skipped: totalSkipped }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: (err as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
