import { useEffect, useState } from "react";
import MobileHeader from "@/components/MobileHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Plus, Ruler, Weight, TrendingUp } from "lucide-react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
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
  const [measurements, setMeasurements] = useState<Measurement[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [activeMetrics, setActiveMetrics] = useState<string[]>(["weight_kg", "waist_cm"]);

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
    const { data } = await supabase
      .from("body_measurements")
      .select("*")
      .eq("user_id", user.id)
      .order("measured_at", { ascending: false })
      .limit(50);
    setMeasurements((data as any[]) ?? []);
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
        {/* Add button */}
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
