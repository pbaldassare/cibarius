import { supabase } from "@/integrations/supabase/client";

export interface NutritionPer100g {
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
  source: "product" | "template" | "none";
}

// Cache templates in memory after first load
let templateCache: Map<string, any> | null = null;

export async function loadTemplates(): Promise<Map<string, any>> {
  if (templateCache) return templateCache;
  const { data } = await supabase
    .from("food_templates")
    .select("id, name, category, calories_100g, protein_100g, carbs_100g, fats_100g, keywords");
  const map = new Map<string, any>();
  (data ?? []).forEach((t) => map.set(t.id, t));
  templateCache = map;
  return map;
}

export function clearTemplateCache() {
  templateCache = null;
}

/**
 * Get nutrition per 100g for a product, using template as fallback.
 * Pass the product object with optional template_id and calories_100g/macros_100g.
 */
export function getNutritionPer100g(product: {
  calories_100g?: number | null;
  macros_100g?: any;
  template_id?: string | null;
}, templates: Map<string, any>): NutritionPer100g {
  // 1. Product has its own nutrition
  if (product.calories_100g != null && product.calories_100g > 0) {
    const mac = product.macros_100g as any;
    return {
      calories: product.calories_100g,
      protein: mac?.protein ?? 0,
      carbs: mac?.carbs ?? 0,
      fats: mac?.fats ?? 0,
      source: "product",
    };
  }

  // 2. Fallback to template
  if (product.template_id) {
    const tmpl = templates.get(product.template_id);
    if (tmpl) {
      return {
        calories: tmpl.calories_100g,
        protein: tmpl.protein_100g,
        carbs: tmpl.carbs_100g,
        fats: tmpl.fats_100g,
        source: "template",
      };
    }
  }

  // 3. No data
  return { calories: 0, protein: 0, carbs: 0, fats: 0, source: "none" };
}

/**
 * Try to match a product name against food_templates using keyword matching.
 * Returns the best matching template_id or null.
 */
export function matchTemplate(
  productName: string,
  templates: Map<string, any>
): string | null {
  const name = productName.toLowerCase().trim();
  let bestId: string | null = null;
  let bestScore = 0;

  templates.forEach((tmpl, id) => {
    // Check exact name match
    if (tmpl.name.toLowerCase() === name) {
      bestId = id;
      bestScore = 100;
      return;
    }

    // Check keywords
    const keywords: string[] = tmpl.keywords ?? [];
    for (const kw of keywords) {
      const kwLower = kw.toLowerCase();
      if (name.includes(kwLower) || kwLower.includes(name)) {
        const score = Math.min(kwLower.length, name.length) / Math.max(kwLower.length, name.length) * 80;
        if (score > bestScore) {
          bestScore = score;
          bestId = id;
        }
      }
    }

    // Check template name contains or is contained
    const tmplName = tmpl.name.toLowerCase();
    if (name.includes(tmplName) || tmplName.includes(name)) {
      const score = Math.min(tmplName.length, name.length) / Math.max(tmplName.length, name.length) * 70;
      if (score > bestScore) {
        bestScore = score;
        bestId = id;
      }
    }
  });

  // Only return if score is reasonable
  return bestScore >= 40 ? bestId : null;
}

/**
 * Auto-match a product to a template and update it if no nutrition data exists.
 */
export async function autoMatchProduct(productId: string, productName: string) {
  const templates = await loadTemplates();
  const matchedId = matchTemplate(productName, templates);
  if (matchedId) {
    await supabase
      .from("products")
      .update({ template_id: matchedId })
      .eq("id", productId)
      .is("template_id", null); // Don't overwrite existing
  }
  return matchedId;
}
