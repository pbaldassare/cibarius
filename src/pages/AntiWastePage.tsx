import { useState, useEffect, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import MobileHeader from "@/components/MobileHeader";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import ListSkeleton from "@/components/ListSkeleton";
import EmptyState from "@/components/EmptyState";
import { deductPantryFromMeal } from "@/lib/pantry-deduction";
import {
  Leaf, Clock, ChefHat, AlertTriangle, Check, X, Loader2,
  Refrigerator, Package, Sparkles, Utensils,
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
    id: string; name: string; brand: string | null;
    image_url: string | null; category: string | null;
    calories_100g: number | null; macros_100g: any;
  };
}

interface SuggestedRecipe {
  title: string;
  ingredients: { name: string; available: boolean; expiring?: boolean; qty: string }[];
  estimatedKcal: number;
  estimatedMacros: { protein: number; carbs: number; fats: number };
  usesExpiringCount: number;
  reason?: string;
  source: "local" | "ai";
}

/* ─── local recipe DB ─── */
const RECIPE_DB = [
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

const getDaysToExpiry = (date: string | null): number => {
  if (!date) return 999;
  const today = new Date(); today.setHours(0, 0, 0, 0);
  return Math.ceil((new Date(date).getTime() - today.getTime()) / 864e5);
};

function matchScore(pantryNames: string[], recipeIngredients: string[], expiringNames: Set<string>) {
  let matched = 0, expiringUsed = 0;
  for (const ing of recipeIngredients) {
    const found = pantryNames.some(p => p.includes(ing) || ing.includes(p));
    if (found) {
      matched++;
      if ([...expiringNames].some(e => e.includes(ing) || ing.includes(e))) expiringUsed++;
    }
  }
  return { matched, total: recipeIngredients.length, expiringUsed };
}

/* ═══ COMPONENT ═══ */
const AntiWastePage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [searchParams] = useSearchParams();

  const [pantry, setPantry] = useState<PantryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState<"all" | "expiring">(searchParams.get("mode") === "expiring" ? "expiring" : "all");

  // AI state
  const [aiSuggestions, setAiSuggestions] = useState<SuggestedRecipe[]>([]);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiContext, setAiContext] = useState<{ pantry_count: number; expiring_count: number; kcalToday: number } | null>(null);

  const [cooking, setCooking] = useState<string | null>(null);

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
    pantry.filter(i => { const d = getDaysToExpiry(i.expiry_date); return d >= 0 && d <= 5; }),
  [pantry]);

  const pantryNames = useMemo(() => pantry.map(i => i.product.name.toLowerCase()), [pantry]);
  const expiringNames = useMemo(() => new Set(expiringItems.map(i => i.product.name.toLowerCase())), [expiringItems]);

  // Local suggestions
  const localSuggestions = useMemo((): SuggestedRecipe[] => {
    if (pantry.length === 0) return [];
    const scored = RECIPE_DB.map(recipe => {
      const { matched, total, expiringUsed } = matchScore(pantryNames, recipe.ingredients, expiringNames);
      if (matched === 0) return null;
      const availabilityRatio = matched / total;
      const score = availabilityRatio * 50 + expiringUsed * 30 + (matched >= total ? 20 : 0);
      const ingredients = recipe.ingredients.map(ing => ({
        name: ing.charAt(0).toUpperCase() + ing.slice(1),
        available: pantryNames.some(p => p.includes(ing) || ing.includes(p)),
        expiring: [...expiringNames].some(e => e.includes(ing) || ing.includes(e)),
        qty: "q.b.",
      }));
      return { title: recipe.title, ingredients, estimatedKcal: recipe.kcal, estimatedMacros: recipe.macros, usesExpiringCount: expiringUsed, source: "local" as const, score };
    }).filter(Boolean) as (SuggestedRecipe & { score: number })[];

    const filtered = mode === "expiring" ? scored.filter(s => s.usesExpiringCount > 0) : scored;
    return filtered.sort((a, b) => b.score - a.score).slice(0, 6);
  }, [pantryNames, expiringNames, mode, pantry]);

  // AI suggest
  const handleAiSuggest = async () => {
    if (!user) return;
    setAiLoading(true);
    setAiError(null);
    try {
      const { data: result, error: fnErr } = await supabase.functions.invoke("suggest-meal");
      if (fnErr) throw fnErr;
      if (result?.error) throw new Error(result.error);
      const mapped: SuggestedRecipe[] = (result.suggestions || []).map((s: any) => ({
        title: s.title,
        reason: s.reason,
        estimated_kcal: s.estimated_kcal,
        estimatedKcal: s.estimated_kcal,
        estimatedMacros: s.estimated_macros,
        ingredients: s.ingredients.map((i: any) => ({
          name: i.name, available: i.available, expiring: i.expiring, qty: i.quantity,
        })),
        usesExpiringCount: s.ingredients.filter((i: any) => i.expiring).length,
        source: "ai" as const,
      }));
      setAiSuggestions(mapped);
      setAiContext({
        pantry_count: result.pantry_count,
        expiring_count: result.expiring_count,
        kcalToday: Math.round(result.consumed_today?.totalKcal || 0),
      });
    } catch (e: any) {
      setAiError(e.message || "Errore AI");
      toast({ variant: "destructive", title: "Errore", description: e.message });
    } finally {
      setAiLoading(false);
    }
  };

  // Cook & log
  const handleCook = async (recipe: SuggestedRecipe, key: string) => {
    if (!user) return;
    setCooking(key);
    try {
      const today = new Date().toISOString().slice(0, 10);
      const hour = new Date().getHours();
      const mealType = hour < 11 ? "colazione" : hour < 15 ? "pranzo" : hour < 18 ? "spuntino" : "cena";

      let { data: dayData } = await supabase.from("meal_days").select("id").eq("user_id", user.id).eq("day_date", today).maybeSingle();
      if (!dayData) {
        const { data: nd, error: de } = await supabase.from("meal_days").insert({ user_id: user.id, day_date: today }).select("id").single();
        if (de) throw de;
        dayData = nd;
      }
      let { data: mealData } = await supabase.from("meals").select("id").eq("meal_day_id", dayData!.id).eq("meal_type", mealType).maybeSingle();
      if (!mealData) {
        const { data: nm, error: me } = await supabase.from("meals").insert({ meal_day_id: dayData!.id, meal_type: mealType }).select("id").single();
        if (me) throw me;
        mealData = nm;
      }

      await supabase.from("meal_items").insert({
        meal_id: mealData!.id, source_type: "custom", custom_name: recipe.title, dish_name: recipe.title,
        calories: recipe.estimatedKcal, quantity: 1, unit: "porzione", macros: recipe.estimatedMacros,
      });

      // Deduct pantry
      const pantryItems = recipe.ingredients.filter(i => i.available).map(i => ({
        custom_name: i.name, dish_name: i.name,
        quantity: parseFloat(i.qty) || 100,
        unit: i.qty.includes("g") ? "g" : "pz",
      }));
      if (pantryItems.length > 0) await deductPantryFromMeal(user.id, pantryItems);

      // Track waste savings
      for (const ing of recipe.ingredients) {
        if (ing.available && ing.expiring) {
          await supabase.from("waste_savings" as any).insert({
            user_id: user.id, item_name: ing.name,
            weight_g: parseFloat(ing.qty) || 100, estimated_price: 0.8,
            source: recipe.source === "ai" ? "ai_suggestion" : "cooked",
          } as any);
        }
      }

      toast({ title: `"${recipe.title}" registrato! ✅`, description: "Dispensa aggiornata" });
    } catch (e: any) {
      toast({ variant: "destructive", title: "Errore", description: e.message });
    } finally {
      setCooking(null);
    }
  };

  /* ─── Render recipe card ─── */
  const RecipeCard = ({ recipe, idx }: { recipe: SuggestedRecipe; idx: number }) => {
    const availableCount = recipe.ingredients.filter(i => i.available).length;
    const missingCount = recipe.ingredients.length - availableCount;
    const key = `${recipe.source}-${idx}`;
    return (
      <div className="rounded-[18px] bg-card shadow-card overflow-hidden">
        <div className="p-4 pb-3 space-y-2">
          <div className="flex items-start justify-between">
            <p className="text-[14px] font-bold text-foreground flex items-center gap-1.5 flex-1">
              {recipe.source === "ai" && <Sparkles className="h-3.5 w-3.5 text-primary shrink-0" />}
              {recipe.title}
            </p>
            <span className="text-xs font-semibold text-primary shrink-0 ml-2">{recipe.estimatedKcal} kcal</span>
          </div>
          {recipe.reason && <p className="text-[11px] text-muted-foreground italic">💡 {recipe.reason}</p>}
          <div className="flex flex-wrap gap-1">
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
        <div className="px-4 pb-2.5">
          <div className="flex flex-wrap gap-1">
            {recipe.ingredients.map((ing, i) => (
              <span key={i} className={`inline-flex items-center gap-0.5 rounded-lg px-1.5 py-0.5 text-[11px] ${
                ing.expiring ? "bg-warning/10 text-warning border border-warning/20"
                : ing.available ? "bg-success/10 text-success border border-success/20"
                : "bg-muted text-muted-foreground border border-border"
              }`}>
                {ing.expiring ? <Clock className="h-2.5 w-2.5" /> : ing.available ? <Check className="h-2.5 w-2.5" /> : <X className="h-2.5 w-2.5" />}
                {ing.name}
              </span>
            ))}
          </div>
        </div>
        <div className="px-4 pb-2 flex gap-3 text-[11px] text-muted-foreground">
          <span>P {recipe.estimatedMacros.protein}g</span>
          <span>C {recipe.estimatedMacros.carbs}g</span>
          <span>G {recipe.estimatedMacros.fats}g</span>
        </div>
        <div className="px-4 pb-4">
          <Button size="sm" onClick={() => handleCook(recipe, key)} disabled={cooking !== null} className="w-full h-9 rounded-xl text-[12px] font-semibold">
            {cooking === key ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : <Utensils className="h-3.5 w-3.5 mr-1.5" />}
            Cucina e registra
          </Button>
        </div>
      </div>
    );
  };

  return (
    <div>
      <MobileHeader title="Cosa mangio oggi?" />
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

        {/* Mode toggle */}
        <div className="flex gap-2">
          <button onClick={() => setMode("all")}
            className={`flex-1 rounded-xl py-2.5 text-[13px] font-semibold transition-colors ${mode === "all" ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"}`}>
            <Leaf className="h-4 w-4 inline mr-1" /> Anti-spreco
          </button>
          <button onClick={() => setMode("expiring")}
            className={`flex-1 rounded-xl py-2.5 text-[13px] font-semibold transition-colors ${mode === "expiring" ? "btn-brand text-white" : "bg-secondary text-muted-foreground"}`}>
            <Refrigerator className="h-4 w-4 inline mr-1" /> Svuota frigo
          </button>
        </div>

        {mode === "expiring" && expiringItems.length > 0 && (
          <div className="rounded-xl bg-warning/5 border border-warning/20 p-3">
            <p className="text-[13px] text-foreground">
              🧊 <span className="font-semibold">Hai {expiringItems.length} alimenti che scadono presto.</span> Ecco cosa puoi cucinare.
            </p>
          </div>
        )}

        {/* ─── AI SUGGEST BUTTON ─── */}
        <div className="rounded-[18px] bg-card shadow-card overflow-hidden">
          <div className="h-1 w-full" style={{ background: "linear-gradient(90deg, hsl(262,83%,58%), hsl(330,80%,60%))" }} />
          <div className="p-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl shrink-0" style={{ background: "hsl(262,83%,58%,0.12)" }}>
              <Sparkles className="h-5 w-5" style={{ color: "hsl(262,83%,58%)" }} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-semibold text-foreground">Suggerimenti AI personalizzati</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">Analizza dispensa, scadenze e pasti di oggi</p>
            </div>
            <Button size="sm" onClick={handleAiSuggest} disabled={aiLoading} className="shrink-0 h-8 rounded-lg text-[11px] font-semibold px-3">
              {aiLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <><Sparkles className="h-3.5 w-3.5 mr-1" /> Genera</>}
            </Button>
          </div>
        </div>

        {aiError && (
          <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-[12px] text-destructive">{aiError}</div>
        )}

        {/* AI context stats */}
        {aiContext && (
          <div className="flex gap-2">
            {[
              { n: aiContext.pantry_count, label: "In dispensa", color: "text-foreground" },
              { n: aiContext.expiring_count, label: "In scadenza", color: "text-warning" },
              { n: aiContext.kcalToday, label: "Kcal oggi", color: "text-primary" },
            ].map(({ n, label, color }) => (
              <div key={label} className="flex-1 rounded-xl bg-card shadow-card p-2.5 text-center">
                <p className={`text-base font-bold ${color}`}>{n}</p>
                <p className="text-[9px] text-muted-foreground uppercase tracking-wider">{label}</p>
              </div>
            ))}
          </div>
        )}

        {/* AI suggestions */}
        {aiSuggestions.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-[13px] font-bold text-foreground flex items-center gap-1.5">
              <Sparkles className="h-4 w-4 text-primary" /> Suggeriti dall'AI
            </h3>
            {aiSuggestions.map((recipe, idx) => (
              <RecipeCard key={`ai-${idx}`} recipe={recipe} idx={idx} />
            ))}
          </div>
        )}

        {/* Local suggestions */}
        {loading ? (
          <ListSkeleton count={3} variant="row" />
        ) : localSuggestions.length === 0 && aiSuggestions.length === 0 ? (
          <EmptyState icon={ChefHat} title="Nessuna ricetta trovata"
            description={pantry.length === 0 ? "Aggiungi prodotti nella dispensa per ricevere suggerimenti." : "Non abbiamo trovato ricette compatibili."}
            actions={[{ label: "Vai alla dispensa", icon: Package, onClick: () => navigate("/products") }]}
          />
        ) : localSuggestions.length > 0 ? (
          <div className="space-y-2">
            <h3 className="text-[13px] font-bold text-foreground flex items-center gap-1.5">
              <ChefHat className="h-4 w-4 text-success" /> Ricette rapide
            </h3>
            {localSuggestions.map((recipe, idx) => (
              <RecipeCard key={`local-${idx}`} recipe={recipe} idx={idx} />
            ))}
          </div>
        ) : null}
      </main>
    </div>
  );
};

export default AntiWastePage;
