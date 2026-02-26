import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import MobileHeader from "@/components/MobileHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Wand2, ChevronRight, ChevronLeft, Check } from "lucide-react";

const MEAL_TYPES = ["colazione", "pranzo", "cena", "spuntino"] as const;
const MEAL_LABELS: Record<string, string> = {
  colazione: "☀️ Colazione",
  pranzo: "🌤️ Pranzo",
  cena: "🌙 Cena",
  spuntino: "🍎 Spuntino",
};
const DEFAULT_SPLIT = [0.25, 0.35, 0.30, 0.10];

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

  // Step 2
  const [mealTargets, setMealTargets] = useState<MealTarget[]>(
    MEAL_TYPES.map((mt, i) => ({
      meal_type: mt,
      kcal_target: Math.round(2000 * DEFAULT_SPLIT[i]),
      protein_g: Math.round(120 * DEFAULT_SPLIT[i]),
      carbs_g: Math.round(220 * DEFAULT_SPLIT[i]),
      fats_g: Math.round(70 * DEFAULT_SPLIT[i]),
    }))
  );

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

  const autoSplit = () => {
    const k = parseFloat(kcalDay) || 0;
    const p = parseFloat(proteinDay) || 0;
    const c = parseFloat(carbsDay) || 0;
    const f = parseFloat(fatsDay) || 0;
    setMealTargets(
      MEAL_TYPES.map((mt, i) => ({
        meal_type: mt,
        kcal_target: Math.round(k * DEFAULT_SPLIT[i]),
        protein_g: Math.round(p * DEFAULT_SPLIT[i]),
        carbs_g: Math.round(c * DEFAULT_SPLIT[i]),
        fats_g: Math.round(f * DEFAULT_SPLIT[i]),
      }))
    );
  };

  const updateMealTarget = (idx: number, field: keyof MealTarget, value: string) => {
    setMealTargets((prev) => prev.map((mt, i) => (i === idx ? { ...mt, [field]: parseFloat(value) || 0 } : mt)));
  };

  const handlePublish = async () => {
    if (!user || !clientId) return;
    setSaving(true);

    try {
      // Deactivate existing plan if any
      if (existingPlanId) {
        await supabase.from("diet_plans").update({ is_active: false }).eq("id", existingPlanId);
      }

      // Create new plan
      const { data: plan, error: planErr } = await supabase
        .from("diet_plans")
        .insert({
          professional_id: user.id,
          client_user_id: clientId,
          title,
          kcal_day: parseFloat(kcalDay),
          protein_g_day: parseFloat(proteinDay),
          carbs_g_day: parseFloat(carbsDay),
          fats_g_day: parseFloat(fatsDay),
          notes: notes || null,
          is_active: true,
        })
        .select()
        .single();

      if (planErr || !plan) throw planErr;

      // Insert meal targets
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

      // Update client's nutrition_targets to match
      await supabase.from("nutrition_targets").upsert({
        user_id: clientId,
        kcal_day: parseFloat(kcalDay),
        protein_g: parseFloat(proteinDay),
        carbs_g: parseFloat(carbsDay),
        fats_g: parseFloat(fatsDay),
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

  return (
    <div>
      <MobileHeader title={`Piano — ${clientName}`} />
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
              <CardTitle className="text-base">📊 Target giornalieri</CardTitle>
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

        {/* Step 2: Meal posology */}
        {step === 2 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-foreground">🍽️ Posologia per pasto</h3>
              <Button size="sm" variant="outline" className="gap-1" onClick={autoSplit}>
                <Wand2 className="h-3.5 w-3.5" /> Auto-split
              </Button>
            </div>
            {mealTargets.map((mt, idx) => (
              <Card key={mt.meal_type} className="border border-border">
                <CardContent className="py-3 space-y-2">
                  <p className="text-sm font-semibold">{MEAL_LABELS[mt.meal_type]}</p>
                  <div className="grid grid-cols-4 gap-2">
                    <div>
                      <label className="text-[10px] text-muted-foreground">Kcal</label>
                      <Input type="number" value={mt.kcal_target} onChange={(e) => updateMealTarget(idx, "kcal_target", e.target.value)} className="h-8 text-xs" />
                    </div>
                    <div>
                      <label className="text-[10px] text-muted-foreground">Prot.</label>
                      <Input type="number" value={mt.protein_g} onChange={(e) => updateMealTarget(idx, "protein_g", e.target.value)} className="h-8 text-xs" />
                    </div>
                    <div>
                      <label className="text-[10px] text-muted-foreground">Carbo</label>
                      <Input type="number" value={mt.carbs_g} onChange={(e) => updateMealTarget(idx, "carbs_g", e.target.value)} className="h-8 text-xs" />
                    </div>
                    <div>
                      <label className="text-[10px] text-muted-foreground">Grassi</label>
                      <Input type="number" value={mt.fats_g} onChange={(e) => updateMealTarget(idx, "fats_g", e.target.value)} className="h-8 text-xs" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
            {/* Summary check */}
            <div className="text-xs text-muted-foreground text-center">
              Totale pasti: {mealTargets.reduce((s, m) => s + m.kcal_target, 0)} kcal / {kcalDay} target
            </div>
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

            <Button className="w-full gap-2" onClick={handlePublish} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
              Pubblica piano
            </Button>
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
    </div>
  );
};

export default ProClientPlanPage;
