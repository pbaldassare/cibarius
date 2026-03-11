const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

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

// ─── OFF Italian search (it.openfoodfacts.org) ───────
async function searchOFF_IT(query: string): Promise<NormalizedResult[]> {
  try {
    const url = `https://it.openfoodfacts.org/api/v2/search?search_terms=${encodeURIComponent(query)}&fields=product_name,product_name_it,brands,code,image_front_url,image_url,nutriments&page_size=10&json=1`;
    const res = await fetch(url);
    if (!res.ok) return [];
    const json = await res.json();
    return mapOFFProducts(json.products ?? [], "off_it", query);
  } catch {
    return [];
  }
}

// ─── OFF World search ────────────────────────────────
async function searchOFF_World(query: string): Promise<NormalizedResult[]> {
  try {
    const url = `https://world.openfoodfacts.org/api/v2/search?search_terms=${encodeURIComponent(query)}&fields=product_name,product_name_it,brands,code,image_front_url,image_url,nutriments&page_size=10&json=1`;
    const res = await fetch(url);
    if (!res.ok) return [];
    const json = await res.json();
    return mapOFFProducts(json.products ?? [], "off_world");
  } catch {
    return [];
  }
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
      // Filter out irrelevant results: name or brand must contain query
      if (!qLower || qLower.length < 2) return true;
      const hay = (r.name + " " + (r.brand ?? "")).toLowerCase();
      return qLower.split(/\s+/).some((word) => hay.includes(word));
    });
}

// ─── USDA FoodData Central search ────────────────────
async function searchUSDA(query: string, apiKey: string): Promise<NormalizedResult[]> {
  try {
    const url = `https://api.nal.usda.gov/fdc/v1/foods/search?api_key=${apiKey}&query=${encodeURIComponent(query)}&pageSize=10&dataType=Foundation,SR%20Legacy`;
    const res = await fetch(url);
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
  } catch {
    return [];
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

    let results: NormalizedResult[] = [];

    if (requestedSources.includes("off")) {
      // Italian first, then world, deduped
      const [itResults, worldResults] = await Promise.all([
        searchOFF_IT(q),
        searchOFF_World(q),
      ]);
      // Italian results first
      const seen = new Set<string>();
      for (const r of itResults) {
        seen.add(r.name.toLowerCase().trim());
        results.push(r);
      }
      for (const r of worldResults) {
        const key = r.name.toLowerCase().trim();
        if (!seen.has(key)) {
          seen.add(key);
          results.push(r);
        }
      }
    }

    if (requestedSources.includes("usda") && usdaKey) {
      const usdaResults = await searchUSDA(q, usdaKey);
      const seen = new Set(results.map(r => r.name.toLowerCase().trim()));
      for (const r of usdaResults) {
        const key = r.name.toLowerCase().trim();
        if (!seen.has(key)) {
          seen.add(key);
          results.push(r);
        }
      }
    }

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
