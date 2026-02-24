import { useState, useEffect, useRef, useCallback } from "react";
import { Html5Qrcode } from "html5-qrcode";
import MobileHeader from "@/components/MobileHeader";
import { useAuth } from "@/hooks/useAuth";
import { useRole } from "@/hooks/useRole";
import { useRestaurant } from "@/hooks/useRestaurant";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  ScanLine, Keyboard, Camera, Loader2, Package, AlertTriangle,
  RefreshCw, X, Plus, Search, CalendarSearch, Check, Flame, Flashlight,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────
interface OFFProduct {
  product_name?: string;
  brands?: string;
  image_url?: string;
  nutriments?: {
    "energy-kcal_100g"?: number;
    proteins_100g?: number;
    carbohydrates_100g?: number;
    fat_100g?: number;
  };
}

interface ProductData {
  name: string;
  brand: string;
  barcode: string;
  image_url: string | null;
  calories_100g: number | null;
  macros_100g: { protein: number; carbs: number; fats: number } | null;
  serving_size_g?: number | null;
}

// ─── Calorie calculation helper ───────────────────────
function calcNutrition(
  qty: number,
  unitVal: string,
  cal100g: number | null,
  macros100g: { protein: number; carbs: number; fats: number } | null,
  servingSizeG: number | null
): { calories: number | null; macros: { protein: number; carbs: number; fats: number } | null } {
  if (cal100g == null) return { calories: null, macros: null };
  let grams: number;
  if (unitVal === "g" || unitVal === "ml") grams = qty;
  else if (unitVal === "kg" || unitVal === "l") grams = qty * 1000;
  else {
    if (!servingSizeG) return { calories: null, macros: null };
    grams = qty * servingSizeG;
  }
  const factor = grams / 100;
  return {
    calories: Math.round(factor * cal100g),
    macros: macros100g
      ? {
          protein: Math.round(factor * macros100g.protein * 10) / 10,
          carbs: Math.round(factor * macros100g.carbs * 10) / 10,
          fats: Math.round(factor * macros100g.fats * 10) / 10,
        }
      : null,
  };
}

// ─── Barcode cache (localStorage) ─────────────────────
const CACHE_KEY = "cibarius_barcode_cache";
const getCache = (): Record<string, ProductData> => {
  try {
    return JSON.parse(localStorage.getItem(CACHE_KEY) || "{}");
  } catch { return {}; }
};
const setCache = (barcode: string, data: ProductData) => {
  const c = getCache();
  c[barcode] = data;
  // Keep max 200 entries
  const keys = Object.keys(c);
  if (keys.length > 200) delete c[keys[0]];
  localStorage.setItem(CACHE_KEY, JSON.stringify(c));
};

// ─── OpenFoodFacts lookup ─────────────────────────────
const lookupBarcode = async (barcode: string): Promise<ProductData | null> => {
  // Check cache first
  const cached = getCache()[barcode];
  if (cached) return cached;

  try {
    const res = await fetch(`https://world.openfoodfacts.org/api/v2/product/${barcode}.json`);
    if (!res.ok) return null;
    const json = await res.json();
    if (json.status !== 1 || !json.product) return null;

    const p: OFFProduct = json.product;
    const n = p.nutriments;
    const data: ProductData = {
      name: p.product_name || "",
      brand: p.brands || "",
      barcode,
      image_url: p.image_url || null,
      calories_100g: n?.["energy-kcal_100g"] ?? null,
      macros_100g:
        n?.proteins_100g != null
          ? { protein: n.proteins_100g ?? 0, carbs: n.carbohydrates_100g ?? 0, fats: n.fat_100g ?? 0 }
          : null,
    };
    setCache(barcode, data);
    return data;
  } catch {
    return null;
  }
};

