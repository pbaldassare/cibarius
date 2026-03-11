import { useState } from "react";
import { useNavigate } from "react-router-dom";
import MobileHeader from "@/components/MobileHeader";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import EmptyState from "@/components/EmptyState";
import { deductPantryFromMeal } from "@/lib/pantry-deduction";
import {
  Sparkles, ChefHat, Clock, Check, X, Loader2,
  AlertTriangle, Utensils, Package,
} from "lucide-react";

interface Ingredient {
  name: string;
  available: boolean;
  expiring?: boolean;
  quantity: string;
}

interface Suggestion {
  title: string;
  reason: string;
  estimated_kcal: number;
  estimated_macros: { protein: number; carbs: number; fats: number };
  ingredients: Ingredient[];
}

interface SuggestResponse {
  suggestions: Suggestion[];
  pantry_count: number;
  expiring_count: number;
  consumed_today: {
    totalKcal: number;
    totalProtein: number;
    totalCarbs: number;
    totalFats: number;
    meals: any[];
  };
}

const SuggestMealPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [data, setData] = useState<SuggestResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [cooking, setCooking] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSuggest = async () => {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      const { data: result, error: fnErr } = await supabase.functions.invoke("suggest-meal");
      if (fnErr) throw fnErr;
      if (result?.error) throw new Error(result.error);
      setData(result as SuggestResponse);
    } catch (e: any) {
      console.error(e);
      setError(e.message || "Errore nel generare i suggerimenti");
      toast({ variant: "destructive", title: "Errore", description: e.message });
    } finally {
      setLoading(false);
    }
  };

  const handleCook = async (suggestion: Suggestion, idx: number) => {
    if (!user) return;
    setCooking(idx);
    try {
      const today = new Date().toISOString().slice(0, 10);

      // Determine meal type by time of day
      const hour = new Date().getHours();
      const mealType = hour < 11 ? "colazione" : hour < 15 ? "pranzo" : hour < 18 ? "spuntino" : "cena";

      // Ensure meal_day exists
      let { data: dayData } = await supabase
        .from("meal_days").select("id").eq("user_id", user.id).eq("day_date", today).maybeSingle();
      if (!dayData) {
        const { data: nd, error: de } = await supabase
          .from("meal_days").insert({ user_id: user.id, day_date: today }).select("id").single();
        if (de) throw de;
        dayData = nd;
      }

      // Ensure meal exists
      let { data: mealData } = await supabase
        .from("meals").select("id").eq("meal_day_id", dayData!.id).eq("meal_type", mealType).maybeSingle();
      if (!mealData) {
        const { data: nm, error: me } = await supabase
          .from("meals").insert({ meal_day_id: dayData!.id, meal_type: mealType }).select("id").single();
        if (me) throw me;
        mealData = nm;
      }

      // Insert meal item
      await supabase.from("meal_items").insert({
        meal_id: mealData!.id,
        source_type: "custom",
        custom_name: suggestion.title,
        dish_name: suggestion.title,
        calories: suggestion.estimated_kcal,
        quantity: 1,
        unit: "porzione",
        macros: suggestion.estimated_macros,
      });

      // Deduct pantry
      const pantryItems = suggestion.ingredients
        .filter((i) => i.available)
        .map((i) => ({
          custom_name: i.name,
          dish_name: i.name,
          quantity: parseFloat(i.quantity) || 100,
          unit: i.quantity.includes("g") ? "g" : "pz",
        }));
      if (pantryItems.length > 0) {
        await deductPantryFromMeal(user.id, pantryItems);
      }

      // Track waste savings for expiring ingredients used
      for (const ing of suggestion.ingredients) {
        if (ing.available && ing.expiring) {
          await supabase.from("waste_savings" as any).insert({
            user_id: user.id,
            item_name: ing.name,
            weight_g: parseFloat(ing.quantity) || 100,
            estimated_price: 0.8,
            source: "ai_suggestion",
          } as any);
        }
      }

      toast({ title: `"${suggestion.title}" registrato! ✅`, description: "Dispensa aggiornata automaticamente" });
    } catch (e: any) {
      toast({ variant: "destructive", title: "Errore", description: e.message });
    } finally {
      setCooking(null);
    }
  };

  return (
    <div>
      <MobileHeader title="Cosa mangio oggi?" />
      <main className="space-y-4 px-4 py-5 pb-28">

        {/* Hero */}
        <div className="rounded-2xl bg-gradient-to-br from-primary/10 via-accent/5 to-background border border-primary/20 p-5 text-center space-y-3">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/15">
            <Sparkles className="h-7 w-7 text-primary" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-foreground">Suggerimenti intelligenti</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Analizzo la tua dispensa, le scadenze e i pasti di oggi per suggerirti cosa cucinare.
            </p>
          </div>
          <Button
            onClick={handleSuggest}
            disabled={loading}
            className="w-full h-12 text-base font-semibold rounded-xl"
          >
            {loading ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin mr-2" />
                Analizzo la tua dispensa…
              </>
            ) : (
              <>
                <Sparkles className="h-5 w-5 mr-2" />
                Suggerisci pasto
              </>
            )}
          </Button>
        </div>

        {/* Error */}
        {error && (
          <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
            {error}
          </div>
        )}

        {/* Context summary */}
        {data && (
          <div className="flex gap-2">
            <div className="flex-1 rounded-xl bg-card border border-border p-3 text-center">
              <p className="text-lg font-bold text-foreground">{data.pantry_count}</p>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">In dispensa</p>
            </div>
            <div className="flex-1 rounded-xl bg-card border border-border p-3 text-center">
              <p className="text-lg font-bold text-accent">{data.expiring_count}</p>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">In scadenza</p>
            </div>
            <div className="flex-1 rounded-xl bg-card border border-border p-3 text-center">
              <p className="text-lg font-bold text-primary">{Math.round(data.consumed_today.totalKcal)}</p>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Kcal oggi</p>
            </div>
          </div>
        )}

        {/* Suggestions */}
        {data && data.suggestions.length === 0 && (
          <EmptyState
            icon={Package}
            title="Dispensa vuota"
            description="Aggiungi prodotti nella dispensa per ricevere suggerimenti AI."
            actions={[{ label: "Vai alla dispensa", icon: Package, onClick: () => navigate("/products") }]}
          />
        )}

        {data && data.suggestions.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <ChefHat className="h-4 w-4 text-primary" />
              Ecco cosa puoi cucinare
            </h3>

            {data.suggestions.map((suggestion, idx) => {
              const availableCount = suggestion.ingredients.filter((i) => i.available).length;
              const missingCount = suggestion.ingredients.length - availableCount;
              const expiringCount = suggestion.ingredients.filter((i) => i.expiring).length;

              return (
                <div key={idx} className="rounded-2xl border-2 border-border bg-card overflow-hidden">
                  {/* Header */}
                  <div className="p-4 pb-3 space-y-2">
                    <div className="flex items-start justify-between">
                      <p className="text-[15px] font-bold text-foreground flex-1">{suggestion.title}</p>
                      <span className="text-xs font-semibold text-primary shrink-0 ml-2">
                        {suggestion.estimated_kcal} kcal
                      </span>
                    </div>

                    {/* Reason */}
                    <p className="text-xs text-muted-foreground italic">💡 {suggestion.reason}</p>

                    {/* Badges */}
                    <div className="flex flex-wrap gap-1.5">
                      {expiringCount > 0 && (
                        <Badge variant="outline" className="text-[10px] border-accent/40 text-accent">
                          <AlertTriangle className="h-3 w-3 mr-0.5" />
                          Usa {expiringCount} in scadenza
                        </Badge>
                      )}
                      {missingCount > 0 && (
                        <Badge variant="outline" className="text-[10px] border-muted-foreground/40 text-muted-foreground">
                          {missingCount} mancant{missingCount === 1 ? "e" : "i"}
                        </Badge>
                      )}
                    </div>
                  </div>

                  {/* Ingredients */}
                  <div className="px-4 pb-3">
                    <div className="flex flex-wrap gap-1.5">
                      {suggestion.ingredients.map((ing, i) => (
                        <span
                          key={i}
                          className={`inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs ${
                            ing.expiring
                              ? "bg-accent/10 text-accent border border-accent/20"
                              : ing.available
                              ? "bg-success/10 text-success border border-success/20"
                              : "bg-muted text-muted-foreground border border-border"
                          }`}
                        >
                          {ing.expiring ? (
                            <Clock className="h-3 w-3" />
                          ) : ing.available ? (
                            <Check className="h-3 w-3" />
                          ) : (
                            <X className="h-3 w-3" />
                          )}
                          {ing.name} · {ing.quantity}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Macros */}
                  <div className="px-4 pb-3 flex gap-3 text-xs text-muted-foreground">
                    <span>P {suggestion.estimated_macros.protein}g</span>
                    <span>C {suggestion.estimated_macros.carbs}g</span>
                    <span>G {suggestion.estimated_macros.fats}g</span>
                  </div>

                  {/* Action */}
                  <div className="px-4 pb-4">
                    <Button
                      onClick={() => handleCook(suggestion, idx)}
                      disabled={cooking !== null}
                      className="w-full h-10 rounded-xl text-sm font-semibold"
                    >
                      {cooking === idx ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      ) : (
                        <Utensils className="h-4 w-4 mr-2" />
                      )}
                      Cucina questo
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
};

export default SuggestMealPage;
