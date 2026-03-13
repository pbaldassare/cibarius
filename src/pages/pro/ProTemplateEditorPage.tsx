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
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import {
  Loader2, Save, ChevronDown, ChevronUp, Plus, Trash2,
  CalendarDays, Copy, ClipboardCopy, StickyNote, Wand2, ChevronRight
} from "lucide-react";

/* ─── Constants ─── */
const MEAL_TYPES_TARGETS = [
  { key: "colazione", label: "☀️ Colazione" },
  { key: "pranzo", label: "🌤️ Pranzo" },
  { key: "cena", label: "🌙 Cena" },
  { key: "spuntino", label: "🍎 Spuntino" },
];

const DAYS_OF_WEEK = [
  { num: 1, label: "Lunedì" },
  { num: 2, label: "Martedì" },
  { num: 3, label: "Mercoledì" },
  { num: 4, label: "Giovedì" },
  { num: 5, label: "Venerdì" },
  { num: 6, label: "Sabato" },
  { num: 7, label: "Domenica" },
];

const WEEKLY_MEAL_TYPES = [
  { key: "colazione", label: "☀️ Colazione", emoji: "☀️" },
  { key: "spuntino_mattina", label: "🍎 Spuntino mattina", emoji: "🍎" },
  { key: "pranzo", label: "🍝 Pranzo", emoji: "🍝" },
  { key: "spuntino_pomeriggio", label: "🥤 Spuntino pomeriggio", emoji: "🥤" },
  { key: "cena", label: "🌙 Cena", emoji: "🌙" },
  { key: "extra", label: "📝 Note/Extra", emoji: "📝" },
];

interface MealTarget {
  meal_type: string;
  kcal_target: number;
  protein_g: number;
  carbs_g: number;
  fats_g: number;
  sugars_g: number;
  fiber_g: number;
  saturated_fats_g: number;
  unsaturated_fats_g: number;
}

interface WeeklyMeal { meal_type: string; meal_text: string; sort_order: number; }
interface DayData { day_of_week: number; notes: string; meals: WeeklyMeal[]; }
interface WeekData { week_number: number; week_title: string; notes: string; days: DayData[]; }

const createEmptyDay = (dayNum: number): DayData => ({
  day_of_week: dayNum,
  notes: "",
  meals: WEEKLY_MEAL_TYPES.map((mt, idx) => ({ meal_type: mt.key, meal_text: "", sort_order: idx })),
});

const createEmptyWeek = (weekNum: number): WeekData => ({
  week_number: weekNum,
  week_title: `Settimana ${weekNum}`,
  notes: "",
  days: DAYS_OF_WEEK.map((d) => createEmptyDay(d.num)),
});

