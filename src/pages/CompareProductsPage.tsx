import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useProductFavorites } from "@/hooks/useProductFavorites";
import MobileHeader from "@/components/MobileHeader";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import {
  Camera, Loader2, ArrowLeft, Star, Plus, Save,
  Flame, Beef, Wheat, Droplets, Trophy, Check, Candy,
} from "lucide-react";

interface ComparedProduct {
  id?: string;
  name: string;
  brand: string | null;
  calories_100g: number | null;
  protein_100g: number | null;
  carbs_100g: number | null;
  sugars_100g: number | null;
  fats_100g: number | null;
  image_base64: string;
  saved: boolean;
  favorited: boolean;
}

const CompareProductsPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const { isFavorite, toggleFavorite, logUsage } = useProductFavorites();

  const [step, setStep] = useState<"capture" | "analyzing" | "results">("capture");
  const [photos, setPhotos] = useState<{ base64: string; mime_type: string }[]>([]);
  const [products, setProducts] = useState<ComparedProduct[]>([]);
  const [analyzing, setAnalyzing] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const base64 = result.split(",")[1];
      const mime_type = file.type || "image/jpeg";
      setPhotos((prev) => [...prev, { base64, mime_type }]);
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const removePhoto = (idx: number) => {
    setPhotos((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleAnalyze = async () => {
    if (photos.length < 1) {
      toast({ variant: "destructive", title: "Scatta almeno 1 foto" });
      return;
    }
    setStep("analyzing");
    setAnalyzing(true);

    try {
      // Analyze each photo individually
      const results: ComparedProduct[] = [];

      for (const photo of photos) {
        const { data: session } = await supabase.auth.getSession();
        const token = session?.session?.access_token;
        if (!token) throw new Error("Non autenticato");

        const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
        const res = await fetch(
          `https://${projectId}.supabase.co/functions/v1/analyze-food-photos`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              images: [{ base64: photo.base64, mime_type: photo.mime_type }],
              context: "compare",
            }),
          }
        );

        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.error || "Errore analisi");
        }

        const { result } = await res.json();
        if (result) {
          // Check if already exists in DB
          let existingId: string | undefined;
          let alreadyFav = false;

          if (result.product?.name) {
            const { data: existing } = await supabase
              .from("products")
              .select("id")
              .ilike("name", result.product.name)
              .limit(1)
              .maybeSingle();
            if (existing) {
              existingId = existing.id;
              alreadyFav = isFavorite(existing.id);
            }
          }

          results.push({
            id: existingId,
            name: result.product?.name || "Prodotto sconosciuto",
            brand: result.product?.brand || null,
            calories_100g: result.nutrition?.calories_100g ?? null,
            protein_100g: result.nutrition?.protein_100g ?? null,
            carbs_100g: result.nutrition?.carbs_100g ?? null,
            fats_100g: result.nutrition?.fats_100g ?? null,
            image_base64: photo.base64,
            saved: !!existingId,
            favorited: alreadyFav,
          });
        }
      }

      setProducts(results);
      setStep("results");
    } catch (err: any) {
      toast({ variant: "destructive", title: "Errore analisi", description: err.message });
      setStep("capture");
    } finally {
      setAnalyzing(false);
    }
  };

  const handleSaveProduct = async (idx: number) => {
    if (!user) return;
    const p = products[idx];
    if (p.saved && p.id) {
      toast({ title: "Prodotto già salvato" });
      return;
    }

    const macros = (p.protein_100g != null || p.carbs_100g != null || p.fats_100g != null)
      ? { protein: p.protein_100g ?? 0, carbs: p.carbs_100g ?? 0, fats: p.fats_100g ?? 0 }
      : null;

    const { data, error } = await supabase
      .from("products")
      .insert({
        name: p.name,
        brand: p.brand,
        calories_100g: p.calories_100g,
        macros_100g: macros,
        data_source: "ai_compare",
      } as any)
      .select("id")
      .single();

    if (error) {
      toast({ variant: "destructive", title: "Errore", description: error.message });
      return;
    }

    const updated = [...products];
    updated[idx] = { ...p, id: data.id, saved: true };
    setProducts(updated);
    
    // Log usage
    await logUsage(data.id);
    
    toast({ title: "Prodotto salvato ✓" });
  };

  const handleToggleFavorite = async (idx: number) => {
    const p = products[idx];
    if (!p.id) {
      // Save first
      await handleSaveProduct(idx);
      // Re-read updated state
      const updated = products[idx];
      if (!updated.id) return;
    }
    const productId = products[idx].id!;
    await toggleFavorite(productId);
    const updated = [...products];
    updated[idx] = { ...updated[idx], favorited: !updated[idx].favorited };
    setProducts(updated);
  };

  // Find best values
  const validProducts = products.filter((p) => p.calories_100g != null);
  const bestProtein = validProducts.length > 1
    ? validProducts.reduce((best, p) => (p.protein_100g ?? 0) > (best.protein_100g ?? 0) ? p : best).name
    : null;
  const leastCalories = validProducts.length > 1
    ? validProducts.reduce((best, p) => (p.calories_100g ?? Infinity) < (best.calories_100g ?? Infinity) ? p : best).name
    : null;
  const leastFats = validProducts.length > 1
    ? validProducts.reduce((best, p) => (p.fats_100g ?? Infinity) < (best.fats_100g ?? Infinity) ? p : best).name
    : null;

  return (
    <div className="min-h-screen bg-background">
      <MobileHeader
        title="Confronta prodotti"
        right={
          step === "results" ? (
            <button onClick={() => { setStep("capture"); setPhotos([]); setProducts([]); }} className="text-primary-foreground text-xs font-medium p-1">
              Nuovo
            </button>
          ) : undefined
        }
      />

      <main className="px-4 py-4 pb-28 space-y-4">
        {step === "capture" && (
          <>
            <div className="text-center space-y-2 py-4">
              <div className="h-16 w-16 mx-auto rounded-2xl bg-primary/10 flex items-center justify-center">
                <Camera className="h-8 w-8 text-primary" />
              </div>
              <h2 className="text-lg font-bold text-foreground">Fotografa i prodotti</h2>
              <p className="text-sm text-muted-foreground max-w-xs mx-auto">
                Scatta una foto per ogni prodotto che vuoi confrontare. Ideale: 2-3 prodotti simili.
              </p>
            </div>

            {/* Photo grid */}
            <div className="grid grid-cols-3 gap-2">
              {photos.map((photo, i) => (
                <div key={i} className="relative aspect-square rounded-xl overflow-hidden border-2 border-primary/30">
                  <img
                    src={`data:${photo.mime_type};base64,${photo.base64}`}
                    alt={`Prodotto ${i + 1}`}
                    className="h-full w-full object-cover"
                  />
                  <button
                    onClick={() => removePhoto(i)}
                    className="absolute top-1 right-1 h-5 w-5 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center text-xs font-bold"
                  >
                    ×
                  </button>
                  <Badge className="absolute bottom-1 left-1 text-[9px] bg-black/60 text-white border-0">
                    #{i + 1}
                  </Badge>
                </div>
              ))}
              {photos.length < 5 && (
                <button
                  onClick={() => inputRef.current?.click()}
                  className="aspect-square rounded-xl border-2 border-dashed border-border flex flex-col items-center justify-center gap-1 text-muted-foreground hover:border-primary hover:text-primary transition-colors"
                >
                  <Plus className="h-6 w-6" />
                  <span className="text-[10px] font-medium">Aggiungi</span>
                </button>
              )}
            </div>

            <input
              ref={inputRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={handleCapture}
            />

            <Button
              onClick={handleAnalyze}
              disabled={photos.length < 1}
              className="w-full gap-2"
              size="lg"
            >
              <Camera className="h-4 w-4" />
              Confronta {photos.length} prodott{photos.length === 1 ? "o" : "i"}
            </Button>
          </>
        )}

        {step === "analyzing" && (
          <div className="flex flex-col items-center justify-center py-16 gap-4">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Analisi in corso...</p>
            <div className="space-y-2 w-full max-w-xs">
              {photos.map((_, i) => (
                <Skeleton key={i} className="h-12 w-full rounded-lg" />
              ))}
            </div>
          </div>
        )}

        {step === "results" && (
          <>
            {/* Highlights */}
            {validProducts.length > 1 && (
              <div className="rounded-xl bg-primary/5 border border-primary/20 p-3 space-y-1.5">
                <div className="flex items-center gap-1.5 text-sm font-semibold text-primary">
                  <Trophy className="h-4 w-4" /> Riepilogo
                </div>
                {bestProtein && (
                  <p className="text-xs text-foreground">
                    💪 <span className="font-medium">Più proteico:</span> {bestProtein}
                  </p>
                )}
                {leastCalories && (
                  <p className="text-xs text-foreground">
                    🔥 <span className="font-medium">Meno calorico:</span> {leastCalories}
                  </p>
                )}
                {leastFats && (
                  <p className="text-xs text-foreground">
                    💧 <span className="font-medium">Meno grassi:</span> {leastFats}
                  </p>
                )}
              </div>
            )}

            {/* Product cards */}
            <div className="space-y-3">
              {products.map((p, idx) => {
                const isBestProtein = bestProtein === p.name;
                const isLeastCal = leastCalories === p.name;
                const isLeastFat = leastFats === p.name;

                return (
                  <div
                    key={idx}
                    className={`rounded-xl border-2 bg-card p-3 space-y-3 ${
                      isBestProtein || isLeastCal ? "border-primary/40 shadow-sm" : "border-border"
                    }`}
                  >
                    <div className="flex gap-3">
                      <img
                        src={`data:image/jpeg;base64,${p.image_base64}`}
                        alt={p.name}
                        className="h-16 w-16 rounded-lg object-cover shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <h3 className="text-sm font-bold text-foreground truncate">{p.name}</h3>
                        {p.brand && <p className="text-xs text-muted-foreground">{p.brand}</p>}
                        <div className="flex gap-1 mt-1 flex-wrap">
                          {isBestProtein && <Badge className="text-[8px] px-1.5 py-0 bg-emerald-100 text-emerald-700 border-0">💪 Più proteico</Badge>}
                          {isLeastCal && <Badge className="text-[8px] px-1.5 py-0 bg-blue-100 text-blue-700 border-0">🔥 Meno calorico</Badge>}
                          {isLeastFat && <Badge className="text-[8px] px-1.5 py-0 bg-violet-100 text-violet-700 border-0">💧 Meno grassi</Badge>}
                          {p.saved && <Badge variant="outline" className="text-[8px] px-1.5 py-0 border-emerald-400 text-emerald-600">✓ Salvato</Badge>}
                        </div>
                      </div>
                    </div>

                    {/* Nutrition grid */}
                    <div className="grid grid-cols-4 gap-2">
                      <div className="rounded-lg bg-secondary/50 p-2 text-center">
                        <Flame className="h-3 w-3 mx-auto text-orange-500 mb-0.5" />
                        <p className="text-xs font-bold text-foreground">{p.calories_100g ?? "—"}</p>
                        <p className="text-[9px] text-muted-foreground">kcal</p>
                      </div>
                      <div className="rounded-lg bg-secondary/50 p-2 text-center">
                        <Beef className="h-3 w-3 mx-auto text-red-500 mb-0.5" />
                        <p className="text-xs font-bold text-foreground">{p.protein_100g ?? "—"}</p>
                        <p className="text-[9px] text-muted-foreground">proteine</p>
                      </div>
                      <div className="rounded-lg bg-secondary/50 p-2 text-center">
                        <Wheat className="h-3 w-3 mx-auto text-amber-500 mb-0.5" />
                        <p className="text-xs font-bold text-foreground">{p.carbs_100g ?? "—"}</p>
                        <p className="text-[9px] text-muted-foreground">carb</p>
                      </div>
                      <div className="rounded-lg bg-secondary/50 p-2 text-center">
                        <Droplets className="h-3 w-3 mx-auto text-blue-500 mb-0.5" />
                        <p className="text-xs font-bold text-foreground">{p.fats_100g ?? "—"}</p>
                        <p className="text-[9px] text-muted-foreground">grassi</p>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2">
                      <Button
                        variant={p.saved ? "outline" : "default"}
                        size="sm"
                        className="flex-1 gap-1.5 text-xs"
                        onClick={() => handleSaveProduct(idx)}
                        disabled={p.saved}
                      >
                        {p.saved ? <Check className="h-3.5 w-3.5" /> : <Save className="h-3.5 w-3.5" />}
                        {p.saved ? "Salvato" : "Salva"}
                      </Button>
                      <Button
                        variant={p.favorited ? "default" : "outline"}
                        size="sm"
                        className="gap-1.5 text-xs"
                        onClick={() => handleToggleFavorite(idx)}
                      >
                        <Star className={`h-3.5 w-3.5 ${p.favorited ? "fill-current" : ""}`} />
                        {p.favorited ? "Preferito" : "Preferiti"}
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>

            {products.length === 0 && (
              <div className="text-center py-12">
                <p className="text-sm text-muted-foreground">Nessun prodotto riconosciuto. Riprova con foto più chiare.</p>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
};

export default CompareProductsPage;
