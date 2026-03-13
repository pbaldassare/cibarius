import { supabase } from "@/integrations/supabase/client";

export interface FoodSearchResult {
  source: "off" | "usda" | "local";
  source_detail?: "off_it" | "off_world" | "usda" | "local";
  name: string;
  brand: string | null;
  barcode: string | null;
  image_url: string | null;
  calories_100g: number | null;
  protein_100g: number | null;
  carbs_100g: number | null;
  fats_100g: number | null;
  local_product_id?: string;
}

export type SearchPhase = "local" | "off" | "usda" | "done";

// ─── Query cache (localStorage, 7-day TTL) ───────────
const SEARCH_CACHE_KEY = "cibarius_search_cache";
const SEARCH_CACHE_TTL = 7 * 24 * 60 * 60 * 1000;

interface SearchCacheEntry {
  results: FoodSearchResult[];
  ts: number;
}

function getSearchCache(): Record<string, SearchCacheEntry> {
  try {
    return JSON.parse(localStorage.getItem(SEARCH_CACHE_KEY) || "{}");
  } catch {
    return {};
  }
}

function getCachedSearch(query: string): FoodSearchResult[] | null {
  const entry = getSearchCache()[query.toLowerCase().trim()];
  if (!entry) return null;
  if (Date.now() - entry.ts > SEARCH_CACHE_TTL) return null;
  return entry.results;
}

function setCachedSearch(query: string, results: FoodSearchResult[]) {
  const c = getSearchCache();
  const key = query.toLowerCase().trim();
  c[key] = { results, ts: Date.now() };
  const keys = Object.keys(c);
  if (keys.length > 100) {
    const oldest = keys.sort((a, b) => c[a].ts - c[b].ts)[0];
    delete c[oldest];
  }
  localStorage.setItem(SEARCH_CACHE_KEY, JSON.stringify(c));
}

// ─── Dedup helper ────────────────────────────────────
function dedup(existing: FoodSearchResult[], incoming: FoodSearchResult[]): FoodSearchResult[] {
  const seen = new Set(existing.map(r => r.name.toLowerCase().trim()));
  const merged = [...existing];
  for (const r of incoming) {
    const key = r.name.toLowerCase().trim();
    if (!seen.has(key)) {
      seen.add(key);
      merged.push(r);
    }
  }
  return merged;
}

// ─── Local DB search (products + ingredients in parallel) ─
async function searchLocal(query: string, requireNutrition = false): Promise<FoodSearchResult[]> {
  let productsQuery = supabase
    .from("products")
    .select("id, name, brand, barcode, image_url, calories_100g, macros_100g")
    .ilike("name", `%${query}%`)
    .limit(10);
  if (requireNutrition) {
    productsQuery = productsQuery.eq("nutrition_available", true);
  }
  const [productsRes, ingredientsRes] = await Promise.all([
    productsQuery,
    supabase
      .from("ingredients")
      .select("id, name, kcal_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g")
      .ilike("name", `%${query}%`)
      .limit(10),
  ]);

  const productResults: FoodSearchResult[] = (productsRes.data ?? []).map((p: any) => ({
    source: "local" as const,
    source_detail: "local" as const,
    name: p.name,
    brand: p.brand,
    barcode: p.barcode,
    image_url: p.image_url,
    calories_100g: p.calories_100g,
    protein_100g: p.macros_100g?.protein ?? p.macros_100g?.p ?? null,
    carbs_100g: p.macros_100g?.carbs ?? p.macros_100g?.c ?? null,
    fats_100g: p.macros_100g?.fats ?? p.macros_100g?.f ?? null,
    local_product_id: p.id,
  }));

  const ingredientResults: FoodSearchResult[] = (ingredientsRes.data ?? []).map((i: any) => ({
    source: "local" as const,
    source_detail: "local" as const,
    name: i.name,
    brand: null,
    barcode: null,
    image_url: null,
    calories_100g: i.kcal_per_100g,
    protein_100g: i.protein_per_100g,
    carbs_100g: i.carbs_per_100g,
    fats_100g: i.fat_per_100g,
  }));

  return dedup(productResults, ingredientResults);
}

// ─── Edge function: OFF only ─────────────────────────
async function searchEdgeOFF(query: string): Promise<FoodSearchResult[]> {
  try {
    const { data, error } = await supabase.functions.invoke("search-food", {
      body: { query, sources: ["off"] },
    });
    if (error || !data?.results) return [];
    return data.results as FoodSearchResult[];
  } catch {
    return [];
  }
}

// ─── Edge function: USDA only ────────────────────────
async function searchEdgeUSDA(query: string): Promise<FoodSearchResult[]> {
  try {
    const { data, error } = await supabase.functions.invoke("search-food", {
      body: { query, sources: ["usda"] },
    });
    if (error || !data?.results) return [];
    return data.results as FoodSearchResult[];
  } catch {
    return [];
  }
}

// ─── Progressive search ──────────────────────────────
export type OnProgressCallback = (
  results: FoodSearchResult[],
  phase: SearchPhase,
  done: boolean
) => void;

/**
 * Progressive 3-phase search with callback for each phase.
 * Returns an abort function.
 */
export function searchFoodProgressive(
  query: string,
  onProgress: OnProgressCallback
): () => void {
  const q = query.trim();
  let cancelled = false;
  let accumulated: FoodSearchResult[] = [];

  if (q.length < 2) {
    onProgress([], "done", true);
    return () => {};
  }

  // Check cache first
  const cached = getCachedSearch(q);
  if (cached) {
    onProgress(cached, "done", true);
    return () => {};
  }

  // Phase 1: Local DB (instant)
  searchLocal(q).then(localResults => {
    if (cancelled) return;
    accumulated = localResults;
    onProgress(accumulated, "local", false);

    // Phase 2+3: OFF and USDA in parallel
    let offDone = false;
    let usdaDone = false;

    const checkAllDone = () => {
      if (offDone && usdaDone && !cancelled) {
        accumulated = accumulated.slice(0, 30);
        setCachedSearch(q, accumulated);
        onProgress(accumulated, "done", true);
      }
    };

    searchEdgeOFF(q).then(offResults => {
      if (cancelled) return;
      accumulated = dedup(accumulated, offResults);
      offDone = true;
      onProgress(accumulated, "off", false);
      checkAllDone();
    });

    searchEdgeUSDA(q).then(usdaResults => {
      if (cancelled) return;
      accumulated = dedup(accumulated, usdaResults);
      usdaDone = true;
      if (!offDone) onProgress(accumulated, "usda" as SearchPhase, false);
      checkAllDone();
    });
  });

  return () => { cancelled = true; };
}

// ─── Legacy wrapper for backward compatibility ───────
export async function searchFood(query: string): Promise<FoodSearchResult[]> {
  return new Promise((resolve) => {
    searchFoodProgressive(query, (results, _phase, done) => {
      if (done) resolve(results);
    });
  });
}