const ProTemplateEditorPage = () => {
  const { templateId } = useParams<{ templateId: string }>();
  const isEdit = templateId && templateId !== "new";
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(!!isEdit);
  const [saving, setSaving] = useState(false);

  // Header
  const [title, setTitle] = useState("Nuovo template");
  const [notes, setNotes] = useState("");

  // Daily targets
  const [kcalDay, setKcalDay] = useState("2000");
  const [proteinDay, setProteinDay] = useState("120");
  const [carbsDay, setCarbsDay] = useState("220");
  const [fatsDay, setFatsDay] = useState("70");
  const [sugarsDay, setSugarsDay] = useState("");
  const [fiberDay, setFiberDay] = useState("");
  const [satFatsDay, setSatFatsDay] = useState("");
  const [unsatFatsDay, setUnsatFatsDay] = useState("");
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Meal targets
  const [mealTargets, setMealTargets] = useState<MealTarget[]>(
    MEAL_TYPES_TARGETS.map((mt) => ({
      meal_type: mt.key, kcal_target: 0, protein_g: 0, carbs_g: 0, fats_g: 0,
      sugars_g: 0, fiber_g: 0, saturated_fats_g: 0, unsaturated_fats_g: 0,
    }))
  );

  // Weekly data
  const [weeks, setWeeks] = useState<WeekData[]>([createEmptyWeek(1)]);
  const [openWeeks, setOpenWeeks] = useState<Record<number, boolean>>({ 1: true });
  const [openDays, setOpenDays] = useState<Record<string, boolean>>({});

  // Copy dialogs
  const [showCopyWeek, setShowCopyWeek] = useState<number | null>(null);
  const [showCopyDay, setShowCopyDay] = useState<{ weekIdx: number; dayIdx: number } | null>(null);

  // Active tab
  const [activeTab, setActiveTab] = useState("targets");

  // Load existing template
  useEffect(() => {
    if (!isEdit || !user) return;
    const load = async () => {
      const { data: tmpl } = await supabase
        .from("diet_plan_templates")
        .select("*, diet_plan_template_meals(*)")
        .eq("id", templateId)
        .single();

      if (tmpl) {
        setTitle(tmpl.title || "");
        setNotes(tmpl.notes || "");
        setKcalDay(String(tmpl.kcal_day));
        setProteinDay(String(tmpl.protein_g_day));
        setCarbsDay(String(tmpl.carbs_g_day));
        setFatsDay(String(tmpl.fats_g_day));
        setSugarsDay((tmpl as any).sugars_g_day != null ? String((tmpl as any).sugars_g_day) : "");
        setFiberDay(tmpl.fiber_g_day != null ? String(tmpl.fiber_g_day) : "");
        setSatFatsDay(tmpl.saturated_fats_g_day != null ? String(tmpl.saturated_fats_g_day) : "");
        setUnsatFatsDay(tmpl.unsaturated_fats_g_day != null ? String(tmpl.unsaturated_fats_g_day) : "");
        if ((tmpl as any).sugars_g_day || tmpl.fiber_g_day || tmpl.saturated_fats_g_day || tmpl.unsaturated_fats_g_day) setShowAdvanced(true);

        if (tmpl.diet_plan_template_meals?.length > 0) {
          setMealTargets(
            MEAL_TYPES_TARGETS.map((mt) => {
              const existing = (tmpl.diet_plan_template_meals as any[]).find((t: any) => t.meal_type === mt.key);
              return existing
                ? { meal_type: mt.key, kcal_target: existing.kcal_target, protein_g: existing.protein_g, carbs_g: existing.carbs_g, fats_g: existing.fats_g, sugars_g: existing.sugars_g ?? 0, fiber_g: existing.fiber_g ?? 0, saturated_fats_g: existing.saturated_fats_g ?? 0, unsaturated_fats_g: existing.unsaturated_fats_g ?? 0 }
                : { meal_type: mt.key, kcal_target: 0, protein_g: 0, carbs_g: 0, fats_g: 0, sugars_g: 0, fiber_g: 0, saturated_fats_g: 0, unsaturated_fats_g: 0 };
            })
          );
        }

        // Load weekly data from JSON
        const wd = (tmpl as any).weekly_data;
        const weeksArr = wd?.weeks ?? (Array.isArray(wd) ? wd : null);
        if (weeksArr && Array.isArray(weeksArr) && weeksArr.length > 0) {
          setWeeks(weeksArr.map((w: any, idx: number) => ({
            week_number: w.week_number ?? idx + 1,
            week_title: w.week_title ?? `Settimana ${idx + 1}`,
            notes: w.notes ?? "",
            days: DAYS_OF_WEEK.map((d) => {
              // Support both 0-based (from AI import) and 1-based day_of_week
              const existingDay = w.days?.find((dd: any) => dd.day_of_week === d.num || dd.day_of_week === d.num - 1);
              if (!existingDay) return createEmptyDay(d.num);
              return {
                day_of_week: d.num,
                notes: existingDay.notes ?? "",
                meals: WEEKLY_MEAL_TYPES.map((mt, mIdx) => {
                  // Match by meal_type; also map "spuntino" to spuntino_mattina/pomeriggio
                  let existingMeal = existingDay.meals?.find((m: any) => m.meal_type === mt.key);
                  if (!existingMeal && mt.key === "spuntino_mattina") {
                    // Take the first unmatched "spuntino"
                    const spuntinos = existingDay.meals?.filter((m: any) => m.meal_type === "spuntino") || [];
                    existingMeal = spuntinos[0];
                  }
                  if (!existingMeal && mt.key === "spuntino_pomeriggio") {
                    const spuntinos = existingDay.meals?.filter((m: any) => m.meal_type === "spuntino") || [];
                    existingMeal = spuntinos[1];
                  }
                  const mealText = existingMeal?.meal_text ?? existingMeal?.text ?? "";
                  return { meal_type: mt.key, meal_text: mealText, sort_order: mIdx };
                }),
              };
            }),
          })));
        }
      }
      setLoading(false);
    };
    load();
  }, [isEdit, templateId, user]);

  // Computed totals
  const targetKcal = parseFloat(kcalDay) || 0;
  const targetProtein = parseFloat(proteinDay) || 0;
  const targetCarbs = parseFloat(carbsDay) || 0;
  const targetFats = parseFloat(fatsDay) || 0;
  const sumKcal = mealTargets.reduce((s, m) => s + m.kcal_target, 0);
  const sumProtein = mealTargets.reduce((s, m) => s + m.protein_g, 0);
  const sumCarbs = mealTargets.reduce((s, m) => s + m.carbs_g, 0);
  const sumFats = mealTargets.reduce((s, m) => s + m.fats_g, 0);
  const allMatch = sumKcal === targetKcal && sumProtein === targetProtein && sumCarbs === targetCarbs && sumFats === targetFats;

  const updateMealTarget = (idx: number, field: keyof MealTarget, value: string) => {
    setMealTargets((prev) => prev.map((mt, i) => (i === idx ? { ...mt, [field]: parseFloat(value) || 0 } : mt)));
  };

  const autoBalance = () => {
    const n = MEAL_TYPES_TARGETS.length;
    setMealTargets((prev) =>
      prev.map((mt, i) => ({
        ...mt,
        kcal_target: Math.round(targetKcal / n) + (i === 0 ? targetKcal % n : 0),
        protein_g: Math.round(targetProtein / n) + (i === 0 ? targetProtein % n : 0),
        carbs_g: Math.round(targetCarbs / n) + (i === 0 ? targetCarbs % n : 0),
        fats_g: Math.round(targetFats / n) + (i === 0 ? targetFats % n : 0),
      }))
    );
    toast({ title: "Macro distribuiti equamente tra i pasti" });
  };

  // Weekly helpers
  const updateMealText = (weekIdx: number, dayIdx: number, mealIdx: number, text: string) => {
    setWeeks((prev) => {
      const u = [...prev];
      u[weekIdx] = { ...u[weekIdx], days: [...u[weekIdx].days] };
      u[weekIdx].days[dayIdx] = { ...u[weekIdx].days[dayIdx], meals: [...u[weekIdx].days[dayIdx].meals] };
      u[weekIdx].days[dayIdx].meals[mealIdx] = { ...u[weekIdx].days[dayIdx].meals[mealIdx], meal_text: text };
      return u;
    });
  };

  const updateDayNotes = (weekIdx: number, dayIdx: number, notes: string) => {
    setWeeks((prev) => {
      const u = [...prev];
      u[weekIdx] = { ...u[weekIdx], days: [...u[weekIdx].days] };
      u[weekIdx].days[dayIdx] = { ...u[weekIdx].days[dayIdx], notes };
      return u;
    });
  };

  const updateWeekNotes = (weekIdx: number, notes: string) => {
    setWeeks((prev) => { const u = [...prev]; u[weekIdx] = { ...u[weekIdx], notes }; return u; });
  };

  const addWeek = () => setWeeks((prev) => [...prev, createEmptyWeek(prev.length + 1)]);
  const removeWeek = (idx: number) => {
    if (weeks.length <= 1) return;
    setWeeks((prev) => prev.filter((_, i) => i !== idx).map((w, i) => ({
      ...w, week_number: i + 1,
      week_title: w.week_title.startsWith("Settimana") ? `Settimana ${i + 1}` : w.week_title,
    })));
  };

  const copyWeekTo = (from: number, to: number) => {
    setWeeks((prev) => {
      const u = [...prev];
      u[to] = { ...u[to], notes: prev[from].notes, days: prev[from].days.map((d) => ({ ...d, meals: d.meals.map((m) => ({ ...m })) })) };
      return u;
    });
    setShowCopyWeek(null);
    toast({ title: `Settimana ${from + 1} copiata` });
  };

  const copyDayTo = (fw: number, fd: number, tw: number, td: number) => {
    setWeeks((prev) => {
      const u = [...prev];
      const src = prev[fw].days[fd];
      u[tw] = { ...u[tw], days: [...u[tw].days] };
      u[tw].days[td] = { ...u[tw].days[td], notes: src.notes, meals: src.meals.map((m) => ({ ...m })) };
      return u;
    });
    setShowCopyDay(null);
    toast({ title: "Giorno copiato" });
  };

  const toggleWeek = (n: number) => setOpenWeeks((p) => ({ ...p, [n]: !p[n] }));
  const toggleDay = (k: string) => setOpenDays((p) => ({ ...p, [k]: !p[k] }));
  const filledMeals = (d: DayData) => d.meals.filter((m) => m.meal_text.trim()).length;

  // Check if weekly data has any content
  const hasWeeklyContent = weeks.some((w) => w.days.some((d) => d.meals.some((m) => m.meal_text.trim()) || d.notes.trim()) || w.notes.trim());

  // Save
  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    try {
      const payload: any = {
        professional_id: user.id,
        title: title || "Nuovo template",
        kcal_day: targetKcal,
        protein_g_day: targetProtein,
        carbs_g_day: targetCarbs,
        fats_g_day: targetFats,
        sugars_g_day: sugarsDay ? parseFloat(sugarsDay) : null,
        fiber_g_day: fiberDay ? parseFloat(fiberDay) : null,
        saturated_fats_g_day: satFatsDay ? parseFloat(satFatsDay) : null,
        unsaturated_fats_g_day: unsatFatsDay ? parseFloat(unsatFatsDay) : null,
        notes: notes || null,
        weekly_data: hasWeeklyContent ? weeks : null,
      };

      let tmplId = isEdit ? templateId : null;

      if (isEdit) {
        const { error } = await supabase.from("diet_plan_templates").update(payload).eq("id", templateId);
        if (error) throw error;
      } else {
        const { data, error } = await supabase.from("diet_plan_templates").insert(payload).select("id").single();
        if (error) throw error;
        tmplId = data.id;
      }

      // Save meal targets
      await supabase.from("diet_plan_template_meals").delete().eq("template_id", tmplId!);
      const hasMealTargets = mealTargets.some((mt) => mt.kcal_target > 0 || mt.protein_g > 0);
      if (hasMealTargets) {
        await supabase.from("diet_plan_template_meals").insert(
          mealTargets.map((mt) => ({
            template_id: tmplId,
            meal_type: mt.meal_type,
            kcal_target: mt.kcal_target,
            protein_g: mt.protein_g,
            carbs_g: mt.carbs_g,
            fats_g: mt.fats_g,
            sugars_g: mt.sugars_g || 0,
            fiber_g: mt.fiber_g || null,
            saturated_fats_g: mt.saturated_fats_g || null,
            unsaturated_fats_g: mt.unsaturated_fats_g || null,
          }))
        );
      }

      // Save meal text suggestions for autocomplete
      const allMealTexts = weeks.flatMap((w) =>
        w.days.flatMap((d) =>
          d.meals.filter((m) => m.meal_text.trim()).map((m) => ({
            meal_type: m.meal_type,
            meal_text: m.meal_text.trim(),
          }))
        )
      );
      if (allMealTexts.length > 0) {
        await saveMealTextSuggestions(user.id, allMealTexts);
      }

      toast({ title: isEdit ? "Template aggiornato! ✅" : "Template creato! 📋" });
      navigate("/pro/templates");
    } catch (err: any) {
      toast({ variant: "destructive", title: "Errore", description: err?.message });
    }
    setSaving(false);
  };

  if (loading) {
    return (
      <div>
        <MobileHeader title="Template" />
        <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
      </div>
    );
  }

  return (
    <div>
      <MobileHeader title={isEdit ? "Modifica template" : "Nuovo template"} />
      <main className="px-4 py-5 pb-28 space-y-4">
        {/* Header card */}
        <Card className="border-0 shadow-[var(--shadow-card)]">
          <CardContent className="p-4 space-y-3">
            <Input
              placeholder="Titolo template"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="font-semibold"
            />
            <Textarea
              placeholder="Note generali (es: indicazioni, restrizioni, obiettivi...)"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="min-h-[50px] text-sm"
            />
          </CardContent>
        </Card>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="w-full grid grid-cols-3">
            <TabsTrigger value="targets" className="text-xs">🎯 Target</TabsTrigger>
            <TabsTrigger value="meals" className="text-xs">🍽️ Pasti</TabsTrigger>
            <TabsTrigger value="weekly" className="text-xs">📅 Settimane</TabsTrigger>
          </TabsList>

          {/* ─── TAB 1: Daily Targets ─── */}
          <TabsContent value="targets" className="space-y-4 mt-4">
            <Card className="border border-border">
              <CardContent className="p-4 space-y-3">
                <p className="text-xs font-semibold text-foreground">Target giornalieri</p>
                <div className="grid grid-cols-4 gap-2">
                  <div>
                    <label className="text-[10px] text-muted-foreground">Kcal</label>
                    <Input type="number" value={kcalDay} onChange={(e) => setKcalDay(e.target.value)} className="h-8 text-xs" />
                  </div>
                  <div>
                    <label className="text-[10px] text-muted-foreground">Proteine (g)</label>
                    <Input type="number" value={proteinDay} onChange={(e) => setProteinDay(e.target.value)} className="h-8 text-xs" />
                  </div>
                  <div>
                    <label className="text-[10px] text-muted-foreground">Carbo (g)</label>
                    <Input type="number" value={carbsDay} onChange={(e) => setCarbsDay(e.target.value)} className="h-8 text-xs" />
                  </div>
                  <div>
                    <label className="text-[10px] text-muted-foreground">Grassi (g)</label>
                    <Input type="number" value={fatsDay} onChange={(e) => setFatsDay(e.target.value)} className="h-8 text-xs" />
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setShowAdvanced(!showAdvanced)}
                  className="text-[11px] text-primary font-medium flex items-center gap-1"
                >
                  <ChevronRight className={`h-3 w-3 transition-transform ${showAdvanced ? "rotate-90" : ""}`} />
                  Macro avanzati
                </button>

                {showAdvanced && (
                  <div className="grid grid-cols-4 gap-2">
                    <div>
                      <label className="text-[10px] text-muted-foreground">Zuccheri (g)</label>
                      <Input type="number" value={sugarsDay} onChange={(e) => setSugarsDay(e.target.value)} className="h-8 text-xs" placeholder="—" />
                    </div>
                    <div>
                      <label className="text-[10px] text-muted-foreground">Fibre (g)</label>
                      <Input type="number" value={fiberDay} onChange={(e) => setFiberDay(e.target.value)} className="h-8 text-xs" placeholder="—" />
                    </div>
                    <div>
                      <label className="text-[10px] text-muted-foreground">Grassi sat.</label>
                      <Input type="number" value={satFatsDay} onChange={(e) => setSatFatsDay(e.target.value)} className="h-8 text-xs" placeholder="—" />
                    </div>
                    <div>
                      <label className="text-[10px] text-muted-foreground">Grassi ins.</label>
                      <Input type="number" value={unsatFatsDay} onChange={(e) => setUnsatFatsDay(e.target.value)} className="h-8 text-xs" placeholder="—" />
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ─── TAB 2: Meal Targets ─── */}
          <TabsContent value="meals" className="space-y-4 mt-4">
            {/* Summary bar */}
            <div className="flex items-center justify-between text-xs bg-card border border-border rounded-xl px-3 py-2">
              <div className="flex gap-3">
                <span className={sumKcal === targetKcal ? "text-success font-bold" : "text-destructive font-bold"}>
                  {sumKcal}/{targetKcal} kcal
                </span>
                <span className={sumProtein === targetProtein ? "text-success" : "text-muted-foreground"}>
                  P {sumProtein}/{targetProtein}
                </span>
                <span className={sumCarbs === targetCarbs ? "text-success" : "text-muted-foreground"}>
                  C {sumCarbs}/{targetCarbs}
                </span>
                <span className={sumFats === targetFats ? "text-success" : "text-muted-foreground"}>
                  G {sumFats}/{targetFats}
                </span>
              </div>
              {!allMatch && (
                <Button size="sm" variant="outline" className="h-6 text-[10px] gap-1" onClick={autoBalance}>
                  <Wand2 className="h-3 w-3" /> Bilancia
                </Button>
              )}
            </div>

            {mealTargets.map((mt, idx) => {
              const label = MEAL_TYPES_TARGETS.find((m) => m.key === mt.meal_type)?.label || mt.meal_type;
              return (
                <Card key={mt.meal_type} className="border border-border">
                  <CardContent className="p-3 space-y-2">
                    <p className="text-sm font-semibold">{label}</p>
                    <div className="grid grid-cols-4 gap-2">
                      <div>
                        <label className="text-[10px] text-muted-foreground">Kcal</label>
                        <Input type="number" value={mt.kcal_target || ""} onChange={(e) => updateMealTarget(idx, "kcal_target", e.target.value)} className="h-7 text-xs" />
                      </div>
                      <div>
                        <label className="text-[10px] text-muted-foreground">Prot</label>
                        <Input type="number" value={mt.protein_g || ""} onChange={(e) => updateMealTarget(idx, "protein_g", e.target.value)} className="h-7 text-xs" />
                      </div>
                      <div>
                        <label className="text-[10px] text-muted-foreground">Carbo</label>
                        <Input type="number" value={mt.carbs_g || ""} onChange={(e) => updateMealTarget(idx, "carbs_g", e.target.value)} className="h-7 text-xs" />
                      </div>
                      <div>
                        <label className="text-[10px] text-muted-foreground">Grassi</label>
                        <Input type="number" value={mt.fats_g || ""} onChange={(e) => updateMealTarget(idx, "fats_g", e.target.value)} className="h-7 text-xs" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </TabsContent>

          {/* ─── TAB 3: Weekly Structure ─── */}
          <TabsContent value="weekly" className="space-y-4 mt-4">
            <p className="text-xs text-muted-foreground">
              Compila i pasti giorno per giorno. Puoi copiare giorni e settimane per velocizzare.
            </p>

            {weeks.map((week, weekIdx) => (
              <Collapsible key={weekIdx} open={openWeeks[week.week_number]} onOpenChange={() => toggleWeek(week.week_number)}>
                <Card className="border border-border overflow-hidden">
                  <CollapsibleTrigger asChild>
                    <button className="w-full flex items-center justify-between p-3 hover:bg-accent/30 transition-colors">
                      <div className="flex items-center gap-2">
                        <CalendarDays className="h-4 w-4 text-primary" />
                        <span className="font-semibold text-sm">{week.week_title}</span>
                        <Badge variant="secondary" className="text-[10px]">
                          {week.days.reduce((s, d) => s + filledMeals(d), 0)} pasti
                        </Badge>
                      </div>
                      {openWeeks[week.week_number] ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                    </button>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="px-3 pb-3 space-y-3">
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
                        placeholder="Note settimana..."
                        value={week.notes}
                        onChange={(e) => updateWeekNotes(weekIdx, e.target.value)}
                        className="min-h-[36px] text-xs"
                      />

                      {week.days.map((day, dayIdx) => {
                        const dayKey = `${weekIdx}-${dayIdx}`;
                        const dayLabel = DAYS_OF_WEEK.find((d) => d.num === day.day_of_week)?.label || `Giorno ${day.day_of_week}`;
                        const filled = filledMeals(day);
                        return (
                          <Collapsible key={dayKey} open={openDays[dayKey]} onOpenChange={() => toggleDay(dayKey)}>
                            <div className="rounded-lg border border-border overflow-hidden">
                              <CollapsibleTrigger asChild>
                                <button className="w-full flex items-center justify-between px-3 py-2 hover:bg-accent/30 transition-colors">
                                  <div className="flex items-center gap-2">
                                    <span className="text-sm font-medium">{dayLabel}</span>
                                    {filled > 0 && <Badge variant="default" className="text-[9px] px-1.5">{filled}</Badge>}
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={(e) => { e.stopPropagation(); setShowCopyDay({ weekIdx, dayIdx }); }}>
                                      <ClipboardCopy className="h-3 w-3 text-muted-foreground" />
                                    </Button>
                                    {openDays[dayKey] ? <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" /> : <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />}
                                  </div>
                                </button>
                              </CollapsibleTrigger>
                              <CollapsibleContent>
                                <div className="px-3 pb-3 space-y-2 border-t border-border pt-2">
                                  {day.meals.map((meal, mealIdx) => {
                                    const mealInfo = WEEKLY_MEAL_TYPES.find((mt) => mt.key === meal.meal_type);
                                    return (
                                      <div key={mealIdx}>
                                        <label className="text-[11px] font-medium text-muted-foreground mb-0.5 flex items-center gap-1">
                                          <span>{mealInfo?.emoji}</span> {mealInfo?.label?.replace(/^[^\s]+\s/, "") || meal.meal_type}
                                        </label>
                                        <MealTextAutocomplete
                                          placeholder={meal.meal_type === "extra" ? "Note aggiuntive..." : "es: latte 100g + biscotti 50g"}
                                          value={meal.meal_text}
                                          onChange={(val) => updateMealText(weekIdx, dayIdx, mealIdx, val)}
                                          mealType={meal.meal_type}
                                          className="min-h-[32px] text-xs resize-none"
                                        />
                                      </div>
                                    );
                                  })}
                                  <div>
                                    <label className="text-[11px] font-medium text-muted-foreground mb-0.5 flex items-center gap-1">
                                      <StickyNote className="h-3 w-3" /> Note giorno
                                    </label>
                                    <Textarea
                                      placeholder="es: bere 2L acqua..."
                                      value={day.notes}
                                      onChange={(e) => updateDayNotes(weekIdx, dayIdx, e.target.value)}
                                      className="min-h-[28px] text-xs resize-none"
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

            <Button variant="outline" className="w-full gap-2" onClick={addWeek}>
              <Plus className="h-4 w-4" /> Aggiungi settimana
            </Button>
          </TabsContent>
        </Tabs>

        {/* Save button */}
        <Button className="w-full h-12 gap-2 text-base" onClick={handleSave} disabled={saving}>
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          {isEdit ? "Aggiorna template" : "Salva template"}
        </Button>
      </main>

      {/* Copy week dialog */}
      <Dialog open={showCopyWeek !== null} onOpenChange={() => setShowCopyWeek(null)}>
        <DialogContent className="max-w-xs">
          <DialogHeader><DialogTitle>Copia settimana su...</DialogTitle></DialogHeader>
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
                  {w.days.map((_, dIdx) => {
                    const isSource = showCopyDay?.weekIdx === wIdx && showCopyDay?.dayIdx === dIdx;
                    return (
                      <Button key={dIdx} size="sm" variant={isSource ? "default" : "outline"} disabled={isSource} className="text-xs" onClick={() => copyDayTo(showCopyDay!.weekIdx, showCopyDay!.dayIdx, wIdx, dIdx)}>
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

export default ProTemplateEditorPage;
