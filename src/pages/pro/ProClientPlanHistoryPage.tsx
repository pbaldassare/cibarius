import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import MobileHeader from "@/components/MobileHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Loader2, RotateCcw, GitCompareArrows, Check } from "lucide-react";

const MEAL_LABELS: Record<string, string> = {
  colazione: "☀️ Colazione",
  pranzo: "🌤️ Pranzo",
  cena: "🌙 Cena",
  spuntino: "🍎 Spuntino",
};

interface PlanWithTargets {
  id: string;
  title: string;
  kcal_day: number;
  protein_g_day: number;
  carbs_g_day: number;
  fats_g_day: number;
  notes: string | null;
  is_active: boolean;
  start_date: string;
  created_at: string;
  diet_plan_meal_targets: {
    meal_type: string;
    kcal_target: number;
    protein_g: number;
    carbs_g: number;
    fats_g: number;
  }[];
}

const ProClientPlanHistoryPage = () => {
  const { clientId } = useParams<{ clientId: string }>();
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [plans, setPlans] = useState<PlanWithTargets[]>([]);
  const [clientName, setClientName] = useState("");
  const [loading, setLoading] = useState(true);
  const [reactivating, setReactivating] = useState(false);

  // Compare mode
  const [compareIds, setCompareIds] = useState<string[]>([]);
  const [showCompare, setShowCompare] = useState(false);

  // Reactivate confirm
  const [reactivateId, setReactivateId] = useState<string | null>(null);

  const load = async () => {
    if (!clientId || !user) return;
    setLoading(true);
    const [profileRes, plansRes] = await Promise.all([
      supabase.from("profiles").select("full_name").eq("id", clientId).single(),
      supabase
        .from("diet_plans")
        .select("*, diet_plan_meal_targets(*)")
        .eq("professional_id", user.id)
        .eq("client_user_id", clientId)
        .order("created_at", { ascending: false }),
    ]);
    setClientName(profileRes.data?.full_name || "Cliente");
    setPlans((plansRes.data as any) ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, [clientId, user]);

  const toggleCompare = (planId: string) => {
    setCompareIds((prev) => {
      if (prev.includes(planId)) return prev.filter((id) => id !== planId);
      if (prev.length >= 2) return [prev[1], planId];
      return [...prev, planId];
    });
  };

  const handleReactivate = async () => {
    if (!reactivateId || !clientId || !user) return;
    setReactivating(true);
    try {
      // Deactivate all active plans
      await supabase
        .from("diet_plans")
        .update({ is_active: false })
        .eq("professional_id", user.id)
        .eq("client_user_id", clientId)
        .eq("is_active", true);

      // Reactivate chosen plan
      const { error } = await supabase
        .from("diet_plans")
        .update({ is_active: true })
        .eq("id", reactivateId);
      if (error) throw error;

      // Sync nutrition_targets from reactivated plan
      const plan = plans.find((p) => p.id === reactivateId);
      if (plan) {
        await supabase.from("nutrition_targets").upsert({
          user_id: clientId,
          kcal_day: plan.kcal_day,
          protein_g: plan.protein_g_day,
          carbs_g: plan.carbs_g_day,
          fats_g: plan.fats_g_day,
        }, { onConflict: "user_id" });
      }

      toast({ title: "Piano riattivato! ✅" });
      setReactivateId(null);
      await load();
    } catch (err: any) {
      toast({ variant: "destructive", title: "Errore", description: err?.message });
    }
    setReactivating(false);
  };

  const comparePlans = compareIds.length === 2
    ? [plans.find((p) => p.id === compareIds[0])!, plans.find((p) => p.id === compareIds[1])!]
    : null;

  if (loading) {
    return (
      <div>
        <MobileHeader title="Storico piani" />
        <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
      </div>
    );
  }

  return (
    <div>
      <MobileHeader title={`Storico — ${clientName}`} />
      <main className="px-4 py-5 pb-28 space-y-4">

        {/* Compare button */}
        {compareIds.length === 2 && (
          <Button className="w-full gap-2" onClick={() => setShowCompare(true)}>
            <GitCompareArrows className="h-4 w-4" /> Confronta i 2 piani selezionati
          </Button>
        )}
        {compareIds.length > 0 && compareIds.length < 2 && (
          <p className="text-xs text-muted-foreground text-center">Seleziona un altro piano per confrontare</p>
        )}

        {plans.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">Nessun piano creato per questo cliente.</p>
        ) : (
          plans.map((plan) => (
            <Card key={plan.id} className={`border-2 ${plan.is_active ? "border-primary/40" : "border-border"} ${compareIds.includes(plan.id) ? "ring-2 ring-primary/30" : ""}`}>
              <CardContent className="py-4 space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-foreground">{plan.title}</p>
                      {plan.is_active && <Badge variant="default" className="text-[10px]">Attivo</Badge>}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {new Date(plan.created_at).toLocaleDateString("it-IT", { day: "numeric", month: "long", year: "numeric" })}
                    </p>
                  </div>
                </div>

                {/* Macro summary */}
                <div className="grid grid-cols-4 gap-2 text-center">
                  <div className="rounded-lg bg-primary/10 p-1.5">
                    <p className="text-sm font-bold text-primary">{plan.kcal_day}</p>
                    <p className="text-[9px] text-muted-foreground">kcal</p>
                  </div>
                  <div className="rounded-lg bg-blue-500/10 p-1.5">
                    <p className="text-sm font-bold text-blue-600">{plan.protein_g_day}g</p>
                    <p className="text-[9px] text-muted-foreground">prot</p>
                  </div>
                  <div className="rounded-lg bg-amber-500/10 p-1.5">
                    <p className="text-sm font-bold text-amber-600">{plan.carbs_g_day}g</p>
                    <p className="text-[9px] text-muted-foreground">carbo</p>
                  </div>
                  <div className="rounded-lg bg-red-500/10 p-1.5">
                    <p className="text-sm font-bold text-red-600">{plan.fats_g_day}g</p>
                    <p className="text-[9px] text-muted-foreground">grassi</p>
                  </div>
                </div>

                {/* Meal targets */}
                {plan.diet_plan_meal_targets?.length > 0 && (
                  <div className="space-y-1">
                    {plan.diet_plan_meal_targets.map((mt) => (
                      <div key={mt.meal_type} className="flex items-center justify-between text-xs bg-secondary/50 rounded-lg px-3 py-1.5">
                        <span className="font-medium">{MEAL_LABELS[mt.meal_type] || mt.meal_type}</span>
                        <span className="text-muted-foreground">{mt.kcal_target} kcal · P{mt.protein_g} C{mt.carbs_g} G{mt.fats_g}</span>
                      </div>
                    ))}
                  </div>
                )}

                {plan.notes && (
                  <p className="text-xs text-muted-foreground bg-muted rounded-lg p-2">{plan.notes}</p>
                )}

                {/* Actions */}
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant={compareIds.includes(plan.id) ? "default" : "outline"}
                    className="flex-1 gap-1 text-xs"
                    onClick={() => toggleCompare(plan.id)}
                  >
                    <GitCompareArrows className="h-3.5 w-3.5" />
                    {compareIds.includes(plan.id) ? "Selezionato" : "Confronta"}
                  </Button>
                  {!plan.is_active && (
                    <Button size="sm" variant="outline" className="flex-1 gap-1 text-xs" onClick={() => setReactivateId(plan.id)}>
                      <RotateCcw className="h-3.5 w-3.5" /> Riattiva
                    </Button>
                  )}
                  {plan.is_active && (
                    <Button size="sm" variant="outline" className="flex-1 gap-1 text-xs" onClick={() => navigate(`/pro/client/${clientId}/plan`)}>
                      <Check className="h-3.5 w-3.5" /> Modifica
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </main>

      {/* Compare dialog */}
      <Dialog open={showCompare} onOpenChange={setShowCompare}>
        <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Confronto piani</DialogTitle>
          </DialogHeader>
          {comparePlans && (
            <div className="space-y-4">
              {/* Headers */}
              <div className="grid grid-cols-3 gap-2 text-xs font-semibold">
                <div />
                <div className="text-center p-2 rounded-lg bg-primary/5 border border-primary/20">
                  <p className="truncate">{comparePlans[0].title}</p>
                  <p className="text-muted-foreground font-normal">{new Date(comparePlans[0].created_at).toLocaleDateString("it-IT", { day: "numeric", month: "short" })}</p>
                  {comparePlans[0].is_active && <Badge variant="default" className="text-[9px] mt-1">Attivo</Badge>}
                </div>
                <div className="text-center p-2 rounded-lg bg-secondary border border-border">
                  <p className="truncate">{comparePlans[1].title}</p>
                  <p className="text-muted-foreground font-normal">{new Date(comparePlans[1].created_at).toLocaleDateString("it-IT", { day: "numeric", month: "short" })}</p>
                  {comparePlans[1].is_active && <Badge variant="default" className="text-[9px] mt-1">Attivo</Badge>}
                </div>
              </div>

              {/* Macro comparison */}
              {[
                { label: "Kcal", key: "kcal_day" },
                { label: "Proteine", key: "protein_g_day" },
                { label: "Carbo", key: "carbs_g_day" },
                { label: "Grassi", key: "fats_g_day" },
              ].map(({ label, key }) => {
                const v1 = (comparePlans[0] as any)[key];
                const v2 = (comparePlans[1] as any)[key];
                const diff = v2 - v1;
                return (
                  <div key={key} className="grid grid-cols-3 gap-2 text-xs items-center">
                    <span className="font-medium text-foreground">{label}</span>
                    <span className="text-center font-semibold">{v1}{key !== "kcal_day" && "g"}</span>
                    <div className="text-center">
                      <span className="font-semibold">{v2}{key !== "kcal_day" && "g"}</span>
                      {diff !== 0 && (
                        <span className={`ml-1 text-[10px] ${diff > 0 ? "text-green-600" : "text-destructive"}`}>
                          ({diff > 0 ? "+" : ""}{diff})
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}

              {/* Meal-level comparison */}
              <div className="border-t pt-3 space-y-2">
                <p className="text-xs font-semibold text-foreground">Per pasto</p>
                {["colazione", "pranzo", "cena", "spuntino"].map((mealType) => {
                  const mt1 = comparePlans[0].diet_plan_meal_targets?.find((t) => t.meal_type === mealType);
                  const mt2 = comparePlans[1].diet_plan_meal_targets?.find((t) => t.meal_type === mealType);
                  return (
                    <div key={mealType} className="rounded-lg bg-secondary/50 p-2.5">
                      <p className="text-xs font-semibold mb-1">{MEAL_LABELS[mealType]}</p>
                      <div className="grid grid-cols-3 gap-1 text-[10px]">
                        <span className="text-muted-foreground">Kcal</span>
                        <span className="text-center">{mt1?.kcal_target ?? "—"}</span>
                        <span className="text-center">{mt2?.kcal_target ?? "—"}</span>
                      </div>
                      <div className="grid grid-cols-3 gap-1 text-[10px]">
                        <span className="text-muted-foreground">P / C / G</span>
                        <span className="text-center">{mt1 ? `${mt1.protein_g}/${mt1.carbs_g}/${mt1.fats_g}` : "—"}</span>
                        <span className="text-center">{mt2 ? `${mt2.protein_g}/${mt2.carbs_g}/${mt2.fats_g}` : "—"}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCompare(false)}>Chiudi</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reactivate confirm dialog */}
      <Dialog open={!!reactivateId} onOpenChange={(open) => !open && setReactivateId(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Riattivare questo piano?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Il piano attuale verrà disattivato e questo piano diventerà il nuovo piano attivo del cliente. I target nutrizionali verranno aggiornati di conseguenza.
          </p>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setReactivateId(null)}>Annulla</Button>
            <Button onClick={handleReactivate} disabled={reactivating}>
              {reactivating ? <Loader2 className="h-4 w-4 animate-spin" /> : <RotateCcw className="h-4 w-4 mr-1" />}
              Riattiva
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ProClientPlanHistoryPage;
