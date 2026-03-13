import { useEffect, useState, useCallback } from "react";
import MealTextAutocomplete, { saveMealTextSuggestions } from "@/components/MealTextAutocomplete";
import { useParams, useNavigate } from "react-router-dom";
import MobileHeader from "@/components/MobileHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import {
  Loader2, ChevronDown, ChevronUp, Copy, Save, Plus, Trash2,
  CalendarDays, UtensilsCrossed, StickyNote, ClipboardCopy
} from "lucide-react";

const DAYS_OF_WEEK = [
  { num: 1, label: "Lunedì" },
  { num: 2, label: "Martedì" },
  { num: 3, label: "Mercoledì" },
  { num: 4, label: "Giovedì" },
  { num: 5, label: "Venerdì" },
  { num: 6, label: "Sabato" },
  { num: 7, label: "Domenica" },
];

const MEAL_TYPES = [
  { key: "colazione", label: "☀️ Colazione", emoji: "☀️" },
  { key: "spuntino_mattina", label: "🍎 Spuntino mattina", emoji: "🍎" },
  { key: "pranzo", label: "🍝 Pranzo", emoji: "🍝" },
  { key: "spuntino_pomeriggio", label: "🥤 Spuntino pomeriggio", emoji: "🥤" },
  { key: "cena", label: "🌙 Cena", emoji: "🌙" },
  { key: "extra", label: "📝 Note/Extra", emoji: "📝" },
];

interface MealData {
  meal_type: string;
  meal_text: string;
  sort_order: number;
}

interface DayData {
  day_of_week: number;
  notes: string;
  meals: MealData[];
}

interface WeekData {
  week_number: number;
  week_title: string;
  notes: string;
  days: DayData[];
}

const createEmptyDay = (dayNum: number): DayData => ({
  day_of_week: dayNum,
  notes: "",
  meals: MEAL_TYPES.map((mt, idx) => ({
    meal_type: mt.key,
    meal_text: "",
    sort_order: idx,
  })),
});

const createEmptyWeek = (weekNum: number): WeekData => ({
  week_number: weekNum,
  week_title: `Settimana ${weekNum}`,
  notes: "",
  days: DAYS_OF_WEEK.map((d) => createEmptyDay(d.num)),
});

