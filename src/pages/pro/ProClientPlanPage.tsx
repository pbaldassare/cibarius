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
import { Loader2, Wand2, ChevronRight, ChevronLeft, Check, AlertTriangle, RefreshCw, BookmarkPlus, FolderOpen } from "lucide-react";

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

  // Step 2 — all zeros by default, nutrizionista fills in
  const [mealTargets, setMealTargets] = useState<MealTarget[]>(
    MEAL_TYPES.map((mt) => ({
      meal_type: mt,
      kcal_target: 0,
      protein_g: 0,
      carbs_g: 0,
      fats_g: 0,
    }))
  );

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
                ? { meal_type: mt, kcal_target: existing.kcal_target, protein_g: existing.protein_g, carbs_g: existing.carbs_g, fats_g: existing.fats_g }
                : { meal_type: mt, kcal_target: 0, protein_g: 0, carbs_g: 0, fats_g: 0 };
            })
          );
        }
      }
      setLoading(false);
    };
    load();
  }, [clientId, user]);

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

  // "Bilancia automaticamente" — minimal correction proposal
  const proposeBalance = () => {
    // Distribute the difference evenly across meals that have values > 0
    // If all are 0, distribute evenly across all 4
    const filledIndices = mealTargets
      .map((mt, i) => (mt.kcal_target > 0 ? i : -1))
      .filter((i) => i >= 0);
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
    if (balanceProposal) {
      setMealTargets(balanceProposal);
    }
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
          professional_id: user.id,
          title: templateName.trim(),
          kcal_day: targetKcal,
          protein_g_day: targetProtein,
          carbs_g_day: targetCarbs,
          fats_g_day: targetFats,
          notes: notes || null,
        })
        .select()
        .single();
      if (tmplErr || !tmpl) throw tmplErr;

      const { error: mtErr } = await supabase.from("diet_plan_template_meals").insert(
        mealTargets.map((mt) => ({
          template_id: tmpl.id,
          meal_type: mt.meal_type,
          kcal_target: mt.kcal_target,
          protein_g: mt.protein_g,
          carbs_g: mt.carbs_g,
          fats_g: mt.fats_g,
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
    const { data } = await supabase
      .from("diet_plan_templates")
      .select("*, diet_plan_template_meals(*)")
      .eq("professional_id", user.id)
      .order("created_at", { ascending: false });
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
            ? { meal_type: mt, kcal_target: existing.kcal_target, protein_g: existing.protein_g, carbs_g: existing.carbs_g, fats_g: existing.fats_g }
            : { meal_type: mt, kcal_target: 0, protein_g: 0, carbs_g: 0, fats_g: 0 };
        })
      );
    }
    setShowLoadTemplate(false);
    toast({ title: "Template applicato! ✅" });
  };

  const isEditMode = !!existingPlanId;

  const handleUpdate = async () => {
    if (!user || !clientId || !existingPlanId) return;
    setSaving(true);
    try {
      const { error: updateErr } = await supabase
        .from("diet_plans")
        .update({
          title,
          kcal_day: targetKcal,
          protein_g_day: targetProtein,
          carbs_g_day: targetCarbs,
          fats_g_day: targetFats,
          notes: notes || null,
        })
        .eq("id", existingPlanId);
      if (updateErr) throw updateErr;

      const { error: delErr } = await supabase
        .from("diet_plan_meal_targets")
        .delete()
        .eq("diet_plan_id", existingPlanId);
      if (delErr) throw delErr;

      const { error: mtErr } = await supabase.from("diet_plan_meal_targets").insert(
        mealTargets.map((mt) => ({
          diet_plan_id: existingPlanId,
          meal_type: mt.meal_type,
          kcal_target: mt.kcal_target,
          protein_g: mt.protein_g,
          carbs_g: mt.carbs_g,
          fats_g: mt.fats_g,
        }))
      );
      if (mtErr) throw mtErr;

      await supabase.from("nutrition_targets").upsert({
        user_id: clientId,
        kcal_day: targetKcal,
        protein_g: targetProtein,
        carbs_g: targetCarbs,
        fats_g: targetFats,
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

      const { data: plan, error: planErr } = await supabase
        .from("diet_plans")
        .insert({
          professional_id: user.id,
          client_user_id: clientId,
          title,
          kcal_day: targetKcal,
          protein_g_day: targetProtein,
          carbs_g_day: targetCarbs,
          fats_g_day: targetFats,
          notes: notes || null,
          is_active: true,
        })
        .select()
        .single();

      if (planErr || !plan) throw planErr;

      const { error: mtErr } = await supabase.from("diet_plan_meal_targets").insert(
        mealTargets.map((mt) => ({
          diet_plan_id: plan.id,
          meal_type: mt.meal_type,
          kcal_target: mt.kcal_target,
          protein_g: mt.protein_g,
          carbs_g: mt.carbs_g,
          fats_g: mt.fats_g,
        }))
      );

      if (mtErr) throw mtErr;

      await supabase.from("nutrition_targets").upsert({
        user_id: clientId,
        kcal_day: targetKcal,
        protein_g: targetProtein,
        carbs_g: targetCarbs,
        fats_g: targetFats,
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

  // Mismatch summary line helper
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
            <div
              key={s}
              className={`h-2 rounded-full transition-all ${s === step ? "w-8 bg-primary" : s < step ? "w-4 bg-primary/50" : "w-4 bg-muted"}`}
            />
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

        {/* Step 2: Meal posology — fully manual */}
        {step === 2 && (
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-foreground">🍽️ Posologia per pasto</h3>

            {/* Live totals bar */}
            <div className={`rounded-lg p-3 text-xs space-y-1 ${allMatch ? "bg-green-500/10 border border-green-500/20" : "bg-destructive/10 border border-destructive/20"}`}>
              <div className="flex items-center gap-2 font-semibold">
                {allMatch ? <Check className="h-3.5 w-3.5 text-green-600" /> : <AlertTriangle className="h-3.5 w-3.5 text-destructive" />}
                <span className={allMatch ? "text-green-700" : "text-destructive"}>
                  Totale inserito
                </span>
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

            {/* Meal cards */}
            {mealTargets.map((mt, idx) => (
              <Card key={mt.meal_type} className="border border-border">
                <CardContent className="py-3 space-y-2">
                  <p className="text-sm font-semibold">{MEAL_LABELS[mt.meal_type]}</p>
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
                </CardContent>
              </Card>
            ))}

            {/* Action buttons */}
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
            <CardHeader>
              <CardTitle className="text-base">📝 Note e regole</CardTitle>
            </CardHeader>
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
            {/* Mismatch warning */}
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
                  <p className="text-muted-foreground">Puoi comunque pubblicare. Il nutrizionista decide.</p>
                </div>
              </div>
            )}

            <Card className="border-2 border-primary/30">
              <CardHeader>
                <CardTitle className="text-base">🚀 Riepilogo piano</CardTitle>
              </CardHeader>
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

                <div className="space-y-1.5">
                  {mealTargets.map((mt) => (
                    <div key={mt.meal_type} className="flex items-center justify-between text-xs bg-secondary/50 rounded-lg px-3 py-2">
                      <span className="font-medium">{MEAL_LABELS[mt.meal_type]}</span>
                      <span className="text-muted-foreground">{mt.kcal_target} kcal · P{mt.protein_g} C{mt.carbs_g} G{mt.fats_g}</span>
                    </div>
                  ))}
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
          <DialogHeader>
            <DialogTitle>Proposta di bilanciamento</DialogTitle>
          </DialogHeader>
          <p className="text-xs text-muted-foreground mb-3">
            Correzione minima per allineare i totali ai target giornalieri. Controlla e conferma.
          </p>
          {balanceProposal && (
            <div className="space-y-2">
              {balanceProposal.map((mt, idx) => {
                const orig = mealTargets[idx];
                const changed = mt.kcal_target !== orig.kcal_target || mt.protein_g !== orig.protein_g || mt.carbs_g !== orig.carbs_g || mt.fats_g !== orig.fats_g;
                return (
                  <div key={mt.meal_type} className={`rounded-lg p-2.5 text-xs ${changed ? "bg-primary/5 border border-primary/20" : "bg-secondary/50"}`}>
                    <p className="font-semibold mb-1">{MEAL_LABELS[mt.meal_type]}</p>
                    <div className="grid grid-cols-4 gap-1 text-center">
                      <div>
                        <p className="text-muted-foreground">Kcal</p>
                        <p className="font-bold">{mt.kcal_target}</p>
                        {mt.kcal_target !== orig.kcal_target && <p className="text-[9px] text-muted-foreground">era {orig.kcal_target}</p>}
                      </div>
                      <div>
                        <p className="text-muted-foreground">P</p>
                        <p className="font-bold">{mt.protein_g}</p>
                        {mt.protein_g !== orig.protein_g && <p className="text-[9px] text-muted-foreground">era {orig.protein_g}</p>}
                      </div>
                      <div>
                        <p className="text-muted-foreground">C</p>
                        <p className="font-bold">{mt.carbs_g}</p>
                        {mt.carbs_g !== orig.carbs_g && <p className="text-[9px] text-muted-foreground">era {orig.carbs_g}</p>}
                      </div>
                      <div>
                        <p className="text-muted-foreground">G</p>
                        <p className="font-bold">{mt.fats_g}</p>
                        {mt.fats_g !== orig.fats_g && <p className="text-[9px] text-muted-foreground">era {orig.fats_g}</p>}
                      </div>
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
          <DialogHeader>
            <DialogTitle>Salva come template</DialogTitle>
          </DialogHeader>
          <p className="text-xs text-muted-foreground">
            Salva questo piano come template riutilizzabile per altri clienti.
          </p>
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
          <DialogHeader>
            <DialogTitle>Carica da template</DialogTitle>
          </DialogHeader>
          {loadingTemplates ? (
            <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
          ) : templates.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">Nessun template salvato. Crea un piano e salvalo come template dallo step 4.</p>
          ) : (
            <div className="space-y-2">
              {templates.map((tmpl) => (
                <button
                  key={tmpl.id}
                  onClick={() => applyTemplate(tmpl)}
                  className="w-full text-left rounded-lg border border-border p-3 hover:border-primary/40 hover:bg-primary/5 transition-colors"
                >
                  <p className="text-sm font-semibold text-foreground">{tmpl.title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {tmpl.kcal_day} kcal · P{tmpl.protein_g_day}g · C{tmpl.carbs_g_day}g · G{tmpl.fats_g_day}g
                  </p>
                  {tmpl.diet_plan_template_meals?.length > 0 && (
                    <div className="flex gap-2 mt-1 flex-wrap">
                      {tmpl.diet_plan_template_meals.map((mt: any) => (
                        <span key={mt.meal_type} className="text-[10px] text-muted-foreground bg-secondary rounded px-1.5 py-0.5">
                          {MEAL_LABELS[mt.meal_type]?.split(" ")[0]} {mt.kcal_target}kcal
                        </span>
                      ))}
                    </div>
                  )}
                </button>
              ))}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowLoadTemplate(false)}>Chiudi</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ProClientPlanPage;
