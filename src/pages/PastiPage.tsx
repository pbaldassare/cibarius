import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import MobileHeader from "@/components/MobileHeader";
import EmptyState from "@/components/EmptyState";
import ListSkeleton from "@/components/ListSkeleton";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Plus, UtensilsCrossed, Target } from "lucide-react";

interface MealDay {
  id: string;
  day_date: string;
  meals: { id: string; meal_type: string; meal_items: { id: string; custom_name: string | null; calories: number | null }[] }[];
}

const mealEmoji: Record<string, string> = {
  colazione: "☀️",
  pranzo: "🌤️",
  cena: "🌙",
  spuntino: "🍎",
};

const PastiPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [mealDay, setMealDay] = useState<MealDay | null>(null);

  useEffect(() => {
    if (!user) return;
    const today = new Date().toISOString().slice(0, 10);
    supabase
      .from("meal_days")
      .select("id, day_date, meals(id, meal_type, meal_items(id, custom_name, calories))")
      .eq("user_id", user.id)
      .eq("day_date", today)
      .maybeSingle()
      .then(({ data }) => {
        setMealDay(data as MealDay | null);
        setLoading(false);
      });
  }, [user]);

  const meals = mealDay?.meals ?? [];

  return (
    <div>
      <MobileHeader title="Pasti" />
      <main className="space-y-4 px-4 py-5">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-foreground">Oggi</h2>
          <button className="flex items-center gap-1 text-sm font-medium text-primary">
            <Plus size={16} />
            Aggiungi
          </button>
        </div>

        {loading ? (
          <ListSkeleton count={3} variant="row" />
        ) : meals.length === 0 ? (
          <EmptyState
            icon={UtensilsCrossed}
            title="Nessun pasto registrato"
            description="Aggiungi il tuo primo alimento per tracciare le calorie di oggi."
            actions={[
              { label: "Aggiungi alimento", icon: Plus, onClick: () => {} },
              { label: "Obiettivi", icon: Target, variant: "outline", onClick: () => navigate("/meals/targets") },
            ]}
          />
        ) : (
          <div className="space-y-3">
            {meals.map((meal) => {
              const totalKcal = meal.meal_items.reduce((s, i) => s + (i.calories ?? 0), 0);
              return (
                <div
                  key={meal.id}
                  className="rounded-xl border-2 border-accent bg-card p-4 space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-2 font-semibold text-card-foreground">
                      <span>{mealEmoji[meal.meal_type] ?? "🍽️"}</span>
                      {meal.meal_type.charAt(0).toUpperCase() + meal.meal_type.slice(1)}
                    </span>
                    <span className="text-sm font-medium text-primary">{totalKcal} kcal</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {meal.meal_items.length === 0
                      ? "Nessun alimento"
                      : meal.meal_items.map((i) => i.custom_name || "—").join(", ")}
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
};

export default PastiPage;
