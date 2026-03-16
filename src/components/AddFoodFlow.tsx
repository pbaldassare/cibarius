import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { deductPantryFromMeal } from "@/lib/pantry-deduction";
import { autoMatchProduct } from "@/lib/nutrition";
import { findSimilarProducts, type SimilarProduct } from "@/lib/product-dedup";
import DuplicateProductDialog from "@/components/DuplicateProductDialog";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useDebounce } from "@/hooks/useDebounce";
import BarcodeScanner from "@/components/BarcodeScanner";
import { lookupBarcode, calcNutrition, type ProductData } from "@/lib/barcode";
import { searchFoodProgressive, type FoodSearchResult, type SearchPhase } from "@/lib/search-food";
import { analyzeFoodPhotos, fuseWithOFF, fileToImageFile, lookupProductInDB, type ImageFile, type FusedFoodData } from "@/lib/ai-food";
import { Switch } from "@/components/ui/switch";
import MealRecipeCard from "@/components/MealRecipeCard";
import { Slider } from "@/components/ui/slider";
import { useDietCompatibility } from "@/hooks/useDietCompatibility";
import { addDays, format } from "date-fns";
import {
  ArrowLeft, Search, ScanLine, Keyboard, Camera, Loader2,
  Package, Plus, Minus, Check, Flame, Archive, Thermometer, Snowflake,
  CalendarSearch, AlertTriangle, Sparkles, X, ImagePlus, ChevronDown, ChevronUp, ChefHat,
  CheckCircle2, HelpCircle, Zap, ShieldCheck, ShieldAlert, ShieldX, UtensilsCrossed,
  Receipt, ShoppingCart,
} from "lucide-react";
import { getFoodEmoji } from "@/lib/food-images";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";

