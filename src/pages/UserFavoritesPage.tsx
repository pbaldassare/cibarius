import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useFavorites, UserFavorite } from "@/hooks/useFavorites";
import { ArrowLeft, Heart, Trash2, ChefHat, Package, Loader2, Plus, UtensilsCrossed } from "lucide-react";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface FavMealItem {
  id: string;
  ingredient_name: string;
  grams: number;
  kcal: number;
  protein_g: number;
  carbs_g: number;
  fats_g: number;
}

interface FavMeal {
  id: string;
  title: string;
  items: FavMealItem[];
}

const UserFavoritesPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { favorites, loading: favsLoading, toggleFavorite } = useFavorites();
  const [combos, setCombos] = useState<FavMeal[]>([]);
  const [combosLoading, setCombosLoading] = useState(true);

  const fetchCombos = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from("user_favorite_meals" as any)
      .select("id, title, favorite_meal_items(id, ingredient_name, grams, kcal, protein_g, carbs_g, fats_g)")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    setCombos(
      ((data as any[]) || []).map((d: any) => ({
        id: d.id,
        title: d.title,
        items: d.favorite_meal_items || [],
      }))
    );
    setCombosLoading(false);
  }, [user]);

  useEffect(() => { fetchCombos(); }, [fetchCombos]);

  const handleDeleteCombo = async (id: string) => {
    await supabase.from("user_favorite_meals" as any).delete().eq("id", id);
    setCombos((prev) => prev.filter((c) => c.id !== id));
    toast.success("Pasto preferito eliminato");
  };

  const handleRemoveFavorite = async (fav: UserFavorite) => {
    await toggleFavorite(fav.item_type, fav.item_id, fav.meal_types, fav.item_snapshot);
  };

  return (
    <main className="px-4 pt-4 pb-6 space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="p-1.5 rounded-full hover:bg-secondary transition-colors">
          <ArrowLeft className="h-5 w-5 text-foreground" />
        </button>
        <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
          <Heart className="h-5 w-5 text-destructive" /> I miei preferiti
        </h1>
      </div>

      <Tabs defaultValue="items" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="items" className="text-xs">
            <Package className="h-3.5 w-3.5 mr-1.5" /> Alimenti ({favorites.length})
          </TabsTrigger>
          <TabsTrigger value="combos" className="text-xs">
            <ChefHat className="h-3.5 w-3.5 mr-1.5" /> Pasti ({combos.length})
          </TabsTrigger>
        </TabsList>

        {/* ═══ Alimenti preferiti (cuoricini) ═══ */}
        <TabsContent value="items" className="mt-4 space-y-3">
          {favsLoading ? (
            <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
          ) : favorites.length === 0 ? (
            <div className="text-center py-12 space-y-2">
              <Heart className="h-10 w-10 mx-auto text-muted-foreground/30" />
              <p className="text-sm text-muted-foreground">Nessun alimento preferito salvato.</p>
              <p className="text-xs text-muted-foreground">Tocca il ❤️ su un prodotto o ricetta per aggiungerlo qui.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {favorites.map((fav) => {
                const snap = fav.item_snapshot;
                return (
                  <div key={fav.id} className="flex items-center gap-3 rounded-xl border border-border bg-card p-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
                      {fav.item_type === "template_recipe" ? (
                        <ChefHat className="h-4 w-4 text-primary" />
                      ) : (
                        <Package className="h-4 w-4 text-primary" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-foreground truncate">{snap.name || "Senza nome"}</p>
                      <div className="flex gap-2 text-[10px] text-muted-foreground">
                        <span>{snap.kcal || 0} kcal</span>
                        {snap.protein_g != null && <span>P {snap.protein_g}g</span>}
                        {snap.carbs_g != null && <span>C {snap.carbs_g}g</span>}
                        {snap.fats_g != null && <span>G {snap.fats_g}g</span>}
                      </div>
                      {fav.meal_types.length > 0 && (
                        <div className="flex gap-1 mt-1">
                          {fav.meal_types.map((mt) => (
                            <span key={mt} className="text-[9px] px-1.5 py-0.5 rounded-full bg-secondary text-muted-foreground capitalize">{mt}</span>
                          ))}
                        </div>
                      )}
                    </div>
                    <button
                      onClick={() => handleRemoveFavorite(fav)}
                      className="p-2 text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* ═══ Pasti preferiti (combo) ═══ */}
        <TabsContent value="combos" className="mt-4 space-y-3">
          {combosLoading ? (
            <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
          ) : combos.length === 0 ? (
            <div className="text-center py-12 space-y-2">
              <UtensilsCrossed className="h-10 w-10 mx-auto text-muted-foreground/30" />
              <p className="text-sm text-muted-foreground">Nessun pasto preferito salvato.</p>
              <p className="text-xs text-muted-foreground">Vai nella sezione Pasti per creare combinazioni che fai spesso.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {combos.map((combo) => {
                const totalKcal = combo.items.reduce((s, i) => s + (i.kcal || 0), 0);
                const totalP = combo.items.reduce((s, i) => s + (i.protein_g || 0), 0);
                const totalC = combo.items.reduce((s, i) => s + (i.carbs_g || 0), 0);
                const totalF = combo.items.reduce((s, i) => s + (i.fats_g || 0), 0);
                return (
                  <div key={combo.id} className="rounded-xl border border-border bg-card p-3 space-y-2">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent/20">
                          <ChefHat className="h-4 w-4 text-accent-foreground" />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-foreground">{combo.title}</p>
                          <p className="text-[10px] text-muted-foreground">{combo.items.length} ingredienti · {totalKcal} kcal</p>
                        </div>
                      </div>
                      <button onClick={() => handleDeleteCombo(combo.id)} className="p-2 text-muted-foreground hover:text-destructive transition-colors">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                    <div className="space-y-1 pl-11">
                      {combo.items.map((item) => (
                        <p key={item.id} className="text-xs text-muted-foreground">
                          {item.ingredient_name} · {item.grams}g · {item.kcal} kcal
                        </p>
                      ))}
                    </div>
                    <div className="flex gap-3 text-[10px] text-muted-foreground pl-11 pt-1 border-t border-border/50">
                      <span className="font-medium text-primary">{totalKcal} kcal</span>
                      <span>P {totalP.toFixed(1)}g</span>
                      <span>C {totalC.toFixed(1)}g</span>
                      <span>G {totalF.toFixed(1)}g</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </main>
  );
};

export default UserFavoritesPage;
