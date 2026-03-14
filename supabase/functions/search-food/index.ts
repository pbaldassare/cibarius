import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const API_TIMEOUT_MS = 8000;

interface NormalizedResult {
  source: "off" | "usda";
  source_detail: "off_it" | "off_world" | "usda";
  name: string;
  brand: string | null;
  barcode: string | null;
  image_url: string | null;
  calories_100g: number | null;
  protein_100g: number | null;
  carbs_100g: number | null;
  fats_100g: number | null;
}

async function fetchWithTimeout(url: string, timeoutMs = API_TIMEOUT_MS): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

// ─── OFF Italian search ───────
async function searchOFF_IT(query: string): Promise<NormalizedResult[]> {
  try {
    const url = `https://it.openfoodfacts.org/api/v2/search?search_terms=${encodeURIComponent(query)}&fields=product_name,product_name_it,brands,code,image_front_url,image_url,nutriments&page_size=10&json=1`;
    const res = await fetchWithTimeout(url);
    if (!res.ok) return [];
    const json = await res.json();
    return mapOFFProducts(json.products ?? [], "off_it", query);
  } catch { return []; }
}

// ─── OFF World search ────────────────────────────────
async function searchOFF_World(query: string): Promise<NormalizedResult[]> {
  try {
    const url = `https://world.openfoodfacts.org/api/v2/search?search_terms=${encodeURIComponent(query)}&fields=product_name,product_name_it,brands,code,image_front_url,image_url,nutriments&page_size=10&json=1`;
    const res = await fetchWithTimeout(url);
    if (!res.ok) return [];
    const json = await res.json();
    return mapOFFProducts(json.products ?? [], "off_world", query);
  } catch { return []; }
}

function round2(v: number | null | undefined): number | null {
  return v != null ? Math.round(v * 100) / 100 : null;
}

function mapOFFProducts(products: any[], detail: "off_it" | "off_world", query?: string): NormalizedResult[] {
  const qLower = (query ?? "").toLowerCase().trim();
  return products
    .filter((p: any) => p.product_name || p.product_name_it)
    .map((p: any) => {
      const n = p.nutriments ?? {};
      return {
        source: "off" as const,
        source_detail: detail,
        name: p.product_name_it || p.product_name || "",
        brand: p.brands || null,
        barcode: p.code || null,
        image_url: p.image_front_url || p.image_url || null,
        calories_100g: round2(n["energy-kcal_100g"]),
        protein_100g: round2(n.proteins_100g),
        carbs_100g: round2(n.carbohydrates_100g),
        fats_100g: round2(n.fat_100g),
      };
    })
    .filter((r) => {
      if (!qLower || qLower.length < 2) return true;
      const hay = (r.name + " " + (r.brand ?? "")).toLowerCase();
      return qLower.split(/\s+/).some((word) => hay.includes(word));
    });
}

// ─── USDA FoodData Central search ────────────────────
async function searchUSDA(query: string, apiKey: string): Promise<NormalizedResult[]> {
  try {
    const url = `https://api.nal.usda.gov/fdc/v1/foods/search?api_key=${apiKey}&query=${encodeURIComponent(query)}&pageSize=10&dataType=Foundation,SR%20Legacy`;
    const res = await fetchWithTimeout(url);
    if (!res.ok) return [];
    const json = await res.json();
    const foods = json.foods ?? [];
    return foods.map((f: any) => {
      const nutrients = f.foodNutrients ?? [];
      const get = (id: number) => {
        const n = nutrients.find((n: any) => n.nutrientId === id);
        return n?.value ?? null;
      };
      return {
        source: "usda" as const,
        source_detail: "usda" as const,
        name: f.description || "",
        brand: f.brandName || f.brandOwner || null,
        barcode: f.gtinUpc || null,
        image_url: null,
        calories_100g: get(1008),
        protein_100g: get(1003),
        carbs_100g: get(1005),
        fats_100g: get(1004),
      };
    });
  } catch { return []; }
}

// ─── Auto-save results to products table (fire-and-forget) ───
function saveResultsToDB(results: NormalizedResult[]) {
  try {
    const sb = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Only save results with valid name, calories, and barcode
    const rows = results
      .filter(r => r.name && r.calories_100g != null && r.barcode)
      .map(r => ({
        name: r.name.slice(0, 255),
        brand: r.brand,
        barcode: r.barcode,
        image_url: r.image_url,
        calories_100g: r.calories_100g,
        macros_100g: { p: r.protein_100g ?? 0, c: r.carbs_100g ?? 0, f: r.fats_100g ?? 0 },
        data_source: r.source === "off" ? "openfoodfacts" : "usda",
      }));

    if (rows.length === 0) return;

    // Fire-and-forget upsert — don't await
    sb.from("products")
      .upsert(rows, { onConflict: "barcode" })
      .then(({ error }) => {
        if (error) console.error("Auto-save products error:", error.message);
        else console.log(`Auto-saved ${rows.length} products to DB`);
      });
  } catch (e) {
    console.error("saveResultsToDB error:", e);
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { query, sources } = await req.json();
    if (!query || typeof query !== "string" || query.trim().length < 2) {
      return new Response(JSON.stringify({ results: [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const q = query.trim();
    const usdaKey = Deno.env.get("USDA_API_KEY") || "";
    const requestedSources: string[] = sources ?? ["off", "usda"];

    const promises: Promise<NormalizedResult[]>[] = [];

    if (requestedSources.includes("off")) {
      promises.push(
        Promise.all([searchOFF_IT(q), searchOFF_World(q)]).then(([it, world]) => {
          const seen = new Set<string>();
          const merged: NormalizedResult[] = [];
          for (const r of it) { seen.add(r.name.toLowerCase().trim()); merged.push(r); }
          for (const r of world) {
            const key = r.name.toLowerCase().trim();
            if (!seen.has(key)) { seen.add(key); merged.push(r); }
          }
          return merged;
        })
      );
    }

    if (requestedSources.includes("usda") && usdaKey) {
      promises.push(searchUSDA(q, usdaKey));
    }

    const allResults = await Promise.all(promises);

    const seen = new Set<string>();
    const results: NormalizedResult[] = [];
    for (const batch of allResults) {
      for (const r of batch) {
        const key = r.name.toLowerCase().trim();
        if (!seen.has(key)) { seen.add(key); results.push(r); }
      }
    }

    // Auto-save to DB (fire-and-forget, doesn't block response)
    saveResultsToDB(results);

    return new Response(JSON.stringify({ results: results.slice(0, 20) }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
