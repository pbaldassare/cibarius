import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import MobileHeader from "@/components/MobileHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Send, Flame, ChevronLeft, ChevronRight, MessageSquare, ClipboardList, Activity, Lightbulb, ChefHat } from "lucide-react";

const MEAL_LABELS: Record<string, string> = {
  colazione: "🌅 Colazione",
  pranzo: "🍝 Pranzo",
  cena: "🌙 Cena",
  spuntino: "🍎 Spuntino",
};

const ProClientDetailPage = () => {
  const { clientId } = useParams<{ clientId: string }>();
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [clientProfile, setClientProfile] = useState<any>(null);
  const [targets, setTargets] = useState<any>(null);
  const [dayDate, setDayDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [meals, setMeals] = useState<any[]>([]);
  const [notes, setNotes] = useState<any[]>([]);
  const [newNote, setNewNote] = useState("");
  const [loading, setLoading] = useState(true);
  const [savingNote, setSavingNote] = useState(false);

  useEffect(() => {
    if (!clientId || !user) return;
    const load = async () => {
      setLoading(true);
      const [profileRes, targetsRes, notesRes] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", clientId).single(),
        supabase.from("nutrition_targets").select("*").eq("user_id", clientId).single(),
        supabase.from("professional_notes").select("*").eq("professional_id", user.id).eq("client_user_id", clientId).order("created_at", { ascending: false }).limit(20),
      ]);
      setClientProfile(profileRes.data);
      setTargets(targetsRes.data);
      setNotes(notesRes.data ?? []);
      setLoading(false);
    };
    load();
  }, [clientId, user]);

  // Load meals for selected day
  useEffect(() => {
    if (!clientId) return;
    const loadDay = async () => {
      const { data: dayData } = await supabase
        .from("meal_days")
        .select("id")
        .eq("user_id", clientId)
        .eq("day_date", dayDate)
        .single();

      if (!dayData) {
        setMeals([]);
        return;
      }

      const { data: mealsData } = await supabase
        .from("meals")
        .select("id, meal_type, meal_items(id, custom_name, calories, quantity, unit, macros, product_id, products(name))")
        .eq("meal_day_id", dayData.id)
        .order("created_at");

      setMeals(mealsData ?? []);
    };
    loadDay();
  }, [clientId, dayDate]);

  const shiftDay = (delta: number) => {
    const d = new Date(dayDate);
    d.setDate(d.getDate() + delta);
    setDayDate(d.toISOString().slice(0, 10));
  };

  const totalKcal = meals.reduce((sum, m) => sum + (m.meal_items ?? []).reduce((s: number, i: any) => s + (i.calories ?? 0), 0), 0);
  const totalMacros = meals.reduce(
    (acc, m) => {
      (m.meal_items ?? []).forEach((i: any) => {
        const mac = i.macros as any;
        if (mac) {
          acc.protein += mac.protein ?? 0;
          acc.carbs += mac.carbs ?? 0;
          acc.fats += mac.fats ?? 0;
        }
      });
      return acc;
    },
    { protein: 0, carbs: 0, fats: 0 }
  );

  const handleAddNote = async () => {
    if (!newNote.trim() || !user || !clientId) return;
    setSavingNote(true);
    const { error } = await supabase.from("professional_notes").insert({
      professional_id: user.id,
      client_user_id: clientId,
      note: newNote.trim(),
    });
    setSavingNote(false);
    if (error) {
      toast({ variant: "destructive", title: "Errore", description: error.message });
    } else {
      toast({ title: "Nota aggiunta" });
      setNewNote("");
      // Reload notes
      const { data } = await supabase.from("professional_notes").select("*").eq("professional_id", user!.id).eq("client_user_id", clientId).order("created_at", { ascending: false }).limit(20);
      setNotes(data ?? []);
    }
  };

  if (loading) {
    return (
      <div>
        <MobileHeader title="Dettaglio Cliente" />
        <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
      </div>
    );
  }

  const kcalTarget = targets?.kcal_day ?? 2000;

  return (
    <div>
      <MobileHeader title={clientProfile?.full_name || "Cliente"} />
      <main className="px-4 py-5 pb-28 space-y-4">
        {/* Client info */}
        <div className="flex items-center gap-3">
          <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center text-2xl">👤</div>
          <div>
            <h2 className="text-lg font-bold text-foreground">{clientProfile?.full_name || "Senza nome"}</h2>
            <p className="text-sm text-muted-foreground">{clientProfile?.email}</p>
          </div>
        </div>

        {/* Quick actions */}
        <div className="grid grid-cols-4 gap-2">
          <Button size="sm" variant="outline" className="flex-col h-auto py-2.5 gap-1 text-[10px]" onClick={() => navigate(`/pro/client/${clientId}/plan`)}>
            <ClipboardList className="h-4 w-4" /> Piano
          </Button>
          <Button size="sm" variant="outline" className="flex-col h-auto py-2.5 gap-1 text-[10px]" onClick={() => navigate(`/pro/client/${clientId}/monitor`)}>
            <Activity className="h-4 w-4" /> Monitor
          </Button>
          <Button size="sm" variant="outline" className="flex-col h-auto py-2.5 gap-1 text-[10px]" onClick={() => navigate(`/pro/client/${clientId}/suggest`)}>
            <Lightbulb className="h-4 w-4" /> Suggerisci
          </Button>
          <Button size="sm" variant="outline" className="flex-col h-auto py-2.5 gap-1 text-[10px]" onClick={() => navigate(`/pro/client/${clientId}/pantry`)}>
            <ChefHat className="h-4 w-4" /> Dispensa
          </Button>
        </div>

        <div className="flex items-center justify-between">
          <Button variant="ghost" size="icon" onClick={() => shiftDay(-1)}><ChevronLeft className="h-5 w-5" /></Button>
          <span className="text-sm font-semibold text-foreground">
            {new Date(dayDate + "T00:00:00").toLocaleDateString("it-IT", { weekday: "long", day: "numeric", month: "long" })}
          </span>
          <Button variant="ghost" size="icon" onClick={() => shiftDay(1)}><ChevronRight className="h-5 w-5" /></Button>
        </div>

        {/* Kcal summary */}
        <Card className="border-2 border-accent">
          <CardContent className="py-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Flame className="h-5 w-5 text-primary" />
                <span className="text-sm font-medium text-foreground">Calorie</span>
              </div>
              <span className="text-lg font-bold text-foreground">
                {totalKcal} / {kcalTarget} kcal
              </span>
            </div>
            <Progress value={Math.min((totalKcal / kcalTarget) * 100, 100)} className="h-2" />

            {/* Macros */}
            <div className="grid grid-cols-3 gap-2 text-center">
              {[
                { label: "Proteine", val: totalMacros.protein, target: targets?.protein_g ?? 120, color: "bg-blue-500" },
                { label: "Carbo", val: totalMacros.carbs, target: targets?.carbs_g ?? 220, color: "bg-amber-500" },
                { label: "Grassi", val: totalMacros.fats, target: targets?.fats_g ?? 70, color: "bg-red-500" },
              ].map((m) => (
                <div key={m.label}>
                  <p className="text-xs text-muted-foreground">{m.label}</p>
                  <p className="text-sm font-semibold">{Math.round(m.val)}g / {m.target}g</p>
                  <div className="h-1.5 rounded-full bg-secondary mt-1">
                    <div className={`h-full rounded-full ${m.color}`} style={{ width: `${Math.min((m.val / m.target) * 100, 100)}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Meals */}
        {meals.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">Nessun pasto registrato per questo giorno.</p>
        ) : (
          meals.map((meal) => {
            const items = meal.meal_items ?? [];
            const mealKcal = items.reduce((s: number, i: any) => s + (i.calories ?? 0), 0);
            return (
              <Card key={meal.id} className="border border-border">
                <CardHeader className="pb-1 pt-3 px-4">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm">{MEAL_LABELS[meal.meal_type] || meal.meal_type}</CardTitle>
                    <span className="text-xs text-muted-foreground">{mealKcal} kcal</span>
                  </div>
                </CardHeader>
                <CardContent className="px-4 pb-3 space-y-1">
                  {items.length === 0 ? (
                    <p className="text-xs text-muted-foreground">Vuoto</p>
                  ) : (
                    items.map((item: any) => (
                      <div key={item.id} className="flex items-center justify-between text-xs">
                        <span className="text-foreground truncate max-w-[60%]">
                          {item.custom_name || item.products?.name || "Prodotto"}
                        </span>
                        <span className="text-muted-foreground">{item.calories ?? 0} kcal</span>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>
            );
          })
        )}

        {/* Notes section */}
        <Card className="border-2 border-accent">
          <CardHeader className="flex flex-row items-center gap-3 pb-2">
            <MessageSquare className="h-5 w-5 text-primary" />
            <CardTitle className="text-base">Note</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex gap-2">
              <Textarea
                placeholder="Scrivi una nota per il cliente..."
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                className="min-h-[60px]"
              />
              <Button size="icon" onClick={handleAddNote} disabled={savingNote || !newNote.trim()}>
                {savingNote ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              </Button>
            </div>
            {notes.map((n) => (
              <div key={n.id} className="rounded-lg bg-secondary p-3">
                <p className="text-xs text-muted-foreground mb-1">
                  {new Date(n.created_at).toLocaleDateString("it-IT")} — {new Date(n.created_at).toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" })}
                </p>
                <p className="text-sm text-foreground">{n.note}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default ProClientDetailPage;
