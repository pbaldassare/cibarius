import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import MobileHeader from "@/components/MobileHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Wand2, ChevronRight, ChevronLeft, Check, AlertTriangle, RefreshCw, BookmarkPlus, FolderOpen, Plus, Trash2, Search, X } from "lucide-react";
import { useDebounce } from "@/hooks/useDebounce";
import { searchFoodProgressive, FoodSearchResult, SearchPhase } from "@/lib/search-food";

const MEAL_TYPES = ["colazione", "pranzo", "cena", "spuntino"] as const;
const MEAL_LABELS: Record<string, string> = {
  colazione: "☀️ Colazione",
  pranzo: "🌤️ Pranzo",
  cena: "🌙 Cena",
  spuntino: "🍎 Spuntino",
};

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

interface PlanItem {
  id?: string;
  diet_plan_id?: string;
  meal_type: string;
  food_name: string;
  quantity: number;
  unit: string;
  calories: number;
  protein_g: number;
  carbs_g: number;
  sugars_g: number;
  fats_g: number;
  notes: string;
  sort_order: number;
}

const ProClientPlanPage = () => {
  const { clientId } = useParams<{ clientId: string }>();
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [existingPlanId, setExistingPlanId] = useState<string | null>(null);
  const [clientName, setClientName] = useState("");

  // Step 1
  const [kcalDay, setKcalDay] = useState("2000");
  const [proteinDay, setProteinDay] = useState("120");
  const [carbsDay, setCarbsDay] = useState("220");
  const [fatsDay, setFatsDay] = useState("70");
  const [sugarsDay, setSugarsDay] = useState("");
  const [fiberDay, setFiberDay] = useState("");
  const [satFatsDay, setSatFatsDay] = useState("");
  const [unsatFatsDay, setUnsatFatsDay] = useState("");
  const [showAdvancedMacros, setShowAdvancedMacros] = useState(false);
  const [fatsDay, setFatsDay] = useState("70");

  // Step 2
  const [mealTargets, setMealTargets] = useState<MealTarget[]>(
    MEAL_TYPES.map((mt) => ({
      meal_type: mt, kcal_target: 0, protein_g: 0, carbs_g: 0, fats_g: 0, sugars_g: 0,
    }))
  );

  // Plan items (foods per meal)
  const [planItems, setPlanItems] = useState<PlanItem[]>([]);
  const [addingFoodFor, setAddingFoodFor] = useState<string | null>(null);
  const [foodSearch, setFoodSearch] = useState("");
  const debouncedSearch = useDebounce(foodSearch, 300);
  const [foodResults, setFoodResults] = useState<FoodSearchResult[]>([]);
  const [searchingFood, setSearchingFood] = useState(false);
  const [searchPhase, setSearchPhase] = useState<SearchPhase>("done");

  // Balance dialog
  const [showBalanceDialog, setShowBalanceDialog] = useState(false);
  const [balanceProposal, setBalanceProposal] = useState<MealTarget[] | null>(null);

  // Template dialogs
  const [showSaveTemplate, setShowSaveTemplate] = useState(false);
  const [showLoadTemplate, setShowLoadTemplate] = useState(false);
  const [templateName, setTemplateName] = useState("");
  const [savingTemplate, setSavingTemplate] = useState(false);
  const [templates, setTemplates] = useState<any[]>([]);
  const [loadingTemplates, setLoadingTemplates] = useState(false);

  // Step 3
  const [notes, setNotes] = useState("");
  const [title, setTitle] = useState("Piano nutrizionale");

  useEffect(() => {
    if (!clientId || !user) return;
    const load = async () => {
      const [profileRes, planRes] = await Promise.all([
        supabase.from("profiles").select("full_name").eq("id", clientId).single(),
        supabase
          .from("diet_plans")
          .select("*, diet_plan_meal_targets(*)")
          .eq("professional_id", user.id)
          .eq("client_user_id", clientId)
          .eq("is_active", true)
          .maybeSingle(),
      ]);
      setClientName(profileRes.data?.full_name || "Cliente");

      if (planRes.data) {
        const p = planRes.data as any;
        setExistingPlanId(p.id);
        setKcalDay(String(p.kcal_day));
        setProteinDay(String(p.protein_g_day));
        setCarbsDay(String(p.carbs_g_day));
        setFatsDay(String(p.fats_g_day));
        setTitle(p.title || "Piano nutrizionale");
        setNotes(p.notes || "");
        if (p.diet_plan_meal_targets?.length > 0) {
          setMealTargets(
            MEAL_TYPES.map((mt) => {
              const existing = p.diet_plan_meal_targets.find((t: any) => t.meal_type === mt);
              return existing
                ? { meal_type: mt, kcal_target: existing.kcal_target, protein_g: existing.protein_g, carbs_g: existing.carbs_g, fats_g: existing.fats_g, sugars_g: existing.sugars_g ?? 0 }
                : { meal_type: mt, kcal_target: 0, protein_g: 0, carbs_g: 0, fats_g: 0, sugars_g: 0 };
            })
          );
        }

        // Load plan items
        const { data: items } = await supabase
          .from("diet_plan_items")
          .select("*")
          .eq("diet_plan_id", p.id)
          .order("sort_order");
        if (items) setPlanItems(items as any);
      }
      setLoading(false);
    };
    load();
  }, [clientId, user]);

  // Search food progressively (local + OFF + USDA)
  useEffect(() => {
    if (!debouncedSearch || debouncedSearch.length < 2) {
      setFoodResults([]);
      setSearchPhase("done");
      return;
    }
    setSearchingFood(true);
    setSearchPhase("local");
    const cancel = searchFoodProgressive(debouncedSearch, (results, phase, done) => {
      setFoodResults(results.slice(0, 20));
      setSearchPhase(phase);
      if (done) setSearchingFood(false);
    });
    return cancel;
  }, [debouncedSearch]);

  const addFoodItem = (result: FoodSearchResult, mealType: string) => {
    const qty = 100;
    const item: PlanItem = {
      meal_type: mealType,
      food_name: result.name,
      quantity: qty,
      unit: "g",
      calories: Math.round(result.calories_100g ?? 0),
      protein_g: Math.round((result.protein_100g ?? 0) * 10) / 10,
      carbs_g: Math.round((result.carbs_100g ?? 0) * 10) / 10,
      sugars_g: 0,
      fats_g: Math.round((result.fats_100g ?? 0) * 10) / 10,
      notes: result.brand ? `${result.brand}` : "",
      sort_order: planItems.filter((i) => i.meal_type === mealType).length,
    };
    setPlanItems((prev) => [...prev, item]);
    setAddingFoodFor(null);
    setFoodSearch("");
    setFoodResults([]);
  };

  const updatePlanItem = (idx: number, field: keyof PlanItem, value: any) => {
    setPlanItems((prev) => {
      const updated = [...prev];
      const item = { ...updated[idx] };
      const oldQty = item.quantity || 100;

      if (field === "quantity") {
        const newQty = parseFloat(value) || 0;
        const ratio = oldQty > 0 ? newQty / oldQty : 1;
        item.quantity = newQty;
        item.calories = Math.round(item.calories * ratio);
        item.protein_g = Math.round(item.protein_g * ratio * 10) / 10;
        item.carbs_g = Math.round(item.carbs_g * ratio * 10) / 10;
        item.sugars_g = Math.round(item.sugars_g * ratio * 10) / 10;
        item.fats_g = Math.round(item.fats_g * ratio * 10) / 10;
      } else {
        (item as any)[field] = value;
      }
      updated[idx] = item;
      return updated;
    });
  };

  const removePlanItem = (idx: number) => {
    setPlanItems((prev) => prev.filter((_, i) => i !== idx));
  };

  // Recalc meal targets from items
  const recalcMealFromItems = (mealType: string) => {
    const items = planItems.filter((i) => i.meal_type === mealType);
    if (items.length === 0) return;
    const totals = items.reduce(
      (acc, i) => ({
        kcal: acc.kcal + i.calories,
        protein: acc.protein + i.protein_g,
        carbs: acc.carbs + i.carbs_g,
        sugars: acc.sugars + i.sugars_g,
        fats: acc.fats + i.fats_g,
      }),
      { kcal: 0, protein: 0, carbs: 0, sugars: 0, fats: 0 }
    );
    setMealTargets((prev) =>
      prev.map((mt) =>
        mt.meal_type === mealType
          ? { ...mt, kcal_target: Math.round(totals.kcal), protein_g: Math.round(totals.protein), carbs_g: Math.round(totals.carbs), sugars_g: Math.round(totals.sugars), fats_g: Math.round(totals.fats) }
          : mt
      )
    );
  };

  const updateMealTarget = (idx: number, field: keyof MealTarget, value: string) => {
    setMealTargets((prev) => prev.map((mt, i) => (i === idx ? { ...mt, [field]: parseFloat(value) || 0 } : mt)));
  };

  // Computed totals
  const sumKcal = mealTargets.reduce((s, m) => s + m.kcal_target, 0);
  const sumProtein = mealTargets.reduce((s, m) => s + m.protein_g, 0);
  const sumCarbs = mealTargets.reduce((s, m) => s + m.carbs_g, 0);
  const sumFats = mealTargets.reduce((s, m) => s + m.fats_g, 0);

  const targetKcal = parseFloat(kcalDay) || 0;
  const targetProtein = parseFloat(proteinDay) || 0;
  const targetCarbs = parseFloat(carbsDay) || 0;
  const targetFats = parseFloat(fatsDay) || 0;

  const kcalMatch = sumKcal === targetKcal;
  const proteinMatch = sumProtein === targetProtein;
  const carbsMatch = sumCarbs === targetCarbs;
  const fatsMatch = sumFats === targetFats;
  const allMatch = kcalMatch && proteinMatch && carbsMatch && fatsMatch;

  const proposeBalance = () => {
    const filledIndices = mealTargets.map((mt, i) => (mt.kcal_target > 0 ? i : -1)).filter((i) => i >= 0);
    const indices = filledIndices.length > 0 ? filledIndices : mealTargets.map((_, i) => i);
    const n = indices.length;
    const diffKcal = targetKcal - sumKcal;
    const diffProtein = targetProtein - sumProtein;
    const diffCarbs = targetCarbs - sumCarbs;
    const diffFats = targetFats - sumFats;

    const proposal = mealTargets.map((mt, i) => {
      if (!indices.includes(i)) return { ...mt };
      return {
        ...mt,
        kcal_target: mt.kcal_target + Math.round(diffKcal / n),
        protein_g: mt.protein_g + Math.round(diffProtein / n),
        carbs_g: mt.carbs_g + Math.round(diffCarbs / n),
        fats_g: mt.fats_g + Math.round(diffFats / n),
      };
    });
    setBalanceProposal(proposal);
    setShowBalanceDialog(true);
  };

  const applyBalance = () => {
    if (balanceProposal) setMealTargets(balanceProposal);
    setShowBalanceDialog(false);
    setBalanceProposal(null);
  };

  // Template functions
  const handleSaveAsTemplate = async () => {
    if (!user || !templateName.trim()) return;
    setSavingTemplate(true);
    try {
      const { data: tmpl, error: tmplErr } = await supabase
        .from("diet_plan_templates")
        .insert({
          professional_id: user.id, title: templateName.trim(),
          kcal_day: targetKcal, protein_g_day: targetProtein, carbs_g_day: targetCarbs, fats_g_day: targetFats, notes: notes || null,
        })
        .select().single();
      if (tmplErr || !tmpl) throw tmplErr;
      const { error: mtErr } = await supabase.from("diet_plan_template_meals").insert(
        mealTargets.map((mt) => ({
          template_id: tmpl.id, meal_type: mt.meal_type, kcal_target: mt.kcal_target,
          protein_g: mt.protein_g, carbs_g: mt.carbs_g, fats_g: mt.fats_g, sugars_g: mt.sugars_g,
        }))
      );
      if (mtErr) throw mtErr;
      toast({ title: "Template salvato! 📋" });
      setShowSaveTemplate(false);
      setTemplateName("");
    } catch (err: any) {
      toast({ variant: "destructive", title: "Errore", description: err?.message });
    }
    setSavingTemplate(false);
  };

  const loadTemplates = async () => {
    if (!user) return;
    setLoadingTemplates(true);
    const { data } = await supabase.from("diet_plan_templates").select("*, diet_plan_template_meals(*)").eq("professional_id", user.id).order("created_at", { ascending: false });
    setTemplates(data ?? []);
    setLoadingTemplates(false);
  };

  const applyTemplate = (tmpl: any) => {
    setKcalDay(String(tmpl.kcal_day));
    setProteinDay(String(tmpl.protein_g_day));
    setCarbsDay(String(tmpl.carbs_g_day));
    setFatsDay(String(tmpl.fats_g_day));
    setTitle(tmpl.title || "Piano nutrizionale");
    setNotes(tmpl.notes || "");
    if (tmpl.diet_plan_template_meals?.length > 0) {
      setMealTargets(
        MEAL_TYPES.map((mt) => {
          const existing = tmpl.diet_plan_template_meals.find((t: any) => t.meal_type === mt);
          return existing
            ? { meal_type: mt, kcal_target: existing.kcal_target, protein_g: existing.protein_g, carbs_g: existing.carbs_g, fats_g: existing.fats_g, sugars_g: existing.sugars_g ?? 0 }
            : { meal_type: mt, kcal_target: 0, protein_g: 0, carbs_g: 0, fats_g: 0, sugars_g: 0 };
        })
      );
    }
    setShowLoadTemplate(false);
    toast({ title: "Template applicato! ✅" });
  };

  const isEditMode = !!existingPlanId;

  const savePlanItems = async (planId: string) => {
    // Delete existing items
    await supabase.from("diet_plan_items").delete().eq("diet_plan_id", planId);
    if (planItems.length > 0) {
      await supabase.from("diet_plan_items").insert(
        planItems.map((item, idx) => ({
          diet_plan_id: planId,
          meal_type: item.meal_type,
          food_name: item.food_name,
          quantity: item.quantity,
          unit: item.unit,
          calories: item.calories,
          protein_g: item.protein_g,
          carbs_g: item.carbs_g,
          sugars_g: item.sugars_g,
          fats_g: item.fats_g,
          notes: item.notes || null,
          sort_order: idx,
        }))
      );
    }
  };

  const handleUpdate = async () => {
    if (!user || !clientId || !existingPlanId) return;
    setSaving(true);
    try {
      const { error: updateErr } = await supabase.from("diet_plans").update({
        title, kcal_day: targetKcal, protein_g_day: targetProtein, carbs_g_day: targetCarbs, fats_g_day: targetFats, notes: notes || null,
      }).eq("id", existingPlanId);
      if (updateErr) throw updateErr;

      await supabase.from("diet_plan_meal_targets").delete().eq("diet_plan_id", existingPlanId);
      const { error: mtErr } = await supabase.from("diet_plan_meal_targets").insert(
        mealTargets.map((mt) => ({
          diet_plan_id: existingPlanId, meal_type: mt.meal_type, kcal_target: mt.kcal_target,
          protein_g: mt.protein_g, carbs_g: mt.carbs_g, fats_g: mt.fats_g, sugars_g: mt.sugars_g,
        }))
      );
      if (mtErr) throw mtErr;

      await savePlanItems(existingPlanId);

      await supabase.from("nutrition_targets").upsert({
        user_id: clientId, kcal_day: targetKcal, protein_g: targetProtein, carbs_g: targetCarbs, fats_g: targetFats,
      }, { onConflict: "user_id" });

      toast({ title: "Piano aggiornato! ✅" });
      navigate(`/pro/client/${clientId}`);
    } catch (err: any) {
      toast({ variant: "destructive", title: "Errore", description: err?.message || "Errore aggiornamento" });
    }
    setSaving(false);
  };

  const handlePublish = async () => {
    if (!user || !clientId) return;
    setSaving(true);
    try {
      if (existingPlanId) {
        await supabase.from("diet_plans").update({ is_active: false }).eq("id", existingPlanId);
      }
      const { data: plan, error: planErr } = await supabase.from("diet_plans").insert({
        professional_id: user.id, client_user_id: clientId, title,
        kcal_day: targetKcal, protein_g_day: targetProtein, carbs_g_day: targetCarbs, fats_g_day: targetFats,
        notes: notes || null, is_active: true,
      }).select().single();
      if (planErr || !plan) throw planErr;

      const { error: mtErr } = await supabase.from("diet_plan_meal_targets").insert(
        mealTargets.map((mt) => ({
          diet_plan_id: plan.id, meal_type: mt.meal_type, kcal_target: mt.kcal_target,
          protein_g: mt.protein_g, carbs_g: mt.carbs_g, fats_g: mt.fats_g, sugars_g: mt.sugars_g,
        }))
      );
      if (mtErr) throw mtErr;

      await savePlanItems(plan.id);

      await supabase.from("nutrition_targets").upsert({
        user_id: clientId, kcal_day: targetKcal, protein_g: targetProtein, carbs_g: targetCarbs, fats_g: targetFats,
      }, { onConflict: "user_id" });

      toast({ title: "Piano pubblicato! ✅" });
      navigate(`/pro/client/${clientId}`);
    } catch (err: any) {
      toast({ variant: "destructive", title: "Errore", description: err?.message || "Errore pubblicazione" });
    }
    setSaving(false);
  };

  if (loading) {
    return (
      <div>
        <MobileHeader title="Piano nutrizionale" />
        <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
      </div>
    );
  }

  const mismatchLine = (label: string, sum: number, target: number) => {
    const diff = sum - target;
    if (diff === 0) return null;
    return (
      <span className="text-destructive text-[10px]">
        {label}: {sum} vs {target} ({diff > 0 ? "+" : ""}{diff})
      </span>
    );
  };

  return (
    <div>
      <MobileHeader title={isEditMode ? `Modifica piano — ${clientName}` : `Piano — ${clientName}`} />
      <main className="px-4 py-5 pb-28 space-y-4">
        {/* Step indicator */}
        <div className="flex items-center justify-center gap-2">
          {[1, 2, 3, 4].map((s) => (
            <div key={s} className={`h-2 rounded-full transition-all ${s === step ? "w-8 bg-primary" : s < step ? "w-4 bg-primary/50" : "w-4 bg-muted"}`} />
          ))}
        </div>

        {/* Step 1: Daily targets */}
        {step === 1 && (
          <Card className="border-2 border-accent">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">📊 Target giornalieri</CardTitle>
                <Button size="sm" variant="ghost" className="gap-1 text-xs" onClick={() => { loadTemplates(); setShowLoadTemplate(true); }}>
                  <FolderOpen className="h-3.5 w-3.5" /> Da template
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <label className="text-xs text-muted-foreground">Kcal/giorno</label>
                <Input type="number" value={kcalDay} onChange={(e) => setKcalDay(e.target.value)} />
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="text-xs text-muted-foreground">Proteine (g)</label>
                  <Input type="number" value={proteinDay} onChange={(e) => setProteinDay(e.target.value)} />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Carbo (g)</label>
                  <Input type="number" value={carbsDay} onChange={(e) => setCarbsDay(e.target.value)} />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Grassi (g)</label>
                  <Input type="number" value={fatsDay} onChange={(e) => setFatsDay(e.target.value)} />
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 2: Meal posology + food items */}
        {step === 2 && (
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-foreground">🍽️ Posologia per pasto</h3>

            {/* Live totals bar */}
            <div className={`rounded-lg p-3 text-xs space-y-1 ${allMatch ? "bg-green-500/10 border border-green-500/20" : "bg-destructive/10 border border-destructive/20"}`}>
              <div className="flex items-center gap-2 font-semibold">
                {allMatch ? <Check className="h-3.5 w-3.5 text-green-600" /> : <AlertTriangle className="h-3.5 w-3.5 text-destructive" />}
                <span className={allMatch ? "text-green-700" : "text-destructive"}>Totale inserito</span>
              </div>
              <div className="grid grid-cols-4 gap-2 text-center">
                <div>
                  <p className="text-muted-foreground">Kcal</p>
                  <p className={`font-bold ${kcalMatch ? "" : "text-destructive"}`}>{sumKcal} / {targetKcal}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Prot</p>
                  <p className={`font-bold ${proteinMatch ? "" : "text-destructive"}`}>{sumProtein} / {targetProtein}g</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Carbo</p>
                  <p className={`font-bold ${carbsMatch ? "" : "text-destructive"}`}>{sumCarbs} / {targetCarbs}g</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Grassi</p>
                  <p className={`font-bold ${fatsMatch ? "" : "text-destructive"}`}>{sumFats} / {targetFats}g</p>
                </div>
              </div>
            </div>

            {/* Meal cards with food items */}
            {mealTargets.map((mt, idx) => {
              const mealItems = planItems.filter((i) => i.meal_type === mt.meal_type);
              const itemsKcal = mealItems.reduce((s, i) => s + i.calories, 0);

              return (
                <Card key={mt.meal_type} className="border border-border">
                  <CardContent className="py-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-semibold">{MEAL_LABELS[mt.meal_type]}</p>
                      {mealItems.length > 0 && (
                        <span className="text-[10px] text-muted-foreground">{itemsKcal} kcal dagli alimenti</span>
                      )}
                    </div>

                    {/* Macro targets */}
                    <div className="grid grid-cols-4 gap-2">
                      <div>
                        <label className="text-[10px] text-muted-foreground">Kcal</label>
                        <Input type="number" value={mt.kcal_target || ""} onChange={(e) => updateMealTarget(idx, "kcal_target", e.target.value)} className="h-8 text-xs" placeholder="0" />
                      </div>
                      <div>
                        <label className="text-[10px] text-muted-foreground">Prot.</label>
                        <Input type="number" value={mt.protein_g || ""} onChange={(e) => updateMealTarget(idx, "protein_g", e.target.value)} className="h-8 text-xs" placeholder="0" />
                      </div>
                      <div>
                        <label className="text-[10px] text-muted-foreground">Carbo</label>
                        <Input type="number" value={mt.carbs_g || ""} onChange={(e) => updateMealTarget(idx, "carbs_g", e.target.value)} className="h-8 text-xs" placeholder="0" />
                      </div>
                      <div>
                        <label className="text-[10px] text-muted-foreground">Grassi</label>
                        <Input type="number" value={mt.fats_g || ""} onChange={(e) => updateMealTarget(idx, "fats_g", e.target.value)} className="h-8 text-xs" placeholder="0" />
                      </div>
                    </div>

                    {/* Food items list */}
                    {mealItems.length > 0 && (
                      <div className="space-y-1 border-t border-border pt-2">
                        {mealItems.map((item, itemIdx) => {
                          const globalIdx = planItems.indexOf(item);
                          return (
                            <div key={itemIdx} className="flex items-center gap-2 rounded-lg bg-secondary/50 p-2">
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-medium text-foreground truncate">{item.food_name}</p>
                                <div className="flex items-center gap-1">
                                  <Input
                                    type="number"
                                    value={item.quantity}
                                    onChange={(e) => updatePlanItem(globalIdx, "quantity", e.target.value)}
                                    className="h-6 w-16 text-[10px] px-1"
                                  />
                                  <span className="text-[10px] text-muted-foreground">{item.unit}</span>
                                  <span className="text-[10px] text-muted-foreground ml-1">{item.calories} kcal</span>
                                </div>
                                <p className="text-[9px] text-muted-foreground">
                                  P:{item.protein_g}g C:{item.carbs_g}g {item.sugars_g > 0 ? `(Z:${item.sugars_g}g) ` : ""}G:{item.fats_g}g
                                </p>
                              </div>
                              <button onClick={() => removePlanItem(globalIdx)} className="p-1 text-muted-foreground hover:text-destructive">
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          );
                        })}
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-6 text-[10px] text-primary gap-1"
                          onClick={() => recalcMealFromItems(mt.meal_type)}
                        >
                          <RefreshCw className="h-3 w-3" /> Ricalcola macro da alimenti
                        </Button>
                      </div>
                    )}

                    {/* Add food button */}
                    {addingFoodFor === mt.meal_type ? (
                      <div className="space-y-2 border-t border-border pt-2">
                        <div className="relative">
                          <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                          <Input
                            placeholder="Cerca alimento..."
                            value={foodSearch}
                            onChange={(e) => setFoodSearch(e.target.value)}
                            className="h-8 text-xs pl-7 pr-7"
                            autoFocus
                          />
                          <button onClick={() => { setAddingFoodFor(null); setFoodSearch(""); setFoodResults([]); }} className="absolute right-2 top-1/2 -translate-y-1/2">
                            <X className="h-3.5 w-3.5 text-muted-foreground" />
                          </button>
                        </div>
                        {searchingFood && (
                          <p className="text-[10px] text-muted-foreground">
                            {searchPhase === "local" ? "Ricerca locale..." : searchPhase === "off" ? "Ricerca OpenFoodFacts..." : searchPhase === "usda" ? "Ricerca USDA..." : "Ricerca..."}
                          </p>
                        )}
                        {foodResults.length > 0 && (
                          <div className="max-h-40 overflow-y-auto space-y-1">
                            {foodResults.map((f, idx) => (
                              <button
                                key={`${f.name}-${f.source}-${idx}`}
                                onClick={() => addFoodItem(f, mt.meal_type)}
                                className="w-full text-left rounded-lg bg-secondary/30 hover:bg-secondary p-2 text-xs transition-colors"
                              >
                                <div className="flex items-center gap-1.5">
                                  <p className="font-medium text-foreground flex-1 truncate">{f.name}</p>
                                  <span className={`shrink-0 text-[9px] px-1.5 py-0.5 rounded-full font-medium ${
                                    f.source === "local" ? "bg-primary/15 text-primary" : f.source === "off" ? "bg-accent/20 text-accent-foreground" : "bg-muted text-muted-foreground"
                                  }`}>
                                    {f.source === "local" ? "DB" : f.source === "off" ? "OFF" : "USDA"}
                                  </span>
                                </div>
                                <p className="text-[10px] text-muted-foreground">
                                  {f.calories_100g ?? 0} kcal/100g · P:{f.protein_100g ?? 0} C:{f.carbs_100g ?? 0} G:{f.fats_100g ?? 0}
                                  {f.brand ? ` · ${f.brand}` : ""}
                                </p>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    ) : (
                      <button
                        onClick={() => setAddingFoodFor(mt.meal_type)}
                        className="flex items-center gap-1 text-xs font-medium text-primary pt-1"
                      >
                        <Plus size={14} /> Aggiungi alimento
                      </button>
                    )}
                  </CardContent>
                </Card>
              );
            })}

            {!allMatch && (
              <Button size="sm" variant="outline" className="w-full gap-2" onClick={proposeBalance}>
                <Wand2 className="h-3.5 w-3.5" /> Bilancia automaticamente
              </Button>
            )}
          </div>
        )}

        {/* Step 3: Notes */}
        {step === 3 && (
          <Card className="border-2 border-accent">
            <CardHeader><CardTitle className="text-base">📝 Note e regole</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div>
                <label className="text-xs text-muted-foreground">Titolo piano</label>
                <Input value={title} onChange={(e) => setTitle(e.target.value)} />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Note / preferenze / allergeni</label>
                <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={5} placeholder="Es: evitare lattosio, preferire proteine vegetali al mattino..." />
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 4: Review & Publish */}
        {step === 4 && (
          <div className="space-y-3">
            {!allMatch && (
              <div className="flex items-start gap-2 rounded-lg bg-amber-500/10 border border-amber-500/20 p-3">
                <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                <div className="text-xs space-y-0.5">
                  <p className="font-semibold text-amber-700">I macro per pasto non sommano ai target giornalieri</p>
                  <div className="flex flex-wrap gap-x-3">
                    {mismatchLine("Kcal", sumKcal, targetKcal)}
                    {mismatchLine("Prot", sumProtein, targetProtein)}
                    {mismatchLine("Carbo", sumCarbs, targetCarbs)}
                    {mismatchLine("Grassi", sumFats, targetFats)}
                  </div>
                </div>
              </div>
            )}

            <Card className="border-2 border-primary/30">
              <CardHeader><CardTitle className="text-base">🚀 Riepilogo piano</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm font-medium">{title}</p>
                <div className="grid grid-cols-4 gap-2 text-center">
                  <div className="rounded-lg bg-primary/10 p-2">
                    <p className="text-lg font-bold text-primary">{kcalDay}</p>
                    <p className="text-[10px] text-muted-foreground">kcal</p>
                  </div>
                  <div className="rounded-lg bg-blue-500/10 p-2">
                    <p className="text-lg font-bold text-blue-600">{proteinDay}g</p>
                    <p className="text-[10px] text-muted-foreground">proteine</p>
                  </div>
                  <div className="rounded-lg bg-amber-500/10 p-2">
                    <p className="text-lg font-bold text-amber-600">{carbsDay}g</p>
                    <p className="text-[10px] text-muted-foreground">carbo</p>
                  </div>
                  <div className="rounded-lg bg-red-500/10 p-2">
                    <p className="text-lg font-bold text-red-600">{fatsDay}g</p>
                    <p className="text-[10px] text-muted-foreground">grassi</p>
                  </div>
                </div>

                {/* Meal summaries with items */}
                <div className="space-y-2">
                  {mealTargets.map((mt) => {
                    const items = planItems.filter((i) => i.meal_type === mt.meal_type);
                    return (
                      <div key={mt.meal_type} className="bg-secondary/50 rounded-lg px-3 py-2">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-medium">{MEAL_LABELS[mt.meal_type]}</span>
                          <span className="text-muted-foreground">{mt.kcal_target} kcal · P{mt.protein_g} C{mt.carbs_g} G{mt.fats_g}</span>
                        </div>
                        {items.length > 0 && (
                          <div className="mt-1.5 space-y-0.5">
                            {items.map((item, i) => (
                              <p key={i} className="text-[10px] text-muted-foreground">
                                • {item.food_name} — {item.quantity}{item.unit} ({item.calories} kcal)
                              </p>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {notes && (
                  <div className="rounded-lg bg-muted p-3">
                    <p className="text-xs text-muted-foreground">Note:</p>
                    <p className="text-sm text-foreground">{notes}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            <div className="flex gap-2">
              <Button className="flex-1 gap-2" onClick={isEditMode ? handleUpdate : handlePublish} disabled={saving}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                {isEditMode ? "Salva modifiche" : "Pubblica piano"}
              </Button>
              <Button variant="outline" className="gap-1" onClick={() => { setTemplateName(title); setShowSaveTemplate(true); }}>
                <BookmarkPlus className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {/* Navigation */}
        <div className="flex gap-2">
          {step > 1 && (
            <Button variant="outline" className="flex-1 gap-1" onClick={() => setStep(step - 1)}>
              <ChevronLeft className="h-4 w-4" /> Indietro
            </Button>
          )}
          {step < 4 && (
            <Button className="flex-1 gap-1" onClick={() => setStep(step + 1)}>
              Avanti <ChevronRight className="h-4 w-4" />
            </Button>
          )}
        </div>
      </main>

      {/* Balance proposal dialog */}
      <Dialog open={showBalanceDialog} onOpenChange={setShowBalanceDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Proposta di bilanciamento</DialogTitle></DialogHeader>
          <p className="text-xs text-muted-foreground mb-3">Correzione minima per allineare i totali ai target giornalieri.</p>
          {balanceProposal && (
            <div className="space-y-2">
              {balanceProposal.map((mt, idx) => {
                const orig = mealTargets[idx];
                const changed = mt.kcal_target !== orig.kcal_target || mt.protein_g !== orig.protein_g || mt.carbs_g !== orig.carbs_g || mt.fats_g !== orig.fats_g;
                return (
                  <div key={mt.meal_type} className={`rounded-lg p-2.5 text-xs ${changed ? "bg-primary/5 border border-primary/20" : "bg-secondary/50"}`}>
                    <p className="font-semibold mb-1">{MEAL_LABELS[mt.meal_type]}</p>
                    <div className="grid grid-cols-4 gap-1 text-center">
                      <div><p className="text-muted-foreground">Kcal</p><p className="font-bold">{mt.kcal_target}</p></div>
                      <div><p className="text-muted-foreground">P</p><p className="font-bold">{mt.protein_g}</p></div>
                      <div><p className="text-muted-foreground">C</p><p className="font-bold">{mt.carbs_g}</p></div>
                      <div><p className="text-muted-foreground">G</p><p className="font-bold">{mt.fats_g}</p></div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowBalanceDialog(false)}>Annulla</Button>
            <Button onClick={applyBalance}>Applica correzione</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Save as template dialog */}
      <Dialog open={showSaveTemplate} onOpenChange={setShowSaveTemplate}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Salva come template</DialogTitle></DialogHeader>
          <div>
            <label className="text-xs text-muted-foreground">Nome template</label>
            <Input value={templateName} onChange={(e) => setTemplateName(e.target.value)} placeholder="Es: Dimagrimento 1500 kcal" />
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowSaveTemplate(false)}>Annulla</Button>
            <Button onClick={handleSaveAsTemplate} disabled={savingTemplate || !templateName.trim()}>
              {savingTemplate ? <Loader2 className="h-4 w-4 animate-spin" /> : <BookmarkPlus className="h-4 w-4 mr-1" />}
              Salva
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Load from template dialog */}
      <Dialog open={showLoadTemplate} onOpenChange={setShowLoadTemplate}>
        <DialogContent className="max-w-sm max-h-[80vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Carica da template</DialogTitle></DialogHeader>
          {loadingTemplates ? (
            <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
          ) : templates.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">Nessun template salvato.</p>
          ) : (
            <div className="space-y-2">
              {templates.map((tmpl) => (
                <button key={tmpl.id} onClick={() => applyTemplate(tmpl)} className="w-full text-left rounded-lg border border-border p-3 hover:border-primary/40 hover:bg-primary/5 transition-colors">
                  <p className="text-sm font-semibold text-foreground">{tmpl.title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{tmpl.kcal_day} kcal · P{tmpl.protein_g_day}g · C{tmpl.carbs_g_day}g · G{tmpl.fats_g_day}g</p>
                </button>
              ))}
            </div>
          )}
          <DialogFooter><Button variant="outline" onClick={() => setShowLoadTemplate(false)}>Chiudi</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ProClientPlanPage;
