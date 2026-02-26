import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import MobileHeader from "@/components/MobileHeader";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Send, Search, Apple, BookOpen } from "lucide-react";
import { useDebounce } from "@/hooks/useDebounce";

const ProClientSuggestPage = () => {
  const { clientId } = useParams<{ clientId: string }>();
  const { user } = useAuth();
  const { toast } = useToast();
  const [clientName, setClientName] = useState("");

  // Food tab
  const [foodSearch, setFoodSearch] = useState("");
  const debouncedFoodSearch = useDebounce(foodSearch, 300);
  const [foodResults, setFoodResults] = useState<any[]>([]);
  const [selectedFood, setSelectedFood] = useState<any>(null);
  const [foodQty, setFoodQty] = useState("100");
  const [foodUnit, setFoodUnit] = useState("g");
  const [foodMessage, setFoodMessage] = useState("");
  const [sendingFood, setSendingFood] = useState(false);

  // Recipe tab
  const [recipeSearch, setRecipeSearch] = useState("");
  const debouncedRecipeSearch = useDebounce(recipeSearch, 300);
  const [recipeResults, setRecipeResults] = useState<any[]>([]);
  const [sendingRecipe, setSendingRecipe] = useState<string | null>(null);

  // Past suggestions
  const [suggestions, setSuggestions] = useState<any[]>([]);

  useEffect(() => {
    if (!clientId) return;
    supabase.from("profiles").select("full_name").eq("id", clientId).single().then(({ data }) => {
      setClientName(data?.full_name || "Cliente");
    });
    loadSuggestions();
  }, [clientId]);

  const loadSuggestions = async () => {
    if (!user || !clientId) return;
    const { data } = await supabase
      .from("pro_suggestions")
      .select("*")
      .eq("professional_id", user.id)
      .eq("client_user_id", clientId)
      .order("created_at", { ascending: false })
      .limit(20);
    setSuggestions(data ?? []);
  };

  // Food search
  useEffect(() => {
    if (!debouncedFoodSearch || debouncedFoodSearch.length < 2) { setFoodResults([]); return; }
    supabase.from("products").select("id, name, brand, calories_100g, macros_100g").ilike("name", `%${debouncedFoodSearch}%`).limit(10)
      .then(({ data }) => setFoodResults(data ?? []));
  }, [debouncedFoodSearch]);

  // Recipe search
  useEffect(() => {
    if (!debouncedRecipeSearch || debouncedRecipeSearch.length < 2) { setRecipeResults([]); return; }
    supabase.from("recipes").select("id, title, category, image_url, servings").eq("is_public", true).ilike("title", `%${debouncedRecipeSearch}%`).limit(10)
      .then(({ data }) => setRecipeResults(data ?? []));
    // Also search generated recipes
    if (user && clientId) {
      supabase.from("generated_recipes").select("*").eq("professional_id", user.id).eq("client_user_id", clientId).ilike("title", `%${debouncedRecipeSearch}%`).limit(5)
        .then(({ data }) => {
          if (data && data.length > 0) {
            setRecipeResults(prev => [...prev, ...data.map(r => ({ ...r, _generated: true }))]);
          }
        });
    }
  }, [debouncedRecipeSearch, user, clientId]);

  const sendFoodSuggestion = async () => {
    if (!user || !clientId || !selectedFood) return;
    setSendingFood(true);
    const qty = parseFloat(foodQty) || 100;
    const cal100 = selectedFood.calories_100g ?? 0;
    const mac100 = selectedFood.macros_100g as any;
    const factor = qty / 100;

    const payload = {
      product_id: selectedFood.id,
      name: selectedFood.name,
      brand: selectedFood.brand,
      quantity: qty,
      unit: foodUnit,
      calories: Math.round(cal100 * factor),
      macros: mac100 ? {
        protein: Math.round(mac100.protein * factor * 10) / 10,
        carbs: Math.round(mac100.carbs * factor * 10) / 10,
        fats: Math.round(mac100.fats * factor * 10) / 10,
      } : null,
      message: foodMessage,
    };

    const { error } = await supabase.from("pro_suggestions").insert({
      professional_id: user.id,
      client_user_id: clientId,
      type: "food",
      payload,
    });

    setSendingFood(false);
    if (error) {
      toast({ variant: "destructive", title: "Errore", description: error.message });
    } else {
      toast({ title: "Suggerimento inviato! ✅" });
      setSelectedFood(null);
      setFoodMessage("");
      setFoodSearch("");
      loadSuggestions();
    }
  };

  const sendRecipeSuggestion = async (recipe: any) => {
    if (!user || !clientId) return;
    setSendingRecipe(recipe.id);
    const payload = {
      recipe_id: recipe._generated ? undefined : recipe.id,
      generated_recipe_id: recipe._generated ? recipe.id : undefined,
      title: recipe.title || recipe.name,
      category: recipe.category,
      kcal_total: recipe.kcal_total,
      macros: recipe.macros,
    };

    const { error } = await supabase.from("pro_suggestions").insert({
      professional_id: user.id,
      client_user_id: clientId,
      type: "recipe",
      payload,
    });

    setSendingRecipe(null);
    if (error) {
      toast({ variant: "destructive", title: "Errore", description: error.message });
    } else {
      toast({ title: "Ricetta suggerita! ✅" });
      loadSuggestions();
    }
  };

  return (
    <div>
      <MobileHeader title={`Suggerisci — ${clientName}`} />
      <main className="px-4 py-5 pb-28 space-y-4">
        <Tabs defaultValue="food">
          <TabsList className="w-full">
            <TabsTrigger value="food" className="flex-1 gap-1"><Apple className="h-3.5 w-3.5" /> Alimento</TabsTrigger>
            <TabsTrigger value="recipe" className="flex-1 gap-1"><BookOpen className="h-3.5 w-3.5" /> Ricetta</TabsTrigger>
          </TabsList>

          <TabsContent value="food" className="space-y-3 mt-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="Cerca alimento..." className="pl-9" value={foodSearch} onChange={(e) => setFoodSearch(e.target.value)} />
            </div>

            {foodResults.map((p) => (
              <Card key={p.id} className={`border cursor-pointer transition-colors ${selectedFood?.id === p.id ? "border-primary bg-primary/5" : "border-border"}`} onClick={() => setSelectedFood(p)}>
                <CardContent className="py-2.5 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">{p.name}</p>
                    <p className="text-xs text-muted-foreground">{p.brand || ""} · {p.calories_100g ?? "—"} kcal/100g</p>
                  </div>
                </CardContent>
              </Card>
            ))}

            {selectedFood && (
              <Card className="border-2 border-primary/30">
                <CardContent className="py-3 space-y-2">
                  <p className="text-sm font-semibold">{selectedFood.name}</p>
                  <div className="flex gap-2">
                    <Input type="number" value={foodQty} onChange={(e) => setFoodQty(e.target.value)} placeholder="Quantità" className="w-20" />
                    <Input value={foodUnit} onChange={(e) => setFoodUnit(e.target.value)} placeholder="Unità" className="w-16" />
                    {selectedFood.calories_100g && (
                      <span className="text-xs self-center text-muted-foreground">
                        ≈ {Math.round(selectedFood.calories_100g * (parseFloat(foodQty) || 0) / 100)} kcal
                      </span>
                    )}
                  </div>
                  <Textarea placeholder="Perché lo consigli? (opzionale)" value={foodMessage} onChange={(e) => setFoodMessage(e.target.value)} rows={2} />
                  <Button className="w-full gap-2" onClick={sendFoodSuggestion} disabled={sendingFood}>
                    {sendingFood ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                    Invia suggerimento
                  </Button>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="recipe" className="space-y-3 mt-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="Cerca ricetta..." className="pl-9" value={recipeSearch} onChange={(e) => setRecipeSearch(e.target.value)} />
            </div>

            {recipeResults.map((r) => (
              <Card key={r.id} className="border border-border">
                <CardContent className="py-2.5 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">{r.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {r._generated ? "🧪 Generata" : r.category || "Ricetta pubblica"}
                      {r.kcal_total ? ` · ${r.kcal_total} kcal` : ""}
                    </p>
                  </div>
                  <Button size="sm" variant="ghost" onClick={() => sendRecipeSuggestion(r)} disabled={sendingRecipe === r.id}>
                    {sendingRecipe === r.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </TabsContent>
        </Tabs>

        {/* Past suggestions */}
        {suggestions.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-muted-foreground">Suggerimenti inviati</h3>
            {suggestions.map((s) => {
              const p = s.payload as any;
              return (
                <div key={s.id} className="flex items-center gap-2 rounded-lg bg-secondary/50 p-2.5 text-xs">
                  <span>{s.type === "food" ? "🍎" : "📖"}</span>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{p?.name || p?.title || s.type}</p>
                    <p className="text-muted-foreground">{new Date(s.created_at).toLocaleDateString("it-IT")}</p>
                  </div>
                  {s.seen_at && <span className="text-green-600 text-[10px]">Letto</span>}
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
};

export default ProClientSuggestPage;