// ─── Scanner component ────────────────────────────────
const BarcodeScanner = ({
  onDetected,
  active,
  onPermissionDenied,
}: {
  onDetected: (code: string) => void;
  active: boolean;
  onPermissionDenied?: () => void;
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [permDenied, setPermDenied] = useState(false);
  const [running, setRunning] = useState(false);
  const [torchOn, setTorchOn] = useState(false);
  const [torchSupported, setTorchSupported] = useState(false);
  const onDetectedRef = useRef(onDetected);
  onDetectedRef.current = onDetected;

  const stopScanner = useCallback(async () => {
    if (scannerRef.current) {
      try {
        const state = scannerRef.current.getState();
        if (state === 2 /* SCANNING */) {
          await scannerRef.current.stop();
        }
        scannerRef.current.clear();
      } catch {}
      scannerRef.current = null;
      setRunning(false);
      setTorchOn(false);
      setTorchSupported(false);
    }
  }, []);

  const startScanner = useCallback(async () => {
    if (!containerRef.current) return;
    setError(null);
    setPermDenied(false);

    // Clean up previous instance
    await stopScanner();

    try {
      const devices = await Html5Qrcode.getCameras();
      if (!devices.length) {
        setError("Nessuna fotocamera trovata sul dispositivo.");
        return;
      }

      const scanner = new Html5Qrcode("barcode-reader");
      scannerRef.current = scanner;

      await scanner.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 280, height: 150 }, aspectRatio: 1.5 },
        (decodedText) => {
          onDetectedRef.current(decodedText);
        },
        () => {}
      );
      setRunning(true);

      // Check torch capability
      try {
        const track = scanner.getRunningTrackCameraCapabilities();
        if (track && typeof (track as any).torchFeature === "function") {
          const torch = (track as any).torchFeature();
          if (torch && torch.isSupported()) {
            setTorchSupported(true);
          }
        }
      } catch {}
    } catch (err: any) {
      const msg = err?.message || String(err);
      if (msg.includes("Permission") || msg.includes("NotAllowed") || msg.includes("denied")) {
        setPermDenied(true);
        setError("Permesso fotocamera negato.");
        onPermissionDenied?.();
      } else {
        setError("Impossibile avviare la fotocamera: " + msg);
      }
    }
  }, [stopScanner, onPermissionDenied]);

  const toggleTorch = useCallback(async () => {
    if (!scannerRef.current) return;
    try {
      const track = scannerRef.current.getRunningTrackCameraCapabilities();
      if (track && typeof (track as any).torchFeature === "function") {
        const torch = (track as any).torchFeature();
        if (torch && torch.isSupported()) {
          await torch.apply(!torchOn);
          setTorchOn(!torchOn);
        }
      }
    } catch {}
  }, [torchOn]);

  useEffect(() => {
    if (active) {
      startScanner();
    } else {
      stopScanner();
    }
    return () => { stopScanner(); };
  }, [active, startScanner, stopScanner]);

  return (
    <div className="flex flex-col items-center gap-3">
      <div
        ref={containerRef}
        className="relative w-full overflow-hidden rounded-2xl border-2 border-accent bg-secondary"
      >
        <div id="barcode-reader" className="w-full" />
        {!running && !error && (
          <div className="flex flex-col items-center justify-center gap-2 py-16 text-muted-foreground">
            <Camera className="h-10 w-10" />
            <p className="text-sm">Avvio fotocamera…</p>
          </div>
        )}
      </div>

      {/* Permission denied — detailed instructions */}
      {permDenied && (
        <div className="w-full rounded-xl border-2 border-destructive/30 bg-destructive/5 p-4 space-y-3">
          <div className="flex items-start gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive mt-0.5 shrink-0" />
            <div className="space-y-1">
              <p className="text-sm font-semibold text-destructive">Fotocamera non disponibile</p>
              <p className="text-xs text-muted-foreground">
                Per scansionare i prodotti, abilita l'accesso alla fotocamera:
              </p>
              <ol className="text-xs text-muted-foreground list-decimal pl-4 space-y-0.5">
                <li>Tocca l'icona 🔒 nella barra degli indirizzi</li>
                <li>Seleziona <strong>Impostazioni sito</strong></li>
                <li>Abilita <strong>Fotocamera</strong></li>
                <li>Ricarica la pagina</li>
              </ol>
            </div>
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" className="flex-1 gap-1.5" onClick={startScanner}>
              <RefreshCw className="h-4 w-4" /> Riprova
            </Button>
          </div>
        </div>
      )}

      {/* Generic error (not permission) */}
      {error && !permDenied && (
        <div className="flex flex-col items-center gap-2 rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-center">
          <AlertTriangle className="h-6 w-6 text-destructive" />
          <p className="text-sm text-destructive">{error}</p>
          <Button size="sm" variant="outline" onClick={startScanner}>
            <RefreshCw className="mr-1 h-4 w-4" /> Riprova
          </Button>
        </div>
      )}

      {/* Running controls */}
      {running && (
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => { stopScanner(); setTimeout(startScanner, 300); }}>
            <RefreshCw className="mr-1 h-4 w-4" /> Ricarica fotocamera
          </Button>
          {torchSupported && (
            <Button
              size="sm"
              variant={torchOn ? "default" : "outline"}
              onClick={toggleTorch}
              className="gap-1.5"
            >
              <Flashlight className="h-4 w-4" />
              {torchOn ? "Torcia ON" : "Torcia"}
            </Button>
          )}
        </div>
      )}
    </div>
  );
};