/* ─── Types ─── */
export type AddFoodContext = "inventory" | "meal" | "recipe" | "preparation";
type MealType = "colazione" | "pranzo" | "cena" | "spuntino";
type Method = "photo_ai" | "search" | "scan" | "manual";
type Step = "method" | "photo_ai" | "scan" | "search" | "summary" | "recipes" | "receipt" | "receipt_photo" | "receipt_qr";

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
  const [searchPhase, setSearchPhase] = useState<SearchPhase>("done");

  // Scan
  const [scanLoading, setScanLoading] = useState(false);
  const [scannedCode, setScannedCode] = useState<string | null>(null);

  // Summary fields
  const [name, setName] = useState("");
  const [brand, setBrand] = useState("");
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [quantity, setQuantityRaw] = useState(100);
  const [quantityInput, setQuantityInput] = useState("100");
  const setQuantity = (v: number) => { setQuantityRaw(v); setQuantityInput(String(v)); };
  const [unit, setUnit] = useState("g");
  const [calories100g, setCalories100g] = useState<number | null>(null);
  const [macros100g, setMacros100g] = useState<{ protein: number; carbs: number; fats: number } | null>(null);
  const [servingSizeG, setServingSizeG] = useState<number | null>(null);
  const [productId, setProductId] = useState<string | null>(null);
  const [barcode, setBarcode] = useState<string | null>(null);

  // Inventory-specific
  const [storageType, setStorageType] = useState("frigo");
  const defaultExpiry = () => format(addDays(new Date(), 3), "yyyy-MM-dd");
  const [expiryDate, setExpiryDate] = useState(defaultExpiry);
  const [expiryTouched, setExpiryTouched] = useState(false);

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

  const dietCompat = useDietCompatibility(user?.id);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [editingChip, setEditingChip] = useState<"qty" | "storage" | "expiry" | "serving" | null>(null);

  // Plan recipes state
  const [planRecipes, setPlanRecipes] = useState<any[]>([]);
  const [planRecipesLoading, setPlanRecipesLoading] = useState(false);

  // Manual name autocomplete
  const [manualSuggestions, setManualSuggestions] = useState<SearchProduct[]>([]);
  const debouncedName = useDebounce(name, 300);
  const [activePlanTitle, setActivePlanTitle] = useState<string>("");

  // Dedup state
  const [dedupOpen, setDedupOpen] = useState(false);
  const [dedupResults, setDedupResults] = useState<SimilarProduct[]>([]);
  const [skipDedup, setSkipDedup] = useState(false);

  // Receipt QR state
  interface ReceiptProduct { name: string; quantity: number; unit: string; price: number | null; category: string; selected: boolean; storage_type: string; expiry_date: string; }
  const [receiptProducts, setReceiptProducts] = useState<ReceiptProduct[]>([]);
  const [receiptLoading, setReceiptLoading] = useState(false);
  const [receiptSaving, setReceiptSaving] = useState(false);

  // Smart storage assignment based on category + product name
  const guessStorage = (category: string, name: string): string => {
    const lower = (name + " " + category).toLowerCase();
    // Freezer items
    const freezerKw = ["surgelat", "gelat", "ghiacci", "frozen", "congelat"];
    if (freezerKw.some(k => lower.includes(k))) return "freezer";
    // Fridge items
    const fridgeKw = [
      "latte", "yogurt", "formaggio", "mozzarella", "ricotta", "burro", "panna",
      "uov", "carne", "pollo", "manzo", "maiale", "tacchino", "salume", "prosciutt",
      "wurstel", "würstel", "bresaola", "speck", "mortadella", "salsiccia",
      "pesce", "salmone", "tonno fresc", "gamberi", "insalata", "verdur",
      "latticin", "affettat", "stracchino", "gorgonzola", "parmigian", "pecorino",
      "mascarpone", "philadelphia", "skyr", "kefir",
      "succo", "spremut",
      "zucchini", "pomodor", "carota", "peperone", "spinaci", "broccol",
      "cavolfiore", "melanzana", "sedano", "finocchi", "radicchio",
      "frutta", "mela", "pera", "banana", "arancia", "fragol", "kiwi",
      "uva", "pesca", "albicocca", "mandarino", "limone", "anguria", "melone",
    ];
    if (fridgeKw.some(k => lower.includes(k))) return "frigo";
    // Pantry items (ambient)
    const pantryKw = [
      "pasta", "riso", "farina", "zuccher", "olio", "aceto", "sale",
      "caffè", "caffe", "tea", "the", "tisana", "biscott", "crackers", "cracker",
      "grissini", "fette biscottate", "pane", "cereali", "muesli",
      "marmellata", "miele", "nutella", "cioccolat", "cacao",
      "conserv", "pelat", "passata", "sugo", "tonno", "fagioli", "ceci", "lenticch",
      "legum", "spezie", "pepe", "origano", "basilico secco",
      "dado", "brodo", "salsa", "ketchup", "maionese", "senape",
      "caramell", "gomm", "snack", "barrett", "merendin",
      "acqua", "birra", "vino", "bibita", "cola", "aranciata",
      "bevand", "drink", "energy",
      "scatola", "latta", "secco", "disidrat", "frutta secca",
      "noci", "mandorl", "nocciolin", "pistacch", "arachid",
    ];
    if (pantryKw.some(k => lower.includes(k))) return "ambiente";
    // Default by category
    const catMap: Record<string, string> = {
      latticini: "frigo", carne: "frigo", pesce: "frigo", salumi: "frigo",
      frutta: "frigo", verdura: "frigo", uova: "frigo",
      surgelati: "freezer",
      cereali: "ambiente", bevande: "ambiente", dolci: "ambiente",
      conserve: "ambiente", condimenti: "ambiente", snack: "ambiente",
      altro: "ambiente",
    };
    return catMap[lower.split(" ").find(w => catMap[w]) || ""] || "frigo";
  };

  // Receipt photo state
  const receiptPhotoInputRef = useRef<HTMLInputElement>(null);
  const [receiptPhotoPreview, setReceiptPhotoPreview] = useState<string | null>(null);

  // Detect diet category from plan title
  const CATEGORY_MAP: Record<string, string> = {
    mediterranea: "mediterranea", keto: "keto", ketogenica: "keto",
    digiuno: "digiuno", intermittente: "digiuno",
    massa: "massa", muscolare: "massa",
    dimagrimento: "dimagrimento", moderato: "dimagrimento",
  };
  const detectDietCategory = (title: string) => {
    const lower = title.toLowerCase();
    for (const [kw, cat] of Object.entries(CATEGORY_MAP)) {
      if (lower.includes(kw)) return cat;
    }
    return "mediterranea";
  };
  const detectIsFemale = (title: string) => title.toLowerCase().includes("donna");

  // Manual name autocomplete: suggest similar products while typing
  useEffect(() => {
    if (method !== "manual" || !debouncedName || debouncedName.length < 2 || step !== "summary") {
      setManualSuggestions([]);
      return;
    }
    const term = `%${debouncedName}%`;
    Promise.all([
      supabase.from("products").select("id, name, brand, calories_100g, macros_100g, image_url, serving_size_g").ilike("name", term).limit(5),
      supabase.from("ingredients").select("id, name, kcal_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g").ilike("name", term).limit(5),
    ]).then(([prodRes, ingrRes]) => {
      const results: SearchProduct[] = [];
      const seen = new Set<string>();
      for (const p of (prodRes.data ?? [])) {
        const key = p.name.toLowerCase();
        if (seen.has(key)) continue;
        seen.add(key);
        results.push({ id: p.id, name: p.name, brand: p.brand, calories_100g: p.calories_100g, macros_100g: p.macros_100g as any, image_url: p.image_url, serving_size_g: p.serving_size_g });
      }
      for (const i of (ingrRes.data ?? [])) {
        const key = i.name.toLowerCase();
        if (seen.has(key)) continue;
        seen.add(key);
        results.push({ id: i.id, name: i.name, brand: null, calories_100g: i.kcal_per_100g, macros_100g: { protein: i.protein_per_100g, carbs: i.carbs_per_100g, fats: i.fat_per_100g }, image_url: null, serving_size_g: null });
      }
      setManualSuggestions(results.slice(0, 8));
    });
  }, [debouncedName, method, step]);

  // Fetch plan recipes when opening in meal context
  useEffect(() => {
    if (!open || context !== "meal" || !user) return;
    const fetchPlanRecipes = async () => {
      setPlanRecipesLoading(true);
      const { data: plans } = await supabase
        .from("diet_plans")
        .select("title")
        .eq("client_user_id", user.id)
        .eq("is_active", true)
        .order("created_at", { ascending: false })
        .limit(1);
      if (!plans || plans.length === 0) {
        setPlanRecipes([]);
        setPlanRecipesLoading(false);
        return;
      }
      const planTitle = plans[0].title;
      setActivePlanTitle(planTitle);
      const cat = detectDietCategory(planTitle);
      const { data: recipes } = await supabase
        .from("template_recipes")
        .select("*")
        .eq("diet_category", cat)
        .order("meal_type")
        .order("title");
      setPlanRecipes(recipes || []);
      setPlanRecipesLoading(false);
    };
    fetchPlanRecipes();
  }, [open, context, user]);

  // Register recipe as meal
  const handleRegisterRecipeFromFlow = async (ingredients: any[], title: string) => {
    if (!user || !(selectedMealType || preselectedMealType)) return;
    setSaving(true);
    try {
      const today = new Date().toISOString().slice(0, 10);
      let { data: dayData } = await supabase
        .from("meal_days").select("id")
        .eq("user_id", user.id).eq("day_date", today).maybeSingle();
      if (!dayData) {
        const { data: nd, error: de } = await supabase
          .from("meal_days").insert({ user_id: user.id, day_date: today })
          .select("id").single();
        if (de) throw de;
        dayData = nd;
      }
      const mealTypeToUse = selectedMealType || preselectedMealType!;
      let { data: mealData } = await supabase
        .from("meals").select("id")
        .eq("meal_day_id", dayData!.id).eq("meal_type", mealTypeToUse).maybeSingle();
      if (!mealData) {
        const { data: nm, error: me } = await supabase
          .from("meals").insert({ meal_day_id: dayData!.id, meal_type: mealTypeToUse })
          .select("id").single();
        if (me) throw me;
        mealData = nm;
      }
      const totalKcal = ingredients.reduce((s, i) => s + i.kcal, 0);
      const totalP = ingredients.reduce((s, i) => s + i.protein_g, 0);
      const totalC = ingredients.reduce((s, i) => s + i.carbs_g, 0);
      const totalF = ingredients.reduce((s, i) => s + i.fats_g, 0);
      const { error: itemErr } = await supabase.from("meal_items").insert({
        meal_id: mealData!.id,
        source_type: "custom",
        custom_name: title,
        dish_name: title,
        calories: totalKcal,
        quantity: 1,
        unit: "porzione",
        macros: { protein: totalP, carbs: totalC, fats: totalF },
      });
      if (itemErr) throw itemErr;
      // Auto-deduct from pantry
      const pantryItems = ingredients.map(i => ({
        custom_name: i.name,
        dish_name: i.name,
        quantity: i.grams,
        unit: "g" as const,
      }));
      await deductPantryFromMeal(user.id, pantryItems);
      toast({ title: `"${title}" registrato! ✅` });
      setSaved(true);
      if (navigator.vibrate) navigator.vibrate(50);
      await new Promise((r) => setTimeout(r, 600));
      onComplete();
      onOpenChange(false);
    } catch (e: any) {
      toast({ variant: "destructive", title: "Errore", description: e.message });
    } finally {
      setSaving(false);
    }
  };

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
        setExpiryDate(defaultExpiry());
        setExpiryTouched(false);
        setSelectedMealType(preselectedMealType ?? null);
        setSaveToInventory(false);
        setAiPhotos([]);
        setFusedData(null);
        setExpiryModalOpen(false);
        setExpiryImage(null);
        setExpiryCandidates([]);
        setConfidence({ name: 1, barcode: 0, nutrition: 0, expiry: 0 });
        setShowDetails(false);
        setSaved(false);
        setEditingChip(null);
        setReceiptProducts([]);
        setReceiptPhotoPreview(null);
        setDedupOpen(false);
        setDedupResults([]);
        setSkipDedup(false);
      }, 300);
    }
  }, [open, preselectedMealType]);

  // Search countdown
  const [searchCountdown, setSearchCountdown] = useState(60);
  const [searchTimedOut, setSearchTimedOut] = useState(false);
  const searchCancelRef = useRef<(() => void) | null>(null);

  // Search products (progressive: local → OFF → USDA) with 60s timeout
  useEffect(() => {
    if (step !== "search" || !debouncedQuery.trim()) {
      if (!debouncedQuery.trim()) {
        setSearchResults([]);
        setSearchPhase("done");
      }
      return;
    }
    setSearching(true);
    setSearchPhase("local");
    setSearchCountdown(60);
    setSearchTimedOut(false);

    // Countdown timer
    const countdownInterval = setInterval(() => {
      setSearchCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(countdownInterval);
          setSearchTimedOut(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    const cancel = searchFoodProgressive(debouncedQuery, (results, phase, done) => {
      setSearchPhase(done ? "done" : phase === "local" ? "off" : "usda");
      setSearchResults(
        results.map((r) => ({
          id: r.local_product_id || `${r.source}:${r.barcode || r.name}`,
          name: r.name,
          brand: r.brand,
          calories_100g: r.calories_100g,
          macros_100g:
            r.protein_100g != null
              ? { protein: r.protein_100g, carbs: r.carbs_100g ?? 0, fats: r.fats_100g ?? 0 }
              : null,
          image_url: r.image_url,
          serving_size_g: null,
          _source: r.source,
          _barcode: r.barcode,
        })) as any
      );
      if (done) {
        setSearching(false);
        clearInterval(countdownInterval);
        setSearchCountdown(60);
      }
    });

    searchCancelRef.current = cancel;

    return () => {
      cancel();
      clearInterval(countdownInterval);
    };
  }, [debouncedQuery, step]);

  const handleStopSearch = () => {
    searchCancelRef.current?.();
    setSearching(false);
    setSearchTimedOut(false);
    setSearchPhase("done");
  };

  // ─── Common food default weights (grams per piece) ───
  const COMMON_WEIGHTS: Record<string, number> = {
    uovo: 60, uova: 60, egg: 60,
    banana: 120, mela: 180, pera: 170, arancia: 200, kiwi: 75,
    pesca: 150, albicocca: 45, mandarino: 80, limone: 60,
    pomodoro: 150, carota: 80, patata: 170, zucchina: 200,
    peperone: 160, cipolla: 120, melanzana: 250,
    fetta: 30, "fetta biscottata": 10, biscotto: 10, biscotti: 10,
    cracker: 7, grissino: 8, grissini: 8,
    yogurt: 125, "vasetto yogurt": 125,
    brioche: 40, cornetto: 50, croissant: 50,
    panino: 80, pane: 50, "fetta di pane": 30,
    wurstel: 50, würstel: 50, hamburger: 100,
    "fetta di prosciutto": 20, "fetta di salame": 15,
    mozzarella: 125, "mozzarella di bufala": 125,
    "sottiletta": 20, "sottilette": 20,
  };

  const guessServingWeight = (productName: string): number | null => {
    const lower = productName.toLowerCase().trim();
    // Exact match first
    if (COMMON_WEIGHTS[lower]) return COMMON_WEIGHTS[lower];
    // Partial match
    for (const [key, weight] of Object.entries(COMMON_WEIGHTS)) {
      if (lower.includes(key) || key.includes(lower)) return weight;
    }
    return null;
  };

  // Calcs
  const computed = calcNutrition(quantity, unit, calories100g, macros100g, servingSizeG);
  const isUnitPieces = unit === "pezzi" || unit === "porzioni";
  const needsServingSize = isUnitPieces && !servingSizeG;

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
      setShowDetails(true);
      setStep("summary");
    }
  };

  // ─── Search select ───
  const handleSelectSearchProduct = async (p: SearchProduct) => {
    const src = (p as any)._source as string | undefined;
    const bc = (p as any)._barcode as string | undefined;

    // If id is not a valid UUID (e.g. "local:pasta integrale" from ingredients table), treat as no product
    const isValidUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(p.id);
    let pid = isValidUuid ? p.id : null;

    // If it's from OFF/USDA or a local ingredient without a product record, upsert into products
    if (src === "off" || src === "usda" || !pid) {
      if (bc) {
        const { data: existing, error: selErr } = await supabase
          .from("products").select("id").eq("barcode", bc).maybeSingle();
        if (selErr) console.error("Search product select error:", selErr);
        if (existing) {
          pid = existing.id;
          const { error: updErr } = await supabase.from("products").update({
            name: p.name,
            brand: p.brand || null,
            image_url: p.image_url,
            calories_100g: p.calories_100g,
            macros_100g: p.macros_100g as any,
          }).eq("id", existing.id);
          if (updErr) console.warn("Search product update failed:", updErr.message);
        } else {
          const { data: created, error: insErr } = await supabase.from("products").insert({
            name: p.name,
            brand: p.brand || null,
            barcode: bc,
            image_url: p.image_url,
            calories_100g: p.calories_100g,
            macros_100g: p.macros_100g as any,
            data_source: "barcode",
          } as any).select("id").single();
          if (insErr) {
            console.error("Search product insert error:", insErr);
            const { data: fallback } = await supabase
              .from("products").select("id").eq("barcode", bc).maybeSingle();
            if (fallback) pid = fallback.id;
          } else if (created) {
            pid = created.id;
            if (!p.calories_100g) autoMatchProduct(created.id, p.name);
          }
        }
      } else {
        const { data: created, error: insErr } = await supabase.from("products").insert({
          name: p.name,
          brand: p.brand || null,
          image_url: p.image_url,
          calories_100g: p.calories_100g,
          macros_100g: p.macros_100g as any,
          data_source: "ai_search",
        } as any).select("id").single();
        if (insErr) console.error("Search product insert (no barcode) error:", insErr);
        if (created) {
          pid = created.id;
          if (!p.calories_100g) autoMatchProduct(created.id, p.name);
        }
      }
    }

    setSelectedProduct(p);
    setProductId(pid);
    setName(p.name);
    setBrand(p.brand ?? "");
    setImageUrl(p.image_url);
    setCalories100g(p.calories_100g);
    setMacros100g(p.macros_100g as any);
    setServingSizeG(p.serving_size_g);
    setBarcode(bc || null);
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

    // Detect QR code (URL or non-numeric text) → receipt flow
    const isQrReceipt = code.startsWith("http://") || code.startsWith("https://") || !/^\d+$/.test(code.trim());
    if (isQrReceipt) {
      setScanLoading(false);
      setReceiptLoading(true);
      setStep("receipt");
      try {
        const { data: fnData, error: fnError } = await supabase.functions.invoke("parse-receipt-qr", {
          body: { qr_content: code },
        });
        if (fnError) throw fnError;
        const products = (fnData?.products || []).map((p: any) => {
          const st = guessStorage(p.category || "", p.name || "");
          const days = st === "freezer" ? 90 : st === "ambiente" ? 30 : 5;
          return { ...p, selected: true, storage_type: st, expiry_date: format(addDays(new Date(), days), "yyyy-MM-dd") };
        });
        setReceiptProducts(products);
        if (products.length === 0) {
          toast({ variant: "destructive", title: "Nessun prodotto trovato nello scontrino" });
        }
      } catch (e: any) {
        toast({ variant: "destructive", title: "Errore analisi scontrino", description: e.message });
        setStep("scan");
      } finally {
        setReceiptLoading(false);
      }
      return;
    }
    // DB-first: check products table before OpenFoodFacts
    let data = await lookupProductInDB(code);
    if (!data) {
      data = await lookupBarcode(code);
    }
    if (data && data.name) {
      // Upsert product by barcode
      const { data: existing, error: selErr } = await supabase
        .from("products").select("id").eq("barcode", code).maybeSingle();
      if (selErr) console.error("Barcode select error:", selErr);

      if (existing) {
        setProductId(existing.id);
        const { error: updErr } = await supabase.from("products").update({
          name: data.name,
          brand: data.brand || null,
          image_url: data.image_url,
          calories_100g: data.calories_100g,
          macros_100g: data.macros_100g as any,
          serving_size_g: data.serving_size_g ?? null,
        }).eq("id", existing.id);
        if (updErr) console.warn("Product update failed (RLS?):", updErr.message);
      } else {
        const { data: created, error: insErr } = await supabase.from("products").insert({
          name: data.name,
          brand: data.brand || null,
          barcode: code,
          image_url: data.image_url,
          calories_100g: data.calories_100g,
          macros_100g: data.macros_100g as any,
          serving_size_g: data.serving_size_g ?? null,
          data_source: "barcode",
        } as any).select("id").single();
        if (insErr) {
          console.error("Product insert error:", insErr);
          const { data: fallback } = await supabase
            .from("products").select("id").eq("barcode", code).maybeSingle();
          if (fallback) setProductId(fallback.id);
        } else if (created) {
          setProductId(created.id);
        }
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

  // ─── Receipt photo handler ───
  const handleReceiptPhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";

    // Create preview
    const reader = new FileReader();
    reader.onload = () => setReceiptPhotoPreview(reader.result as string);
    reader.readAsDataURL(file);

    // Convert to base64
    const arrayBuffer = await file.arrayBuffer();
    const bytes = new Uint8Array(arrayBuffer);
    let binary = "";
    for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
    const base64 = btoa(binary);

    setReceiptLoading(true);
    setStep("receipt");
    try {
      const { data: fnData, error: fnError } = await supabase.functions.invoke("parse-receipt-qr", {
        body: { receipt_image: { base64, mime_type: file.type } },
      });
      if (fnError) throw fnError;
      const products = (fnData?.products || []).map((p: any) => {
        const st = guessStorage(p.category || "", p.name || "");
        const days = st === "freezer" ? 90 : st === "ambiente" ? 30 : 5;
        return { ...p, selected: true, storage_type: st, expiry_date: format(addDays(new Date(), days), "yyyy-MM-dd") };
      });
      setReceiptProducts(products);
      if (products.length === 0) {
        toast({ variant: "destructive", title: "Nessun prodotto trovato nello scontrino" });
      }
    } catch (e: any) {
      toast({ variant: "destructive", title: "Errore analisi scontrino", description: e.message });
      setStep("receipt_photo");
    } finally {
      setReceiptLoading(false);
    }
  };

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
        if (fused.best_expiry) { setExpiryDate(fused.best_expiry); setExpiryTouched(true); }
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
          if (best) { setExpiryDate(best.date); setExpiryTouched(true); }
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
    if (context === "meal" && !selectedMealType && !preselectedMealType) {
      toast({ variant: "destructive", title: "Seleziona il tipo di pasto" });
      return;
    }

    // Dedup check: if no productId and not skipping dedup, search for similar products
    if (!productId && !skipDedup && name.trim().length >= 3) {
      const similar = await findSimilarProducts(name.trim(), { threshold: 0.5, limit: 5 });
      if (similar.length > 0) {
        setDedupResults(similar);
        setDedupOpen(true);
        return; // Wait for user decision
      }
    }

    setSaving(true);

    try {
      // 1) Ensure product exists (manual entries go to product_submissions, not products)
      let pid = productId;
      if (!pid) {
        if (method === "manual") {
          // Manual entry → save to product_submissions for admin review
          const { error: subErr } = await supabase
            .from("product_submissions" as any)
            .insert({
              user_id: user.id,
              name: name.trim(),
              brand: brand.trim() || null,
              barcode: barcode || null,
              image_url: imageUrl,
              calories_100g: calories100g,
              macros_100g: macros100g as any,
              serving_size_g: servingSizeG,
              status: "pending",
            } as any);
          if (subErr) console.error("Submission insert error:", subErr);
          // pid remains null — we'll use custom_name for inventory/meal
        } else {
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
                data_source: barcode ? "barcode" : "manual",
              } as any)
              .select("id").single();
            if (pErr) throw pErr;
            pid = created.id;
          }
        }
      }

      // 2) Context-specific save
      // For inventory, product_id is required — create a temporary product if manual
      if (context === "inventory" && !pid) {
        const { data: tmpProd, error: tmpErr } = await supabase
          .from("products")
          .insert({
            name: name.trim(),
            brand: brand.trim() || null,
            barcode: barcode || null,
            image_url: imageUrl,
            calories_100g: calories100g,
            macros_100g: macros100g as any,
            serving_size_g: servingSizeG,
            data_source: "manual",
          } as any)
          .select("id").single();
        if (tmpErr) throw tmpErr;
        pid = tmpProd.id;
      }

      if (context === "inventory") {
        const insertData: any = {
          product_id: pid,
          quantity,
          unit,
          storage_type: storageType,
          expiry_date: expiryDate,
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

          const mealTypeToUse = selectedMealType || preselectedMealType!;
          let { data: meal } = await supabase
            .from("meals").select("id")
            .eq("meal_day_id", mealDay!.id).eq("meal_type", mealTypeToUse).maybeSingle();
          if (!meal) {
            const { data: nm, error: me } = await supabase
              .from("meals").insert({ meal_day_id: mealDay!.id, meal_type: mealTypeToUse })
              .select("id").single();
            if (me) throw me;
            meal = nm;
          }
          mealId = meal!.id;
        }

        const { error } = await supabase.from("meal_items").insert({
          meal_id: mealId!,
          product_id: pid || null,
          custom_name: name.trim(),
          source_type: pid ? "product" : "custom",
          quantity,
          unit,
          calories: computed.calories,
          macros: computed.macros as any,
        });
        if (error) throw error;

        // Auto-deduct from pantry
        await deductPantryFromMeal(user.id, [{
          custom_name: name.trim(),
          dish_name: name.trim(),
          product_id: pid || undefined,
          quantity,
          unit,
        }]);

        if (saveToInventory) {
          const invData: any = {
            product_id: pid,
            quantity,
            unit,
            storage_type: storageType,
            expiry_date: expiryDate,
            calories_total: computed.calories,
            macros_total: computed.macros as any,
            owner_user_id: user.id,
          };
          const { error: invErr } = await supabase.from("inventory_items").insert(invData);
          if (invErr) throw invErr;
        }

        toast({ title: `Aggiunto a ${selectedMealType || preselectedMealType}! ✓` });

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

      // Micro feedback: vibration + animation
      setSaved(true);
      if (navigator.vibrate) navigator.vibrate(50);
      await new Promise((r) => setTimeout(r, 600));

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
    else if (step === "recipes") setStep("method");
    else if (step === "receipt") setStep("receipt_qr");
    else if (step === "receipt_qr") setStep("method");
    else if (step === "search" || step === "scan" || step === "photo_ai") setStep("method");
    else onOpenChange(false);
  };

  const stepTitle = () => {
    if (step === "method") return "Aggiungi alimento";
    if (step === "photo_ai") return "Foto AI";
    if (step === "scan") return "Scansiona barcode";
    if (step === "search") return "Cerca prodotto";
    if (step === "receipt") return "Scontrino QR";
    if (step === "receipt_qr") return "Scansiona QR scontrino";
    if (step === "recipes") return "Ricette dal piano";
    return "Riepilogo";
  };

  const isLowConfidence = (field: keyof typeof confidence) => confidence[field] > 0 && confidence[field] < CONFIDENCE_LOW;

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="bottom" className="h-[90vh] rounded-t-3xl px-0 flex flex-col">
          <SheetHeader className="px-4 pb-3 border-b border-border shrink-0">
            <div className="flex items-center gap-3" data-tour="add-close-tour">
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
                  {/* Scansiona barcode (first, recommended) */}
                  <button
                    data-tour="add-scan"
                    onClick={() => {
                      if (context === "meal" && !preselectedMealType && !selectedMealType) {
                        toast({ variant: "destructive", title: "Seleziona prima il tipo di pasto" });
                        return;
                      }
                      selectMethod("scan");
                    }}
                    className="flex items-center gap-3 rounded-2xl border-2 border-primary/30 bg-primary/5 p-4 text-left active:scale-[0.98] transition-transform"
                  >
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/20">
                      <ScanLine className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-bold" style={{ color: "#111827" }}>📷 Scansiona barcode</p>
                        <Badge className="text-[9px] bg-primary/20 text-primary border-0">consigliato</Badge>
                      </div>
                      <p className="text-xs" style={{ color: "#4B5563" }}>Inquadra il codice a barre sulla confezione. Lo trovi di solito sul retro o sul fondo del prodotto.</p>
                    </div>
                  </button>

                  {/* ── Gruppo Scontrino – only for inventory context ── */}
                  {context !== "meal" && (
                    <div data-tour="add-receipt" className="rounded-2xl border border-border bg-card overflow-hidden">
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground px-4 pt-3 pb-1">
                        Scontrino
                      </p>
                      <button
                        onClick={() => setStep("receipt_photo")}
                        className="flex w-full items-center gap-3 px-4 py-3 text-left active:bg-secondary/50 transition-colors"
                      >
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                          <Receipt className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <p className="text-sm font-bold" style={{ color: "#111827" }}>📋 Foto scontrino</p>
                          <p className="text-xs" style={{ color: "#4B5563" }}>Fotografa lo scontrino della spesa per aggiungere tutti i prodotti insieme</p>
                        </div>
                      </button>
                      <div className="border-t border-border" />
                      <button
                        onClick={() => setStep("receipt_qr")}
                        className="flex w-full items-center gap-3 px-4 py-3 text-left active:bg-secondary/50 transition-colors"
                      >
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                          <ScanLine className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <p className="text-sm font-bold" style={{ color: "#111827" }}>📱 QR Scontrino</p>
                          <p className="text-xs" style={{ color: "#4B5563" }}>Inquadra il QR code stampato sullo scontrino</p>
                        </div>
                      </button>
                    </div>
                  )}

                  {/* Foto AI */}
                  <button
                    data-tour="add-photo-ai"
                    onClick={() => {
                      if (context === "meal" && !preselectedMealType && !selectedMealType) {
                        toast({ variant: "destructive", title: "Seleziona prima il tipo di pasto" });
                        return;
                      }
                      if (context === "meal") {
                        onOpenChange(false);
                        navigate("/meals/photo");
                        return;
                      }
                      selectMethod("photo_ai");
                    }}
                    className="flex items-center gap-3 rounded-2xl border border-border bg-card p-4 text-left active:scale-[0.98] transition-transform"
                  >
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                      <Sparkles className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-bold" style={{ color: "#111827" }}>📸 Foto AI</p>
                      <p className="text-xs" style={{ color: "#4B5563" }}>Scatta foto del prodotto (fronte, retro, scadenza) e l'AI riconosce tutto automaticamente</p>
                    </div>
                  </button>

                  {/* Cerca prodotto */}
                  <button
                    data-tour="add-search"
                    onClick={() => {
                      if (context === "meal" && !preselectedMealType && !selectedMealType) {
                        toast({ variant: "destructive", title: "Seleziona prima il tipo di pasto" });
                        return;
                      }
                      selectMethod("search");
                    }}
                    className="flex items-center gap-3 rounded-2xl border border-border bg-card p-4 text-left active:scale-[0.98] transition-transform"
                  >
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                      <Search className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-bold" style={{ color: "#111827" }}>🔍 Cerca prodotto</p>
                      <p className="text-xs" style={{ color: "#4B5563" }}>Scrivi il nome del prodotto per cercarlo nel nostro archivio</p>
                    </div>
                  </button>

                  {/* Inserisci manualmente */}
                  <button
                    data-tour="add-manual"
                    onClick={() => {
                      if (context === "meal" && !preselectedMealType && !selectedMealType) {
                        toast({ variant: "destructive", title: "Seleziona prima il tipo di pasto" });
                        return;
                      }
                      selectMethod("manual");
                    }}
                    className="flex items-center gap-3 rounded-2xl border border-border bg-card p-4 text-left active:scale-[0.98] transition-transform"
                  >
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                      <Keyboard className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-bold" style={{ color: "#111827" }}>✏️ Inserisci manualmente</p>
                      <p className="text-xs" style={{ color: "#4B5563" }}>Inserisci a mano nome, quantità e valori nutrizionali</p>
                    </div>
                  </button>

                  {/* Ricette dal piano – only for meal context with active plan */}
                  {context === "meal" && planRecipes.length > 0 && (
                    <button
                      onClick={() => {
                        if (!preselectedMealType && !selectedMealType) {
                          toast({ variant: "destructive", title: "Seleziona prima il tipo di pasto" });
                          return;
                        }
                        setStep("recipes");
                      }}
                      className="flex items-center gap-3 rounded-2xl border-2 border-dashed border-success/30 bg-success/5 p-4 text-left active:scale-[0.98] transition-transform"
                    >
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-success/20">
                        <UtensilsCrossed className="h-5 w-5 text-success" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-foreground">🍽️ Ricette dal piano</p>
                        <p className="text-xs text-muted-foreground">Scegli tra le ricette suggerite</p>
                      </div>
                    </button>
                  )}

                  {/* Crea Preparazione link – only for restaurants */}
                  {(context === "inventory" || context === "preparation") && defaultRestaurantId && (
                    <button
                      onClick={() => {
                        onOpenChange(false);
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

            {/* ─── STEP: Recipes from plan ─── */}
            {step === "recipes" && (
              <div className="space-y-3">
                {(() => {
                  const mealType = selectedMealType || preselectedMealType;
                  const filtered = planRecipes.filter((r) => r.meal_type === mealType);
                  const isFemale = detectIsFemale(activePlanTitle);
                  const portionScale = isFemale ? (filtered[0]?.portion_scale_female ?? 0.8) : 1;

                  if (filtered.length === 0) {
                    return (
                      <div className="text-center py-10 text-muted-foreground">
                        <UtensilsCrossed className="h-8 w-8 mx-auto mb-2 opacity-40" />
                        <p className="text-sm">Nessuna ricetta per questo pasto</p>
                      </div>
                    );
                  }

                  return filtered.map((recipe) => (
                    <MealRecipeCard
                      key={recipe.id}
                      title={recipe.title}
                      instructions={recipe.instructions}
                      prep_time_min={recipe.prep_time_min ?? 10}
                      ingredients={recipe.ingredients as any[]}
                      kcal_total={recipe.kcal_total}
                      protein_total={recipe.protein_total}
                      carbs_total={recipe.carbs_total}
                      fats_total={recipe.fats_total}
                      portionScale={portionScale}
                      onRegister={(ings, title) => handleRegisterRecipeFromFlow(ings, title)}
                    />
                  ));
                })()}
                {saving && (
                  <div className="flex justify-center py-4">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  </div>
                )}
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

                {/* Phase indicator with countdown */}
                {searching && query.trim() && (
                  <div className="flex items-center gap-2 px-1 py-1.5">
                    <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
                    <p className="text-xs text-muted-foreground flex-1">
                      {searchPhase === "local" && "Ricerca nel catalogo Cibarius..."}
                      {searchPhase === "off" && "Ricerca prodotti italiani ed europei..."}
                      {searchPhase === "usda" && "Ricerca database internazionale..."}
                    </p>
                    <span className="text-xs font-mono text-muted-foreground">{searchCountdown}s</span>
                  </div>
                )}
                {/* Timeout prompt */}
                {searchTimedOut && searching && (
                  <div className="flex items-center gap-2 rounded-xl border border-destructive/30 bg-destructive/5 p-3">
                    <AlertTriangle className="h-4 w-4 text-destructive shrink-0" />
                    <p className="text-xs text-destructive flex-1">La ricerca sta impiegando troppo.</p>
                    <Button size="sm" variant="outline" className="h-7 text-xs" onClick={handleStopSearch}>
                      Interrompi
                    </Button>
                  </div>
                )}
                {!searching && searchPhase === "done" && query.trim() && searchResults.length > 0 && (
                  <div className="flex items-center gap-2 px-1 py-1">
                    <CheckCircle2 className="h-3.5 w-3.5 text-primary" />
                    <p className="text-xs text-muted-foreground">Ricerca completata · {searchResults.length} risultati</p>
                  </div>
                )}

                {!searching && query.trim() && searchResults.length === 0 && (
                  <div className="text-center py-8">
                    <p className="text-sm text-muted-foreground">Nessun prodotto trovato</p>
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
                          <span className="text-lg">{getFoodEmoji(null, p.name)}</span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <p className="text-sm font-medium truncate" style={{ color: "#111827" }}>{p.name}</p>
                          {(p as any)._source && (p as any)._source !== "local" && (
                            <Badge variant="outline" className="text-[9px] px-1 py-0 shrink-0 uppercase">
                              {(p as any)._source}
                            </Badge>
                          )}
                        </div>
                        {p.brand && <p className="text-xs" style={{ color: "#4B5563" }}>{p.brand}</p>}
                      </div>
                      {p.calories_100g != null && (
                        <span className="text-xs font-medium text-primary shrink-0">
                          {Math.round(p.calories_100g)} kcal
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

            {/* ─── STEP: Receipt Photo ─── */}
            {step === "receipt_photo" && (
              <div className="space-y-4">
                <div className="rounded-2xl border-2 border-dashed border-primary/30 bg-primary/5 p-4 space-y-3">
                  <div className="flex items-center gap-2">
                    <Receipt className="h-5 w-5 text-primary" />
                    <p className="text-sm font-semibold text-foreground">Fotografa lo scontrino</p>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Scatta una foto dello scontrino o della lista della spesa e l'AI estrarrà i prodotti automaticamente.
                  </p>

                  {receiptPhotoPreview ? (
                    <div className="relative rounded-xl overflow-hidden border border-border max-h-48">
                      <img src={receiptPhotoPreview} alt="Scontrino" className="w-full h-full object-contain" />
                      <button
                        onClick={() => setReceiptPhotoPreview(null)}
                        className="absolute top-2 right-2 flex h-6 w-6 items-center justify-center rounded-full bg-destructive text-white"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => receiptPhotoInputRef.current?.click()}
                      className="flex w-full flex-col items-center gap-2 rounded-xl border-2 border-dashed border-border bg-card py-8"
                    >
                      <Camera className="h-8 w-8 text-muted-foreground" />
                      <span className="text-sm font-medium text-muted-foreground">Tocca per scattare o scegliere foto</span>
                    </button>
                  )}

                  <input
                    ref={receiptPhotoInputRef}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    className="hidden"
                    onChange={handleReceiptPhoto}
                  />
                </div>

                {!receiptPhotoPreview && (
                  <p className="text-center text-xs text-muted-foreground">
                    Supporta scontrini cartacei, liste della spesa e ricevute digitali
                  </p>
                )}
              </div>
            )}

            {/* ─── STEP: Receipt QR ─── */}
            {step === "receipt" && (
              <div className="space-y-4 pb-20">
                {receiptLoading ? (
                  <div className="flex flex-col items-center gap-3 py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    <p className="text-sm font-medium text-foreground">Analizzo scontrino…</p>
                    <p className="text-xs text-muted-foreground">L'AI sta estraendo i prodotti</p>
                  </div>
                ) : receiptProducts.length === 0 ? (
                  <div className="text-center py-12">
                    <Receipt className="h-10 w-10 mx-auto mb-3 text-muted-foreground opacity-40" />
                    <p className="text-sm text-muted-foreground">Nessun prodotto trovato nello scontrino</p>
                    <Button variant="outline" size="sm" className="mt-4" onClick={() => setStep("receipt_photo")}>
                      Riprova con foto
                    </Button>
                    <Button variant="outline" size="sm" className="mt-2" onClick={() => setStep("scan")}>
                      Riprova scansione QR
                    </Button>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-semibold text-foreground">
                        {receiptProducts.filter(p => p.selected).length}/{receiptProducts.length} prodotti selezionati
                      </p>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-xs h-7"
                        onClick={() => {
                          const allSelected = receiptProducts.every(p => p.selected);
                          setReceiptProducts(prev => prev.map(p => ({ ...p, selected: !allSelected })));
                        }}
                      >
                        {receiptProducts.every(p => p.selected) ? "Deseleziona tutti" : "Seleziona tutti"}
                      </Button>
                    </div>

                    <div className="space-y-1">
                    {receiptProducts.map((p, idx) => {
                      const stOpt = storageOptions.find(s => s.key === p.storage_type) || storageOptions[1];
                      const StIcon = stOpt.icon;
                      return (
                        <div key={idx} className={`rounded-xl p-3 transition-colors ${p.selected ? "bg-primary/5 border border-primary/20" : "bg-card border border-border opacity-60"}`}>
                          <div className="flex w-full items-center gap-3">
                            <button onClick={() => setReceiptProducts(prev => prev.map((pp, i) => i === idx ? { ...pp, selected: !pp.selected } : pp))} className="shrink-0">
                              <Checkbox checked={p.selected} />
                            </button>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-foreground truncate">{p.name}</p>
                              <p className="text-xs text-muted-foreground">
                                {p.quantity} {p.unit}
                                {p.price != null && ` · €${p.price.toFixed(2)}`}
                              </p>
                            </div>
                            {context === "inventory" && (
                              <button
                                onClick={() => {
                                  const keys = storageOptions.map(s => s.key);
                                  const nextIdx = (keys.indexOf(p.storage_type as typeof keys[number]) + 1) % keys.length;
                                  setReceiptProducts(prev => prev.map((pp, i) => i === idx ? { ...pp, storage_type: keys[nextIdx] } : pp));
                                }}
                                className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium bg-muted text-muted-foreground hover:bg-accent transition-colors shrink-0"
                                title={`Cambia conservazione (${stOpt.label})`}
                              >
                                <StIcon className="h-3.5 w-3.5" />
                                {stOpt.label}
                              </button>
                            )}
                          </div>
                          {context === "inventory" && p.selected && (
                            <div className="flex items-center gap-2 mt-2 ml-8">
                              <CalendarSearch className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                              <Input
                                type="date"
                                value={p.expiry_date}
                                onChange={(e) => setReceiptProducts(prev => prev.map((pp, i) => i === idx ? { ...pp, expiry_date: e.target.value } : pp))}
                                className="h-7 text-xs w-auto"
                              />
                            </div>
                          )}
                        </div>
                      );
                    })}
                    </div>

                    {/* Add selected CTA */}
                    <Button
                      className="w-full h-12 text-base font-bold gap-2"
                      disabled={receiptSaving || receiptProducts.filter(p => p.selected).length === 0}
                      onClick={async () => {
                        if (!user) return;
                        setReceiptSaving(true);
                        try {
                          const selected = receiptProducts.filter(p => p.selected);
                          let addedCount = 0;
                          for (const item of selected) {
                            // Create product
                            const { data: prod, error: prodErr } = await supabase.from("products").insert({
                              name: item.name,
                              category: item.category || null,
                            }).select("id").single();
                            if (prodErr) { console.error("Receipt product insert:", prodErr); continue; }

                            if (context === "inventory") {
                              const insertData: any = {
                                product_id: prod.id,
                                quantity: item.quantity,
                                unit: item.unit === "pz" ? "pezzi" : item.unit,
                                storage_type: item.storage_type || "frigo",
                                expiry_date: item.expiry_date || format(addDays(new Date(), 3), "yyyy-MM-dd"),
                              };
                              if (defaultRestaurantId) insertData.restaurant_id = defaultRestaurantId;
                              else insertData.owner_user_id = user.id;
                              const { error: invErr } = await supabase.from("inventory_items").insert(insertData);
                              if (invErr) { console.error("Receipt inventory insert:", invErr); continue; }
                            }
                            addedCount++;
                          }
                          toast({ title: `${addedCount} prodotti aggiunti! ✓` });
                          setSaved(true);
                          if (navigator.vibrate) navigator.vibrate(50);
                          await new Promise(r => setTimeout(r, 600));
                          onComplete();
                          onOpenChange(false);
                        } catch (e: any) {
                          toast({ variant: "destructive", title: "Errore", description: e.message });
                        } finally {
                          setReceiptSaving(false);
                        }
                      }}
                    >
                      {receiptSaving ? (
                        <><Loader2 className="h-5 w-5 animate-spin" /> Salvataggio…</>
                      ) : (
                        <><Plus className="h-5 w-5" /> Aggiungi {receiptProducts.filter(p => p.selected).length} prodotti</>
                      )}
                    </Button>
                  </>
                )}
              </div>
            )}

            {/* ─── STEP: Receipt QR ─── */}
            {step === "receipt_qr" && (
              <div className="space-y-3">
                <BarcodeScanner
                  onDetected={async (code) => {
                    const isQr = code.startsWith("http://") || code.startsWith("https://") || !/^\d+$/.test(code.trim());
                    if (!isQr) {
                      toast({ variant: "destructive", title: "Questo è un barcode prodotto", description: "Usa 'Scansiona barcode' per i prodotti singoli" });
                      return;
                    }
                    setReceiptLoading(true);
                    setStep("receipt");
                    try {
                      const { data: fnData, error: fnError } = await supabase.functions.invoke("parse-receipt-qr", {
                        body: { qr_content: code },
                      });
                      if (fnError) throw fnError;
                      const products = (fnData?.products || []).map((p: any) => {
                        const st = guessStorage(p.category || "", p.name || "");
                        const days = st === "freezer" ? 90 : st === "ambiente" ? 30 : 5;
                        return { ...p, selected: true, storage_type: st, expiry_date: format(addDays(new Date(), days), "yyyy-MM-dd") };
                      });
                      setReceiptProducts(products);
                      if (products.length === 0) {
                        toast({ variant: "destructive", title: "Nessun prodotto trovato nello scontrino" });
                      }
                    } catch (e: any) {
                      toast({ variant: "destructive", title: "Errore analisi scontrino", description: e.message });
                      setStep("receipt_qr");
                    } finally {
                      setReceiptLoading(false);
                    }
                  }}
                  active={step === "receipt_qr" && open}
                />
                {receiptLoading && (
                  <div className="flex flex-col items-center gap-2 py-4">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                    <p className="text-sm text-muted-foreground">Analisi scontrino in corso…</p>
                  </div>
                )}
                <p className="text-center text-xs text-muted-foreground">
                  Inquadra il QR code sullo scontrino
                </p>
              </div>
            )}

            {/* ─── STEP: Summary — "1 tap → confirm" ─── */}
            {step === "summary" && (
              <div className="space-y-4 pb-20">
                {notFound && (
                  <div className="rounded-xl border border-accent/30 bg-accent/5 p-3 space-y-2">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="h-5 w-5 text-accent shrink-0" />
                      <p className="text-xs text-muted-foreground">
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

                {/* ── Product hero card ── */}
                <div className="rounded-2xl bg-card shadow-card p-4">
                  {method === "manual" ? (
                    <div className="space-y-2">
                      <div className="relative">
                        <Input
                          autoFocus
                          placeholder="Nome prodotto *"
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          className="text-base font-semibold"
                        />
                      </div>
                      {/* Autocomplete suggestions */}
                      {manualSuggestions.length > 0 && (
                        <div className="rounded-xl border border-border bg-background max-h-48 overflow-y-auto">
                          {manualSuggestions.map((s) => (
                            <button
                              key={s.id}
                              type="button"
                              onClick={() => {
                                setName(s.name);
                                setBrand(s.brand ?? "");
                                setImageUrl(s.image_url);
                                setCalories100g(s.calories_100g);
                                setMacros100g(s.macros_100g as any);
                                setServingSizeG(s.serving_size_g);
                                setProductId(s.id);
                                setManualSuggestions([]);
                              }}
                              className="flex w-full items-center gap-3 px-3 py-2 text-left hover:bg-secondary/50 transition-colors border-b border-border last:border-b-0"
                            >
                              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-secondary overflow-hidden">
                                {s.image_url ? (
                                  <img src={s.image_url} alt="" className="h-full w-full object-cover" />
                                ) : (
                                  <span className="text-sm">{getFoodEmoji(null, s.name)}</span>
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-foreground truncate">{s.name}</p>
                                {s.brand && <p className="text-[10px] text-muted-foreground">{s.brand}</p>}
                              </div>
                              {s.calories_100g != null && (
                                <span className="text-[10px] font-medium text-primary shrink-0">{s.calories_100g} kcal</span>
                              )}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="flex gap-3 items-center">
                      <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-secondary overflow-hidden">
                        {imageUrl ? (
                          <img src={imageUrl} alt="" className="h-full w-full object-cover" />
                        ) : (
                          <Package className="h-7 w-7 text-muted-foreground" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-base font-semibold text-foreground truncate">{name || "Prodotto"}</p>
                        {brand && <p className="text-xs text-muted-foreground truncate">{brand}</p>}
                      </div>
                      {computed.calories != null && (
                        <div className="text-right shrink-0">
                          <p className="text-xl font-bold text-primary leading-tight">{computed.calories}</p>
                          <p className="text-[10px] text-muted-foreground">kcal</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* ── Info: no nutrition data ── */}
                {calories100g == null && !defaultRestaurantId && (
                  <div className="flex items-start gap-2 rounded-xl border border-muted bg-muted/30 p-3">
                    <AlertTriangle className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                    <p className="text-[11px] text-muted-foreground">
                      Prodotto salvato per scadenze e anti-spreco. Non sarà usato nei calcoli nutrizionali finché non avrà valori nutrizionali compilati.
                    </p>
                  </div>
                )}

                {/* ── Diet compatibility card ── */}
                {dietCompat.hasPlan && computed.calories != null && (context === "meal" || context === "inventory") && (() => {
                  const result = dietCompat.checkProduct(
                    computed.calories ?? 0,
                    computed.macros?.protein ?? 0,
                    computed.macros?.carbs ?? 0,
                    computed.macros?.fats ?? 0,
                  );
                  const cfg = result.verdict === "ok"
                    ? { icon: ShieldCheck, label: "Compatibile col tuo piano", bg: "bg-emerald-50", border: "border-emerald-200", text: "text-emerald-700", iconColor: "text-emerald-600" }
                    : result.verdict === "warning"
                    ? { icon: ShieldAlert, label: "Attenzione: vicino ai limiti", bg: "bg-amber-50", border: "border-amber-200", text: "text-amber-700", iconColor: "text-amber-600" }
                    : { icon: ShieldX, label: "Fuori piano", bg: "bg-red-50", border: "border-red-200", text: "text-red-700", iconColor: "text-red-600" };
                  const Icon = cfg.icon;
                  return (
                    <div className={`rounded-2xl ${cfg.bg} border ${cfg.border} px-3 py-2.5`}>
                      <div className="flex items-center gap-1.5 mb-1.5">
                        <Icon className={`h-4 w-4 ${cfg.iconColor}`} />
                        <span className={`text-[11px] font-semibold ${cfg.text}`}>{cfg.label}</span>
                      </div>
                      <div className="grid grid-cols-2 gap-x-3 gap-y-0.5">
                        {result.details.map((d) => (
                          <div key={d.macro} className="flex items-center justify-between">
                            <span className={`text-[10px] ${d.over ? cfg.text : "text-muted-foreground"}`}>{d.label}</span>
                            <span className={`text-[10px] font-medium ${d.over ? cfg.text : "text-foreground"}`}>
                              {d.macro === "kcal" ? Math.round(d.value) : `${d.value.toFixed(1)}g`}
                              {" / "}
                              {d.macro === "kcal" ? Math.round(d.remaining) : `${d.remaining.toFixed(1)}g`}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })()}

                {/* ── Nutrition preview (always visible) ── */}
                {computed.calories != null && computed.macros && (
                  <div className="rounded-2xl border border-border bg-card overflow-hidden">
                    {/* Header row */}
                    <div className="grid grid-cols-5 bg-muted/40 px-3 py-1.5 text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">
                      <span></span>
                      <span className="text-center">Kcal</span>
                      <span className="text-center">Prot</span>
                      <span className="text-center">Carbo</span>
                      <span className="text-center">Grassi</span>
                    </div>
                    {/* Per porzione */}
                    <div className="grid grid-cols-5 items-center px-3 py-2.5 border-b border-border">
                      <span className="text-[10px] font-semibold text-muted-foreground">{quantity}{unit}</span>
                      <p className="text-center text-lg font-bold text-primary">{computed.calories}</p>
                      <p className="text-center text-base font-bold text-blue-600">{computed.macros.protein}g</p>
                      <p className="text-center text-base font-bold text-amber-600">{computed.macros.carbs}g</p>
                      <p className="text-center text-base font-bold text-red-500">{computed.macros.fats}g</p>
                    </div>
                    {/* Per 100g */}
                    {calories100g != null && (
                      <div className="grid grid-cols-5 items-center px-3 py-2 bg-muted/20">
                        <span className="text-[10px] font-medium text-muted-foreground">100g</span>
                        <p className="text-center text-sm font-semibold text-primary/75">{calories100g}</p>
                        <p className="text-center text-sm font-semibold text-blue-600/75">{macros100g?.protein ?? 0}g</p>
                        <p className="text-center text-sm font-semibold text-amber-600/75">{macros100g?.carbs ?? 0}g</p>
                        <p className="text-center text-sm font-semibold text-red-500/75">{macros100g?.fats ?? 0}g</p>
                      </div>
                    )}
                  </div>
                )}

                {(method === "photo_ai" || method === "scan") && (
                  <div className="rounded-2xl bg-primary/5 border border-primary/10 px-3 py-2.5">
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <Sparkles className="h-3.5 w-3.5 text-primary" />
                      <span className="text-[11px] font-semibold text-primary">Letto automaticamente</span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {[
                        { key: "name" as const, label: "Nome", has: !!name },
                        { key: "barcode" as const, label: "Barcode", has: !!barcode },
                        { key: "nutrition" as const, label: "Nutrienti", has: calories100g != null },
                        { key: "expiry" as const, label: "Scadenza", has: !!expiryDate },
                      ].map(({ key, label, has }) => {
                        const conf = confidence[key];
                        const isUncertain = conf > 0 && conf < CONFIDENCE_LOW;
                        if (!has && conf === 0) return null;
                        return (
                          <span key={key} className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${
                            isUncertain
                              ? "bg-amber-100 text-amber-700"
                              : has
                              ? "bg-emerald-50 text-emerald-700"
                              : "bg-secondary text-muted-foreground"
                          }`}>
                            {isUncertain ? <HelpCircle className="h-3 w-3" /> : has ? <CheckCircle2 className="h-3 w-3" /> : null}
                            {label} {isUncertain ? "?" : has ? "✓" : ""}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* ── Editable chips row ── */}
                <div className="flex gap-2 flex-wrap">
                  {/* Quantity chip */}
                  <button
                    onClick={() => setEditingChip(editingChip === "qty" ? null : "qty")}
                    className={`inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-sm font-medium transition-all ${
                      editingChip === "qty" ? "bg-primary text-primary-foreground shadow-sm" : "bg-card border border-border text-foreground shadow-card"
                    }`}
                  >
                    <Package className="h-3.5 w-3.5" />
                    {quantity} {unit}
                  </button>

                  {/* Storage chip (inventory/prep only) */}
                  {(context === "inventory" || context === "preparation" || (context === "meal" && saveToInventory)) && (
                    <button
                      onClick={() => setEditingChip(editingChip === "storage" ? null : "storage")}
                      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-sm font-medium transition-all ${
                        editingChip === "storage" ? "bg-primary text-primary-foreground shadow-sm" : "bg-card border border-border text-foreground shadow-card"
                      }`}
                    >
                      {storageType === "frigo" ? <Thermometer className="h-3.5 w-3.5" /> : storageType === "freezer" ? <Snowflake className="h-3.5 w-3.5" /> : <Archive className="h-3.5 w-3.5" />}
                      {storageOptions.find(s => s.key === storageType)?.label || "Conservazione"}
                    </button>
                  )}

                  {/* Expiry chip (inventory/prep only) */}
                  {(context === "inventory" || context === "preparation" || (context === "meal" && saveToInventory)) && (
                    <button
                      onClick={() => setEditingChip(editingChip === "expiry" ? null : "expiry")}
                      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-sm font-medium transition-all ${
                        editingChip === "expiry" ? "bg-primary text-primary-foreground shadow-sm"
                        : !expiryTouched ? "bg-amber-50 border border-amber-300 text-amber-700 animate-pulse"
                        : "bg-card border border-border text-foreground shadow-card"
                      }`}
                    >
                      <CalendarSearch className="h-3.5 w-3.5" />
                      {new Date(expiryDate).toLocaleDateString("it-IT")}
                      {!expiryTouched && <span className="text-[10px] ml-0.5 opacity-75">(default)</span>}
                    </button>
                  )}
                </div>

                {/* ── Expanded chip editors ── */}
                {editingChip === "qty" && (
                  <div className="rounded-2xl border border-border bg-card p-3 space-y-3 animate-in slide-in-from-top-2 duration-200">
                    <div className="flex items-center gap-2">
                      <button onClick={() => setQuantity(Math.max(1, quantity - 10))} className="flex h-9 w-9 items-center justify-center rounded-xl border border-border bg-card">
                        <Minus className="h-3.5 w-3.5" />
                      </button>
                      <Input
                        type="number"
                        inputMode="numeric"
                        value={quantityInput}
                        onChange={(e) => setQuantityInput(e.target.value)}
                        onFocus={(e) => e.target.select()}
                        onBlur={() => {
                          const parsed = parseInt(quantityInput) || 1;
                          setQuantity(Math.max(1, parsed));
                        }}
                        className="text-center text-base font-bold flex-1 h-9"
                        min={1}
                      />
                      <button onClick={() => setQuantity(quantity + 10)} className="flex h-9 w-9 items-center justify-center rounded-xl border border-border bg-card">
                        <Plus className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    <div className="flex gap-1">
                      {["g", "ml", "pezzi", "kg", "porzioni"].map((u) => (
                        <button key={u} onClick={() => setUnit(u)}
                          className={`flex-1 rounded-lg py-1.5 text-[11px] font-medium transition-colors ${unit === u ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"}`}>
                          {u}
                        </button>
                      ))}
                    </div>
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

                {editingChip === "storage" && (
                  <div className="rounded-2xl border border-border bg-card p-3 animate-in slide-in-from-top-2 duration-200">
                    <div className="grid grid-cols-3 gap-1.5">
                      {storageOptions.map(({ key, label, icon: Icon }) => (
                        <button key={key} onClick={() => { setStorageType(key); setEditingChip(null); }}
                          className={`flex items-center justify-center gap-1.5 rounded-xl py-2.5 text-xs font-semibold transition-colors ${
                            storageType === key ? "bg-primary text-primary-foreground shadow-sm" : "bg-secondary text-foreground"
                          }`}>
                          <Icon className="h-4 w-4" />
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {editingChip === "expiry" && (
                  <div className="rounded-2xl border border-border bg-card p-3 space-y-2 animate-in slide-in-from-top-2 duration-200">
                    {expiryCandidates.length > 1 && (
                      <div className="flex gap-1.5 flex-wrap">
                        {expiryCandidates.map((c, i) => (
                          <button key={i} onClick={() => { setExpiryDate(c.date); setExpiryTouched(true); setEditingChip(null); }}
                            className={`rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors ${
                              expiryDate === c.date ? "bg-primary text-primary-foreground" : "bg-secondary text-foreground"
                            }`}>
                            {new Date(c.date).toLocaleDateString("it-IT")}
                            <span className="text-[9px] ml-1 opacity-70">{c.label}</span>
                          </button>
                        ))}
                      </div>
                    )}
                    <div className="flex gap-2">
                      <Input type="date" value={expiryDate} onChange={(e) => { setExpiryDate(e.target.value); setExpiryTouched(true); }}
                        className="flex-1 h-9 text-sm" />
                      <Button type="button" variant="outline" size="sm" className="shrink-0 gap-1 h-9"
                        onClick={() => expiryInputRef.current?.click()}>
                        <CalendarSearch className="h-3.5 w-3.5" />
                        <span className="text-[11px]">Foto</span>
                      </Button>
                      <input ref={expiryInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleExpiryPhoto} />
                    </div>
                  </div>
                )}

                {/* ── Serving size slider (when unit=pezzi/porzioni and no grams) ── */}
                {needsServingSize && (
                  <div className="rounded-2xl border border-amber-200 bg-amber-50/50 p-3 space-y-3">
                    <div className="flex items-center gap-2">
                      <HelpCircle className="h-4 w-4 text-amber-600" />
                      <p className="text-xs font-semibold text-amber-800">Quanto pesa 1 {unit === "pezzi" ? "pezzo" : "porzione"}?</p>
                    </div>
                    <div className="flex gap-2">
                      {[30, 80, 150].map((g) => (
                        <button key={g} onClick={() => setServingSizeG(g)}
                          className={`flex-1 rounded-xl py-2.5 text-sm font-semibold transition-colors ${
                            servingSizeG === g ? "bg-primary text-primary-foreground" : "bg-card border border-border text-foreground"
                          }`}>
                          {g}g
                        </button>
                      ))}
                    </div>
                    <div className="space-y-1">
                      <Slider
                        value={[servingSizeG || 80]}
                        onValueChange={([v]) => setServingSizeG(v)}
                        min={10}
                        max={500}
                        step={5}
                      />
                      <div className="flex justify-between text-[10px] text-muted-foreground">
                        <span>10g</span>
                        <span className="font-semibold text-foreground">{servingSizeG || 80}g</span>
                        <span>500g</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* MEAL: toggle save to inventory */}
                {context === "meal" && (
                  <div className="flex items-center justify-between rounded-xl border border-border bg-card px-3 py-2.5">
                    <p className="text-xs font-medium text-foreground">Salva anche in Magazzino</p>
                    <Switch checked={saveToInventory} onCheckedChange={setSaveToInventory} />
                  </div>
                )}

                {/* MEAL: meal type if not pre-selected */}
                {context === "meal" && !preselectedMealType && !selectedMealType && (
                  <div className="space-y-1.5">
                    <p className="text-xs font-semibold text-foreground">Tipo di pasto</p>
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

                {/* ── Dettagli (collapsible) ── */}
                <button onClick={() => setShowDetails(!showDetails)}
                  className="flex w-full items-center justify-center gap-1 text-xs font-medium text-muted-foreground py-1">
                  {showDetails ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                  {showDetails ? "Nascondi dettagli" : "Dettagli"}
                </button>

                {showDetails && (
                  <div className="space-y-3 animate-in slide-in-from-top-2 duration-200">
                    {/* Editable name/brand */}
                    <div className={`rounded-xl border p-3 space-y-2 ${isLowConfidence("name") ? "border-amber-400 bg-amber-50/30" : "border-border"}`}>
                      {isLowConfidence("name") && (
                        <Badge className="bg-amber-100 text-amber-700 border-0 text-[10px]">⚠️ Da confermare</Badge>
                      )}
                      <Input placeholder="Nome prodotto *" value={name} onChange={(e) => setName(e.target.value)}
                        className="font-bold border-0 p-0 h-auto bg-transparent focus-visible:ring-0 text-sm" />
                      <Input placeholder="Brand (opzionale)" value={brand} onChange={(e) => setBrand(e.target.value)}
                        className="text-xs border-0 p-0 h-auto bg-transparent focus-visible:ring-0 text-muted-foreground" />
                      {barcode && <Badge variant="outline" className="text-[10px] font-mono">{barcode}</Badge>}
                    </div>

                    {/* Nutrition editable */}
                    <div className={`rounded-xl border p-3 space-y-2 ${isLowConfidence("nutrition") ? "border-amber-400 bg-amber-50/30" : "border-border"}`}>
                      {isLowConfidence("nutrition") && (
                        <Badge className="bg-amber-100 text-amber-700 border-0 text-[10px]">⚠️ Valori incerti</Badge>
                      )}
                      <p className="text-xs font-semibold text-foreground">Calorie / 100g <span className="text-muted-foreground font-normal">(opzionale)</span></p>
                      <Input type="number" placeholder="kcal / 100g" value={calories100g ?? ""}
                        onChange={(e) => setCalories100g(e.target.value ? parseFloat(e.target.value) : null)}
                        className="h-8 text-sm" />
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
                      {/* Warning when no macro in meal context */}
                      {context === "meal" && calories100g == null && (
                        <div className="flex items-start gap-2 rounded-lg bg-amber-50 border border-amber-200 p-2 mt-2">
                          <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                          <p className="text-[11px] text-amber-700">
                            Questo prodotto non ha valori nutrizionali. Non verrà conteggiato nei macro del pasto.
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ── Fixed bottom CTA ── */}
          {step === "summary" && (
            <div className="shrink-0 px-4 pb-4 pt-2 border-t border-border bg-background">
              <Button
                className={`w-full h-14 text-base font-bold gap-2 rounded-2xl transition-all duration-300 ${
                  saved ? "bg-emerald-500 hover:bg-emerald-500 scale-95" : ""
                }`}
                onClick={handleSave}
                disabled={saving || !name.trim() || saved}
              >
                {saved ? (
                  <>
                    <CheckCircle2 className="h-6 w-6 animate-scale-in" />
                    Salvato!
                  </>
                ) : saving ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <>
                    <Zap className="h-5 w-5" />
                    Conferma e salva
                  </>
                )}
              </Button>
            </div>
          )}
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
      {/* ── Duplicate Product Dialog ── */}
      <DuplicateProductDialog
        open={dedupOpen}
        onOpenChange={setDedupOpen}
        newName={name}
        similarProducts={dedupResults}
        onSelectExisting={(p) => {
          setProductId(p.id);
          setName(p.name);
          setBrand(p.brand ?? "");
          setImageUrl(p.image_url);
          setCalories100g(p.calories_100g);
          setMacros100g(p.macros_100g as any);
          setServingSizeG(p.serving_size_g);
          setDedupOpen(false);
          setDedupResults([]);
          setSkipDedup(true);
          // Re-trigger save with the selected product
          setTimeout(() => handleSave(), 100);
        }}
        onCreateNew={() => {
          setDedupOpen(false);
          setDedupResults([]);
          setSkipDedup(true);
          // Re-trigger save bypassing dedup
          setTimeout(() => handleSave(), 100);
        }}
      />
    </>
  );
};

export default AddFoodFlow;
