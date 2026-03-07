import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import MobileHeader from "@/components/MobileHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import MealRecipeCard from "@/components/MealRecipeCard";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useFavorites } from "@/hooks/useFavorites";
import { Loader2, Plus, ArrowRight, RefreshCw, ChevronDown, ChevronUp, UtensilsCrossed, Save } from "lucide-react";
import { toast } from "sonner";

const MEAL_LABELS: Record<string, { emoji: string; label: string }> = {
  colazione: { emoji: "☀️", label: "Colazione" },
  pranzo: { emoji: "🌤️", label: "Pranzo" },
  spuntino: { emoji: "🍎", label: "Spuntino" },
  cena: { emoji: "🌙", label: "Cena" },
};
const MEAL_ORDER = ["colazione", "pranzo", "spuntino", "cena"];

// Map plan title keywords to diet_category
const CATEGORY_MAP: Record<string, string> = {
  mediterranea: "mediterranea",
  keto: "keto",
  ketogenica: "keto",
  digiuno: "digiuno",
  intermittente: "digiuno",
  massa: "massa",
  muscolare: "massa",
  dimagrimento: "dimagrimento",
  moderato: "dimagrimento",
};

function detectDietCategory(title: string): string {
  const lower = title.toLowerCase();
  for (const [keyword, category] of Object.entries(CATEGORY_MAP)) {
    if (lower.includes(keyword)) return category;
  }
  return "mediterranea"; // default
}

function detectIsFemale(title: string): boolean {
  return title.toLowerCase().includes("donna");
}

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

interface TemplateRecipe {
  id: string;
  title: string;
  meal_type: string;
  instructions: string | null;
  prep_time_min: number;
  ingredients: any[];
  kcal_total: number;
  protein_total: number;
  carbs_total: number;
  fats_total: number;
  portion_scale_female: number;
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
  const [recipes, setRecipes] = useState<TemplateRecipe[]>([]);
  const [openRecipes, setOpenRecipes] = useState<Record<string, boolean>>({});

