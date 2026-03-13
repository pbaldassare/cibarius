import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import MobileHeader from "@/components/MobileHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, TrendingUp, Weight, Target, ArrowDown, ArrowUp } from "lucide-react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";

interface Measurement {
  id: string;
  measured_at: string;
  weight_kg: number | null;
  waist_cm: number | null;
  hips_cm: number | null;
  chest_cm: number | null;
  arm_cm: number | null;
  thigh_cm: number | null;
  body_fat_pct: number | null;
  notes: string | null;
}

interface WeightGoal {
  height_cm: number | null;
  starting_weight_kg: number | null;
  current_weight_kg: number | null;
  target_weight_kg: number | null;
  started_at: string | null;
}

const METRICS = [
  { key: "weight_kg", label: "Peso (kg)", color: "hsl(196,88%,54%)" },
  { key: "waist_cm", label: "Vita (cm)", color: "hsl(37,90%,51%)" },
  { key: "hips_cm", label: "Fianchi (cm)", color: "hsl(152,56%,46%)" },
  { key: "chest_cm", label: "Petto (cm)", color: "hsl(1,76%,55%)" },
  { key: "arm_cm", label: "Braccio (cm)", color: "hsl(270,60%,55%)" },
  { key: "thigh_cm", label: "Coscia (cm)", color: "hsl(330,60%,55%)" },
  { key: "body_fat_pct", label: "Body fat (%)", color: "hsl(201,89%,39%)" },
] as const;

