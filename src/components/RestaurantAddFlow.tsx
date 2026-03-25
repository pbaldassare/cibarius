import { useState, useEffect, useRef } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import RestaurantLabel, { type LabelData } from "@/components/RestaurantLabel";
import { format, addDays } from "date-fns";
import {
  ArrowLeft, Camera, Loader2, Plus, X, ImagePlus, Check,
  Archive, Thermometer, Snowflake, ChefHat, Package, Tag,
} from "lucide-react";

/* ─── Types ─── */
interface ImageFile { base64: string; mime_type: string; preview: string; }

interface AiItem {
  name: string;
  brand?: string | null;
  quantity?: number | null;
  unit?: string | null;
  weight_g?: number | null;
  lot_number?: string | null;
  expiry_date?: string | null;
  production_date?: string | null;
  storage_hint: string;
  chef_life_hours?: number | null;
  allergens: string[];
  category?: string | null;
  selected?: boolean;
}

interface AiResult {
  doc_type: "single_product" | "ddt" | "product_list";
  supplier?: { name?: string | null; date?: string | null };
  items: AiItem[];
}

interface EditItem extends AiItem {
  itemType: "product" | "preparation";
}

type Step = "photo" | "results" | "edit" | "label";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  restaurantId: string;
  onComplete: () => void;
}

const storageOptions = [
  { key: "ambiente", label: "Dispensa", icon: Archive },
  { key: "frigo", label: "Frigo", icon: Thermometer },
  { key: "freezer", label: "Congelatore", icon: Snowflake },
] as const;

const chefLifePresets = [24, 48, 72];

const fileToImageFile = async (file: File): Promise<ImageFile> => {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      const base64 = dataUrl.split(",")[1];
      resolve({ base64, mime_type: file.type || "image/jpeg", preview: dataUrl });
    };
    reader.readAsDataURL(file);
  });
};

