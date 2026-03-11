import { useState, useEffect, useCallback, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";

interface CategoryRow {
  ingredient_name: string;
  category: string;
}

interface CompatRow {
  category_a: string;
  category_b: string;
  is_compatible: boolean;
}

interface CompatibleGroup {
  items: string[];
  categories: string[];
  recipes: string[];
}

// Quick recipe suggestions per category combo
const RECIPE_HINTS: Record<string, string[]> = {
  "verdure+proteine_animali": ["insalata di pollo", "pollo con verdure", "pesce con contorno"],
  "verdure+proteine_vegetali": ["minestrone di legumi", "insalata di ceci", "zuppa di lenticchie"],
  "verdure+latticini": ["insalata con parmigiano", "zucchine gratinate", "caprese"],
  "verdure+uova": ["frittata di verdure", "uova strapazzate con verdure"],
  "verdure+pasta_riso_pane": ["pasta al pomodoro", "riso con verdure", "bruschetta"],
  "verdure+cereali_farine": ["torta salata", "focaccia con verdure"],
  "pasta_riso_pane+proteine_animali": ["pasta con ragù", "riso con pollo", "panino farcito"],
  "pasta_riso_pane+proteine_vegetali": ["pasta e fagioli", "riso e lenticchie"],
  "pasta_riso_pane+latticini": ["pasta al formaggio", "risotto al parmigiano"],
  "pasta_riso_pane+uova": ["carbonara", "crostini con uova"],
  "cereali_farine+dolci_snack": ["pancake", "torta veloce", "biscotti fatti in casa"],
  "cereali_farine+latticini": ["crêpes", "besciamella per lasagna"],
  "cereali_farine+uova": ["frittelle", "pasta fresca fatta in casa"],
  "cereali_farine+frutta": ["torta di mele", "pancake alla banana"],
  "frutta+latticini": ["smoothie", "yogurt con frutta", "macedonia con panna"],
  "frutta+dolci_snack": ["macedonia con cioccolato", "frutta al miele"],
  "proteine_animali+latticini": ["omelette al formaggio", "piadina farcita"],
  "proteine_animali+uova": ["polpette", "frittata con prosciutto"],
  "latticini+uova": ["quiche", "omelette al formaggio"],
  "latticini+dolci_snack": ["tiramisù veloce", "yogurt con cioccolato"],
  "dolci_snack+uova": ["torta al cioccolato", "budino"],
};

// Same-category recipes
const SAME_CAT_RECIPES: Record<string, string[]> = {
  verdure: ["minestrone", "verdure al forno"],
  pasta_riso_pane: ["pasta in bianco", "riso al burro"],
  proteine_animali: ["grigliata mista", "polpette"],
  proteine_vegetali: ["zuppa di legumi", "hummus"],
  latticini: ["tagliere di formaggi", "fonduta"],
  dolci_snack: ["dolce veloce", "merenda golosa"],
  frutta: ["macedonia", "smoothie"],
  cereali_farine: ["pane fatto in casa", "focaccia"],
  uova: ["uova sode", "frittata semplice"],
};

function getRecipes(cat1: string, cat2: string): string[] {
  return RECIPE_HINTS[`${cat1}+${cat2}`] || RECIPE_HINTS[`${cat2}+${cat1}`] || [];
}

export function useIngredientCompatibility() {
  const [categories, setCategories] = useState<CategoryRow[]>([]);
  const [compatMatrix, setCompatMatrix] = useState<CompatRow[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    Promise.all([
      supabase.from("ingredient_categories" as any).select("ingredient_name, category"),
      supabase.from("ingredient_compatibility_matrix" as any).select("category_a, category_b, is_compatible"),
    ]).then(([catRes, compRes]) => {
      if (catRes.data) setCategories(catRes.data as any);
      if (compRes.data) setCompatMatrix(compRes.data as any);
      setLoaded(true);
    });
  }, []);

  // Classify an ingredient name to a category
  const classify = useCallback((name: string): string => {
    const lower = name.toLowerCase().trim();
    // Exact match first
    const exact = categories.find(c => c.ingredient_name === lower);
    if (exact) return exact.category;
    // Partial match
    const partial = categories.find(c => lower.includes(c.ingredient_name) || c.ingredient_name.includes(lower));
    if (partial) return partial.category;
    return "altro";
  }, [categories]);

  // Check if two categories are compatible
  const areCompatible = useCallback((catA: string, catB: string): boolean => {
    if (catA === catB) return true;
    if (catA === "condimenti" || catB === "condimenti") return true; // condiments go with everything
    if (catA === "altro" || catB === "altro") return true;
    const row = compatMatrix.find(r =>
      (r.category_a === catA && r.category_b === catB) ||
      (r.category_a === catB && r.category_b === catA)
    );
    // If no rule exists, default to compatible
    return row ? row.is_compatible : true;
  }, [compatMatrix]);

  // Build compatible groups from a list of ingredient names
  const buildGroups = useCallback((ingredientNames: string[], maxGroups = 2): CompatibleGroup[] => {
    if (ingredientNames.length === 0) return [];

    // Classify all
    const classified = ingredientNames.map(name => ({ name, category: classify(name) }));

    // Group by category
    const byCat: Record<string, string[]> = {};
    for (const { name, category } of classified) {
      if (!byCat[category]) byCat[category] = [];
      byCat[category].push(name);
    }

    const groups: CompatibleGroup[] = [];
    const usedNames = new Set<string>();
    const cats = Object.keys(byCat).filter(c => c !== "altro" && c !== "condimenti");

    // Try pairing different compatible categories
    for (const cat1 of cats) {
      if (groups.length >= maxGroups) break;
      for (const cat2 of cats) {
        if (groups.length >= maxGroups) break;
        if (cat1 >= cat2) continue; // avoid duplicates
        if (!areCompatible(cat1, cat2)) continue;

        const items1 = byCat[cat1].filter(n => !usedNames.has(n));
        const items2 = byCat[cat2].filter(n => !usedNames.has(n));
        if (items1.length === 0 || items2.length === 0) continue;

        const pick = [...items1.slice(0, 2), ...items2.slice(0, 2)];
        pick.forEach(n => usedNames.add(n));

        groups.push({
          items: pick,
          categories: [cat1, cat2],
          recipes: getRecipes(cat1, cat2).slice(0, 2),
        });
      }
    }

    // Fill remaining with same-category groups
    if (groups.length < maxGroups) {
      for (const cat of [...cats, "altro"]) {
        if (groups.length >= maxGroups) break;
        const remaining = (byCat[cat] || []).filter(n => !usedNames.has(n));
        if (remaining.length === 0) continue;

        const pick = remaining.slice(0, 3);
        pick.forEach(n => usedNames.add(n));

        groups.push({
          items: pick,
          categories: [cat],
          recipes: (SAME_CAT_RECIPES[cat] || []).slice(0, 2),
        });
      }
    }

    return groups;
  }, [classify, areCompatible]);

  return { loaded, classify, areCompatible, buildGroups };
}
