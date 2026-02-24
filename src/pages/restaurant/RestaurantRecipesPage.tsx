import { useEffect, useState, useCallback } from "react";
import MobileHeader from "@/components/MobileHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import ImageUpload from "@/components/ImageUpload";
import { supabase } from "@/integrations/supabase/client";
import { useRestaurant } from "@/hooks/useRestaurant";
import { useToast } from "@/hooks/use-toast";
import {
  BookOpen, Plus, Loader2, Search, Pencil, Trash2, Save,
  Clock, ChefHat, X, Eye, EyeOff, Flame,
} from "lucide-react";
import EmptyState from "@/components/EmptyState";
import ListSkeleton from "@/components/ListSkeleton";

interface Recipe {
  id: string;
  title: string;
  category: string | null;
  difficulty: string | null;
  prep_time_minutes: number | null;
  cook_time_minutes: number | null;
  servings: number | null;
  is_public: boolean;
  instructions: string | null;
  image_url: string | null;
}

interface Ingredient {
  id?: string;
  product_id: string;
  product_name?: string;
  quantity: number | null;
  unit: string | null;
  calories_100g?: number | null;
  macros_100g?: any;
}

interface Allergen {
  id: string;
  name: string;
  code: string;
}

const CATEGORIES = ["Antipasto", "Primo", "Secondo", "Contorno", "Dolce", "Bevanda", "Altro"];
const DIFFICULTIES = ["Facile", "Media", "Difficile"];

