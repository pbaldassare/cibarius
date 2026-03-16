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
  serving_size_g?: number | null;
  serving_label?: string | null;
}

export type SearchPhase = "local" | "off" | "usda" | "done";

// ─── Query cache (localStorage, 7-day TTL) ───────────
const SEARCH_CACHE_KEY = "cibarius_search_cache_v2";
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

function resolveServing(name: string, size: number | null | undefined, label?: string | null) {
  const normalizedName = name.toLowerCase();
  const isOil = /\bolio\b/i.test(normalizedName) && !/sott['’]?olio/i.test(normalizedName);

  if (isOil) {
    return { serving_size_g: 10, serving_label: "1 cucchiaio" };
  }

  if (size && size > 0) {
    if (label && label.trim().length > 0) {
      return { serving_size_g: size, serving_label: label };
    }
    return { serving_size_g: size, serving_label: size === 100 ? "100 g" : `${size} g` };
  }

  return { serving_size_g: null, serving_label: null };
}

function mergeResults(base: FoodSearchResult, candidate: FoodSearchResult): FoodSearchResult {
  const merged: FoodSearchResult = { ...base };

  if (merged.calories_100g == null && candidate.calories_100g != null) merged.calories_100g = candidate.calories_100g;
  if (merged.protein_100g == null && candidate.protein_100g != null) merged.protein_100g = candidate.protein_100g;
  if (merged.carbs_100g == null && candidate.carbs_100g != null) merged.carbs_100g = candidate.carbs_100g;
  if (merged.fats_100g == null && candidate.fats_100g != null) merged.fats_100g = candidate.fats_100g;

  if (!merged.brand && candidate.brand) merged.brand = candidate.brand;
  if (!merged.barcode && candidate.barcode) merged.barcode = candidate.barcode;
  if (!merged.image_url && candidate.image_url) merged.image_url = candidate.image_url;
  if (!merged.local_product_id && candidate.local_product_id) merged.local_product_id = candidate.local_product_id;

  if ((merged.serving_size_g == null || merged.serving_size_g === 100) && candidate.serving_size_g && candidate.serving_size_g !== 100) {
    merged.serving_size_g = candidate.serving_size_g;
  }
  if ((!merged.serving_label || merged.serving_label === "100 g") && candidate.serving_label && candidate.serving_label !== "100 g") {
    merged.serving_label = candidate.serving_label;
  }

  if (merged.source !== "local" && candidate.source === "local") {
    merged.source = "local";
    merged.source_detail = candidate.source_detail;
  }

  const serving = resolveServing(merged.name, merged.serving_size_g, merged.serving_label);
  merged.serving_size_g = serving.serving_size_g;
  merged.serving_label = serving.serving_label;

  return merged;
}

// ─── Dedup helper ────────────────────────────────────
function dedup(existing: FoodSearchResult[], incoming: FoodSearchResult[]): FoodSearchResult[] {
  const byName = new Map<string, FoodSearchResult>();

  for (const r of existing) {
    const key = r.name.toLowerCase().trim();
    const serving = resolveServing(r.name, r.serving_size_g, r.serving_label);
    byName.set(key, { ...r, serving_size_g: serving.serving_size_g, serving_label: serving.serving_label });
  }

  for (const r of incoming) {
    const key = r.name.toLowerCase().trim();
    const existingItem = byName.get(key);
    if (!existingItem) {
      const serving = resolveServing(r.name, r.serving_size_g, r.serving_label);
      byName.set(key, { ...r, serving_size_g: serving.serving_size_g, serving_label: serving.serving_label });
      continue;
    }
    byName.set(key, mergeResults(existingItem, r));
  }

  return Array.from(byName.values());
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
      .select("id, name, kcal_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, default_portion_g, default_portion_label")
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
    serving_size_g: i.default_portion_g || null,
    serving_label: i.default_portion_label || null,
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
  onProgress: OnProgressCallback,
  options?: { requireNutrition?: boolean }
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
  searchLocal(q, options?.requireNutrition).then(localResults => {
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
