import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import MobileHeader from "@/components/MobileHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Wand2, Send, Package, Flame, AlertTriangle, Sparkles, PenLine } from "lucide-react";
import ProRecipeEditor, { type RecipeData } from "@/components/ProRecipeEditor";

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
  id?: string;
  title: string;
  ingredients: { name: string; product_id?: string; qty: number; unit: string }[];
  instructions: string;
  kcal_total: number;
  macros: { protein: number; carbs: number; fats: number };
  partial_estimate?: boolean;
}

const ProClientPantryPage = () => {
  const { clientId } = useParams<{ clientId: string }>();
  const { user } = useAuth();
  const { toast } = useToast();
  const [clientName, setClientName] = useState("");
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [storageFilter, setStorageFilter] = useState("all");
  const [mealType, setMealType] = useState("pranzo");
  const [mealTarget, setMealTarget] = useState<any>(null);
  const [generating, setGenerating] = useState(false);
  const [generatedRecipes, setGeneratedRecipes] = useState<GeneratedRecipe[]>([]);
  const [sendingIdx, setSendingIdx] = useState<number | null>(null);

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
      setItems((invRes.data as unknown as InventoryItem[]) ?? []);
      if (planRes.data) {
        const targets = (planRes.data as any).diet_plan_meal_targets ?? [];
        const mt = targets.find((t: any) => t.meal_type === mealType);
        setMealTarget(mt || null);
      }
      setLoading(false);
    };
    load();
  }, [clientId, user]);

  // Update meal target when mealType changes
  useEffect(() => {
    if (!clientId || !user) return;
    supabase
      .from("diet_plans")
      .select("id, diet_plan_meal_targets(*)")
      .eq("professional_id", user.id)
      .eq("client_user_id", clientId)
      .eq("is_active", true)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          const targets = (data as any).diet_plan_meal_targets ?? [];
          setMealTarget(targets.find((t: any) => t.meal_type === mealType) || null);
        }
      });
  }, [mealType]);

  const filtered = items.filter((i) => storageFilter === "all" || i.storage_type === storageFilter);

  const generateRecipes = () => {
    if (!mealTarget || filtered.length === 0) {
      toast({ variant: "destructive", title: "Errore", description: "Servono ingredienti e target pasto per generare ricette." });
      return;
    }
    setGenerating(true);

    // Sort by expiry (prioritize expiring soon)
    const sorted = [...filtered].sort((a, b) => {
      if (!a.expiry_date) return 1;
      if (!b.expiry_date) return -1;
      return a.expiry_date.localeCompare(b.expiry_date);
    });

    // Only use items with nutritional data for accurate estimation
    const withNutrition = sorted.filter((i) => i.product.calories_100g != null);
    const withoutNutrition = sorted.filter((i) => i.product.calories_100g == null);

    const targetKcal = mealTarget.kcal_target;
    const targetProtein = mealTarget.protein_g;
    const targetCarbs = mealTarget.carbs_g;
    const targetFats = mealTarget.fats_g;

    const recipes: GeneratedRecipe[] = [];

    // Generate 3 simple recipes
    for (let r = 0; r < 3; r++) {
      const usedIngredients: GeneratedRecipe["ingredients"] = [];
      let totalKcal = 0;
      let totalProtein = 0;
      let totalCarbs = 0;
      let totalFats = 0;
      let partial = false;

      // Pick 2-4 ingredients
      const startIdx = (r * 2) % sorted.length;
      const ingredientCount = Math.min(2 + r, sorted.length);

      for (let i = 0; i < ingredientCount; i++) {
        const item = sorted[(startIdx + i) % sorted.length];
        const p = item.product;

        // Calculate portion to fit target
        let portionG = 100;
        if (p.calories_100g && p.calories_100g > 0) {
          // Aim for roughly targetKcal / ingredientCount per ingredient
          const targetPerIngredient = targetKcal / ingredientCount;
          portionG = Math.round((targetPerIngredient / p.calories_100g) * 100);
          portionG = Math.max(30, Math.min(portionG, (item.quantity ?? 1) * (item.unit === "kg" ? 1000 : item.unit === "g" ? 1 : 100)));
        }

        const factor = portionG / 100;
        const mac = p.macros_100g as any;

        if (p.calories_100g) {
          totalKcal += Math.round(p.calories_100g * factor);
          if (mac) {
            totalProtein += (mac.protein ?? 0) * factor;
            totalCarbs += (mac.carbs ?? 0) * factor;
            totalFats += (mac.fats ?? 0) * factor;
          }
        } else {
          partial = true;
        }

        usedIngredients.push({
          name: p.name,
          product_id: p.id,
          qty: portionG,
          unit: "g",
        });
      }

      const instructions = usedIngredients.map((ing, idx) => `${idx + 1}. Prepara ${ing.qty}g di ${ing.name}`).join("\n") +
        "\n" + (r === 0 ? "Combina tutti gli ingredienti e servi fresco." :
               r === 1 ? "Cuoci leggermente e condisci a piacere." :
               "Mescola bene e presenta in modo appetitoso.");

      recipes.push({
        title: `Ricetta ${r + 1} — ${MEAL_LABELS[mealType]}`,
        ingredients: usedIngredients,
        instructions,
        kcal_total: totalKcal,
        macros: {
          protein: Math.round(totalProtein),
          carbs: Math.round(totalCarbs),
          fats: Math.round(totalFats),
        },
        partial_estimate: partial,
      });
    }

    setGeneratedRecipes(recipes);
    setGenerating(false);
  };

  const sendRecipeToClient = async (recipe: GeneratedRecipe, idx: number) => {
    if (!user || !clientId) return;
    setSendingIdx(idx);

    // Save to generated_recipes
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

    // Send as suggestion
    await supabase.from("pro_suggestions").insert({
      professional_id: user.id,
      client_user_id: clientId,
      type: "recipe",
      payload: {
        generated_recipe_id: saved.id,
        title: recipe.title,
        kcal_total: recipe.kcal_total,
        macros: recipe.macros,
        ingredients: recipe.ingredients,
      },
    });

    setSendingIdx(null);
    toast({ title: "Ricetta inviata al cliente! ✅" });
  };

  if (loading) {
    return (
      <div>
        <MobileHeader title="Dispensa cliente" />
        <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
      </div>
    );
  }

  return (
    <div>
      <MobileHeader title={`Dispensa — ${clientName}`} />
      <main className="px-4 py-5 pb-28 space-y-4">
        {/* Filters */}
        <div className="flex gap-2">
          <Select value={storageFilter} onValueChange={setStorageFilter}>
            <SelectTrigger className="flex-1"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tutti</SelectItem>
              <SelectItem value="frigo">Frigo</SelectItem>
              <SelectItem value="freezer">Congelato</SelectItem>
              <SelectItem value="ambiente">Dispensa</SelectItem>
            </SelectContent>
          </Select>
          <Select value={mealType} onValueChange={setMealType}>
            <SelectTrigger className="flex-1"><SelectValue /></SelectTrigger>
            <SelectContent>
              {Object.entries(MEAL_LABELS).map(([k, v]) => (
                <SelectItem key={k} value={k}>{v}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Meal target info */}
        {mealTarget && (
          <div className="rounded-lg bg-primary/5 border border-primary/20 p-3 text-xs">
            <p className="font-semibold text-foreground mb-1">Target {MEAL_LABELS[mealType]}</p>
            <div className="flex gap-3">
              <span>{mealTarget.kcal_target} kcal</span>
              <span>P: {mealTarget.protein_g}g</span>
              <span>C: {mealTarget.carbs_g}g</span>
              <span>G: {mealTarget.fats_g}g</span>
            </div>
          </div>
        )}

        {/* Inventory items */}
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-muted-foreground">Ingredienti disponibili ({filtered.length})</h3>
          {filtered.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">Nessun prodotto in dispensa.</p>
          ) : (
            filtered.map((item) => {
              const isExpiring = item.expiry_date && new Date(item.expiry_date) <= new Date(Date.now() + 3 * 86400000);
              return (
                <div key={item.id} className="flex items-center gap-2 rounded-lg border border-border p-2.5">
                  <Package className="h-4 w-4 text-muted-foreground shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{item.product.name}</p>
                    <p className="text-[10px] text-muted-foreground">
                      x{item.quantity} {item.unit || ""} · {item.storage_type}
                      {item.product.calories_100g ? ` · ${item.product.calories_100g} kcal/100g` : ""}
                    </p>
                  </div>
                  {isExpiring && <Badge variant="destructive" className="text-[9px] px-1.5">Scade</Badge>}
                </div>
              );
            })
          )}
        </div>

        {/* Generate button */}
        <Button className="w-full gap-2" onClick={generateRecipes} disabled={generating || filtered.length === 0}>
          {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}
          Genera ricette dalla dispensa
        </Button>

        {/* Generated recipes */}
        {generatedRecipes.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-foreground">Ricette generate</h3>
            {generatedRecipes.map((recipe, idx) => (
              <Card key={idx} className="border-2 border-accent">
                <CardHeader className="pb-1 pt-3 px-4">
                  <CardTitle className="text-sm flex items-center justify-between">
                    <span>{recipe.title}</span>
                    {recipe.partial_estimate && (
                      <Badge variant="secondary" className="gap-1 text-[9px]">
                        <AlertTriangle className="h-3 w-3" /> Stima parziale
                      </Badge>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-4 pb-3 space-y-2">
                  <div className="flex gap-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-0.5"><Flame className="h-3 w-3" /> {recipe.kcal_total} kcal</span>
                    <span>P: {recipe.macros.protein}g</span>
                    <span>C: {recipe.macros.carbs}g</span>
                    <span>G: {recipe.macros.fats}g</span>
                  </div>
                  <div className="text-xs space-y-0.5">
                    {recipe.ingredients.map((ing, i) => (
                      <p key={i}>• {ing.qty}{ing.unit} {ing.name}</p>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground whitespace-pre-line">{recipe.instructions}</p>
                  <Button size="sm" className="w-full gap-2" onClick={() => sendRecipeToClient(recipe, idx)} disabled={sendingIdx === idx}>
                    {sendingIdx === idx ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                    Invia al cliente
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default ProClientPantryPage;
