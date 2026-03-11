import { useState, useEffect, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import MobileHeader from "@/components/MobileHeader";
import EmptyState from "@/components/EmptyState";
import ListSkeleton from "@/components/ListSkeleton";
import AddFoodFlow from "@/components/AddFoodFlow";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useFavorites } from "@/hooks/useFavorites";
import { Plus, UtensilsCrossed, Target, Trash2, Flame, Camera, Heart, ChefHat, Package, AlertTriangle } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface MealItem {
  id: string;
  custom_name: string | null;
  dish_name: string | null;
  photo_url: string | null;
  calories: number | null;
  quantity: number | null;
  unit: string | null;
  macros: any;
}

interface Meal {
  id: string;
  meal_type: string;
  meal_items: MealItem[];
}

interface MealDay {
  id: string;
  day_date: string;
  meals: Meal[];
}

interface MealTarget {
  meal_type: string;
  kcal_target: number;
  protein_g: number;
  carbs_g: number;
  fats_g: number;
}

const mealEmoji: Record<string, string> = {
  colazione: "☀️",
  pranzo: "🌤️",
  cena: "🌙",
  spuntino: "🍎",
};

const mealOrder = ["colazione", "pranzo", "spuntino", "cena"];

const PastiPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { toast } = useToast();
  const { getFavoritesForMeal, loading: favsLoading } = useFavorites();
  const [loading, setLoading] = useState(true);
  const [mealDay, setMealDay] = useState<MealDay | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [sheetMealType, setSheetMealType] = useState<string | undefined>(undefined);
  const [targetKcal, setTargetKcal] = useState<number | null>(null);
  const [dietPlan, setDietPlan] = useState<any>(null);
  const [mealTargets, setMealTargets] = useState<MealTarget[]>([]);

  // Edit meal item state
  const [editingMealItem, setEditingMealItem] = useState<MealItem | null>(null);
  const [editMealQty, setEditMealQty] = useState("");
  const [editMealUnit, setEditMealUnit] = useState("g");
  const [savingMealEdit, setSavingMealEdit] = useState(false);

  const prevTotalRef = { current: 0 };
  const fetchMeals = useCallback(async () => {
    if (!user) return;
    const today = new Date().toISOString().slice(0, 10);
    const { data } = await supabase
      .from("meal_days")
      .select("id, day_date, meals(id, meal_type, meal_items(id, custom_name, dish_name, photo_url, calories, quantity, unit, macros))")
      .eq("user_id", user.id)
      .eq("day_date", today)
      .maybeSingle();
    
    // Check if we just exceeded the target
    const newTotal = (data as MealDay | null)?.meals?.reduce(
      (sum, m) => sum + m.meal_items.reduce((s, i) => s + (i.calories ?? 0), 0), 0
    ) ?? 0;
    const target = targetKcal || dietPlan?.kcal_day;
    if (target && newTotal > target && prevTotalRef.current <= target && prevTotalRef.current > 0) {
      toast({
        variant: "destructive",
        title: "⚠️ Obiettivo calorico superato!",
        description: `Hai raggiunto ${Math.round(newTotal)} kcal su ${target} kcal previste (+${Math.round(newTotal - target)} kcal).`,
      });
    }
    prevTotalRef.current = newTotal;
    
    setMealDay(data as MealDay | null);
    setLoading(false);
  }, [user, targetKcal, dietPlan]);

  useEffect(() => { fetchMeals(); }, [fetchMeals]);

  // Deep link: auto-open add meal sheet from ?add=colazione
  useEffect(() => {
    const addMeal = searchParams.get("add");
    if (addMeal && ["colazione", "pranzo", "cena", "spuntino"].includes(addMeal)) {
      setSheetMealType(addMeal);
      setSheetOpen(true);
      searchParams.delete("add");
      setSearchParams(searchParams, { replace: true });
    }
  }, [searchParams]);

  useEffect(() => {
    if (!user) return;
    supabase.from("nutrition_targets").select("kcal_day").eq("user_id", user.id).maybeSingle().then(({ data }) => {
      if (data) setTargetKcal(data.kcal_day);
    });
    supabase
      .from("diet_plans")
      .select("*, diet_plan_meal_targets(*)")
      .eq("client_user_id", user.id)
      .eq("is_active", true)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          setDietPlan(data);
          setMealTargets((data as any).diet_plan_meal_targets ?? []);
          if (!targetKcal) setTargetKcal((data as any).kcal_day);
        }
      });
  }, [user]);

  const handleDeleteItem = async (itemId: string) => {
    await supabase.from("meal_items").delete().eq("id", itemId);
    fetchMeals();
  };

  const handleQuickAddFavorite = async (fav: any, mealType: string) => {
    if (!user) return;
    try {
      const today = new Date().toISOString().slice(0, 10);
      let { data: dayData } = await supabase
        .from("meal_days").select("id").eq("user_id", user.id).eq("day_date", today).maybeSingle();
      if (!dayData) {
        const { data: nd, error: de } = await supabase
          .from("meal_days").insert({ user_id: user.id, day_date: today }).select("id").single();
        if (de) throw de;
        dayData = nd;
      }
      let { data: mealData } = await supabase
        .from("meals").select("id").eq("meal_day_id", dayData!.id).eq("meal_type", mealType).maybeSingle();
      if (!mealData) {
        const { data: nm, error: me } = await supabase
          .from("meals").insert({ meal_day_id: dayData!.id, meal_type: mealType }).select("id").single();
        if (me) throw me;
        mealData = nm;
      }
      const snap = fav.item_snapshot;
      const { error } = await supabase.from("meal_items").insert({
        meal_id: mealData!.id,
        source_type: "custom",
        custom_name: snap.name,
        dish_name: snap.name,
        calories: snap.kcal || 0,
        quantity: 1,
        unit: "porzione",
        macros: { protein: snap.protein || 0, carbs: snap.carbs || 0, fats: snap.fats || 0 },
      });
      if (error) throw error;
      toast({ title: `"${snap.name}" aggiunto! ✅` });
      fetchMeals();
    } catch (e: any) {
      toast({ variant: "destructive", title: "Errore", description: e.message });
    }
  };

  // ═══ Edit meal item handlers ═══
  const openMealItemEdit = (item: MealItem) => {
    setEditingMealItem(item);
    setEditMealQty(String(item.quantity ?? 0));
    setEditMealUnit(item.unit ?? "g");
  };

  const handleUpdateMealItem = async () => {
    if (!editingMealItem) return;
    setSavingMealEdit(true);

    const oldQty = editingMealItem.quantity ?? 1;
    const newQty = parseFloat(editMealQty) || 1;
    const ratio = oldQty > 0 ? newQty / oldQty : 1;

    const newCalories = editingMealItem.calories != null ? Math.round(editingMealItem.calories * ratio) : null;
    const oldMacros = editingMealItem.macros as { protein?: number; carbs?: number; fats?: number } | null;
    const newMacros = oldMacros ? {
      protein: Math.round((oldMacros.protein ?? 0) * ratio * 10) / 10,
      carbs: Math.round((oldMacros.carbs ?? 0) * ratio * 10) / 10,
      fats: Math.round((oldMacros.fats ?? 0) * ratio * 10) / 10,
    } : null;

    const { error } = await supabase
      .from("meal_items")
      .update({
        quantity: newQty,
        unit: editMealUnit,
        calories: newCalories,
        macros: newMacros as any,
      })
      .eq("id", editingMealItem.id);

    setSavingMealEdit(false);
    if (error) {
      toast({ variant: "destructive", title: "Errore", description: error.message });
    } else {
      toast({ title: "Alimento aggiornato" });
      setEditingMealItem(null);
      fetchMeals();
    }
  };

  // If plan has meal targets, only show meals that are in the plan (or have items already)
  const allowedMealTypes = mealTargets.length > 0
    ? mealTargets.map((t) => t.meal_type)
    : null;

  const meals = (mealDay?.meals ?? [])
    .filter((m) => {
      if (!allowedMealTypes) return true;
      return allowedMealTypes.includes(m.meal_type) || m.meal_items.length > 0;
    })
    .sort((a, b) => mealOrder.indexOf(a.meal_type) - mealOrder.indexOf(b.meal_type));

  const totalKcal = meals.reduce(
    (sum, m) => sum + m.meal_items.reduce((s, i) => s + (i.calories ?? 0), 0), 0
  );

  return (
    <div>
      <MobileHeader title="Pasti" />
      <main className="space-y-4 px-4 py-5 pb-28">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-foreground">Oggi</h2>
            {meals.length > 0 && (
              <p className="text-xs text-muted-foreground">{totalKcal} kcal totali</p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate("/meals/photo")}
              className="flex items-center gap-1 rounded-xl bg-secondary px-3 py-1.5 text-sm font-medium text-secondary-foreground"
            >
              <Camera size={16} />
              Foto AI
            </button>
            <button
              onClick={() => { setSheetMealType(undefined); setSheetOpen(true); }}
              className="flex items-center gap-1 rounded-xl bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground"
            >
              <Plus size={16} />
              Aggiungi
            </button>
          </div>
        </div>

        {/* Diet plan box */}
        {dietPlan && (
          <div className="w-full rounded-xl border-2 border-primary/20 bg-primary/5 p-3 flex items-center gap-3">
            <Flame className="h-5 w-5 text-primary shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-foreground">{dietPlan.title}</p>
              <p className="text-xs text-muted-foreground">{dietPlan.kcal_day} kcal · P{dietPlan.protein_g_day} C{dietPlan.carbs_g_day} G{dietPlan.fats_g_day}</p>
            </div>
          </div>
        )}

        {targetKcal && meals.length > 0 && totalKcal > targetKcal && (
          <div className="rounded-xl border-2 border-destructive/40 bg-destructive/10 p-3 flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-destructive shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-destructive">Obiettivo superato!</p>
              <p className="text-xs text-destructive/80">
                +{Math.round(totalKcal - targetKcal)} kcal in eccesso ({totalKcal} / {targetKcal} kcal)
              </p>
            </div>
          </div>
        )}

        {targetKcal && meals.length > 0 && (
          <div className={`rounded-xl border-2 ${totalKcal > targetKcal ? "border-destructive/30" : "border-accent"} bg-card p-4 space-y-2`}>
            <div className="flex items-center gap-2">
              <Flame size={18} className={totalKcal > targetKcal ? "text-destructive" : "text-primary"} />
              <span className="text-sm font-semibold text-foreground">Bilancio calorie</span>
            </div>
            <Progress value={Math.min((totalKcal / targetKcal) * 100, 100)} className={`h-2.5 ${totalKcal > targetKcal ? "[&>div]:bg-destructive" : ""}`} />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>{totalKcal} assunte</span>
              <span className={`font-semibold ${totalKcal >= targetKcal ? "text-destructive" : "text-primary"}`}>
                {totalKcal >= targetKcal
                  ? `+${totalKcal - targetKcal} kcal in eccesso`
                  : `${targetKcal - totalKcal} kcal rimanenti`}
              </span>
              <span>{targetKcal} obiettivo</span>
            </div>
          </div>
        )}

        {loading ? (
          <ListSkeleton count={3} variant="row" />
        ) : meals.length === 0 ? (
          <EmptyState
            icon={UtensilsCrossed}
            title="Nessun pasto registrato"
            description="Aggiungi il tuo primo alimento per tracciare le calorie di oggi."
            actions={[
              { label: "Aggiungi alimento", icon: Plus, onClick: () => { setSheetMealType(undefined); setSheetOpen(true); } },
              { label: "Obiettivi", icon: Target, variant: "outline", onClick: () => navigate("/meals/targets") },
            ]}
          />
        ) : (
          <div className="space-y-3">
            {meals.map((meal) => {
              const mealKcal = meal.meal_items.reduce((s, i) => s + (i.calories ?? 0), 0);
              const mealMacros = meal.meal_items.reduce(
                (acc, i) => {
                  const m = i.macros as any;
                  if (m) { acc.p += m.protein ?? 0; acc.c += m.carbs ?? 0; acc.f += m.fats ?? 0; }
                  return acc;
                },
                { p: 0, c: 0, f: 0 }
              );
              const mt = mealTargets.find((t) => t.meal_type === meal.meal_type);
              return (
                <div key={meal.id} className="rounded-xl border-2 border-accent bg-card p-4 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-2 font-semibold text-card-foreground">
                      <span>{mealEmoji[meal.meal_type] ?? "🍽️"}</span>
                      {meal.meal_type.charAt(0).toUpperCase() + meal.meal_type.slice(1)}
                    </span>
                    <span className="text-sm font-medium text-primary">
                      {mealKcal}{mt ? ` / ${mt.kcal_target}` : ""} kcal
                    </span>
                  </div>

                  {mt && (
                    <div className="space-y-1">
                      <Progress value={mt.kcal_target > 0 ? Math.min((mealKcal / mt.kcal_target) * 100, 100) : 0} className="h-1.5" />
                      <div className="flex justify-between text-[10px] text-muted-foreground">
                      <span>P: {Math.round(mealMacros.p)}/{mt.protein_g}g</span>
                        <span>C: {Math.round(mealMacros.c)}/{mt.carbs_g}g{(mt as any).sugars_g > 0 ? ` (Z:${(mt as any).sugars_g})` : ""}</span>
                        <span>G: {Math.round(mealMacros.f)}/{mt.fats_g}g</span>
                      </div>
                    </div>
                  )}

                  {meal.meal_items.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Nessun alimento</p>
                  ) : (
                    <div className="space-y-1.5">
                      {meal.meal_items.map((item) => (
                        <div key={item.id} className="flex items-center gap-2 rounded-lg bg-secondary/50 p-2">
                          {item.photo_url && (
                            <img
                              src={item.photo_url}
                              alt={item.dish_name || item.custom_name || "piatto"}
                              className="h-10 w-10 rounded-lg object-cover shrink-0"
                              loading="lazy"
                            />
                          )}
                          <button
                            onClick={() => openMealItemEdit(item)}
                            className="flex-1 min-w-0 text-left"
                          >
                            <p className="text-sm font-medium text-foreground truncate">
                              {item.dish_name || item.custom_name || "—"}
                            </p>
                            <p className="text-[10px] text-muted-foreground">
                              {item.quantity ?? "—"}{item.unit ?? "g"} · {item.calories ?? 0} kcal
                            </p>
                          </button>
                          <button
                            onClick={() => handleDeleteItem(item.id)}
                            className="p-1.5 text-muted-foreground hover:text-destructive transition-colors"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Favorites quick-add */}
                  {(() => {
                    const mealFavs = getFavoritesForMeal(meal.meal_type);
                    if (mealFavs.length === 0) return null;
                    return (
                      <div className="pt-1">
                        <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-1.5 flex items-center gap-1">
                          <Heart className="h-3 w-3 text-destructive" /> Preferiti
                        </p>
                        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
                          {mealFavs.map((fav) => (
                            <button
                              key={fav.id}
                              onClick={() => handleQuickAddFavorite(fav, meal.meal_type)}
                              className="flex items-center gap-1.5 rounded-lg bg-secondary/60 border border-border/40 px-2.5 py-1.5 text-xs shrink-0 hover:bg-secondary transition-colors"
                            >
                              {fav.item_type === "template_recipe" ? (
                                <ChefHat className="h-3 w-3 text-primary" />
                              ) : (
                                <Package className="h-3 w-3 text-primary" />
                              )}
                              <span className="font-medium text-foreground max-w-[120px] truncate">{fav.item_snapshot.name}</span>
                              <span className="text-muted-foreground">{fav.item_snapshot.kcal || 0}</span>
                              <Plus className="h-3 w-3 text-primary" />
                            </button>
                          ))}
                        </div>
                      </div>
                    );
                  })()}

                  <button
                    onClick={() => { setSheetMealType(meal.meal_type); setSheetOpen(true); }}
                    className="flex items-center gap-1 text-xs font-medium text-primary pt-1"
                  >
                    <Plus size={14} /> Aggiungi alimento
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </main>

      <AddFoodFlow
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        context="meal"
        mealType={sheetMealType as any}
        onComplete={fetchMeals}
      />

      {/* ═══ Edit Meal Item Dialog ═══ */}
      <Dialog open={!!editingMealItem} onOpenChange={(open) => { if (!open) setEditingMealItem(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Modifica alimento</DialogTitle>
            <DialogDescription>{editingMealItem?.custom_name || "—"}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Quantità</Label>
              <Input type="number" value={editMealQty} onChange={e => setEditMealQty(e.target.value)} min="0" step="0.1" />
            </div>
            <div className="space-y-2">
              <Label>Unità</Label>
              <Select value={editMealUnit} onValueChange={setEditMealUnit}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["g", "ml", "kg", "l", "pezzi", "porzioni"].map((u) => (
                    <SelectItem key={u} value={u}>{u}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {editingMealItem && (
              <div className="text-xs text-muted-foreground rounded-lg bg-secondary/50 p-3">
                {(() => {
                  const oldQty = editingMealItem.quantity ?? 1;
                  const newQty = parseFloat(editMealQty) || 1;
                  const ratio = oldQty > 0 ? newQty / oldQty : 1;
                  const newCal = editingMealItem.calories != null ? Math.round(editingMealItem.calories * ratio) : null;
                  const m = editingMealItem.macros as any;
                  return (
                    <span>
                      Stima: {newCal ?? "—"} kcal
                      {m && ` · P${Math.round((m.protein ?? 0) * ratio)}g C${Math.round((m.carbs ?? 0) * ratio)}g${m.sugars ? ` (Z${Math.round(m.sugars * ratio)}g)` : ""} G${Math.round((m.fats ?? 0) * ratio)}g`}
                    </span>
                  );
                })()}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button onClick={handleUpdateMealItem} disabled={savingMealEdit} className="w-full">
              {savingMealEdit ? "Salvataggio..." : "Salva"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PastiPage;