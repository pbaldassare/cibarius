import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import MobileHeader from "@/components/MobileHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Loader2, ChevronLeft, ChevronRight, AlertTriangle, TrendingUp, TrendingDown, Minus, Utensils } from "lucide-react";

const EXPECTED_MEALS_PER_DAY = 4; // colazione, pranzo, cena, spuntino

interface ClientReport {
  clientId: string;
  clientName: string;
  clientEmail: string;
  kcalTarget: number;
  proteinTarget: number;
  carbsTarget: number;
  fatsTarget: number;
  daysTracked: number;
  totalDays: number;
  avgKcal: number;
  avgProtein: number;
  avgCarbs: number;
  avgFats: number;
  mealsLogged: number;
  mealsExpected: number;
  kcalAdherence: number; // percentage
  isCritical: boolean;
}

const ProWeeklyReportPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [reports, setReports] = useState<ClientReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [weekOffset, setWeekOffset] = useState(0);

  // Calculate week range
  const getWeekRange = (offset: number) => {
    const now = new Date();
    const dayOfWeek = now.getDay(); // 0=Sun
    const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const monday = new Date(now);
    monday.setDate(now.getDate() + mondayOffset + offset * 7);
    monday.setHours(0, 0, 0, 0);
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    return {
      start: monday.toISOString().slice(0, 10),
      end: sunday.toISOString().slice(0, 10),
      label: `${monday.toLocaleDateString("it-IT", { day: "numeric", month: "short" })} – ${sunday.toLocaleDateString("it-IT", { day: "numeric", month: "short", year: "numeric" })}`,
    };
  };

  const week = getWeekRange(weekOffset);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      setLoading(true);

      // 1. Get all active client links
      const { data: links } = await supabase
        .from("client_links")
        .select("client_user_id")
        .eq("professional_id", user.id)
        .eq("status", "active");

      if (!links || links.length === 0) {
        setReports([]);
        setLoading(false);
        return;
      }

      const clientIds = links.map((l) => l.client_user_id);

      // 2. Get profiles + targets for all clients
      const [profilesRes, targetsRes] = await Promise.all([
        supabase.from("profiles").select("id, full_name, email").in("id", clientIds),
        supabase.from("nutrition_targets").select("*").in("user_id", clientIds),
      ]);

      const profiles = profilesRes.data ?? [];
      const targets = targetsRes.data ?? [];

      // 3. Get meal_days for the week
      const { data: mealDays } = await supabase
        .from("meal_days")
        .select("id, user_id, day_date")
        .in("user_id", clientIds)
        .gte("day_date", week.start)
        .lte("day_date", week.end);

      const mealDayIds = (mealDays ?? []).map((d) => d.id);

      // 4. Get meals + items
      let mealsData: any[] = [];
      if (mealDayIds.length > 0) {
        const { data } = await supabase
          .from("meals")
          .select("id, meal_type, meal_day_id, meal_items(calories, macros)")
          .in("meal_day_id", mealDayIds);
        mealsData = data ?? [];
      }

      // 5. Build reports per client
      // Calculate how many days are in the week (up to today if current week)
      const today = new Date().toISOString().slice(0, 10);
      const weekEnd = week.end > today ? today : week.end;
      const startDate = new Date(week.start + "T00:00:00");
      const endDate = new Date(weekEnd + "T00:00:00");
      const totalDaysInRange = Math.max(1, Math.floor((endDate.getTime() - startDate.getTime()) / 86400000) + 1);

      const clientReports: ClientReport[] = clientIds.map((cid) => {
        const profile = profiles.find((p) => p.id === cid);
        const target = targets.find((t) => t.user_id === cid);
        const clientMealDays = (mealDays ?? []).filter((d) => d.user_id === cid);
        const clientMealDayIds = clientMealDays.map((d) => d.id);
        const clientMeals = mealsData.filter((m) => clientMealDayIds.includes(m.meal_day_id));

        // Aggregate kcal and macros per day
        const dayTotals: Record<string, { kcal: number; protein: number; carbs: number; fats: number }> = {};
        clientMealDays.forEach((d) => {
          dayTotals[d.id] = { kcal: 0, protein: 0, carbs: 0, fats: 0 };
        });

        let totalMealsLogged = 0;
        clientMeals.forEach((meal) => {
          totalMealsLogged++;
          const items = meal.meal_items ?? [];
          items.forEach((item: any) => {
            if (dayTotals[meal.meal_day_id]) {
              dayTotals[meal.meal_day_id].kcal += item.calories ?? 0;
              const mac = item.macros as any;
              if (mac) {
                dayTotals[meal.meal_day_id].protein += mac.protein ?? 0;
                dayTotals[meal.meal_day_id].carbs += mac.carbs ?? 0;
                dayTotals[meal.meal_day_id].fats += mac.fats ?? 0;
              }
            }
          });
        });

        const daysTracked = clientMealDays.length;
        const values = Object.values(dayTotals);
        const avgKcal = daysTracked > 0 ? Math.round(values.reduce((s, v) => s + v.kcal, 0) / daysTracked) : 0;
        const avgProtein = daysTracked > 0 ? Math.round(values.reduce((s, v) => s + v.protein, 0) / daysTracked) : 0;
        const avgCarbs = daysTracked > 0 ? Math.round(values.reduce((s, v) => s + v.carbs, 0) / daysTracked) : 0;
        const avgFats = daysTracked > 0 ? Math.round(values.reduce((s, v) => s + v.fats, 0) / daysTracked) : 0;

        const kcalTarget = target?.kcal_day ?? 2000;
        const kcalAdherence = kcalTarget > 0 && avgKcal > 0 ? Math.round((avgKcal / kcalTarget) * 100) : 0;

        const mealsExpected = totalDaysInRange * EXPECTED_MEALS_PER_DAY;
        const missedMealsRatio = mealsExpected > 0 ? totalMealsLogged / mealsExpected : 0;

        // Critical: <60% adherence OR <50% meals logged OR 0 days tracked
        const isCritical = daysTracked === 0 || kcalAdherence < 60 || missedMealsRatio < 0.5;

        return {
          clientId: cid,
          clientName: profile?.full_name || "Senza nome",
          clientEmail: profile?.email || "",
          kcalTarget,
          proteinTarget: target?.protein_g ?? 120,
          carbsTarget: target?.carbs_g ?? 220,
          fatsTarget: target?.fats_g ?? 70,
          daysTracked,
          totalDays: totalDaysInRange,
          avgKcal,
          avgProtein,
          avgCarbs,
          avgFats,
          mealsLogged: totalMealsLogged,
          mealsExpected,
          kcalAdherence,
          isCritical,
        };
      });

      // Sort: critical first, then by adherence ascending
      clientReports.sort((a, b) => {
        if (a.isCritical !== b.isCritical) return a.isCritical ? -1 : 1;
        return a.kcalAdherence - b.kcalAdherence;
      });

      setReports(clientReports);
      setLoading(false);
    };

    load();
  }, [user, weekOffset]);

  // Summary stats
  const totalClients = reports.length;
  const criticalCount = reports.filter((r) => r.isCritical).length;
  const avgAdherence = totalClients > 0 ? Math.round(reports.reduce((s, r) => s + r.kcalAdherence, 0) / totalClients) : 0;
  const totalMissed = reports.reduce((s, r) => s + (r.mealsExpected - r.mealsLogged), 0);

  const adherenceIcon = (val: number) => {
    if (val >= 90) return <TrendingUp className="h-3.5 w-3.5 text-green-600" />;
    if (val >= 70) return <Minus className="h-3.5 w-3.5 text-amber-500" />;
    return <TrendingDown className="h-3.5 w-3.5 text-destructive" />;
  };

  const adherenceColor = (val: number) => {
    if (val >= 90) return "text-green-600";
    if (val >= 70) return "text-amber-600";
    return "text-destructive";
  };

  if (loading) {
    return (
      <div>
        <MobileHeader title="Report settimanale" />
        <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
      </div>
    );
  }

  return (
    <div>
      <MobileHeader title="Report settimanale" />
      <main className="px-4 py-5 pb-28 space-y-4">

        {/* Week selector */}
        <div className="flex items-center justify-between">
          <Button variant="ghost" size="icon" onClick={() => setWeekOffset(weekOffset - 1)}>
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <span className="text-sm font-semibold text-foreground">{week.label}</span>
          <Button variant="ghost" size="icon" onClick={() => setWeekOffset(weekOffset + 1)} disabled={weekOffset >= 0}>
            <ChevronRight className="h-5 w-5" />
          </Button>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-2 gap-3">
          <Card className="border border-border">
            <CardContent className="py-4 text-center">
              <p className={`text-2xl font-bold ${adherenceColor(avgAdherence)}`}>{avgAdherence}%</p>
              <p className="text-[10px] text-muted-foreground">Aderenza media kcal</p>
            </CardContent>
          </Card>
          <Card className="border border-border">
            <CardContent className="py-4 text-center">
              <p className="text-2xl font-bold text-foreground">{totalMissed}</p>
              <p className="text-[10px] text-muted-foreground">Pasti non registrati</p>
            </CardContent>
          </Card>
          <Card className="border border-border">
            <CardContent className="py-4 text-center">
              <p className="text-2xl font-bold text-foreground">{totalClients}</p>
              <p className="text-[10px] text-muted-foreground">Clienti monitorati</p>
            </CardContent>
          </Card>
          <Card className={`border ${criticalCount > 0 ? "border-destructive/40 bg-destructive/5" : "border-border"}`}>
            <CardContent className="py-4 text-center">
              <p className={`text-2xl font-bold ${criticalCount > 0 ? "text-destructive" : "text-foreground"}`}>{criticalCount}</p>
              <p className="text-[10px] text-muted-foreground">Clienti critici</p>
            </CardContent>
          </Card>
        </div>

        {/* Per-client breakdown */}
        <h3 className="text-sm font-semibold text-foreground pt-2">Dettaglio per cliente</h3>

        {reports.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">Nessun cliente attivo.</p>
        ) : (
          reports.map((r) => (
            <Card
              key={r.clientId}
              className={`border ${r.isCritical ? "border-destructive/30 bg-destructive/5" : "border-border"} cursor-pointer`}
              onClick={() => navigate(`/pro/client/${r.clientId}`)}
            >
              <CardContent className="py-4 space-y-3">
                {/* Header */}
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-foreground">{r.clientName}</p>
                      {r.isCritical && (
                        <Badge variant="destructive" className="text-[9px] gap-0.5">
                          <AlertTriangle className="h-2.5 w-2.5" /> Critico
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">{r.daysTracked}/{r.totalDays} giorni tracciati</p>
                  </div>
                  <div className="flex items-center gap-1">
                    {adherenceIcon(r.kcalAdherence)}
                    <span className={`text-lg font-bold ${adherenceColor(r.kcalAdherence)}`}>{r.kcalAdherence}%</span>
                  </div>
                </div>

                {/* Kcal adherence bar */}
                <div>
                  <div className="flex justify-between text-[10px] text-muted-foreground mb-1">
                    <span>Kcal media: {r.avgKcal}</span>
                    <span>Target: {r.kcalTarget}</span>
                  </div>
                  <Progress
                    value={Math.min(r.kcalAdherence, 100)}
                    className="h-2"
                  />
                </div>

                {/* Macro averages */}
                <div className="grid grid-cols-3 gap-2 text-center">
                  {[
                    { label: "Prot", avg: r.avgProtein, target: r.proteinTarget },
                    { label: "Carbo", avg: r.avgCarbs, target: r.carbsTarget },
                    { label: "Grassi", avg: r.avgFats, target: r.fatsTarget },
                  ].map((m) => {
                    const pct = m.target > 0 ? Math.round((m.avg / m.target) * 100) : 0;
                    return (
                      <div key={m.label}>
                        <p className="text-[10px] text-muted-foreground">{m.label}</p>
                        <p className="text-xs font-semibold">{m.avg}g / {m.target}g</p>
                        <p className={`text-[10px] ${pct >= 80 && pct <= 120 ? "text-green-600" : "text-amber-600"}`}>{pct}%</p>
                      </div>
                    );
                  })}
                </div>

                {/* Missed meals */}
                <div className="flex items-center gap-2 text-xs">
                  <Utensils className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-muted-foreground">
                    {r.mealsLogged} pasti su {r.mealsExpected} attesi
                    {r.mealsExpected - r.mealsLogged > 0 && (
                      <span className="text-destructive ml-1">
                        ({r.mealsExpected - r.mealsLogged} mancanti)
                      </span>
                    )}
                  </span>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </main>
    </div>
  );
};

export default ProWeeklyReportPage;