const ProClientMeasurementsPage = () => {
  const { clientId } = useParams<{ clientId: string }>();
  const [measurements, setMeasurements] = useState<Measurement[]>([]);
  const [loading, setLoading] = useState(true);
  const [clientName, setClientName] = useState("");
  const [activeMetrics, setActiveMetrics] = useState<string[]>(["weight_kg", "waist_cm"]);
  const [goal, setGoal] = useState<WeightGoal | null>(null);

  useEffect(() => {
    if (!clientId) return;
    const load = async () => {
      const [{ data: mData }, { data: profile }, { data: gData }] = await Promise.all([
        supabase
          .from("body_measurements")
          .select("*")
          .eq("user_id", clientId)
          .order("measured_at", { ascending: false })
          .limit(50),
        supabase.from("profiles").select("full_name").eq("id", clientId).single(),
        supabase
          .from("weight_goals" as any)
          .select("*")
          .eq("user_id", clientId)
          .maybeSingle(),
      ]);
      setMeasurements((mData as any[]) ?? []);
      setClientName(profile?.full_name || "Cliente");
      if (gData) setGoal(gData as any);
      setLoading(false);
    };
    load();
  }, [clientId]);

  const toggleMetric = (key: string) => {
    setActiveMetrics((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  };

  const chartData = [...measurements]
    .reverse()
    .map((m) => ({
      date: new Date(m.measured_at).toLocaleDateString("it-IT", { day: "2-digit", month: "short" }),
      ...METRICS.reduce((acc, metric) => {
        acc[metric.key] = (m as any)[metric.key];
        return acc;
      }, {} as any),
    }));

  // Weight progress
  const latestWeight = measurements.find(m => m.weight_kg != null)?.weight_kg ?? goal?.current_weight_kg ?? null;
  const startWeight = goal?.starting_weight_kg ?? null;
  const targetWeight = goal?.target_weight_kg ?? null;
  const heightCm = goal?.height_cm ?? null;
  const weightDiff = startWeight && latestWeight ? Math.round((latestWeight - startWeight) * 10) / 10 : null;
  const isLosingGoal = startWeight && targetWeight ? targetWeight < startWeight : null;
  const totalToLose = startWeight && targetWeight ? Math.abs(targetWeight - startWeight) : null;
  const progressPct = totalToLose && startWeight && latestWeight
    ? Math.min(100, Math.max(0, Math.round((Math.abs(startWeight - latestWeight) / totalToLose) * 100)))
    : null;
  const remaining = targetWeight && latestWeight ? Math.round(Math.abs(latestWeight - targetWeight) * 10) / 10 : null;
  const bmi = heightCm && latestWeight ? Math.round((latestWeight / ((heightCm / 100) ** 2)) * 10) / 10 : null;

  if (loading) {
    return (
      <div>
        <MobileHeader title="Misurazioni" />
        <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
      </div>
    );
  }

  return (
    <div>
      <MobileHeader title={`Misurazioni – ${clientName}`} />
      <main className="px-4 py-5 pb-28 space-y-4">

        {/* Weight goals card */}
        {goal && (
          <Card className="border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
            <CardContent className="py-4 space-y-3">
              <h3 className="text-sm font-bold text-foreground flex items-center gap-1.5">
                <Target className="h-4 w-4 text-primary" /> Obiettivo peso
              </h3>

              {/* Stats row */}
              <div className="flex items-center gap-3 text-xs">
                {heightCm && <span className="text-muted-foreground">📏 {heightCm} cm</span>}
                {startWeight && <span className="text-muted-foreground">🏁 {startWeight} kg</span>}
                {targetWeight && <span className="font-semibold text-primary">🎯 {targetWeight} kg</span>}
              </div>

              {/* Current weight & diff */}
              {latestWeight && (
                <div className="flex items-center gap-3">
                  <span className="text-2xl font-extrabold text-foreground">{latestWeight} kg</span>
                  {weightDiff !== null && (
                    <Badge
                      variant="outline"
                      className={`text-[10px] gap-0.5 ${
                        (isLosingGoal && weightDiff < 0) || (!isLosingGoal && weightDiff > 0)
                          ? "border-success text-success"
                          : weightDiff === 0
                          ? "border-muted-foreground text-muted-foreground"
                          : "border-destructive text-destructive"
                      }`}
                    >
                      {weightDiff > 0 ? <ArrowUp className="h-3 w-3" /> : weightDiff < 0 ? <ArrowDown className="h-3 w-3" /> : null}
                      {weightDiff > 0 ? "+" : ""}{weightDiff} kg
                    </Badge>
                  )}
                  {bmi && (
                    <Badge variant="secondary" className="text-[10px]">
                      BMI {bmi}
                    </Badge>
                  )}
                </div>
              )}

              {/* Progress bar */}
              {progressPct !== null && totalToLose && (
                <div className="space-y-1">
                  <Progress value={progressPct} className="h-2.5" />
                  <div className="flex justify-between text-[10px] text-muted-foreground">
                    <span>{progressPct}% completato</span>
                    <span>{remaining} kg {isLosingGoal ? "da perdere" : "da prendere"}</span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Chart */}
        {chartData.length >= 2 && (
          <Card className="border border-border">
            <CardContent className="py-4 space-y-3">
              <h3 className="text-sm font-bold text-foreground flex items-center gap-1.5">
                <TrendingUp className="h-4 w-4 text-primary" /> Andamento
              </h3>
              <div className="flex flex-wrap gap-1.5">
                {METRICS.map((m) => (
                  <Badge
                    key={m.key}
                    variant={activeMetrics.includes(m.key) ? "default" : "outline"}
                    className="cursor-pointer text-[10px]"
                    style={activeMetrics.includes(m.key) ? { backgroundColor: m.color, borderColor: m.color } : {}}
                    onClick={() => toggleMetric(m.key)}
                  >
                    {m.label}
                  </Badge>
                ))}
              </div>
              <div className="h-52">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="date" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                    <YAxis tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                    <Tooltip contentStyle={{ fontSize: 12, borderRadius: 12, border: "1px solid hsl(var(--border))" }} />
                    {METRICS.filter((m) => activeMetrics.includes(m.key)).map((m) => (
                      <Line key={m.key} type="monotone" dataKey={m.key} name={m.label} stroke={m.color} strokeWidth={2} dot={{ r: 3 }} connectNulls />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        )}

        {/* History */}
        <div className="space-y-2">
          <h3 className="text-sm font-bold text-foreground flex items-center gap-1.5">
            <Weight className="h-4 w-4 text-primary" /> Storico
          </h3>
          {measurements.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">Nessuna misurazione registrata.</p>
          ) : (
            measurements.map((m) => (
              <Card key={m.id} className="border border-border">
                <CardContent className="py-3">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-semibold text-foreground">
                      {new Date(m.measured_at).toLocaleDateString("it-IT", { day: "numeric", month: "long", year: "numeric" })}
                    </span>
                    {m.weight_kg && <Badge variant="outline" className="text-[10px]">{m.weight_kg} kg</Badge>}
                  </div>
                  <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-[10px] text-muted-foreground">
                    {m.waist_cm && <span>Vita {m.waist_cm}cm</span>}
                    {m.hips_cm && <span>Fianchi {m.hips_cm}cm</span>}
                    {m.chest_cm && <span>Petto {m.chest_cm}cm</span>}
                    {m.arm_cm && <span>Braccio {m.arm_cm}cm</span>}
                    {m.thigh_cm && <span>Coscia {m.thigh_cm}cm</span>}
                    {m.body_fat_pct && <span>BF {m.body_fat_pct}%</span>}
                  </div>
                  {m.notes && <p className="text-[10px] text-muted-foreground mt-1 italic">📝 {m.notes}</p>}
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </main>
    </div>
  );
};

export default ProClientMeasurementsPage;
