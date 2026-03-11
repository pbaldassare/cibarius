import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import MobileHeader from "@/components/MobileHeader";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import ListSkeleton from "@/components/ListSkeleton";
import EmptyState from "@/components/EmptyState";
import {
  Leaf, Clock, ChefHat, AlertTriangle, Check, Loader2, Refrigerator, Package,
} from "lucide-react";
import { getFoodImage } from "@/lib/food-images";

/* ─── types ─── */
interface PantryItem {
  id: string;
  quantity: number;
  unit: string | null;
  storage_type: string;
  expiry_date: string | null;
  product: {
    id: string;
    name: string;
    brand: string | null;
    image_url: string | null;
    category: string | null;
    calories_100g: number | null;
    macros_100g: any;
  };
}

interface SuggestedRecipe {
  title: string;
  ingredients: { name: string; available: boolean; qty: string }[];
  estimatedKcal: number;
  estimatedMacros: { protein: number; carbs: number; fats: number };
  usesExpiringCount: number;
}

const RECIPE_DB: { title: string; ingredients: string[]; kcal: number; macros: { protein: number; carbs: number; fats: number } }[] = [
  { title: "Frittata di verdure", ingredients: ["uova", "zucchine", "parmigiano", "olio"], kcal: 320, macros: { protein: 18, carbs: 4, fats: 26 } },
  { title: "Pasta al pomodoro", ingredients: ["pasta", "pomodoro", "olio", "parmigiano"], kcal: 450, macros: { protein: 14, carbs: 72, fats: 12 } },
  { title: "Riso con verdure", ingredients: ["riso", "zucchine", "carote", "olio"], kcal: 380, macros: { protein: 8, carbs: 68, fats: 8 } },
  { title: "Insalata di pollo", ingredients: ["pollo", "lattuga", "pomodoro", "olio"], kcal: 280, macros: { protein: 32, carbs: 6, fats: 14 } },
  { title: "Zucchine gratinate", ingredients: ["zucchine", "parmigiano", "pangrattato", "olio"], kcal: 220, macros: { protein: 10, carbs: 18, fats: 12 } },
  { title: "Crostini con uova", ingredients: ["pane", "uova", "parmigiano"], kcal: 290, macros: { protein: 16, carbs: 28, fats: 14 } },
  { title: "Omelette al formaggio", ingredients: ["uova", "formaggio", "prosciutto"], kcal: 350, macros: { protein: 24, carbs: 2, fats: 28 } },
  { title: "Pasta al pesto", ingredients: ["pasta", "basilico", "parmigiano", "pinoli", "olio"], kcal: 480, macros: { protein: 16, carbs: 68, fats: 18 } },
  { title: "Minestrone", ingredients: ["patate", "carote", "zucchine", "fagioli", "pomodoro"], kcal: 180, macros: { protein: 8, carbs: 30, fats: 4 } },
  { title: "Bruschetta", ingredients: ["pane", "pomodoro", "olio", "aglio"], kcal: 200, macros: { protein: 4, carbs: 32, fats: 8 } },
  { title: "Polpette di carne", ingredients: ["carne", "pane", "uova", "parmigiano"], kcal: 380, macros: { protein: 28, carbs: 16, fats: 22 } },
  { title: "Insalata di riso", ingredients: ["riso", "tonno", "pomodoro", "mais", "olive"], kcal: 420, macros: { protein: 18, carbs: 58, fats: 14 } },
  { title: "Torta salata", ingredients: ["uova", "ricotta", "spinaci", "pasta sfoglia"], kcal: 340, macros: { protein: 14, carbs: 24, fats: 22 } },
  { title: "Piadina farcita", ingredients: ["piadina", "prosciutto", "mozzarella", "lattuga"], kcal: 420, macros: { protein: 22, carbs: 38, fats: 20 } },
  { title: "Verdure al forno", ingredients: ["zucchine", "melanzane", "peperoni", "olio"], kcal: 160, macros: { protein: 4, carbs: 14, fats: 10 } },
];

function matchScore(pantryNames: string[], recipeIngredients: string[], expiringNames: Set<string>): { matched: number; total: number; expiringUsed: number } {
  let matched = 0;
  let expiringUsed = 0;
  for (const ing of recipeIngredients) {
    const found = pantryNames.some((p) => p.includes(ing) || ing.includes(p));
    if (found) {
      matched++;
      if ([...expiringNames].some((e) => e.includes(ing) || ing.includes(e))) {
        expiringUsed++;
      }
    }
  }
  return { matched, total: recipeIngredients.length, expiringUsed };
}

