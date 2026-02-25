import { supabase } from "@/integrations/supabase/client";

export interface FoodSearchResult {
  source: "off" | "usda" | "local";
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
  // Keep max 100 entries
  const keys = Object.keys(c);
  if (keys.length > 100) {
    const oldest = keys.sort((a, b) => c[a].ts - c[b].ts)[0];
    delete c[oldest];
  }
  localStorage.setItem(SEARCH_CACHE_KEY, JSON.stringify(c));
}

// ─── Unified search ──────────────────────────────────
export async function searchFood(query: string): Promise<FoodSearchResult[]> {
  const q = query.trim();
  if (q.length < 2) return [];

  // Check cache first
  const cached = getCachedSearch(q);
  if (cached) return cached;

  // Local DB search + edge function in parallel
  const [localResults, edgeResults] = await Promise.all([
    searchLocal(q),
    searchEdge(q),
  ]);

  // Merge: local first, then remote (deduped)
  const seen = new Set<string>();
  const merged: FoodSearchResult[] = [];

  for (const r of localResults) {
    const key = r.name.toLowerCase().trim();
    seen.add(key);
    merged.push(r);
  }

  for (const r of edgeResults) {
    const key = r.name.toLowerCase().trim();
    if (!seen.has(key)) {
      seen.add(key);
      merged.push(r);
    }
  }

  const final = merged.slice(0, 30);
  setCachedSearch(q, final);
  return final;
}

// ─── Local DB search ─────────────────────────────────
async function searchLocal(query: string): Promise<FoodSearchResult[]> {
  const { data } = await supabase
    .from("products")
    .select("id, name, brand, barcode, image_url, calories_100g, macros_100g")
    .ilike("name", `%${query}%`)
    .limit(10);

  return (data ?? []).map((p: any) => ({
    source: "local" as const,
    name: p.name,
    brand: p.brand,
    barcode: p.barcode,
    image_url: p.image_url,
    calories_100g: p.calories_100g,
    protein_100g: p.macros_100g?.protein ?? null,
    carbs_100g: p.macros_100g?.carbs ?? null,
    fats_100g: p.macros_100g?.fats ?? null,
    local_product_id: p.id,
  }));
}

// ─── Edge function search (OFF + USDA) ───────────────
async function searchEdge(query: string): Promise<FoodSearchResult[]> {
  try {
    const { data, error } = await supabase.functions.invoke("search-food", {
      body: { query },
    });
    if (error || !data?.results) return [];
    return data.results as FoodSearchResult[];
  } catch {
    return [];
  }
}
