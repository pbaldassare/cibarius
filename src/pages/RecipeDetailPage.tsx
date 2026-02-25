import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import MobileHeader from "@/components/MobileHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Slider } from "@/components/ui/slider";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Clock, ChefHat, Flame, MapPin, Phone, AlertTriangle, Copy, ShoppingCart, UtensilsCrossed, Check } from "lucide-react";

const CONTACT_STORAGE_KEY = "cibarius_recipe_contact_shown";

const RecipeDetailPage = () => {
  const { recipeId } = useParams<{ recipeId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [recipe, setRecipe] = useState<any>(null);
  const [restaurant, setRestaurant] = useState<any>(null);
  const [ingredients, setIngredients] = useState<any[]>([]);
  const [allergens, setAllergens] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showContact, setShowContact] = useState(false);

  // Replica state
  const [showReplica, setShowReplica] = useState(false);
  const [replicaServings, setReplicaServings] = useState(4);
  const [replicaSaving, setReplicaSaving] = useState(false);
  const [replicaDone, setReplicaDone] = useState(false);

  useEffect(() => {
    if (!recipeId) return;
    const load = async () => {
      const [recipeRes, ingsRes, allergensRes] = await Promise.all([
        supabase.from("recipes").select("*, restaurants(id, name, address, phone)").eq("id", recipeId).single(),
        supabase.from("recipe_ingredients").select("*, products(id, name, calories_100g)").eq("recipe_id", recipeId),
        supabase.from("recipe_allergens").select("*, allergens(name, code)").eq("recipe_id", recipeId),
      ]);

      if (recipeRes.data) {
        setRecipe(recipeRes.data);
        setRestaurant(recipeRes.data.restaurants);
        setReplicaServings(recipeRes.data.servings || 4);
      }
      setIngredients(ingsRes.data ?? []);
      setAllergens(allergensRes.data ?? []);
      setLoading(false);

      // Show contact popup once per session per recipe (localStorage)
      if (recipeRes.data?.restaurants) {
        const shownMap = JSON.parse(localStorage.getItem(CONTACT_STORAGE_KEY) || "{}");
        if (!shownMap[recipeId!]) {
          setTimeout(() => setShowContact(true), 500);
          shownMap[recipeId!] = true;
          localStorage.setItem(CONTACT_STORAGE_KEY, JSON.stringify(shownMap));
        }
      }
    };
    load();
  }, [recipeId]);

  const totalKcal = ingredients.reduce((sum, i) => {
    if (!i.products?.calories_100g || !i.quantity) return sum;
    let grams = i.quantity;
    if (i.unit === "kg" || i.unit === "l") grams *= 1000;
    else if (i.unit !== "g" && i.unit !== "ml") return sum;
    return sum + (grams / 100) * i.products.calories_100g;
  }, 0);

  // Replica: add ingredients to inventory
  const handleReplica = async (target: "inventory" | "meals") => {
    if (!user || !recipe) return;
    setReplicaSaving(true);

    const recipeServings = recipe.servings || 1;
    const ratio = replicaServings / recipeServings;

    for (const ing of ingredients) {
      const productId = ing.products?.id || ing.product_id;
      if (!productId) continue;

      const scaledQty = ing.quantity ? Math.round(ing.quantity * ratio * 10) / 10 : null;

      if (target === "inventory") {
        await supabase.from("inventory_items").insert({
          owner_user_id: user.id,
          product_id: productId,
          quantity: scaledQty,
          unit: ing.unit,
          storage_type: "ambiente",
        });
      } else {
        // Add to today's meals
        const today = new Date().toISOString().split("T")[0];
        let { data: dayData } = await supabase
          .from("meal_days")
          .select("id")
          .eq("user_id", user.id)
          .eq("day_date", today)
          .maybeSingle();

        if (!dayData) {
          const { data } = await supabase
            .from("meal_days")
            .insert({ user_id: user.id, day_date: today })
            .select("id")
            .single();
          dayData = data;
        }

        if (dayData) {
          let { data: mealData } = await supabase
            .from("meals")
            .select("id")
            .eq("meal_day_id", dayData.id)
            .eq("meal_type", "pranzo")
            .maybeSingle();

          if (!mealData) {
            const { data } = await supabase
              .from("meals")
              .insert({ meal_day_id: dayData.id, meal_type: "pranzo" })
              .select("id")
              .single();
            mealData = data;
          }

          if (mealData) {
            const cal100 = ing.products?.calories_100g || 0;
            const grams = ing.unit === "kg" || ing.unit === "l" ? (scaledQty || 0) * 1000 : (scaledQty || 0);
            const calories = ing.unit === "g" || ing.unit === "ml" || ing.unit === "kg" || ing.unit === "l"
              ? Math.round((grams / 100) * cal100) : null;

            await supabase.from("meal_items").insert({
              meal_id: mealData.id,
              product_id: productId,
              quantity: scaledQty,
              unit: ing.unit,
              source_type: "recipe",
              calories,
            });
          }
        }
      }
    }

    setReplicaSaving(false);
    setReplicaDone(true);
    toast({
      title: target === "inventory" ? "Ingredienti aggiunti al magazzino!" : "Ingredienti aggiunti ai pasti!",
    });
    setTimeout(() => { setShowReplica(false); setReplicaDone(false); }, 1200);
  };

  if (loading) {
    return (
      <div>
        <MobileHeader title="Ricetta" />
        <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
      </div>
    );
  }

  if (!recipe) {
    return (
      <div>
        <MobileHeader title="Ricetta" />
        <main className="px-4 py-5">
          <p className="text-sm text-muted-foreground text-center">Ricetta non trovata.</p>
        </main>
      </div>
    );
  }

  const servings = recipe.servings || 1;

  return (
    <div>
      <MobileHeader title={recipe.title} />
      <main className="pb-28">
        {/* Hero image */}
        {recipe.image_url && (
          <div className="w-full h-52 overflow-hidden">
            <img src={recipe.image_url} alt={recipe.title} className="h-full w-full object-cover" />
          </div>
        )}

        <div className="px-4 py-5 space-y-4">
          {/* Title + meta */}
          <div>
            <h1 className="text-xl font-bold text-foreground">{recipe.title}</h1>
            <button className="text-sm text-primary font-medium mt-1" onClick={() => setShowContact(true)}>
              {restaurant?.name || "Ristorante"} →
            </button>
            <div className="flex gap-1.5 mt-2 flex-wrap">
              {recipe.category && <Badge variant="secondary">{recipe.category}</Badge>}
              {recipe.difficulty && <Badge variant="outline">{recipe.difficulty}</Badge>}
            </div>
          </div>

          {/* Times */}
          {(recipe.prep_time_minutes || recipe.cook_time_minutes) && (
            <div className="flex gap-4">
              {recipe.prep_time_minutes && (
                <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                  <Clock className="h-4 w-4" /> Prep: {recipe.prep_time_minutes}′
                </div>
              )}
              {recipe.cook_time_minutes && (
                <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                  <ChefHat className="h-4 w-4" /> Cottura: {recipe.cook_time_minutes}′
                </div>
              )}
            </div>
          )}

          {/* Kcal */}
          {totalKcal > 0 && (
            <div className="flex items-center gap-2 rounded-xl bg-secondary p-3">
              <Flame className="h-5 w-5 text-primary" />
              <span className="text-sm font-medium">{Math.round(totalKcal)} kcal totali</span>
              <span className="text-xs text-muted-foreground">· {Math.round(totalKcal / servings)} kcal/porzione</span>
            </div>
          )}

          {/* Allergens */}
          {allergens.length > 0 && (
            <div className="flex items-center gap-2 flex-wrap rounded-[14px] border border-destructive/20 bg-destructive/5 px-3 py-2.5">
              <AlertTriangle className="h-4 w-4 text-destructive shrink-0" />
              <span className="text-xs font-semibold text-destructive mr-1">Allergeni:</span>
              {allergens.map((a) => (
                <Badge key={a.id} variant="destructive" className="text-[10px] py-0">{a.allergens?.name}</Badge>
              ))}
            </div>
          )}

          {/* Ingredients */}
          {ingredients.length > 0 && (
            <Card className="border border-border">
              <CardHeader className="pb-2 pt-3">
                <CardTitle className="text-sm">Ingredienti ({servings} {servings === 1 ? "porzione" : "porzioni"})</CardTitle>
              </CardHeader>
              <CardContent className="space-y-1">
                {ingredients.map((i) => (
                  <div key={i.id} className="flex items-center justify-between text-sm py-1 border-b border-border last:border-0">
                    <span className="text-foreground">{i.products?.name || "Prodotto"}</span>
                    <span className="text-muted-foreground">{i.quantity} {i.unit}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Instructions */}
          {recipe.instructions && (
            <Card className="border border-border">
              <CardHeader className="pb-2 pt-3">
                <CardTitle className="text-sm">Procedimento</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-foreground whitespace-pre-line">{recipe.instructions}</p>
              </CardContent>
            </Card>
          )}

          {/* ═══ REPLICA BUTTON ═══ */}
          {user && ingredients.length > 0 && (
            <Button
              className="w-full gap-2 h-12 text-[15px] font-semibold rounded-[14px]"
              onClick={() => setShowReplica(true)}
            >
              <Copy className="h-5 w-5" />
              Replica questa ricetta
            </Button>
          )}
        </div>

        {/* Contact popup */}
        <Dialog open={showContact} onOpenChange={setShowContact}>
          <DialogContent className="max-w-sm rounded-[20px]">
            <DialogHeader>
              <DialogTitle className="text-center text-lg">{restaurant?.name}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2">
              {restaurant?.address && (
                <div className="flex items-start gap-3">
                  <MapPin className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                  <p className="text-sm text-foreground">{restaurant.address}</p>
                </div>
              )}
              {restaurant?.phone && (
                <a
                  href={`tel:${restaurant.phone}`}
                  className="flex items-center justify-center gap-2 w-full rounded-[12px] bg-primary py-3 text-primary-foreground font-semibold text-[15px] active:scale-[0.97] transition-transform"
                >
                  <Phone className="h-5 w-5" />
                  Chiama {restaurant.phone}
                </a>
              )}
              <Button variant="outline" className="w-full rounded-[12px]" onClick={() => setShowContact(false)}>Chiudi</Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Replica dialog */}
        <Dialog open={showReplica} onOpenChange={setShowReplica}>
          <DialogContent className="max-w-sm rounded-[20px]">
            <DialogHeader>
              <DialogTitle className="text-center">Replica ricetta</DialogTitle>
            </DialogHeader>
            <div className="space-y-5 py-2">
              {/* Servings slider */}
              <div>
                <p className="text-sm font-medium text-foreground mb-2">Porzioni: <span className="text-primary font-bold">{replicaServings}</span></p>
                <Slider
                  value={[replicaServings]}
                  onValueChange={([v]) => setReplicaServings(v)}
                  min={1}
                  max={12}
                  step={1}
                  className="w-full"
                />
                <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
                  <span>1</span><span>6</span><span>12</span>
                </div>
              </div>

              {/* Ingredient preview */}
              <div className="max-h-40 overflow-y-auto space-y-1 rounded-[12px] bg-secondary p-3">
                {ingredients.map((i) => {
                  const ratio = replicaServings / servings;
                  const qty = i.quantity ? Math.round(i.quantity * ratio * 10) / 10 : null;
                  return (
                    <div key={i.id} className="flex justify-between text-sm">
                      <span className="text-foreground truncate">{i.products?.name}</span>
                      <span className="text-muted-foreground shrink-0 ml-2">{qty} {i.unit}</span>
                    </div>
                  );
                })}
              </div>

              {/* Action buttons */}
              {replicaDone ? (
                <div className="flex items-center justify-center gap-2 py-4 text-success font-semibold">
                  <Check className="h-6 w-6" /> Fatto!
                </div>
              ) : (
                <div className="space-y-2">
                  <Button
                    className="w-full gap-2 h-11 rounded-[12px]"
                    onClick={() => handleReplica("inventory")}
                    disabled={replicaSaving}
                  >
                    {replicaSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShoppingCart className="h-4 w-4" />}
                    Aggiungi a Magazzino
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full gap-2 h-11 rounded-[12px]"
                    onClick={() => handleReplica("meals")}
                    disabled={replicaSaving}
                  >
                    {replicaSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <UtensilsCrossed className="h-4 w-4" />}
                    Aggiungi a Pasti
                  </Button>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
};

export default RecipeDetailPage;