const getDaysToExpiry = (date: string | null): number => {
  if (!date) return 999;
  const today = new Date(); today.setHours(0, 0, 0, 0);
  return Math.ceil((new Date(date).getTime() - today.getTime()) / 864e5);
};

const AntiWastePage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [pantry, setPantry] = useState<PantryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState<"all" | "expiring">("all");

  useEffect(() => {
    if (!user) return;
    supabase
      .from("inventory_items")
      .select("id, quantity, unit, storage_type, expiry_date, product:products(id, name, brand, image_url, category, calories_100g, macros_100g)")
      .eq("owner_user_id", user.id)
      .order("expiry_date", { ascending: true, nullsFirst: false })
      .then(({ data }) => {
        setPantry((data as unknown as PantryItem[]) || []);
        setLoading(false);
      });
  }, [user]);

  const expiringItems = useMemo(() =>
    pantry.filter((i) => {
      const days = getDaysToExpiry(i.expiry_date);
      return days >= 0 && days <= 5;
    }),
  [pantry]);

  const pantryNames = useMemo(() =>
    pantry.map((i) => i.product.name.toLowerCase()),
  [pantry]);

  const expiringNames = useMemo(() =>
    new Set(expiringItems.map((i) => i.product.name.toLowerCase())),
  [expiringItems]);

  const suggestions = useMemo(() => {
    if (pantry.length === 0) return [];

    const scored = RECIPE_DB.map((recipe) => {
      const { matched, total, expiringUsed } = matchScore(pantryNames, recipe.ingredients, expiringNames);
      if (matched === 0) return null;

      const availabilityRatio = matched / total;
      const score = availabilityRatio * 50 + expiringUsed * 30 + (matched >= total ? 20 : 0);

      const ingredients = recipe.ingredients.map((ing) => ({
        name: ing.charAt(0).toUpperCase() + ing.slice(1),
        available: pantryNames.some((p) => p.includes(ing) || ing.includes(p)),
        qty: "q.b.",
      }));

      return {
        title: recipe.title,
        ingredients,
        estimatedKcal: recipe.kcal,
        estimatedMacros: recipe.macros,
        usesExpiringCount: expiringUsed,
        score,
      };
    }).filter(Boolean) as (SuggestedRecipe & { score: number })[];

    // In "expiring" mode, only show recipes that use expiring ingredients
    const filtered = mode === "expiring"
      ? scored.filter((s) => s.usesExpiringCount > 0)
      : scored;

    return filtered.sort((a, b) => b.score - a.score).slice(0, 8);
  }, [pantryNames, expiringNames, mode, pantry]);

  const handleLogRecipe = async (recipe: SuggestedRecipe) => {
    if (!user) return;
    try {
      const today = new Date().toISOString().slice(0, 10);
      let { data: dayData } = await supabase
        .from("meal_days").select("id").eq("user_id", user.id).eq("day_date", today).maybeSingle();
      if (!dayData) {
        const { data: nd, error: de } = await supabase
          .from("meal_days").insert({ user_id: user.id, day_date: today }).select("id").single();
        if (de) throw de;
        dayData = nd;
      }
      // Use pranzo as default
      let { data: mealData } = await supabase
        .from("meals").select("id").eq("meal_day_id", dayData!.id).eq("meal_type", "pranzo").maybeSingle();
      if (!mealData) {
        const { data: nm, error: me } = await supabase
          .from("meals").insert({ meal_day_id: dayData!.id, meal_type: "pranzo" }).select("id").single();
        if (me) throw me;
        mealData = nm;
      }
      await supabase.from("meal_items").insert({
        meal_id: mealData!.id,
        source_type: "custom",
        custom_name: recipe.title,
        dish_name: recipe.title,
        calories: recipe.estimatedKcal,
        quantity: 1,
        unit: "porzione",
        macros: recipe.estimatedMacros,
      });

      // Track waste saving for available expiring ingredients
      for (const ing of recipe.ingredients) {
        if (ing.available) {
          await supabase.from("waste_savings" as any).insert({
            user_id: user.id,
            item_name: ing.name,
            weight_g: 100,
            estimated_price: 0.5,
            source: "cooked",
          } as any);
        }
      }

      toast({ title: `"${recipe.title}" registrato nel diario! ✅` });
    } catch (e: any) {
      toast({ variant: "destructive", title: "Errore", description: e.message });
    }
  };

  return (
    <div>
      <MobileHeader title="Anti-spreco" />
      <main className="space-y-4 px-4 py-5 pb-28">

        {/* Expiring items summary */}
        {expiringItems.length > 0 && (
          <div className="rounded-2xl border-2 border-accent/40 bg-accent/10 p-4 space-y-2">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-accent" />
              <p className="text-sm font-semibold text-foreground">
                {expiringItems.length} aliment{expiringItems.length === 1 ? "o" : "i"} in scadenza
              </p>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {expiringItems.slice(0, 6).map((item) => (
                <Badge key={item.id} variant="outline" className="text-xs border-accent/40 text-accent">
                  <Clock className="h-3 w-3 mr-1" />
                  {item.product.name} · {getDaysToExpiry(item.expiry_date)}gg
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Mode toggle */}
        <div className="flex gap-2">
          <button
            onClick={() => setMode("all")}
            className={`flex-1 rounded-xl py-2.5 text-sm font-semibold transition-colors ${
              mode === "all" ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"
            }`}
          >
            <Leaf className="h-4 w-4 inline mr-1.5" /> Ricette anti-spreco
          </button>
          <button
            onClick={() => setMode("expiring")}
            className={`flex-1 rounded-xl py-2.5 text-sm font-semibold transition-colors ${
              mode === "expiring" ? "bg-accent text-accent-foreground" : "bg-secondary text-muted-foreground"
            }`}
          >
            <Refrigerator className="h-4 w-4 inline mr-1.5" /> Svuota frigo
          </button>
        </div>

        {mode === "expiring" && expiringItems.length > 0 && (
          <div className="rounded-xl bg-accent/5 border border-accent/20 p-3">
            <p className="text-sm text-foreground">
              🧊 <span className="font-semibold">Hai {expiringItems.length} alimenti che scadono presto.</span>{" "}
              Ecco cosa puoi cucinare.
            </p>
          </div>
        )}

        {loading ? (
          <ListSkeleton count={3} variant="row" />
        ) : suggestions.length === 0 ? (
          <EmptyState
            icon={ChefHat}
            title="Nessuna ricetta trovata"
            description={pantry.length === 0 ? "Aggiungi prodotti nella dispensa per ricevere suggerimenti." : "Non abbiamo trovato ricette compatibili con i tuoi ingredienti."}
            actions={[
              { label: "Vai alla dispensa", icon: Package, onClick: () => navigate("/products") },
            ]}
          />
        ) : (
          <div className="space-y-3">
            {suggestions.map((recipe, idx) => (
              <div key={idx} className="rounded-2xl border-2 border-border bg-card p-4 space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-bold text-foreground flex items-center gap-1.5">
                      <ChefHat className="h-4 w-4 text-primary" />
                      {recipe.title}
                    </p>
                    {recipe.usesExpiringCount > 0 && (
                      <Badge variant="outline" className="mt-1 text-[10px] border-accent/40 text-accent">
                        <Clock className="h-3 w-3 mr-0.5" /> Usa {recipe.usesExpiringCount} in scadenza
                      </Badge>
                    )}
                  </div>
                  <span className="text-xs font-medium text-primary">{recipe.estimatedKcal} kcal</span>
                </div>

                {/* Ingredients */}
                <div className="flex flex-wrap gap-1.5">
                  {recipe.ingredients.map((ing, i) => (
                    <span
                      key={i}
                      className={`inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs ${
                        ing.available
                          ? "bg-success/10 text-success border border-success/20"
                          : "bg-muted text-muted-foreground border border-border"
                      }`}
                    >
                      {ing.available ? <Check className="h-3 w-3" /> : null}
                      {ing.name}
                    </span>
                  ))}
                </div>

                {/* Macros */}
                <div className="flex gap-3 text-xs text-muted-foreground">
                  <span>P {recipe.estimatedMacros.protein}g</span>
                  <span>C {recipe.estimatedMacros.carbs}g</span>
                  <span>G {recipe.estimatedMacros.fats}g</span>
                </div>

                {/* Action */}
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={() => handleLogRecipe(recipe)}
                >
                  Cucina e registra nel diario
                </Button>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default AntiWastePage;
