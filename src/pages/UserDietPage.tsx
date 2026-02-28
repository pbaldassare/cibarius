import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import MobileHeader from "@/components/MobileHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import {
  Loader2, Sparkles, ClipboardList, Trophy, Flame, Plus,
  ChevronDown, Lightbulb, BookOpen, Bookmark, Send, Eye,
  UserCheck, ArrowRight, ShoppingCart, CalendarDays,
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

const UserDietPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [plan, setPlan] = useState<any>(null);
  const [mealTargets, setMealTargets] = useState<any[]>([]);
  const [proProfile, setProProfile] = useState<{ full_name: string | null; email: string } | null>(null);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [todayMeals, setTodayMeals] = useState<TodayMealData[]>([]);
  const [detailsOpen, setDetailsOpen] = useState(false);

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

        // 2. Pro profile via client_links -> profiles
        const { data: link } = await supabase
          .from("client_links")
          .select("professional_id")
          .eq("client_user_id", user.id)
          .eq("status", "active")
          .limit(1)
          .maybeSingle();

        const proId = link?.professional_id || p.professional_id;
        if (proId) {
          const { data: prof } = await supabase
            .from("profiles")
            .select("full_name, email")
            .eq("id", proId)
            .single();
          if (prof) setProProfile(prof);
        }
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

      setLoading(false);
    };
    load();
  }, [user]);

  const markSeen = async (id: string) => {
    await supabase.from("pro_suggestions").update({ seen_at: new Date().toISOString() }).eq("id", id);
    setSuggestions((prev) => prev.map((s) => (s.id === id ? { ...s, seen_at: new Date().toISOString() } : s)));
  };

  // Computed totals
  const todayTotals = useMemo(() => {
    return todayMeals.reduce(
      (acc, m) => ({
        kcal: acc.kcal + m.kcal,
        protein: acc.protein + m.protein,
        carbs: acc.carbs + m.carbs,
        fats: acc.fats + m.fats,
      }),
      { kcal: 0, protein: 0, carbs: 0, fats: 0 }
    );
  }, [todayMeals]);

  // Daily insight
  const insight = useMemo(() => {
    if (!plan) return null;
    const remaining = {
      kcal: plan.kcal_day - todayTotals.kcal,
      protein: plan.protein_g_day - todayTotals.protein,
      carbs: plan.carbs_g_day - todayTotals.carbs,
      fats: plan.fats_g_day - todayTotals.fats,
    };

    // Check missing meals
    const loggedTypes = todayMeals.map((m) => m.meal_type);
    const targetTypes = mealTargets.map((t: any) => t.meal_type);
    const missingMeals = targetTypes.filter((t: string) => !loggedTypes.includes(t));

    if (missingMeals.length > 0 && missingMeals.length <= 2) {
      const names = missingMeals.map((t: string) => MEAL_LABELS[t]?.replace(/^..\s/, "") || t).join(" e ");
      return { icon: "🍽️", text: `Non hai ancora registrato: ${names}. Aggiungili per completare la giornata!` };
    }
    if (remaining.protein > 15) {
      return { icon: "💪", text: `Ti mancano ancora ~${Math.round(remaining.protein)}g di proteine oggi. Prova un petto di pollo o yogurt greco!` };
    }
    if (remaining.carbs < -20) {
      return { icon: "⚡", text: `Oggi sei alto di carbo (+${Math.round(Math.abs(remaining.carbs))}g). Bilancia con proteine e verdure nei prossimi pasti.` };
    }
    if (remaining.fats < -10) {
      return { icon: "🫒", text: `Grassi un po' sopra target (+${Math.round(Math.abs(remaining.fats))}g). Prova a preferire cotture leggere.` };
    }
    if (remaining.kcal > 0 && remaining.kcal < plan.kcal_day * 0.3) {
      return { icon: "🎯", text: `Sei in pista! Mancano solo ${Math.round(remaining.kcal)} kcal per centrare l'obiettivo.` };
    }
    if (remaining.kcal <= 0) {
      return { icon: "✅", text: `Hai raggiunto il tuo obiettivo calorico! Complimenti per la costanza.` };
    }
    return null;
  }, [plan, todayTotals, todayMeals, mealTargets]);

  if (loading) {
    return (
      <div>
        <MobileHeader title="Il mio piano" />
        <div className="flex justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  if (!plan) {
    return (
      <div>
        <MobileHeader title="Il mio piano" />
        <main className="px-4 py-10 text-center space-y-4">
          <ClipboardList className="h-12 w-12 text-muted-foreground mx-auto" />
          <p className="text-muted-foreground">Nessun piano nutrizionale attivo.</p>
          <Button variant="outline" onClick={() => navigate("/invite")} className="gap-2">
            <Sparkles className="h-4 w-4" /> Collega un professionista
          </Button>
        </main>
      </div>
    );
  }

  const kcalPct = plan.kcal_day > 0 ? Math.min((todayTotals.kcal / plan.kcal_day) * 100, 100) : 0;
  const proteinPct = plan.protein_g_day > 0 ? Math.min((todayTotals.protein / plan.protein_g_day) * 100, 100) : 0;
  const carbsPct = plan.carbs_g_day > 0 ? Math.min((todayTotals.carbs / plan.carbs_g_day) * 100, 100) : 0;
  const fatsPct = plan.fats_g_day > 0 ? Math.min((todayTotals.fats / plan.fats_g_day) * 100, 100) : 0;

  const proInitials = proProfile?.full_name
    ? proProfile.full_name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2)
    : "PR";
  const proDisplayName = proProfile?.full_name || proProfile?.email || "Il tuo coach";

  const kcalRemaining = plan.kcal_day - todayTotals.kcal;

  return (
    <div>
      <MobileHeader title="Il mio piano" />
      <main className="px-4 py-5 pb-28 space-y-4">

        {/* ═══ 1. PROFESSIONAL CARD ═══ */}
        <Card className="border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
          <CardContent className="py-4">
            <div className="flex items-center gap-3">
              <Avatar className="h-11 w-11 border-2 border-primary/30">
                <AvatarFallback className="bg-primary/10 text-primary font-bold text-sm">
                  {proInitials}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-muted-foreground">Il tuo coach</p>
                <p className="text-sm font-bold text-foreground truncate">
                  Dott. {proDisplayName}
                </p>
              </div>
              <Badge className="bg-emerald-500/15 text-emerald-700 border-emerald-500/30 gap-1 text-[10px]">
                <UserCheck className="h-3 w-3" /> Collegato
              </Badge>
            </div>
          </CardContent>
        </Card>

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

            {/* Kcal main bar */}
            <div className="space-y-1">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>{Math.round(todayTotals.kcal)} kcal</span>
                <span>{plan.kcal_day} kcal</span>
              </div>
              <Progress value={kcalPct} className="h-3" />
            </div>

            {/* Macro mini bars */}
            <div className="grid grid-cols-3 gap-3">
              <MacroBar label="Proteine" current={todayTotals.protein} target={plan.protein_g_day} pct={proteinPct} color="bg-blue-500" />
              <MacroBar label="Carbo" current={todayTotals.carbs} target={plan.carbs_g_day} pct={carbsPct} color="bg-amber-500" />
              <MacroBar label="Grassi" current={todayTotals.fats} target={plan.fats_g_day} pct={fatsPct} color="bg-rose-400" />
            </div>

            {/* Expandable details */}
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
                  <p className="text-[11px] text-muted-foreground italic pt-2 border-t border-border mt-2">
                    📝 {plan.notes}
                  </p>
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
        <Card
          className="border-2 border-primary/20 bg-gradient-to-r from-primary/5 to-primary/10 cursor-pointer hover:shadow-md transition-shadow"
          onClick={() => navigate("/my-recipes")}
        >
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

        {/* ═══ SHOPPING LIST + APPOINTMENTS ═══ */}
        <div className="grid grid-cols-2 gap-3">
          <Card
            className="border border-border cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => navigate("/shopping-list")}
          >
            <CardContent className="py-3.5 flex flex-col items-center gap-2">
              <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center">
                <ShoppingCart className="h-5 w-5 text-primary" />
              </div>
              <p className="text-xs font-bold text-foreground text-center">Lista della spesa</p>
            </CardContent>
          </Card>
          <Card
            className="border border-border cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => navigate("/messages")}
          >
            <CardContent className="py-3.5 flex flex-col items-center gap-2">
              <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center">
                <Send className="h-5 w-5 text-primary" />
              </div>
              <p className="text-xs font-bold text-foreground text-center">Chat col coach</p>
            </CardContent>
          </Card>
        </div>

        {/* ═══ 4. MEAL TARGETS – ACTION-ORIENTED ═══ */}
        <div className="space-y-2">
          <h3 className="text-sm font-bold text-foreground">🍽️ Posologia per pasto</h3>
          {mealTargets
            .sort((a: any, b: any) => MEAL_ORDER.indexOf(a.meal_type) - MEAL_ORDER.indexOf(b.meal_type))
            .map((mt: any) => {
              const logged = todayMeals.find((m) => m.meal_type === mt.meal_type);
              const eaten = logged?.kcal ?? 0;
              const diff = mt.kcal_target - eaten;
              const pct = mt.kcal_target > 0 ? Math.min((eaten / mt.kcal_target) * 100, 100) : 0;

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
                <Card key={mt.id} className="border border-border">
                  <CardContent className="py-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold text-foreground">
                        {MEAL_LABELS[mt.meal_type] || mt.meal_type}
                      </span>
                      <Badge className={`text-[10px] ${statusColor}`}>{statusText}</Badge>
                    </div>
                    <Progress value={pct} className="h-1.5" />
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-muted-foreground">
                        {Math.round(eaten)} / {mt.kcal_target} kcal · P{mt.protein_g} C{mt.carbs_g} G{mt.fats_g}
                      </span>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-6 text-[10px] text-primary gap-1 px-2"
                        onClick={() => navigate("/meals")}
                      >
                        <Plus className="h-3 w-3" /> Aggiungi
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
        </div>

        {/* ═══ 5. SUGGESTIONS – WOW ═══ */}
        {suggestions.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-sm font-bold text-foreground flex items-center gap-1.5">
              <Sparkles className="h-4 w-4 text-primary" /> Ricette consigliate
            </h3>
            {suggestions.map((s) => {
              const p = s.payload as any;
              const isRecipe = s.type === "recipe" && p?.ingredients;
              const isNew = !s.seen_at;
              const topIngredients = isRecipe
                ? (p.ingredients ?? []).slice(0, 3).map((i: any) => i.name).join(", ")
                : "";
              const moreCount = isRecipe ? Math.max(0, (p.ingredients ?? []).length - 3) : 0;

              return (
                <Card
                  key={s.id}
                  className={`border overflow-hidden ${isNew ? "border-primary/30 shadow-sm" : "border-border opacity-80"}`}
                >
                  <CardContent className="py-3 space-y-2.5">
                    {/* Top row */}
                    <div className="flex items-start gap-2">
                      <span className="text-lg mt-0.5">{isRecipe ? "👨‍🍳" : s.type === "food" ? "🍎" : "💬"}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <p className="text-sm font-bold text-foreground truncate">
                            {p?.title || p?.name || "Suggerimento"}
                          </p>
                          {isNew && (
                            <Badge className="bg-primary/15 text-primary border-primary/30 text-[9px] px-1.5">
                              Nuovo
                            </Badge>
                          )}
                        </div>
                        {p?.goal && (
                          <Badge variant="outline" className="text-[9px] mt-0.5 capitalize">
                            {p.goal === "high_protein" ? "High Protein" :
                             p.goal === "low_carb" ? "Low Carb" :
                             p.goal === "low_fat" ? "Low Fat" :
                             p.goal === "deficit" ? "Deficit" :
                             p.goal === "surplus" ? "Massa" : "Equilibrio"}
                          </Badge>
                        )}
                        <p className="text-[10px] text-muted-foreground mt-0.5">
                          {new Date(s.created_at).toLocaleDateString("it-IT")}
                        </p>
                      </div>
                      {p?.fit_score && (
                        <div className="flex flex-col items-center shrink-0">
                          <div className="relative h-10 w-10 flex items-center justify-center">
                            <svg className="h-10 w-10 -rotate-90" viewBox="0 0 36 36">
                              <path className="text-muted/30" stroke="currentColor" strokeWidth="3" fill="none"
                                d="M18 2.5a15.5 15.5 0 1 1 0 31 15.5 15.5 0 0 1 0-31" />
                              <path className="text-emerald-500" stroke="currentColor" strokeWidth="3" fill="none"
                                strokeDasharray={`${(p.fit_score / 100) * 97.4}, 97.4`}
                                d="M18 2.5a15.5 15.5 0 1 1 0 31 15.5 15.5 0 0 1 0-31" />
                            </svg>
                            <span className="absolute text-[10px] font-bold text-foreground">{p.fit_score}%</span>
                          </div>
                          <span className="text-[8px] text-muted-foreground font-medium">Fit</span>
                        </div>
                      )}
                    </div>

                    {/* Why note */}
                    {isRecipe && p?.notes && (
                      <p className="text-[11px] text-muted-foreground italic bg-secondary/50 rounded-lg px-2.5 py-1.5">
                        💡 {p.notes}
                      </p>
                    )}

                    {/* Macros comparison */}
                    {isRecipe && p?.kcal_total && (
                      <div className="flex gap-3 text-[10px] text-muted-foreground">
                        <span className="flex items-center gap-0.5 font-medium">
                          <Flame className="h-3 w-3 text-primary" /> {p.kcal_total} kcal
                        </span>
                        {p.macros && (
                          <>
                            <span>P: {p.macros.protein}g</span>
                            <span>C: {p.macros.carbs}g</span>
                            <span>G: {p.macros.fats}g</span>
                          </>
                        )}
                      </div>
                    )}

                    {/* Top ingredients */}
                    {isRecipe && topIngredients && (
                      <p className="text-[10px] text-muted-foreground">
                        🧾 {topIngredients}{moreCount > 0 ? ` + altri ${moreCount}` : ""}
                      </p>
                    )}

                    {/* Food details */}
                    {!isRecipe && p?.calories != null && (
                      <p className="text-[10px] text-muted-foreground">
                        {p.calories} kcal · {p.quantity}{p.unit}
                      </p>
                    )}

                    {/* CTA buttons */}
                    {isRecipe && (
                      <div className="flex items-center gap-2 pt-1">
                        <Button
                          size="sm"
                          variant="default"
                          className="h-7 text-[11px] gap-1 flex-1"
                          onClick={() => navigate("/meals")}
                        >
                          <Plus className="h-3 w-3" /> Aggiungi al pasto
                        </Button>
                        <Button size="sm" variant="outline" className="h-7 text-[11px] gap-1 px-2.5">
                          <BookOpen className="h-3 w-3" /> Apri
                        </Button>
                        <Button size="sm" variant="ghost" className="h-7 text-[11px] gap-1 px-2">
                          <Bookmark className="h-3 w-3" /> Salva
                        </Button>
                      </div>
                    )}

                    {/* Seen action - subtle */}
                    {isNew && (
                      <button
                        onClick={() => markSeen(s.id)}
                        className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground transition-colors pt-1"
                      >
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

function MacroBar({ label, current, target, pct, color }: {
  label: string; current: number; target: number; pct: number; color: string;
}) {
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
