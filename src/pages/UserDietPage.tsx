import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import MobileHeader from "@/components/MobileHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import {
  Loader2, Sparkles, ClipboardList, Trophy, Flame, Plus,
  ChevronDown, Lightbulb, BookOpen, Bookmark, Send, Eye,
  UserCheck, ArrowRight, ShoppingCart, CalendarDays, Ruler,
  Search, MapPin, UserPlus,
} from "lucide-react";

const MEAL_LABELS: Record<string, string> = {
  colazione: "☀️ Colazione",
  pranzo: "🌤️ Pranzo",
  cena: "🌙 Cena",
  spuntino: "🍎 Spuntino",
};

const MEAL_ORDER = ["colazione", "pranzo", "spuntino", "cena"];

interface TodayMealData {
  meal_type: string;
  kcal: number;
  protein: number;
  carbs: number;
  fats: number;
}

interface PlanItem {
  id: string;
  meal_type: string;
  food_name: string;
  quantity: number;
  unit: string;
  calories: number;
  protein_g: number;
  carbs_g: number;
  sugars_g: number;
  fats_g: number;
  notes: string | null;
}

interface ProProfile {
  display_name: string;
  specialization: string;
  city: string | null;
  bio: string | null;
  photo_url: string | null;
}

const UserDietPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [plan, setPlan] = useState<any>(null);
  const [mealTargets, setMealTargets] = useState<any[]>([]);
  const [planItems, setPlanItems] = useState<PlanItem[]>([]);
  const [proProfile, setProProfile] = useState<{ full_name: string | null; email: string } | null>(null);
  const [proDetailProfile, setProDetailProfile] = useState<ProProfile | null>(null);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [todayMeals, setTodayMeals] = useState<TodayMealData[]>([]);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [nextAppointment, setNextAppointment] = useState<any>(null);

  // Coach search (when no plan)
  const [coaches, setCoaches] = useState<ProProfile[]>([]);
  const [loadingCoaches, setLoadingCoaches] = useState(false);

  // Self-plan wizard
  const [showSelfPlan, setShowSelfPlan] = useState(false);
  const [selfPlanTitle, setSelfPlanTitle] = useState("Il mio piano");
  const [selfKcal, setSelfKcal] = useState("2000");
  const [selfProtein, setSelfProtein] = useState("120");
  const [selfCarbs, setSelfCarbs] = useState("220");
  const [selfFats, setSelfFats] = useState("70");
  const [selfNotes, setSelfNotes] = useState("");
  const [savingSelfPlan, setSavingSelfPlan] = useState(false);

  // Meal items expand
  const [expandedMeals, setExpandedMeals] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      // 1. Active plan
      const { data: plans } = await supabase
        .from("diet_plans")
        .select("*, diet_plan_meal_targets(*)")
        .eq("client_user_id", user.id)
        .eq("is_active", true)
        .limit(1);

      if (plans && plans.length > 0) {
        const p = plans[0] as any;
        setPlan(p);
        setMealTargets(p.diet_plan_meal_targets || []);

        // Load plan items
        const { data: items } = await supabase
          .from("diet_plan_items")
          .select("*")
          .eq("diet_plan_id", p.id)
          .order("sort_order");
        if (items) setPlanItems(items as any);

        // 2. Pro profile
        const { data: link } = await supabase
          .from("client_links")
          .select("professional_id")
          .eq("client_user_id", user.id)
          .eq("status", "active")
          .limit(1)
          .maybeSingle();

        const proId = link?.professional_id || p.professional_id;
        if (proId && proId !== user.id) {
          const [profRes, proDetailRes] = await Promise.all([
            supabase.from("profiles").select("full_name, email").eq("id", proId).single(),
            supabase.from("professional_profiles").select("display_name, specialization, city, bio, photo_url").eq("user_id", proId).maybeSingle(),
          ]);
          if (profRes.data) setProProfile(profRes.data);
          if (proDetailRes.data) setProDetailProfile(proDetailRes.data as any);
        }
      } else {
        // No plan — load coaches for discovery
        loadCoaches();
      }

      // 3. Today's meals
      const today = new Date().toISOString().slice(0, 10);
      const { data: dayData } = await supabase
        .from("meal_days")
        .select("id, meals(id, meal_type, meal_items(calories, macros))")
        .eq("user_id", user.id)
        .eq("day_date", today)
        .maybeSingle();

      if (dayData) {
        const meals = (dayData as any).meals || [];
        const grouped: TodayMealData[] = meals.map((m: any) => {
          const items = m.meal_items || [];
          return {
            meal_type: m.meal_type,
            kcal: items.reduce((s: number, i: any) => s + (i.calories ?? 0), 0),
            protein: items.reduce((s: number, i: any) => s + ((i.macros as any)?.protein ?? 0), 0),
            carbs: items.reduce((s: number, i: any) => s + ((i.macros as any)?.carbs ?? 0), 0),
            fats: items.reduce((s: number, i: any) => s + ((i.macros as any)?.fats ?? 0), 0),
          };
        });
        setTodayMeals(grouped);
      }

      // 4. Suggestions
      const { data: suggs } = await supabase
        .from("pro_suggestions")
        .select("*")
        .eq("client_user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(10);
      setSuggestions(suggs ?? []);

      // 5. Next appointment
      const { data: appt } = await supabase
        .from("appointments")
        .select("*")
        .eq("client_user_id", user.id)
        .eq("status", "scheduled")
        .gt("starts_at", new Date().toISOString())
        .order("starts_at", { ascending: true })
        .limit(1)
        .maybeSingle();
      setNextAppointment(appt);

      setLoading(false);
    };
    load();
  }, [user]);

  const loadCoaches = async () => {
    setLoadingCoaches(true);
    const { data } = await supabase
      .from("professional_profiles")
      .select("display_name, specialization, city, bio, photo_url")
      .limit(20);
    setCoaches((data ?? []) as any);
    setLoadingCoaches(false);
  };

  const markSeen = async (id: string) => {
    await supabase.from("pro_suggestions").update({ seen_at: new Date().toISOString() }).eq("id", id);
    setSuggestions((prev) => prev.map((s) => (s.id === id ? { ...s, seen_at: new Date().toISOString() } : s)));
  };

  const handleCreateSelfPlan = async () => {
    if (!user) return;
    setSavingSelfPlan(true);
    try {
      const kcal = parseFloat(selfKcal) || 2000;
      const protein = parseFloat(selfProtein) || 120;
      const carbs = parseFloat(selfCarbs) || 220;
      const fats = parseFloat(selfFats) || 70;

      const { data: newPlan, error } = await supabase.from("diet_plans").insert({
        professional_id: user.id,
        client_user_id: user.id,
        title: selfPlanTitle,
        kcal_day: kcal,
        protein_g_day: protein,
        carbs_g_day: carbs,
        fats_g_day: fats,
        notes: selfNotes || null,
        is_active: true,
      }).select().single();

      if (error) throw error;

      // Create nutrition targets
      await supabase.from("nutrition_targets").upsert({
        user_id: user.id, kcal_day: kcal, protein_g: protein, carbs_g: carbs, fats_g: fats,
      }, { onConflict: "user_id" });

      toast({ title: "Piano creato! 🎉" });
      setShowSelfPlan(false);
      // Reload
      window.location.reload();
    } catch (err: any) {
      toast({ variant: "destructive", title: "Errore", description: err?.message });
    }
    setSavingSelfPlan(false);
  };

  const toggleMealExpand = (mealType: string) => {
    setExpandedMeals((prev) => {
      const next = new Set(prev);
      if (next.has(mealType)) next.delete(mealType);
      else next.add(mealType);
      return next;
    });
  };

  // Computed totals
  const todayTotals = useMemo(() => {
    return todayMeals.reduce(
      (acc, m) => ({ kcal: acc.kcal + m.kcal, protein: acc.protein + m.protein, carbs: acc.carbs + m.carbs, fats: acc.fats + m.fats }),
      { kcal: 0, protein: 0, carbs: 0, fats: 0 }
    );
  }, [todayMeals]);

  const insight = useMemo(() => {
    if (!plan) return null;
    const remaining = {
      kcal: plan.kcal_day - todayTotals.kcal,
      protein: plan.protein_g_day - todayTotals.protein,
      carbs: plan.carbs_g_day - todayTotals.carbs,
      fats: plan.fats_g_day - todayTotals.fats,
    };
    const loggedTypes = todayMeals.map((m) => m.meal_type);
    const targetTypes = mealTargets.map((t: any) => t.meal_type);
    const missingMeals = targetTypes.filter((t: string) => !loggedTypes.includes(t));

    if (missingMeals.length > 0 && missingMeals.length <= 2) {
      const names = missingMeals.map((t: string) => MEAL_LABELS[t]?.replace(/^..\s/, "") || t).join(" e ");
      return { icon: "🍽️", text: `Non hai ancora registrato: ${names}. Aggiungili per completare la giornata!` };
    }
    if (remaining.protein > 15) return { icon: "💪", text: `Ti mancano ancora ~${Math.round(remaining.protein)}g di proteine oggi.` };
    if (remaining.carbs < -20) return { icon: "⚡", text: `Oggi sei alto di carbo (+${Math.round(Math.abs(remaining.carbs))}g).` };
    if (remaining.fats < -10) return { icon: "🫒", text: `Grassi un po' sopra target (+${Math.round(Math.abs(remaining.fats))}g).` };
    if (remaining.kcal > 0 && remaining.kcal < plan.kcal_day * 0.3) return { icon: "🎯", text: `Sei in pista! Mancano solo ${Math.round(remaining.kcal)} kcal.` };
    if (remaining.kcal <= 0) return { icon: "✅", text: `Hai raggiunto il tuo obiettivo calorico! Complimenti.` };
    return null;
  }, [plan, todayTotals, todayMeals, mealTargets]);

  if (loading) {
    return (
      <div>
        <MobileHeader title="Il mio piano" />
        <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
      </div>
    );
  }

  if (!plan) {
    return (
      <div>
        <MobileHeader title="Il mio piano" />
        <main className="px-4 py-10 space-y-6">
          <div className="text-center space-y-4">
            <ClipboardList className="h-12 w-12 text-muted-foreground mx-auto" />
            <p className="text-muted-foreground">Nessun piano nutrizionale attivo.</p>
            <div className="flex flex-col gap-2">
              <Button variant="outline" onClick={() => navigate("/invite")} className="gap-2">
                <Sparkles className="h-4 w-4" /> Collega un professionista
              </Button>
              <Button onClick={() => setShowSelfPlan(true)} className="gap-2">
                <Plus className="h-4 w-4" /> Crea il tuo piano
              </Button>
            </div>
          </div>

          {/* Coach discovery */}
          <div className="space-y-3">
            <h3 className="text-sm font-bold text-foreground flex items-center gap-1.5">
              <Search className="h-4 w-4 text-primary" /> Cerca un professionista
            </h3>
            {loadingCoaches ? (
              <div className="flex justify-center py-6"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
            ) : coaches.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center">Nessun professionista disponibile al momento.</p>
            ) : (
              <div className="space-y-2">
                {coaches.map((coach, idx) => (
                  <Card key={idx} className="border border-border">
                    <CardContent className="py-3 flex items-start gap-3">
                      <Avatar className="h-10 w-10 border border-primary/20">
                        {coach.photo_url && <AvatarImage src={coach.photo_url} />}
                        <AvatarFallback className="bg-primary/10 text-primary text-xs font-bold">
                          {coach.display_name.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-foreground">{coach.display_name}</p>
                        {coach.specialization && (
                          <Badge variant="outline" className="text-[9px] mt-0.5">{coach.specialization}</Badge>
                        )}
                        {coach.city && (
                          <p className="text-[10px] text-muted-foreground flex items-center gap-0.5 mt-0.5">
                            <MapPin className="h-2.5 w-2.5" /> {coach.city}
                          </p>
                        )}
                        {coach.bio && (
                          <p className="text-[10px] text-muted-foreground mt-1 line-clamp-2">{coach.bio}</p>
                        )}
                      </div>
                      <Button size="sm" variant="outline" className="h-7 text-[10px] gap-1 shrink-0" onClick={() => navigate("/invite")}>
                        <UserPlus className="h-3 w-3" /> Contatta
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </main>

        {/* Self-plan dialog */}
        <Dialog open={showSelfPlan} onOpenChange={setShowSelfPlan}>
          <DialogContent>
            <DialogHeader><DialogTitle>Crea il tuo piano</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-muted-foreground">Titolo</label>
                <Input value={selfPlanTitle} onChange={(e) => setSelfPlanTitle(e.target.value)} />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs text-muted-foreground">Kcal/giorno</label>
                  <Input type="number" value={selfKcal} onChange={(e) => setSelfKcal(e.target.value)} />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Proteine (g)</label>
                  <Input type="number" value={selfProtein} onChange={(e) => setSelfProtein(e.target.value)} />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Carboidrati (g)</label>
                  <Input type="number" value={selfCarbs} onChange={(e) => setSelfCarbs(e.target.value)} />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Grassi (g)</label>
                  <Input type="number" value={selfFats} onChange={(e) => setSelfFats(e.target.value)} />
                </div>
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Note (opzionale)</label>
                <Textarea value={selfNotes} onChange={(e) => setSelfNotes(e.target.value)} rows={3} />
              </div>
            </div>
            <DialogFooter>
              <Button onClick={handleCreateSelfPlan} disabled={savingSelfPlan} className="w-full">
                {savingSelfPlan ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Crea piano
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  const kcalPct = plan.kcal_day > 0 ? Math.min((todayTotals.kcal / plan.kcal_day) * 100, 100) : 0;
  const proteinPct = plan.protein_g_day > 0 ? Math.min((todayTotals.protein / plan.protein_g_day) * 100, 100) : 0;
  const carbsPct = plan.carbs_g_day > 0 ? Math.min((todayTotals.carbs / plan.carbs_g_day) * 100, 100) : 0;
  const fatsPct = plan.fats_g_day > 0 ? Math.min((todayTotals.fats / plan.fats_g_day) * 100, 100) : 0;

  const isSelfPlan = plan.professional_id === plan.client_user_id;
  const proInitials = proProfile?.full_name
    ? proProfile.full_name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2)
    : proDetailProfile?.display_name
    ? proDetailProfile.display_name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2)
    : "PR";
  const proDisplayName = proDetailProfile?.display_name || proProfile?.full_name || proProfile?.email || "Il tuo coach";

  const kcalRemaining = plan.kcal_day - todayTotals.kcal;

  return (
    <div>
      <MobileHeader title="Il mio piano" />
      <main className="px-4 py-5 pb-28 space-y-4">

        {/* ═══ 1. PROFESSIONAL CARD ═══ */}
        {!isSelfPlan && proProfile && (
          <Card className="border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
            <CardContent className="py-4">
              <div className="flex items-center gap-3">
                <Avatar className="h-11 w-11 border-2 border-primary/30">
                  {proDetailProfile?.photo_url && <AvatarImage src={proDetailProfile.photo_url} />}
                  <AvatarFallback className="bg-primary/10 text-primary font-bold text-sm">{proInitials}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-muted-foreground">Il tuo coach</p>
                  <p className="text-sm font-bold text-foreground truncate">Dott. {proDisplayName}</p>
                  {proDetailProfile?.specialization && (
                    <p className="text-[10px] text-muted-foreground">{proDetailProfile.specialization}</p>
                  )}
                </div>
                <Badge className="bg-emerald-500/15 text-emerald-700 border-emerald-500/30 gap-1 text-[10px]">
                  <UserCheck className="h-3 w-3" /> Collegato
                </Badge>
              </div>
            </CardContent>
          </Card>
        )}

        {isSelfPlan && (
          <Card className="border-2 border-amber-500/20 bg-amber-500/5">
            <CardContent className="py-3 flex items-center gap-2">
              <ClipboardList className="h-4 w-4 text-amber-600" />
              <p className="text-xs text-foreground font-medium">Piano personale (senza coach)</p>
              <Button size="sm" variant="ghost" className="ml-auto h-6 text-[10px]" onClick={() => navigate("/invite")}>
                Collega un coach
              </Button>
            </CardContent>
          </Card>
        )}

        {/* ═══ 2. TODAY'S PROGRESS ═══ */}
        <Card className="border-2 border-primary/20">
          <CardContent className="py-4 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-foreground flex items-center gap-1.5">
                <Flame className="h-4 w-4 text-primary" /> Obiettivo di oggi
              </h2>
              <span className={`text-xs font-bold ${kcalRemaining >= 0 ? "text-primary" : "text-destructive"}`}>
                {kcalRemaining >= 0
                  ? `${Math.round(kcalRemaining)} kcal rimanenti`
                  : `+${Math.round(Math.abs(kcalRemaining))} kcal in eccesso`}
              </span>
            </div>

            <div className="space-y-1">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>{Math.round(todayTotals.kcal)} kcal</span>
                <span>{plan.kcal_day} kcal</span>
              </div>
              <Progress value={kcalPct} className="h-3" />
            </div>

            <div className="grid grid-cols-3 gap-3">
              <MacroBar label="Proteine" current={todayTotals.protein} target={plan.protein_g_day} pct={proteinPct} color="bg-blue-500" />
              <MacroBar label="Carbo" current={todayTotals.carbs} target={plan.carbs_g_day} pct={carbsPct} color="bg-amber-500" />
              <MacroBar label="Grassi" current={todayTotals.fats} target={plan.fats_g_day} pct={fatsPct} color="bg-rose-400" />
            </div>

            <Collapsible open={detailsOpen} onOpenChange={setDetailsOpen}>
              <CollapsibleTrigger className="flex items-center gap-1 text-xs text-muted-foreground font-medium w-full justify-center pt-1">
                Dettagli piano <ChevronDown className={`h-3.5 w-3.5 transition-transform ${detailsOpen ? "rotate-180" : ""}`} />
              </CollapsibleTrigger>
              <CollapsibleContent className="pt-3 space-y-1">
                <div className="grid grid-cols-4 gap-2 text-center">
                  <DetailBox label="kcal" value={plan.kcal_day} className="text-primary" />
                  <DetailBox label="proteine" value={`${plan.protein_g_day}g`} className="text-blue-600" />
                  <DetailBox label="carbo" value={`${plan.carbs_g_day}g`} className="text-amber-600" />
                  <DetailBox label="grassi" value={`${plan.fats_g_day}g`} className="text-rose-500" />
                </div>
                {plan.notes && (
                  <p className="text-[11px] text-muted-foreground italic pt-2 border-t border-border mt-2">📝 {plan.notes}</p>
                )}
              </CollapsibleContent>
            </Collapsible>
          </CardContent>
        </Card>

        {/* ═══ 3. DAILY INSIGHT ═══ */}
        {insight && (
          <Card className="border border-amber-500/30 bg-amber-500/5">
            <CardContent className="py-3 flex items-start gap-2.5">
              <Lightbulb className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
              <div>
                <p className="text-xs font-semibold text-foreground">Consiglio di oggi</p>
                <p className="text-xs text-muted-foreground mt-0.5">{insight.icon} {insight.text}</p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* ═══ SMART RECIPES CTA ═══ */}
        <Card className="border-2 border-primary/20 bg-gradient-to-r from-primary/5 to-primary/10 cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate("/my-recipes")}>
          <CardContent className="py-3.5 flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-primary/15 flex items-center justify-center shrink-0">
              <Sparkles className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-foreground">Genera ricette smart</p>
              <p className="text-[11px] text-muted-foreground">Crea ricette bilanciate con quello che hai in dispensa</p>
            </div>
            <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />
          </CardContent>
        </Card>

        {/* ═══ NEXT APPOINTMENT ═══ */}
        {nextAppointment && (
          <Card className="border-2 border-primary/20 bg-primary/5">
            <CardContent className="py-3.5 flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-primary/15 flex items-center justify-center shrink-0">
                <CalendarDays className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-muted-foreground">Prossimo appuntamento</p>
                <p className="text-sm font-bold text-foreground">{nextAppointment.title}</p>
                <p className="text-xs text-muted-foreground">
                  {new Date(nextAppointment.starts_at).toLocaleDateString("it-IT", { weekday: "long", day: "numeric", month: "long" })}
                  {" alle "}
                  {new Date(nextAppointment.starts_at).toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" })}
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* ═══ QUICK ACTIONS GRID ═══ */}
        <div className="grid grid-cols-3 gap-3">
          <Card className="border border-border cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate("/shopping-list")}>
            <CardContent className="py-3.5 flex flex-col items-center gap-2">
              <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center"><ShoppingCart className="h-5 w-5 text-primary" /></div>
              <p className="text-xs font-bold text-foreground text-center">Lista spesa</p>
            </CardContent>
          </Card>
          <Card className="border border-border cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate("/messages")}>
            <CardContent className="py-3.5 flex flex-col items-center gap-2">
              <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center"><Send className="h-5 w-5 text-primary" /></div>
              <p className="text-xs font-bold text-foreground text-center">Chat coach</p>
            </CardContent>
          </Card>
          <Card className="border border-border cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate("/measurements")}>
            <CardContent className="py-3.5 flex flex-col items-center gap-2">
              <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center"><Ruler className="h-5 w-5 text-primary" /></div>
              <p className="text-xs font-bold text-foreground text-center">Misurazioni</p>
            </CardContent>
          </Card>
        </div>

        {/* ═══ 4. MEAL TARGETS with food items ═══ */}
        <div className="space-y-2">
          <h3 className="text-sm font-bold text-foreground">🍽️ Posologia per pasto</h3>
          {mealTargets
            .sort((a: any, b: any) => MEAL_ORDER.indexOf(a.meal_type) - MEAL_ORDER.indexOf(b.meal_type))
            .map((mt: any) => {
              const logged = todayMeals.find((m) => m.meal_type === mt.meal_type);
              const eaten = logged?.kcal ?? 0;
              const diff = mt.kcal_target - eaten;
              const pct = mt.kcal_target > 0 ? Math.min((eaten / mt.kcal_target) * 100, 100) : 0;
              const mealFoods = planItems.filter((i) => i.meal_type === mt.meal_type);
              const isExpanded = expandedMeals.has(mt.meal_type);

              let statusColor = "bg-emerald-500/15 text-emerald-700 border-emerald-500/30";
              let statusText = "In target";
              if (!logged || eaten === 0) {
                statusColor = "bg-muted text-muted-foreground border-border";
                statusText = "Da registrare";
              } else if (diff > mt.kcal_target * 0.3) {
                statusColor = "bg-amber-500/15 text-amber-700 border-amber-500/30";
                statusText = `Mancano ${Math.round(diff)} kcal`;
              } else if (diff < -mt.kcal_target * 0.15) {
                statusColor = "bg-destructive/10 text-destructive border-destructive/30";
                statusText = `+${Math.round(Math.abs(diff))} kcal sopra`;
              }

              return (
                <Card key={mt.id || mt.meal_type} className="border border-border">
                  <CardContent className="py-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold text-foreground">{MEAL_LABELS[mt.meal_type] || mt.meal_type}</span>
                      <Badge className={`text-[10px] ${statusColor}`}>{statusText}</Badge>
                    </div>
                    <Progress value={pct} className="h-1.5" />
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-muted-foreground">
                        {Math.round(eaten)} / {mt.kcal_target} kcal · P{mt.protein_g} C{mt.carbs_g}{mt.sugars_g > 0 ? ` (Z${mt.sugars_g})` : ""} G{mt.fats_g}
                      </span>
                      <Button size="sm" variant="ghost" className="h-6 text-[10px] text-primary gap-1 px-2" onClick={() => navigate("/meals")}>
                        <Plus className="h-3 w-3" /> Aggiungi
                      </Button>
                    </div>

                    {/* Food items collapsible */}
                    {mealFoods.length > 0 && (
                      <Collapsible open={isExpanded} onOpenChange={() => toggleMealExpand(mt.meal_type)}>
                        <CollapsibleTrigger className="flex items-center gap-1 text-[10px] text-primary font-medium w-full pt-1">
                          <ChevronDown className={`h-3 w-3 transition-transform ${isExpanded ? "rotate-180" : ""}`} />
                          {mealFoods.length} aliment{mealFoods.length === 1 ? "o" : "i"} prescritti
                        </CollapsibleTrigger>
                        <CollapsibleContent className="pt-2 space-y-1">
                          {mealFoods.map((item) => (
                            <div key={item.id} className="rounded-lg bg-secondary/40 px-2.5 py-1.5">
                              <div className="flex items-center justify-between">
                                <p className="text-[11px] font-medium text-foreground">{item.food_name}</p>
                                <p className="text-[10px] text-muted-foreground">{item.calories} kcal</p>
                              </div>
                              <p className="text-[9px] text-muted-foreground">
                                {item.quantity}{item.unit} · P:{item.protein_g}g C:{item.carbs_g}g{item.sugars_g > 0 ? ` (Z:${item.sugars_g}g)` : ""} G:{item.fats_g}g
                                {item.notes ? ` · ${item.notes}` : ""}
                              </p>
                            </div>
                          ))}
                        </CollapsibleContent>
                      </Collapsible>
                    )}
                  </CardContent>
                </Card>
              );
            })}
        </div>

        {/* ═══ 5. SUGGESTIONS ═══ */}
        {suggestions.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-sm font-bold text-foreground flex items-center gap-1.5">
              <Sparkles className="h-4 w-4 text-primary" /> Ricette consigliate
            </h3>
            {suggestions.map((s) => {
              const p = s.payload as any;
              const isRecipe = s.type === "recipe" && p?.ingredients;
              const isNew = !s.seen_at;
              const topIngredients = isRecipe ? (p.ingredients ?? []).slice(0, 3).map((i: any) => i.name).join(", ") : "";
              const moreCount = isRecipe ? Math.max(0, (p.ingredients ?? []).length - 3) : 0;

              return (
                <Card key={s.id} className={`border overflow-hidden ${isNew ? "border-primary/30 shadow-sm" : "border-border opacity-80"}`}>
                  <CardContent className="py-3 space-y-2.5">
                    <div className="flex items-start gap-2">
                      <span className="text-lg mt-0.5">{isRecipe ? "👨‍🍳" : s.type === "food" ? "🍎" : "💬"}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <p className="text-sm font-bold text-foreground truncate">{p?.title || p?.name || "Suggerimento"}</p>
                          {isNew && <Badge className="bg-primary/15 text-primary border-primary/30 text-[9px] px-1.5">Nuovo</Badge>}
                        </div>
                        <p className="text-[10px] text-muted-foreground mt-0.5">{new Date(s.created_at).toLocaleDateString("it-IT")}</p>
                      </div>
                    </div>
                    {isRecipe && p?.kcal_total && (
                      <div className="flex gap-3 text-[10px] text-muted-foreground">
                        <span className="flex items-center gap-0.5 font-medium"><Flame className="h-3 w-3 text-primary" /> {p.kcal_total} kcal</span>
                        {p.macros && (<><span>P: {p.macros.protein}g</span><span>C: {p.macros.carbs}g</span><span>G: {p.macros.fats}g</span></>)}
                      </div>
                    )}
                    {isRecipe && topIngredients && (
                      <p className="text-[10px] text-muted-foreground">🧾 {topIngredients}{moreCount > 0 ? ` + altri ${moreCount}` : ""}</p>
                    )}
                    {isRecipe && (
                      <div className="flex items-center gap-2 pt-1">
                        <Button size="sm" variant="default" className="h-7 text-[11px] gap-1 flex-1" onClick={() => navigate("/meals")}>
                          <Plus className="h-3 w-3" /> Aggiungi al pasto
                        </Button>
                        <Button size="sm" variant="outline" className="h-7 text-[11px] gap-1 px-2.5"><BookOpen className="h-3 w-3" /> Apri</Button>
                        <Button size="sm" variant="ghost" className="h-7 text-[11px] gap-1 px-2"><Bookmark className="h-3 w-3" /> Salva</Button>
                      </div>
                    )}
                    {isNew && (
                      <button onClick={() => markSeen(s.id)} className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground transition-colors pt-1">
                        <Eye className="h-3 w-3" /> Segna come letto
                      </button>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
};

/* ── Small helper components ── */
function MacroBar({ label, current, target, pct, color }: { label: string; current: number; target: number; pct: number; color: string; }) {
  const remaining = target - current;
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-[10px] text-muted-foreground">
        <span className="font-medium">{label}</span>
        <span>{remaining >= 0 ? `${Math.round(remaining)}g` : `+${Math.round(Math.abs(remaining))}g`}</span>
      </div>
      <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${Math.min(pct, 100)}%` }} />
      </div>
    </div>
  );
}

function DetailBox({ label, value, className }: { label: string; value: string | number; className?: string }) {
  return (
    <div className="rounded-lg bg-secondary/60 p-2">
      <p className={`text-lg font-bold ${className}`}>{value}</p>
      <p className="text-[10px] text-muted-foreground">{label}</p>
    </div>
  );
}

export default UserDietPage;
