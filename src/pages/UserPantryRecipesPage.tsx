import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import MobileHeader from "@/components/MobileHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { loadTemplates, getNutritionPer100g } from "@/lib/nutrition";
import {
  Loader2, Wand2, Package, Flame, AlertTriangle,
  RefreshCw, ShoppingCart, ChefHat, Trophy, Target, Plus
} from "lucide-react";

const MEAL_LABELS: Record<string, string> = {
  colazione: "☀️ Colazione",
  pranzo: "🌤️ Pranzo",
  cena: "🌙 Cena",
  spuntino: "🍎 Spuntino",
};

type GoalType = "balanced" | "high_protein" | "low_carb" | "low_fat" | "deficit" | "surplus";

const GOALS: { value: GoalType; label: string; emoji: string; description: string }[] = [
  { value: "balanced", label: "Equilibrio", emoji: "⚖️", description: "Macro bilanciati rispetto al target" },
  { value: "high_protein", label: "Proteine alte", emoji: "💪", description: "Massimizza proteine, carbo flessibili" },
  { value: "low_carb", label: "Low carb", emoji: "🥬", description: "Riduce carboidrati, favorisce proteine e grassi" },
  { value: "low_fat", label: "Low fat", emoji: "🫒", description: "Riduce grassi, favorisce carbo e proteine" },
  { value: "deficit", label: "Deficit calorico", emoji: "📉", description: "Target kcal ridotto del 10%" },
  { value: "surplus", label: "Massa", emoji: "📈", description: "Target kcal aumentato del 10% (surplus controllato)" },
];

const GOAL_BADGE_LABELS: Record<GoalType, string> = {
  balanced: "Equilibrio",
  high_protein: "High Protein",
  low_carb: "Low Carb",
  low_fat: "Low Fat",
  deficit: "Deficit",
  surplus: "Massa",
};

interface InventoryItem {
  id: string;
  quantity: number;
  unit: string | null;
  storage_type: string;
  expiry_date: string | null;
  product: {
    id: string;
    name: string;
    brand: string | null;
    calories_100g: number | null;
    macros_100g: any;
    template_id: string | null;
  };
}

interface GeneratedRecipe {
  title: string;
  ingredients: { name: string; product_id?: string; qty: number; unit: string }[];
  instructions: string;
  kcal_total: number;
  macros: { protein: number; carbs: number; fats: number };
  fit_score: number;
  notes: string;
  partial_estimate: boolean;
  goal: GoalType;
}

interface MealTarget {
  kcal_target: number;
  protein_g: number;
  carbs_g: number;
  fats_g: number;
}

function computeFitScore(
  totals: { kcal: number; protein: number; carbs: number; fats: number },
  target: MealTarget,
  goal: GoalType
): number {
  const kcalDiff = Math.abs(totals.kcal - target.kcal_target) / Math.max(target.kcal_target, 1);
  const pDiff = Math.abs(totals.protein - target.protein_g) / Math.max(target.protein_g, 1);
  const cDiff = Math.abs(totals.carbs - target.carbs_g) / Math.max(target.carbs_g, 1);
  const fDiff = Math.abs(totals.fats - target.fats_g) / Math.max(target.fats_g, 1);

  let pPenalty = 0, cPenalty = 0, fPenalty = 0;
  switch (goal) {
    case "high_protein":
      if (totals.protein < target.protein_g) pPenalty = pDiff * 1.5;
      break;
    case "low_carb":
      if (totals.carbs > target.carbs_g) cPenalty = cDiff * 1.5;
      break;
    case "low_fat":
      if (totals.fats > target.fats_g) fPenalty = fDiff * 1.5;
      break;
  }

  let weights: number[];
  switch (goal) {
    case "high_protein": weights = [1, 2, 0.5, 0.7]; break;
    case "low_carb": weights = [1, 1, 2, 0.7]; break;
    case "low_fat": weights = [1, 1, 0.7, 2]; break;
    default: weights = [1, 1, 1, 1]; break;
  }

  const totalWeight = weights.reduce((a, b) => a + b, 0);
  const wAvg = (
    weights[0] * kcalDiff +
    weights[1] * (pDiff + pPenalty) +
    weights[2] * (cDiff + cPenalty) +
    weights[3] * (fDiff + fPenalty)
  ) / totalWeight;

  return Math.max(0, Math.round(100 - wAvg * 100));
}

