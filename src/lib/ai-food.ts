import { supabase } from "@/integrations/supabase/client";
import { lookupBarcode, setProductCache, type ProductData } from "@/lib/barcode";

/* ─── Types ─── */
export interface AIFoodResult {
  product: {
    name: string | null;
    name_confidence?: number;
    brand: string | null;
    barcode: string | null;
    barcode_confidence?: number;
    category: string | null;
  };
  nutrition?: {
    calories_100g: number | null;
    protein_100g: number | null;
    carbs_100g: number | null;
    fats_100g: number | null;
    serving_size_g: number | null;
    confidence?: number;
  };
  expiry?: {
    candidates?: { date: string; confidence: number; label: string }[];
  };
  quantity?: {
    value: number | null;
    unit: string | null;
    confidence?: number;
  };
  storage_hint?: {
    value: string | null; // "ambiente" | "frigo" | "freezer"
    confidence?: number;
  };
  ingredients_text?: string | null;
  ingredients_list?: { name: string; quantity?: number | null; unit?: string | null }[];
  allergens?: string[];
}

export interface FusedFoodData {
  name: string;
  brand: string;
  barcode: string | null;
  image_url: string | null;
  calories_100g: number | null;
  macros_100g: { protein: number; carbs: number; fats: number } | null;
  serving_size_g: number | null;
  expiry_candidates: { date: string; confidence: number; label: string }[];
  best_expiry: string | null;
  quantity_value: number | null;
  quantity_unit: string | null;
  storage_hint: string | null;
  storage_confidence: number;
  category: string | null;
  ingredients_text: string | null;
  ingredients_list: { name: string; quantity?: number | null; unit?: string | null }[];
  allergens: string[];
  confidence: {
    name: number;
    barcode: number;
    nutrition: number;
    expiry: number;
  };
  source: "ai" | "off" | "fused" | "db_cache";
}

export interface ImageFile {
  base64: string;
  mime_type: string;
  preview: string; // data URL for display
}

/**
 * Convert File to ImageFile with base64
 */
export async function fileToImageFile(file: File): Promise<ImageFile> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      const base64 = dataUrl.split(",")[1];
      resolve({
        base64,
        mime_type: file.type || "image/jpeg",
        preview: dataUrl,
      });
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/**
 * Calls the analyze-food-photos edge function
 */
export async function analyzeFoodPhotos(
  images: ImageFile[],
  context: string
): Promise<AIFoodResult | null> {
  const { data, error } = await supabase.functions.invoke("analyze-food-photos", {
    body: {
      images: images.map((img) => ({ base64: img.base64, mime_type: img.mime_type })),
      context,
    },
  });
  if (error) throw error;
  return data?.result ?? null;
}

/**
 * Look up a product by barcode in the local DB (products table).
 * Returns ProductData-compatible object or null.
 */
export async function lookupProductInDB(barcode: string): Promise<ProductData | null> {
  const { data } = await supabase
    .from("products")
    .select("name, brand, barcode, image_url, calories_100g, macros_100g, serving_size_g")
    .eq("barcode", barcode)
    .maybeSingle();
  if (!data || !data.name) return null;
  const m = data.macros_100g as { protein?: number; carbs?: number; fats?: number } | null;
  return {
    name: data.name,
    brand: data.brand || "",
    barcode: data.barcode || barcode,
    image_url: data.image_url,
    calories_100g: data.calories_100g,
    macros_100g: m ? { protein: m.protein ?? 0, carbs: m.carbs ?? 0, fats: m.fats ?? 0 } : null,
    serving_size_g: data.serving_size_g,
  };
}

/**
 * Look up a product by exact name in the local DB.
 */
