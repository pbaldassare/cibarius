import { useEffect, useState, useMemo } from "react";
import { useParams } from "react-router-dom";
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
import {
  Loader2, Wand2, Send, Package, Flame, AlertTriangle,
  RefreshCw, ShoppingCart, ChefHat, Trophy
} from "lucide-react";

const MEAL_LABELS: Record<string, string> = {
  colazione: "☀️ Colazione",
  pranzo: "🌤️ Pranzo",
  cena: "🌙 Cena",
  spuntino: "🍎 Spuntino",
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
  missing_ingredients?: { name: string; reason: string }[];
}

interface MealTarget {
  kcal_target: number;
  protein_g: number;
  carbs_g: number;
  fats_g: number;
}

const ProClientPantryRecipesPage = () => {
  const { clientId } = useParams<{ clientId: string }>();
  const { user } = useAuth();
  const { toast } = useToast();
  const [clientName, setClientName] = useState("");
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [storageFilter, setStorageFilter] = useState("all");
  const [mealType, setMealType] = useState("pranzo");
  const [mealTarget, setMealTarget] = useState<MealTarget | null>(null);
  const [allTargets, setAllTargets] = useState<any[]>([]);
  const [priorityExpiry, setPriorityExpiry] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [generating, setGenerating] = useState(false);
  const [recipes, setRecipes] = useState<GeneratedRecipe[]>([]);
  const [sendingIdx, setSendingIdx] = useState<number | null>(null);

  // Load data
  useEffect(() => {
    if (!clientId || !user) return;
    const load = async () => {
      const [profileRes, invRes, planRes] = await Promise.all([
        supabase.from("profiles").select("full_name").eq("id", clientId).single(),
        supabase
          .from("inventory_items")
          .select("id, quantity, unit, storage_type, expiry_date, product:products(id, name, brand, calories_100g, macros_100g)")
          .eq("owner_user_id", clientId)
          .order("expiry_date", { ascending: true, nullsFirst: false }),
        supabase
          .from("diet_plans")
          .select("id, diet_plan_meal_targets(*)")
          .eq("professional_id", user.id)
          .eq("client_user_id", clientId)
          .eq("is_active", true)
          .maybeSingle(),
      ]);
      setClientName(profileRes.data?.full_name || "Cliente");
      const loadedItems = (invRes.data as unknown as InventoryItem[]) ?? [];
      setItems(loadedItems);

      if (planRes.data) {
        const targets = (planRes.data as any).diet_plan_meal_targets ?? [];
        setAllTargets(targets);
        const mt = targets.find((t: any) => t.meal_type === mealType);
        setMealTarget(mt || null);
      }

      // Default: select all non-expired
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
  }, [clientId, user]);

  // Update target when meal changes
  useEffect(() => {
    const mt = allTargets.find((t: any) => t.meal_type === mealType);
    setMealTarget(mt || null);
  }, [mealType, allTargets]);

  // Apply priority expiry toggle
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
    // If none expiring, keep current selection
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
      toast({ variant: "destructive", title: "Errore", description: "Seleziona ingredienti e assicurati che esista un target pasto." });
      return;
    }
    setGenerating(true);

    const target = mealTarget;
    const withNutrition = selectedItems.filter((i) => i.product.calories_100g != null);
    const withoutNutrition = selectedItems.filter((i) => i.product.calories_100g == null);

    const generated: GeneratedRecipe[] = [];

    // Strategy patterns for variety
    const strategies = [
      { name: "Bilanciata", proteinWeight: 1, carbWeight: 1, fatWeight: 1, maxIng: 6 },
      { name: "Alta proteine", proteinWeight: 1.5, carbWeight: 0.8, fatWeight: 0.7, maxIng: 5 },
      { name: "Leggera", proteinWeight: 1, carbWeight: 1.2, fatWeight: 0.6, maxIng: 4 },
    ];

    for (let s = 0; s < 3; s++) {
      const strategy = strategies[s];
      const ingredients: GeneratedRecipe["ingredients"] = [];
      let totalKcal = 0, totalP = 0, totalC = 0, totalF = 0;
      let partial = false;

      // Sort items: prioritize expiring + with nutrition
      const sorted = [...selectedItems].sort((a, b) => {
        const aScore = (a.product.calories_100g ? 10 : 0) + (getExpiryStatus(a.expiry_date) === "expiring" ? 5 : 0);
        const bScore = (b.product.calories_100g ? 10 : 0) + (getExpiryStatus(b.expiry_date) === "expiring" ? 5 : 0);
        return bScore - aScore;
      });

      // Shuffle slightly for variety between recipes
      const shuffled = [...sorted];
      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.max(0, i - Math.floor(Math.random() * 3));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
      }

      const count = Math.min(strategy.maxIng, shuffled.length);
      const perIngKcal = target.kcal_target / count;

      for (let i = 0; i < count; i++) {
        const item = shuffled[i];
        const p = item.product;
        const mac = p.macros_100g as any;

        let portionG: number;
        if (p.calories_100g && p.calories_100g > 0) {
          portionG = Math.round((perIngKcal / p.calories_100g) * 100);
          // Clamp to reasonable and available
          const maxAvail = (item.quantity ?? 1) * (item.unit === "kg" ? 1000 : item.unit === "g" ? 1 : 150);
          portionG = Math.max(20, Math.min(portionG, maxAvail, 500));
        } else {
          portionG = 80; // conservative default
          partial = true;
        }

        const factor = portionG / 100;
        if (p.calories_100g) totalKcal += Math.round(p.calories_100g * factor);
        if (mac) {
          totalP += (mac.protein ?? 0) * factor;
          totalC += (mac.carbs ?? 0) * factor;
          totalF += (mac.fats ?? 0) * factor;
        }

        ingredients.push({ name: p.name, product_id: p.id, qty: portionG, unit: "g" });
      }

      // Calculate fit score (0-100)
      const kcalDiff = Math.abs(totalKcal - target.kcal_target) / Math.max(target.kcal_target, 1);
      const pDiff = Math.abs(totalP - target.protein_g) / Math.max(target.protein_g, 1);
      const cDiff = Math.abs(totalC - target.carbs_g) / Math.max(target.carbs_g, 1);
      const fDiff = Math.abs(totalF - target.fats_g) / Math.max(target.fats_g, 1);
      const avgDiff = (kcalDiff + pDiff + cDiff + fDiff) / 4;
      const fitScore = Math.max(0, Math.round(100 - avgDiff * 100));

      // Generate notes
      const notes: string[] = [];
      if (totalP > target.protein_g) notes.push("Ricca di proteine");
      if (totalP < target.protein_g * 0.8) notes.push("Bassa in proteine");
      if (totalF < target.fats_g * 0.8) notes.push("Leggera nei grassi");
      if (totalKcal <= target.kcal_target * 1.05 && totalKcal >= target.kcal_target * 0.95)
        notes.push("Calorie centrate sul target");
      if (partial) notes.push("Stima parziale: alcuni ingredienti senza dati nutrizionali");

      // Generate instructions
      const steps = ingredients.map((ing, idx) => `${idx + 1}. Prepara ${ing.qty}g di ${ing.name}`);
      if (s === 0) steps.push(`${ingredients.length + 1}. Combina tutti gli ingredienti e servi.`);
      else if (s === 1) steps.push(`${ingredients.length + 1}. Cuoci a fuoco medio per 10 minuti, condisci e servi.`);
      else steps.push(`${ingredients.length + 1}. Mescola in una ciotola, condisci con olio e spezie a piacere.`);

      generated.push({
        title: `${strategy.name} — ${MEAL_LABELS[mealType]}`,
        ingredients,
        instructions: steps.join("\n"),
        kcal_total: Math.round(totalKcal),
        macros: { protein: Math.round(totalP), carbs: Math.round(totalC), fats: Math.round(totalF) },
        fit_score: fitScore,
        notes: notes.join(" · ") || "Ricetta adatta al target",
        partial_estimate: partial,
      });
    }

    // Sort by fit score desc
    generated.sort((a, b) => b.fit_score - a.fit_score);
    setRecipes(generated);
    setGenerating(false);
  };

  // ===== SEND RECIPE =====
  const sendRecipe = async (recipe: GeneratedRecipe, idx: number) => {
    if (!user || !clientId) return;
    setSendingIdx(idx);

    const { data: saved, error: saveErr } = await supabase.from("generated_recipes").insert({
      professional_id: user.id,
      client_user_id: clientId,
      meal_type: mealType,
      title: recipe.title,
      ingredients: recipe.ingredients as any,
      instructions: recipe.instructions,
      kcal_total: recipe.kcal_total,
      macros: recipe.macros as any,
    }).select().single();

    if (saveErr) {
      toast({ variant: "destructive", title: "Errore", description: saveErr.message });
      setSendingIdx(null);
      return;
    }

    await supabase.from("pro_suggestions").insert({
      professional_id: user.id,
      client_user_id: clientId,
      type: "recipe",
      payload: {
        generated_recipe_id: saved.id,
        title: recipe.title,
        meal_type: mealType,
        kcal_total: recipe.kcal_total,
        macros: recipe.macros,
        ingredients: recipe.ingredients,
        instructions: recipe.instructions,
        fit_score: recipe.fit_score,
        notes: recipe.notes,
      },
    });

    setSendingIdx(null);
    toast({ title: "Ricetta inviata al cliente! ✅" });
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
        <MobileHeader title="Ricette dalla dispensa" />
        <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
      </div>
    );
  }

  const selectedCount = filtered.filter((i) => selectedIds.has(i.id)).length;

  return (
    <div>
      <MobileHeader title={`Ricette — ${clientName}`} />
      <main className="px-4 py-5 pb-28 space-y-4">

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

        {/* Priority toggle */}
        <div className="flex items-center justify-between rounded-lg bg-secondary/50 p-3">
          <span className="text-sm font-medium text-foreground">🔥 Priorità scadenze</span>
          <Switch checked={priorityExpiry} onCheckedChange={setPriorityExpiry} />
        </div>

        {/* Meal target */}
        {mealTarget ? (
          <div className="rounded-lg bg-primary/5 border border-primary/20 p-3">
            <p className="text-xs font-semibold text-foreground mb-1">Target {MEAL_LABELS[mealType]}</p>
            <div className="flex gap-3 text-xs">
              <span className="font-medium">{mealTarget.kcal_target} kcal</span>
              <span>P: {mealTarget.protein_g}g</span>
              <span>C: {mealTarget.carbs_g}g</span>
              <span>G: {mealTarget.fats_g}g</span>
            </div>
          </div>
        ) : (
          <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-3">
            <p className="text-xs text-destructive font-medium">⚠️ Nessun target impostato per questo pasto. Crea prima un piano nutrizionale.</p>
          </div>
        )}

        {/* Ingredients list */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-muted-foreground">
              Ingredienti ({selectedCount}/{filtered.length} selezionati)
            </h3>
            <div className="flex gap-1">
              <Button size="sm" variant="ghost" className="text-[10px] h-6 px-2" onClick={selectAll}>Tutti</Button>
              <Button size="sm" variant="ghost" className="text-[10px] h-6 px-2" onClick={deselectAll}>Nessuno</Button>
            </div>
          </div>

          {filtered.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">Nessun prodotto in dispensa.</p>
          ) : (
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
                    <Checkbox
                      checked={checked}
                      onCheckedChange={() => toggleItem(item.id)}
                    />
                    <Package className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium truncate">{item.product.name}</p>
                      <p className="text-[10px] text-muted-foreground">
                        x{item.quantity} {item.unit || ""} · {item.storage_type}
                        {item.product.calories_100g ? ` · ${item.product.calories_100g} kcal/100g` : " · ⚠️ no kcal"}
                      </p>
                    </div>
                    {status === "expired" && <Badge variant="destructive" className="text-[8px] px-1 py-0">Scaduto</Badge>}
                    {status === "expiring" && <Badge className="bg-amber-500/20 text-amber-700 border-0 text-[8px] px-1 py-0">In scadenza</Badge>}
                  </label>
                );
              })}
            </div>
          )}
        </div>

        {/* Generate button */}
        <Button
          className="w-full gap-2 h-12 text-base"
          onClick={generateRecipes}
          disabled={generating || selectedCount === 0 || !mealTarget}
        >
          {generating ? <Loader2 className="h-5 w-5 animate-spin" /> : <ChefHat className="h-5 w-5" />}
          Genera 3 ricette bilanciate
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
                    {recipe.partial_estimate && (
                      <Badge variant="secondary" className="gap-1 text-[9px] w-fit mt-1">
                        <AlertTriangle className="h-3 w-3" /> Stima parziale
                      </Badge>
                    )}
                  </CardHeader>
                  <CardContent className="px-4 pb-4 space-y-3">
                    {/* Macro comparison */}
                    {mealTarget && (
                      <div className="grid grid-cols-4 gap-1.5 text-center text-[10px]">
                        <div className="rounded-md bg-primary/10 p-1.5">
                          <p className="font-bold text-primary">{recipe.kcal_total}</p>
                          <p className="text-muted-foreground">/{mealTarget.kcal_target} kcal</p>
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

                    {/* Notes */}
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

                    {/* Send */}
                    <Button
                      className="w-full gap-2"
                      onClick={() => sendRecipe(recipe, idx)}
                      disabled={sendingIdx === idx}
                    >
                      {sendingIdx === idx ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                      Invia al cliente
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

export default ProClientPantryRecipesPage;