// ─── Main ScanPage ────────────────────────────────────
const ScanPage = () => {
  const { user } = useAuth();
  const { role } = useRole();
  const { restaurant } = useRestaurant();
  const { toast } = useToast();

  const [activeTab, setActiveTab] = useState("scan");
  const [manualCode, setManualCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [product, setProduct] = useState<ProductData | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [scannedCode, setScannedCode] = useState<string | null>(null);

  // Add-to-inventory form
  const [quantity, setQuantity] = useState("1");
  const [unit, setUnit] = useState("pezzi");
  const [storage, setStorage] = useState("frigo");
  const [expiry, setExpiry] = useState("");
  const [saving, setSaving] = useState(false);

  // Expiry OCR
  const [expiryModalOpen, setExpiryModalOpen] = useState(false);
  const [expiryImage, setExpiryImage] = useState<string | null>(null);
  const [expiryAnalyzing, setExpiryAnalyzing] = useState(false);
  const [expiryCandidates, setExpiryCandidates] = useState<{ date: string; label: string; confidence: number }[]>([]);
  const [expiryRawText, setExpiryRawText] = useState("");
  const expiryInputRef = useRef<HTMLInputElement>(null);

  const handleBarcode = useCallback(async (code: string) => {
    if (loading || code === scannedCode) return;
    setScannedCode(code);
    setLoading(true);
    setNotFound(false);
    setProduct(null);

    const data = await lookupBarcode(code);
    if (data && data.name) {
      setProduct(data);
    } else {
      setNotFound(true);
      setProduct({ name: "", brand: "", barcode: code, image_url: null, calories_100g: null, macros_100g: null });
    }
    setLoading(false);
  }, [loading, scannedCode]);

  const handleManualSearch = () => {
    const code = manualCode.trim();
    if (!code) return;
    setScannedCode(null); // reset to allow re-search
    handleBarcode(code);
  };

  const handleSave = async () => {
    if (!user || !product) return;
    setSaving(true);

    // 1) Upsert product by barcode
    let productId: string | null = null;

    if (product.barcode) {
      const { data: existing } = await supabase
        .from("products")
        .select("id")
        .eq("barcode", product.barcode)
        .maybeSingle();

      if (existing) {
        productId = existing.id;
      }
    }

    if (!productId) {
      const { data: created, error: pErr } = await supabase
        .from("products")
        .insert({
          name: product.name || "Prodotto sconosciuto",
          brand: product.brand || null,
          barcode: product.barcode || null,
          image_url: product.image_url,
          calories_100g: product.calories_100g,
          macros_100g: product.macros_100g as any,
        })
        .select("id")
        .single();

      if (pErr || !created) {
        toast({ variant: "destructive", title: "Errore", description: pErr?.message ?? "Errore creazione prodotto" });
        setSaving(false);
        return;
      }
      productId = created.id;
    }

    // 2) Create inventory item with calorie calc
    const qty = parseFloat(quantity) || 1;
    const { calories, macros } = calcNutrition(
      qty, unit, product.calories_100g, product.macros_100g, product.serving_size_g ?? null
    );

    const insertData: any = {
      product_id: productId,
      quantity: qty,
      unit,
      storage_type: storage,
      expiry_date: expiry || null,
      calories_total: calories,
      macros_total: macros as any,
    };

    if (role === "restaurant_owner" && restaurant) {
      insertData.restaurant_id = restaurant.id;
    } else {
      insertData.owner_user_id = user.id;
    }

    const { error } = await supabase.from("inventory_items").insert(insertData);
    setSaving(false);

    if (error) {
      toast({ variant: "destructive", title: "Errore", description: error.message });
    } else {
      toast({ title: "Prodotto aggiunto all'inventario!" });
      resetState();
    }
  };

  const resetState = () => {
    setProduct(null);
    setNotFound(false);
    setScannedCode(null);
    setManualCode("");
    setQuantity("1");
    setUnit("pezzi");
    setStorage("frigo");
    setExpiry("");
    setExpiryModalOpen(false);
    setExpiryImage(null);
    setExpiryCandidates([]);
    setExpiryRawText("");
  };

  const handleExpiryPhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Read as base64
    const reader = new FileReader();
    reader.onload = async () => {
      const dataUrl = reader.result as string;
      setExpiryImage(dataUrl);
      setExpiryModalOpen(true);
      setExpiryAnalyzing(true);
      setExpiryCandidates([]);
      setExpiryRawText("");

      // Extract base64 data (strip prefix)
      const base64 = dataUrl.split(",")[1];
      const mimeType = file.type || "image/jpeg";

      try {
        const { data, error } = await supabase.functions.invoke("extract-expiry", {
          body: { image_base64: base64, mime_type: mimeType },
        });

        if (error) throw error;

        if (data?.candidates?.length) {
          setExpiryCandidates(data.candidates);
          // Auto-select highest confidence "Scadenza"
          const best = data.candidates
            .filter((c: any) => c.label === "Scadenza")
            .sort((a: any, b: any) => b.confidence - a.confidence)[0]
            || data.candidates.sort((a: any, b: any) => b.confidence - a.confidence)[0];
          if (best) setExpiry(best.date);
        }
        if (data?.raw_text) setExpiryRawText(data.raw_text);
      } catch (err: any) {
        toast({ variant: "destructive", title: "Errore OCR", description: err?.message || "Impossibile leggere la scadenza" });
      } finally {
        setExpiryAnalyzing(false);
      }
    };
    reader.readAsDataURL(file);
    // Reset input so same file can be re-selected
    e.target.value = "";
  };

  const confirmExpiryDate = (date: string) => {
    setExpiry(date);
    setExpiryModalOpen(false);
    toast({ title: "Scadenza impostata", description: new Date(date).toLocaleDateString("it-IT") });
  };

  return (
    <div className="flex flex-col">
      <MobileHeader title="Scansiona" />

      <main className="flex-1 px-4 pb-28 space-y-4">
        {/* Tabs */}
        {!product && (
          <Tabs value={activeTab} onValueChange={(v) => { setActiveTab(v); resetState(); }}>
            <TabsList className="grid w-full grid-cols-2 bg-secondary">
              <TabsTrigger value="scan" className="gap-1.5">
                <ScanLine className="h-4 w-4" /> Scansiona
              </TabsTrigger>
              <TabsTrigger value="manual" className="gap-1.5">
                <Keyboard className="h-4 w-4" /> Inserisci codice
              </TabsTrigger>
            </TabsList>

            {/* Scanner tab */}
            <TabsContent value="scan" className="mt-4 space-y-3">
              <BarcodeScanner
                onDetected={handleBarcode}
                active={activeTab === "scan" && !product}
                onPermissionDenied={() => setActiveTab("manual")}
              />
              <p className="text-center text-xs text-muted-foreground">
                Inquadra il codice a barre del prodotto
              </p>
            </TabsContent>

            {/* Manual tab */}
            <TabsContent value="manual" className="mt-4 space-y-3">
              <div className="flex gap-2">
                <Input
                  placeholder="Codice a barre (es. 8001505005592)"
                  value={manualCode}
                  onChange={(e) => setManualCode(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleManualSearch()}
                  className="border-accent/30"
                  inputMode="numeric"
                />
                <Button onClick={handleManualSearch} disabled={loading || !manualCode.trim()}>
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                </Button>
              </div>
            </TabsContent>
          </Tabs>
        )}

        {/* Loading */}
        {loading && (
          <div className="flex flex-col items-center gap-3 py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm font-medium text-foreground">Ricerca in corso…</p>
            <p className="text-xs text-muted-foreground">Controllo su OpenFoodFacts</p>
          </div>
        )}

        {/* Product found → summary card */}
        {product && !loading && (
          <div className="space-y-4">
            {/* Header with close */}
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-foreground">
                {notFound ? "Prodotto non trovato" : "Prodotto trovato"}
              </h2>
              <Button variant="ghost" size="icon" onClick={resetState}>
                <X className="h-5 w-5" />
              </Button>
            </div>

            {notFound && (
              <div className="flex items-center gap-2 rounded-xl border border-accent/30 bg-accent/5 p-3">
                <AlertTriangle className="h-5 w-5 text-accent" />
                <p className="text-sm text-muted-foreground">
                  Barcode <span className="font-mono font-bold">{product.barcode}</span> non trovato su OpenFoodFacts. Compila manualmente.
                </p>
              </div>
            )}

            {/* Product card */}
            <div className="rounded-2xl border-2 border-accent bg-card p-4 space-y-4">
              <div className="flex gap-3">
                <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-xl bg-secondary overflow-hidden">
                  {product.image_url ? (
                    <img src={product.image_url} alt={product.name} className="h-full w-full object-cover" />
                  ) : (
                    <Package className="h-10 w-10 text-muted-foreground" />
                  )}
                </div>
                <div className="flex-1 space-y-1">
                  {notFound ? (
                    <Input
                      placeholder="Nome prodotto *"
                      value={product.name}
                      onChange={(e) => setProduct({ ...product, name: e.target.value })}
                      className="border-accent/30 font-bold"
                    />
                  ) : (
                    <p className="text-base font-bold text-foreground">{product.name}</p>
                  )}
                  {product.brand && (
                    <p className="text-sm text-muted-foreground">{product.brand}</p>
                  )}
                  <Badge variant="outline" className="text-[10px] font-mono">
                    {product.barcode}
                  </Badge>
                </div>
              </div>

              {/* Nutrition info */}
              {product.calories_100g != null && (
                <div className="flex gap-2 flex-wrap">
                  <Badge className="bg-primary text-primary-foreground">{Math.round(product.calories_100g)} kcal/100g</Badge>
                  {product.macros_100g && (
                    <>
                      <Badge variant="outline">P {product.macros_100g.protein.toFixed(1)}g</Badge>
                      <Badge variant="outline">C {product.macros_100g.carbs.toFixed(1)}g</Badge>
                      <Badge variant="outline">G {product.macros_100g.fats.toFixed(1)}g</Badge>
                    </>
                  )}
                </div>
              )}

              {/* Live calorie estimate */}
              {(() => {
                const qty = parseFloat(quantity) || 0;
                const { calories: liveCal, macros: liveMacros } = calcNutrition(
                  qty, unit, product.calories_100g, product.macros_100g, product.serving_size_g ?? null
                );
                if (liveCal != null) return (
                  <div className="rounded-xl bg-primary/5 border border-primary/20 p-3 space-y-1">
                    <p className="text-sm font-bold text-primary flex items-center gap-1">
                      <Flame className="h-4 w-4" /> {liveCal} kcal totali
                    </p>
                    {liveMacros && (
                      <p className="text-xs text-muted-foreground">
                        P {liveMacros.protein}g · C {liveMacros.carbs}g · G {liveMacros.fats}g
                      </p>
                    )}
                  </div>
                );
                if (product.calories_100g != null && (unit === "pezzi" || unit === "porzioni") && !product.serving_size_g) return (
                  <p className="text-xs text-accent">⚠ Inserisci il peso per porzione per calcolare le kcal</p>
                );
                return null;
              })()}

              {/* Inventory fields */}
              <div className="space-y-3 border-t border-border pt-4">
                <div className="flex gap-2">
                  <Input
                    type="number"
                    placeholder="Qtà"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    className="w-20 border-accent/30"
                    min="0"
                    step="0.1"
                  />
                  <Select value={unit} onValueChange={setUnit}>
                    <SelectTrigger className="flex-1 border-accent/30"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {["pezzi", "kg", "g", "l", "ml", "porzioni"].map((u) => (
                        <SelectItem key={u} value={u}>{u}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Select value={storage} onValueChange={setStorage}>
                  <SelectTrigger className="border-accent/30"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="frigo">Frigo</SelectItem>
                    <SelectItem value="freezer">Congelato</SelectItem>
                    <SelectItem value="ambiente">Dispensa</SelectItem>
                  </SelectContent>
                </Select>
                <div className="space-y-2">
                  <div className="flex gap-2">
                    <Input
                      type="date"
                      value={expiry}
                      onChange={(e) => setExpiry(e.target.value)}
                      className="flex-1 border-accent/30"
                      placeholder="Scadenza"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      className="shrink-0 gap-1.5 border-accent/30"
                      onClick={() => expiryInputRef.current?.click()}
                    >
                      <CalendarSearch className="h-4 w-4" />
                      <span className="hidden xs:inline">Leggi da foto</span>
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
                  {expiry && (
                    <p className="text-xs text-muted-foreground">
                      Scadenza: <span className="font-semibold">{new Date(expiry).toLocaleDateString("it-IT")}</span>
                    </p>
                  )}
                </div>
              </div>

              <Button className="w-full h-12 text-base font-bold" onClick={handleSave} disabled={saving || (!product.name && notFound)}>
                {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
                Aggiungi all'inventario
              </Button>
            </div>
          </div>
        )}

        {/* Expiry OCR Modal */}
        <Dialog open={expiryModalOpen} onOpenChange={setExpiryModalOpen}>
          <DialogContent className="max-w-md mx-4">
            <DialogHeader>
              <DialogTitle>Lettura scadenza</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              {/* Preview */}
              {expiryImage && (
                <div className="rounded-xl overflow-hidden border-2 border-accent bg-secondary max-h-48">
                  <img src={expiryImage} alt="Etichetta" className="w-full h-full object-contain" />
                </div>
              )}

              {/* Analyzing */}
              {expiryAnalyzing && (
                <div className="flex flex-col items-center gap-2 py-4">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  <p className="text-sm text-muted-foreground">Analisi in corso…</p>
                </div>
              )}

              {/* Results */}
              {!expiryAnalyzing && expiryCandidates.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-semibold text-foreground">Date trovate:</p>
                  {expiryCandidates.map((c, i) => (
                    <button
                      key={i}
                      className={`flex w-full items-center justify-between rounded-xl border-2 p-3 transition-colors ${
                        expiry === c.date
                          ? "border-primary bg-primary/5"
                          : "border-accent/30 bg-card hover:border-primary/50"
                      }`}
                      onClick={() => setExpiry(c.date)}
                    >
                      <div className="text-left">
                        <p className="font-bold text-foreground">
                          {new Date(c.date).toLocaleDateString("it-IT")}
                        </p>
                        <p className="text-xs text-muted-foreground">{c.label}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge
                          variant="outline"
                          className={c.label === "Scadenza" ? "border-primary text-primary" : ""}
                        >
                          {Math.round(c.confidence * 100)}%
                        </Badge>
                        {expiry === c.date && (
                          <Check className="h-5 w-5 text-primary" />
                        )}
                      </div>
                    </button>
                  ))}

                  <Button
                    className="w-full mt-2"
                    onClick={() => confirmExpiryDate(expiry)}
                    disabled={!expiry}
                  >
                    <Check className="mr-2 h-4 w-4" /> Conferma
                  </Button>
                </div>
              )}

              {/* No results */}
              {!expiryAnalyzing && expiryCandidates.length === 0 && expiryImage && (
                <div className="flex flex-col items-center gap-2 py-4 text-center">
                  <AlertTriangle className="h-8 w-8 text-accent" />
                  <p className="text-sm text-muted-foreground">Nessuna data trovata. Inserisci manualmente.</p>
                  <Button variant="outline" onClick={() => setExpiryModalOpen(false)}>
                    Chiudi
                  </Button>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
};

export default ScanPage;
