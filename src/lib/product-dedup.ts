import { supabase } from "@/integrations/supabase/client";

export interface SimilarProduct {
  id: string;
  name: string;
  brand: string | null;
  calories_100g: number | null;
  macros_100g: { protein: number; carbs: number; fats: number } | null;
  image_url: string | null;
  serving_size_g: number | null;
  nutrition_available: boolean;
  similarity: number; // 0-1
}

/**
 * Normalize a product name for comparison:
 * lowercase, trim, remove extra spaces, remove common articles
 */
function normalize(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ")
    .replace(/\b(di|del|della|delle|dei|degli|al|alla|alle|con|per|in|il|lo|la|le|i|gli|un|una|e)\b/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Word-level Jaccard similarity between two normalized strings.
 */
function wordSimilarity(a: string, b: string): number {
  const wordsA = new Set(normalize(a).split(" ").filter(Boolean));
  const wordsB = new Set(normalize(b).split(" ").filter(Boolean));
  if (wordsA.size === 0 && wordsB.size === 0) return 1;
  if (wordsA.size === 0 || wordsB.size === 0) return 0;
  let intersection = 0;
  for (const w of wordsA) {
    if (wordsB.has(w)) intersection++;
  }
  const union = new Set([...wordsA, ...wordsB]).size;
  return intersection / union;
}

/**
 * Check if a product name contains the other or is a substring match.
 */
function substringMatch(a: string, b: string): boolean {
  const na = normalize(a);
  const nb = normalize(b);
  return na.includes(nb) || nb.includes(na);
}

/**
 * Find products similar to the given name.
 * Returns products with similarity >= threshold, sorted by similarity desc.
 */
export async function findSimilarProducts(
  name: string,
  options?: { threshold?: number; limit?: number; excludeId?: string }
): Promise<SimilarProduct[]> {
  const { threshold = 0.4, limit = 5, excludeId } = options ?? {};
  const trimmed = name.trim();
  if (trimmed.length < 2) return [];

  // Extract main keywords for DB search
  const keywords = normalize(trimmed).split(" ").filter((w) => w.length >= 3);
  if (keywords.length === 0) return [];

  // Search with OR ilike on main keywords (max 3 to keep query fast)
  const searchTerms = keywords.slice(0, 3);
  let query = supabase
    .from("products")
    .select("id, name, brand, calories_100g, macros_100g, image_url, serving_size_g, nutrition_available")
    .limit(30);

  // Use OR filter: match any keyword
  const orFilter = searchTerms.map((k) => `name.ilike.%${k}%`).join(",");
  query = query.or(orFilter);

  if (excludeId) {
    query = query.neq("id", excludeId);
  }

  const { data, error } = await query;
  if (error || !data) return [];

  // Score each result
  const scored: SimilarProduct[] = data
    .map((p: any) => {
      const sim = wordSimilarity(trimmed, p.name);
      const isSub = substringMatch(trimmed, p.name);
      // Boost score if substring match
      const finalSim = isSub ? Math.max(sim, 0.6) : sim;
      return {
        id: p.id,
        name: p.name,
        brand: p.brand,
        calories_100g: p.calories_100g,
        macros_100g: p.macros_100g as any,
        image_url: p.image_url,
        serving_size_g: p.serving_size_g,
        nutrition_available: p.nutrition_available ?? false,
        similarity: Math.round(finalSim * 100) / 100,
      };
    })
    .filter((p) => p.similarity >= threshold)
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, limit);

  return scored;
}