const RestaurantAddFlow = ({ open, onOpenChange, restaurantId, onComplete }: Props) => {
  const { user } = useAuth();
  const { toast } = useToast();

  const [step, setStep] = useState<Step>("photo");
  const [photos, setPhotos] = useState<ImageFile[]>([]);
  const [analyzing, setAnalyzing] = useState(false);
  const [aiResult, setAiResult] = useState<AiResult | null>(null);
  const [selectedItems, setSelectedItems] = useState<boolean[]>([]);
  const [editIndex, setEditIndex] = useState(0);
  const [editItems, setEditItems] = useState<EditItem[]>([]);
  const [saving, setSaving] = useState(false);
  const [savedLabels, setSavedLabels] = useState<LabelData[]>([]);
  const [allergensList, setAllergensList] = useState<{ id: string; name: string; code: string }[]>([]);
  const [selectedAllergens, setSelectedAllergens] = useState<string[]>([]);
  const photoInputRef = useRef<HTMLInputElement>(null);

  // Load allergens
  useEffect(() => {
    supabase.from("allergens").select("id, name, code").then(({ data }) => {
      if (data) setAllergensList(data);
    });
  }, []);

  // Reset on close
  useEffect(() => {
    if (!open) {
      setTimeout(() => {
        setStep("photo");
        setPhotos([]);
        setAiResult(null);
        setSelectedItems([]);
        setEditItems([]);
        setEditIndex(0);
        setSavedLabels([]);
        setSelectedAllergens([]);
      }, 300);
    }
  }, [open]);

  const handleAddPhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    const newPhotos: ImageFile[] = [];
    for (let i = 0; i < files.length && photos.length + newPhotos.length < 5; i++) {
      const img = await fileToImageFile(files[i]);
      newPhotos.push(img);
    }
    setPhotos((prev) => [...prev, ...newPhotos].slice(0, 5));
    e.target.value = "";
  };

  const handleAnalyze = async () => {
    if (photos.length === 0) return;
    setAnalyzing(true);
    try {
      const { data, error } = await supabase.functions.invoke("analyze-restaurant-photos", {
        body: { images: photos.map((p) => ({ base64: p.base64, mime_type: p.mime_type })) },
      });
      if (error) throw error;
      if (!data?.result?.items?.length) {
        toast({ variant: "destructive", title: "Nessun prodotto trovato", description: "Riprova con foto più chiare." });
        setAnalyzing(false);
        return;
      }
      const result = data.result as AiResult;
      setAiResult(result);
      setSelectedItems(result.items.map(() => true));
      setStep("results");
    } catch (err: any) {
      toast({ variant: "destructive", title: "Errore analisi", description: err?.message || "Riprova" });
    } finally {
      setAnalyzing(false);
    }
  };

  const handleConfirmSelection = () => {
    if (!aiResult) return;
    const items = aiResult.items
      .filter((_, i) => selectedItems[i])
      .map((item) => ({
        ...item,
        itemType: "product" as const,
      }));
    if (items.length === 0) {
      toast({ variant: "destructive", title: "Seleziona almeno un prodotto" });
      return;
    }
    setEditItems(items);
    setEditIndex(0);
    setSelectedAllergens(items[0]?.allergens || []);
    setStep("edit");
  };

  const updateEditItem = (field: string, value: any) => {
    setEditItems((prev) => {
      const copy = [...prev];
      copy[editIndex] = { ...copy[editIndex], [field]: value };
      return copy;
    });
  };

  const handleNextItem = () => {
    // Save current allergens
    setEditItems((prev) => {
      const copy = [...prev];
      copy[editIndex] = { ...copy[editIndex], allergens: selectedAllergens };
      return copy;
    });

    if (editIndex < editItems.length - 1) {
      const nextIdx = editIndex + 1;
      setEditIndex(nextIdx);
      setSelectedAllergens(editItems[nextIdx]?.allergens || []);
    } else {
      handleSaveAll();
    }
  };

  const handleSaveAll = async () => {
    if (!user) return;
    setSaving(true);
    const labels: LabelData[] = [];

    try {
      // Update allergens for current item
      const finalItems = editItems.map((item, i) =>
        i === editIndex ? { ...item, allergens: selectedAllergens } : item
      );

      for (const item of finalItems) {
        if (item.itemType === "preparation") {
          // Save as preparation
          const { data: prep, error } = await supabase.from("preparations").insert({
            name: item.name,
            restaurant_id: restaurantId,
            storage_type: item.storage_hint || "frigo",
            use_by_date: item.expiry_date || format(addDays(new Date(), 3), "yyyy-MM-dd"),
            prepared_at: new Date().toISOString(),
            lot_number: item.lot_number || null,
            chef_life_hours: item.chef_life_hours || null,
            production_date: item.production_date || null,
            portions: item.quantity || 1,
            description: item.brand || null,
          }).select("id").single();

          if (error) throw error;
          if (prep) {
            // Save allergens
            if (item.allergens.length > 0) {
              const allergenIds = allergensList
                .filter((a) => item.allergens.some((name) =>
                  a.name.toLowerCase().includes(name.toLowerCase()) ||
                  name.toLowerCase().includes(a.name.toLowerCase())
                ))
                .map((a) => a.id);

              if (allergenIds.length > 0) {
                await supabase.from("preparation_allergens").insert(
                  allergenIds.map((aid) => ({ preparation_id: prep.id, allergen_id: aid }))
                );
              }
            }

            labels.push({
              id: prep.id,
              type: "preparation",
              name: item.name,
              ingredients: item.brand || undefined,
              allergens: item.allergens.length > 0 ? item.allergens : undefined,
              productionDate: item.production_date || format(new Date(), "yyyy-MM-dd"),
              expiryDate: item.expiry_date || format(addDays(new Date(), 3), "yyyy-MM-dd"),
              storageType: item.storage_hint,
              lotNumber: item.lot_number || undefined,
              chefLifeHours: item.chef_life_hours || undefined,
            });
          }
        } else {
          // Save as product + inventory_item
          const { data: product, error: pErr } = await supabase.from("products").insert({
            name: item.name,
            brand: item.brand || null,
            category: item.category || null,
          }).select("id").single();

          if (pErr) throw pErr;
          if (product) {
            const { data: inv, error: iErr } = await supabase.from("inventory_items").insert({
              product_id: product.id,
              restaurant_id: restaurantId,
              storage_type: item.storage_hint || "frigo",
              expiry_date: item.expiry_date || format(addDays(new Date(), 3), "yyyy-MM-dd"),
              quantity: item.quantity || 1,
              unit: item.unit || "pz",
              lot_number: item.lot_number || null,
              chef_life_hours: item.chef_life_hours || null,
              production_date: item.production_date || null,
              ingredients: (item as any).ingredientsText || null,
            }).select("id").single();

            if (iErr) throw iErr;
            if (inv) {
              // Save allergens for inventory items
              if (item.allergens.length > 0) {
                const allergenIds = allergensList
                  .filter((a) => item.allergens.some((name) =>
                    a.name.toLowerCase().includes(name.toLowerCase()) ||
                    name.toLowerCase().includes(a.name.toLowerCase())
                  ))
                  .map((a) => a.id);

                if (allergenIds.length > 0) {
                  await supabase.from("inventory_item_allergens").insert(
                    allergenIds.map((aid) => ({ inventory_item_id: inv.id, allergen_id: aid }))
                  );
                }
              }

              labels.push({
                id: inv.id,
                type: "product",
                name: item.name,
                ingredients: (item as any).ingredientsText || undefined,
                allergens: item.allergens.length > 0 ? item.allergens : undefined,
                productionDate: item.production_date || format(new Date(), "yyyy-MM-dd"),
                expiryDate: item.expiry_date || format(addDays(new Date(), 3), "yyyy-MM-dd"),
                storageType: item.storage_hint,
                lotNumber: item.lot_number || undefined,
                chefLifeHours: item.chef_life_hours || undefined,
              });
            }
          }
        }
      }

      setSavedLabels(labels);
      setStep("label");
      toast({ title: `${labels.length} elemento/i salvato/i ✓` });
      onComplete();
    } catch (err: any) {
      toast({ variant: "destructive", title: "Errore salvataggio", description: err?.message });
    } finally {
      setSaving(false);
    }
  };

  const currentItem = editItems[editIndex];

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[92vh] rounded-t-[20px] px-0 overflow-y-auto">
        <SheetHeader className="px-4 pb-2">
          <div className="flex items-center gap-2">
            {step !== "photo" && step !== "label" && (
              <button onClick={() => {
                if (step === "results") setStep("photo");
                else if (step === "edit" && editIndex > 0) {
                  setEditItems((prev) => {
                    const copy = [...prev];
                    copy[editIndex] = { ...copy[editIndex], allergens: selectedAllergens };
                    return copy;
                  });
                  setEditIndex(editIndex - 1);
                  setSelectedAllergens(editItems[editIndex - 1]?.allergens || []);
                } else if (step === "edit") setStep("results");
              }}>
                <ArrowLeft className="h-5 w-5 text-muted-foreground" />
              </button>
            )}
            <SheetTitle className="text-left flex-1">
              {step === "photo" && "Scatta foto"}
              {step === "results" && "Prodotti trovati"}
              {step === "edit" && `${editIndex + 1}/${editItems.length} — Dettagli`}
              {step === "label" && "Etichette"}
            </SheetTitle>
          </div>
        </SheetHeader>

        <div className="px-4 space-y-4 pb-8">
          {/* ═══ STEP 1: PHOTO ═══ */}
          {step === "photo" && (
            <>
              <p className="text-sm text-muted-foreground">
                Scatta foto del prodotto, DDT o elenco prodotti (max 5 foto)
              </p>

              <input
                ref={photoInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                multiple
                className="hidden"
                onChange={handleAddPhoto}
              />

              <div className="grid grid-cols-3 gap-2">
                {photos.map((p, i) => (
                  <div key={i} className="relative aspect-square rounded-xl overflow-hidden bg-secondary">
                    <img src={p.preview} alt="" className="h-full w-full object-cover" />
                    <button
                      onClick={() => setPhotos((prev) => prev.filter((_, j) => j !== i))}
                      className="absolute top-1 right-1 bg-black/60 rounded-full p-0.5"
                    >
                      <X className="h-3.5 w-3.5 text-white" />
                    </button>
                  </div>
                ))}
                {photos.length < 5 && (
                  <button
                    onClick={() => photoInputRef.current?.click()}
                    className="aspect-square rounded-xl border-2 border-dashed border-border flex flex-col items-center justify-center gap-1 text-muted-foreground active:bg-secondary transition-colors"
                  >
                    <ImagePlus className="h-6 w-6" />
                    <span className="text-[10px]">Aggiungi</span>
                  </button>
                )}
              </div>

              <Button
                className="w-full"
                disabled={photos.length === 0 || analyzing}
                onClick={handleAnalyze}
              >
                {analyzing ? (
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Analisi in corso...</>
                ) : (
                  <><Camera className="h-4 w-4 mr-2" /> Analizza foto</>
                )}
              </Button>
            </>
          )}

          {/* ═══ STEP 2: RESULTS ═══ */}
          {step === "results" && aiResult && (
            <>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-xs">
                  {aiResult.doc_type === "ddt" ? "DDT / Bolla" :
                   aiResult.doc_type === "product_list" ? "Lista prodotti" : "Prodotto singolo"}
                </Badge>
                {aiResult.supplier?.name && (
                  <Badge variant="secondary" className="text-xs">
                    Fornitore: {aiResult.supplier.name}
                  </Badge>
                )}
              </div>

              <div className="space-y-2">
                {aiResult.items.map((item, i) => (
                  <label
                    key={i}
                    className="flex items-center gap-3 rounded-xl bg-card shadow-card p-3 cursor-pointer active:scale-[0.98] transition-transform"
                  >
                    <Checkbox
                      checked={selectedItems[i]}
                      onCheckedChange={(checked) => {
                        setSelectedItems((prev) => {
                          const copy = [...prev];
                          copy[i] = !!checked;
                          return copy;
                        });
                      }}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{item.name}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        {item.brand && <span className="text-[10px] text-muted-foreground">{item.brand}</span>}
                        {item.quantity && <span className="text-[10px] text-muted-foreground">{item.quantity} {item.unit}</span>}
                        <span className="text-[10px] text-muted-foreground">{item.storage_hint}</span>
                      </div>
                      {item.allergens.length > 0 && (
                        <div className="flex gap-1 mt-1">
                          {item.allergens.slice(0, 3).map((a) => (
                            <Badge key={a} variant="destructive" className="text-[8px] py-0">{a}</Badge>
                          ))}
                          {item.allergens.length > 3 && (
                            <span className="text-[8px] text-muted-foreground">+{item.allergens.length - 3}</span>
                          )}
                        </div>
                      )}
                    </div>
                  </label>
                ))}
              </div>

              <Button className="w-full" onClick={handleConfirmSelection}>
                <Check className="h-4 w-4 mr-2" />
                Conferma selezione ({selectedItems.filter(Boolean).length})
              </Button>
            </>
          )}

          {/* ═══ STEP 3: EDIT ═══ */}
          {step === "edit" && currentItem && (
            <>
              {/* Name */}
              <div>
                <label className="text-xs font-medium text-muted-foreground">Nome</label>
                <Input
                  value={currentItem.name}
                  onChange={(e) => updateEditItem("name", e.target.value)}
                  className="mt-1"
                />
              </div>

              {/* Type toggle */}
              <div className="flex items-center justify-between rounded-xl bg-card shadow-card p-3">
                <div className="flex items-center gap-2">
                  {currentItem.itemType === "preparation" ? (
                    <ChefHat className="h-4 w-4 text-accent" />
                  ) : (
                    <Package className="h-4 w-4 text-primary" />
                  )}
                  <span className="text-sm font-medium">
                    {currentItem.itemType === "preparation" ? "Preparato" : "Prodotto"}
                  </span>
                </div>
                <Switch
                  checked={currentItem.itemType === "preparation"}
                  onCheckedChange={(checked) =>
                    updateEditItem("itemType", checked ? "preparation" : "product")
                  }
                />
              </div>

              {/* Storage */}
              <div>
                <label className="text-xs font-medium text-muted-foreground">Conservazione</label>
                <div className="grid grid-cols-3 gap-2 mt-1">
                  {storageOptions.map(({ key, label, icon: Icon }) => (
                    <button
                      key={key}
                      onClick={() => updateEditItem("storage_hint", key)}
                      className={`flex flex-col items-center gap-1 rounded-xl py-3 text-xs font-medium transition-all ${
                        currentItem.storage_hint === key
                          ? "bg-primary text-primary-foreground shadow-md"
                          : "bg-secondary text-muted-foreground"
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Dates */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Scadenza</label>
                  <Input
                    type="date"
                    value={currentItem.expiry_date || ""}
                    onChange={(e) => updateEditItem("expiry_date", e.target.value)}
                    className="mt-1"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Produzione</label>
                  <Input
                    type="date"
                    value={currentItem.production_date || ""}
                    onChange={(e) => updateEditItem("production_date", e.target.value)}
                    className="mt-1"
                  />
                </div>
              </div>

              {/* Chef Life */}
              <div>
                <label className="text-xs font-medium text-muted-foreground">Chef Life (ore)</label>
                <div className="flex gap-2 mt-1">
                  {chefLifePresets.map((h) => (
                    <button
                      key={h}
                      onClick={() => updateEditItem("chef_life_hours", h)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                        currentItem.chef_life_hours === h
                          ? "bg-primary text-primary-foreground"
                          : "bg-secondary text-muted-foreground"
                      }`}
                    >
                      {h}h
                    </button>
                  ))}
                  <Input
                    type="number"
                    placeholder="Altro"
                    value={currentItem.chef_life_hours && !chefLifePresets.includes(currentItem.chef_life_hours) ? currentItem.chef_life_hours : ""}
                    onChange={(e) => updateEditItem("chef_life_hours", e.target.value ? parseInt(e.target.value) : null)}
                    className="w-20"
                  />
                </div>
              </div>

              {/* Lot + Quantity */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Lotto</label>
                  <Input
                    value={currentItem.lot_number || ""}
                    onChange={(e) => updateEditItem("lot_number", e.target.value)}
                    placeholder="N° lotto"
                    className="mt-1"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Quantità</label>
                  <div className="flex gap-1 mt-1">
                    <Input
                      type="number"
                      value={currentItem.quantity || ""}
                      onChange={(e) => updateEditItem("quantity", e.target.value ? parseFloat(e.target.value) : null)}
                      className="flex-1"
                    />
                    <Input
                      value={currentItem.unit || "pz"}
                      onChange={(e) => updateEditItem("unit", e.target.value)}
                      className="w-16"
                    />
                  </div>
                </div>
              </div>

              {/* Allergens */}
              <div>
                <label className="text-xs font-medium text-muted-foreground">Allergeni</label>
                <div className="flex flex-wrap gap-1.5 mt-1">
                  {allergensList.map((a) => {
                    const isSelected = selectedAllergens.some(
                      (sa) => sa.toLowerCase().includes(a.name.toLowerCase()) || a.name.toLowerCase().includes(sa.toLowerCase())
                    ) || selectedAllergens.includes(a.code);
                    return (
                      <button
                        key={a.id}
                        onClick={() => {
                          if (isSelected) {
                            setSelectedAllergens((prev) => prev.filter(
                              (sa) => !sa.toLowerCase().includes(a.name.toLowerCase()) && !a.name.toLowerCase().includes(sa.toLowerCase()) && sa !== a.code
                            ));
                          } else {
                            setSelectedAllergens((prev) => [...prev, a.name]);
                          }
                        }}
                        className={`px-2 py-1 rounded-lg text-[10px] font-medium transition-all ${
                          isSelected
                            ? "bg-destructive text-destructive-foreground"
                            : "bg-secondary text-muted-foreground"
                        }`}
                      >
                        {a.name}
                      </button>
                    );
                  })}
                </div>
              </div>

              <Button
                className="w-full"
                disabled={saving}
                onClick={handleNextItem}
              >
                {saving ? (
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Salvataggio...</>
                ) : editIndex < editItems.length - 1 ? (
                  <>Prossimo →</>
                ) : (
                  <><Tag className="h-4 w-4 mr-2" /> Salva e genera etichette</>
                )}
              </Button>
            </>
          )}

          {/* ═══ STEP 4: LABELS ═══ */}
          {step === "label" && (
            <>
              <p className="text-sm text-muted-foreground">
                {savedLabels.length} etichetta/e pronte. Puoi stamparle singolarmente.
              </p>
              <div className="space-y-4">
                {savedLabels.map((label, i) => (
                  <div key={i} className="rounded-xl bg-card shadow-card p-3">
                    <p className="text-sm font-semibold mb-2">{label.name}</p>
                    <RestaurantLabel label={label} />
                  </div>
                ))}
              </div>
              <Button className="w-full" onClick={() => onOpenChange(false)}>
                <Check className="h-4 w-4 mr-2" /> Chiudi
              </Button>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default RestaurantAddFlow;