function getGoalNotes(
  totals: { kcal: number; protein: number; carbs: number; fats: number },
  target: MealTarget,
  goal: GoalType
): string {
  switch (goal) {
    case "high_protein":
      return totals.protein >= target.protein_g
        ? "Alta proteina raggiunta, carboidrati controllati."
        : "Proteine sotto target — considera ingredienti più proteici.";
    case "low_carb":
      return totals.carbs <= target.carbs_g
        ? "Carboidrati ridotti con buon apporto proteico."
        : "Carbo sopra target — riduci cereali e amidacei.";
    case "low_fat":
      return totals.fats <= target.fats_g
        ? "Grassi contenuti, buon equilibrio proteico."
        : "Grassi sopra target — preferisci tagli magri.";
    case "deficit":
      return `Deficit calorico: ${totals.kcal} kcal (target ridotto ~${Math.round(target.kcal_target * 0.9)}).`;
    case "surplus":
      return `Surplus controllato: ${totals.kcal} kcal (target +10% ~${Math.round(target.kcal_target * 1.1)}).`;
    default:
      return "Macro bilanciati secondo il target del pasto.";
  }
}

const UserPantryRecipesPage = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [storageFilter, setStorageFilter] = useState("all");
  const [mealType, setMealType] = useState("pranzo");
  const [goal, setGoal] = useState<GoalType>("balanced");
  const [mealTarget, setMealTarget] = useState<MealTarget | null>(null);
  const [allTargets, setAllTargets] = useState<any[]>([]);
  const [priorityExpiry, setPriorityExpiry] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [generating, setGenerating] = useState(false);
  const [recipes, setRecipes] = useState<GeneratedRecipe[]>([]);
  const [templates, setTemplates] = useState<Map<string, any>>(new Map());
  const [targetSource, setTargetSource] = useState<"plan" | "personal" | "none">("none");

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      // Fetch inventory + diet plan (from pro) + personal nutrition_targets in parallel
      const [invRes, planRes, targetsRes] = await Promise.all([
        supabase
          .from("inventory_items")
          .select("id, quantity, unit, storage_type, expiry_date, product:products(id, name, brand, calories_100g, macros_100g, template_id)")
          .eq("owner_user_id", user.id)
          .order("expiry_date", { ascending: true, nullsFirst: false }),
        supabase
          .from("diet_plans")
          .select("id, kcal_day, protein_g_day, carbs_g_day, fats_g_day, diet_plan_meal_targets(*)")
          .eq("client_user_id", user.id)
          .eq("is_active", true)
          .maybeSingle(),
        supabase
          .from("nutrition_targets")
          .select("*")
          .eq("user_id", user.id)
          .maybeSingle(),
      ]);

      const loadedItems = (invRes.data as unknown as InventoryItem[]) ?? [];
      setItems(loadedItems);

      const tmpl = await loadTemplates();
      setTemplates(tmpl);

      // Prefer diet_plan meal targets from pro, fallback to personal nutrition_targets split evenly
      if (planRes.data) {
        const targets = (planRes.data as any).diet_plan_meal_targets ?? [];
        if (targets.length > 0) {
          setAllTargets(targets);
          setTargetSource("plan");
        } else {
          // Plan exists but no per-meal targets — derive from daily
          const p = planRes.data;
          const derived = deriveMealTargets(p.kcal_day, p.protein_g_day, p.carbs_g_day, p.fats_g_day);
          setAllTargets(derived);
          setTargetSource("plan");
        }
      } else if (targetsRes.data) {
        const t = targetsRes.data;
        const derived = deriveMealTargets(t.kcal_day, t.protein_g ?? 120, t.carbs_g ?? 220, t.fats_g ?? 70);
        setAllTargets(derived);
        setTargetSource("personal");
      }

      // Auto-select non-expired items
      const now = new Date();
      const ids = new Set<string>();
      loadedItems.forEach((i) => {
        const expired = i.expiry_date && new Date(i.expiry_date) < now;
        if (!expired) ids.add(i.id);
      });
      setSelectedIds(ids);
      setLoading(false);
    };
    load();
  }, [user]);

  // Derive approximate meal targets from daily totals
  function deriveMealTargets(kcal: number, protein: number, carbs: number, fats: number) {
    // Split: colazione 25%, pranzo 35%, cena 30%, spuntino 10%
    const splits: Record<string, number> = { colazione: 0.25, pranzo: 0.35, cena: 0.30, spuntino: 0.10 };
    return Object.entries(splits).map(([meal, pct]) => ({
      id: meal,
      meal_type: meal,
      kcal_target: Math.round(kcal * pct),
      protein_g: Math.round(protein * pct),
      carbs_g: Math.round(carbs * pct),
      fats_g: Math.round(fats * pct),
    }));
  }

  useEffect(() => {
    const mt = allTargets.find((t: any) => t.meal_type === mealType);
    setMealTarget(mt || null);
  }, [mealType, allTargets]);

  useEffect(() => {
    if (!priorityExpiry) return;
    const now = Date.now();
    const threeDays = 3 * 86400000;
    const ids = new Set<string>();
    items.forEach((i) => {
      if (i.expiry_date) {
        const exp = new Date(i.expiry_date).getTime();
        if (exp > now && exp <= now + threeDays) ids.add(i.id);
      }
    });
    if (ids.size > 0) setSelectedIds(ids);
  }, [priorityExpiry, items]);

  const filtered = useMemo(() =>
    items.filter((i) => storageFilter === "all" || i.storage_type === storageFilter),
    [items, storageFilter]
  );

  const toggleItem = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAll = () => setSelectedIds(new Set(filtered.map((i) => i.id)));
  const deselectAll = () => setSelectedIds(new Set());

  const getExpiryStatus = (date: string | null) => {
    if (!date) return null;
    const diff = new Date(date).getTime() - Date.now();
    if (diff < 0) return "expired";
    if (diff < 3 * 86400000) return "expiring";
    return null;
  };

  // ===== RECIPE GENERATION =====
  const generateRecipes = () => {
    const selectedItems = filtered.filter((i) => selectedIds.has(i.id));
    if (!mealTarget || selectedItems.length === 0) {
      toast({ variant: "destructive", title: "Errore", description: "Seleziona ingredienti e assicurati di avere un target nutrizionale." });
      return;
    }
    setGenerating(true);

    const baseTarget = { ...mealTarget };
    const effectiveTarget: MealTarget = { ...baseTarget };
    if (goal === "deficit") effectiveTarget.kcal_target = Math.round(baseTarget.kcal_target * 0.9);
    else if (goal === "surplus") effectiveTarget.kcal_target = Math.round(baseTarget.kcal_target * 1.1);

    const generated: GeneratedRecipe[] = [];
    const strategies = [
      { name: "Ricetta A", maxIng: 6 },
      { name: "Ricetta B", maxIng: 5 },
      { name: "Ricetta C", maxIng: 7 },
    ];

    for (let s = 0; s < 3; s++) {
      const strategy = strategies[s];
      const ingredients: GeneratedRecipe["ingredients"] = [];
      let totalKcal = 0, totalP = 0, totalC = 0, totalF = 0;
      let partial = false;

      const sorted = [...selectedItems].sort((a, b) => {
        const aNut = getNutritionPer100g(a.product, templates);
        const bNut = getNutritionPer100g(b.product, templates);
        const aScore = (aNut.source !== "none" ? 10 : 0) + (getExpiryStatus(a.expiry_date) === "expiring" ? 5 : 0);
        const bScore = (bNut.source !== "none" ? 10 : 0) + (getExpiryStatus(b.expiry_date) === "expiring" ? 5 : 0);
        return bScore - aScore;
      });

      const shuffled = [...sorted];
      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.max(0, i - Math.floor(Math.random() * 3));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
      }

      const count = Math.min(strategy.maxIng, shuffled.length);
      const perIngKcal = effectiveTarget.kcal_target / count;

      for (let i = 0; i < count; i++) {
        const item = shuffled[i];
        const p = item.product;
        const nut = getNutritionPer100g(p, templates);

        let portionG: number;
        if (nut.source !== "none" && nut.calories > 0) {
          portionG = Math.round((perIngKcal / nut.calories) * 100);
          const maxAvail = (item.quantity ?? 1) * (item.unit === "kg" ? 1000 : item.unit === "g" ? 1 : 150);
          portionG = Math.max(20, Math.min(portionG, maxAvail, 500));
        } else {
          portionG = 80;
          partial = true;
        }

        const factor = portionG / 100;
        if (nut.source !== "none") {
          totalKcal += Math.round(nut.calories * factor);
          totalP += nut.protein * factor;
          totalC += nut.carbs * factor;
          totalF += nut.fats * factor;
        }
        if (nut.source === "template") partial = true;

        ingredients.push({ name: p.name, product_id: p.id, qty: portionG, unit: "g" });
      }

      const totals = { kcal: Math.round(totalKcal), protein: Math.round(totalP), carbs: Math.round(totalC), fats: Math.round(totalF) };
      const fitScore = computeFitScore(totals, effectiveTarget, goal);
      const goalNote = getGoalNotes(totals, effectiveTarget, goal);

      const extraNotes: string[] = [];
      if (partial) extraNotes.push("Stima parziale: alcuni valori da template.");

      const steps = ingredients.map((ing, idx) => `${idx + 1}. Prepara ${ing.qty}g di ${ing.name}`);
      if (s === 0) steps.push(`${ingredients.length + 1}. Combina tutti gli ingredienti e servi.`);
      else if (s === 1) steps.push(`${ingredients.length + 1}. Cuoci a fuoco medio per 10 minuti, condisci e servi.`);
      else steps.push(`${ingredients.length + 1}. Mescola in una ciotola, condisci con olio e spezie a piacere.`);

      generated.push({
        title: `${strategy.name} — ${MEAL_LABELS[mealType]}`,
        ingredients,
        instructions: steps.join("\n"),
        kcal_total: totals.kcal,
        macros: { protein: totals.protein, carbs: totals.carbs, fats: totals.fats },
        fit_score: fitScore,
        notes: [goalNote, ...extraNotes].join(" · "),
        partial_estimate: partial,
        goal,
      });
    }

    generated.sort((a, b) => b.fit_score - a.fit_score);
    setRecipes(generated);
    setGenerating(false);
  };

  // ===== ADD TO MEAL =====
  const addToMeal = async (recipe: GeneratedRecipe) => {
    if (!user) return;
    const today = new Date().toISOString().slice(0, 10);

    // Upsert meal_day
    let { data: dayData } = await supabase
      .from("meal_days")
      .select("id")
      .eq("user_id", user.id)
      .eq("day_date", today)
      .maybeSingle();

    if (!dayData) {
      const { data: newDay } = await supabase
        .from("meal_days")
        .insert({ user_id: user.id, day_date: today })
        .select("id")
        .single();
      dayData = newDay;
    }
    if (!dayData) return;

    // Upsert meal
    let { data: mealData } = await supabase
      .from("meals")
      .select("id")
      .eq("meal_day_id", dayData.id)
      .eq("meal_type", mealType)
      .maybeSingle();

    if (!mealData) {
      const { data: newMeal } = await supabase
        .from("meals")
        .insert({ meal_day_id: dayData.id, meal_type: mealType })
        .select("id")
        .single();
      mealData = newMeal;
    }
    if (!mealData) return;

    // Insert meal_items
    const itemsToInsert = recipe.ingredients.map((ing) => {
      const perFactor = ing.qty / 100;
      const nut = ing.product_id
        ? getNutritionPer100g(
            items.find((i) => i.product.id === ing.product_id)?.product || {},
            templates
          )
        : { calories: 0, protein: 0, carbs: 0, fats: 0, source: "none" as const };

      return {
        meal_id: mealData!.id,
        product_id: ing.product_id || null,
        source_type: "pantry" as string,
        custom_name: ing.product_id ? null : ing.name,
        quantity: ing.qty,
        unit: ing.unit,
        calories: Math.round(nut.calories * perFactor),
        macros: {
          protein: Math.round(nut.protein * perFactor),
          carbs: Math.round(nut.carbs * perFactor),
          fats: Math.round(nut.fats * perFactor),
        },
      };
    });

    const { error } = await supabase.from("meal_items").insert(itemsToInsert);
    if (error) {
      toast({ variant: "destructive", title: "Errore", description: error.message });
    } else {
      toast({ title: "Ricetta aggiunta al pasto! 🎉" });
    }
  };

  // ===== SHOPPING LIST =====
  const getShoppingList = (recipe: GeneratedRecipe) => {
    const missing: { name: string; reason: string }[] = [];
    recipe.ingredients.forEach((ing) => {
      const item = items.find((i) => i.product.id === ing.product_id);
      if (!item) {
        missing.push({ name: ing.name, reason: "Non in dispensa" });
      } else {
        const availG = (item.quantity ?? 0) * (item.unit === "kg" ? 1000 : item.unit === "g" ? 1 : 150);
        if (ing.qty > availG) {
          missing.push({ name: ing.name, reason: `Servono ${ing.qty}g, disponibili ~${Math.round(availG)}g` });
        }
      }
    });
    return missing;
  };

  if (loading) {
    return (
      <div>
        <MobileHeader title="Le mie ricette smart" showBack />
        <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div>
        <MobileHeader title="Le mie ricette smart" showBack />
        <main className="px-4 py-10 text-center space-y-4">
          <Package className="h-12 w-12 text-muted-foreground mx-auto" />
          <p className="text-muted-foreground">Nessun prodotto nel tuo inventario.</p>
          <Button variant="outline" onClick={() => navigate("/scan")} className="gap-2">
            <Plus className="h-4 w-4" /> Aggiungi prodotti
          </Button>
        </main>
      </div>
    );
  }

  const selectedCount = filtered.filter((i) => selectedIds.has(i.id)).length;
  const activeGoal = GOALS.find((g) => g.value === goal)!;

  return (
    <div>
      <MobileHeader title="Le mie ricette smart" showBack />
      <main className="px-4 py-5 pb-28 space-y-4">

        {/* Target source info */}
        {targetSource === "plan" && (
          <div className="rounded-lg bg-primary/5 border border-primary/20 p-2.5 flex items-center gap-2">
            <Wand2 className="h-4 w-4 text-primary shrink-0" />
            <p className="text-[11px] text-muted-foreground">
              Target basati sul <span className="font-semibold text-foreground">piano del tuo nutrizionista</span>
            </p>
          </div>
        )}
        {targetSource === "personal" && (
          <div className="rounded-lg bg-accent/10 border border-accent/20 p-2.5 flex items-center gap-2">
            <Target className="h-4 w-4 text-accent-foreground shrink-0" />
            <p className="text-[11px] text-muted-foreground">
              Target basati sui tuoi <span className="font-semibold text-foreground">obiettivi personali</span>
            </p>
          </div>
        )}
        {targetSource === "none" && (
          <div className="rounded-lg bg-amber-500/10 border border-amber-500/20 p-2.5">
            <p className="text-[11px] text-amber-700">
              ⚠️ Nessun target nutrizionale impostato.{" "}
              <button className="underline font-semibold" onClick={() => navigate("/meals/targets")}>Imposta obiettivi</button>
            </p>
          </div>
        )}

        {/* Selectors */}
        <div className="flex gap-2">
          <Select value={mealType} onValueChange={setMealType}>
            <SelectTrigger className="flex-1"><SelectValue /></SelectTrigger>
            <SelectContent>
              {Object.entries(MEAL_LABELS).map(([k, v]) => (
                <SelectItem key={k} value={k}>{v}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={storageFilter} onValueChange={setStorageFilter}>
            <SelectTrigger className="flex-1"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tutto</SelectItem>
              <SelectItem value="frigo">Frigo</SelectItem>
              <SelectItem value="freezer">Congelatore</SelectItem>
              <SelectItem value="ambiente">Dispensa</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Goal selector pills */}
        <div className="space-y-1.5">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
            <Target className="h-3.5 w-3.5" /> Obiettivo ricetta
          </div>
          <div className="flex flex-wrap gap-1.5">
            {GOALS.map((g) => (
              <button
                key={g.value}
                onClick={() => setGoal(g.value)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all border ${
                  goal === g.value
                    ? "bg-primary text-primary-foreground border-primary shadow-sm"
                    : "bg-secondary/50 text-muted-foreground border-border hover:bg-secondary"
                }`}
              >
                {g.emoji} {g.label}
              </button>
            ))}
          </div>
          <p className="text-[11px] text-muted-foreground pl-1">{activeGoal.description}</p>
        </div>

        {/* Priority toggle */}
        <div className="flex items-center justify-between rounded-lg bg-secondary/50 p-3">
          <span className="text-sm font-medium text-foreground">🔥 Priorità scadenze</span>
          <Switch checked={priorityExpiry} onCheckedChange={setPriorityExpiry} />
        </div>

        {/* Meal target */}
        {mealTarget ? (
          <div className="rounded-lg bg-primary/5 border border-primary/20 p-3">
            <p className="text-xs font-semibold text-foreground mb-1">
              Target {MEAL_LABELS[mealType]}
              {(goal === "deficit" || goal === "surplus") && (
                <span className="text-muted-foreground font-normal ml-1">
                  ({goal === "deficit" ? "-10%" : "+10%"} kcal)
                </span>
              )}
            </p>
            <div className="flex gap-3 text-xs">
              <span className="font-medium">
                {goal === "deficit"
                  ? Math.round(mealTarget.kcal_target * 0.9)
                  : goal === "surplus"
                  ? Math.round(mealTarget.kcal_target * 1.1)
                  : mealTarget.kcal_target} kcal
              </span>
              <span>P: {mealTarget.protein_g}g</span>
              <span>C: {mealTarget.carbs_g}g</span>
              <span>G: {mealTarget.fats_g}g</span>
            </div>
          </div>
        ) : targetSource !== "none" ? (
          <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-3">
            <p className="text-xs text-destructive font-medium">⚠️ Nessun target per questo pasto.</p>
          </div>
        ) : null}

        {/* Ingredients list */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-muted-foreground">
              Ingredienti ({selectedCount}/{filtered.length})
            </h3>
            <div className="flex gap-1">
              <Button size="sm" variant="ghost" className="text-[10px] h-6 px-2" onClick={selectAll}>Tutti</Button>
              <Button size="sm" variant="ghost" className="text-[10px] h-6 px-2" onClick={deselectAll}>Nessuno</Button>
            </div>
          </div>

          <div className="max-h-60 overflow-y-auto space-y-1 rounded-lg border border-border p-2">
            {filtered.map((item) => {
              const status = getExpiryStatus(item.expiry_date);
              const checked = selectedIds.has(item.id);
              return (
                <label
                  key={item.id}
                  className={`flex items-center gap-2 rounded-lg p-2 cursor-pointer transition-colors ${
                    checked ? "bg-primary/5" : "hover:bg-secondary/50"
                  } ${status === "expired" ? "opacity-40" : ""}`}
                >
                  <Checkbox checked={checked} onCheckedChange={() => toggleItem(item.id)} />
                  <Package className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium truncate">{item.product.name}</p>
                    {(() => {
                      const nut = getNutritionPer100g(item.product, templates);
                      return (
                        <p className="text-[10px] text-muted-foreground">
                          x{item.quantity} {item.unit || ""} · {item.storage_type}
                          {nut.source !== "none" ? ` · ${nut.calories} kcal/100g` : " · ⚠️ no kcal"}
                          {nut.source === "template" && " 📋"}
                        </p>
                      );
                    })()}
                  </div>
                  {status === "expired" && <Badge variant="destructive" className="text-[8px] px-1 py-0">Scaduto</Badge>}
                  {status === "expiring" && <Badge className="bg-amber-500/20 text-amber-700 border-0 text-[8px] px-1 py-0">In scadenza</Badge>}
                </label>
              );
            })}
          </div>
        </div>

        {/* Generate button */}
        <Button
          className="w-full gap-2 h-12 text-base"
          onClick={generateRecipes}
          disabled={generating || selectedCount === 0 || !mealTarget}
        >
          {generating ? <Loader2 className="h-5 w-5 animate-spin" /> : <ChefHat className="h-5 w-5" />}
          Genera 3 ricette · {activeGoal.emoji} {activeGoal.label}
        </Button>

        {/* Results */}
        {recipes.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-foreground">🍽️ Ricette generate</h3>
              <Button size="sm" variant="outline" className="gap-1 text-xs" onClick={generateRecipes}>
                <RefreshCw className="h-3 w-3" /> Rigenera
              </Button>
            </div>

            {recipes.map((recipe, idx) => {
              const shopping = getShoppingList(recipe);
              const goalInfo = GOALS.find((g) => g.value === recipe.goal);
              const effectiveKcal = goal === "deficit"
                ? Math.round((mealTarget?.kcal_target ?? 0) * 0.9)
                : goal === "surplus"
                ? Math.round((mealTarget?.kcal_target ?? 0) * 1.1)
                : mealTarget?.kcal_target ?? 0;

              return (
                <Card key={idx} className="border-2 border-accent overflow-hidden">
                  <CardHeader className="pb-2 pt-3 px-4">
                    <div className="flex items-center justify-between gap-2">
                      <CardTitle className="text-sm flex-1">{recipe.title}</CardTitle>
                      <Badge
                        className={`gap-1 text-xs font-bold ${
                          recipe.fit_score >= 80
                            ? "bg-green-500/15 text-green-700 border-green-500/30"
                            : recipe.fit_score >= 50
                            ? "bg-amber-500/15 text-amber-700 border-amber-500/30"
                            : "bg-red-500/15 text-red-700 border-red-500/30"
                        }`}
                      >
                        <Trophy className="h-3 w-3" /> Fit {recipe.fit_score}%
                      </Badge>
                    </div>
                    <div className="flex items-center gap-1.5 mt-1">
                      {goalInfo && (
                        <Badge variant="outline" className="text-[9px] px-1.5 py-0 gap-0.5">
                          {goalInfo.emoji} {GOAL_BADGE_LABELS[recipe.goal]}
                        </Badge>
                      )}
                      {recipe.partial_estimate && (
                        <Badge variant="secondary" className="gap-1 text-[9px] px-1 py-0">
                          <AlertTriangle className="h-3 w-3" /> Stima parziale
                        </Badge>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="px-4 pb-4 space-y-3">
                    {/* Macro comparison */}
                    {mealTarget && (
                      <div className="grid grid-cols-4 gap-1.5 text-center text-[10px]">
                        <div className="rounded-md bg-primary/10 p-1.5">
                          <p className="font-bold text-primary">{recipe.kcal_total}</p>
                          <p className="text-muted-foreground">/{effectiveKcal} kcal</p>
                        </div>
                        <div className="rounded-md bg-blue-500/10 p-1.5">
                          <p className="font-bold text-blue-600">{recipe.macros.protein}g</p>
                          <p className="text-muted-foreground">/{mealTarget.protein_g}g P</p>
                        </div>
                        <div className="rounded-md bg-amber-500/10 p-1.5">
                          <p className="font-bold text-amber-600">{recipe.macros.carbs}g</p>
                          <p className="text-muted-foreground">/{mealTarget.carbs_g}g C</p>
                        </div>
                        <div className="rounded-md bg-red-500/10 p-1.5">
                          <p className="font-bold text-red-600">{recipe.macros.fats}g</p>
                          <p className="text-muted-foreground">/{mealTarget.fats_g}g G</p>
                        </div>
                      </div>
                    )}

                    <p className="text-[11px] text-muted-foreground italic">{recipe.notes}</p>

                    {/* Ingredients */}
                    <div className="text-xs space-y-0.5">
                      <p className="font-semibold text-foreground text-[11px] mb-1">Ingredienti:</p>
                      {recipe.ingredients.map((ing, i) => (
                        <p key={i} className="text-muted-foreground">• {ing.qty}{ing.unit} {ing.name}</p>
                      ))}
                    </div>

                    {/* Instructions */}
                    <details className="text-xs">
                      <summary className="font-semibold text-foreground cursor-pointer text-[11px]">Istruzioni</summary>
                      <p className="text-muted-foreground whitespace-pre-line mt-1">{recipe.instructions}</p>
                    </details>

                    {/* Shopping list */}
                    {shopping.length > 0 && (
                      <details className="text-xs">
                        <summary className="font-semibold text-foreground cursor-pointer text-[11px] flex items-center gap-1">
                          <ShoppingCart className="h-3 w-3 inline" /> Lista spesa ({shopping.length})
                        </summary>
                        <div className="mt-1 space-y-0.5">
                          {shopping.map((m, i) => (
                            <p key={i} className="text-muted-foreground">• {m.name}: {m.reason}</p>
                          ))}
                        </div>
                      </details>
                    )}

                    {/* Add to meal */}
                    <Button
                      className="w-full gap-2"
                      onClick={() => addToMeal(recipe)}
                    >
                      <Plus className="h-4 w-4" />
                      Aggiungi al pasto di oggi
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
};

export default UserPantryRecipesPage;