const RestaurantRecipesPage = () => {
  const { restaurant } = useRestaurant();
  const { toast } = useToast();

  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterCat, setFilterCat] = useState<string>("all");

  // Editor state
  const [editing, setEditing] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("");
  const [difficulty, setDifficulty] = useState("");
  const [prepTime, setPrepTime] = useState("");
  const [cookTime, setCookTime] = useState("");
  const [servings, setServings] = useState("1");
  const [isPublic, setIsPublic] = useState(false);
  const [instructions, setInstructions] = useState("");
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Ingredients
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [ingSearch, setIngSearch] = useState("");
  const [ingResults, setIngResults] = useState<any[]>([]);
  const [ingQty, setIngQty] = useState("100");
  const [ingUnit, setIngUnit] = useState("g");

  // Allergens
  const [allAllergens, setAllAllergens] = useState<Allergen[]>([]);
  const [selectedAllergens, setSelectedAllergens] = useState<Set<string>>(new Set());

  const loadRecipes = useCallback(async () => {
    if (!restaurant) return;
    setLoading(true);
    const { data } = await supabase
      .from("recipes")
      .select("*")
      .eq("restaurant_id", restaurant.id)
      .order("created_at", { ascending: false });
    setRecipes((data ?? []) as Recipe[]);
    setLoading(false);
  }, [restaurant]);

  useEffect(() => { loadRecipes(); }, [loadRecipes]);

  useEffect(() => {
    supabase.from("allergens").select("*").order("name").then(({ data }) => {
      setAllAllergens((data ?? []) as Allergen[]);
    });
  }, []);

  const searchIngredients = async (q: string) => {
    setIngSearch(q);
    if (q.length < 2) { setIngResults([]); return; }
    const { data } = await supabase
      .from("products")
      .select("id, name, brand, calories_100g, macros_100g")
      .or(`name.ilike.%${q}%,brand.ilike.%${q}%`)
      .limit(8);
    setIngResults(data ?? []);
  };

  const addIngredient = (product: any) => {
    if (ingredients.some((i) => i.product_id === product.id)) return;
    setIngredients([...ingredients, {
      product_id: product.id,
      product_name: product.name,
      quantity: parseFloat(ingQty) || 100,
      unit: ingUnit,
      calories_100g: product.calories_100g,
      macros_100g: product.macros_100g,
    }]);
    setIngSearch("");
    setIngResults([]);
  };

  const removeIngredient = (productId: string) => {
    setIngredients(ingredients.filter((i) => i.product_id !== productId));
  };

  const openEditor = async (recipe?: Recipe) => {
    if (recipe) {
      setEditId(recipe.id);
      setTitle(recipe.title);
      setCategory(recipe.category || "");
      setDifficulty(recipe.difficulty || "");
      setPrepTime(String(recipe.prep_time_minutes ?? ""));
      setCookTime(String(recipe.cook_time_minutes ?? ""));
      setServings(String(recipe.servings ?? 1));
      setIsPublic(recipe.is_public);
      setInstructions(recipe.instructions || "");
      setImageUrl(recipe.image_url);

      // Load ingredients
      const { data: ings } = await supabase
        .from("recipe_ingredients")
        .select("*, products(name, calories_100g, macros_100g)")
        .eq("recipe_id", recipe.id);
      setIngredients((ings ?? []).map((i: any) => ({
        id: i.id,
        product_id: i.product_id,
        product_name: i.products?.name,
        quantity: i.quantity,
        unit: i.unit,
        calories_100g: i.products?.calories_100g,
        macros_100g: i.products?.macros_100g,
      })));

      // Load allergens
      const { data: allergens } = await supabase
        .from("recipe_allergens")
        .select("allergen_id")
        .eq("recipe_id", recipe.id);
      setSelectedAllergens(new Set((allergens ?? []).map((a: any) => a.allergen_id)));
    } else {
      setEditId(null);
      setTitle("");
      setCategory("");
      setDifficulty("");
      setPrepTime("");
      setCookTime("");
      setServings("1");
      setIsPublic(false);
      setInstructions("");
      setImageUrl(null);
      setIngredients([]);
      setSelectedAllergens(new Set());
    }
    setEditing(true);
  };

  const handleSave = async () => {
    if (!restaurant || !title.trim()) return;
    setSaving(true);

    const recipeData = {
      restaurant_id: restaurant.id,
      title: title.trim(),
      category: category || null,
      difficulty: difficulty || null,
      prep_time_minutes: prepTime ? parseInt(prepTime) : null,
      cook_time_minutes: cookTime ? parseInt(cookTime) : null,
      servings: servings ? parseInt(servings) : 1,
      is_public: isPublic,
      instructions: instructions || null,
      image_url: imageUrl,
    };

    let recipeId = editId;

    if (editId) {
      const { error } = await supabase.from("recipes").update(recipeData).eq("id", editId);
      if (error) { toast({ variant: "destructive", title: "Errore", description: error.message }); setSaving(false); return; }
    } else {
      const { data, error } = await supabase.from("recipes").insert(recipeData).select("id").single();
      if (error || !data) { toast({ variant: "destructive", title: "Errore", description: error?.message }); setSaving(false); return; }
      recipeId = data.id;
    }

    // Sync ingredients
    await supabase.from("recipe_ingredients").delete().eq("recipe_id", recipeId!);
    if (ingredients.length > 0) {
      await supabase.from("recipe_ingredients").insert(
        ingredients.map((i) => ({ recipe_id: recipeId!, product_id: i.product_id, quantity: i.quantity, unit: i.unit }))
      );
    }

    // Sync allergens
    await supabase.from("recipe_allergens").delete().eq("recipe_id", recipeId!);
    if (selectedAllergens.size > 0) {
      await supabase.from("recipe_allergens").insert(
        Array.from(selectedAllergens).map((aid) => ({ recipe_id: recipeId!, allergen_id: aid }))
      );
    }

    setSaving(false);
    toast({ title: editId ? "Ricetta aggiornata!" : "Ricetta creata!" });
    setEditing(false);
    loadRecipes();
  };

  const handleDelete = async (id: string) => {
    await supabase.from("recipes").delete().eq("id", id);
    toast({ title: "Ricetta eliminata" });
    loadRecipes();
  };

  // Calc total kcal
  const totalKcal = ingredients.reduce((sum, i) => {
    if (!i.calories_100g || !i.quantity) return sum;
    let grams = i.quantity;
    if (i.unit === "kg" || i.unit === "l") grams *= 1000;
    else if (i.unit !== "g" && i.unit !== "ml") return sum;
    return sum + (grams / 100) * i.calories_100g;
  }, 0);
  const servingsNum = parseInt(servings) || 1;

  const filtered = recipes.filter((r) => {
    if (search && !r.title.toLowerCase().includes(search.toLowerCase())) return false;
    if (filterCat !== "all" && r.category !== filterCat) return false;
    return true;
  });

  // Editor view
  if (editing) {
    return (
      <div>
        <MobileHeader title={editId ? "Modifica Ricetta" : "Nuova Ricetta"} />
        <main className="px-4 py-5 pb-28 space-y-4">
          {/* Photo */}
          <ImageUpload
            imageUrl={imageUrl}
            onUploaded={(url) => setImageUrl(url)}
            storagePath={`restaurants/${restaurant?.id}/recipes`}
            className="h-48 w-full"
          />

          {/* Basic info */}
          <Input placeholder="Titolo ricetta *" value={title} onChange={(e) => setTitle(e.target.value)} />
          <div className="grid grid-cols-2 gap-2">
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger><SelectValue placeholder="Categoria" /></SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={difficulty} onValueChange={setDifficulty}>
              <SelectTrigger><SelectValue placeholder="Difficoltà" /></SelectTrigger>
              <SelectContent>
                {DIFFICULTIES.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <Input placeholder="Prep (min)" type="number" value={prepTime} onChange={(e) => setPrepTime(e.target.value)} />
            <Input placeholder="Cottura (min)" type="number" value={cookTime} onChange={(e) => setCookTime(e.target.value)} />
            <Input placeholder="Porzioni" type="number" value={servings} onChange={(e) => setServings(e.target.value)} />
          </div>

          <div className="flex items-center gap-3">
            <Switch checked={isPublic} onCheckedChange={setIsPublic} id="public-switch" />
            <Label htmlFor="public-switch" className="text-sm">Ricetta pubblica</Label>
            {isPublic ? <Eye className="h-4 w-4 text-primary" /> : <EyeOff className="h-4 w-4 text-muted-foreground" />}
          </div>

          <Textarea placeholder="Istruzioni / Procedimento" value={instructions} onChange={(e) => setInstructions(e.target.value)} className="min-h-[100px]" />

          {/* Ingredients */}
          <Card className="border-2 border-accent">
            <CardContent className="py-4 space-y-3">
              <h3 className="text-sm font-semibold text-foreground">Ingredienti</h3>
              <div className="flex gap-2">
                <Input placeholder="Cerca prodotto…" value={ingSearch} onChange={(e) => searchIngredients(e.target.value)} className="flex-1" />
                <Input placeholder="Qtà" type="number" value={ingQty} onChange={(e) => setIngQty(e.target.value)} className="w-16" />
                <Select value={ingUnit} onValueChange={setIngUnit}>
                  <SelectTrigger className="w-16"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="g">g</SelectItem>
                    <SelectItem value="kg">kg</SelectItem>
                    <SelectItem value="ml">ml</SelectItem>
                    <SelectItem value="l">l</SelectItem>
                    <SelectItem value="pezzi">pz</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {ingResults.length > 0 && (
                <div className="max-h-32 overflow-y-auto space-y-1 rounded-lg border border-border p-2">
                  {ingResults.map((p) => (
                    <button key={p.id} className="w-full text-left px-3 py-1.5 rounded hover:bg-secondary text-sm" onClick={() => addIngredient(p)}>
                      {p.name} {p.brand ? `(${p.brand})` : ""}
                    </button>
                  ))}
                </div>
              )}
              {ingredients.length > 0 && (
                <div className="space-y-1">
                  {ingredients.map((ing) => (
                    <div key={ing.product_id} className="flex items-center gap-2 rounded-lg bg-secondary p-2 text-sm">
                      <span className="flex-1 truncate">{ing.product_name}</span>
                      <span className="text-muted-foreground">{ing.quantity} {ing.unit}</span>
                      {ing.calories_100g && ing.quantity && (ing.unit === "g" || ing.unit === "ml") && (
                        <span className="text-xs text-muted-foreground">{Math.round((ing.quantity / 100) * ing.calories_100g)} kcal</span>
                      )}
                      <Button size="icon" variant="ghost" onClick={() => removeIngredient(ing.product_id)}>
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
              {totalKcal > 0 && (
                <div className="flex items-center gap-2 text-sm">
                  <Flame className="h-4 w-4 text-primary" />
                  <span className="font-medium">{Math.round(totalKcal)} kcal totali</span>
                  <span className="text-muted-foreground">· {Math.round(totalKcal / servingsNum)} kcal/porzione</span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Allergens */}
          <Card className="border-2 border-accent">
            <CardContent className="py-4 space-y-3">
              <h3 className="text-sm font-semibold text-foreground">Allergeni</h3>
              <div className="grid grid-cols-2 gap-2">
                {allAllergens.map((a) => (
                  <label key={a.id} className="flex items-center gap-2 text-sm cursor-pointer">
                    <Checkbox
                      checked={selectedAllergens.has(a.id)}
                      onCheckedChange={(checked) => {
                        const next = new Set(selectedAllergens);
                        if (checked) next.add(a.id); else next.delete(a.id);
                        setSelectedAllergens(next);
                      }}
                    />
                    {a.name}
                  </label>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={() => setEditing(false)}>Annulla</Button>
            <Button className="flex-1 gap-2" onClick={handleSave} disabled={saving || !title.trim()}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Salva
            </Button>
          </div>
        </main>
      </div>
    );
  }

  // List view
  return (
    <div>
      <MobileHeader title="Ricette" />
      <main className="px-4 py-5 space-y-4">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Cerca ricetta…" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
          </div>
          <Button className="gap-2" onClick={() => openEditor()}>
            <Plus className="h-4 w-4" /> Nuova
          </Button>
        </div>

        <Select value={filterCat} onValueChange={setFilterCat}>
          <SelectTrigger><SelectValue placeholder="Tutte le categorie" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tutte</SelectItem>
            {CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>

        {loading ? (
          <ListSkeleton count={3} variant="card" />
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={BookOpen}
            title="Nessuna ricetta"
            description="Crea la tua prima ricetta con ingredienti, allergeni e foto."
            actions={[{ label: "Crea ricetta", icon: Plus, onClick: () => openEditor() }]}
          />
        ) : (
          <div className="space-y-3">
            {filtered.map((r) => (
              <Card key={r.id} className="border-2 border-accent overflow-hidden">
                <div className="flex">
                  {r.image_url && (
                    <div className="w-24 h-24 shrink-0">
                      <img src={r.image_url} alt={r.title} className="h-full w-full object-cover" />
                    </div>
                  )}
                  <CardContent className="flex-1 py-3 px-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="text-sm font-semibold text-foreground">{r.title}</h3>
                        <div className="flex gap-1 mt-1 flex-wrap">
                          {r.category && <Badge variant="secondary" className="text-[10px]">{r.category}</Badge>}
                          <Badge variant={r.is_public ? "default" : "outline"} className="text-[10px]">
                            {r.is_public ? "Pubblica" : "Privata"}
                          </Badge>
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <Button size="icon" variant="ghost" onClick={() => openEditor(r)}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button size="icon" variant="ghost" className="text-destructive" onClick={() => handleDelete(r.id)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                    {(r.prep_time_minutes || r.cook_time_minutes) && (
                      <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        {r.prep_time_minutes && <span>Prep {r.prep_time_minutes}′</span>}
                        {r.cook_time_minutes && <span>Cottura {r.cook_time_minutes}′</span>}
                      </div>
                    )}
                  </CardContent>
                </div>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default RestaurantRecipesPage;
