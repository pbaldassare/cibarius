import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, ChefHat, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import IngredientAutocomplete from "@/components/IngredientAutocomplete";

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

interface Props {
  mealType?: string;
  onAddToDay: (items: FavMealItem[], mealType: string) => Promise<void>;
}

const FavoriteMealCombos = ({ mealType, onAddToDay }: Props) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [combos, setCombos] = useState<FavMeal[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newItems, setNewItems] = useState<Array<{ name: string; grams: number; kcal: number; protein: number; carbs: number; fats: number }>>([]);
  const [saving, setSaving] = useState(false);
  const [addingId, setAddingId] = useState<string | null>(null);

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
    setLoading(false);
  }, [user]);

  useEffect(() => { fetchCombos(); }, [fetchCombos]);

  const handleAddIngredient = () => {
    setNewItems([...newItems, { name: "", grams: 100, kcal: 0, protein: 0, carbs: 0, fats: 0 }]);
  };

  const handleIngredientSelect = (index: number, ingredient: any) => {
    const updated = [...newItems];
    const g = updated[index].grams;
    updated[index] = {
      name: ingredient.name,
      grams: g,
      kcal: Math.round((ingredient.kcal_per_100g || 0) * g / 100),
      protein: Math.round((ingredient.protein_per_100g || 0) * g / 100 * 10) / 10,
      carbs: Math.round((ingredient.carbs_per_100g || 0) * g / 100 * 10) / 10,
      fats: Math.round((ingredient.fat_per_100g || 0) * g / 100 * 10) / 10,
    };
    setNewItems(updated);
  };

  const handleGramsChange = (index: number, grams: number) => {
    const updated = [...newItems];
    const old = updated[index];
    const oldGrams = old.grams || 100;
    const ratio = grams / oldGrams;
    updated[index] = {
      ...old,
      grams,
      kcal: Math.round(old.kcal * ratio),
      protein: Math.round(old.protein * ratio * 10) / 10,
      carbs: Math.round(old.carbs * ratio * 10) / 10,
      fats: Math.round(old.fats * ratio * 10) / 10,
    };
    setNewItems(updated);
  };

  const handleSaveCombo = async () => {
    if (!user || !newTitle.trim() || newItems.length === 0) return;
    setSaving(true);
    try {
      const { data: meal, error: mealErr } = await supabase
        .from("user_favorite_meals" as any)
        .insert({ user_id: user.id, title: newTitle.trim() } as any)
        .select("id")
        .single();
      if (mealErr) throw mealErr;

      const itemsToInsert = newItems
        .filter((i) => i.name.trim())
        .map((i) => ({
          favorite_meal_id: (meal as any).id,
          ingredient_name: i.name,
          grams: i.grams,
          kcal: i.kcal,
          protein_g: i.protein,
          carbs_g: i.carbs,
          fats_g: i.fats,
        }));

      if (itemsToInsert.length > 0) {
        const { error } = await supabase.from("favorite_meal_items" as any).insert(itemsToInsert as any);
        if (error) throw error;
      }

      toast({ title: "Pasto preferito salvato! ✅" });
      setCreateOpen(false);
      setNewTitle("");
      setNewItems([]);
      fetchCombos();
    } catch (e: any) {
      toast({ variant: "destructive", title: "Errore", description: e.message });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    await supabase.from("user_favorite_meals" as any).delete().eq("id", id);
    fetchCombos();
  };

  const handleAddToDay = async (combo: FavMeal) => {
    if (!mealType) return;
    setAddingId(combo.id);
    try {
      await onAddToDay(combo.items, mealType);
      toast({ title: `"${combo.title}" aggiunto! ✅` });
    } catch (e: any) {
      toast({ variant: "destructive", title: "Errore", description: e.message });
    } finally {
      setAddingId(null);
    }
  };

  if (loading) return null;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
          <ChefHat className="h-3.5 w-3.5 text-primary" /> Pasti preferiti
        </p>
        <button
          onClick={() => { setCreateOpen(true); setNewItems([{ name: "", grams: 100, kcal: 0, protein: 0, carbs: 0, fats: 0 }]); }}
          className="text-xs font-semibold text-primary flex items-center gap-1"
        >
          <Plus className="h-3.5 w-3.5" /> Crea
        </button>
      </div>

      {combos.length === 0 ? (
        <p className="text-xs text-muted-foreground">Nessun pasto preferito salvato. Crea il tuo primo!</p>
      ) : (
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
          {combos.map((combo) => {
            const totalKcal = combo.items.reduce((s, i) => s + (i.kcal || 0), 0);
            return (
              <div key={combo.id} className="shrink-0 w-48 rounded-xl border border-border bg-card p-3 space-y-2">
                <div className="flex items-start justify-between">
                  <p className="text-sm font-semibold text-foreground line-clamp-1">{combo.title}</p>
                  <button onClick={() => handleDelete(combo.id)} className="p-0.5 text-muted-foreground hover:text-destructive">
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
                <div className="space-y-0.5">
                  {combo.items.slice(0, 3).map((item) => (
                    <p key={item.id} className="text-[10px] text-muted-foreground truncate">
                      {item.ingredient_name} · {item.grams}g
                    </p>
                  ))}
                  {combo.items.length > 3 && (
                    <p className="text-[10px] text-muted-foreground">+{combo.items.length - 3} altri</p>
                  )}
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-primary">{totalKcal} kcal</span>
                  {mealType && (
                    <button
                      onClick={() => handleAddToDay(combo)}
                      disabled={addingId === combo.id}
                      className="text-[10px] font-semibold text-primary-foreground bg-primary rounded-lg px-2 py-1 hover:opacity-90 disabled:opacity-50"
                    >
                      {addingId === combo.id ? <Loader2 className="h-3 w-3 animate-spin" /> : "Aggiungi"}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create combo sheet */}
      <Sheet open={createOpen} onOpenChange={setCreateOpen}>
        <SheetContent side="bottom" className="h-[80vh] rounded-t-3xl">
          <SheetHeader className="pb-3 border-b border-border">
            <SheetTitle>Nuovo pasto preferito</SheetTitle>
          </SheetHeader>
          <div className="space-y-4 py-4 overflow-y-auto flex-1">
            <Input
              placeholder="Nome del pasto (es. Pranzo leggero)"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
            />

            <div className="space-y-3">
              <p className="text-sm font-semibold text-foreground">Ingredienti</p>
              {newItems.map((item, idx) => (
                <div key={idx} className="flex items-center gap-2 rounded-lg bg-secondary/50 p-2">
                  <div className="flex-1 min-w-0">
                    <IngredientAutocomplete
                      value={item.name}
                      onSelect={(ing) => handleIngredientSelect(idx, ing)}
                      placeholder="Cerca ingrediente..."
                    />
                  </div>
                  <Input
                    type="number"
                    value={item.grams}
                    onChange={(e) => handleGramsChange(idx, parseInt(e.target.value) || 0)}
                    className="w-16 text-center text-xs"
                    min={1}
                  />
                  <span className="text-xs text-muted-foreground">g</span>
                  <button
                    onClick={() => setNewItems(newItems.filter((_, i) => i !== idx))}
                    className="p-1 text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
              <button
                onClick={handleAddIngredient}
                className="flex items-center gap-1 text-xs font-medium text-primary"
              >
                <Plus className="h-3.5 w-3.5" /> Aggiungi ingrediente
              </button>
            </div>

            {newItems.some((i) => i.name) && (
              <div className="rounded-xl bg-primary/5 border border-primary/20 p-3">
                <p className="text-xs font-semibold text-foreground mb-1">Totale stimato</p>
                <div className="flex gap-3 text-xs text-muted-foreground">
                  <span>{newItems.reduce((s, i) => s + i.kcal, 0)} kcal</span>
                  <span>P {newItems.reduce((s, i) => s + i.protein, 0).toFixed(1)}g</span>
                  <span>C {newItems.reduce((s, i) => s + i.carbs, 0).toFixed(1)}g</span>
                  <span>G {newItems.reduce((s, i) => s + i.fats, 0).toFixed(1)}g</span>
                </div>
              </div>
            )}

            <Button
              className="w-full"
              onClick={handleSaveCombo}
              disabled={saving || !newTitle.trim() || !newItems.some((i) => i.name.trim())}
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Salva pasto preferito
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
};

export default FavoriteMealCombos;