  // Save-day state
  const [mealsLogged, setMealsLogged] = useState<Record<string, boolean>>({});
  const [manualCompliance, setManualCompliance] = useState(0);
  const [dayNotes, setDayNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const dietCategory = plan ? detectDietCategory(plan.title) : "mediterranea";
  const isFemale = plan ? detectIsFemale(plan.title) : false;

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

    let activePlan: any = null;
    if (plans && plans.length > 0) {
      activePlan = plans[0];
      setPlan(activePlan);
      setMealTargets((activePlan.diet_plan_meal_targets || []) as MealTarget[]);
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
      // Auto-populate mealsLogged from today's meals
      const autoMeals: Record<string, boolean> = {};
      meals.forEach((m: any) => { autoMeals[m.meal_type] = true; });
      setMealsLogged(autoMeals);
      // Auto-calc compliance
      if (activePlan) {
        const totalKcal = meals.reduce((s: number, m: any) => {
          const items = m.meal_items || [];
          return s + items.reduce((ss: number, i: any) => ss + (i.calories ?? 0), 0);
        }, 0);
        setManualCompliance(Math.min(100, Math.round((totalKcal / (activePlan.kcal_day || 2000)) * 100)));
      }
    } else {
      setTodayMeals([]);
      setMealsLogged({});
      setManualCompliance(0);
    }

    // Load existing daily_progress for today to pre-populate
    const { data: existingProgress } = await supabase
      .from("daily_progress")
      .select("*")
      .eq("user_id", user.id)
      .eq("day_date", today)
      .maybeSingle();
    if (existingProgress) {
      const ml = existingProgress.meals_logged as Record<string, boolean> | null;
      if (ml && Object.keys(ml).length > 0) setMealsLogged(ml);
      if (existingProgress.compliance_pct) setManualCompliance(existingProgress.compliance_pct);
      if (existingProgress.notes) setDayNotes(existingProgress.notes);
    }

    // Load recipes for detected category
    if (activePlan) {
      const cat = detectDietCategory(activePlan.title);
      const { data: recipeData } = await supabase
        .from("template_recipes")
        .select("*")
        .eq("diet_category", cat)
        .order("meal_type")
        .order("title");

      setRecipes((recipeData || []) as unknown as TemplateRecipe[]);
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

  const recipesByMeal = useMemo(() => {
    const map: Record<string, TemplateRecipe[]> = {};
    for (const r of recipes) {
      if (!map[r.meal_type]) map[r.meal_type] = [];
      map[r.meal_type].push(r);
    }
    return map;
  }, [recipes]);

  const kcalPct = plan ? Math.min(100, Math.round((todayTotals.kcal / plan.kcal_day) * 100)) : 0;

  const handleRegisterRecipe = async (ingredients: any[], title: string, mealType: string) => {
    if (!user) return;
    try {
      const today = new Date().toISOString().slice(0, 10);

      // Get or create meal_day
      let { data: dayData } = await supabase
        .from("meal_days")
        .select("id")
        .eq("user_id", user.id)
        .eq("day_date", today)
        .maybeSingle();

      let dayId: string;
      if (!dayData) {
        const { data: newDay, error: dayErr } = await supabase
          .from("meal_days")
          .insert({ user_id: user.id, day_date: today })
          .select("id")
          .single();
        if (dayErr) throw dayErr;
        dayId = newDay.id;
      } else {
        dayId = dayData.id;
      }

      // Get or create meal
      let { data: mealData } = await supabase
        .from("meals")
        .select("id")
        .eq("meal_day_id", dayId)
        .eq("meal_type", mealType)
        .maybeSingle();

      let mealId: string;
      if (!mealData) {
        const { data: newMeal, error: mealErr } = await supabase
          .from("meals")
          .insert({ meal_day_id: dayId, meal_type: mealType })
          .select("id")
          .single();
        if (mealErr) throw mealErr;
        mealId = newMeal.id;
      } else {
        mealId = mealData.id;
      }

      // Insert meal_item with total macros of the recipe
      const totalKcal = ingredients.reduce((s, i) => s + i.kcal, 0);
      const totalP = ingredients.reduce((s, i) => s + i.protein_g, 0);
      const totalC = ingredients.reduce((s, i) => s + i.carbs_g, 0);
      const totalF = ingredients.reduce((s, i) => s + i.fats_g, 0);

      const { error: itemErr } = await supabase.from("meal_items").insert({
        meal_id: mealId,
        source_type: "custom",
        custom_name: title,
        dish_name: title,
        calories: totalKcal,
        quantity: 1,
        unit: "porzione",
        macros: { protein: totalP, carbs: totalC, fats: totalF },
      });
      if (itemErr) throw itemErr;

      toast.success(`"${title}" registrato! ✅`);
      loadData(); // refresh progress
    } catch (e: any) {
      toast.error("Errore nella registrazione: " + e.message);
    }
  };

  const handleSaveDay = async () => {
    if (!user || !plan) return;
    setSaving(true);
    const todayStr = new Date().toISOString().slice(0, 10);

    const row = {
      user_id: user.id,
      day_date: todayStr,
      plan_id: plan.id,
      kcal_target: plan.kcal_day || 0,
      kcal_actual: todayTotals.kcal,
      protein_target: plan.protein_g_day || 0,
      protein_actual: todayTotals.protein,
      carbs_target: plan.carbs_g_day || 0,
      carbs_actual: todayTotals.carbs,
      fats_target: plan.fats_g_day || 0,
      fats_actual: todayTotals.fats,
      compliance_pct: manualCompliance,
      meals_logged: mealsLogged,
      notes: dayNotes || null,
    };

    const { error } = await supabase
      .from("daily_progress")
      .upsert(row, { onConflict: "user_id,day_date" });

    if (error) {
      toast.error("Errore nel salvataggio");
    } else {
      toast.success("Giornata salvata! ✅");
    }
    setSaving(false);
  };

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

  const sortedTargets = [...mealTargets].sort(
    (a, b) => MEAL_ORDER.indexOf(a.meal_type) - MEAL_ORDER.indexOf(b.meal_type)
  );

  const portionScale = isFemale ? (recipes[0]?.portion_scale_female ?? 0.8) : 1;

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
          const mealRecipes = recipesByMeal[target.meal_type] || [];
          const isRecipesOpen = openRecipes[target.meal_type] || false;

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

                {/* Recipe alternatives */}
                {mealRecipes.length > 0 && (
                  <Collapsible
                    open={isRecipesOpen}
                    onOpenChange={(v) => setOpenRecipes((prev) => ({ ...prev, [target.meal_type]: v }))}
                  >
                    <CollapsibleTrigger asChild>
                      <Button variant="ghost" size="sm" className="w-full text-xs text-muted-foreground h-8">
                        <UtensilsCrossed className="h-3.5 w-3.5 mr-1.5" />
                        {isRecipesOpen ? "Nascondi" : "Vedi"} {mealRecipes.length} ricette suggerite
                        {isRecipesOpen ? (
                          <ChevronUp className="h-3 w-3 ml-1" />
                        ) : (
                          <ChevronDown className="h-3 w-3 ml-1" />
                        )}
                      </Button>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <div className="space-y-2 pt-2">
                        {mealRecipes.map((recipe) => (
                          <MealRecipeCard
                            key={recipe.id}
                            title={recipe.title}
                            instructions={recipe.instructions}
                            prep_time_min={recipe.prep_time_min}
                            ingredients={recipe.ingredients as any[]}
                            kcal_total={recipe.kcal_total}
                            protein_total={recipe.protein_total}
                            carbs_total={recipe.carbs_total}
                            fats_total={recipe.fats_total}
                            portionScale={portionScale}
                            onRegister={(ings, title) =>
                              handleRegisterRecipe(ings, title, target.meal_type)
                            }
                          />
                        ))}
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                )}
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

        {/* Save day card */}
        <Card className="border-0 shadow-[var(--shadow-card)]">
          <CardContent className="p-4 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-foreground">
                Salva giornata
              </h3>
              <span className="text-xs text-muted-foreground">
                {format(new Date(), "d MMMM yyyy", { locale: it })}
              </span>
            </div>

            {/* Meals completed checkboxes */}
            <div className="space-y-2.5">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Pasti completati</p>
              {MEAL_ORDER.map((key) => {
                const ml = MEAL_LABELS[key];
                return (
                  <label
                    key={key}
                    className="flex items-center gap-3 rounded-lg border border-border/50 px-3 py-2.5 cursor-pointer hover:bg-accent/50 transition-colors"
                  >
                    <Checkbox
                      checked={!!mealsLogged[key]}
                      onCheckedChange={(checked) =>
                        setMealsLogged((prev) => ({ ...prev, [key]: !!checked }))
                      }
                    />
                    <span className="text-lg">{ml.emoji}</span>
                    <span className="text-sm font-medium text-foreground flex-1">{ml.label}</span>
                    {mealsLogged[key] && (
                      <span className="text-[10px] font-semibold text-success bg-success/10 px-2 py-0.5 rounded-full">
                        ✓ Fatto
                      </span>
                    )}
                  </label>
                );
              })}
            </div>

            {/* Compliance slider */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Rispetto del piano</p>
                <span className={`text-sm font-bold ${manualCompliance >= 80 ? "text-success" : manualCompliance >= 50 ? "text-warning" : "text-destructive"}`}>
                  {manualCompliance}%
                </span>
              </div>
              <Slider
                value={[manualCompliance]}
                onValueChange={(v) => setManualCompliance(v[0])}
                max={100}
                step={5}
                className="w-full"
              />
            </div>

            {/* Notes */}
            <div className="space-y-1.5">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Note del giorno</p>
              <Textarea
                placeholder="Come è andata oggi? Hai avuto difficoltà?"
                value={dayNotes}
                onChange={(e) => setDayNotes(e.target.value)}
                rows={2}
                className="text-sm resize-none"
              />
            </div>

            <Button onClick={handleSaveDay} disabled={saving} className="w-full gap-2">
              <Save className="h-4 w-4" />
              {saving ? "Salvataggio..." : "Salva giornata"}
            </Button>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default UserActivePlanPage;
