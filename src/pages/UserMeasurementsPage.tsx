import { useEffect, useState } from "react";
import MobileHeader from "@/components/MobileHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useSubscription } from "@/hooks/useSubscription";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Plus, Ruler, Weight, TrendingUp, Target, ArrowDown, ArrowUp, Crown, Save } from "lucide-react";
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

const UserMeasurementsPage = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { isActive: plusActive } = useSubscription("user_plus");
  const [measurements, setMeasurements] = useState<Measurement[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [activeMetrics, setActiveMetrics] = useState<string[]>(["weight_kg", "waist_cm"]);

  // Weight goals state
  const [goal, setGoal] = useState<WeightGoal | null>(null);
  const [showGoalForm, setShowGoalForm] = useState(false);
  const [savingGoal, setSavingGoal] = useState(false);
  const [goalForm, setGoalForm] = useState({
    height_cm: "",
    starting_weight_kg: "",
    target_weight_kg: "",
  });

  // Form state
  const [form, setForm] = useState({
    measured_at: new Date().toISOString().slice(0, 10),
    weight_kg: "",
    waist_cm: "",
    hips_cm: "",
    chest_cm: "",
    arm_cm: "",
    thigh_cm: "",
    body_fat_pct: "",
    notes: "",
  });

  const loadData = async () => {
    if (!user) return;
    const [{ data: mData }, { data: gData }] = await Promise.all([
      supabase
        .from("body_measurements")
        .select("*")
        .eq("user_id", user.id)
        .order("measured_at", { ascending: false })
        .limit(50),
      supabase
        .from("weight_goals" as any)
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle(),
    ]);
    setMeasurements((mData as any[]) ?? []);
    if (gData) {
      setGoal(gData as any);
      setGoalForm({
        height_cm: String((gData as any).height_cm ?? ""),
        starting_weight_kg: String((gData as any).starting_weight_kg ?? ""),
        target_weight_kg: String((gData as any).target_weight_kg ?? ""),
      });
    }
    setLoading(false);
  };

  useEffect(() => { loadData(); }, [user]);

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    const row: any = {
      user_id: user.id,
      measured_at: form.measured_at,
      notes: form.notes || null,
    };
    for (const m of METRICS) {
      const v = (form as any)[m.key];
      row[m.key] = v ? parseFloat(v) : null;
    }
    const { error } = await supabase.from("body_measurements").insert(row);
    
    // Also update current_weight in weight_goals if weight was provided
    if (!error && row.weight_kg && goal) {
      await supabase
        .from("weight_goals" as any)
        .update({ current_weight_kg: row.weight_kg, updated_at: new Date().toISOString() } as any)
        .eq("user_id", user.id);
    }
    
    setSaving(false);
    if (error) {
      toast({ variant: "destructive", title: "Errore", description: error.message });
    } else {
      toast({ title: "Misurazione salvata ✅" });
      setShowForm(false);
      setForm({ measured_at: new Date().toISOString().slice(0, 10), weight_kg: "", waist_cm: "", hips_cm: "", chest_cm: "", arm_cm: "", thigh_cm: "", body_fat_pct: "", notes: "" });
      loadData();
    }
  };

  const handleSaveGoal = async () => {
    if (!user) return;
    setSavingGoal(true);
    const height = parseFloat(goalForm.height_cm) || null;
    const startW = parseFloat(goalForm.starting_weight_kg) || null;
    const targetW = parseFloat(goalForm.target_weight_kg) || null;

    const { error } = await supabase
      .from("weight_goals" as any)
      .upsert({
        user_id: user.id,
        height_cm: height,
        starting_weight_kg: startW,
        current_weight_kg: startW, // initially same as starting
        target_weight_kg: targetW,
        updated_at: new Date().toISOString(),
      } as any, { onConflict: "user_id" });

    setSavingGoal(false);
    if (error) {
      toast({ variant: "destructive", title: "Errore", description: (error as any).message });
    } else {
      toast({ title: "Obiettivi salvati ✅" });
      setShowGoalForm(false);
      loadData();
    }
  };

  const toggleMetric = (key: string) => {
    setActiveMetrics((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  };

  // Chart data (ascending order)
  const chartData = [...measurements]
    .reverse()
    .map((m) => ({
      date: new Date(m.measured_at).toLocaleDateString("it-IT", { day: "2-digit", month: "short" }),
      ...METRICS.reduce((acc, metric) => {
        acc[metric.key] = (m as any)[metric.key];
        return acc;
      }, {} as any),
    }));

  // Weight progress calculations
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
        <div className="flex justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  return (
    <div>
      <MobileHeader title="Misurazioni" />
      <main className="px-4 py-5 pb-28 space-y-4">

        {/* Weight goals card — Plus only */}
        {plusActive && (
          <Card className="border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
            <CardContent className="py-4 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-foreground flex items-center gap-1.5">
                  <Target className="h-4 w-4 text-primary" /> Obiettivo peso
                </h3>
                <Button size="sm" variant="ghost" className="h-7 text-xs gap-1" onClick={() => setShowGoalForm(!showGoalForm)}>
                  {goal ? "Modifica" : <><Plus className="h-3 w-3" /> Imposta</>}
                </Button>
              </div>

              {showGoalForm && (
                <div className="space-y-2 border-t border-border pt-3">
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="text-[10px] font-medium text-muted-foreground">Altezza (cm)</label>
                      <Input type="number" step="0.1" placeholder="170" value={goalForm.height_cm} onChange={(e) => setGoalForm({ ...goalForm, height_cm: e.target.value })} className="h-8 text-xs" />
                    </div>
                    <div>
                      <label className="text-[10px] font-medium text-muted-foreground">Peso partenza</label>
                      <Input type="number" step="0.1" placeholder="80" value={goalForm.starting_weight_kg} onChange={(e) => setGoalForm({ ...goalForm, starting_weight_kg: e.target.value })} className="h-8 text-xs" />
                    </div>
                    <div>
                      <label className="text-[10px] font-medium text-muted-foreground">Peso obiettivo</label>
                      <Input type="number" step="0.1" placeholder="70" value={goalForm.target_weight_kg} onChange={(e) => setGoalForm({ ...goalForm, target_weight_kg: e.target.value })} className="h-8 text-xs" />
                    </div>
                  </div>
                  <Button size="sm" className="w-full h-8 text-xs gap-1" onClick={handleSaveGoal} disabled={savingGoal}>
                    {savingGoal ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
                    Salva obiettivi
                  </Button>
                </div>
              )}

              {goal && !showGoalForm && (
                <div className="space-y-2.5">
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
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Not Plus — teaser */}
        {!plusActive && (
          <Card className="border border-border bg-muted/30">
            <CardContent className="py-3 flex items-center gap-3">
              <Crown className="h-5 w-5 text-amber-500 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-foreground">Traccia il tuo peso e i progressi</p>
                <p className="text-[10px] text-muted-foreground">Con Plus puoi impostare peso di partenza, obiettivo e monitorare i progressi nel tempo.</p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Add measurement button */}
        <Button className="w-full gap-2" onClick={() => setShowForm(!showForm)}>
          <Plus className="h-4 w-4" /> Nuova misurazione
        </Button>

        {/* Form */}
        {showForm && (
          <Card className="border-2 border-primary/20">
            <CardContent className="py-4 space-y-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground">Data</label>
                <Input type="date" value={form.measured_at} onChange={(e) => setForm({ ...form, measured_at: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Peso (kg)</label>
                  <Input type="number" step="0.1" placeholder="75.5" value={form.weight_kg} onChange={(e) => setForm({ ...form, weight_kg: e.target.value })} />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Body fat (%)</label>
                  <Input type="number" step="0.1" placeholder="18.5" value={form.body_fat_pct} onChange={(e) => setForm({ ...form, body_fat_pct: e.target.value })} />
                </div>
              </div>
              <p className="text-xs font-semibold text-foreground flex items-center gap-1"><Ruler className="h-3.5 w-3.5" /> Circonferenze (cm)</p>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { key: "waist_cm", label: "Vita" },
                  { key: "hips_cm", label: "Fianchi" },
                  { key: "chest_cm", label: "Petto" },
                  { key: "arm_cm", label: "Braccio" },
                  { key: "thigh_cm", label: "Coscia" },
                ].map((f) => (
                  <div key={f.key}>
                    <label className="text-xs font-medium text-muted-foreground">{f.label}</label>
                    <Input type="number" step="0.1" placeholder="0" value={(form as any)[f.key]} onChange={(e) => setForm({ ...form, [f.key]: e.target.value })} />
                  </div>
                ))}
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Note</label>
                <Textarea placeholder="Note opzionali..." value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="min-h-[50px]" />
              </div>
              <Button className="w-full" onClick={handleSave} disabled={saving}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Salva"}
              </Button>
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
              {/* Metric toggles */}
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

export default UserMeasurementsPage;
