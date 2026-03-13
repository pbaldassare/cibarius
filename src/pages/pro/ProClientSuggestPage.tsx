import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import MobileHeader from "@/components/MobileHeader";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Send, Search, Apple, BookOpen, MessageSquare, Trash2, Wand2, PenLine } from "lucide-react";
import { useDebounce } from "@/hooks/useDebounce";
import ProRecipeEditor, { type RecipeData } from "@/components/ProRecipeEditor";

interface FoodResult {
  id: string;
  name: string;
  brand?: string | null;
  kcal: number;
  protein: number;
  carbs: number;
  fats: number;
  source: "product" | "template" | "ingredient";
}

const MEAL_LABELS: Record<string, string> = {
  colazione: "☀️ Colazione",
  pranzo: "🌤️ Pranzo",
  cena: "🌙 Cena",
  spuntino: "🍎 Spuntino",
};

const ProClientSuggestPage = () => {
  const { clientId } = useParams<{ clientId: string }>();
  const { user } = useAuth();
  const { toast } = useToast();
  const [clientName, setClientName] = useState("");

  // Food tab
  const [foodSearch, setFoodSearch] = useState("");
  const debouncedFoodSearch = useDebounce(foodSearch, 300);
  const [foodResults, setFoodResults] = useState<FoodResult[]>([]);
  const [foodSearching, setFoodSearching] = useState(false);
  const [selectedFood, setSelectedFood] = useState<FoodResult | null>(null);
  const [foodQty, setFoodQty] = useState("100");
  const [foodUnit, setFoodUnit] = useState("g");
  const [foodMessage, setFoodMessage] = useState("");
  const [sendingFood, setSendingFood] = useState(false);

  // Recipe tab
  const [recipeMode, setRecipeMode] = useState<"search" | "ai" | "manual">("search");
  const [recipeSearch, setRecipeSearch] = useState("");
  const debouncedRecipeSearch = useDebounce(recipeSearch, 300);
  const [recipeResults, setRecipeResults] = useState<any[]>([]);
  const [sendingRecipe, setSendingRecipe] = useState<string | null>(null);

  // AI recipe generation
  const [aiMealType, setAiMealType] = useState("pranzo");
  const [aiGenerating, setAiGenerating] = useState(false);
  const [aiRecipe, setAiRecipe] = useState<RecipeData | null>(null);
  const [aiSending, setAiSending] = useState(false);

  // Manual recipe
  const [manualSending, setManualSending] = useState(false);

  // Meal targets for AI
  const [mealTargets, setMealTargets] = useState<any[]>([]);

  // Free text tab
  const [freeText, setFreeText] = useState("");
  const [sendingText, setSendingText] = useState(false);

  // Past suggestions
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    if (!clientId || !user) return;
    supabase.from("profiles").select("full_name").eq("id", clientId).single().then(({ data }) => {
      setClientName(data?.full_name || "Cliente");
    });
    loadSuggestions();
    // Load meal targets for AI generation
    supabase
      .from("diet_plans")
      .select("id, diet_plan_meal_targets(*)")
      .eq("professional_id", user.id)
      .eq("client_user_id", clientId)
      .eq("is_active", true)
      .maybeSingle()
      .then(({ data }) => {
        if (data) setMealTargets((data as any).diet_plan_meal_targets ?? []);
      });
  }, [clientId, user]);

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

  // Multi-source food search
  useEffect(() => {
    if (!debouncedFoodSearch || debouncedFoodSearch.length < 2) {
      setFoodResults([]);
      return;
    }
    setFoodSearching(true);
    const term = `%${debouncedFoodSearch}%`;

    Promise.all([
      supabase.from("products").select("id, name, brand, calories_100g, macros_100g").ilike("name", term).eq("nutrition_available", true).limit(8),
      supabase.from("food_templates").select("id, name, calories_100g, protein_100g, carbs_100g, fats_100g, category").ilike("name", term).limit(8),
      supabase.from("ingredients").select("id, name, kcal_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g").ilike("name", term).limit(8),
    ]).then(([prodRes, tmplRes, ingrRes]) => {
      const results: FoodResult[] = [];
      const seen = new Set<string>();
      for (const p of (prodRes.data ?? [])) {
        const key = p.name.toLowerCase();
        if (seen.has(key)) continue;
        seen.add(key);
        const mac = p.macros_100g as any;
        results.push({ id: p.id, name: p.name, brand: p.brand, kcal: p.calories_100g ?? 0, protein: mac?.protein ?? 0, carbs: mac?.carbs ?? 0, fats: mac?.fats ?? 0, source: "product" });
      }
      for (const t of (tmplRes.data ?? [])) {
        const key = t.name.toLowerCase();
        if (seen.has(key)) continue;
        seen.add(key);
        results.push({ id: t.id, name: t.name, kcal: t.calories_100g, protein: t.protein_100g, carbs: t.carbs_100g, fats: t.fats_100g, source: "template" });
      }
      for (const i of (ingrRes.data ?? [])) {
        const key = i.name.toLowerCase();
        if (seen.has(key)) continue;
        seen.add(key);
        results.push({ id: i.id, name: i.name, kcal: i.kcal_per_100g, protein: i.protein_per_100g, carbs: i.carbs_per_100g, fats: i.fat_per_100g, source: "ingredient" });
      }
      setFoodResults(results.slice(0, 15));
      setFoodSearching(false);
    });
  }, [debouncedFoodSearch]);

  // Recipe search
  useEffect(() => {
    if (!debouncedRecipeSearch || debouncedRecipeSearch.length < 2) { setRecipeResults([]); return; }
    const term = `%${debouncedRecipeSearch}%`;
    const promises: Promise<any>[] = [
      (supabase.from("recipes" as any).select("id, title, category, image_url, servings").eq("is_public", true).ilike("title", term).limit(10) as any).then((r: any) => r),
    ];
    if (user && clientId) {
      promises.push(
        Promise.resolve(supabase.from("generated_recipes").select("*").eq("professional_id", user.id).eq("client_user_id", clientId).ilike("title", term).limit(5))
      );
    }
    Promise.all(promises).then(([pubRes, genRes]) => {
      const r = (pubRes.data ?? []) as any[];
      if (genRes?.data) {
        r.push(...genRes.data.map((g: any) => ({ ...g, _generated: true })));
      }
      setRecipeResults(r);
    });
  }, [debouncedRecipeSearch, user, clientId]);

  const sendFoodSuggestion = async () => {
    if (!user || !clientId || !selectedFood) return;
    setSendingFood(true);
    const qty = parseFloat(foodQty) || 100;
    const factor = qty / 100;
    const payload = {
      food_id: selectedFood.id, food_source: selectedFood.source,
      name: selectedFood.name, brand: selectedFood.brand,
      quantity: qty, unit: foodUnit,
      calories: Math.round(selectedFood.kcal * factor),
      macros: {
        protein: Math.round(selectedFood.protein * factor * 10) / 10,
        carbs: Math.round(selectedFood.carbs * factor * 10) / 10,
        fats: Math.round(selectedFood.fats * factor * 10) / 10,
      },
      message: foodMessage,
    };
    const { error } = await supabase.from("pro_suggestions").insert({ professional_id: user.id, client_user_id: clientId, type: "food", payload });
    setSendingFood(false);
    if (error) { toast({ variant: "destructive", title: "Errore", description: error.message }); }
    else { toast({ title: "Suggerimento inviato! ✅" }); setSelectedFood(null); setFoodMessage(""); setFoodSearch(""); loadSuggestions(); }
  };

  const sendRecipeSuggestion = async (recipe: any) => {
    if (!user || !clientId) return;
    setSendingRecipe(recipe.id);
    const payload = {
      recipe_id: recipe._generated ? undefined : recipe.id,
      generated_recipe_id: recipe._generated ? recipe.id : undefined,
      title: recipe.title || recipe.name,
      category: recipe.category, kcal_total: recipe.kcal_total, macros: recipe.macros,
    };
    const { error } = await supabase.from("pro_suggestions").insert({ professional_id: user.id, client_user_id: clientId, type: "recipe", payload });
    setSendingRecipe(null);
    if (error) { toast({ variant: "destructive", title: "Errore", description: error.message }); }
    else { toast({ title: "Ricetta suggerita! ✅" }); loadSuggestions(); }
  };

  // AI recipe generation
  const generateAiRecipe = async () => {
    if (!user || !clientId) return;
    const target = mealTargets.find((t: any) => t.meal_type === aiMealType);
    if (!target) {
      toast({ variant: "destructive", title: "Nessun target", description: "Imposta prima un piano alimentare con target per questo pasto." });
      return;
    }
    setAiGenerating(true);
    setAiRecipe(null);

    const { data, error } = await supabase.functions.invoke("generate-meal-recipe", {
      body: {
        meal_type: aiMealType,
        kcal_target: target.kcal_target,
        protein_g: target.protein_g,
        carbs_g: target.carbs_g,
        fats_g: target.fats_g,
        diet_category: "mediterranea",
      },
    });

    setAiGenerating(false);
    if (error || data?.error) {
      toast({ variant: "destructive", title: "Errore IA", description: data?.error || error?.message || "Errore generazione" });
      return;
    }

    const r = data.recipe;
    if (r) {
      setAiRecipe({
        title: r.title,
        instructions: r.instructions,
        ingredients: (r.ingredients ?? []).map((i: any) => ({
          name: i.name, grams: i.grams, kcal: i.kcal, protein_g: i.protein_g, carbs_g: i.carbs_g, fats_g: i.fats_g,
        })),
        kcal_total: r.kcal_total, protein_total: r.protein_total, carbs_total: r.carbs_total, fats_total: r.fats_total,
      });
    }
  };

  // Send recipe from editor (AI or manual)
  const sendEditorRecipe = async (recipe: RecipeData, setLoading: (v: boolean) => void) => {
    if (!user || !clientId) return;
    setLoading(true);

    // Save to generated_recipes
    const { data: saved, error: saveErr } = await supabase.from("generated_recipes").insert({
      professional_id: user.id,
      client_user_id: clientId,
      meal_type: aiMealType,
      title: recipe.title,
      ingredients: recipe.ingredients.map(i => ({ name: i.name, qty: i.grams, unit: "g", product_id: undefined })) as any,
      instructions: recipe.instructions,
      kcal_total: recipe.kcal_total,
      macros: { protein: recipe.protein_total, carbs: recipe.carbs_total, fats: recipe.fats_total } as any,
    }).select().single();

    if (saveErr) {
      toast({ variant: "destructive", title: "Errore", description: saveErr.message });
      setLoading(false);
      return;
    }

    // Send as suggestion
    await supabase.from("pro_suggestions").insert({
      professional_id: user.id,
      client_user_id: clientId,
      type: "recipe",
      payload: {
        generated_recipe_id: saved.id,
        title: recipe.title,
        meal_type: aiMealType,
        kcal_total: recipe.kcal_total,
        macros: { protein: recipe.protein_total, carbs: recipe.carbs_total, fats: recipe.fats_total },
        ingredients: recipe.ingredients,
        instructions: recipe.instructions,
      } as any,
    });

    setLoading(false);
    toast({ title: "Ricetta inviata al cliente! ✅" });
    setAiRecipe(null);
    loadSuggestions();
  };

  const sendTextSuggestion = async () => {
    if (!user || !clientId || !freeText.trim()) return;
    setSendingText(true);
    const { error } = await supabase.from("pro_suggestions").insert({ professional_id: user.id, client_user_id: clientId, type: "note", payload: { message: freeText.trim() } });
    setSendingText(false);
    if (error) { toast({ variant: "destructive", title: "Errore", description: error.message }); }
    else { toast({ title: "Nota inviata! ✅" }); setFreeText(""); loadSuggestions(); }
  };

  const deleteSuggestion = async (id: string) => {
    setDeletingId(id);
    const { error } = await supabase.from("pro_suggestions").delete().eq("id", id);
    setDeletingId(null);
    if (!error) { setSuggestions((prev) => prev.filter((s) => s.id !== id)); toast({ title: "Suggerimento rimosso" }); }
  };

  const qtyNum = parseFloat(foodQty) || 0;
  const currentMealTarget = mealTargets.find((t: any) => t.meal_type === aiMealType);

  return (
    <div>
      <MobileHeader title={`Suggerisci — ${clientName}`} />
      <main className="px-4 py-5 pb-28 space-y-4">
        <Tabs defaultValue="food">
          <TabsList className="w-full">
            <TabsTrigger value="food" className="flex-1 gap-1"><Apple className="h-3.5 w-3.5" /> Alimento</TabsTrigger>
            <TabsTrigger value="recipe" className="flex-1 gap-1"><BookOpen className="h-3.5 w-3.5" /> Ricetta</TabsTrigger>
            <TabsTrigger value="note" className="flex-1 gap-1"><MessageSquare className="h-3.5 w-3.5" /> Nota</TabsTrigger>
          </TabsList>

          {/* ── Food tab ── */}
          <TabsContent value="food" className="space-y-3 mt-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="Cerca alimento (es. pollo, pasta, mela)..." className="pl-9" value={foodSearch} onChange={(e) => setFoodSearch(e.target.value)} />
            </div>
            {foodSearching && <p className="text-xs text-muted-foreground text-center">Ricerca...</p>}
            {foodResults.length === 0 && debouncedFoodSearch.length >= 2 && !foodSearching && (
              <p className="text-xs text-muted-foreground text-center py-2">Nessun risultato per "{debouncedFoodSearch}"</p>
            )}
            {foodResults.map((f) => (
              <Card key={`${f.source}-${f.id}`} className={`border cursor-pointer transition-colors ${selectedFood?.id === f.id && selectedFood?.source === f.source ? "border-primary bg-primary/5" : "border-border"}`} onClick={() => setSelectedFood(f)}>
                <CardContent className="py-2.5">
                  <p className="text-sm font-medium">{f.name}</p>
                  <p className="text-xs text-muted-foreground">{f.brand ? `${f.brand} · ` : ""}{f.kcal} kcal · P {f.protein}g · C {f.carbs}g · G {f.fats}g</p>
                </CardContent>
              </Card>
            ))}
            {selectedFood && (
              <Card className="border-2 border-primary/30">
                <CardContent className="py-3 space-y-2">
                  <p className="text-sm font-semibold">{selectedFood.name}</p>
                  <div className="flex gap-2 items-center">
                    <Input type="number" value={foodQty} onChange={(e) => setFoodQty(e.target.value)} placeholder="Quantità" className="w-20" />
                    <Input value={foodUnit} onChange={(e) => setFoodUnit(e.target.value)} placeholder="Unità" className="w-16" />
                    <span className="text-xs text-muted-foreground whitespace-nowrap">≈ {Math.round(selectedFood.kcal * qtyNum / 100)} kcal</span>
                  </div>
                  <div className="flex gap-3 text-[11px] text-muted-foreground">
                    <span>P {(selectedFood.protein * qtyNum / 100).toFixed(1)}g</span>
                    <span>C {(selectedFood.carbs * qtyNum / 100).toFixed(1)}g</span>
                    <span>G {(selectedFood.fats * qtyNum / 100).toFixed(1)}g</span>
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

          {/* ── Recipe tab ── */}
          <TabsContent value="recipe" className="space-y-3 mt-3">
            {/* Mode selector */}
            <div className="flex gap-1.5">
              <Button size="sm" variant={recipeMode === "search" ? "default" : "outline"} className="flex-1 gap-1 text-xs" onClick={() => setRecipeMode("search")}>
                <Search className="h-3 w-3" /> Cerca
              </Button>
              <Button size="sm" variant={recipeMode === "ai" ? "default" : "outline"} className="flex-1 gap-1 text-xs" onClick={() => setRecipeMode("ai")}>
                <Wand2 className="h-3 w-3" /> Genera IA
              </Button>
              <Button size="sm" variant={recipeMode === "manual" ? "default" : "outline"} className="flex-1 gap-1 text-xs" onClick={() => setRecipeMode("manual")}>
                <PenLine className="h-3 w-3" /> Scrivi
              </Button>
            </div>

            {/* Search mode */}
            {recipeMode === "search" && (
              <>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input placeholder="Cerca ricetta..." className="pl-9" value={recipeSearch} onChange={(e) => setRecipeSearch(e.target.value)} />
                </div>
                {recipeResults.length === 0 && debouncedRecipeSearch.length >= 2 && (
                  <p className="text-xs text-muted-foreground text-center py-2">Nessuna ricetta trovata</p>
                )}
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
              </>
            )}

            {/* AI generation mode */}
            {recipeMode === "ai" && (
              <div className="space-y-3">
                <Select value={aiMealType} onValueChange={setAiMealType}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(MEAL_LABELS).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {currentMealTarget ? (
                  <div className="rounded-lg bg-primary/5 border border-primary/20 p-2.5 text-xs">
                    <p className="font-semibold mb-0.5">Target {MEAL_LABELS[aiMealType]}</p>
                    <div className="flex gap-3 text-muted-foreground">
                      <span>{currentMealTarget.kcal_target} kcal</span>
                      <span>P: {currentMealTarget.protein_g}g</span>
                      <span>C: {currentMealTarget.carbs_g}g</span>
                      <span>G: {currentMealTarget.fats_g}g</span>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-destructive">⚠️ Nessun target impostato per questo pasto. Crea prima un piano alimentare.</p>
                )}

                <Button className="w-full gap-2" onClick={generateAiRecipe} disabled={aiGenerating || !currentMealTarget}>
                  {aiGenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}
                  {aiGenerating ? "Generazione in corso..." : "Genera ricetta con IA"}
                </Button>

                {aiRecipe && (
                  <ProRecipeEditor
                    initialRecipe={aiRecipe}
                    onSend={(r) => sendEditorRecipe(r, setAiSending)}
                    sending={aiSending}
                    sendLabel="Invia al cliente"
                  />
                )}
              </div>
            )}

            {/* Manual mode */}
            {recipeMode === "manual" && (
              <div className="space-y-3">
                <p className="text-xs text-muted-foreground">Scrivi una ricetta personalizzata per il tuo cliente.</p>
                <ProRecipeEditor
                  onSend={(r) => sendEditorRecipe(r, setManualSending)}
                  sending={manualSending}
                  sendLabel="Invia ricetta al cliente"
                />
              </div>
            )}
          </TabsContent>

          {/* ── Free text / note tab ── */}
          <TabsContent value="note" className="space-y-3 mt-3">
            <p className="text-xs text-muted-foreground">Invia un consiglio libero, una nota o un promemoria al tuo cliente.</p>
            <Textarea placeholder="Es: Ricorda di bere almeno 2L di acqua al giorno..." value={freeText} onChange={(e) => setFreeText(e.target.value)} rows={4} />
            <Button className="w-full gap-2" onClick={sendTextSuggestion} disabled={sendingText || !freeText.trim()}>
              {sendingText ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              Invia nota
            </Button>
          </TabsContent>
        </Tabs>

        {/* Past suggestions */}
        {suggestions.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-muted-foreground">Suggerimenti inviati</h3>
            {suggestions.map((s) => {
              const p = s.payload as any;
              const icon = s.type === "food" ? "🍎" : s.type === "recipe" ? "📖" : "💬";
              return (
                <div key={s.id} className="flex items-center gap-2 rounded-lg bg-secondary/50 p-2.5 text-xs">
                  <span>{icon}</span>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{p?.name || p?.title || p?.message?.slice(0, 60) || s.type}</p>
                    <p className="text-muted-foreground">{new Date(s.created_at).toLocaleDateString("it-IT")}</p>
                  </div>
                  {s.seen_at && <span className="text-[10px]" style={{ color: "hsl(var(--primary))" }}>Letto</span>}
                  <button className="text-muted-foreground hover:text-destructive transition-colors p-1" onClick={() => deleteSuggestion(s.id)} disabled={deletingId === s.id}>
                    {deletingId === s.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                  </button>
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
