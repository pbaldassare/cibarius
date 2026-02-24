import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import MobileHeader from "@/components/MobileHeader";
import EmptyState from "@/components/EmptyState";
import ListSkeleton from "@/components/ListSkeleton";
import AddMealSheet from "@/components/AddMealSheet";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Plus, UtensilsCrossed, Target, Trash2 } from "lucide-react";

interface MealItem {
  id: string;
  custom_name: string | null;
  calories: number | null;
  quantity: number | null;
  unit: string | null;
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

  const fetchMeals = useCallback(async () => {
    if (!user) return;
    const today = new Date().toISOString().slice(0, 10);
    const { data } = await supabase
      .from("meal_days")
      .select("id, day_date, meals(id, meal_type, meal_items(id, custom_name, calories, quantity, unit))")
      .eq("user_id", user.id)
      .eq("day_date", today)
      .maybeSingle();
    setMealDay(data as MealDay | null);
    setLoading(false);
  }, [user]);

  useEffect(() => { fetchMeals(); }, [fetchMeals]);

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
              return (
                <div key={meal.id} className="rounded-xl border-2 border-accent bg-card p-4 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-2 font-semibold text-card-foreground">
                      <span>{mealEmoji[meal.meal_type] ?? "🍽️"}</span>
                      {meal.meal_type.charAt(0).toUpperCase() + meal.meal_type.slice(1)}
                    </span>
                    <span className="text-sm font-medium text-primary">{mealKcal} kcal</span>
                  </div>

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

      <AddMealSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        onSaved={fetchMeals}
      />
    </div>
  );
};

export default PastiPage;