const ProWeeklyPlanPage = () => {
  const { clientId } = useParams<{ clientId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [clientName, setClientName] = useState("");
  const [existingPlanId, setExistingPlanId] = useState<string | null>(null);

  // Plan header
  const [title, setTitle] = useState("Piano settimanale");
  const [planMode, setPlanMode] = useState<"targets_only" | "weekly_meal_plan">("weekly_meal_plan");
  const [caloriesTarget, setCaloriesTarget] = useState("");
  const [proteinTarget, setProteinTarget] = useState("");
  const [carbsTarget, setCarbsTarget] = useState("");
  const [fatTarget, setFatTarget] = useState("");
  const [notesGeneral, setNotesGeneral] = useState("");

  // Weeks data
  const [weeks, setWeeks] = useState<WeekData[]>([
    createEmptyWeek(1),
    createEmptyWeek(2),
    createEmptyWeek(3),
    createEmptyWeek(4),
  ]);

  // UI state
  const [openWeeks, setOpenWeeks] = useState<Record<number, boolean>>({ 1: true });
  const [openDays, setOpenDays] = useState<Record<string, boolean>>({});

  // Copy dialogs
  const [showCopyWeek, setShowCopyWeek] = useState<number | null>(null);
  const [showCopyDay, setShowCopyDay] = useState<{ weekIdx: number; dayIdx: number } | null>(null);

  useEffect(() => {
    if (!clientId || !user) return;
    const load = async () => {
      const [profileRes, planRes] = await Promise.all([
        supabase.from("profiles").select("full_name").eq("id", clientId).single(),
        supabase
          .from("nutrition_plans" as any)
          .select("*")
          .eq("nutritionist_user_id", user.id)
          .eq("client_user_id", clientId)
          .eq("is_active", true)
          .eq("plan_mode", "weekly_meal_plan")
          .order("created_at", { ascending: false })
          .limit(1),
      ]);
      setClientName(profileRes.data?.full_name || "Cliente");

      const plans = (planRes.data as any[]) || [];
      if (plans.length > 0) {
        const p = plans[0];
        setExistingPlanId(p.id);
        setTitle(p.title || "Piano settimanale");
        setCaloriesTarget(p.calories_target ? String(p.calories_target) : "");
        setProteinTarget(p.protein_target ? String(p.protein_target) : "");
        setCarbsTarget(p.carbs_target ? String(p.carbs_target) : "");
        setFatTarget(p.fat_target ? String(p.fat_target) : "");
        setNotesGeneral(p.notes_general || "");

        // Load weeks
        const { data: weeksData } = await supabase
          .from("nutrition_plan_weeks" as any)
          .select("*")
          .eq("plan_id", p.id)
          .order("week_number");

        if (weeksData && weeksData.length > 0) {
          const loadedWeeks: WeekData[] = [];
          for (const w of weeksData as any[]) {
            const { data: daysData } = await supabase
              .from("nutrition_plan_days" as any)
              .select("*")
              .eq("week_id", w.id)
              .order("day_of_week");

            const days: DayData[] = [];
            for (const d of (daysData || []) as any[]) {
              const { data: mealsData } = await supabase
                .from("nutrition_plan_meals" as any)
                .select("*")
                .eq("day_id", d.id)
                .order("sort_order");

              days.push({
                day_of_week: d.day_of_week,
                notes: d.notes || "",
                meals: (mealsData || []).length > 0
                  ? (mealsData as any[]).map((m: any) => ({
                      meal_type: m.meal_type,
                      meal_text: m.meal_text || "",
                      sort_order: m.sort_order,
                    }))
                  : MEAL_TYPES.map((mt, idx) => ({ meal_type: mt.key, meal_text: "", sort_order: idx })),
              });
            }

            // Fill missing days
            const filledDays = DAYS_OF_WEEK.map((d) => {
              const existing = days.find((dd) => dd.day_of_week === d.num);
              return existing || createEmptyDay(d.num);
            });

            loadedWeeks.push({
              week_number: w.week_number,
              week_title: w.week_title || `Settimana ${w.week_number}`,
              notes: w.notes || "",
              days: filledDays,
            });
          }
          setWeeks(loadedWeeks);
        }
      }
      setLoading(false);
    };
    load();
  }, [clientId, user]);

  const updateMealText = (weekIdx: number, dayIdx: number, mealIdx: number, text: string) => {
    setWeeks((prev) => {
      const updated = [...prev];
      updated[weekIdx] = { ...updated[weekIdx], days: [...updated[weekIdx].days] };
      updated[weekIdx].days[dayIdx] = { ...updated[weekIdx].days[dayIdx], meals: [...updated[weekIdx].days[dayIdx].meals] };
      updated[weekIdx].days[dayIdx].meals[mealIdx] = { ...updated[weekIdx].days[dayIdx].meals[mealIdx], meal_text: text };
      return updated;
    });
  };

  const updateDayNotes = (weekIdx: number, dayIdx: number, notes: string) => {
    setWeeks((prev) => {
      const updated = [...prev];
      updated[weekIdx] = { ...updated[weekIdx], days: [...updated[weekIdx].days] };
      updated[weekIdx].days[dayIdx] = { ...updated[weekIdx].days[dayIdx], notes };
      return updated;
    });
  };

  const updateWeekNotes = (weekIdx: number, notes: string) => {
    setWeeks((prev) => {
      const updated = [...prev];
      updated[weekIdx] = { ...updated[weekIdx], notes };
      return updated;
    });
  };

  const addWeek = () => {
    setWeeks((prev) => [...prev, createEmptyWeek(prev.length + 1)]);
  };

  const removeWeek = (weekIdx: number) => {
    if (weeks.length <= 1) return;
    setWeeks((prev) => prev.filter((_, i) => i !== weekIdx).map((w, i) => ({ ...w, week_number: i + 1, week_title: w.week_title.startsWith("Settimana") ? `Settimana ${i + 1}` : w.week_title })));
  };

  // Copy week to another
  const copyWeekTo = (fromIdx: number, toIdx: number) => {
    setWeeks((prev) => {
      const updated = [...prev];
      updated[toIdx] = {
        ...updated[toIdx],
        notes: prev[fromIdx].notes,
        days: prev[fromIdx].days.map((d) => ({ ...d, meals: d.meals.map((m) => ({ ...m })) })),
      };
      return updated;
    });
    setShowCopyWeek(null);
    toast.success(`Settimana ${fromIdx + 1} copiata su Settimana ${toIdx + 1}`);
  };

  // Copy day to others
  const copyDayTo = (fromWeekIdx: number, fromDayIdx: number, toWeekIdx: number, toDayIdx: number) => {
    setWeeks((prev) => {
      const updated = [...prev];
      const sourceDay = prev[fromWeekIdx].days[fromDayIdx];
      updated[toWeekIdx] = { ...updated[toWeekIdx], days: [...updated[toWeekIdx].days] };
      updated[toWeekIdx].days[toDayIdx] = {
        ...updated[toWeekIdx].days[toDayIdx],
        notes: sourceDay.notes,
        meals: sourceDay.meals.map((m) => ({ ...m })),
      };
      return updated;
    });
    setShowCopyDay(null);
    toast.success("Giorno copiato!");
  };

  const handleSave = async () => {
    if (!user || !clientId) return;
    setSaving(true);

    try {
      let planId = existingPlanId;

      if (planId) {
        // Update existing plan
        await supabase.from("nutrition_plans" as any).update({
          title,
          calories_target: caloriesTarget ? parseInt(caloriesTarget) : null,
          protein_target: proteinTarget ? parseInt(proteinTarget) : null,
          carbs_target: carbsTarget ? parseInt(carbsTarget) : null,
          fat_target: fatTarget ? parseInt(fatTarget) : null,
          notes_general: notesGeneral || null,
          updated_at: new Date().toISOString(),
        } as any).eq("id", planId);

        // Delete old weeks (cascade deletes days and meals)
        await supabase.from("nutrition_plan_weeks" as any).delete().eq("plan_id", planId);
      } else {
        // Deactivate other weekly plans
        await supabase.from("nutrition_plans" as any).update({ is_active: false } as any)
          .eq("nutritionist_user_id", user.id)
          .eq("client_user_id", clientId)
          .eq("plan_mode", "weekly_meal_plan")
          .eq("is_active", true);

        const { data: newPlan, error } = await supabase.from("nutrition_plans" as any).insert({
          nutritionist_user_id: user.id,
          client_user_id: clientId,
          title,
          plan_mode: "weekly_meal_plan",
          calories_target: caloriesTarget ? parseInt(caloriesTarget) : null,
          protein_target: proteinTarget ? parseInt(proteinTarget) : null,
          carbs_target: carbsTarget ? parseInt(carbsTarget) : null,
          fat_target: fatTarget ? parseInt(fatTarget) : null,
          notes_general: notesGeneral || null,
        } as any).select("id").single();
        if (error) throw error;
        planId = (newPlan as any).id;
        setExistingPlanId(planId);
      }

      // Save weeks, days, meals
      for (const week of weeks) {
        const { data: weekRow, error: wErr } = await supabase.from("nutrition_plan_weeks" as any).insert({
          plan_id: planId,
          week_number: week.week_number,
          week_title: week.week_title || null,
          notes: week.notes || null,
        } as any).select("id").single();
        if (wErr) throw wErr;

        for (const day of week.days) {
          const { data: dayRow, error: dErr } = await supabase.from("nutrition_plan_days" as any).insert({
            week_id: (weekRow as any).id,
            day_of_week: day.day_of_week,
            notes: day.notes || null,
          } as any).select("id").single();
          if (dErr) throw dErr;

          const mealsToInsert = day.meals
            .filter((m) => m.meal_text.trim() !== "")
            .map((m) => ({
              day_id: (dayRow as any).id,
              meal_type: m.meal_type,
              meal_text: m.meal_text,
              sort_order: m.sort_order,
            }));

          if (mealsToInsert.length > 0) {
            const { error: mErr } = await supabase.from("nutrition_plan_meals" as any).insert(mealsToInsert as any);
            if (mErr) throw mErr;
          }
        }
      }

      // Sync nutrition_targets if macros specified
      if (caloriesTarget) {
        await supabase.from("nutrition_targets").upsert({
          user_id: clientId,
          kcal_day: parseInt(caloriesTarget) || 0,
          protein_g: proteinTarget ? parseInt(proteinTarget) : null,
          carbs_g: carbsTarget ? parseInt(carbsTarget) : null,
          fats_g: fatTarget ? parseInt(fatTarget) : null,
        } as any, { onConflict: "user_id" });
      }

      // Save meal text suggestions
      const allMealTexts = weeks.flatMap((w) =>
        w.days.flatMap((d) =>
          d.meals.filter((m) => m.meal_text.trim()).map((m) => ({
            meal_type: m.meal_type,
            meal_text: m.meal_text.trim(),
          }))
        )
      );
      if (user && allMealTexts.length > 0) {
        await saveMealTextSuggestions(user.id, allMealTexts);
      }

      toast.success("Piano settimanale salvato! ✅");
      navigate(`/pro/client/${clientId}`);
    } catch (err: any) {
      toast.error(err?.message || "Errore nel salvataggio");
    }
    setSaving(false);
  };

  const toggleWeek = (weekNum: number) => {
    setOpenWeeks((prev) => ({ ...prev, [weekNum]: !prev[weekNum] }));
  };

  const toggleDay = (key: string) => {
    setOpenDays((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const filledMealsCount = (day: DayData) => day.meals.filter((m) => m.meal_text.trim()).length;

  if (loading) {
    return (
      <div>
        <MobileHeader title="Piano settimanale" />
        <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
      </div>
    );
  }

  return (
    <div>
      <MobileHeader title={`Piano — ${clientName}`} />
      <main className="px-4 py-5 pb-28 space-y-4">
        {/* Plan header */}
        <Card className="border-0 shadow-[var(--shadow-card)]">
          <CardContent className="p-4 space-y-3">
            <Input placeholder="Titolo piano" value={title} onChange={(e) => setTitle(e.target.value)} className="font-semibold" />

            {/* Optional targets */}
            <p className="text-xs text-muted-foreground font-medium">Target giornalieri (opzionale)</p>
            <div className="grid grid-cols-4 gap-2">
              <div>
                <label className="text-[10px] text-muted-foreground">Kcal</label>
                <Input type="number" placeholder="2000" value={caloriesTarget} onChange={(e) => setCaloriesTarget(e.target.value)} className="h-8 text-xs" />
              </div>
              <div>
                <label className="text-[10px] text-muted-foreground">Proteine</label>
                <Input type="number" placeholder="120" value={proteinTarget} onChange={(e) => setProteinTarget(e.target.value)} className="h-8 text-xs" />
              </div>
              <div>
                <label className="text-[10px] text-muted-foreground">Carbo</label>
                <Input type="number" placeholder="220" value={carbsTarget} onChange={(e) => setCarbsTarget(e.target.value)} className="h-8 text-xs" />
              </div>
              <div>
                <label className="text-[10px] text-muted-foreground">Grassi</label>
                <Input type="number" placeholder="70" value={fatTarget} onChange={(e) => setFatTarget(e.target.value)} className="h-8 text-xs" />
              </div>
            </div>

            <Textarea
              placeholder="Note generali del piano (es: bere almeno 2L acqua al giorno, evitare fritti...)"
              value={notesGeneral}
              onChange={(e) => setNotesGeneral(e.target.value)}
              className="min-h-[60px] text-sm"
            />
          </CardContent>
        </Card>

        {/* Weeks */}
        {weeks.map((week, weekIdx) => (
          <Collapsible key={weekIdx} open={openWeeks[week.week_number]} onOpenChange={() => toggleWeek(week.week_number)}>
            <Card className="border border-border overflow-hidden">
              <CollapsibleTrigger asChild>
                <button className="w-full flex items-center justify-between p-4 hover:bg-accent/50 transition-colors">
                  <div className="flex items-center gap-2">
                    <CalendarDays className="h-4 w-4 text-primary" />
                    <span className="font-semibold text-sm text-foreground">{week.week_title}</span>
                    <Badge variant="secondary" className="text-[10px]">
                      {week.days.reduce((s, d) => s + filledMealsCount(d), 0)} pasti
                    </Badge>
                  </div>
                  {openWeeks[week.week_number] ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                </button>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="px-4 pb-4 space-y-3">
                  {/* Week tools */}
                  <div className="flex gap-2 flex-wrap">
                    <Button size="sm" variant="outline" className="gap-1 text-xs" onClick={() => setShowCopyWeek(weekIdx)}>
                      <Copy className="h-3 w-3" /> Copia settimana
                    </Button>
                    {weeks.length > 1 && (
                      <Button size="sm" variant="outline" className="gap-1 text-xs text-destructive" onClick={() => removeWeek(weekIdx)}>
                        <Trash2 className="h-3 w-3" /> Rimuovi
                      </Button>
                    )}
                  </div>

                  <Textarea
                    placeholder="Note settimana (es: aumentare idratazione, preferire pesce 3 volte...)"
                    value={week.notes}
                    onChange={(e) => updateWeekNotes(weekIdx, e.target.value)}
                    className="min-h-[40px] text-xs"
                  />

                  {/* Days */}
                  {week.days.map((day, dayIdx) => {
                    const dayKey = `${weekIdx}-${dayIdx}`;
                    const dayLabel = DAYS_OF_WEEK.find((d) => d.num === day.day_of_week)?.label || `Giorno ${day.day_of_week}`;
                    const filled = filledMealsCount(day);
                    return (
                      <Collapsible key={dayKey} open={openDays[dayKey]} onOpenChange={() => toggleDay(dayKey)}>
                        <div className="rounded-lg border border-border overflow-hidden">
                          <CollapsibleTrigger asChild>
                            <button className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-accent/30 transition-colors">
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-medium text-foreground">{dayLabel}</span>
                                {filled > 0 && (
                                  <Badge variant="default" className="text-[9px] px-1.5">{filled}</Badge>
                                )}
                              </div>
                              <div className="flex items-center gap-1">
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-6 w-6 p-0"
                                  onClick={(e) => { e.stopPropagation(); setShowCopyDay({ weekIdx, dayIdx }); }}
                                >
                                  <ClipboardCopy className="h-3 w-3 text-muted-foreground" />
                                </Button>
                                {openDays[dayKey] ? <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" /> : <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />}
                              </div>
                            </button>
                          </CollapsibleTrigger>
                          <CollapsibleContent>
                            <div className="px-3 pb-3 space-y-2.5 border-t border-border pt-2.5">
                              {day.meals.map((meal, mealIdx) => {
                                const mealInfo = MEAL_TYPES.find((mt) => mt.key === meal.meal_type);
                                return (
                                  <div key={mealIdx}>
                                    <label className="text-[11px] font-medium text-muted-foreground mb-1 flex items-center gap-1">
                                      <span>{mealInfo?.emoji}</span> {mealInfo?.label?.replace(/^[^\s]+\s/, "") || meal.meal_type}
                                    </label>
                                    <MealTextAutocomplete
                                      placeholder={meal.meal_type === "extra" ? "Note aggiuntive per il giorno..." : "es: latte 100g + biscotti senza zucchero 50g"}
                                      value={meal.meal_text}
                                      onChange={(val) => updateMealText(weekIdx, dayIdx, mealIdx, val)}
                                      mealType={meal.meal_type}
                                      className="min-h-[36px] text-xs resize-none"
                                    />
                                  </div>
                                );
                              })}
                              <div>
                                <label className="text-[11px] font-medium text-muted-foreground mb-1 flex items-center gap-1">
                                  <StickyNote className="h-3 w-3" /> Note giorno
                                </label>
                                <Textarea
                                  placeholder="es: bere almeno 2L acqua, verdure libere..."
                                  value={day.notes}
                                  onChange={(e) => updateDayNotes(weekIdx, dayIdx, e.target.value)}
                                  className="min-h-[32px] text-xs resize-none"
                                />
                              </div>
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

        {/* Add week */}
        <Button variant="outline" className="w-full gap-2" onClick={addWeek}>
          <Plus className="h-4 w-4" /> Aggiungi settimana
        </Button>

        {/* Save */}
        <Button className="w-full gap-2" onClick={handleSave} disabled={saving}>
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          {existingPlanId ? "Aggiorna piano" : "Salva piano"}
        </Button>
      </main>

      {/* Copy week dialog */}
      <Dialog open={showCopyWeek !== null} onOpenChange={() => setShowCopyWeek(null)}>
        <DialogContent className="max-w-xs">
          <DialogHeader><DialogTitle>Copia settimana {showCopyWeek !== null ? showCopyWeek + 1 : ""} su...</DialogTitle></DialogHeader>
          <div className="space-y-2">
            {weeks.map((w, idx) => (
              idx !== showCopyWeek && (
                <Button key={idx} variant="outline" className="w-full" onClick={() => copyWeekTo(showCopyWeek!, idx)}>
                  {w.week_title}
                </Button>
              )
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* Copy day dialog */}
      <Dialog open={showCopyDay !== null} onOpenChange={() => setShowCopyDay(null)}>
        <DialogContent className="max-w-xs max-h-[70vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Copia giorno su...</DialogTitle></DialogHeader>
          <div className="space-y-3">
            {weeks.map((w, wIdx) => (
              <div key={wIdx}>
                <p className="text-xs font-semibold text-muted-foreground mb-1">{w.week_title}</p>
                <div className="grid grid-cols-2 gap-1">
                  {w.days.map((d, dIdx) => {
                    const isSource = showCopyDay?.weekIdx === wIdx && showCopyDay?.dayIdx === dIdx;
                    return (
                      <Button
                        key={dIdx}
                        size="sm"
                        variant={isSource ? "default" : "outline"}
                        disabled={isSource}
                        className="text-xs"
                        onClick={() => copyDayTo(showCopyDay!.weekIdx, showCopyDay!.dayIdx, wIdx, dIdx)}
                      >
                        {DAYS_OF_WEEK[dIdx]?.label}
                      </Button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ProWeeklyPlanPage;
