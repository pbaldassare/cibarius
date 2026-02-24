import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import MobileHeader from "@/components/MobileHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Clock, ChefHat, Flame, MapPin, Phone, X, AlertTriangle } from "lucide-react";

const RecipeDetailPage = () => {
  const { recipeId } = useParams<{ recipeId: string }>();
  const [recipe, setRecipe] = useState<any>(null);
  const [restaurant, setRestaurant] = useState<any>(null);
  const [ingredients, setIngredients] = useState<any[]>([]);
  const [allergens, setAllergens] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showContact, setShowContact] = useState(false);
  const [contactShown, setContactShown] = useState(false);

  useEffect(() => {
    if (!recipeId) return;
    const load = async () => {
      const [recipeRes, ingsRes, allergensRes] = await Promise.all([
        supabase.from("recipes").select("*, restaurants(id, name, address, phone)").eq("id", recipeId).single(),
        supabase.from("recipe_ingredients").select("*, products(name, calories_100g)").eq("recipe_id", recipeId),
        supabase.from("recipe_allergens").select("*, allergens(name, code)").eq("recipe_id", recipeId),
      ]);

      if (recipeRes.data) {
        setRecipe(recipeRes.data);
        setRestaurant(recipeRes.data.restaurants);
      }
      setIngredients(ingsRes.data ?? []);
      setAllergens(allergensRes.data ?? []);
      setLoading(false);

      // Show contact popup on first open
      if (recipeRes.data?.restaurants && !contactShown) {
        setTimeout(() => setShowContact(true), 500);
        setContactShown(true);
      }
    };
    load();
  }, [recipeId]);

  // Calc total kcal
  const totalKcal = ingredients.reduce((sum, i) => {
    if (!i.products?.calories_100g || !i.quantity) return sum;
    let grams = i.quantity;
    if (i.unit === "kg" || i.unit === "l") grams *= 1000;
    else if (i.unit !== "g" && i.unit !== "ml") return sum;
    return sum + (grams / 100) * i.products.calories_100g;
  }, 0);

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
          <div className="w-full h-48 overflow-hidden">
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
            <Card className="border-2 border-destructive/30">
              <CardContent className="py-3">
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle className="h-4 w-4 text-destructive" />
                  <span className="text-sm font-semibold text-foreground">Allergeni</span>
                </div>
                <div className="flex gap-1.5 flex-wrap">
                  {allergens.map((a) => (
                    <Badge key={a.id} variant="destructive" className="text-xs">{a.allergens?.name}</Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Ingredients */}
          {ingredients.length > 0 && (
            <Card className="border-2 border-accent">
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
            <Card className="border-2 border-accent">
              <CardHeader className="pb-2 pt-3">
                <CardTitle className="text-sm">Procedimento</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-foreground whitespace-pre-line">{recipe.instructions}</p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Contact popup */}
        <Dialog open={showContact} onOpenChange={setShowContact}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle className="text-center">{restaurant?.name}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2">
              {restaurant?.address && (
                <div className="flex items-start gap-3">
                  <MapPin className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                  <p className="text-sm text-foreground">{restaurant.address}</p>
                </div>
              )}
              {restaurant?.phone && (
                <div className="flex items-center gap-3">
                  <Phone className="h-5 w-5 text-primary shrink-0" />
                  <a href={`tel:${restaurant.phone}`} className="text-sm text-primary font-medium underline">
                    {restaurant.phone}
                  </a>
                </div>
              )}
              <Button className="w-full" onClick={() => setShowContact(false)}>Chiudi</Button>
            </div>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
};

export default RecipeDetailPage;