export async function lookupProductByName(name: string): Promise<ProductData | null> {
  const { data } = await supabase
    .from("products")
    .select("name, brand, barcode, image_url, calories_100g, macros_100g, serving_size_g")
    .ilike("name", name)
    .not("calories_100g", "is", null)
    .limit(1)
    .maybeSingle();
  if (!data || !data.name) return null;
  const m = data.macros_100g as { protein?: number; carbs?: number; fats?: number } | null;
  return {
    name: data.name,
    brand: data.brand || "",
    barcode: data.barcode || "",
    image_url: data.image_url,
    calories_100g: data.calories_100g,
    macros_100g: m ? { protein: m.protein ?? 0, carbs: m.carbs ?? 0, fats: m.fats ?? 0 } : null,
    serving_size_g: data.serving_size_g,
  };
}

/**
 * Fuse AI result with DB/OpenFoodFacts data (DB-first, then OFF as fallback)
 */
export async function fuseWithOFF(aiResult: AIFoodResult): Promise<FusedFoodData> {
  let offData: ProductData | null = null;

  // DB-first: check products table before calling external APIs
  if (aiResult.product.barcode) {
    offData = await lookupProductInDB(aiResult.product.barcode);
    if (offData) {
      // Cache locally for future lookups
      setProductCache(aiResult.product.barcode, offData);
    }
  }

  // Fallback to OpenFoodFacts if not in DB
  if (!offData && aiResult.product.barcode) {
    offData = await lookupBarcode(aiResult.product.barcode);
  }

  // If still no nutrition data, try name match in DB
  if (!offData && aiResult.product.name) {
    offData = await lookupProductByName(aiResult.product.name);
  }

  const ai = aiResult;
  const off = offData;

  // Prefer OFF for name/image if more complete, AI for expiry/serving
  const name = (off?.name && off.name.length > 2 ? off.name : null) ?? ai.product.name ?? "";
  const brand = (off?.brand && off.brand.length > 1 ? off.brand : null) ?? ai.product.brand ?? "";
  const image_url = off?.image_url ?? null;
  const barcode = off?.barcode ?? ai.product.barcode ?? null;

  // Nutrition: prefer OFF if available, else AI
  let calories_100g = off?.calories_100g ?? ai.nutrition?.calories_100g ?? null;
  let macros_100g = off?.macros_100g ?? null;
  if (!macros_100g && ai.nutrition) {
    const { protein_100g, carbs_100g, fats_100g } = ai.nutrition;
    if (protein_100g != null || carbs_100g != null || fats_100g != null) {
      macros_100g = {
        protein: protein_100g ?? 0,
        carbs: carbs_100g ?? 0,
        fats: fats_100g ?? 0,
      };
    }
  }

  // Serving size: prefer AI (reads actual label)
  const serving_size_g = ai.nutrition?.serving_size_g ?? off?.serving_size_g ?? null;

  // Expiry
  const expiry_candidates = ai.expiry?.candidates ?? [];
  const bestExpiry = expiry_candidates
    .filter((c) => c.label === "Scadenza" || c.label === "TMC")
    .sort((a, b) => b.confidence - a.confidence)[0];

  // Storage hint
  const storage_hint = ai.storage_hint?.value ?? null;
  const storage_confidence = ai.storage_hint?.confidence ?? 0;

  // Confidence summary
  const confidence = {
    name: off?.name ? 1 : (ai.product.name_confidence ?? 0.5),
    barcode: off ? 1 : (ai.product.barcode_confidence ?? 0),
    nutrition: off?.calories_100g != null ? 1 : (ai.nutrition?.confidence ?? 0),
    expiry: bestExpiry?.confidence ?? 0,
  };

  return {
    name,
    brand,
    barcode,
    image_url,
    calories_100g,
    macros_100g,
    serving_size_g,
    expiry_candidates,
    best_expiry: bestExpiry?.date ?? null,
    quantity_value: ai.quantity?.value ?? null,
    quantity_unit: ai.quantity?.unit ?? null,
    storage_hint,
    storage_confidence,
    category: ai.product.category ?? null,
    ingredients_text: ai.ingredients_text ?? null,
    ingredients_list: ai.ingredients_list ?? [],
    allergens: ai.allergens ?? [],
    confidence,
    source: off ? "fused" : "ai",
  };
}
