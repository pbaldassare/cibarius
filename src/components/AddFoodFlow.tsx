import { useState, useEffect, useCallback, useRef } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useDebounce } from "@/hooks/useDebounce";
import BarcodeScanner from "@/components/BarcodeScanner";
import { lookupBarcode, calcNutrition, type ProductData } from "@/lib/barcode";
import { Switch } from "@/components/ui/switch";
import {
  ArrowLeft, Search, ScanLine, Keyboard, Camera, Loader2,
  Package, Plus, Minus, Check, Flame, Archive, Thermometer, Snowflake,
  CalendarSearch, AlertTriangle, Sparkles,
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

/* ─── Types ─── */
export type AddFoodContext = "inventory" | "meal" | "recipe";
type MealType = "colazione" | "pranzo" | "cena" | "spuntino";
type Method = "search" | "scan" | "manual";
type Step = "method" | "scan" | "search" | "summary";

interface SearchProduct {
  id: string;
  name: string;
  brand: string | null;
  calories_100g: number | null;
  macros_100g: Record<string, number> | null;
  image_url: string | null;
  serving_size_g: number | null;
}

interface AddFoodFlowProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  context: AddFoodContext;
  contextId?: string; // meal_id or recipe_id
  mealType?: MealType; // pre-selected meal type for context=meal
  defaultRestaurantId?: string;
  onComplete: () => void;
}

const mealOptions: { type: MealType; emoji: string; label: string }[] = [
  { type: "colazione", emoji: "☀️", label: "Colazione" },
  { type: "pranzo", emoji: "🌤️", label: "Pranzo" },
  { type: "cena", emoji: "🌙", label: "Cena" },
  { type: "spuntino", emoji: "🍎", label: "Spuntino" },
];

const storageOptions = [
  { key: "ambiente", label: "Dispensa", icon: Archive },
  { key: "frigo", label: "Frigo", icon: Thermometer },
  { key: "freezer", label: "Congelatore", icon: Snowflake },
] as const;

const ctaLabels: Record<AddFoodContext, string> = {
  inventory: "Salva in magazzino",
  meal: "Aggiungi al pasto",
  recipe: "Aggiungi ingrediente",
};

