import { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import MobileHeader from "@/components/MobileHeader";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  ArrowLeft, Package, Flame, Loader2, ImagePlus, Trash2,
  ChevronLeft, ChevronRight, ChevronDown, ChevronUp,
  Home, Refrigerator, Snowflake, Pencil, Check, X,
  UtensilsCrossed, Camera, FileText, Image as ImageIcon,
} from "lucide-react";
import { getFoodEmoji } from "@/lib/food-images";

const storageOptions = [
  { value: "ambiente", label: "Dispensa", icon: Home },
  { value: "frigo", label: "Frigo", icon: Refrigerator },
  { value: "freezer", label: "Congelatore", icon: Snowflake },
];

const photoTypeOptions = [
  { value: "product", label: "Prodotto", icon: Package },
  { value: "nutrition_label", label: "Etichetta nutrizionale", icon: FileText },
  { value: "ingredients", label: "Ingredienti", icon: UtensilsCrossed },
  { value: "other", label: "Altra", icon: ImageIcon },
];

const categories = [
  "pasta", "riso", "pane", "carne", "pesce", "latticini", "frutta",
  "verdura", "legumi", "uova", "olio", "condimenti", "dolci",
  "bevande", "surgelati", "snack", "cereali", "salumi", "altro",
];

const UserItemDetailPage = () => {
  const { itemId } = useParams<{ itemId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);
  const [item, setItem] = useState<any>(null);
  const [product, setProduct] = useState<any>(null);

  // Editable fields
  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [unit, setUnit] = useState("pezzi");
  const [storageType, setStorageType] = useState("frigo");
  const [expiryDate, setExpiryDate] = useState("");
  const [notes, setNotes] = useState("");

  // Macros
  const [macrosOpen, setMacrosOpen] = useState(false);
  const [calories, setCalories] = useState("");
  const [protein, setProtein] = useState("");
  const [carbs, setCarbs] = useState("");
  const [fats, setFats] = useState("");

  // Photos
  const [photos, setPhotos] = useState<{ id: string; photo_url: string; photo_type: string }[]>([]);
  const [photoIdx, setPhotoIdx] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [uploadPhotoType, setUploadPhotoType] = useState("product");
  const photoInputRef = useRef<HTMLInputElement>(null);

  // Confirm delete
  const [confirmDelete, setConfirmDelete] = useState(false);

  const fetchItem = async () => {
    if (!itemId || !user) return;
    setLoading(true);

    const { data } = await supabase
      .from("inventory_items")
      .select("*, product:products(*)")
      .eq("id", itemId)
      .eq("owner_user_id", user.id)
      .maybeSingle();

    if (!data) {
      setLoading(false);
      return;
    }

    setItem(data);
    const p = data.product;
    setProduct(p);
    setName(p?.name || "");
    setCategory(p?.category || "");
    setQuantity(String(data.quantity ?? 1));
    setUnit(data.unit || "pezzi");
    setStorageType(data.storage_type || "frigo");
    setExpiryDate(data.expiry_date || "");
    setNotes(data.notes || "");

    // Macros from product
    const cal = p?.calories_100g;
    const m = p?.macros_100g as any;
    setCalories(cal != null ? String(cal) : "");
    setProtein(m?.protein != null ? String(m.protein) : "");
    setCarbs(m?.carbs != null ? String(m.carbs) : "");
    setFats(m?.fats != null ? String(m.fats) : "");

    // Auto-open macros section if data exists
    if (cal != null || m?.protein != null || m?.carbs != null || m?.fats != null) {
      setMacrosOpen(true);
    }

    // Photos
    const { data: photoData } = await supabase
      .from("inventory_item_photos")
      .select("id, photo_url, photo_type")
      .eq("item_id", itemId)
      .eq("item_type", "inventory")
      .order("uploaded_at", { ascending: true });
    if (photoData) setPhotos(photoData as any);

    setLoading(false);
  };

  useEffect(() => { fetchItem(); }, [itemId, user]);

  const handleSave = async () => {
    if (!item || !user) return;
    setSaving(true);

    const cal100 = parseFloat(calories) || null;
    const macros100 = (protein || carbs || fats)
      ? { protein: parseFloat(protein) || 0, carbs: parseFloat(carbs) || 0, fats: parseFloat(fats) || 0 }
      : null;

    // Update product
    const productUpdate: any = {
      name: name.trim() || product.name,
      category: category || null,
      calories_100g: cal100,
      macros_100g: macros100,
    };
    await supabase.from("products").update(productUpdate).eq("id", product.id);

    // Compute nutrition totals for inventory item
    const qty = parseFloat(quantity) || 1;
    let calTotal: number | null = null;
    let macrosTotal: any = null;
    if (cal100 != null) {
      const servingG = product.serving_size_g;
      let grams: number;
      if (unit === "g" || unit === "ml") grams = qty;
      else if (unit === "kg" || unit === "l") grams = qty * 1000;
      else grams = servingG ? qty * servingG : 0;

      if (grams > 0) {
        const factor = grams / 100;
        calTotal = Math.round(factor * cal100);
        if (macros100) {
          macrosTotal = {
            protein: Math.round(factor * macros100.protein * 10) / 10,
            carbs: Math.round(factor * macros100.carbs * 10) / 10,
            fats: Math.round(factor * macros100.fats * 10) / 10,
          };
        }
      }
    }

    // Determine data_completeness
    const hasEnrichedData = cal100 != null || macros100 != null || photos.length > 0 || (notes && notes.trim());
    const completeness = hasEnrichedData ? "enriched" : "basic";

    const { error } = await supabase
      .from("inventory_items")
      .update({
        quantity: qty,
        unit,
        storage_type: storageType,
        expiry_date: expiryDate || null,
        notes: notes || null,
        calories_total: calTotal,
        macros_total: macrosTotal,
        data_completeness: completeness,
      })
      .eq("id", item.id);

    setSaving(false);

    if (error) {
      toast({ variant: "destructive", title: "Errore", description: error.message });
    } else {
      toast({ title: "Prodotto aggiornato ✓" });
      setEditing(false);
      fetchItem();
    }
  };

  const handleDelete = async () => {
    if (!item) return;
    const { error } = await supabase.from("inventory_items").delete().eq("id", item.id);
    if (error) {
      toast({ variant: "destructive", title: "Errore", description: error.message });
    } else {
      toast({ title: "Prodotto eliminato" });
      navigate(-1);
    }
  };

  const handleMarkConsumed = async () => {
    if (!item) return;
    const { error } = await supabase.from("inventory_items").delete().eq("id", item.id);
    if (error) {
      toast({ variant: "destructive", title: "Errore", description: error.message });
    } else {
      toast({ title: "✅ Segnato come consumato" });
      navigate(-1);
    }
  };

  const handleUploadPhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user || !item) return;
    setUploading(true);
    try {
      const ext = file.name.split(".").pop() ?? "jpg";
      const filePath = `users/${user.id}/${item.id}/${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("item-photos").upload(filePath, file, { cacheControl: "3600" });
      if (upErr) throw upErr;
      const { data: urlData } = supabase.storage.from("item-photos").getPublicUrl(filePath);
      const { data: row, error: dbErr } = await supabase
        .from("inventory_item_photos")
        .insert({
          item_id: item.id,
          item_type: "inventory",
          photo_url: urlData.publicUrl,
          uploaded_by: user.id,
          photo_type: uploadPhotoType,
        })
        .select("id, photo_url, photo_type")
        .single();
      if (dbErr) throw dbErr;
      if (row) {
        setPhotos((p) => [...p, row as any]);
        setPhotoIdx(photos.length);
      }
      toast({ title: "Foto aggiunta ✓" });
    } catch (err: any) {
      toast({ variant: "destructive", title: "Errore upload", description: err?.message });
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const handleDeletePhoto = async (photoId: string) => {
    await supabase.from("inventory_item_photos").delete().eq("id", photoId);
    setPhotos((p) => p.filter((ph) => ph.id !== photoId));
    setPhotoIdx((i) => Math.max(0, Math.min(i, photos.length - 2)));
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <MobileHeader title="Dettaglio prodotto" />
        <div className="p-4 space-y-3">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-40 w-full rounded-xl" />
          <Skeleton className="h-32 w-full rounded-xl" />
        </div>
      </div>
    );
  }

  if (!item || !product) {
    return (
      <div className="min-h-screen bg-background">
        <MobileHeader title="Non trovato" />
        <div className="p-4 text-center">
          <p className="text-muted-foreground">Prodotto non trovato</p>
          <Button variant="outline" className="mt-4" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4 mr-1" /> Indietro
          </Button>
        </div>
      </div>
    );
  }

  const StorageIcon = storageOptions.find((s) => s.value === storageType)?.icon || Package;
  const storageLabel = storageOptions.find((s) => s.value === storageType)?.label || storageType;
  const fmtDate = (d?: string) => d ? new Date(d).toLocaleDateString("it-IT") : "—";

  return (
    <div className="min-h-screen bg-background">
      <MobileHeader
        title="Dettaglio prodotto"
        right={
          !editing ? (
            <button onClick={() => setEditing(true)} className="p-1 text-primary-foreground">
              <Pencil size={20} />
            </button>
          ) : (
            <div className="flex gap-1">
              <button onClick={() => { setEditing(false); fetchItem(); }} className="p-1 text-primary-foreground">
                <X size={20} />
              </button>
              <button onClick={handleSave} disabled={saving} className="p-1 text-primary-foreground">
                {saving ? <Loader2 size={20} className="animate-spin" /> : <Check size={20} />}
              </button>
            </div>
          )
        }
      />

      <main className="p-4 space-y-4 pb-28">
        {/* Header */}
        <div className="flex items-start gap-3">
          <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-secondary overflow-hidden">
            {product.image_url ? (
              <img src={product.image_url} alt={name} className="h-full w-full object-cover" />
            ) : (
              <span className="text-3xl">{getFoodEmoji(category, name)}</span>
            )}
          </div>
          <div className="flex-1">
            {editing ? (
              <Input value={name} onChange={(e) => setName(e.target.value)} className="text-lg font-bold" placeholder="Nome prodotto" />
            ) : (
              <h1 className="text-lg font-bold text-foreground">{name}</h1>
            )}
            <div className="flex items-center gap-1.5 mt-1 flex-wrap">
              {product.data_source === "manual" && (
                <Badge variant="outline" className="text-[9px] px-1.5 py-0 border-amber-400 text-amber-600">✏️ Manuale</Badge>
              )}
              {product.data_source === "receipt" && (
                <Badge variant="outline" className="text-[9px] px-1.5 py-0 border-blue-400 text-blue-600">🧾 Scontrino</Badge>
              )}
              <Badge variant="outline" className="text-[9px] px-1.5 py-0">
                {(item as any).data_completeness === "enriched" ? "✅ Arricchito" : "📋 Base"}
              </Badge>
            </div>
          </div>
        </div>

        {/* Main info card */}
        <div className="rounded-xl bg-card shadow-card p-4 space-y-3">
          {/* Category */}
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Categoria</Label>
            {editing ? (
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger><SelectValue placeholder="Seleziona categoria" /></SelectTrigger>
                <SelectContent>
                  {categories.map((c) => (
                    <SelectItem key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <p className="text-sm font-medium">{category ? category.charAt(0).toUpperCase() + category.slice(1) : "—"}</p>
            )}
          </div>

          {/* Quantity + Unit */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Quantità</Label>
              {editing ? (
                <Input type="number" value={quantity} onChange={(e) => setQuantity(e.target.value)} min="0" step="0.1" />
              ) : (
                <p className="text-sm font-medium">{quantity} {unit}</p>
              )}
            </div>
            {editing && (
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Unità</Label>
                <Select value={unit} onValueChange={setUnit}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["pezzi", "kg", "g", "l", "ml", "porzioni"].map((u) => (
                      <SelectItem key={u} value={u}>{u}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          {/* Storage */}
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Posizione</Label>
            {editing ? (
              <Select value={storageType} onValueChange={setStorageType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {storageOptions.map((s) => (
                    <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <div className="flex items-center gap-2">
                <StorageIcon className="h-4 w-4 text-muted-foreground" />
                <p className="text-sm font-medium">{storageLabel}</p>
              </div>
            )}
          </div>

          {/* Expiry */}
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Scadenza</Label>
            {editing ? (
              <Input type="date" value={expiryDate} onChange={(e) => setExpiryDate(e.target.value)} />
            ) : (
              <p className="text-sm font-medium">{fmtDate(expiryDate)}</p>
            )}
          </div>
        </div>

        {/* Macros section (collapsible) */}
        <Collapsible open={macrosOpen} onOpenChange={setMacrosOpen}>
          <div className="rounded-xl bg-card shadow-card overflow-hidden">
            <CollapsibleTrigger className="flex w-full items-center justify-between p-4">
              <div className="flex items-center gap-2">
                <Flame className="h-4 w-4 text-primary" />
                <span className="text-sm font-semibold">Valori nutrizionali (per 100g)</span>
              </div>
              {macrosOpen ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="px-4 pb-4 space-y-3">
                {!editing && !calories && !protein && !carbs && !fats ? (
                  <p className="text-sm text-muted-foreground">Nessun dato nutrizionale. Modifica per aggiungere.</p>
                ) : (
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Calorie (kcal)</Label>
                      {editing ? (
                        <Input type="number" value={calories} onChange={(e) => setCalories(e.target.value)} placeholder="0" min="0" />
                      ) : (
                        <p className="text-sm font-medium">{calories || "—"}</p>
                      )}
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Proteine (g)</Label>
                      {editing ? (
                        <Input type="number" value={protein} onChange={(e) => setProtein(e.target.value)} placeholder="0" min="0" step="0.1" />
                      ) : (
                        <p className="text-sm font-medium">{protein || "—"}</p>
                      )}
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Carboidrati (g)</Label>
                      {editing ? (
                        <Input type="number" value={carbs} onChange={(e) => setCarbs(e.target.value)} placeholder="0" min="0" step="0.1" />
                      ) : (
                        <p className="text-sm font-medium">{carbs || "—"}</p>
                      )}
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Grassi (g)</Label>
                      {editing ? (
                        <Input type="number" value={fats} onChange={(e) => setFats(e.target.value)} placeholder="0" min="0" step="0.1" />
                      ) : (
                        <p className="text-sm font-medium">{fats || "—"}</p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </CollapsibleContent>
          </div>
        </Collapsible>

        {/* Photo gallery */}
        <div className="rounded-xl bg-card shadow-card p-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold">Foto ({photos.length})</h3>
            <div className="flex items-center gap-2">
              <Select value={uploadPhotoType} onValueChange={setUploadPhotoType}>
                <SelectTrigger className="h-7 text-[11px] w-auto min-w-[120px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {photoTypeOptions.map((pt) => (
                    <SelectItem key={pt.value} value={pt.value} className="text-xs">{pt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                size="sm"
                variant="ghost"
                className="gap-1 text-xs"
                disabled={uploading}
                onClick={() => photoInputRef.current?.click()}
              >
                {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Camera className="h-3.5 w-3.5" />}
                Aggiungi
              </Button>
            </div>
            <input ref={photoInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleUploadPhoto} />
          </div>

          {photos.length > 0 ? (
            <div className="relative">
              <img
                src={photos[photoIdx]?.photo_url}
                alt={`Foto ${photoIdx + 1}`}
                className="w-full h-48 object-cover rounded-lg"
              />
              <Badge className="absolute top-2 left-2 text-[9px] bg-black/60 text-white border-0">
                {photoTypeOptions.find((pt) => pt.value === photos[photoIdx]?.photo_type)?.label || "Prodotto"}
              </Badge>
              {photos.length > 1 && (
                <>
                  <button onClick={() => setPhotoIdx((i) => (i - 1 + photos.length) % photos.length)} className="absolute left-1 top-1/2 -translate-y-1/2 bg-black/50 rounded-full p-1">
                    <ChevronLeft className="h-4 w-4 text-white" />
                  </button>
                  <button onClick={() => setPhotoIdx((i) => (i + 1) % photos.length)} className="absolute right-1 top-1/2 -translate-y-1/2 bg-black/50 rounded-full p-1">
                    <ChevronRight className="h-4 w-4 text-white" />
                  </button>
                </>
              )}
              <button onClick={() => handleDeletePhoto(photos[photoIdx].id)} className="absolute bottom-2 right-2 bg-black/50 rounded-full p-1.5">
                <Trash2 className="h-3 w-3 text-white" />
              </button>
              {photos.length > 1 && (
                <div className="flex justify-center gap-1 mt-2">
                  {photos.map((_, i) => (
                    <div key={i} className={`h-1.5 w-1.5 rounded-full ${i === photoIdx ? "bg-primary" : "bg-muted"}`} />
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="h-24 flex flex-col items-center justify-center text-muted-foreground text-sm gap-2 border-2 border-dashed border-border rounded-lg">
              <ImagePlus className="h-6 w-6" />
              <span>Aggiungi foto del prodotto</span>
            </div>
          )}
        </div>

        {/* Notes */}
        <div className="rounded-xl bg-card shadow-card p-4 space-y-2">
          <Label className="text-sm font-semibold">Note</Label>
          {editing ? (
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Aggiungi note..." rows={3} />
          ) : (
            <p className="text-sm text-muted-foreground">{notes || "Nessuna nota"}</p>
          )}
        </div>

        {/* Quick actions */}
        <div className="grid grid-cols-2 gap-2">
          <Button variant="outline" className="gap-2" onClick={handleMarkConsumed}>
            <Check className="h-4 w-4" /> Consumato
          </Button>
          {!editing && (
            <Button variant="outline" className="gap-2" onClick={() => setEditing(true)}>
              <Pencil className="h-4 w-4" /> Modifica
            </Button>
          )}
          {editing && (
            <Button onClick={handleSave} disabled={saving} className="gap-2">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
              Salva
            </Button>
          )}
        </div>

        {/* Quick storage move buttons (non-edit mode) */}
        {!editing && (
          <div className="flex gap-2">
            {storageOptions
              .filter((s) => s.value !== storageType)
              .map((s) => {
                const Icon = s.icon;
                return (
                  <Button
                    key={s.value}
                    variant="outline"
                    size="sm"
                    className="flex-1 gap-1 text-xs"
                    onClick={async () => {
                      await supabase.from("inventory_items").update({ storage_type: s.value }).eq("id", item.id);
                      setStorageType(s.value);
                      toast({ title: `Spostato in ${s.label}` });
                    }}
                  >
                    <Icon className="h-3.5 w-3.5" /> {s.label}
                  </Button>
                );
              })}
          </div>
        )}

        {/* Delete */}
        <div className="pt-2">
          {!confirmDelete ? (
            <Button variant="outline" className="w-full text-destructive border-destructive/30 gap-2" onClick={() => setConfirmDelete(true)}>
              <Trash2 className="h-4 w-4" /> Elimina prodotto
            </Button>
          ) : (
            <Button variant="destructive" className="w-full gap-2" onClick={handleDelete}>
              <Trash2 className="h-4 w-4" /> Conferma eliminazione
            </Button>
          )}
        </div>
      </main>
    </div>
  );
};

export default UserItemDetailPage;
