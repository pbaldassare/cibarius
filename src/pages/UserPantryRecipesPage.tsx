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
import { deductPantryFromMeal } from "@/lib/pantry-deduction";
import {
  Loader2, Package, Flame, AlertTriangle,
  RefreshCw, ShoppingCart, ChefHat, Plus
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
  const [priorityExpiry, setPriorityExpiry] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [generating, setGenerating] = useState(false);
  const [recipes, setRecipes] = useState<GeneratedRecipe[]>([]);
  const [templates, setTemplates] = useState<Map<string, any>>(new Map());
  const [targetSource, setTargetSource] = useState<"none">("none");

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const { data } = await supabase
        .from("inventory_items")
        .select("id, quantity, unit, storage_type, expiry_date, product:products(id, name, brand, calories_100g, macros_100g, template_id)")
        .eq("owner_user_id", user.id)
        .order("expiry_date", { ascending: true, nullsFirst: false });

      const loadedItems = (data as unknown as InventoryItem[]) ?? [];
      setItems(loadedItems);

      const tmpl = await loadTemplates();
      setTemplates(tmpl);

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
    if (selectedItems.length === 0) {
      toast({ variant: "destructive", title: "Errore", description: "Seleziona almeno un ingrediente." });
      return;
    }
    setGenerating(true);

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
      let expiringCount = 0;

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

      for (let i = 0; i < count; i++) {
        const item = shuffled[i];
        const p = item.product;
        const nut = getNutritionPer100g(p, templates);

        let portionG = 100;
        const maxAvail = (item.quantity ?? 1) * (item.unit === "kg" ? 1000 : item.unit === "g" ? 1 : 150);
        portionG = Math.max(20, Math.min(portionG, maxAvail, 300));

        const factor = portionG / 100;
        if (nut.source !== "none") {
          totalKcal += Math.round(nut.calories * factor);
          totalP += nut.protein * factor;
          totalC += nut.carbs * factor;
          totalF += nut.fats * factor;
        } else {
          partial = true;
        }
        if (nut.source === "template") partial = true;
        if (getExpiryStatus(item.expiry_date) === "expiring") expiringCount++;

        ingredients.push({ name: p.name, product_id: p.id, qty: portionG, unit: "g" });
      }

      const totals = { kcal: Math.round(totalKcal), protein: Math.round(totalP), carbs: Math.round(totalC), fats: Math.round(totalF) };
      const fitScore = Math.min(100, 50 + expiringCount * 15 + (partial ? 0 : 20));

      const steps = ingredients.map((ing, idx) => `${idx + 1}. Prepara ${ing.qty}g di ${ing.name}`);
      steps.push(`${ingredients.length + 1}. Combina gli ingredienti e servi.`);

      generated.push({
        title: strategy.name,
        ingredients,
        instructions: steps.join("\n"),
        kcal_total: totals.kcal,
        macros: { protein: totals.protein, carbs: totals.carbs, fats: totals.fats },
        fit_score: fitScore,
        notes: partial ? "Stima parziale: alcuni valori da template." : expiringCount > 0 ? `Usa ${expiringCount} ingredienti in scadenza.` : "",
        partial_estimate: partial,
        goal: "balanced",
      });
    }

    generated.sort((a, b) => b.fit_score - a.fit_score);
    setRecipes(generated);
    setGenerating(false);
  };

  // ===== ADD TO MEAL =====
  const useFromPantry = async (recipe: GeneratedRecipe) => {
    if (!user) return;
    const pantryItems = recipe.ingredients.map((ing) => ({
      custom_name: ing.name,
      dish_name: ing.name,
      quantity: ing.qty,
      unit: ing.unit || "g",
    }));
    try {
      await deductPantryFromMeal(user.id, pantryItems);
      toast({ title: "Dispensa aggiornata! ✅" });
    } catch (e: any) {
      toast({ variant: "destructive", title: "Errore", description: e.message });
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

  return (
    <div>
      <MobileHeader title="Le mie ricette smart" showBack />
      <main className="px-4 py-5 pb-28 space-y-4">

        <div className="flex gap-2">
          <Select value={storageFilter} onValueChange={setStorageFilter}>
            <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tutto</SelectItem>
              <SelectItem value="frigo">Frigo</SelectItem>
              <SelectItem value="freezer">Congelatore</SelectItem>
              <SelectItem value="ambiente">Dispensa</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Priority toggle */}
        <div className="flex items-center justify-between rounded-lg bg-secondary/50 p-3">
          <span className="text-sm font-medium text-foreground">🔥 Priorità scadenze</span>
          <Switch checked={priorityExpiry} onCheckedChange={setPriorityExpiry} />
        </div>

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
          disabled={generating || selectedCount === 0}
        >
          {generating ? <Loader2 className="h-5 w-5 animate-spin" /> : <ChefHat className="h-5 w-5" />}
          Genera 3 ricette dalla dispensa
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

              return (
                <Card key={idx} className="border-2 border-accent overflow-hidden">
                  <CardHeader className="pb-2 pt-3 px-4">
                    <div className="flex items-center justify-between gap-2">
                      <CardTitle className="text-sm flex-1">{recipe.title}</CardTitle>
                      <Badge variant="outline" className="gap-1 text-xs font-bold">
                        <Flame className="h-3 w-3" /> ~{recipe.kcal_total} kcal
                      </Badge>
                    </div>
                    <div className="flex items-center gap-1.5 mt-1">
                      {recipe.partial_estimate && (
                        <Badge variant="secondary" className="gap-1 text-[9px] px-1 py-0">
                          <AlertTriangle className="h-3 w-3" /> Stima parziale
                        </Badge>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="px-4 pb-4 space-y-3">
                    <div className="flex gap-3 text-[11px]">
                      <span className="px-2 py-0.5 rounded-md bg-blue-500/10 text-blue-600 font-medium">P {recipe.macros.protein}g</span>
                      <span className="px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-600 font-medium">C {recipe.macros.carbs}g</span>
                      <span className="px-2 py-0.5 rounded-md bg-rose-500/10 text-rose-600 font-medium">G {recipe.macros.fats}g</span>
                    </div>

                    {recipe.notes && <p className="text-[11px] text-muted-foreground italic">{recipe.notes}</p>}

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

                    <Button
                      className="w-full gap-2"
                      onClick={() => useFromPantry(recipe)}
                    >
                      <Plus className="h-4 w-4" />
                      Ho cucinato — scala dispensa
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
