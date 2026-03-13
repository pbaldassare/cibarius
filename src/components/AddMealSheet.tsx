import { useState, useEffect, useCallback } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useDebounce } from "@/hooks/useDebounce";
import { ArrowLeft, Search, Loader2, Plus, Minus, Check } from "lucide-react";

/* ─── types ─── */
type MealType = "colazione" | "pranzo" | "cena" | "spuntino";

interface Product {
  id: string;
  name: string;
  brand: string | null;
  calories_100g: number | null;
  macros_100g: Record<string, number> | null;
  image_url: string | null;
}

type Step = "type" | "search" | "quantity";

const mealOptions: { type: MealType; emoji: string; label: string }[] = [
  { type: "colazione", emoji: "☀️", label: "Colazione" },
  { type: "pranzo", emoji: "🌤️", label: "Pranzo" },
  { type: "cena", emoji: "🌙", label: "Cena" },
  { type: "spuntino", emoji: "🍎", label: "Spuntino" },
];

interface AddMealSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}

const AddMealSheet = ({ open, onOpenChange, onSaved }: AddMealSheetProps) => {
  const { user } = useAuth();
  const { toast } = useToast();

  const [step, setStep] = useState<Step>("type");
  const [selectedType, setSelectedType] = useState<MealType | null>(null);
  const [query, setQuery] = useState("");
  const debouncedQuery = useDebounce(query, 300);
  const [products, setProducts] = useState<Product[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [quantity, setQuantity] = useState(100);
  const [customName, setCustomName] = useState("");
  const [saving, setSaving] = useState(false);

  // Reset state when sheet closes
  useEffect(() => {
    if (!open) {
      setTimeout(() => {
        setStep("type");
        setSelectedType(null);
        setQuery("");
        setProducts([]);
        setSelectedProduct(null);
        setQuantity(100);
        setCustomName("");
      }, 300);
    }
  }, [open]);

  // Search products
  useEffect(() => {
    if (step !== "search" || !debouncedQuery.trim()) {
      if (!debouncedQuery.trim()) setProducts([]);
      return;
    }
    setSearching(true);
    supabase
      .from("products")
      .select("id, name, brand, calories_100g, macros_100g, image_url")
      .ilike("name", `%${debouncedQuery}%`)
      .eq("nutrition_available", true)
      .limit(20)
      .then(({ data }) => {
        setProducts((data as Product[]) ?? []);
        setSearching(false);
      });
  }, [debouncedQuery, step]);

  const calcCalories = useCallback(() => {
    if (!selectedProduct?.calories_100g) return 0;
    return Math.round((selectedProduct.calories_100g * quantity) / 100);
  }, [selectedProduct, quantity]);

  const calcMacros = useCallback(() => {
    if (!selectedProduct?.macros_100g) return null;
    const m = selectedProduct.macros_100g;
    return {
      protein: Math.round(((m.protein ?? 0) * quantity) / 100 * 10) / 10,
      carbs: Math.round(((m.carbs ?? 0) * quantity) / 100 * 10) / 10,
      fats: Math.round(((m.fats ?? 0) * quantity) / 100 * 10) / 10,
    };
  }, [selectedProduct, quantity]);

  const handleSelectType = (type: MealType) => {
    setSelectedType(type);
    setStep("search");
  };

  const handleSelectProduct = (product: Product) => {
    setSelectedProduct(product);
    setCustomName(product.name);
    setQuantity(100);
    setStep("quantity");
  };

  const handleSave = async () => {
    if (!user || !selectedType) return;
    setSaving(true);

    try {
      const today = new Date().toISOString().slice(0, 10);

      // 1. Get or create meal_day
      let { data: mealDay } = await supabase
        .from("meal_days")
        .select("id")
        .eq("user_id", user.id)
        .eq("day_date", today)
        .maybeSingle();

      if (!mealDay) {
        const { data: newDay, error: dayErr } = await supabase
          .from("meal_days")
          .insert({ user_id: user.id, day_date: today })
          .select("id")
          .single();
        if (dayErr) throw dayErr;
        mealDay = newDay;
      }

      // 2. Get or create meal for this type
      let { data: meal } = await supabase
        .from("meals")
        .select("id")
        .eq("meal_day_id", mealDay!.id)
        .eq("meal_type", selectedType)
        .maybeSingle();

      if (!meal) {
        const { data: newMeal, error: mealErr } = await supabase
          .from("meals")
          .insert({ meal_day_id: mealDay!.id, meal_type: selectedType })
          .select("id")
          .single();
        if (mealErr) throw mealErr;
        meal = newMeal;
      }

      // 3. Insert meal_item
      const macros = calcMacros();
      const { error: itemErr } = await supabase.from("meal_items").insert({
        meal_id: meal!.id,
        product_id: selectedProduct?.id ?? null,
        custom_name: customName || selectedProduct?.name || "Alimento",
        source_type: selectedProduct ? "product" : "custom",
        quantity,
        unit: "g",
        calories: calcCalories(),
        macros: macros ? { protein: macros.protein, carbs: macros.carbs, fats: macros.fats } : null,
      });

      if (itemErr) throw itemErr;

      toast({ title: "Alimento aggiunto!", description: `${customName} aggiunto a ${selectedType}` });
      onSaved();
      onOpenChange(false);
    } catch (err: any) {
      toast({ variant: "destructive", title: "Errore", description: err.message });
    } finally {
      setSaving(false);
    }
  };

  const goBack = () => {
    if (step === "quantity") setStep("search");
    else if (step === "search") setStep("type");
    else onOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[85vh] rounded-t-3xl px-0">
        <SheetHeader className="px-4 pb-3 border-b border-border">
          <div className="flex items-center gap-3">
            <button onClick={goBack} className="p-1 -ml-1 text-muted-foreground">
              <ArrowLeft className="h-5 w-5" />
            </button>
            <SheetTitle className="flex-1 text-base">
              {step === "type" && "Tipo di pasto"}
              {step === "search" && "Cerca alimento"}
              {step === "quantity" && "Quantità"}
            </SheetTitle>
          </div>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-4 py-4">
          {/* ─── Step 1: Meal Type ─── */}
          {step === "type" && (
            <div className="grid grid-cols-2 gap-3">
              {mealOptions.map(({ type, emoji, label }) => (
                <button
                  key={type}
                  onClick={() => handleSelectType(type)}
                  className="flex flex-col items-center gap-2 rounded-2xl border-2 border-border bg-card p-5 active:scale-95 transition-transform hover:border-primary"
                >
                  <span className="text-3xl">{emoji}</span>
                  <span className="text-sm font-semibold text-foreground">{label}</span>
                </button>
              ))}
            </div>
          )}

          {/* ─── Step 2: Search Product ─── */}
          {step === "search" && (
            <div className="space-y-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  autoFocus
                  placeholder="Cerca un prodotto..."
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  className="pl-10"
                />
              </div>

              {searching && (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
              )}

              {!searching && query.trim() && products.length === 0 && (
                <div className="text-center py-8">
                  <p className="text-sm text-muted-foreground">Nessun prodotto trovato</p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-3"
                    onClick={() => {
                      setSelectedProduct(null);
                      setCustomName(query);
                      setStep("quantity");
                    }}
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Aggiungi "{query}" manualmente
                  </Button>
                </div>
              )}

              <div className="space-y-1">
                {products.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => handleSelectProduct(p)}
                    className="flex w-full items-center gap-3 rounded-xl p-3 text-left active:bg-secondary transition-colors"
                  >
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-secondary overflow-hidden">
                      {p.image_url ? (
                        <img src={p.image_url} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <span className="text-lg">🍽️</span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{p.name}</p>
                      {p.brand && <p className="text-xs text-muted-foreground">{p.brand}</p>}
                    </div>
                    {p.calories_100g != null && (
                      <span className="text-xs font-medium text-primary shrink-0">
                        {p.calories_100g} kcal/100g
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ─── Step 3: Quantity ─── */}
          {step === "quantity" && (
            <div className="space-y-5">
              {/* Product summary */}
              <div className="flex items-center gap-3 rounded-xl border border-border bg-card p-3">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-secondary">
                  {selectedProduct?.image_url ? (
                    <img src={selectedProduct.image_url} alt="" className="h-full w-full object-cover rounded-lg" />
                  ) : (
                    <span className="text-xl">🍽️</span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <Input
                    value={customName}
                    onChange={(e) => setCustomName(e.target.value)}
                    className="text-sm font-medium border-0 p-0 h-auto bg-transparent focus-visible:ring-0"
                    placeholder="Nome alimento"
                  />
                  {selectedProduct?.brand && (
                    <p className="text-xs text-muted-foreground">{selectedProduct.brand}</p>
                  )}
                </div>
              </div>

              {/* Quantity selector */}
              <div className="space-y-2">
                <label className="text-sm font-semibold text-foreground">Quantità (grammi)</label>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setQuantity(Math.max(10, quantity - 10))}
                    className="flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-card active:bg-secondary"
                  >
                    <Minus className="h-4 w-4 text-foreground" />
                  </button>
                  <Input
                    type="number"
                    value={quantity}
                    onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 0))}
                    className="text-center text-lg font-bold flex-1"
                    min={1}
                  />
                  <button
                    onClick={() => setQuantity(quantity + 10)}
                    className="flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-card active:bg-secondary"
                  >
                    <Plus className="h-4 w-4 text-foreground" />
                  </button>
                </div>
                {/* Quick buttons */}
                <div className="flex gap-2">
                  {[50, 100, 150, 200, 300].map((g) => (
                    <button
                      key={g}
                      onClick={() => setQuantity(g)}
                      className={`flex-1 rounded-lg py-1.5 text-xs font-medium transition-colors ${
                        quantity === g
                          ? "bg-primary text-primary-foreground"
                          : "bg-secondary text-muted-foreground"
                      }`}
                    >
                      {g}g
                    </button>
                  ))}
                </div>
              </div>

              {/* Nutrition preview */}
              <div className="rounded-2xl border-2 border-accent bg-accent/5 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-foreground">Valori nutrizionali</span>
                  <span className="text-xs text-muted-foreground">{quantity}g</span>
                </div>
                <div className="text-center">
                  <span className="text-3xl font-bold text-primary">{calcCalories()}</span>
                  <span className="text-sm text-muted-foreground ml-1">kcal</span>
                </div>
                {calcMacros() && (
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { label: "Proteine", value: calcMacros()!.protein, color: "text-destructive" },
                      { label: "Carbo", value: calcMacros()!.carbs, color: "text-accent" },
                      { label: "Grassi", value: calcMacros()!.fats, color: "text-primary" },
                    ].map(({ label, value, color }) => (
                      <div key={label} className="flex flex-col items-center rounded-xl bg-card p-2">
                        <span className={`text-lg font-bold ${color}`}>{value}g</span>
                        <span className="text-[10px] text-muted-foreground">{label}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Save button */}
              <Button
                className="w-full h-12 text-base font-bold gap-2"
                onClick={handleSave}
                disabled={saving}
              >
                {saving ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <Check className="h-5 w-5" />
                )}
                Aggiungi a {selectedType}
              </Button>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default AddMealSheet;
