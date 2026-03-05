import { useState, useRef, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import MobileHeader from "@/components/MobileHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import IngredientAutocomplete from "@/components/IngredientAutocomplete";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import {
  Camera, Upload, Plus, Trash2, AlertTriangle, Loader2, Save, Sparkles,
} from "lucide-react";

/* ─── types ─── */
interface IngredientRow {
  id: string;
  name: string;
  grams: number;
  per100: { protein: number; carbs: number; fats: number; kcal: number } | null;
  templateId: string | null;       // food_templates id
  ingredientId: string | null;     // ingredients table id
}

type Confidence = "high" | "medium" | "low";

const MEAL_TYPES = [
  { value: "colazione", label: "☀️ Colazione" },
  { value: "pranzo", label: "🌤️ Pranzo" },
  { value: "cena", label: "🌙 Cena" },
  { value: "spuntino", label: "🍎 Spuntino" },
];

const confidenceColor: Record<Confidence, string> = {
  high: "bg-green-500/15 text-green-700 border-green-300",
  medium: "bg-yellow-500/15 text-yellow-700 border-yellow-300",
  low: "bg-red-500/15 text-red-700 border-red-300",
};
const confidenceLabel: Record<Confidence, string> = {
  high: "Alta", medium: "Media", low: "Bassa",
};

let _idCounter = 0;
const uid = () => `ing_${++_idCounter}`;

