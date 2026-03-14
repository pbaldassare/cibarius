import { supabase } from "@/integrations/supabase/client";

// ─── Types ────────────────────────────────────────────
export interface OFFProduct {
  product_name?: string;
  brands?: string;
  image_url?: string;
  nutriments?: {
    "energy-kcal_100g"?: number;
    proteins_100g?: number;
    carbohydrates_100g?: number;
    fat_100g?: number;
  };
}

export interface ProductData {
  name: string;
  brand: string;
  barcode: string;
  image_url: string | null;
  calories_100g: number | null;
  macros_100g: { protein: number; carbs: number; fats: number } | null;
  serving_size_g?: number | null;
}

// ─── Calorie calculation helper ───────────────────────
export function calcNutrition(
  qty: number,
  unitVal: string,
  cal100g: number | null,
  macros100g: { protein: number; carbs: number; fats: number } | null,
  servingSizeG: number | null
): { calories: number | null; macros: { protein: number; carbs: number; fats: number } | null } {
  if (cal100g == null) return { calories: null, macros: null };
  let grams: number;
  if (unitVal === "g" || unitVal === "ml") grams = qty;
  else if (unitVal === "kg" || unitVal === "l") grams = qty * 1000;
  else {
    if (!servingSizeG) return { calories: null, macros: null };
    grams = qty * servingSizeG;
  }
  const factor = grams / 100;
  return {
    calories: Math.round(factor * cal100g),
    macros: macros100g
      ? {
          protein: Math.round(factor * macros100g.protein * 10) / 10,
          carbs: Math.round(factor * macros100g.carbs * 10) / 10,
          fats: Math.round(factor * macros100g.fats * 10) / 10,
        }
      : null,
  };
}

// ─── Barcode cache (localStorage) with TTL ───────────
const CACHE_KEY = "cibarius_barcode_cache";
const CACHE_TTL_MS = 30 * 24 * 60 * 60 * 1000;

interface CacheEntry { data: ProductData; ts: number }

const getCache = (): Record<string, CacheEntry> => {
  try {
    return JSON.parse(localStorage.getItem(CACHE_KEY) || "{}");
  } catch { return {}; }
};

const getCached = (barcode: string): ProductData | null => {
  const entry = getCache()[barcode];
  if (!entry) return null;
  if (Date.now() - entry.ts > CACHE_TTL_MS) return null;
  return entry.data;
};

export const setProductCache = (barcode: string, data: ProductData) => setCache(barcode, data);

const setCache = (barcode: string, data: ProductData) => {
  const c = getCache();
  c[barcode] = { data, ts: Date.now() };
  const keys = Object.keys(c);
  if (keys.length > 200) {
    const oldest = keys.sort((a, b) => c[a].ts - c[b].ts)[0];
    delete c[oldest];
  }
  localStorage.setItem(CACHE_KEY, JSON.stringify(c));
};

// ─── OpenFoodFacts lookup ─────────────────────────────
export const lookupBarcode = async (barcode: string): Promise<ProductData | null> => {
  const cached = getCached(barcode);
  if (cached) return cached;

  try {
    const res = await fetch(`https://world.openfoodfacts.org/api/v2/product/${barcode}.json`);
    if (!res.ok) return null;
    const json = await res.json();
    if (json.status !== 1 || !json.product) return null;

    const p = json.product as any;
    const n = p.nutriments;
    const data: ProductData = {
      name: p.product_name || p.product_name_it || "",
      brand: p.brands || "",
      barcode,
      image_url: p.image_front_url || p.image_url || null,
      calories_100g: n?.["energy-kcal_100g"] ?? null,
      macros_100g:
        n?.proteins_100g != null
          ? { protein: n.proteins_100g ?? 0, carbs: n.carbohydrates_100g ?? 0, fats: n.fat_100g ?? 0 }
          : null,
      serving_size_g: p.serving_quantity ? Number(p.serving_quantity) : null,
    };
    setCache(barcode, data);
    return data;
  } catch {
    return null;
  }
};
