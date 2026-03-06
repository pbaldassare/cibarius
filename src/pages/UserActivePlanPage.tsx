import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import MobileHeader from "@/components/MobileHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Loader2, Plus, ArrowRight, RefreshCw } from "lucide-react";

const MEAL_LABELS: Record<string, { emoji: string; label: string }> = {
  colazione: { emoji: "☀️", label: "Colazione" },
  pranzo: { emoji: "🌤️", label: "Pranzo" },
  spuntino: { emoji: "🍎", label: "Spuntino" },
  cena: { emoji: "🌙", label: "Cena" },
};
const MEAL_ORDER = ["colazione", "pranzo", "spuntino", "cena"];

interface MealTarget {
  meal_type: string;
  kcal_target: number;
  protein_g: number;
  carbs_g: number;
  fats_g: number;
}

interface TodayMeal {
  meal_type: string;
  kcal: number;
  protein: number;
  carbs: number;
  fats: number;
}

const MacroBar = ({ label, current, target, color }: { label: string; current: number; target: number; color: string }) => {
  const pct = target > 0 ? Math.min(100, Math.round((current / target) * 100)) : 0;
  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="w-5 font-semibold text-muted-foreground">{label}</span>
      <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
        <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="w-16 text-right tabular-nums text-muted-foreground">
        {Math.round(current)}/{Math.round(target)}g
      </span>
    </div>
  );
};

const UserActivePlanPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [plan, setPlan] = useState<any>(null);
  const [mealTargets, setMealTargets] = useState<MealTarget[]>([]);
  const [todayMeals, setTodayMeals] = useState<TodayMeal[]>([]);

  const loadData = async () => {
    if (!user) return;
    setLoading(true);

    const { data: plans } = await supabase
      .from("diet_plans")
      .select("*, diet_plan_meal_targets(*)")
      .eq("client_user_id", user.id)
      .eq("is_active", true)
      .order("created_at", { ascending: false })
      .limit(1);

    if (plans && plans.length > 0) {
      const p = plans[0] as any;
      setPlan(p);
      setMealTargets((p.diet_plan_meal_targets || []) as MealTarget[]);
    } else {
      setPlan(null);
      setMealTargets([]);
    }

    // Today's logged meals
    const today = new Date().toISOString().slice(0, 10);
    const { data: dayData } = await supabase
      .from("meal_days")
      .select("id, meals(id, meal_type, meal_items(calories, macros))")
      .eq("user_id", user.id)
      .eq("day_date", today)
      .maybeSingle();

    if (dayData) {
      const meals = (dayData as any).meals || [];
      setTodayMeals(
        meals.map((m: any) => {
          const items = m.meal_items || [];
          return {
            meal_type: m.meal_type,
            kcal: items.reduce((s: number, i: any) => s + (i.calories ?? 0), 0),
            protein: items.reduce((s: number, i: any) => s + ((i.macros as any)?.protein ?? 0), 0),
            carbs: items.reduce((s: number, i: any) => s + ((i.macros as any)?.carbs ?? 0), 0),
            fats: items.reduce((s: number, i: any) => s + ((i.macros as any)?.fats ?? 0), 0),
          };
        })
      );
    } else {
      setTodayMeals([]);
    }

    setLoading(false);
  };

  useEffect(() => {
    if (user) loadData();
  }, [user]);

  const todayTotals = useMemo(
    () =>
      todayMeals.reduce(
        (acc, m) => ({
          kcal: acc.kcal + m.kcal,
          protein: acc.protein + m.protein,
          carbs: acc.carbs + m.carbs,
          fats: acc.fats + m.fats,
        }),
        { kcal: 0, protein: 0, carbs: 0, fats: 0 }
      ),
    [todayMeals]
  );

  const kcalPct = plan ? Math.min(100, Math.round((todayTotals.kcal / plan.kcal_day) * 100)) : 0;

  if (loading) {
    return (
      <div>
        <MobileHeader title="Il mio piano" />
        <div className="flex justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  if (!plan) {
    return (
      <div>
        <MobileHeader title="Il mio piano" />
        <main className="px-4 py-10 text-center space-y-4">
          <p className="text-muted-foreground">Nessun piano attivo.</p>
          <Button onClick={() => navigate("/diet")}>
            Scegli un piano <ArrowRight className="ml-1 h-4 w-4" />
          </Button>
        </main>
      </div>
    );
  }

  // Sort meal targets by MEAL_ORDER
  const sortedTargets = [...mealTargets].sort(
    (a, b) => MEAL_ORDER.indexOf(a.meal_type) - MEAL_ORDER.indexOf(b.meal_type)
  );

  return (
    <div>
      <MobileHeader title="Il mio piano" />
      <main className="px-4 py-5 space-y-5 pb-8">
        {/* Plan header */}
        <Card className="border-0 shadow-[var(--shadow-card)]">
          <CardContent className="p-4 space-y-3">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="font-semibold text-base text-foreground leading-tight">{plan.title}</h2>
                {plan.notes && (
                  <p className="text-xs text-muted-foreground mt-1">📝 {plan.notes}</p>
                )}
              </div>
              <Badge className="bg-success/15 text-success border-0 text-[10px] font-semibold shrink-0">
                Attivo
              </Badge>
            </div>
            <div className="flex items-center gap-4 text-sm">
              <span className="font-bold text-foreground">🔥 {plan.kcal_day} kcal</span>
              <span className="text-muted-foreground">P {plan.protein_g_day}g</span>
              <span className="text-muted-foreground">C {plan.carbs_g_day}g</span>
              <span className="text-muted-foreground">G {plan.fats_g_day}g</span>
            </div>
          </CardContent>
        </Card>

        {/* Today's overall progress */}
        <Card className="border-0 shadow-[var(--shadow-card)]">
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-sm text-foreground">Progresso di oggi</h3>
              <span className="text-xs font-bold text-primary tabular-nums">
                {kcalPct}% ({Math.round(todayTotals.kcal)}/{plan.kcal_day})
              </span>
            </div>
            <Progress value={kcalPct} className="h-2.5 bg-muted" />
            <div className="space-y-1.5">
              <MacroBar label="P" current={todayTotals.protein} target={plan.protein_g_day} color="bg-blue-500" />
              <MacroBar label="C" current={todayTotals.carbs} target={plan.carbs_g_day} color="bg-amber-500" />
              <MacroBar label="G" current={todayTotals.fats} target={plan.fats_g_day} color="bg-rose-400" />
            </div>
          </CardContent>
        </Card>

        {/* Per-meal breakdown */}
        {sortedTargets.map((target) => {
          const ml = MEAL_LABELS[target.meal_type] || { emoji: "🍽️", label: target.meal_type };
          const logged = todayMeals.find((m) => m.meal_type === target.meal_type);
          const mealKcal = logged?.kcal ?? 0;
          const mealPct = target.kcal_target > 0 ? Math.min(100, Math.round((mealKcal / target.kcal_target) * 100)) : 0;
          const hasLogged = mealKcal > 0;

          return (
            <Card key={target.meal_type} className="border-0 shadow-[var(--shadow-card)]">
              <CardContent className="p-4 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{ml.emoji}</span>
                    <span className="font-semibold text-sm text-foreground">{ml.label}</span>
                  </div>
                  <span className="text-xs font-bold tabular-nums text-muted-foreground">
                    {Math.round(target.kcal_target)} kcal
                  </span>
                </div>

                <Progress value={mealPct} className="h-2 bg-muted" />

                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <div className="flex gap-3">
                    <span>P {Math.round(target.protein_g)}g</span>
                    <span>C {Math.round(target.carbs_g)}g</span>
                    <span>G {Math.round(target.fats_g)}g</span>
                  </div>
                  {hasLogged ? (
                    <Badge variant="outline" className="text-[10px] border-success/30 text-success">
                      {mealPct}% completato
                    </Badge>
                  ) : (
                    <span className="text-[10px] text-muted-foreground/60 italic">Da registrare</span>
                  )}
                </div>

                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full text-xs text-primary hover:text-primary"
                  onClick={() => navigate("/meals")}
                >
                  <Plus className="h-3.5 w-3.5 mr-1" />
                  Aggiungi
                </Button>
              </CardContent>
            </Card>
          );
        })}

        {/* Change plan button */}
        <Button
          variant="outline"
          className="w-full"
          onClick={() => navigate("/diet")}
        >
          <RefreshCw className="h-4 w-4 mr-2" />
          Cambia piano
        </Button>
      </main>
    </div>
  );
};

export default UserActivePlanPage;
