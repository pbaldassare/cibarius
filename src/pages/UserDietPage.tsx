import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import MobileHeader from "@/components/MobileHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Loader2, Sparkles, ClipboardList, ChefHat, Trophy, Flame } from "lucide-react";

const MEAL_LABELS: Record<string, string> = {
  colazione: "☀️ Colazione",
  pranzo: "🌤️ Pranzo",
  cena: "🌙 Cena",
  spuntino: "🍎 Spuntino",
};

const UserDietPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [plan, setPlan] = useState<any>(null);
  const [mealTargets, setMealTargets] = useState<any[]>([]);
  const [proName, setProName] = useState("");
  const [suggestions, setSuggestions] = useState<any[]>([]);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      // Find active plan where I'm the client
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
        // Get pro name
        const { data: proProfile } = await supabase.from("profiles").select("full_name, email").eq("id", p.professional_id).single();
        setProName(proProfile?.full_name || proProfile?.email || "Professionista");
      }

      // Load suggestions
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

  return (
    <div>
      <MobileHeader title="Il mio piano" />
      <main className="px-4 py-5 pb-28 space-y-4">
        {/* Plan header */}
        <Card className="border-2 border-primary/20">
          <CardContent className="py-4 space-y-2">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-foreground">{plan.title}</h2>
              <Badge variant="default">Attivo</Badge>
            </div>
            <p className="text-xs text-muted-foreground">Di: {proName}</p>

            <div className="grid grid-cols-4 gap-2 text-center mt-2">
              <div className="rounded-lg bg-primary/10 p-2">
                <p className="text-lg font-bold text-primary">{plan.kcal_day}</p>
                <p className="text-[10px] text-muted-foreground">kcal</p>
              </div>
              <div className="rounded-lg bg-blue-500/10 p-2">
                <p className="text-lg font-bold text-blue-600">{plan.protein_g_day}g</p>
                <p className="text-[10px] text-muted-foreground">proteine</p>
              </div>
              <div className="rounded-lg bg-amber-500/10 p-2">
                <p className="text-lg font-bold text-amber-600">{plan.carbs_g_day}g</p>
                <p className="text-[10px] text-muted-foreground">carbo</p>
              </div>
              <div className="rounded-lg bg-red-500/10 p-2">
                <p className="text-lg font-bold text-red-600">{plan.fats_g_day}g</p>
                <p className="text-[10px] text-muted-foreground">grassi</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Meal targets table */}
        <Card className="border border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">🍽️ Posologia per pasto</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1.5">
            {mealTargets
              .sort((a: any, b: any) => {
                const order = ["colazione", "pranzo", "cena", "spuntino"];
                return order.indexOf(a.meal_type) - order.indexOf(b.meal_type);
              })
              .map((mt: any) => (
                <div key={mt.id} className="flex items-center justify-between rounded-lg bg-secondary/50 px-3 py-2 text-xs">
                  <span className="font-medium">{MEAL_LABELS[mt.meal_type] || mt.meal_type}</span>
                  <span className="text-muted-foreground">
                    {mt.kcal_target} kcal · P{mt.protein_g} C{mt.carbs_g} G{mt.fats_g}
                  </span>
                </div>
              ))}
          </CardContent>
        </Card>

        {/* Notes */}
        {plan.notes && (
          <Card className="border border-border">
            <CardContent className="py-3">
              <p className="text-xs text-muted-foreground mb-1">Note del professionista:</p>
              <p className="text-sm text-foreground">{plan.notes}</p>
            </CardContent>
          </Card>
        )}

        {/* Suggestions */}
        {suggestions.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-foreground">💡 Suggerimenti del professionista</h3>
            {suggestions.map((s) => {
              const p = s.payload as any;
              const isRecipe = s.type === "recipe" && p?.ingredients;
              return (
                <Card key={s.id} className={`border ${s.seen_at ? "border-border opacity-70" : "border-primary/30"}`}>
                  <CardContent className="py-3 space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{isRecipe ? "🍽️" : s.type === "food" ? "🍎" : "💬"}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{p?.title || p?.name || "Suggerimento"}</p>
                        {p?.message && <p className="text-xs text-muted-foreground truncate">{p.message}</p>}
                        <p className="text-[10px] text-muted-foreground">{new Date(s.created_at).toLocaleDateString("it-IT")}</p>
                      </div>
                      {p?.fit_score && (
                        <Badge className="gap-1 text-[10px] bg-green-500/15 text-green-700 border-green-500/30">
                          <Trophy className="h-3 w-3" /> {p.fit_score}%
                        </Badge>
                      )}
                      {!s.seen_at && (
                        <Button size="sm" variant="ghost" onClick={() => markSeen(s.id)} className="text-xs shrink-0">
                          ✓ Letto
                        </Button>
                      )}
                    </div>

                    {/* Recipe details */}
                    {isRecipe && (
                      <>
                        {p.kcal_total && (
                          <div className="flex gap-3 text-xs text-muted-foreground">
                            <span className="flex items-center gap-0.5"><Flame className="h-3 w-3" /> {p.kcal_total} kcal</span>
                            {p.macros && <>
                              <span>P: {p.macros.protein}g</span>
                              <span>C: {p.macros.carbs}g</span>
                              <span>G: {p.macros.fats}g</span>
                            </>}
                          </div>
                        )}
                        {p.notes && <p className="text-[11px] text-muted-foreground italic">{p.notes}</p>}
                        <details className="text-xs">
                          <summary className="font-medium text-foreground cursor-pointer">Ingredienti e istruzioni</summary>
                          <div className="mt-1 space-y-1">
                            {(p.ingredients ?? []).map((ing: any, i: number) => (
                              <p key={i} className="text-muted-foreground">• {ing.qty}{ing.unit} {ing.name}</p>
                            ))}
                            {p.instructions && (
                              <p className="text-muted-foreground whitespace-pre-line mt-2 border-t border-border pt-2">{p.instructions}</p>
                            )}
                          </div>
                        </details>
                      </>
                    )}

                    {/* Food details */}
                    {!isRecipe && p?.calories != null && (
                      <p className="text-[10px] text-muted-foreground">{p.calories} kcal · {p.quantity}{p.unit}</p>
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

export default UserDietPage;
