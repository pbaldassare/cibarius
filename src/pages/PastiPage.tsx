import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import MobileHeader from "@/components/MobileHeader";
import EmptyState from "@/components/EmptyState";
import ListSkeleton from "@/components/ListSkeleton";
import AddFoodFlow from "@/components/AddFoodFlow";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Plus, UtensilsCrossed, Target, Trash2, Flame, ClipboardList } from "lucide-react";
import { Progress } from "@/components/ui/progress";

interface MealItem {
  id: string;
  custom_name: string | null;
  calories: number | null;
  quantity: number | null;
  unit: string | null;
  macros: any;
}

interface Meal {
  id: string;
  meal_type: string;
  meal_items: MealItem[];
}

interface MealDay {
  id: string;
  day_date: string;
  meals: Meal[];
}

interface MealTarget {
  meal_type: string;
  kcal_target: number;
  protein_g: number;
  carbs_g: number;
  fats_g: number;
}

const mealEmoji: Record<string, string> = {
  colazione: "☀️",
  pranzo: "🌤️",
  cena: "🌙",
  spuntino: "🍎",
};

const mealOrder = ["colazione", "pranzo", "spuntino", "cena"];

const PastiPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [mealDay, setMealDay] = useState<MealDay | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [targetKcal, setTargetKcal] = useState<number | null>(null);
  const [dietPlan, setDietPlan] = useState<any>(null);
  const [mealTargets, setMealTargets] = useState<MealTarget[]>([]);

  const fetchMeals = useCallback(async () => {
    if (!user) return;
    const today = new Date().toISOString().slice(0, 10);
    const { data } = await supabase
      .from("meal_days")
      .select("id, day_date, meals(id, meal_type, meal_items(id, custom_name, calories, quantity, unit, macros))")
      .eq("user_id", user.id)
      .eq("day_date", today)
      .maybeSingle();
    setMealDay(data as MealDay | null);
    setLoading(false);
  }, [user]);

  useEffect(() => { fetchMeals(); }, [fetchMeals]);

  useEffect(() => {
    if (!user) return;
    // Load nutrition targets
    supabase.from("nutrition_targets").select("kcal_day").eq("user_id", user.id).maybeSingle().then(({ data }) => {
      if (data) setTargetKcal(data.kcal_day);
    });
    // Load diet plan + meal targets
    supabase
      .from("diet_plans")
      .select("*, diet_plan_meal_targets(*)")
      .eq("client_user_id", user.id)
      .eq("is_active", true)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          setDietPlan(data);
          setMealTargets((data as any).diet_plan_meal_targets ?? []);
          if (!targetKcal) setTargetKcal((data as any).kcal_day);
        }
      });
  }, [user]);

  const handleDeleteItem = async (itemId: string) => {
    await supabase.from("meal_items").delete().eq("id", itemId);
    fetchMeals();
  };

  const meals = (mealDay?.meals ?? []).sort(
    (a, b) => mealOrder.indexOf(a.meal_type) - mealOrder.indexOf(b.meal_type)
  );

  const totalKcal = meals.reduce(
    (sum, m) => sum + m.meal_items.reduce((s, i) => s + (i.calories ?? 0), 0), 0
  );

  return (
    <div>
      <MobileHeader title="Pasti" />
      <main className="space-y-4 px-4 py-5 pb-28">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-foreground">Oggi</h2>
            {meals.length > 0 && (
              <p className="text-xs text-muted-foreground">{totalKcal} kcal totali</p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate("/diet")}
              className="flex items-center gap-1 text-sm font-medium text-muted-foreground"
            >
              <ClipboardList size={16} />
            </button>
            <button
              onClick={() => navigate("/meals/targets")}
              className="flex items-center gap-1 text-sm font-medium text-muted-foreground"
            >
              <Target size={16} />
            </button>
            <button
              onClick={() => setSheetOpen(true)}
              className="flex items-center gap-1 rounded-xl bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground"
            >
              <Plus size={16} />
              Aggiungi
            </button>
          </div>
        </div>

        {/* Diet plan box */}
        {dietPlan && (
          <button
            onClick={() => navigate("/diet")}
            className="w-full rounded-xl border-2 border-primary/20 bg-primary/5 p-3 text-left flex items-center gap-3 active:scale-[0.98] transition-transform"
          >
            <ClipboardList className="h-5 w-5 text-primary shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-foreground">{dietPlan.title}</p>
              <p className="text-xs text-muted-foreground">{dietPlan.kcal_day} kcal · P{dietPlan.protein_g_day} C{dietPlan.carbs_g_day} G{dietPlan.fats_g_day}</p>
            </div>
            <span className="text-xs text-primary font-medium">Vedi →</span>
          </button>
        )}

        {targetKcal && meals.length > 0 && (
          <div className="rounded-xl border-2 border-accent bg-card p-4 space-y-2">
            <div className="flex items-center gap-2">
              <Flame size={18} className="text-primary" />
              <span className="text-sm font-semibold text-foreground">Bilancio calorie</span>
            </div>
            <Progress value={Math.min((totalKcal / targetKcal) * 100, 100)} className="h-2.5" />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>{totalKcal} assunte</span>
              <span className={`font-semibold ${totalKcal >= targetKcal ? "text-destructive" : "text-primary"}`}>
                {totalKcal >= targetKcal
                  ? `+${totalKcal - targetKcal} kcal in eccesso`
                  : `${targetKcal - totalKcal} kcal rimanenti`}
              </span>
              <span>{targetKcal} obiettivo</span>
            </div>
          </div>
        )}

        {loading ? (
          <ListSkeleton count={3} variant="row" />
        ) : meals.length === 0 ? (
          <EmptyState
            icon={UtensilsCrossed}
            title="Nessun pasto registrato"
            description="Aggiungi il tuo primo alimento per tracciare le calorie di oggi."
            actions={[
              { label: "Aggiungi alimento", icon: Plus, onClick: () => setSheetOpen(true) },
              { label: "Obiettivi", icon: Target, variant: "outline", onClick: () => navigate("/meals/targets") },
            ]}
          />
        ) : (
          <div className="space-y-3">
            {meals.map((meal) => {
              const mealKcal = meal.meal_items.reduce((s, i) => s + (i.calories ?? 0), 0);
              const mealMacros = meal.meal_items.reduce(
                (acc, i) => {
                  const m = i.macros as any;
                  if (m) { acc.p += m.protein ?? 0; acc.c += m.carbs ?? 0; acc.f += m.fats ?? 0; }
                  return acc;
                },
                { p: 0, c: 0, f: 0 }
              );
              const mt = mealTargets.find((t) => t.meal_type === meal.meal_type);
              return (
                <div key={meal.id} className="rounded-xl border-2 border-accent bg-card p-4 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-2 font-semibold text-card-foreground">
                      <span>{mealEmoji[meal.meal_type] ?? "🍽️"}</span>
                      {meal.meal_type.charAt(0).toUpperCase() + meal.meal_type.slice(1)}
                    </span>
                    <span className="text-sm font-medium text-primary">
                      {mealKcal}{mt ? ` / ${mt.kcal_target}` : ""} kcal
                    </span>
                  </div>

                  {/* Per-meal progress if diet plan exists */}
                  {mt && (
                    <div className="space-y-1">
                      <Progress value={mt.kcal_target > 0 ? Math.min((mealKcal / mt.kcal_target) * 100, 100) : 0} className="h-1.5" />
                      <div className="flex justify-between text-[10px] text-muted-foreground">
                        <span>P: {Math.round(mealMacros.p)}/{mt.protein_g}g</span>
                        <span>C: {Math.round(mealMacros.c)}/{mt.carbs_g}g</span>
                        <span>G: {Math.round(mealMacros.f)}/{mt.fats_g}g</span>
                      </div>
                    </div>
                  )}

                  {meal.meal_items.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Nessun alimento</p>
                  ) : (
                    <div className="space-y-1.5">
                      {meal.meal_items.map((item) => (
                        <div key={item.id} className="flex items-center gap-2 rounded-lg bg-secondary/50 p-2">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-foreground truncate">
                              {item.custom_name || "—"}
                            </p>
                            <p className="text-[10px] text-muted-foreground">
                              {item.quantity ?? "—"}{item.unit ?? "g"} · {item.calories ?? 0} kcal
                            </p>
                          </div>
                          <button
                            onClick={() => handleDeleteItem(item.id)}
                            className="p-1.5 text-muted-foreground hover:text-destructive transition-colors"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  <button
                    onClick={() => setSheetOpen(true)}
                    className="flex items-center gap-1 text-xs font-medium text-primary pt-1"
                  >
                    <Plus size={14} /> Aggiungi alimento
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </main>

      <AddFoodFlow
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        context="meal"
        onComplete={fetchMeals}
      />
    </div>
  );
};

export default PastiPage;
