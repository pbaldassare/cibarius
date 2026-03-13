import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import MobileHeader from "@/components/MobileHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Loader2, ChevronDown, ChevronUp, CalendarDays, UtensilsCrossed, StickyNote, History, ArrowRight } from "lucide-react";

const DAYS_OF_WEEK = [
  { num: 1, label: "Lunedì" },
  { num: 2, label: "Martedì" },
  { num: 3, label: "Mercoledì" },
  { num: 4, label: "Giovedì" },
  { num: 5, label: "Venerdì" },
  { num: 6, label: "Sabato" },
  { num: 7, label: "Domenica" },
];

const MEAL_LABELS: Record<string, string> = {
  colazione: "☀️ Colazione",
  spuntino_mattina: "🍎 Spuntino mattina",
  pranzo: "🍝 Pranzo",
  spuntino_pomeriggio: "🥤 Spuntino pomeriggio",
  cena: "🌙 Cena",
  extra: "📝 Note/Extra",
};

const UserWeeklyPlanPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [plan, setPlan] = useState<any>(null);
  const [weeks, setWeeks] = useState<any[]>([]);
  const [allPlans, setAllPlans] = useState<any[]>([]);
  const [openWeeks, setOpenWeeks] = useState<Record<number, boolean>>({});
  const [openDays, setOpenDays] = useState<Record<string, boolean>>({});
  const [showHistory, setShowHistory] = useState(false);

  // Auto-open current week based on plan start_date
  const getCurrentWeek = (startDate: string): number => {
    const start = new Date(startDate);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    return Math.max(1, Math.min(4, Math.floor(diffDays / 7) + 1));
  };

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      setLoading(true);

      // Get all weekly plans
      const { data: plans } = await supabase
        .from("nutrition_plans" as any)
        .select("*")
        .eq("client_user_id", user.id)
        .eq("plan_mode", "weekly_meal_plan")
        .order("created_at", { ascending: false });

      setAllPlans((plans as any[]) || []);

      const activePlan = ((plans as any[]) || []).find((p: any) => p.is_active);
      if (!activePlan) {
        setPlan(null);
        setLoading(false);
        return;
      }

      setPlan(activePlan);

      // Load weeks
      const { data: weeksData } = await supabase
        .from("nutrition_plan_weeks" as any)
        .select("*")
        .eq("plan_id", activePlan.id)
        .order("week_number");

      const loadedWeeks: any[] = [];
      for (const w of ((weeksData as any[]) || [])) {
        const { data: daysData } = await supabase
          .from("nutrition_plan_days" as any)
          .select("*")
          .eq("week_id", w.id)
          .order("day_of_week");

        const days: any[] = [];
        for (const d of ((daysData as any[]) || [])) {
          const { data: mealsData } = await supabase
            .from("nutrition_plan_meals" as any)
            .select("*")
            .eq("day_id", d.id)
            .order("sort_order");
          days.push({ ...d, meals: mealsData || [] });
        }
        loadedWeeks.push({ ...w, days });
      }

      setWeeks(loadedWeeks);

      // Auto-open current week
      const currentWeek = getCurrentWeek(activePlan.start_date);
      setOpenWeeks({ [currentWeek]: true });

      // Auto-open today's day
      const todayDow = new Date().getDay();
      const adjustedDow = todayDow === 0 ? 7 : todayDow; // Sunday = 7
      const weekIdx = loadedWeeks.findIndex((w: any) => w.week_number === currentWeek);
      if (weekIdx >= 0) {
        setOpenDays({ [`${weekIdx}-${adjustedDow}`]: true });
      }

      setLoading(false);
    };
    load();
  }, [user]);

  if (loading) {
    return (
      <div>
        <MobileHeader title="Piano settimanale" />
        <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
      </div>
    );
  }

  if (!plan) {
    return (
      <div>
        <MobileHeader title="Piano settimanale" />
        <main className="px-4 py-10 text-center space-y-4">
          <p className="text-muted-foreground">Nessun piano settimanale attivo.</p>
          <Button onClick={() => navigate("/plan")}>
            Vai al piano obiettivi <ArrowRight className="ml-1 h-4 w-4" />
          </Button>
        </main>
      </div>
    );
  }

  return (
    <div>
      <MobileHeader title="Piano settimanale" />
      <main className="px-4 py-5 pb-28 space-y-4">
        {/* Plan header */}
        <Card className="border-0 shadow-[var(--shadow-card)]">
          <CardContent className="p-4 space-y-2">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="font-semibold text-base text-foreground">{plan.title}</h2>
                <p className="text-xs text-muted-foreground">
                  Dal {new Date(plan.start_date).toLocaleDateString("it-IT", { day: "numeric", month: "long" })}
                  {plan.end_date && ` al ${new Date(plan.end_date).toLocaleDateString("it-IT", { day: "numeric", month: "long" })}`}
                </p>
              </div>
              <Badge className="bg-success/15 text-success border-0 text-[10px] font-semibold">Attivo</Badge>
            </div>

            {/* Macro targets if set */}
            {plan.calories_target && (
              <div className="flex items-center gap-3 text-sm">
                <span className="font-bold text-foreground">🔥 {plan.calories_target} kcal</span>
                {plan.protein_target && <span className="text-muted-foreground">P {plan.protein_target}g</span>}
                {plan.carbs_target && <span className="text-muted-foreground">C {plan.carbs_target}g</span>}
                {plan.fat_target && <span className="text-muted-foreground">G {plan.fat_target}g</span>}
              </div>
            )}

            {plan.notes_general && (
              <p className="text-xs text-muted-foreground bg-muted rounded-lg p-2">📝 {plan.notes_general}</p>
            )}

            {/* History button */}
            {allPlans.length > 1 && (
              <Button size="sm" variant="ghost" className="gap-1 text-xs" onClick={() => setShowHistory(!showHistory)}>
                <History className="h-3.5 w-3.5" /> Storico piani ({allPlans.length})
              </Button>
            )}
          </CardContent>
        </Card>

        {/* History */}
        {showHistory && (
          <div className="space-y-2">
            {allPlans.filter((p: any) => p.id !== plan.id).map((p: any) => (
              <Card key={p.id} className="border border-border">
                <CardContent className="p-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-foreground">{p.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(p.created_at).toLocaleDateString("it-IT", { day: "numeric", month: "long", year: "numeric" })}
                      </p>
                    </div>
                    <Badge variant="secondary" className="text-[9px]">Archiviato</Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Weeks */}
        {weeks.map((week: any, weekIdx: number) => (
          <Collapsible key={weekIdx} open={openWeeks[week.week_number]} onOpenChange={() => setOpenWeeks((prev) => ({ ...prev, [week.week_number]: !prev[week.week_number] }))}>
            <Card className="border border-border overflow-hidden">
              <CollapsibleTrigger asChild>
                <button className="w-full flex items-center justify-between p-4 hover:bg-accent/50 transition-colors">
                  <div className="flex items-center gap-2">
                    <CalendarDays className="h-4 w-4 text-primary" />
                    <span className="font-semibold text-sm text-foreground">{week.week_title || `Settimana ${week.week_number}`}</span>
                  </div>
                  {openWeeks[week.week_number] ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                </button>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="px-4 pb-4 space-y-2">
                  {week.notes && (
                    <p className="text-xs text-muted-foreground bg-primary/5 rounded-lg p-2 border border-primary/10">
                      📋 {week.notes}
                    </p>
                  )}

                  {(week.days || []).map((day: any, dayIdx: number) => {
                    const dayLabel = DAYS_OF_WEEK.find((d) => d.num === day.day_of_week)?.label || `Giorno ${day.day_of_week}`;
                    const dayKey = `${weekIdx}-${day.day_of_week}`;
                    const meals = day.meals || [];
                    if (meals.length === 0 && !day.notes) return null;

                    return (
                      <Collapsible key={dayKey} open={openDays[dayKey]} onOpenChange={() => setOpenDays((prev) => ({ ...prev, [dayKey]: !prev[dayKey] }))}>
                        <div className="rounded-lg border border-border overflow-hidden">
                          <CollapsibleTrigger asChild>
                            <button className="w-full flex items-center justify-between px-3 py-2 hover:bg-accent/30 transition-colors">
                              <span className="text-sm font-medium text-foreground">{dayLabel}</span>
                              <div className="flex items-center gap-1.5">
                                <Badge variant="secondary" className="text-[9px]">{meals.length} pasti</Badge>
                                {openDays[dayKey] ? <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" /> : <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />}
                              </div>
                            </button>
                          </CollapsibleTrigger>
                          <CollapsibleContent>
                            <div className="px-3 pb-3 space-y-2 border-t border-border pt-2">
                              {meals.map((meal: any) => (
                                <div key={meal.id} className="space-y-0.5">
                                  <p className="text-[11px] font-semibold text-primary/80">{MEAL_LABELS[meal.meal_type] || meal.meal_type}</p>
                                  <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">{meal.meal_text}</p>
                                </div>
                              ))}
                              {day.notes && (
                                <div className="pt-1 border-t border-dashed border-border">
                                  <p className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1"><StickyNote className="h-3 w-3" /> Note</p>
                                  <p className="text-xs text-muted-foreground">{day.notes}</p>
                                </div>
                              )}
                            </div>
                          </CollapsibleContent>
                        </div>
                      </Collapsible>
                    );
                  })}
                </div>
              </CollapsibleContent>
            </Card>
          </Collapsible>
        ))}
      </main>
    </div>
  );
};

export default UserWeeklyPlanPage;