const AddFoodFlow = ({
  open, onOpenChange, context, contextId, mealType: preselectedMealType,
  defaultRestaurantId, onComplete,
}: AddFoodFlowProps) => {
  const { user } = useAuth();
  const { toast } = useToast();

  // Flow state
  const [step, setStep] = useState<Step>("method");
  const [method, setMethod] = useState<Method | null>(null);

  // Product data
  const [selectedProduct, setSelectedProduct] = useState<SearchProduct | null>(null);
  const [scannedProduct, setScannedProduct] = useState<ProductData | null>(null);
  const [notFound, setNotFound] = useState(false);

  // Search
  const [query, setQuery] = useState("");
  const debouncedQuery = useDebounce(query, 300);
  const [searchResults, setSearchResults] = useState<SearchProduct[]>([]);
  const [searching, setSearching] = useState(false);

  // Scan
  const [scanLoading, setScanLoading] = useState(false);
  const [scannedCode, setScannedCode] = useState<string | null>(null);

  // Summary fields
  const [name, setName] = useState("");
  const [brand, setBrand] = useState("");
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(100);
  const [unit, setUnit] = useState("g");
  const [calories100g, setCalories100g] = useState<number | null>(null);
  const [macros100g, setMacros100g] = useState<{ protein: number; carbs: number; fats: number } | null>(null);
  const [servingSizeG, setServingSizeG] = useState<number | null>(null);
  const [productId, setProductId] = useState<string | null>(null);
  const [barcode, setBarcode] = useState<string | null>(null);

  // Inventory-specific
  const [storageType, setStorageType] = useState("frigo");
  const [expiryDate, setExpiryDate] = useState("");

  // Meal-specific
  const [selectedMealType, setSelectedMealType] = useState<MealType | null>(preselectedMealType ?? null);
  const [saveToInventory, setSaveToInventory] = useState(false);

  // Expiry OCR
  const [expiryModalOpen, setExpiryModalOpen] = useState(false);
  const [expiryImage, setExpiryImage] = useState<string | null>(null);
  const [expiryAnalyzing, setExpiryAnalyzing] = useState(false);
  const [expiryCandidates, setExpiryCandidates] = useState<{ date: string; label: string; confidence: number }[]>([]);
  const expiryInputRef = useRef<HTMLInputElement>(null);

  // AI product photo
  const [aiAnalyzing, setAiAnalyzing] = useState(false);
  const aiPhotoRef = useRef<HTMLInputElement>(null);

  const [saving, setSaving] = useState(false);

  // Reset on close
  useEffect(() => {
    if (!open) {
      setTimeout(() => {
        setStep("method");
        setMethod(null);
        setSelectedProduct(null);
        setScannedProduct(null);
        setNotFound(false);
        setQuery("");
        setSearchResults([]);
        setScannedCode(null);
        setName("");
        setBrand("");
        setImageUrl(null);
        setQuantity(100);
        setUnit("g");
        setCalories100g(null);
        setMacros100g(null);
        setServingSizeG(null);
        setProductId(null);
        setBarcode(null);
        setStorageType("frigo");
        setExpiryDate("");
        setSelectedMealType(preselectedMealType ?? null);
        setSaveToInventory(false);
        setExpiryModalOpen(false);
        setExpiryImage(null);
        setExpiryCandidates([]);
      }, 300);
    }
  }, [open, preselectedMealType]);

  // Search products
  useEffect(() => {
    if (step !== "search" || !debouncedQuery.trim()) {
      if (!debouncedQuery.trim()) setSearchResults([]);
      return;
    }
    setSearching(true);
    supabase
      .from("products")
      .select("id, name, brand, calories_100g, macros_100g, image_url, serving_size_g")
      .ilike("name", `%${debouncedQuery}%`)
      .limit(20)
      .then(({ data }) => {
        setSearchResults((data as SearchProduct[]) ?? []);
        setSearching(false);
      });
  }, [debouncedQuery, step]);

  // Calcs
  const computed = calcNutrition(quantity, unit, calories100g, macros100g, servingSizeG);

  // ─── Method handlers ───
  const selectMethod = (m: Method) => {
    setMethod(m);
    if (m === "search") setStep("search");
    else if (m === "scan") setStep("scan");
    else if (m === "manual") {
      setName("");
      setBrand("");
      setImageUrl(null);
      setCalories100g(null);
      setMacros100g(null);
      setProductId(null);
      setStep("summary");
    }
  };

  // ─── Search select ───
  const handleSelectSearchProduct = (p: SearchProduct) => {
    setSelectedProduct(p);
    setProductId(p.id);
    setName(p.name);
    setBrand(p.brand ?? "");
    setImageUrl(p.image_url);
    setCalories100g(p.calories_100g);
    setMacros100g(p.macros_100g as any);
    setServingSizeG(p.serving_size_g);
    setQuantity(100);
    setUnit("g");
    setStep("summary");
  };

  // ─── Barcode scan ───
  const handleBarcode = useCallback(async (code: string) => {
    if (scanLoading || code === scannedCode) return;
    setScannedCode(code);
    setScanLoading(true);
    setNotFound(false);

    const data = await lookupBarcode(code);
    if (data && data.name) {
      setName(data.name);
      setBrand(data.brand);
      setImageUrl(data.image_url);
      setCalories100g(data.calories_100g);
      setMacros100g(data.macros_100g);
      setBarcode(data.barcode);
      setServingSizeG(data.serving_size_g ?? null);
      setQuantity(data.serving_size_g ?? 100);
      setUnit(data.serving_size_g ? "g" : "pezzi");
      setStep("summary");
    } else {
      setNotFound(true);
      setName("");
      setBrand("");
      setBarcode(code);
      setStep("summary");
    }
    setScanLoading(false);
  }, [scanLoading, scannedCode]);

  // ─── Expiry OCR ───
  const handleExpiryPhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async () => {
      const dataUrl = reader.result as string;
      setExpiryImage(dataUrl);
      setExpiryModalOpen(true);
      setExpiryAnalyzing(true);
      setExpiryCandidates([]);

      const base64 = dataUrl.split(",")[1];
      const mimeType = file.type || "image/jpeg";

      try {
        const { data, error } = await supabase.functions.invoke("extract-expiry", {
          body: { image_base64: base64, mime_type: mimeType },
        });
        if (error) throw error;
        if (data?.candidates?.length) {
          setExpiryCandidates(data.candidates);
          const best = data.candidates
            .filter((c: any) => c.label === "Scadenza")
            .sort((a: any, b: any) => b.confidence - a.confidence)[0]
            || data.candidates.sort((a: any, b: any) => b.confidence - a.confidence)[0];
          if (best) setExpiryDate(best.date);
        }
      } catch (err: any) {
        toast({ variant: "destructive", title: "Errore OCR", description: err?.message || "Impossibile leggere la scadenza" });
      } finally {
        setExpiryAnalyzing(false);
      }
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  // ─── AI Product Photo ───
  const handleAiPhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAiAnalyzing(true);
    const reader = new FileReader();
    reader.onload = async () => {
      const dataUrl = reader.result as string;
      const base64 = dataUrl.split(",")[1];
      const mimeType = file.type || "image/jpeg";

      try {
        const { data, error } = await supabase.functions.invoke("extract-product", {
          body: { image_base64: base64, mime_type: mimeType },
        });
        if (error) throw error;
        if (data?.product) {
          const p = data.product;
          if (p.product_name) setName(p.product_name);
          if (p.brand) setBrand(p.brand);
          if (p.barcode) setBarcode(p.barcode);
          if (p.calories_100g != null) setCalories100g(p.calories_100g);
          if (p.protein_100g != null || p.carbs_100g != null || p.fat_100g != null) {
            setMacros100g({
              protein: p.protein_100g ?? 0,
              carbs: p.carbs_100g ?? 0,
              fats: p.fat_100g ?? 0,
            });
          }
          if (p.serving_size_g != null) setServingSizeG(p.serving_size_g);
          if (p.expiry_date) setExpiryDate(p.expiry_date);
          setNotFound(false);
          setStep("summary");
          toast({ title: "Prodotto riconosciuto dall'AI ✓" });
        } else {
          toast({ variant: "destructive", title: "AI non ha riconosciuto il prodotto" });
        }
      } catch (err: any) {
        toast({ variant: "destructive", title: "Errore AI", description: err?.message });
      } finally {
        setAiAnalyzing(false);
      }
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  // ─── SAVE ───
  const handleSave = async () => {
    if (!user) return;
    if (!name.trim()) {
      toast({ variant: "destructive", title: "Inserisci un nome" });
      return;
    }
    if ((context === "inventory" || (context === "meal" && saveToInventory)) && !storageType) {
      toast({ variant: "destructive", title: "Seleziona dove conservi il prodotto" });
      return;
    }
    if (context === "meal" && !selectedMealType) {
      toast({ variant: "destructive", title: "Seleziona il tipo di pasto" });
      return;
    }

    setSaving(true);

    try {
      // 1) Ensure product exists
      let pid = productId;
      if (!pid) {
        // Check by barcode first
        if (barcode) {
          const { data: existing } = await supabase
            .from("products").select("id").eq("barcode", barcode).maybeSingle();
          if (existing) pid = existing.id;
        }
        if (!pid) {
          const { data: created, error: pErr } = await supabase
            .from("products")
            .insert({
              name: name.trim(),
              brand: brand.trim() || null,
              barcode: barcode || null,
              image_url: imageUrl,
              calories_100g: calories100g,
              macros_100g: macros100g as any,
              serving_size_g: servingSizeG,
            })
            .select("id").single();
          if (pErr) throw pErr;
          pid = created.id;
        }
      }

      // 2) Context-specific save
      if (context === "inventory") {
        const insertData: any = {
          product_id: pid,
          quantity,
          unit,
          storage_type: storageType,
          expiry_date: expiryDate || null,
          calories_total: computed.calories,
          macros_total: computed.macros as any,
        };
        if (defaultRestaurantId) {
          insertData.restaurant_id = defaultRestaurantId;
        } else {
          insertData.owner_user_id = user.id;
        }
        const { error } = await supabase.from("inventory_items").insert(insertData);
        if (error) throw error;
        toast({ title: "Prodotto aggiunto al magazzino! ✓" });

      } else if (context === "meal") {
        // Get or create meal_day + meal
        const today = new Date().toISOString().slice(0, 10);
        let mealId = contextId;

        if (!mealId) {
          let { data: mealDay } = await supabase
            .from("meal_days").select("id")
            .eq("user_id", user.id).eq("day_date", today).maybeSingle();
          if (!mealDay) {
            const { data: nd, error: de } = await supabase
              .from("meal_days").insert({ user_id: user.id, day_date: today })
              .select("id").single();
            if (de) throw de;
            mealDay = nd;
          }

          let { data: meal } = await supabase
            .from("meals").select("id")
            .eq("meal_day_id", mealDay!.id).eq("meal_type", selectedMealType!).maybeSingle();
          if (!meal) {
            const { data: nm, error: me } = await supabase
              .from("meals").insert({ meal_day_id: mealDay!.id, meal_type: selectedMealType! })
              .select("id").single();
            if (me) throw me;
            meal = nm;
          }
          mealId = meal!.id;
        }

        const { error } = await supabase.from("meal_items").insert({
          meal_id: mealId!,
          product_id: pid,
          custom_name: name.trim(),
          source_type: "product",
          quantity,
          unit,
          calories: computed.calories,
          macros: computed.macros as any,
        });
        if (error) throw error;

        // Also save to inventory if toggle is ON
        if (saveToInventory) {
          const invData: any = {
            product_id: pid,
            quantity,
            unit,
            storage_type: storageType,
            expiry_date: expiryDate || null,
            calories_total: computed.calories,
            macros_total: computed.macros as any,
            owner_user_id: user.id,
          };
          const { error: invErr } = await supabase.from("inventory_items").insert(invData);
          if (invErr) throw invErr;
        }

        toast({ title: `Aggiunto a ${selectedMealType}! ✓` });

      } else if (context === "recipe") {
        if (!contextId) throw new Error("recipe_id mancante");
        const { error } = await supabase.from("recipe_ingredients").insert({
          recipe_id: contextId,
          product_id: pid!,
          quantity,
          unit,
        });
        if (error) throw error;
        toast({ title: "Ingrediente aggiunto! ✓" });
      }

      onComplete();
      onOpenChange(false);
    } catch (err: any) {
      toast({ variant: "destructive", title: "Errore", description: err.message });
    } finally {
      setSaving(false);
    }
  };

  const goBack = () => {
    if (step === "summary") setStep(method === "manual" ? "method" : method === "scan" ? "scan" : "search");
    else if (step === "search" || step === "scan") setStep("method");
    else onOpenChange(false);
  };

  const stepTitle = () => {
    if (step === "method") return "Aggiungi alimento";
    if (step === "scan") return "Scansiona barcode";
    if (step === "search") return "Cerca prodotto";
    return "Riepilogo";
  };

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="bottom" className="h-[90vh] rounded-t-3xl px-0 flex flex-col">
          <SheetHeader className="px-4 pb-3 border-b border-border shrink-0">
            <div className="flex items-center gap-3">
              <button onClick={goBack} className="p-1 -ml-1 text-muted-foreground">
                <ArrowLeft className="h-5 w-5" />
              </button>
              <SheetTitle className="flex-1 text-base" style={{ color: "#111827" }}>
                {stepTitle()}
              </SheetTitle>
            </div>
          </SheetHeader>

          <div className="flex-1 overflow-y-auto px-4 py-4">
            {/* ─── STEP: Method ─── */}
            {step === "method" && (
              <div className="space-y-4">
                {/* Meal type selector for meal context */}
                {context === "meal" && !preselectedMealType && (
                  <div className="space-y-2">
                    <p className="text-sm font-semibold" style={{ color: "#111827" }}>Tipo di pasto</p>
                    <div className="grid grid-cols-4 gap-2">
                      {mealOptions.map(({ type, emoji, label }) => (
                        <button
                          key={type}
                          onClick={() => setSelectedMealType(type)}
                          className={`flex flex-col items-center gap-1 rounded-xl p-3 text-xs font-semibold transition-colors ${
                            selectedMealType === type
                              ? "bg-primary text-primary-foreground"
                              : "bg-card border border-border text-foreground"
                          }`}
                        >
                          <span className="text-xl">{emoji}</span>
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <p className="text-sm font-semibold" style={{ color: "#111827" }}>Come vuoi aggiungere?</p>
                <div className="grid grid-cols-1 gap-2">
                  {[
                    { m: "search" as Method, icon: Search, label: "Cerca prodotto", desc: "Cerca nel database" },
                    { m: "scan" as Method, icon: ScanLine, label: "Scansiona barcode", desc: "Usa la fotocamera" },
                    { m: "manual" as Method, icon: Keyboard, label: "Inserisci manualmente", desc: "Scrivi nome e valori" },
                  ].map(({ m, icon: Icon, label, desc }) => (
                    <button
                      key={m}
                      onClick={() => {
                        if (context === "meal" && !preselectedMealType && !selectedMealType) {
                          toast({ variant: "destructive", title: "Seleziona prima il tipo di pasto" });
                          return;
                        }
                        selectMethod(m);
                      }}
                      className="flex items-center gap-3 rounded-2xl border border-border bg-card p-4 text-left active:scale-[0.98] transition-transform"
                    >
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                        <Icon className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="text-sm font-bold" style={{ color: "#111827" }}>{label}</p>
                        <p className="text-xs" style={{ color: "#4B5563" }}>{desc}</p>
                      </div>
                    </button>
                  ))}
                  {/* AI Photo button */}
                  <button
                    onClick={() => {
                      if (context === "meal" && !preselectedMealType && !selectedMealType) {
                        toast({ variant: "destructive", title: "Seleziona prima il tipo di pasto" });
                        return;
                      }
                      aiPhotoRef.current?.click();
                    }}
                    disabled={aiAnalyzing}
                    className="flex items-center gap-3 rounded-2xl border border-primary/30 bg-primary/5 p-4 text-left active:scale-[0.98] transition-transform"
                  >
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/20">
                      {aiAnalyzing ? <Loader2 className="h-5 w-5 text-primary animate-spin" /> : <Sparkles className="h-5 w-5 text-primary" />}
                    </div>
                    <div>
                      <p className="text-sm font-bold" style={{ color: "#111827" }}>
                        {aiAnalyzing ? "Analisi AI in corso..." : "📸 Foto etichetta (AI)"}
                      </p>
                      <p className="text-xs" style={{ color: "#4B5563" }}>Scatta foto e l'AI legge tutto</p>
                    </div>
                  </button>
                  <input ref={aiPhotoRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleAiPhoto} />
                </div>
              </div>
            )}

            {/* ─── STEP: Search ─── */}
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
                    style={{ color: "#111827" }}
                  />
                </div>

                {searching && (
                  <div className="flex justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  </div>
                )}

                {!searching && query.trim() && searchResults.length === 0 && (
                  <div className="text-center py-8">
                    <p className="text-sm" style={{ color: "#4B5563" }}>Nessun prodotto trovato</p>
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-3"
                      onClick={() => {
                        setName(query);
                        setProductId(null);
                        setStep("summary");
                      }}
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      Aggiungi "{query}" manualmente
                    </Button>
                  </div>
                )}

                <div className="space-y-1">
                  {searchResults.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => handleSelectSearchProduct(p)}
                      className="flex w-full items-center gap-3 rounded-xl p-3 text-left active:bg-secondary transition-colors"
                    >
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-secondary overflow-hidden">
                        {p.image_url ? (
                          <img src={p.image_url} alt="" className="h-full w-full object-cover" />
                        ) : (
                          <Package className="h-5 w-5 text-muted-foreground" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate" style={{ color: "#111827" }}>{p.name}</p>
                        {p.brand && <p className="text-xs" style={{ color: "#4B5563" }}>{p.brand}</p>}
                      </div>
                      {p.calories_100g != null && (
                        <span className="text-xs font-medium text-primary shrink-0">
                          {p.calories_100g} kcal
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* ─── STEP: Scan ─── */}
            {step === "scan" && (
              <div className="space-y-3">
                <BarcodeScanner
                  onDetected={handleBarcode}
                  active={step === "scan" && open}
                />
                {scanLoading && (
                  <div className="flex flex-col items-center gap-2 py-4">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                    <p className="text-sm" style={{ color: "#4B5563" }}>Ricerca su OpenFoodFacts…</p>
                  </div>
                )}
                <p className="text-center text-xs" style={{ color: "#4B5563" }}>
                  Inquadra il codice a barre del prodotto
                </p>
              </div>
            )}

            {/* ─── STEP: Summary ─── */}
            {step === "summary" && (
              <div className="space-y-4">
                {notFound && (
                  <div className="rounded-xl border border-accent/30 bg-accent/5 p-3 space-y-2">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="h-5 w-5 text-accent shrink-0" />
                      <p className="text-xs" style={{ color: "#4B5563" }}>
                        Barcode non trovato su OpenFoodFacts.
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      className="w-full gap-2"
                      onClick={() => aiPhotoRef.current?.click()}
                      disabled={aiAnalyzing}
                    >
                      {aiAnalyzing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                      {aiAnalyzing ? "Analisi in corso..." : "📸 Scatta foto etichetta (AI)"}
                    </Button>
                    <input ref={aiPhotoRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleAiPhoto} />
                  </div>
                )}

                {/* Product card */}
                <div className="rounded-2xl border border-border bg-card p-4 space-y-3">
                  <div className="flex gap-3">
                    <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl bg-secondary overflow-hidden">
                      {imageUrl ? (
                        <img src={imageUrl} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <Package className="h-8 w-8 text-muted-foreground" />
                      )}
                    </div>
                    <div className="flex-1 space-y-1">
                      <Input
                        placeholder="Nome prodotto *"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="font-bold border-0 p-0 h-auto bg-transparent focus-visible:ring-0"
                        style={{ color: "#111827" }}
                      />
                      <Input
                        placeholder="Brand (opzionale)"
                        value={brand}
                        onChange={(e) => setBrand(e.target.value)}
                        className="text-xs border-0 p-0 h-auto bg-transparent focus-visible:ring-0"
                        style={{ color: "#4B5563" }}
                      />
                      {barcode && (
                        <Badge variant="outline" className="text-[10px] font-mono">{barcode}</Badge>
                      )}
                    </div>
                  </div>
                </div>

                {/* Quantity */}
                <div className="space-y-2">
                  <p className="text-sm font-semibold" style={{ color: "#111827" }}>Quantità</p>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setQuantity(Math.max(1, quantity - 10))}
                      className="flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-card"
                    >
                      <Minus className="h-4 w-4" />
                    </button>
                    <Input
                      type="number"
                      value={quantity}
                      onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 0))}
                      className="text-center text-lg font-bold flex-1"
                      style={{ color: "#111827" }}
                      min={1}
                    />
                    <button
                      onClick={() => setQuantity(quantity + 10)}
                      className="flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-card"
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="flex gap-1.5">
                    {["g", "ml", "pezzi", "kg", "porzioni"].map((u) => (
                      <button
                        key={u}
                        onClick={() => setUnit(u)}
                        className={`flex-1 rounded-lg py-1.5 text-xs font-medium transition-colors ${
                          unit === u
                            ? "bg-primary text-primary-foreground"
                            : "bg-secondary text-muted-foreground"
                        }`}
                      >
                        {u}
                      </button>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    {[50, 100, 150, 200, 300].map((g) => (
                      <button
                        key={g}
                        onClick={() => { setQuantity(g); setUnit("g"); }}
                        className={`flex-1 rounded-lg py-1.5 text-xs font-medium transition-colors ${
                          quantity === g && unit === "g"
                            ? "bg-primary text-primary-foreground"
                            : "bg-card border border-border text-foreground"
                        }`}
                      >
                        {g}g
                      </button>
                    ))}
                  </div>
                </div>

                {/* Nutrition (editable for manual) */}
                {method === "manual" && (
                  <div className="space-y-2">
                    <p className="text-sm font-semibold" style={{ color: "#111827" }}>Calorie per 100g (opzionale)</p>
                    <Input
                      type="number"
                      placeholder="kcal / 100g"
                      value={calories100g ?? ""}
                      onChange={(e) => setCalories100g(e.target.value ? parseFloat(e.target.value) : null)}
                      style={{ color: "#111827" }}
                    />
                  </div>
                )}

                {/* Nutrition preview */}
                {computed.calories != null && (
                  <div className="rounded-2xl border-2 border-accent bg-card p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold" style={{ color: "#111827" }}>Valori nutrizionali</span>
                      <span className="text-xs" style={{ color: "#4B5563" }}>{quantity}{unit}</span>
                    </div>
                    <div className="text-center">
                      <span className="text-3xl font-bold text-primary">{computed.calories}</span>
                      <span className="text-sm text-muted-foreground ml-1">kcal</span>
                    </div>
                    {computed.macros && (
                      <div className="grid grid-cols-3 gap-2">
                        {[
                          { label: "Proteine", value: computed.macros.protein, color: "text-destructive" },
                          { label: "Carbo", value: computed.macros.carbs, color: "text-accent" },
                          { label: "Grassi", value: computed.macros.fats, color: "text-primary" },
                        ].map(({ label, value, color }) => (
                          <div key={label} className="flex flex-col items-center rounded-xl bg-secondary p-2">
                            <span className={`text-lg font-bold ${color}`}>{value}g</span>
                            <span className="text-[10px] text-muted-foreground">{label}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* ─── Context-specific fields ─── */}

                {/* INVENTORY or MEAL+toggle: Storage + Expiry */}
                {(context === "inventory" || (context === "meal" && saveToInventory)) && (
                  <div className="space-y-3">
                    <p className="text-sm font-semibold" style={{ color: "#111827" }}>Dove lo conservi? *</p>
                    <div className="grid grid-cols-3 gap-2">
                      {storageOptions.map(({ key, label, icon: Icon }) => (
                        <button
                          key={key}
                          onClick={() => setStorageType(key)}
                          className={`flex flex-col items-center gap-1.5 rounded-2xl p-4 text-sm font-semibold transition-colors ${
                            storageType === key
                              ? "bg-primary text-primary-foreground shadow-md"
                              : "bg-card border border-border text-foreground"
                          }`}
                        >
                          <Icon className="h-6 w-6" />
                          {label}
                        </button>
                      ))}
                    </div>

                    <div className="space-y-2">
                      <p className="text-sm font-semibold" style={{ color: "#111827" }}>Data di scadenza</p>
                      <div className="flex gap-2">
                        <Input
                          type="date"
                          value={expiryDate}
                          onChange={(e) => setExpiryDate(e.target.value)}
                          className="flex-1"
                          style={{ color: "#111827" }}
                        />
                        <Button
                          type="button"
                          variant="outline"
                          className="shrink-0 gap-1.5"
                          onClick={() => expiryInputRef.current?.click()}
                        >
                          <CalendarSearch className="h-4 w-4" />
                          <span className="text-xs">Foto</span>
                        </Button>
                        <input
                          ref={expiryInputRef}
                          type="file"
                          accept="image/*"
                          capture="environment"
                          className="hidden"
                          onChange={handleExpiryPhoto}
                        />
                      </div>
                      {!expiryDate && (
                        <p className="text-xs" style={{ color: "#4B5563" }}>Se non inserisci una data, il prodotto sarà marcato "Senza data"</p>
                      )}
                    </div>
                  </div>
                )}

                {/* MEAL: toggle "Salva anche in Magazzino" */}
                {context === "meal" && (
                  <div className="flex items-center justify-between rounded-2xl border border-border bg-card p-4">
                    <div>
                      <p className="text-sm font-semibold" style={{ color: "#111827" }}>Salva anche in Magazzino</p>
                      <p className="text-xs" style={{ color: "#4B5563" }}>Aggiunge il prodotto all'inventario</p>
                    </div>
                    <Switch checked={saveToInventory} onCheckedChange={setSaveToInventory} />
                  </div>
                )}

                {/* MEAL: meal type if not pre-selected */}
                {context === "meal" && !preselectedMealType && !selectedMealType && (
                  <div className="space-y-2">
                    <p className="text-sm font-semibold" style={{ color: "#111827" }}>Tipo di pasto</p>
                    <div className="grid grid-cols-4 gap-2">
                      {mealOptions.map(({ type, emoji, label }) => (
                        <button
                          key={type}
                          onClick={() => setSelectedMealType(type)}
                          className={`flex flex-col items-center gap-1 rounded-xl p-3 text-xs font-semibold transition-colors ${
                            selectedMealType === type
                              ? "bg-primary text-primary-foreground"
                              : "bg-card border border-border text-foreground"
                          }`}
                        >
                          <span className="text-lg">{emoji}</span>
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* CTA */}
                <Button
                  className="w-full h-12 text-base font-bold gap-2"
                  onClick={handleSave}
                  disabled={saving || !name.trim()}
                >
                  {saving ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <Check className="h-5 w-5" />
                  )}
                  {ctaLabels[context]}
                </Button>
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>

      {/* Expiry OCR Modal */}
      <Dialog open={expiryModalOpen} onOpenChange={setExpiryModalOpen}>
        <DialogContent className="max-w-md mx-4">
          <DialogHeader>
            <DialogTitle style={{ color: "#111827" }}>Lettura scadenza</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {expiryImage && (
              <div className="rounded-xl overflow-hidden border-2 border-accent bg-secondary max-h-48">
                <img src={expiryImage} alt="Etichetta" className="w-full h-full object-contain" />
              </div>
            )}
            {expiryAnalyzing && (
              <div className="flex flex-col items-center gap-2 py-4">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="text-sm text-muted-foreground">Analisi in corso…</p>
              </div>
            )}
            {!expiryAnalyzing && expiryCandidates.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-semibold" style={{ color: "#111827" }}>Date trovate:</p>
                {expiryCandidates.map((c, i) => (
                  <button
                    key={i}
                    className={`flex w-full items-center justify-between rounded-xl border-2 p-3 transition-colors ${
                      expiryDate === c.date ? "border-primary bg-primary/5" : "border-border bg-card"
                    }`}
                    onClick={() => setExpiryDate(c.date)}
                  >
                    <div className="text-left">
                      <p className="font-bold" style={{ color: "#111827" }}>
                        {new Date(c.date).toLocaleDateString("it-IT")}
                      </p>
                      <p className="text-xs" style={{ color: "#4B5563" }}>{c.label}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">{Math.round(c.confidence * 100)}%</Badge>
                      {expiryDate === c.date && <Check className="h-5 w-5 text-primary" />}
                    </div>
                  </button>
                ))}
                <Button className="w-full mt-2" onClick={() => setExpiryModalOpen(false)} disabled={!expiryDate}>
                  <Check className="mr-2 h-4 w-4" /> Conferma
                </Button>
              </div>
            )}
            {!expiryAnalyzing && expiryCandidates.length === 0 && expiryImage && (
              <div className="flex flex-col items-center gap-2 py-4 text-center">
                <AlertTriangle className="h-8 w-8 text-accent" />
                <p className="text-sm text-muted-foreground">Nessuna data trovata. Inserisci manualmente.</p>
                <Button variant="outline" onClick={() => setExpiryModalOpen(false)}>Chiudi</Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default AddFoodFlow;
