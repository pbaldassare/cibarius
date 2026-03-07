import { useState, useEffect, useMemo } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { format, subDays, startOfWeek, endOfWeek, eachDayOfInterval, isToday, parseISO } from "date-fns";
import { it } from "date-fns/locale";
import { TrendingUp, Check, X, Minus, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { AreaChart, Area, XAxis, YAxis, ResponsiveContainer, Tooltip } from "recharts";
import { useNavigate } from "react-router-dom";

interface DailyProgressRow {
  id?: string;
  user_id: string;
  day_date: string;
  plan_id?: string | null;
  kcal_target: number;
  kcal_actual: number;
  protein_target: number;
  protein_actual: number;
  carbs_target: number;
  carbs_actual: number;
  fats_target: number;
  fats_actual: number;
  compliance_pct: number;
  meals_logged: Record<string, boolean>;
  notes: string | null;
}

const UserProgressPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [history, setHistory] = useState<DailyProgressRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [weekOffset, setWeekOffset] = useState(0);

  const todayStr = format(new Date(), "yyyy-MM-dd");

  // Load data
  useEffect(() => {
    if (!user) return;
    const load = async () => {
      setLoading(true);

      // Get last 30 days progress
      const thirtyAgo = format(subDays(new Date(), 30), "yyyy-MM-dd");
      const { data: rows } = await supabase
        .from("daily_progress")
        .select("*")
        .eq("user_id", user.id)
        .gte("day_date", thirtyAgo)
        .order("day_date", { ascending: true });

      const typedRows = (rows || []).map((r: any) => ({
        ...r,
        meals_logged: (typeof r.meals_logged === "object" && r.meals_logged !== null ? r.meals_logged : {}) as Record<string, boolean>,
      }));
      setHistory(typedRows);

      setLoading(false);
    };
    load();
  }, [user]);

  // Week view
  const currentWeekStart = startOfWeek(subDays(new Date(), weekOffset * 7), { weekStartsOn: 1 });
  const currentWeekEnd = endOfWeek(currentWeekStart, { weekStartsOn: 1 });
  const weekDays = eachDayOfInterval({ start: currentWeekStart, end: currentWeekEnd });

  const weekAvg = useMemo(() => {
    const weekEntries = history.filter((r) => {
      const d = parseISO(r.day_date);
      return d >= currentWeekStart && d <= currentWeekEnd;
    });
    if (weekEntries.length === 0) return 0;
    return Math.round(weekEntries.reduce((s, e) => s + (e.compliance_pct || 0), 0) / weekEntries.length);
  }, [history, weekOffset]);

  // Chart data (last 30 days)
  const chartData = useMemo(() => {
    const last30 = [];
    for (let i = 29; i >= 0; i--) {
      const d = format(subDays(new Date(), i), "yyyy-MM-dd");
      const entry = history.find((r) => r.day_date === d);
      last30.push({
        day: format(subDays(new Date(), i), "d MMM", { locale: it }),
        compliance: entry?.compliance_pct || 0,
      });
    }
    return last30;
  }, [history]);

  // Stats
  const stats = useMemo(() => {
    const logged = history.filter((r) => r.compliance_pct > 0);
    const avg = logged.length > 0 ? Math.round(logged.reduce((s, e) => s + e.compliance_pct, 0) / logged.length) : 0;

    // Streak
    let streak = 0;
    for (let i = 0; i <= 30; i++) {
      const d = format(subDays(new Date(), i), "yyyy-MM-dd");
      const entry = history.find((r) => r.day_date === d);
      if (entry && entry.compliance_pct >= 70) streak++;
      else if (i > 0) break;
    }

    return { avg, logged: logged.length, streak };
  }, [history]);

  const getDayStatus = (date: Date) => {
    const d = format(date, "yyyy-MM-dd");
    const entry = history.find((r) => r.day_date === d);
    if (!entry || entry.compliance_pct === 0) return "none";
    if (entry.compliance_pct >= 80) return "good";
    if (entry.compliance_pct >= 50) return "warn";
    return "bad";
  };

  if (loading) {
    return (
      <div className="p-4 space-y-4">
        <div className="h-8 w-48 bg-muted animate-pulse rounded" />
        <div className="h-32 bg-muted animate-pulse rounded-xl" />
        <div className="h-48 bg-muted animate-pulse rounded-xl" />
      </div>
    );
  }

  return (
    <div className="p-4 pb-8 space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
          <TrendingUp className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-foreground">I miei progressi</h1>
          <p className="text-xs text-muted-foreground">Traccia il rispetto del tuo piano</p>
        </div>
      </div>

      {/* Week overview */}
      <Card className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setWeekOffset((o) => o + 1)}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm font-semibold text-foreground">
            {weekOffset === 0 ? "Questa settimana" : format(currentWeekStart, "d MMM", { locale: it }) + " – " + format(currentWeekEnd, "d MMM", { locale: it })}
          </span>
          <Button variant="ghost" size="icon" className="h-8 w-8" disabled={weekOffset === 0} onClick={() => setWeekOffset((o) => o - 1)}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Media settimanale</span>
            <span className="font-bold text-foreground">{weekAvg}%</span>
          </div>
          <Progress value={weekAvg} className="h-2.5" />
        </div>

        <div className="flex justify-between">
          {weekDays.map((d) => {
            const status = getDayStatus(d);
            const isT = isToday(d);
            return (
              <div key={d.toISOString()} className="flex flex-col items-center gap-1">
                <span className={`text-[10px] font-medium ${isT ? "text-primary" : "text-muted-foreground"}`}>
                  {format(d, "EEE", { locale: it }).slice(0, 3)}
                </span>
                <div
                  className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold transition-all ${
                    status === "good"
                      ? "bg-green-500/15 text-green-600"
                      : status === "warn"
                      ? "bg-yellow-500/15 text-yellow-600"
                      : status === "bad"
                      ? "bg-red-500/15 text-red-600"
                      : isT
                      ? "bg-primary/10 text-primary ring-2 ring-primary/30"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {status === "good" ? <Check className="h-4 w-4" /> : status === "warn" ? "⚠️" : status === "bad" ? <X className="h-3.5 w-3.5" /> : <Minus className="h-3 w-3" />}
                </div>
              </div>
            );
          })}
        </div>
      </Card>


      {/* Stats cards */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="p-3 text-center space-y-1">
          <p className="text-2xl font-bold text-primary">{stats.avg}%</p>
          <p className="text-[10px] text-muted-foreground font-medium">Media 30gg</p>
        </Card>
        <Card className="p-3 text-center space-y-1">
          <p className="text-2xl font-bold text-foreground">{stats.logged}</p>
          <p className="text-[10px] text-muted-foreground font-medium">Giorni tracciati</p>
        </Card>
        <Card className="p-3 text-center space-y-1">
          <p className="text-2xl font-bold text-green-600">{stats.streak}</p>
          <p className="text-[10px] text-muted-foreground font-medium">Streak 🔥</p>
        </Card>
      </div>

      {/* Chart */}
      <Card className="p-4 space-y-3">
        <h3 className="text-sm font-bold text-foreground">Andamento ultimi 30 giorni</h3>
        <div className="h-40">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="compGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="day" tick={{ fontSize: 9 }} interval={4} stroke="hsl(var(--muted-foreground))" />
              <YAxis domain={[0, 100]} tick={{ fontSize: 9 }} stroke="hsl(var(--muted-foreground))" width={28} />
              <Tooltip
                contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid hsl(var(--border))" }}
                formatter={(v: number) => [`${v}%`, "Compliance"]}
              />
              <Area
                type="monotone"
                dataKey="compliance"
                stroke="hsl(var(--primary))"
                strokeWidth={2}
                fill="url(#compGrad)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </Card>

      {/* Recent history */}
      <Card className="p-4 space-y-3">
        <h3 className="text-sm font-bold text-foreground">Storico recente</h3>
        <div className="space-y-2">
          {[...history]
            .filter((r) => r.day_date !== todayStr && r.compliance_pct > 0)
            .reverse()
            .slice(0, 10)
            .map((r) => (
              <div key={r.day_date} className="flex items-center justify-between rounded-lg bg-muted/50 px-3 py-2">
                <span className="text-sm text-foreground font-medium">
                  {format(parseISO(r.day_date), "d MMM", { locale: it })}
                </span>
                <div className="flex items-center gap-2">
                  <span
                    className={`text-sm font-bold ${
                      r.compliance_pct >= 80 ? "text-green-600" : r.compliance_pct >= 50 ? "text-yellow-600" : "text-red-500"
                    }`}
                  >
                    {r.compliance_pct}%
                  </span>
                  <span className="text-sm">
                    {r.compliance_pct >= 80 ? "✅" : r.compliance_pct >= 50 ? "⚠️" : "❌"}
                  </span>
                </div>
              </div>
            ))}
          {history.filter((r) => r.compliance_pct > 0).length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">
              Nessun giorno ancora registrato. Compila oggi per iniziare!
            </p>
          )}
        </div>
      </Card>
    </div>
  );
};

export default UserProgressPage;
