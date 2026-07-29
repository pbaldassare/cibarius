import { useState, useEffect, useMemo, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import MobileHeader from "@/components/MobileHeader";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import ListSkeleton from "@/components/ListSkeleton";
import EmptyState from "@/components/EmptyState";
import { deductPantryFromMeal } from "@/lib/pantry-deduction";
import {
  Clock, ChefHat, AlertTriangle, Check, X, Loader2,
  Package, Sparkles, Utensils, ChevronDown, ChevronUp,
} from "lucide-react";

/* ─── types ─── */
interface PantryItem {
  id: string;
  quantity: number;
  unit: string | null;
  storage_type: string;
  expiry_date: string | null;
  product: {
    id: string; name: string; brand: string | null;
    image_url: string | null; category: string | null;
    calories_100g: number | null; macros_100g: any;
  };
}

interface RecipeIngredient {
  name: string;
  available: boolean;
  expiring?: boolean;
  role?: "core" | "minor" | "staple";
  qty: string;
  grams?: number;
  kcal?: number;
  protein_g?: number;
  carbs_g?: number;
  fats_g?: number;
}

interface SuggestedRecipe {
  title: string;
  ingredients: RecipeIngredient[];
  instructions?: string;
  estimatedKcal: number;
  estimatedMacros: { protein: number; carbs: number; fats: number };
  usesExpiringCount: number;
  reason?: string;
  source: "local" | "ai";
  difficulty?: "facile" | "gourmet";
  course?: "salato" | "dolce";
}

/* ─── local recipe DB with instructions & per-ingredient macros ─── */
const RECIPE_DB = [
  {
    title: "Frittata di verdure",
    instructions: "Sbattere le uova, aggiungere le zucchine tagliate a rondelle e il parmigiano grattugiato. Cuocere in padella con un filo d'olio per 5 minuti per lato.",
    ingredients: [
      { name: "uova", grams: 120, kcal: 172, protein_g: 15, carbs_g: 1, fats_g: 12 },
      { name: "zucchine", grams: 150, kcal: 26, protein_g: 2, carbs_g: 3, fats_g: 0 },
      { name: "parmigiano", grams: 20, kcal: 78, protein_g: 7, carbs_g: 0, fats_g: 6 },
      { name: "olio", grams: 10, kcal: 88, protein_g: 0, carbs_g: 0, fats_g: 10 },
    ],
    kcal: 364, macros: { protein: 24, carbs: 4, fats: 28 },
  },
  {
    title: "Pasta al pomodoro",
    instructions: "Cuocere la pasta in acqua salata. In una padella scaldare l'olio con il pomodoro per 10 minuti. Scolare la pasta e mantecare con sugo e parmigiano.",
    ingredients: [
      { name: "pasta", grams: 80, kcal: 284, protein_g: 10, carbs_g: 58, fats_g: 2 },
      { name: "pomodoro", grams: 150, kcal: 27, protein_g: 1, carbs_g: 6, fats_g: 0 },
      { name: "olio", grams: 10, kcal: 88, protein_g: 0, carbs_g: 0, fats_g: 10 },
      { name: "parmigiano", grams: 10, kcal: 39, protein_g: 4, carbs_g: 0, fats_g: 3 },
    ],
    kcal: 438, macros: { protein: 15, carbs: 64, fats: 15 },
  },
  {
    title: "Riso con verdure",
    instructions: "Cuocere il riso. Saltare zucchine e carote tagliate a dadini in padella con olio per 8 minuti. Unire il riso e amalgamare.",
    ingredients: [
      { name: "riso", grams: 80, kcal: 288, protein_g: 6, carbs_g: 64, fats_g: 1 },
      { name: "zucchine", grams: 100, kcal: 17, protein_g: 1, carbs_g: 2, fats_g: 0 },
      { name: "carote", grams: 80, kcal: 33, protein_g: 1, carbs_g: 7, fats_g: 0 },
      { name: "olio", grams: 10, kcal: 88, protein_g: 0, carbs_g: 0, fats_g: 10 },
    ],
    kcal: 426, macros: { protein: 8, carbs: 73, fats: 11 },
  },
  {
    title: "Insalata di pollo",
    instructions: "Grigliare il petto di pollo e tagliarlo a listarelle. Comporre l'insalata con lattuga, pomodoro e condire con olio e sale.",
    ingredients: [
      { name: "pollo", grams: 150, kcal: 165, protein_g: 31, carbs_g: 0, fats_g: 4 },
      { name: "lattuga", grams: 100, kcal: 15, protein_g: 1, carbs_g: 2, fats_g: 0 },
      { name: "pomodoro", grams: 100, kcal: 18, protein_g: 1, carbs_g: 4, fats_g: 0 },
      { name: "olio", grams: 10, kcal: 88, protein_g: 0, carbs_g: 0, fats_g: 10 },
    ],
    kcal: 286, macros: { protein: 33, carbs: 6, fats: 14 },
  },
  {
    title: "Zucchine gratinate",
    instructions: "Tagliare le zucchine a metà, farcire con pangrattato e parmigiano. Infornare a 200°C per 20 minuti fino a doratura.",
    ingredients: [
      { name: "zucchine", grams: 300, kcal: 51, protein_g: 4, carbs_g: 6, fats_g: 1 },
      { name: "parmigiano", grams: 30, kcal: 117, protein_g: 10, carbs_g: 0, fats_g: 8 },
      { name: "pangrattato", grams: 20, kcal: 76, protein_g: 3, carbs_g: 14, fats_g: 1 },
      { name: "olio", grams: 10, kcal: 88, protein_g: 0, carbs_g: 0, fats_g: 10 },
    ],
    kcal: 332, macros: { protein: 17, carbs: 20, fats: 20 },
  },
  {
    title: "Crostini con uova",
    instructions: "Tostare il pane, preparare uova strapazzate con un pizzico di parmigiano. Servire le uova sui crostini.",
    ingredients: [
      { name: "pane", grams: 80, kcal: 212, protein_g: 7, carbs_g: 40, fats_g: 2 },
      { name: "uova", grams: 100, kcal: 143, protein_g: 13, carbs_g: 1, fats_g: 10 },
      { name: "parmigiano", grams: 10, kcal: 39, protein_g: 4, carbs_g: 0, fats_g: 3 },
    ],
    kcal: 394, macros: { protein: 24, carbs: 41, fats: 15 },
  },
  {
    title: "Omelette al formaggio",
    instructions: "Sbattere le uova, cuocere in padella antiaderente. Aggiungere formaggio e prosciutto, piegare a metà e servire.",
    ingredients: [
      { name: "uova", grams: 120, kcal: 172, protein_g: 15, carbs_g: 1, fats_g: 12 },
      { name: "formaggio", grams: 40, kcal: 144, protein_g: 10, carbs_g: 0, fats_g: 12 },
      { name: "prosciutto", grams: 30, kcal: 64, protein_g: 9, carbs_g: 1, fats_g: 3 },
    ],
    kcal: 380, macros: { protein: 34, carbs: 2, fats: 27 },
  },
  {
    title: "Pasta al pesto",
    instructions: "Cuocere la pasta. Frullare basilico, parmigiano, pinoli e olio. Scolare la pasta e condire con il pesto fresco.",
    ingredients: [
      { name: "pasta", grams: 80, kcal: 284, protein_g: 10, carbs_g: 58, fats_g: 2 },
      { name: "basilico", grams: 15, kcal: 3, protein_g: 0, carbs_g: 0, fats_g: 0 },
      { name: "parmigiano", grams: 20, kcal: 78, protein_g: 7, carbs_g: 0, fats_g: 6 },
      { name: "pinoli", grams: 10, kcal: 67, protein_g: 1, carbs_g: 1, fats_g: 7 },
      { name: "olio", grams: 10, kcal: 88, protein_g: 0, carbs_g: 0, fats_g: 10 },
    ],
    kcal: 520, macros: { protein: 18, carbs: 59, fats: 25 },
  },
  {
    title: "Minestrone",
    instructions: "Tagliare tutte le verdure a dadini. Cuocere in pentola con acqua per 30 minuti. Aggiungere i fagioli a metà cottura.",
    ingredients: [
      { name: "patate", grams: 100, kcal: 77, protein_g: 2, carbs_g: 17, fats_g: 0 },
      { name: "carote", grams: 80, kcal: 33, protein_g: 1, carbs_g: 7, fats_g: 0 },
      { name: "zucchine", grams: 100, kcal: 17, protein_g: 1, carbs_g: 2, fats_g: 0 },
      { name: "fagioli", grams: 80, kcal: 100, protein_g: 7, carbs_g: 17, fats_g: 0 },
      { name: "pomodoro", grams: 100, kcal: 18, protein_g: 1, carbs_g: 4, fats_g: 0 },
    ],
    kcal: 245, macros: { protein: 12, carbs: 47, fats: 0 },
  },
  {
    title: "Bruschetta",
    instructions: "Tostare le fette di pane. Tagliare i pomodori a cubetti, condire con olio, aglio e sale. Distribuire sul pane tostato.",
    ingredients: [
      { name: "pane", grams: 120, kcal: 318, protein_g: 11, carbs_g: 60, fats_g: 3 },
      { name: "pomodoro", grams: 150, kcal: 27, protein_g: 1, carbs_g: 6, fats_g: 0 },
      { name: "olio", grams: 10, kcal: 88, protein_g: 0, carbs_g: 0, fats_g: 10 },
      { name: "aglio", grams: 5, kcal: 7, protein_g: 0, carbs_g: 2, fats_g: 0 },
    ],
    kcal: 440, macros: { protein: 12, carbs: 68, fats: 13 },
  },
  {
    title: "Polpette di carne",
    instructions: "Impastare la carne macinata con pane ammollato, uova e parmigiano. Formare le polpette e cuocere in forno a 180°C per 25 minuti.",
    ingredients: [
      { name: "carne", grams: 200, kcal: 340, protein_g: 40, carbs_g: 0, fats_g: 20 },
      { name: "pane", grams: 40, kcal: 106, protein_g: 4, carbs_g: 20, fats_g: 1 },
      { name: "uova", grams: 50, kcal: 72, protein_g: 6, carbs_g: 0, fats_g: 5 },
      { name: "parmigiano", grams: 15, kcal: 59, protein_g: 5, carbs_g: 0, fats_g: 4 },
    ],
    kcal: 577, macros: { protein: 55, carbs: 20, fats: 30 },
  },
  {
    title: "Insalata di riso",
    instructions: "Cuocere il riso e lasciarlo raffreddare. Aggiungere tonno sgocciolato, pomodorini, mais e olive. Condire con olio e limone.",
    ingredients: [
      { name: "riso", grams: 80, kcal: 288, protein_g: 6, carbs_g: 64, fats_g: 1 },
      { name: "tonno", grams: 80, kcal: 88, protein_g: 20, carbs_g: 0, fats_g: 1 },
      { name: "pomodoro", grams: 80, kcal: 14, protein_g: 1, carbs_g: 3, fats_g: 0 },
      { name: "mais", grams: 40, kcal: 38, protein_g: 1, carbs_g: 8, fats_g: 1 },
      { name: "olive", grams: 20, kcal: 29, protein_g: 0, carbs_g: 1, fats_g: 3 },
    ],
    kcal: 457, macros: { protein: 28, carbs: 76, fats: 6 },
  },
  {
    title: "Torta salata",
    instructions: "Stendere la pasta sfoglia nella teglia. Mescolare ricotta, spinaci e uova. Versare il ripieno e cuocere in forno a 180°C per 35 minuti.",
    ingredients: [
      { name: "uova", grams: 100, kcal: 143, protein_g: 13, carbs_g: 1, fats_g: 10 },
      { name: "ricotta", grams: 150, kcal: 174, protein_g: 12, carbs_g: 5, fats_g: 12 },
      { name: "spinaci", grams: 200, kcal: 46, protein_g: 6, carbs_g: 7, fats_g: 1 },
      { name: "pasta sfoglia", grams: 100, kcal: 350, protein_g: 5, carbs_g: 30, fats_g: 24 },
    ],
    kcal: 713, macros: { protein: 36, carbs: 43, fats: 47 },
  },
  {
    title: "Piadina farcita",
    instructions: "Scaldare la piadina in padella. Farcire con prosciutto, mozzarella e lattuga. Piegare a metà e servire calda.",
    ingredients: [
      { name: "piadina", grams: 100, kcal: 310, protein_g: 8, carbs_g: 48, fats_g: 10 },
      { name: "prosciutto", grams: 40, kcal: 85, protein_g: 12, carbs_g: 1, fats_g: 4 },
      { name: "mozzarella", grams: 60, kcal: 168, protein_g: 12, carbs_g: 1, fats_g: 13 },
      { name: "lattuga", grams: 30, kcal: 5, protein_g: 0, carbs_g: 1, fats_g: 0 },
    ],
    kcal: 568, macros: { protein: 32, carbs: 51, fats: 27 },
  },
  {
    title: "Verdure al forno",
    instructions: "Tagliare tutte le verdure a pezzi. Condire con olio, sale e rosmarino. Infornare a 200°C per 30 minuti mescolando a metà.",
    ingredients: [
      { name: "zucchine", grams: 150, kcal: 26, protein_g: 2, carbs_g: 3, fats_g: 0 },
      { name: "melanzane", grams: 150, kcal: 38, protein_g: 1, carbs_g: 9, fats_g: 0 },
      { name: "peperoni", grams: 150, kcal: 30, protein_g: 1, carbs_g: 6, fats_g: 0 },
      { name: "olio", grams: 15, kcal: 133, protein_g: 0, carbs_g: 0, fats_g: 15 },
    ],
    kcal: 227, macros: { protein: 4, carbs: 18, fats: 15 },
  },
];

const getDaysToExpiry = (date: string | null): number => {
  if (!date) return 999;
  const today = new Date(); today.setHours(0, 0, 0, 0);
  return Math.ceil((new Date(date).getTime() - today.getTime()) / 864e5);
};

/** Condimenti/aromi di supporto: ok se assenti dalla dispensa. */
function isOptionalAromatic(name: string): boolean {
  const n = name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
  if (n === "sale" || /\bsale\b/.test(n)) return true;
  if (/\bpepe\b/.test(n) && !/peperon/.test(n)) return true;
  if (/\bolio\b/.test(n) && !/sott/.test(n)) return true;
  if (n === "acqua" || /\bacqua\b/.test(n)) return true;
  if (/\baceto\b/.test(n)) return true;
  if (/\bcipoll/.test(n)) return true;
  if (/\baglio\b/.test(n)) return true;
  if (/\bprezzemol/.test(n)) return true;
  if (/\brosmarin/.test(n)) return true;
  if (/\borigan/.test(n)) return true;
  if (n === "timo" || /\btimo\b/.test(n)) return true;
  if (/\bsalvia\b/.test(n)) return true;
  if (/\blauro\b/.test(n) || /\balloro\b/.test(n)) return true;
  if (/\bpeperoncin/.test(n)) return true;
  if (/\bspezie\b/.test(n) || /\berbe\b/.test(n)) return true;
  if (/\bbasilico\s+secco\b/.test(n)) return true;
  if (/scorza/.test(n) || /\bzest\b/.test(n)) return true;
  if (/\bburro\b/.test(n) && n.length < 20) return true;
  return false;
}

function resolveRole(name: string, role?: "core" | "minor" | "staple"): "core" | "minor" | "staple" {
  if (isOptionalAromatic(name)) return "staple";
  if (role === "core" || role === "minor" || role === "staple") return role;
  return "core";
}

function ingredientInPantry(name: string, pantryNames: string[]): boolean {
  if (isOptionalAromatic(name)) return true;
  const ingLower = name.toLowerCase();
  return pantryNames.some(p => p.includes(ingLower) || ingLower.includes(p));
}

function missingBreakdown(ingredients: { name: string; available: boolean; role?: "core" | "minor" | "staple" }[]) {
  let missingCore = 0;
  let missingMinor = 0;
  for (const i of ingredients) {
    if (i.available || isOptionalAromatic(i.name)) continue;
    const role = resolveRole(i.name, i.role);
    if (role === "staple") continue;
    if (role === "core") missingCore++;
    else missingMinor++;
  }
  return { missingCore, missingMinor };
}

function matchScore(pantryNames: string[], recipeIngredients: { name: string }[], expiringNames: Set<string>) {
  let matched = 0, expiringUsed = 0, missingNonStaple = 0;
  for (const ing of recipeIngredients) {
    const found = ingredientInPantry(ing.name, pantryNames);
    if (found) {
      matched++;
      const ingLower = ing.name.toLowerCase();
      if (!isOptionalAromatic(ing.name) && [...expiringNames].some(e => e.includes(ingLower) || ingLower.includes(e))) {
        expiringUsed++;
      }
    } else if (!isOptionalAromatic(ing.name)) {
      missingNonStaple++;
    }
  }
  return { matched, total: recipeIngredients.length, expiringUsed, missingNonStaple };
}


/* ═══ COMPONENT ═══ */
const AntiWastePage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();

  const [pantry, setPantry] = useState<PantryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [soloExpiring, setSoloExpiring] = useState(searchParams.get("mode") === "expiring");

  // AI state
  const [aiSuggestions, setAiSuggestions] = useState<SuggestedRecipe[]>([]);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiContext, setAiContext] = useState<{ pantry_count: number; expiring_count: number } | null>(null);

  const [cooking, setCooking] = useState<string | null>(null);
  /** Titles already cooked this session — hide from both lists after success */
  const [cookedKeys, setCookedKeys] = useState<Set<string>>(() => new Set());

  const recipeDismissKey = (recipe: SuggestedRecipe) => `${recipe.source}:${recipe.title}`;

  useEffect(() => {
    setSoloExpiring(searchParams.get("mode") === "expiring");
  }, [searchParams]);

  const toggleSoloExpiring = () => {
    const next = !soloExpiring;
    setSoloExpiring(next);
    if (next) {
      setSearchParams({ mode: "expiring" }, { replace: true });
    } else {
      setSearchParams({}, { replace: true });
    }
  };

  const fetchPantry = useCallback(async (): Promise<PantryItem[]> => {
    if (!user) return [];
    const { data } = await supabase
      .from("inventory_items")
      .select("id, quantity, unit, storage_type, expiry_date, product:products(id, name, brand, image_url, category, calories_100g, macros_100g)")
      .eq("owner_user_id", user.id)
      .order("expiry_date", { ascending: true, nullsFirst: false });
    const items = (data as unknown as PantryItem[]) || [];
    setPantry(items);
    setLoading(false);
    return items;
  }, [user]);

  useEffect(() => {
    if (!user) return;
    fetchPantry();
  }, [user, fetchPantry]);

  const expiringItems = useMemo(() =>
    pantry.filter(i => { const d = getDaysToExpiry(i.expiry_date); return d >= 0 && d <= 5; }),
  [pantry]);

  const pantryNames = useMemo(() => pantry.map(i => i.product.name.toLowerCase()), [pantry]);
  const expiringNames = useMemo(() => new Set(expiringItems.map(i => i.product.name.toLowerCase())), [expiringItems]);

  // Local suggestions — prefer cookable; allow at most 1 missing non-staple so list isn't empty
  const localSuggestions = useMemo((): SuggestedRecipe[] => {
    if (pantry.length === 0) return [];
    const scored = RECIPE_DB.map(recipe => {
      const { matched, total, expiringUsed, missingNonStaple } = matchScore(pantryNames, recipe.ingredients, expiringNames);
      if (matched === 0) return null;
      // Drop absurd partials (e.g. pesto with only pasta: many cores missing)
      if (missingNonStaple > 1) return null;
      const availabilityRatio = matched / total;
      const score = availabilityRatio * 50 + expiringUsed * 30 + (missingNonStaple === 0 ? 25 : 5) + matched * 2;
      const ingredients: RecipeIngredient[] = recipe.ingredients.map(ing => {
        const available = ingredientInPantry(ing.name, pantryNames);
        const ingLower = ing.name.toLowerCase();
        return {
          name: ing.name.charAt(0).toUpperCase() + ing.name.slice(1),
          available,
          role: isOptionalAromatic(ing.name) ? "staple" : "core",
          expiring: available && !isOptionalAromatic(ing.name)
            && [...expiringNames].some(e => e.includes(ingLower) || ingLower.includes(e)),
          qty: `${ing.grams}g`,
          grams: ing.grams,
          kcal: ing.kcal,
          protein_g: ing.protein_g,
          carbs_g: ing.carbs_g,
          fats_g: ing.fats_g,
        };
      });
      return {
        title: recipe.title,
        ingredients,
        instructions: recipe.instructions,
        estimatedKcal: recipe.kcal,
        estimatedMacros: recipe.macros,
        usesExpiringCount: expiringUsed,
        source: "local" as const,
        score,
      };
    }).filter(Boolean) as (SuggestedRecipe & { score: number })[];

    let filtered = soloExpiring ? scored.filter(s => s.usesExpiringCount > 0) : scored;
    filtered = filtered.filter(s => !cookedKeys.has(`local:${s.title}`));
    return filtered.sort((a, b) => b.score - a.score).slice(0, 6);
  }, [pantryNames, expiringNames, soloExpiring, pantry, cookedKeys]);

  const visibleAiSuggestions = useMemo(() => {
    // Trust server filtering; only re-check availability for display and soft-rank
    let list = aiSuggestions
      .map(s => {
        const ingredients = s.ingredients.map(i => {
          const role = resolveRole(i.name, i.role);
          const inPantry = pantryNames.some(p => {
            const ingLower = i.name.toLowerCase();
            return p.includes(ingLower) || ingLower.includes(p);
          });
          const available = role === "staple" || isOptionalAromatic(i.name) ? true : inPantry;
          const ingLower = i.name.toLowerCase();
          return {
            ...i,
            role,
            available,
            expiring: available && role !== "staple"
              && [...expiringNames].some(e => e.includes(ingLower) || ingLower.includes(e)),
          };
        });
        const { missingCore, missingMinor } = missingBreakdown(ingredients);
        return {
          ...s,
          ingredients,
          usesExpiringCount: ingredients.filter(i => i.expiring).length,
          _missingCore: missingCore,
          _missingMinor: missingMinor,
        };
      })
      // Soft client guard: drop only absurd missing-core; keep ≤1 minor missing
      .filter(s => s._missingCore === 0 && s._missingMinor <= 1)
      .filter(s => !cookedKeys.has(`ai:${s.title}`));

    // If soft guard emptied a non-empty AI response, show original ranked list (never blank after Genera)
    if (list.length === 0 && aiSuggestions.length > 0) {
      list = aiSuggestions
        .filter(s => !cookedKeys.has(`ai:${s.title}`))
        .map(s => ({ ...s, _missingCore: 0, _missingMinor: 0 }));
    }

    if (soloExpiring) {
      const onlyExp = list.filter(s => s.usesExpiringCount > 0);
      if (onlyExp.length > 0) list = onlyExp;
    }
    return list.sort((a, b) => {
      const courseRank = (s: typeof a) => (s.course === "dolce" ? 2 : s.difficulty === "gourmet" ? 1 : 0);
      const cr = courseRank(a) - courseRank(b);
      if (cr !== 0) return cr;
      if (a._missingMinor !== b._missingMinor) return a._missingMinor - b._missingMinor;
      return b.usesExpiringCount - a.usesExpiringCount;
    });
  }, [aiSuggestions, soloExpiring, cookedKeys, pantryNames, expiringNames]);

  // AI suggest
  const handleAiSuggest = async () => {
    if (!user) return;
    setAiLoading(true);
    setAiError(null);
    try {
      const { data: result, error: fnErr } = await supabase.functions.invoke("suggest-meal");
      if (fnErr) throw fnErr;
      if (result?.error) throw new Error(result.error);
      const mapped: SuggestedRecipe[] = (result.suggestions || []).map((s: any) => {
        const ingredients: RecipeIngredient[] = (s.ingredients || []).map((i: any) => {
          const name = i.name || "";
          const role = resolveRole(name, i.role);
          const inPantry = pantryNames.some(p => {
            const ingLower = name.toLowerCase();
            return p.includes(ingLower) || ingLower.includes(p);
          });
          const available = role === "staple" || isOptionalAromatic(name) ? true : inPantry;
          const ingLower = name.toLowerCase();
          return {
            name,
            role,
            available,
            expiring: available && role !== "staple"
              && [...expiringNames].some(e => e.includes(ingLower) || ingLower.includes(e)),
            qty: i.quantity,
            grams: parseFloat(i.quantity) || 100,
            kcal: i.kcal || 0,
            protein_g: i.protein_g || 0,
            carbs_g: i.carbs_g || 0,
            fats_g: i.fats_g || 0,
          };
        });
        return {
          title: s.title,
          reason: s.reason,
          instructions: s.instructions || s.reason,
          estimatedKcal: s.estimated_kcal,
          estimatedMacros: s.estimated_macros,
          ingredients,
          usesExpiringCount: ingredients.filter(i => i.expiring).length,
          source: "ai" as const,
          difficulty: s.difficulty === "gourmet" ? "gourmet" : "facile",
          course: s.course === "dolce" || /dolce|dessert|torta|budino|mousse|tiramis|yogurt\s+con|macedonia|cioccolat/i.test(s.title || "")
            ? "dolce"
            : "salato",
        };
      });
      setAiSuggestions(mapped);
      setAiContext({
        pantry_count: result.pantry_count,
        expiring_count: result.expiring_count,
      });
      if (mapped.length === 0 && (result.pantry_count ?? pantry.length) > 0) {
        setAiError("Nessun suggerimento generato. Riprova tra poco.");
      }
    } catch (e: any) {
      setAiError(e.message || "Errore AI");
      toast({ variant: "destructive", title: "Errore", description: e.message });
    } finally {
      setAiLoading(false);
    }
  };

  const handleCook = async (recipe: SuggestedRecipe) => {
    if (!user) return;
    const dismissKey = recipeDismissKey(recipe);
    setCooking(dismissKey);
    try {
      const pantryItems = recipe.ingredients.filter(i => i.available).map(i => ({
        custom_name: i.name, dish_name: i.name,
        quantity: i.grams || parseFloat(i.qty) || 100,
        unit: "g",
      }));
      if (pantryItems.length > 0) await deductPantryFromMeal(user.id, pantryItems);

      for (const ing of recipe.ingredients) {
        if (ing.available && ing.expiring) {
          await supabase.from("waste_savings" as any).insert({
            user_id: user.id, item_name: ing.name,
            weight_g: ing.grams || parseFloat(ing.qty) || 100,
            estimated_price: 0.8,
            source: recipe.source === "ai" ? "ai_suggestion" : "cooked",
          } as any);
        }
      }

      // Remove card immediately; keep it hidden even if pantry still partially matches
      setCookedKeys(prev => new Set(prev).add(dismissKey));
      if (recipe.source === "ai") {
        setAiSuggestions(prev => prev.filter(r => r.title !== recipe.title));
      }

      const fresh = await fetchPantry();
      const freshExpiring = fresh.filter(i => {
        const d = getDaysToExpiry(i.expiry_date);
        return d >= 0 && d <= 5;
      });
      setAiContext(prev =>
        prev
          ? { pantry_count: fresh.length, expiring_count: freshExpiring.length }
          : null,
      );

      toast({ title: `"${recipe.title}" cucinata! ✅`, description: "Dispensa aggiornata" });
    } catch (e: any) {
      toast({ variant: "destructive", title: "Errore", description: e.message });
    } finally {
      setCooking(null);
    }
  };

  /* ─── Render recipe card ─── */
  const RecipeCard = ({ recipe }: { recipe: SuggestedRecipe }) => {
    const [open, setOpen] = useState(false);
    const { missingCore, missingMinor } = missingBreakdown(recipe.ingredients);
    const missingCount = missingCore + missingMinor;
    const key = recipeDismissKey(recipe);

    return (
      <div className="rounded-[18px] bg-card shadow-card overflow-hidden">
        <div className="p-4 pb-3 space-y-2">
          {/* Title + kcal */}
          <div className="flex items-start justify-between">
            <p className="text-[14px] font-bold text-foreground flex items-center gap-1.5 flex-1">
              {recipe.source === "ai" && <Sparkles className="h-3.5 w-3.5 text-primary shrink-0" />}
              {recipe.title}
            </p>
            <span className="text-xs font-semibold text-primary shrink-0 ml-2">{recipe.estimatedKcal} kcal</span>
          </div>

          {/* Macros summary */}
          <div className="flex gap-3 text-[11px]">
            <span className="px-2 py-0.5 rounded-md bg-blue-500/10 text-blue-600 font-medium">P {recipe.estimatedMacros.protein}g</span>
            <span className="px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-600 font-medium">C {recipe.estimatedMacros.carbs}g</span>
            <span className="px-2 py-0.5 rounded-md bg-rose-500/10 text-rose-600 font-medium">G {recipe.estimatedMacros.fats}g</span>
          </div>

          {/* Badges */}
          <div className="flex flex-wrap gap-1">
            {recipe.course === "dolce" && (
              <Badge variant="outline" className="text-[9px] border-pink-500/40 text-pink-600 h-5">
                Dolce
              </Badge>
            )}
            {recipe.difficulty === "gourmet" && (
              <Badge variant="outline" className="text-[9px] border-primary/40 text-primary h-5">
                Gourmet
              </Badge>
            )}
            {recipe.usesExpiringCount > 0 && (
              <Badge variant="outline" className="text-[9px] border-warning/40 text-warning h-5">
                <Clock className="h-3 w-3 mr-0.5" /> Usa {recipe.usesExpiringCount} in scadenza
              </Badge>
            )}
            {missingCount > 0 && (
              <Badge variant="outline" className="text-[9px] border-muted-foreground/40 text-muted-foreground h-5">
                {missingCount} mancant{missingCount === 1 ? "e" : "i"}
              </Badge>
            )}
          </div>
        </div>

        {/* Instructions */}
        {recipe.instructions && (
          <div className="px-4 pb-2">
            <p className="text-[12px] text-muted-foreground leading-relaxed">
              📝 {recipe.instructions}
            </p>
          </div>
        )}

        {/* Collapsible ingredients detail */}
        <Collapsible open={open} onOpenChange={setOpen}>
          <CollapsibleTrigger asChild>
            <button className="w-full px-4 py-2 flex items-center justify-center gap-1 text-[11px] font-medium text-muted-foreground hover:text-foreground transition-colors">
              {open ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
              Ingredienti ({recipe.ingredients.length})
            </button>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="px-4 pb-3 space-y-1">
              {/* Header */}
              <div className="flex text-[9px] text-muted-foreground uppercase tracking-wider border-b border-border/50 pb-1 mb-1">
                <span className="flex-1">Ingrediente</span>
                <span className="w-12 text-right">g</span>
                <span className="w-12 text-right">kcal</span>
                <span className="w-10 text-right">P</span>
                <span className="w-10 text-right">C</span>
                <span className="w-10 text-right">G</span>
              </div>
              {recipe.ingredients.map((ing, i) => {
                const shownAvailable = ing.available || isOptionalAromatic(ing.name);
                return (
                <div key={i} className={`flex items-center text-[11px] py-0.5 ${
                  ing.expiring ? "text-warning" : shownAvailable ? "text-foreground" : "text-muted-foreground"
                }`}>
                  <span className="flex-1 flex items-center gap-1">
                    {ing.expiring ? <Clock className="h-2.5 w-2.5 shrink-0" /> : shownAvailable ? <Check className="h-2.5 w-2.5 text-success shrink-0" /> : <X className="h-2.5 w-2.5 shrink-0" />}
                    {ing.name}
                  </span>
                  <span className="w-12 text-right tabular-nums font-medium">{ing.grams || "-"}</span>
                  <span className="w-12 text-right tabular-nums">{ing.kcal || "-"}</span>
                  <span className="w-10 text-right tabular-nums">{ing.protein_g || "-"}</span>
                  <span className="w-10 text-right tabular-nums">{ing.carbs_g || "-"}</span>
                  <span className="w-10 text-right tabular-nums">{ing.fats_g || "-"}</span>
                </div>
                );
              })}
            </div>
          </CollapsibleContent>
        </Collapsible>

        {/* Cook button */}
        <div className="px-4 pb-4">
          <Button size="sm" onClick={() => handleCook(recipe)} disabled={cooking !== null} className="w-full h-9 rounded-xl text-[12px] font-semibold">
            {cooking === key ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : <Utensils className="h-3.5 w-3.5 mr-1.5" />}
            Ho cucinato — scala dispensa
          </Button>
        </div>
      </div>
    );
  };

  return (
    <div>
      <MobileHeader title="Ricette anti-spreco" />
      <main className="space-y-4 px-4 py-5 pb-28">

        {/* Expiring items summary */}
        {expiringItems.length > 0 && (
          <div className="rounded-[18px] bg-warning/8 shadow-card p-4 space-y-2">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-warning" />
              <p className="text-sm font-semibold text-foreground">
                {expiringItems.length} aliment{expiringItems.length === 1 ? "o" : "i"} in scadenza
              </p>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {expiringItems.slice(0, 6).map(item => (
                <Badge key={item.id} variant="outline" className="text-[10px] border-warning/40 text-warning">
                  <Clock className="h-3 w-3 mr-1" />
                  {item.product.name} · {getDaysToExpiry(item.expiry_date)}gg
                </Badge>
              ))}
            </div>
          </div>
        )}

        <p className="text-[13px] text-muted-foreground leading-relaxed">
          Cucina con quello che hai in casa — le ricette che usano ingredienti in scadenza vengono mostrate per prime.
        </p>

        {expiringItems.length > 0 && (
          <div className="flex">
            <button
              type="button"
              onClick={toggleSoloExpiring}
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[12px] font-semibold transition-colors ${
                soloExpiring
                  ? "bg-warning/15 text-warning border border-warning/40"
                  : "bg-secondary text-muted-foreground border border-transparent"
              }`}
            >
              <Clock className="h-3.5 w-3.5" />
              Solo in scadenza
            </button>
          </div>
        )}

        {/* AI suggest button */}
        <div className="rounded-[18px] bg-card shadow-card overflow-hidden">
          <div className="h-1 w-full bg-primary" />
          <div className="p-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl shrink-0 bg-primary/10">
              <Sparkles className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-semibold text-foreground">Suggerimenti AI personalizzati</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">Analizza dispensa e scadenze</p>
            </div>
            <Button size="sm" onClick={handleAiSuggest} disabled={aiLoading} className="shrink-0 h-8 rounded-lg text-[11px] font-semibold px-3">
              {aiLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <><Sparkles className="h-3.5 w-3.5 mr-1" /> Genera</>}
            </Button>
          </div>
        </div>

        {aiError && (
          <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-[12px] text-destructive">{aiError}</div>
        )}

        {aiContext && (
          <div className="flex gap-2">
            {[
              { n: aiContext.pantry_count, label: "In dispensa", color: "text-foreground" },
              { n: aiContext.expiring_count, label: "In scadenza", color: "text-warning" },
            ].map(({ n, label, color }) => (
              <div key={label} className="flex-1 rounded-xl bg-card shadow-card p-2.5 text-center">
                <p className={`text-base font-bold ${color}`}>{n}</p>
                <p className="text-[9px] text-muted-foreground uppercase tracking-wider">{label}</p>
              </div>
            ))}
          </div>
        )}

        {/* AI suggestions */}
        {visibleAiSuggestions.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-[13px] font-bold text-foreground flex items-center gap-1.5">
              <Sparkles className="h-4 w-4 text-primary" /> Suggeriti dall'AI
            </h3>
            {visibleAiSuggestions.map((recipe) => (
              <RecipeCard key={`ai-${recipe.title}`} recipe={recipe} />
            ))}
          </div>
        )}

        {aiContext && !aiLoading && visibleAiSuggestions.length === 0 && !aiError && pantry.length > 0 && (
          <div className="rounded-xl border border-border bg-card p-3 text-[12px] text-muted-foreground">
            Nessun suggerimento AI mostrato. Tocca Genera di nuovo per nuove ricette dalla dispensa.
          </div>
        )}

        {/* Local suggestions */}
        {loading ? (
          <ListSkeleton count={3} variant="row" />
        ) : localSuggestions.length === 0 && visibleAiSuggestions.length === 0 ? (
          <EmptyState icon={ChefHat} title="Nessuna ricetta trovata"
            description={
              pantry.length === 0
                ? "Aggiungi prodotti nella dispensa per ricevere suggerimenti."
                : soloExpiring
                  ? "Nessuna ricetta usa ingredienti in scadenza. Disattiva il filtro per vedere tutte le ricette."
                  : "Prova Genera per ricette AI adattate a ciò che hai, oppure aggiungi altri prodotti."
            }
            actions={[
              { label: "Vai alla dispensa", icon: Package, onClick: () => navigate("/products") },
              ...(pantry.length > 0
                ? [{ label: "Genera con AI", icon: Sparkles, onClick: () => { void handleAiSuggest(); } }]
                : []),
            ]}
          />
        ) : localSuggestions.length > 0 ? (
          <div className="space-y-2">
            <h3 className="text-[13px] font-bold text-foreground flex items-center gap-1.5">
              <ChefHat className="h-4 w-4 text-success" /> Ricette rapide
            </h3>
            {localSuggestions.map((recipe) => (
              <RecipeCard key={`local-${recipe.title}`} recipe={recipe} />
            ))}
          </div>
        ) : null}
      </main>
    </div>
  );
};

export default AntiWastePage;
