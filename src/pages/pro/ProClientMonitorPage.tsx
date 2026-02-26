import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import MobileHeader from "@/components/MobileHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Loader2, ChevronLeft, ChevronRight, AlertTriangle, CheckCircle2, XCircle } from "lucide-react";

const MEAL_LABELS: Record<string, string> = {
  colazione: "☀️ Colazione",
  pranzo: "🌤️ Pranzo",
  cena: "🌙 Cena",
  spuntino: "🍎 Spuntino",
};
const MEAL_ORDER = ["colazione", "pranzo", "spuntino", "cena"];

interface MealTarget {
  meal_type: string;
  kcal_target: number;
  protein_g: number;
  carbs_g: number;
  fats_g: number;
}

const ProClientMonitorPage = () => {
  const { clientId } = useParams<{ clientId: string }>();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [clientName, setClientName] = useState("");
  const [dayDate, setDayDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [plan, setPlan] = useState<any>(null);
  const [mealTargets, setMealTargets] = useState<MealTarget[]>([]);
  const [meals, setMeals] = useState<any[]>([]);

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
        setPlan(planRes.data);
        setMealTargets((planRes.data as any).diet_plan_meal_targets || []);
      }
      setLoading(false);
    };
    load();
  }, [clientId, user]);

  useEffect(() => {
    if (!clientId) return;
    const loadDay = async () => {
      const { data: dayData } = await supabase
        .from("meal_days")
        .select("id")
        .eq("user_id", clientId)
        .eq("day_date", dayDate)
        .single();
      if (!dayData) { setMeals([]); return; }
      const { data } = await supabase
        .from("meals")
        .select("id, meal_type, meal_items(id, custom_name, calories, quantity, unit, macros, products(name))")
        .eq("meal_day_id", dayData.id)
        .order("created_at");
      setMeals(data ?? []);
    };
    loadDay();
  }, [clientId, dayDate]);

  const shiftDay = (d: number) => {
    const dt = new Date(dayDate);
    dt.setDate(dt.getDate() + d);
    setDayDate(dt.toISOString().slice(0, 10));
  };

  if (loading) {
    return (
      <div>
        <MobileHeader title="Monitor" />
        <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
      </div>
    );
  }

  if (!plan) {
    return (
      <div>
        <MobileHeader title="Monitor" />
        <div className="px-4 py-10 text-center">
          <p className="text-muted-foreground">Nessun piano attivo per questo cliente. Crea un piano prima di monitorare.</p>
        </div>
      </div>
    );
  }

  // Compute consumed per meal_type
  const consumedByMeal: Record<string, { kcal: number; protein: number; carbs: number; fats: number; items: any[] }> = {};
  MEAL_ORDER.forEach((mt) => { consumedByMeal[mt] = { kcal: 0, protein: 0, carbs: 0, fats: 0, items: [] }; });
  meals.forEach((meal) => {
    const mt = meal.meal_type;
    if (!consumedByMeal[mt]) consumedByMeal[mt] = { kcal: 0, protein: 0, carbs: 0, fats: 0, items: [] };
    (meal.meal_items ?? []).forEach((item: any) => {
      consumedByMeal[mt].kcal += item.calories ?? 0;
      const mac = item.macros as any;
      if (mac) {
        consumedByMeal[mt].protein += mac.protein ?? 0;
        consumedByMeal[mt].carbs += mac.carbs ?? 0;
        consumedByMeal[mt].fats += mac.fats ?? 0;
      }
      consumedByMeal[mt].items.push(item);
    });
  });

  const totalConsumed = Object.values(consumedByMeal).reduce(
    (acc, v) => ({ kcal: acc.kcal + v.kcal, protein: acc.protein + v.protein, carbs: acc.carbs + v.carbs, fats: acc.fats + v.fats }),
    { kcal: 0, protein: 0, carbs: 0, fats: 0 }
  );

  const kcalPct = plan.kcal_day > 0 ? Math.round((totalConsumed.kcal / plan.kcal_day) * 100) : 0;

  // Alerts
  const alerts: { type: "warn" | "danger" | "info"; msg: string }[] = [];
  const proteinDiff = totalConsumed.protein - plan.protein_g_day;
  if (proteinDiff < -20) alerts.push({ type: "warn", msg: `Sotto proteine di ${Math.abs(Math.round(proteinDiff))}g` });
  const kcalDiff = totalConsumed.kcal - plan.kcal_day;
  if (kcalDiff > 100) alerts.push({ type: "danger", msg: `Sopra kcal di ${Math.round(kcalDiff)}` });
  MEAL_ORDER.forEach((mt) => {
    const target = mealTargets.find((t) => t.meal_type === mt);
    if (target && target.kcal_target > 0 && consumedByMeal[mt].kcal === 0 && meals.length > 0) {
      alerts.push({ type: "info", msg: `Pasto mancante: ${MEAL_LABELS[mt]}` });
    }
  });

  return (
    <div>
      <MobileHeader title={`Monitor — ${clientName}`} />
      <main className="px-4 py-5 pb-28 space-y-4">
        {/* Day selector */}
        <div className="flex items-center justify-between">
          <Button variant="ghost" size="icon" onClick={() => shiftDay(-1)}><ChevronLeft className="h-5 w-5" /></Button>
          <span className="text-sm font-semibold text-foreground">
            {new Date(dayDate + "T00:00:00").toLocaleDateString("it-IT", { weekday: "long", day: "numeric", month: "long" })}
          </span>
          <Button variant="ghost" size="icon" onClick={() => shiftDay(1)}><ChevronRight className="h-5 w-5" /></Button>
        </div>

        {/* Daily adherence */}
        <Card className="border-2 border-accent">
          <CardContent className="py-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold">Aderenza giornaliera</span>
              <Badge variant={kcalPct >= 80 && kcalPct <= 120 ? "default" : "destructive"}>
                {kcalPct}%
              </Badge>
            </div>
            <Progress value={Math.min(kcalPct, 100)} className="h-2.5" />
            <div className="grid grid-cols-4 gap-2 text-center text-xs">
              <div>
                <p className="text-muted-foreground">Kcal</p>
                <p className="font-bold">{Math.round(totalConsumed.kcal)}/{plan.kcal_day}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Prot</p>
                <p className="font-bold">{Math.round(totalConsumed.protein)}/{plan.protein_g_day}g</p>
              </div>
              <div>
                <p className="text-muted-foreground">Carbo</p>
                <p className="font-bold">{Math.round(totalConsumed.carbs)}/{plan.carbs_g_day}g</p>
              </div>
              <div>
                <p className="text-muted-foreground">Grassi</p>
                <p className="font-bold">{Math.round(totalConsumed.fats)}/{plan.fats_g_day}g</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Alerts */}
        {alerts.length > 0 && (
          <div className="space-y-2">
            {alerts.map((a, i) => (
              <div key={i} className={`flex items-center gap-2 rounded-lg p-3 text-sm ${
                a.type === "danger" ? "bg-destructive/10 text-destructive" :
                a.type === "warn" ? "bg-amber-500/10 text-amber-700" :
                "bg-blue-500/10 text-blue-700"
              }`}>
                {a.type === "danger" ? <XCircle className="h-4 w-4 shrink-0" /> :
                 a.type === "warn" ? <AlertTriangle className="h-4 w-4 shrink-0" /> :
                 <AlertTriangle className="h-4 w-4 shrink-0" />}
                {a.msg}
              </div>
            ))}
          </div>
        )}

        {/* Per-meal adherence */}
        {MEAL_ORDER.map((mt) => {
          const target = mealTargets.find((t) => t.meal_type === mt);
          const consumed = consumedByMeal[mt];
          if (!target || target.kcal_target === 0) return null;
          const pct = target.kcal_target > 0 ? Math.round((consumed.kcal / target.kcal_target) * 100) : 0;
          const ok = pct >= 70 && pct <= 130;

          return (
            <Card key={mt} className="border border-border">
              <CardHeader className="pb-1 pt-3 px-4">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm">{MEAL_LABELS[mt]}</CardTitle>
                  <div className="flex items-center gap-1.5">
                    {ok ? <CheckCircle2 className="h-4 w-4 text-green-600" /> : <AlertTriangle className="h-4 w-4 text-amber-500" />}
                    <span className="text-xs font-semibold">{pct}%</span>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="px-4 pb-3 space-y-2">
                <div className="grid grid-cols-4 gap-1 text-[10px] text-center">
                  <div>
                    <p className="text-muted-foreground">Kcal</p>
                    <p className="font-semibold">{Math.round(consumed.kcal)}/{target.kcal_target}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Prot</p>
                    <p className="font-semibold">{Math.round(consumed.protein)}/{target.protein_g}g</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Carbo</p>
                    <p className="font-semibold">{Math.round(consumed.carbs)}/{target.carbs_g}g</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Grassi</p>
                    <p className="font-semibold">{Math.round(consumed.fats)}/{target.fats_g}g</p>
                  </div>
                </div>
                {consumed.items.length > 0 && (
                  <div className="space-y-1">
                    {consumed.items.map((item: any) => (
                      <div key={item.id} className="flex items-center justify-between text-xs bg-secondary/50 rounded px-2 py-1">
                        <span className="truncate max-w-[60%]">{item.custom_name || item.products?.name || "—"}</span>
                        <span className="text-muted-foreground">{item.calories ?? 0} kcal</span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </main>
    </div>
  );
};

export default ProClientMonitorPage;
