import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
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
import { analyzeFoodPhotos, fuseWithOFF, fileToImageFile, type ImageFile, type FusedFoodData } from "@/lib/ai-food";
import { Switch } from "@/components/ui/switch";
import {
  ArrowLeft, Search, ScanLine, Keyboard, Camera, Loader2,
  Package, Plus, Minus, Check, Flame, Archive, Thermometer, Snowflake,
  CalendarSearch, AlertTriangle, Sparkles, X, ImagePlus, ChevronDown, ChevronUp, ChefHat,
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

/* ─── Types ─── */
export type AddFoodContext = "inventory" | "meal" | "recipe" | "preparation";
type MealType = "colazione" | "pranzo" | "cena" | "spuntino";
type Method = "photo_ai" | "search" | "scan" | "manual";
type Step = "method" | "photo_ai" | "scan" | "search" | "summary";

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
  contextId?: string;
  mealType?: MealType;
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
  preparation: "Aggiungi alla preparazione",
};

const CONFIDENCE_LOW = 0.6;

const AddFoodFlow = ({
  open, onOpenChange, context, contextId, mealType: preselectedMealType,
  defaultRestaurantId, onComplete,
}: AddFoodFlowProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

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

  // Multi-photo AI
  const [aiPhotos, setAiPhotos] = useState<ImageFile[]>([]);
  const [aiAnalyzing, setAiAnalyzing] = useState(false);
  const [fusedData, setFusedData] = useState<FusedFoodData | null>(null);
  const aiPhotoInputRef = useRef<HTMLInputElement>(null);

  // Expiry OCR
  const [expiryModalOpen, setExpiryModalOpen] = useState(false);
  const [expiryImage, setExpiryImage] = useState<string | null>(null);
  const [expiryAnalyzing, setExpiryAnalyzing] = useState(false);
  const [expiryCandidates, setExpiryCandidates] = useState<{ date: string; label: string; confidence: number }[]>([]);
  const expiryInputRef = useRef<HTMLInputElement>(null);

  // Confidence flags
  const [confidence, setConfidence] = useState<{ name: number; barcode: number; nutrition: number; expiry: number }>({ name: 1, barcode: 0, nutrition: 0, expiry: 0 });

  const [saving, setSaving] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

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
        setAiPhotos([]);
        setFusedData(null);
        setExpiryModalOpen(false);
        setExpiryImage(null);
        setExpiryCandidates([]);
        setConfidence({ name: 1, barcode: 0, nutrition: 0, expiry: 0 });
        setShowDetails(false);
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
    else if (m === "photo_ai") setStep("photo_ai");
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
      // Upsert product by barcode
      const { data: existing } = await supabase
        .from("products").select("id").eq("barcode", code).maybeSingle();
      if (existing) {
        setProductId(existing.id);
        // Update product with latest OFF data
        await supabase.from("products").update({
          name: data.name,
          brand: data.brand || null,
          image_url: data.image_url,
          calories_100g: data.calories_100g,
          macros_100g: data.macros_100g as any,
          serving_size_g: data.serving_size_g ?? null,
        }).eq("id", existing.id);
      } else {
        const { data: created } = await supabase.from("products").insert({
          name: data.name,
          brand: data.brand || null,
          barcode: code,
          image_url: data.image_url,
          calories_100g: data.calories_100g,
          macros_100g: data.macros_100g as any,
          serving_size_g: data.serving_size_g ?? null,
        }).select("id").single();
        if (created) setProductId(created.id);
      }

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

  // ─── Multi-photo AI ───
  const handleAddAiPhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    const newPhotos: ImageFile[] = [];
    for (let i = 0; i < files.length && aiPhotos.length + newPhotos.length < 5; i++) {
      const img = await fileToImageFile(files[i]);
      newPhotos.push(img);
    }
    setAiPhotos((prev) => [...prev, ...newPhotos].slice(0, 5));
    e.target.value = "";
  };

  const removeAiPhoto = (idx: number) => {
    setAiPhotos((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleAnalyzePhotos = async () => {
    if (aiPhotos.length === 0) return;
    setAiAnalyzing(true);
    try {
      const aiResult = await analyzeFoodPhotos(aiPhotos, context);
      if (!aiResult || !aiResult.product?.name) {
        toast({
          variant: "destructive",
          title: "Non riesco a leggere il prodotto",
          description: "Prova con foto più ravvicinate o con inquadratura diversa.",
        });
        setAiAnalyzing(false);
        return;
      }

      const fused = await fuseWithOFF(aiResult);
      setFusedData(fused);

      // Apply fused data to form
      setName(fused.name);
      setBrand(fused.brand);
      setImageUrl(fused.image_url);
      setBarcode(fused.barcode);
      setCalories100g(fused.calories_100g);
      setMacros100g(fused.macros_100g);
      setServingSizeG(fused.serving_size_g);
      setConfidence(fused.confidence);

      // Quantity
      if (fused.quantity_value) {
        setQuantity(fused.quantity_value);
        setUnit(fused.quantity_unit || "g");
      } else if (fused.serving_size_g) {
        setQuantity(fused.serving_size_g);
        setUnit("g");
      } else {
        setQuantity(100);
        setUnit("g");
      }

      // Expiry
      if (fused.expiry_candidates.length > 0) {
        setExpiryCandidates(fused.expiry_candidates);
        if (fused.best_expiry) setExpiryDate(fused.best_expiry);
      }

      // Storage hint
      if (fused.storage_hint && fused.storage_confidence > 0.5) {
        setStorageType(fused.storage_hint);
      }

      setNotFound(false);
      setStep("summary");
      toast({ title: "Prodotto analizzato dall'AI ✓" });
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Errore analisi AI",
        description: err?.message || "Riprova con foto diverse.",
      });
    } finally {
      setAiAnalyzing(false);
    }
  };

  // ─── Expiry OCR (unchanged) ───
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

  // ─── Save attachments ───
  const saveAttachments = async (entityId: string, entityType: string) => {
    if (aiPhotos.length === 0) return;
    try {
      for (const photo of aiPhotos) {
        const ext = photo.mime_type.split("/")[1] || "jpg";
        const filePath = `ai-photos/${entityType}/${entityId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

        // Convert base64 to Uint8Array
        const binaryStr = atob(photo.base64);
        const bytes = new Uint8Array(binaryStr.length);
        for (let i = 0; i < binaryStr.length; i++) bytes[i] = binaryStr.charCodeAt(i);

        const { error: uploadErr } = await supabase.storage
          .from("media")
          .upload(filePath, bytes, { contentType: photo.mime_type, upsert: false });
        if (uploadErr) {
          console.error("Upload attachment error:", uploadErr);
          continue;
        }

        const { data: urlData } = supabase.storage.from("media").getPublicUrl(filePath);

        await supabase.from("attachments").insert({
          entity_id: entityId,
          entity_type: entityType,
          file_path: filePath,
          public_url: urlData.publicUrl,
          owner_user_id: user?.id ?? null,
          restaurant_id: defaultRestaurantId ?? null,
        });
      }
    } catch (err) {
      console.error("Error saving attachments:", err);
    }
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
        const { data: invItem, error } = await supabase.from("inventory_items").insert(insertData).select("id").single();
        if (error) throw error;
        await saveAttachments(invItem.id, "inventory_item");
        toast({ title: "Prodotto aggiunto al magazzino! ✓" });

      } else if (context === "meal") {
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

      } else if (context === "preparation") {
        // For preparation context, just return via onComplete - the parent handles saving
        toast({ title: "Ingrediente aggiunto! ✓" });
      }

      // Save product attachments
      if (pid) await saveAttachments(pid, "product");

      onComplete();
      onOpenChange(false);
    } catch (err: any) {
      toast({ variant: "destructive", title: "Errore", description: err.message });
    } finally {
      setSaving(false);
    }
  };

  const goBack = () => {
    if (step === "summary") setStep(method === "manual" ? "method" : method === "photo_ai" ? "photo_ai" : method === "scan" ? "scan" : "search");
    else if (step === "search" || step === "scan" || step === "photo_ai") setStep("method");
    else onOpenChange(false);
  };

  const stepTitle = () => {
    if (step === "method") return "Aggiungi alimento";
    if (step === "photo_ai") return "Foto AI";
    if (step === "scan") return "Scansiona barcode";
    if (step === "search") return "Cerca prodotto";
    return "Riepilogo";
  };

  const isLowConfidence = (field: keyof typeof confidence) => confidence[field] > 0 && confidence[field] < CONFIDENCE_LOW;

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
                  {/* Foto AI (first, recommended) */}
                  <button
                    onClick={() => {
                      if (context === "meal" && !preselectedMealType && !selectedMealType) {
                        toast({ variant: "destructive", title: "Seleziona prima il tipo di pasto" });
                        return;
                      }
                      selectMethod("photo_ai");
                    }}
                    className="flex items-center gap-3 rounded-2xl border-2 border-primary/30 bg-primary/5 p-4 text-left active:scale-[0.98] transition-transform"
                  >
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/20">
                      <Sparkles className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-bold" style={{ color: "#111827" }}>📸 Foto AI</p>
                        <Badge className="text-[9px] bg-primary/20 text-primary border-0">consigliato</Badge>
                      </div>
                      <p className="text-xs" style={{ color: "#4B5563" }}>Scatta 1-5 foto e l'AI legge tutto</p>
                    </div>
                  </button>

                  {[
                    { m: "scan" as Method, icon: ScanLine, label: "Scansiona barcode", desc: "Usa la fotocamera" },
                    { m: "search" as Method, icon: Search, label: "Cerca prodotto", desc: "Cerca nel database" },
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

                  {/* Crea Preparazione link */}
                  {(context === "inventory" || context === "preparation") && (
                    <button
                      onClick={() => {
                        onOpenChange(false);
                        // Navigate to preparations page (the FAB there opens the creation form)
                        navigate(defaultRestaurantId ? "/restaurant/preparations" : "/preparations");
                      }}
                      className="flex items-center gap-3 rounded-2xl border border-dashed border-[#7C3AED]/30 bg-[#EDE9FE]/30 p-4 text-left active:scale-[0.98] transition-transform"
                    >
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl" style={{ backgroundColor: "#EDE9FE" }}>
                        <ChefHat className="h-5 w-5" style={{ color: "#7C3AED" }} />
                      </div>
                      <div>
                        <p className="text-sm font-bold" style={{ color: "#111827" }}>🍳 Crea Preparazione</p>
                        <p className="text-xs" style={{ color: "#4B5563" }}>Piatto preparato con scadenza</p>
                      </div>
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* ─── STEP: Photo AI (multi-photo) ─── */}
            {step === "photo_ai" && (
              <div className="space-y-4">
                <div className="rounded-2xl border-2 border-dashed border-primary/30 bg-primary/5 p-4 space-y-3">
                  <div className="flex items-center gap-2">
                    <Camera className="h-5 w-5 text-primary" />
                    <p className="text-sm font-semibold" style={{ color: "#111827" }}>
                      Aggiungi foto del prodotto
                    </p>
                    <span className="text-xs text-muted-foreground ml-auto">{aiPhotos.length}/5</span>
                  </div>
                  <p className="text-xs" style={{ color: "#4B5563" }}>
                    Scatta foto di: fronte confezione, retro ingredienti, tabella nutrizionale, data scadenza
                  </p>

                  {/* Photo grid */}
                  <div className="grid grid-cols-3 gap-2">
                    {aiPhotos.map((photo, idx) => (
                      <div key={idx} className="relative aspect-square rounded-xl overflow-hidden border border-border">
                        <img src={photo.preview} alt={`Foto ${idx + 1}`} className="h-full w-full object-cover" />
                        <button
                          onClick={() => removeAiPhoto(idx)}
                          className="absolute top-1 right-1 flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-white"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}

                    {aiPhotos.length < 5 && (
                      <button
                        onClick={() => aiPhotoInputRef.current?.click()}
                        className="flex aspect-square items-center justify-center rounded-xl border-2 border-dashed border-border bg-card"
                      >
                        <ImagePlus className="h-6 w-6 text-muted-foreground" />
                      </button>
                    )}
                  </div>

                  <input
                    ref={aiPhotoInputRef}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    className="hidden"
                    onChange={handleAddAiPhoto}
                  />
                </div>

                {/* Analyze CTA */}
                <Button
                  className="w-full h-12 text-base font-bold gap-2"
                  onClick={handleAnalyzePhotos}
                  disabled={aiPhotos.length === 0 || aiAnalyzing}
                >
                  {aiAnalyzing ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin" />
                      Analisi in corso...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-5 w-5" />
                      Analizza con AI ({aiPhotos.length} foto)
                    </>
                  )}
                </Button>

                {aiPhotos.length === 0 && (
                  <p className="text-center text-xs" style={{ color: "#4B5563" }}>
                    Aggiungi almeno una foto per procedere
                  </p>
                )}
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
                      onClick={() => { setMethod("photo_ai"); setStep("photo_ai"); }}
                    >
                      <Sparkles className="h-4 w-4" />
                      Usa Foto AI per riconoscere
                    </Button>
                  </div>
                )}

                {/* ── Compact product header ── */}
                <div className="rounded-2xl border border-border bg-card p-3">
                  <div className="flex gap-3 items-center">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-secondary overflow-hidden">
                      {imageUrl ? (
                        <img src={imageUrl} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <Package className="h-6 w-6 text-muted-foreground" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold truncate" style={{ color: "#111827" }}>{name || "Prodotto"}</p>
                      {brand && <p className="text-[11px] truncate" style={{ color: "#4B5563" }}>{brand}</p>}
                    </div>
                    {computed.calories != null && (
                      <div className="text-right shrink-0">
                        <p className="text-lg font-bold text-primary leading-tight">{computed.calories}</p>
                        <p className="text-[10px] text-muted-foreground">kcal</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* ── Essential fields only ── */}

                {/* Quantity (compact) */}
                <div className="space-y-1.5">
                  <p className="text-xs font-semibold" style={{ color: "#111827" }}>Quantità</p>
                  <div className="flex items-center gap-2">
                    <button onClick={() => setQuantity(Math.max(1, quantity - 10))} className="flex h-9 w-9 items-center justify-center rounded-xl border border-border bg-card">
                      <Minus className="h-3.5 w-3.5" />
                    </button>
                    <Input
                      type="number"
                      value={quantity}
                      onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 0))}
                      className="text-center text-base font-bold flex-1 h-9"
                      style={{ color: "#111827" }}
                      min={1}
                    />
                    <button onClick={() => setQuantity(quantity + 10)} className="flex h-9 w-9 items-center justify-center rounded-xl border border-border bg-card">
                      <Plus className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <div className="flex gap-1">
                    {["g", "ml", "pezzi", "kg", "porzioni"].map((u) => (
                      <button key={u} onClick={() => setUnit(u)}
                        className={`flex-1 rounded-lg py-1 text-[11px] font-medium transition-colors ${unit === u ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"}`}>
                        {u}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Storage (only inventory/preparation) */}
                {(context === "inventory" || context === "preparation" || (context === "meal" && saveToInventory)) && (
                  <div className="space-y-1.5">
                    <p className="text-xs font-semibold" style={{ color: "#111827" }}>
                      Conservazione *
                      {fusedData && fusedData.storage_confidence < 0.5 && (
                        <Badge className="ml-1.5 bg-amber-100 text-amber-700 border-0 text-[9px]">scegli</Badge>
                      )}
                    </p>
                    <div className="grid grid-cols-3 gap-1.5">
                      {storageOptions.map(({ key, label, icon: Icon }) => (
                        <button key={key} onClick={() => setStorageType(key)}
                          className={`flex items-center justify-center gap-1.5 rounded-xl py-2.5 text-xs font-semibold transition-colors ${
                            storageType === key ? "bg-primary text-primary-foreground shadow-sm" : "bg-card border border-border text-foreground"
                          }`}>
                          <Icon className="h-4 w-4" />
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Expiry (only inventory/preparation) */}
                {(context === "inventory" || context === "preparation" || (context === "meal" && saveToInventory)) && (
                  <div className="space-y-1.5">
                    <p className="text-xs font-semibold" style={{ color: "#111827" }}>Scadenza</p>

                    {expiryCandidates.length > 1 && (
                      <div className="flex gap-1.5 flex-wrap">
                        {expiryCandidates.map((c, i) => (
                          <button key={i} onClick={() => setExpiryDate(c.date)}
                            className={`rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors ${
                              expiryDate === c.date ? "bg-primary text-primary-foreground" : "bg-card border border-border text-foreground"
                            }`}>
                            {new Date(c.date).toLocaleDateString("it-IT")}
                            <span className="text-[9px] ml-1 opacity-70">{c.label}</span>
                          </button>
                        ))}
                      </div>
                    )}

                    <div className="flex gap-2">
                      <Input type="date" value={expiryDate} onChange={(e) => setExpiryDate(e.target.value)}
                        className="flex-1 h-9 text-sm" style={{ color: "#111827" }} />
                      <Button type="button" variant="outline" size="sm" className="shrink-0 gap-1 h-9"
                        onClick={() => expiryInputRef.current?.click()}>
                        <CalendarSearch className="h-3.5 w-3.5" />
                        <span className="text-[11px]">Foto</span>
                      </Button>
                      <input ref={expiryInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleExpiryPhoto} />
                    </div>
                  </div>
                )}

                {/* MEAL: toggle save to inventory */}
                {context === "meal" && (
                  <div className="flex items-center justify-between rounded-xl border border-border bg-card px-3 py-2.5">
                    <p className="text-xs font-medium" style={{ color: "#111827" }}>Salva anche in Magazzino</p>
                    <Switch checked={saveToInventory} onCheckedChange={setSaveToInventory} />
                  </div>
                )}

                {/* MEAL: meal type if not pre-selected */}
                {context === "meal" && !preselectedMealType && !selectedMealType && (
                  <div className="space-y-1.5">
                    <p className="text-xs font-semibold" style={{ color: "#111827" }}>Tipo di pasto</p>
                    <div className="grid grid-cols-4 gap-1.5">
                      {mealOptions.map(({ type, emoji, label }) => (
                        <button key={type} onClick={() => setSelectedMealType(type)}
                          className={`flex flex-col items-center gap-0.5 rounded-xl py-2 text-[11px] font-semibold transition-colors ${
                            selectedMealType === type ? "bg-primary text-primary-foreground" : "bg-card border border-border text-foreground"
                          }`}>
                          <span className="text-base">{emoji}</span>
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* ── Mostra dettagli (collapsible) ── */}
                <button onClick={() => setShowDetails(!showDetails)}
                  className="flex w-full items-center justify-center gap-1 text-xs font-medium text-muted-foreground py-1">
                  {showDetails ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                  {showDetails ? "Nascondi dettagli" : "Mostra dettagli"}
                </button>

                {showDetails && (
                  <div className="space-y-3 animate-in slide-in-from-top-2 duration-200">
                    {/* Editable name/brand */}
                    <div className={`rounded-xl border p-3 space-y-2 ${isLowConfidence("name") ? "border-amber-400 bg-amber-50/30" : "border-border"}`}>
                      {isLowConfidence("name") && (
                        <Badge className="bg-amber-100 text-amber-700 border-0 text-[10px]">⚠️ Da confermare</Badge>
                      )}
                      <Input placeholder="Nome prodotto *" value={name} onChange={(e) => setName(e.target.value)}
                        className="font-bold border-0 p-0 h-auto bg-transparent focus-visible:ring-0 text-sm" style={{ color: "#111827" }} />
                      <Input placeholder="Brand (opzionale)" value={brand} onChange={(e) => setBrand(e.target.value)}
                        className="text-xs border-0 p-0 h-auto bg-transparent focus-visible:ring-0" style={{ color: "#4B5563" }} />
                      {barcode && <Badge variant="outline" className="text-[10px] font-mono">{barcode}</Badge>}
                    </div>

                    {/* Nutrition editable */}
                    <div className={`rounded-xl border p-3 space-y-2 ${isLowConfidence("nutrition") ? "border-amber-400 bg-amber-50/30" : "border-border"}`}>
                      {isLowConfidence("nutrition") && (
                        <Badge className="bg-amber-100 text-amber-700 border-0 text-[10px]">⚠️ Valori incerti</Badge>
                      )}
                      <p className="text-xs font-semibold" style={{ color: "#111827" }}>Calorie / 100g</p>
                      <Input type="number" placeholder="kcal / 100g" value={calories100g ?? ""}
                        onChange={(e) => setCalories100g(e.target.value ? parseFloat(e.target.value) : null)}
                        className="h-8 text-sm" style={{ color: "#111827" }} />
                      <div className="grid grid-cols-3 gap-2">
                        <div>
                          <label className="text-[10px] text-muted-foreground">Proteine</label>
                          <Input type="number" placeholder="g" className="h-8 text-sm" value={macros100g?.protein ?? ""}
                            onChange={(e) => setMacros100g((prev) => ({ protein: parseFloat(e.target.value) || 0, carbs: prev?.carbs ?? 0, fats: prev?.fats ?? 0 }))} />
                        </div>
                        <div>
                          <label className="text-[10px] text-muted-foreground">Carbo</label>
                          <Input type="number" placeholder="g" className="h-8 text-sm" value={macros100g?.carbs ?? ""}
                            onChange={(e) => setMacros100g((prev) => ({ protein: prev?.protein ?? 0, carbs: parseFloat(e.target.value) || 0, fats: prev?.fats ?? 0 }))} />
                        </div>
                        <div>
                          <label className="text-[10px] text-muted-foreground">Grassi</label>
                          <Input type="number" placeholder="g" className="h-8 text-sm" value={macros100g?.fats ?? ""}
                            onChange={(e) => setMacros100g((prev) => ({ protein: prev?.protein ?? 0, carbs: prev?.carbs ?? 0, fats: parseFloat(e.target.value) || 0 }))} />
                        </div>
                      </div>
                    </div>

                    {/* Nutrition preview */}
                    {computed.calories != null && computed.macros && (
                      <div className="rounded-xl border border-accent bg-card p-3">
                        <div className="grid grid-cols-4 gap-2 text-center">
                          <div>
                            <p className="text-base font-bold text-primary">{computed.calories}</p>
                            <p className="text-[9px] text-muted-foreground">kcal</p>
                          </div>
                          <div>
                            <p className="text-base font-bold text-destructive">{computed.macros.protein}g</p>
                            <p className="text-[9px] text-muted-foreground">Prot</p>
                          </div>
                          <div>
                            <p className="text-base font-bold text-accent">{computed.macros.carbs}g</p>
                            <p className="text-[9px] text-muted-foreground">Carbo</p>
                          </div>
                          <div>
                            <p className="text-base font-bold text-primary">{computed.macros.fats}g</p>
                            <p className="text-[9px] text-muted-foreground">Grassi</p>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Quick quantity presets */}
                    <div className="flex gap-1.5">
                      {[50, 100, 150, 200, 300].map((g) => (
                        <button key={g} onClick={() => { setQuantity(g); setUnit("g"); }}
                          className={`flex-1 rounded-lg py-1.5 text-[11px] font-medium transition-colors ${
                            quantity === g && unit === "g" ? "bg-primary text-primary-foreground" : "bg-card border border-border text-foreground"
                          }`}>{g}g</button>
                      ))}
                    </div>
                  </div>
                )}

                {/* ── CTA grande ── */}
                <Button
                  className="w-full h-14 text-base font-bold gap-2 rounded-2xl"
                  onClick={handleSave}
                  disabled={saving || !name.trim()}
                >
                  {saving ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <Check className="h-5 w-5" />
                  )}
                  Conferma e salva
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