/* ─── component ─── */
const MealPhotoPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);

  // Step 1 state
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [mealType, setMealType] = useState("pranzo");
  const [notes, setNotes] = useState("");
  const [analyzing, setAnalyzing] = useState(false);

  // Step 2 state
  const [dishName, setDishName] = useState("");
  const [confidence, setConfidence] = useState<Confidence>("medium");
  const [portionG, setPortionG] = useState(300);
  const [basePortion, setBasePortion] = useState(300);
  const [ingredients, setIngredients] = useState<IngredientRow[]>([]);
  const [analyzed, setAnalyzed] = useState(false);
  const [saving, setSaving] = useState(false);

  /* ─── helpers ─── */
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageFile(file);
    const reader = new FileReader();
    reader.onload = () => setImagePreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  /* ─── analyze ─── */
  const handleAnalyze = async () => {
    if (!imageFile) return;
    setAnalyzing(true);
    try {
      const arrayBuf = await imageFile.arrayBuffer();
      const bytes = new Uint8Array(arrayBuf);
      let binary = "";
      for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
      const base64 = btoa(binary);

      const { data, error } = await supabase.functions.invoke("analyze-meal-photo", {
        body: {
          image_base64: base64,
          mime_type: imageFile.type || "image/jpeg",
          meal_type: mealType,
          notes: notes || undefined,
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      // Edge function now returns enriched data
      const { dish_name, confidence: conf, portion_g, ingredients: enrichedIngs } = data;

      setDishName(dish_name || "Piatto sconosciuto");
      setConfidence((conf as Confidence) || "medium");
      setPortionG(portion_g || 300);
      setBasePortion(portion_g || 300);

      const rows: IngredientRow[] = (enrichedIngs || []).map((i: any) => ({
        id: uid(),
        name: i.name,
        grams: i.grams,
        per100: i.per100
          ? { protein: i.per100.protein, carbs: i.per100.carbs, fats: i.per100.fat, kcal: i.per100.kcal }
          : null,
        templateId: null,
        ingredientId: i.ingredient_id || null,
      }));

      setIngredients(rows);
      setAnalyzed(true);
    } catch (err: any) {
      toast({ variant: "destructive", title: "Errore analisi", description: err.message });
    } finally {
      setAnalyzing(false);
    }
  };

  /* ─── scaling ─── */
  const handlePortionSlider = (val: number[]) => {
    const newP = val[0];
    const oldP = portionG;
    if (oldP <= 0) return;
    const ratio = newP / oldP;
    setIngredients((prev) =>
      prev.map((ing) => ({ ...ing, grams: Math.round(ing.grams * ratio * 10) / 10 }))
    );
    setPortionG(newP);
  };

  const handleIngredientGramsChange = (id: string, newGrams: number) => {
    setIngredients((prev) => prev.map((i) => (i.id === id ? { ...i, grams: newGrams } : i)));
    setPortionG((prev) => {
      const diff = newGrams - (ingredients.find((i) => i.id === id)?.grams ?? 0);
      return Math.max(0, Math.round((prev + diff) * 10) / 10);
    });
  };

  const removeIngredient = (id: string) => {
    const removed = ingredients.find((i) => i.id === id);
    setIngredients((prev) => prev.filter((i) => i.id !== id));
    if (removed) setPortionG((p) => Math.max(0, Math.round((p - removed.grams) * 10) / 10));
  };

  const addIngredient = () => {
    setIngredients((prev) => [
      ...prev,
      { id: uid(), name: "", grams: 0, per100: null, templateId: null, ingredientId: null },
    ]);
  };

  /* ─── computed macros ─── */
  const totals = useMemo(() => {
    let kcal = 0, protein = 0, carbs = 0, fats = 0;
    for (const ing of ingredients) {
      if (!ing.per100) continue;
      const factor = ing.grams / 100;
      kcal += ing.per100.kcal * factor;
      protein += ing.per100.protein * factor;
      carbs += ing.per100.carbs * factor;
      fats += ing.per100.fats * factor;
    }
    return {
      kcal: Math.round(kcal),
      protein: Math.round(protein * 10) / 10,
      carbs: Math.round(carbs * 10) / 10,
      fats: Math.round(fats * 10) / 10,
    };
  }, [ingredients]);

  /* ─── save ─── */
  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    try {
      // 1. Upload photo
      let photoUrl: string | null = null;
      if (imageFile) {
        const ts = Date.now();
        const path = `meals/${user.id}/${ts}.jpg`;
        const { error: upErr } = await supabase.storage
          .from("media")
          .upload(path, imageFile, { contentType: imageFile.type, upsert: true });
        if (!upErr) {
          const { data: urlData } = supabase.storage.from("media").getPublicUrl(path);
          photoUrl = urlData.publicUrl;
        }
      }

      // 2. Save to meal_logs
      const { data: logRow, error: logErr } = await supabase
        .from("meal_logs")
        .insert({
          user_id: user.id,
          meal_type: mealType,
          dish_name: dishName,
          portion_g: portionG,
          carbs_g: totals.carbs,
          protein_g: totals.protein,
          fat_g: totals.fats,
          kcal: totals.kcal,
          photo_url: photoUrl,
        })
        .select("id")
        .single();

      if (logErr) throw logErr;

      // 3. Save meal_log_ingredients
      const ingRows = ingredients.map((ing) => {
        const factor = ing.grams / 100;
        return {
          meal_log_id: logRow.id,
          ingredient_id: ing.ingredientId || null,
          ingredient_name: ing.name || "Ingrediente",
          grams: ing.grams,
          carbs_g: ing.per100 ? Math.round(ing.per100.carbs * factor * 10) / 10 : 0,
          protein_g: ing.per100 ? Math.round(ing.per100.protein * factor * 10) / 10 : 0,
          fat_g: ing.per100 ? Math.round(ing.per100.fats * factor * 10) / 10 : 0,
          kcal: ing.per100 ? Math.round(ing.per100.kcal * factor) : 0,
        };
      });

      if (ingRows.length > 0) {
        const { error: ingErr } = await supabase.from("meal_log_ingredients").insert(ingRows);
        if (ingErr) throw ingErr;
      }

      // 4. Also save to existing meal_items system for backward compatibility
      const today = new Date().toISOString().slice(0, 10);
      let { data: dayRow } = await supabase
        .from("meal_days")
        .select("id")
        .eq("user_id", user.id)
        .eq("day_date", today)
        .maybeSingle();

      if (!dayRow) {
        const { data: newDay, error: dayErr } = await supabase
          .from("meal_days")
          .insert({ user_id: user.id, day_date: today })
          .select("id")
          .single();
        if (dayErr) throw dayErr;
        dayRow = newDay;
      }

      let { data: mealRow } = await supabase
        .from("meals")
        .select("id")
        .eq("meal_day_id", dayRow!.id)
        .eq("meal_type", mealType)
        .maybeSingle();

      if (!mealRow) {
        const { data: newMeal, error: mealErr } = await supabase
          .from("meals")
          .insert({ meal_day_id: dayRow!.id, meal_type: mealType })
          .select("id")
          .single();
        if (mealErr) throw mealErr;
        mealRow = newMeal;
      }

      const items = ingredients.map((ing, idx) => {
        const factor = ing.grams / 100;
        return {
          meal_id: mealRow!.id,
          custom_name: ing.name || "Ingrediente",
          source_type: "custom" as const,
          quantity: ing.grams,
          unit: "g",
          calories: ing.per100 ? Math.round(ing.per100.kcal * factor) : 0,
          macros: ing.per100
            ? {
                protein: Math.round(ing.per100.protein * factor * 10) / 10,
                carbs: Math.round(ing.per100.carbs * factor * 10) / 10,
                fats: Math.round(ing.per100.fats * factor * 10) / 10,
              }
            : null,
          photo_url: idx === 0 ? photoUrl : null,
          dish_name: idx === 0 ? dishName : null,
        };
      });

      const { error: insertErr } = await supabase.from("meal_items").insert(items);
      if (insertErr) console.error("meal_items backward compat insert failed:", insertErr);

      // 5. Cache dish
      try {
        const { data: dishRow } = await supabase
          .from("dishes")
          .insert({ name: dishName, photo_example_url: photoUrl })
          .select("id")
          .single();

        if (dishRow) {
          const dishIngRows = ingredients
            .filter((i) => i.templateId || i.ingredientId)
            .map((i) => ({
              dish_id: dishRow.id,
              ingredient_id: (i.templateId || i.ingredientId)!,
              grams_in_standard_portion: i.grams,
            }));
          if (dishIngRows.length > 0) {
            await supabase.from("dish_ingredients").insert(dishIngRows);
          }
        }
      } catch {
        // Cache failure is non-critical
      }

      toast({ title: "Pasto salvato nel diario! 🎉" });
      navigate("/meals");
    } catch (err: any) {
      toast({ variant: "destructive", title: "Errore salvataggio", description: err.message });
    } finally {
      setSaving(false);
    }
  };

  /* ─── render ─── */
  return (
    <div>
      <MobileHeader title="Foto AI" />
      <main className="space-y-5 px-4 py-5 pb-28">
        {/* ═══ STEP 1: Upload + Config ═══ */}
        {!analyzed && (
          <>
            <div
              onClick={() => fileRef.current?.click()}
              className="relative flex h-48 cursor-pointer items-center justify-center rounded-2xl border-2 border-dashed border-accent bg-card overflow-hidden active:scale-[0.98] transition-transform"
            >
              {imagePreview ? (
                <img src={imagePreview} alt="Preview" className="h-full w-full object-cover" />
              ) : (
                <div className="flex flex-col items-center gap-2 text-muted-foreground">
                  <Camera className="h-10 w-10" />
                  <span className="text-sm font-medium">Scatta o carica una foto</span>
                </div>
              )}
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={handleFileChange}
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Tipo di pasto</Label>
              <div className="flex flex-wrap gap-2">
                {MEAL_TYPES.map((mt) => (
                  <button
                    key={mt.value}
                    onClick={() => setMealType(mt.value)}
                    className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                      mealType === mt.value
                        ? "bg-primary text-primary-foreground"
                        : "bg-secondary text-secondary-foreground"
                    }`}
                  >
                    {mt.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Note (opzionale)</Label>
              <Input
                placeholder="Es: porzione abbondante, senza olio..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>

            <Button
              onClick={handleAnalyze}
              disabled={!imageFile || analyzing}
              className="w-full gap-2"
              size="lg"
            >
              {analyzing ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Analisi in corso...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" /> Analizza foto
                </>
              )}
            </Button>
          </>
        )}

        {/* ═══ STEP 2: Results ═══ */}
        {analyzed && (
          <>
            <div className="flex gap-3 items-start">
              {imagePreview && (
                <img src={imagePreview} alt="Piatto" className="h-20 w-20 rounded-xl object-cover shrink-0" />
              )}
              <div className="flex-1 space-y-1.5">
                <Input
                  value={dishName}
                  onChange={(e) => setDishName(e.target.value)}
                  className="font-semibold text-base"
                  placeholder="Nome piatto"
                />
                <Badge variant="outline" className={`text-xs ${confidenceColor[confidence]}`}>
                  Confidenza: {confidenceLabel[confidence]}
                </Badge>
              </div>
            </div>

            {confidence === "low" && (
              <div className="flex items-center gap-2 rounded-xl border border-yellow-300 bg-yellow-50 p-3 text-sm text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300 dark:border-yellow-700">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                Controlla ingredienti e porzione prima di salvare
              </div>
            )}

            <div className="space-y-2 rounded-xl border-2 border-accent bg-card p-4">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-semibold">Porzione totale</Label>
                <div className="flex items-center gap-1">
                  <Input
                    type="number"
                    value={portionG}
                    onChange={(e) => {
                      const v = parseFloat(e.target.value) || 0;
                      handlePortionSlider([v]);
                    }}
                    className="w-20 text-right text-sm h-8"
                    min={0}
                    step={10}
                  />
                  <span className="text-sm text-muted-foreground">g</span>
                </div>
              </div>
              <Slider min={50} max={1000} step={10} value={[portionG]} onValueChange={handlePortionSlider} />
            </div>

            <div className="grid grid-cols-4 gap-2">
              {[
                { label: "Kcal", value: totals.kcal, color: "text-primary" },
                { label: "Proteine", value: `${totals.protein}g`, color: "text-blue-600" },
                { label: "Carbo", value: `${totals.carbs}g`, color: "text-amber-600" },
                { label: "Grassi", value: `${totals.fats}g`, color: "text-red-500" },
              ].map((m) => (
                <div key={m.label} className="rounded-xl border-2 border-accent bg-card p-3 text-center">
                  <p className={`text-lg font-bold ${m.color}`}>{m.value}</p>
                  <p className="text-[10px] text-muted-foreground">{m.label}</p>
                </div>
              ))}
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-semibold">Ingredienti</Label>
              <div className="space-y-2">
                {ingredients.map((ing) => {
                  const factor = ing.grams / 100;
                  const kcal = ing.per100 ? Math.round(ing.per100.kcal * factor) : 0;
                  return (
                    <div key={ing.id} className="flex items-center gap-2 rounded-xl border border-accent bg-card p-3">
                      <div className="flex-1 min-w-0 space-y-1">
                        <IngredientAutocomplete
                          value={ing.name}
                          onChange={(newName) =>
                            setIngredients((prev) =>
                              prev.map((i) => (i.id === ing.id ? { ...i, name: newName } : i))
                            )
                          }
                          onSelect={(tmpl) =>
                            setIngredients((prev) =>
                              prev.map((i) =>
                                i.id === ing.id
                                  ? { ...i, name: tmpl.name, templateId: tmpl.id, per100: tmpl.per100 }
                                  : i
                              )
                            )
                          }
                          placeholder="Cerca ingrediente…"
                        />
                        <div className="flex items-center gap-2">
                          <Input
                            type="number"
                            value={ing.grams}
                            onChange={(e) =>
                              handleIngredientGramsChange(ing.id, parseFloat(e.target.value) || 0)
                            }
                            className="w-16 h-6 text-xs"
                            min={0}
                            step={5}
                          />
                          <span className="text-[10px] text-muted-foreground">g</span>
                          {ing.per100 ? (
                            <span className="text-[10px] text-muted-foreground">
                              {kcal} kcal · P{Math.round(ing.per100.protein * factor * 10) / 10} C
                              {Math.round(ing.per100.carbs * factor * 10) / 10} G
                              {Math.round(ing.per100.fats * factor * 10) / 10}
                            </span>
                          ) : (
                            <span className="text-[10px] text-yellow-600">⚠ macro non trovati</span>
                          )}
                        </div>
                      </div>
                      <button
                        onClick={() => removeIngredient(ing.id)}
                        className="p-1.5 text-muted-foreground hover:text-destructive transition-colors"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  );
                })}
              </div>
              <Button variant="outline" size="sm" className="gap-1" onClick={addIngredient}>
                <Plus className="h-3.5 w-3.5" /> Aggiungi ingrediente
              </Button>
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => {
                  setAnalyzed(false);
                  setIngredients([]);
                }}
              >
                ← Rianalizza
              </Button>
              <Button
                className="flex-1 gap-2"
                onClick={handleSave}
                disabled={saving || ingredients.length === 0}
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Salva nel diario
              </Button>
            </div>
          </>
        )}
      </main>
    </div>
  );
};

export default MealPhotoPage;
