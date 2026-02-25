const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface NormalizedResult {
  source: "off" | "usda";
  name: string;
  brand: string | null;
  barcode: string | null;
  image_url: string | null;
  calories_100g: number | null;
  protein_100g: number | null;
  carbs_100g: number | null;
  fats_100g: number | null;
}

// ─── OFF text search ─────────────────────────────────
async function searchOFF(query: string): Promise<NormalizedResult[]> {
  try {
    const url = `https://world.openfoodfacts.org/api/v2/search?search_terms=${encodeURIComponent(query)}&fields=product_name,product_name_it,brands,code,image_front_url,image_url,nutriments&page_size=10&json=1`;
    const res = await fetch(url);
    if (!res.ok) return [];
    const json = await res.json();
    const products = json.products ?? [];
    return products
      .filter((p: any) => p.product_name || p.product_name_it)
      .map((p: any) => {
        const n = p.nutriments ?? {};
        return {
          source: "off" as const,
          name: p.product_name || p.product_name_it || "",
          brand: p.brands || null,
          barcode: p.code || null,
          image_url: p.image_front_url || p.image_url || null,
          calories_100g: n["energy-kcal_100g"] ?? null,
          protein_100g: n.proteins_100g ?? null,
          carbs_100g: n.carbohydrates_100g ?? null,
          fats_100g: n.fat_100g ?? null,
        };
      });
  } catch {
    return [];
  }
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
        name: f.description || "",
        brand: f.brandName || f.brandOwner || null,
        barcode: f.gtinUpc || null,
        image_url: null,
        calories_100g: get(1008), // Energy (kcal)
        protein_100g: get(1003), // Protein
        carbs_100g: get(1005),   // Carbohydrate
        fats_100g: get(1004),    // Total lipid (fat)
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
    const { query } = await req.json();
    if (!query || typeof query !== "string" || query.trim().length < 2) {
      return new Response(JSON.stringify({ results: [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const usdaKey = Deno.env.get("USDA_API_KEY") || "";

    // Run both searches in parallel
    const [offResults, usdaResults] = await Promise.all([
      searchOFF(query.trim()),
      usdaKey ? searchUSDA(query.trim(), usdaKey) : Promise.resolve([]),
    ]);

    // Merge: OFF first, then USDA (deduped by name similarity)
    const seen = new Set<string>();
    const merged: NormalizedResult[] = [];

    for (const r of [...offResults, ...usdaResults]) {
      const key = r.name.toLowerCase().trim();
      if (!seen.has(key)) {
        seen.add(key);
        merged.push(r);
      }
    }

    return new Response(JSON.stringify({ results: merged.slice(0, 20) }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
