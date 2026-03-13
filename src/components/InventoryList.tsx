import { useState, useEffect, useMemo, useCallback, memo } from "react";
import { useDebounce } from "@/hooks/useDebounce";
import { useAuth } from "@/hooks/useAuth";
import { useRestaurant } from "@/hooks/useRestaurant";
import { supabase } from "@/integrations/supabase/client";
import MobileHeader from "@/components/MobileHeader";
import ImageUpload from "@/components/ImageUpload";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Plus, Search, Package, Loader2, Flame, ScanLine, Trash2, AlertCircle, Clock, Home, Refrigerator, Snowflake } from "lucide-react";
import { getFoodEmoji } from "@/lib/food-images";
import { findSimilarProducts, type SimilarProduct } from "@/lib/product-dedup";
import DuplicateProductDialog from "@/components/DuplicateProductDialog";
import EmptyState from "@/components/EmptyState";
import ListSkeleton from "@/components/ListSkeleton";

interface InventoryItemWithProduct {
  id: string;
  quantity: number;
  unit: string | null;
  storage_type: string;
  expiry_date: string | null;
  notes: string | null;
  calories_total: number | null;
  macros_total: { protein: number; carbs: number; fats: number } | null;
  product: {
    id: string;
    name: string;
    brand: string | null;
    image_url: string | null;
    category: string | null;
    calories_100g: number | null;
    serving_size_g: number | null;
    macros_100g: { protein: number; carbs: number; fats: number } | null;
    data_source: string;
  };
}

type ExpiryStatus = "expired" | "expiring" | "ok" | "nodate";

const getExpiryStatus = (expiryDate: string | null): ExpiryStatus => {
  if (!expiryDate) return "nodate";
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const expiry = new Date(expiryDate);
  const diffDays = (expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24);
  if (diffDays < 0) return "expired";
  if (diffDays <= 3) return "expiring";
  return "ok";
};

const statusConfig: Record<ExpiryStatus, { label: string; className: string }> = {
  expired: { label: "SCADUTO", className: "bg-destructive text-destructive-foreground" },
  expiring: { label: "IN SCADENZA", className: "bg-accent text-accent-foreground" },
  ok: { label: "OK", className: "bg-success text-success-foreground" },
  nodate: { label: "SENZA DATA", className: "bg-muted text-muted-foreground" },
};

// ─── Calorie calculation helper ───────────────────────
function calcNutrition(
  qty: number,
  unit: string,
  cal100g: number | null,
  macros100g: { protein: number; carbs: number; fats: number } | null,
  servingSizeG: number | null
): { calories: number | null; macros: { protein: number; carbs: number; fats: number } | null } {
  if (cal100g == null) return { calories: null, macros: null };

  let grams: number;
  if (unit === "g" || unit === "ml") {
    grams = qty;
  } else if (unit === "kg" || unit === "l") {
    grams = qty * 1000;
  } else {
    // pezzi / porzioni → use serving_size_g
    if (!servingSizeG) return { calories: null, macros: null };
    grams = qty * servingSizeG;
  }

  const factor = grams / 100;
  const calories = Math.round(factor * cal100g);
  const macros = macros100g
    ? {
        protein: Math.round(factor * macros100g.protein * 10) / 10,
        carbs: Math.round(factor * macros100g.carbs * 10) / 10,
        fats: Math.round(factor * macros100g.fats * 10) / 10,
      }
    : null;

  return { calories, macros };
}

interface InventoryListProps {
  mode: "user" | "restaurant";
  storageFilter?: string;
}

const InventoryList = ({ mode, storageFilter: externalStorageFilter }: InventoryListProps) => {
  const { user } = useAuth();
  const { restaurant } = useRestaurant();
  const { toast } = useToast();

  const [items, setItems] = useState<InventoryItemWithProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [storageFilter, setStorageFilter] = useState<string>(externalStorageFilter ?? "all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  // showFilters removed — filters are always visible as inline chips
  const [addOpen, setAddOpen] = useState(false);

  // Edit dialog state
  const [editingItem, setEditingItem] = useState<InventoryItemWithProduct | null>(null);
  const [editQty, setEditQty] = useState("");
  const [editUnit, setEditUnit] = useState("pezzi");
  const [editStorage, setEditStorage] = useState("frigo");
  const [editExpiry, setEditExpiry] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  // Add form state
  const [newName, setNewName] = useState("");
  const [newCategory, setNewCategory] = useState("");
  const [newQuantity, setNewQuantity] = useState("1");
  const [newUnit, setNewUnit] = useState("pezzi");
  const [newStorage, setNewStorage] = useState("frigo");
  const [newExpiry, setNewExpiry] = useState("");
  const [newNotes, setNewNotes] = useState("");
  const [newImageUrl, setNewImageUrl] = useState<string | null>(null);
  const [newImagePath, setNewImagePath] = useState<string | null>(null);
  const [newCalories, setNewCalories] = useState("");
  const [adding, setAdding] = useState(false);

  // Dedup state
  const [dedupOpen, setDedupOpen] = useState(false);
  const [dedupResults, setDedupResults] = useState<SimilarProduct[]>([]);
  const [skipDedup, setSkipDedup] = useState(false);
  const [dedupSelectedProduct, setDedupSelectedProduct] = useState<SimilarProduct | null>(null);

  useEffect(() => {
    if (externalStorageFilter) setStorageFilter(externalStorageFilter);
  }, [externalStorageFilter]);

  const fetchItems = async () => {
    if (!user) return;
    setLoading(true);

    let query = supabase
      .from("inventory_items")
      .select("id, quantity, unit, storage_type, expiry_date, notes, calories_total, macros_total, product:products(id, name, brand, image_url, category, calories_100g, serving_size_g, macros_100g, data_source, nutrition_available)")
      .order("expiry_date", { ascending: true, nullsFirst: false });

    if (mode === "user") {
      query = query.eq("owner_user_id", user.id);
    } else if (restaurant) {
      query = query.eq("restaurant_id", restaurant.id);
    }

    const { data, error } = await query;
    if (!error && data) {
      setItems(data as unknown as InventoryItemWithProduct[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchItems();
  }, [user, restaurant]);

  const getUploadPath = () => {
    if (mode === "user" && user) return `users/${user.id}/products`;
    if (mode === "restaurant" && restaurant) return `restaurants/${restaurant.id}/products`;
    return "";
  };

  const handleImageUploaded = (publicUrl: string, filePath: string) => {
    setNewImageUrl(publicUrl);
    setNewImagePath(filePath);
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setAdding(true);

    // Dedup check before creating product
    if (!skipDedup && !dedupSelectedProduct && newName.trim().length >= 3) {
      const similar = await findSimilarProducts(newName.trim(), { threshold: 0.5, limit: 5 });
      if (similar.length > 0) {
        setDedupResults(similar);
        setDedupOpen(true);
        setAdding(false);
        return;
      }
    }

    let productId: string;

    if (dedupSelectedProduct) {
      // Use existing product selected from dedup dialog
      productId = dedupSelectedProduct.id;
    } else {
      // Create new product
      const { data: product, error: productError } = await supabase
        .from("products")
        .insert({
          name: newName,
          category: newCategory || null,
          unit: newUnit,
          image_url: newImageUrl,
          data_source: "manual",
        } as any)
        .select()
        .single();

      if (productError || !product) {
        toast({ variant: "destructive", title: "Errore", description: productError?.message ?? "Errore creazione prodotto" });
        setAdding(false);
        return;
      }
      productId = product.id;

      if (newImagePath && newImageUrl) {
        const attachData: any = {
          entity_type: "product",
          entity_id: product.id,
          file_path: newImagePath,
          public_url: newImageUrl,
        };
        if (mode === "user") attachData.owner_user_id = user.id;
        else if (restaurant) attachData.restaurant_id = restaurant.id;

        await supabase.from("attachments").insert(attachData);
      }
    }

    const insertData: any = {
      product_id: productId,
      quantity: parseFloat(newQuantity) || 1,
      unit: newUnit,
      storage_type: newStorage,
      expiry_date: newExpiry || null,
      notes: newNotes || null,
    };

    if (mode === "user") {
      insertData.owner_user_id = user.id;
    } else if (restaurant) {
      insertData.restaurant_id = restaurant.id;
    }

    const { error } = await supabase.from("inventory_items").insert(insertData);
    setAdding(false);

    if (error) {
      toast({ variant: "destructive", title: "Errore", description: error.message });
    } else {
      toast({ title: "Prodotto aggiunto" });
      // Show informative toast if product was saved without nutrition data
      setTimeout(() => {
        toast({
          title: "ℹ️ Prodotto senza dati nutrizionali",
          description: "Questo prodotto verrà usato per scadenze e anti-spreco. Non sarà incluso nei calcoli nutrizionali finché non avrà valori nutrizionali compilati.",
        });
      }, 500);
      setAddOpen(false);
      resetForm();
      fetchItems();
    }
  };

  const resetForm = () => {
    setNewName("");
    setNewCategory("");
    setNewQuantity("1");
    setNewUnit("pezzi");
    setNewStorage("frigo");
    setNewExpiry("");
    setNewNotes("");
    setNewImageUrl(null);
    setNewImagePath(null);
  };

  // ═══ Edit item handlers ═══
  const openEditDialog = (item: InventoryItemWithProduct) => {
    setEditingItem(item);
    setEditQty(String(item.quantity ?? 1));
    setEditUnit(item.unit ?? "pezzi");
    setEditStorage(item.storage_type);
    setEditExpiry(item.expiry_date ?? "");
    setConfirmDelete(false);
  };

  const handleSaveEdit = async () => {
    if (!editingItem) return;
    setSavingEdit(true);

    const qty = parseFloat(editQty) || 1;
    const { calories, macros } = calcNutrition(
      qty,
      editUnit,
      editingItem.product.calories_100g,
      editingItem.product.macros_100g,
      editingItem.product.serving_size_g
    );

    const { error } = await supabase
      .from("inventory_items")
      .update({
        quantity: qty,
        unit: editUnit,
        storage_type: editStorage,
        expiry_date: editExpiry || null,
        calories_total: calories,
        macros_total: macros as any,
      })
      .eq("id", editingItem.id);

    setSavingEdit(false);
    if (error) {
      toast({ variant: "destructive", title: "Errore", description: error.message });
    } else {
      toast({ title: "Prodotto aggiornato" });
      setEditingItem(null);
      fetchItems();
    }
  };

  const handleDeleteItem = async () => {
    if (!editingItem) return;
    const { error } = await supabase.from("inventory_items").delete().eq("id", editingItem.id);
    if (error) {
      toast({ variant: "destructive", title: "Errore", description: error.message });
    } else {
      toast({ title: "Prodotto eliminato" });
      setEditingItem(null);
      fetchItems();
    }
  };

  const debouncedSearch = useDebounce(search, 250);

  const filtered = useMemo(() => items.filter((item) => {
    const matchSearch = !debouncedSearch || item.product.name.toLowerCase().includes(debouncedSearch.toLowerCase());
    const matchStorage = storageFilter === "all" || item.storage_type === storageFilter;
    const status = getExpiryStatus(item.expiry_date);
    const matchStatus = statusFilter === "all" || status === statusFilter;
    return matchSearch && matchStorage && matchStatus;
  }), [items, debouncedSearch, storageFilter, statusFilter]);

  return (
    <div>
      <MobileHeader
        title={mode === "user" ? "I miei Prodotti" : "Magazzino"}
        right={
          <Dialog open={addOpen} onOpenChange={(open) => { setAddOpen(open); if (!open) resetForm(); }}>
            <DialogTrigger asChild>
              <button className="p-1 text-primary-foreground">
                <Plus size={22} />
              </button>
            </DialogTrigger>
            <DialogContent className="max-w-md mx-4">
              <DialogHeader>
                <DialogTitle>Aggiungi prodotto</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleAdd} className="space-y-3">
                <div className="flex justify-center">
                  <ImageUpload
                    imageUrl={newImageUrl}
                    onUploaded={handleImageUploaded}
                    storagePath={getUploadPath()}
                    className="h-24 w-24"
                  />
                </div>

                <Input placeholder="Nome prodotto *" value={newName} onChange={(e) => setNewName(e.target.value)} required />
                <Input placeholder="Categoria" value={newCategory} onChange={(e) => setNewCategory(e.target.value)} />
                <div className="flex gap-2">
                  <Input type="number" placeholder="Quantità" value={newQuantity} onChange={(e) => setNewQuantity(e.target.value)} className="w-24" min="0" step="0.1" />
                  <Select value={newUnit} onValueChange={setNewUnit}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {["pezzi", "kg", "g", "l", "ml", "porzioni"].map((u) => (
                        <SelectItem key={u} value={u}>{u}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Select value={newStorage} onValueChange={setNewStorage}>
                  <SelectTrigger><SelectValue placeholder="Conservazione" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="frigo">Frigo</SelectItem>
                    <SelectItem value="freezer">Congelato</SelectItem>
                    <SelectItem value="ambiente">Dispensa</SelectItem>
                  </SelectContent>
                </Select>
                <Input type="date" placeholder="Scadenza" value={newExpiry} onChange={(e) => setNewExpiry(e.target.value)} />
                <Input placeholder="Note" value={newNotes} onChange={(e) => setNewNotes(e.target.value)} />
                <Button type="submit" className="w-full" disabled={adding}>
                  {adding && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Aggiungi
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        }
      />

      <main className="px-4 py-3 space-y-3">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Cerca prodotto..."
            className="pl-9 bg-card border-accent/30"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {/* Status filter chips */}
        <div className="flex gap-1.5 overflow-x-auto no-scrollbar">
          {([
            { key: "expired", label: "Scaduti", icon: AlertCircle },
            { key: "expiring", label: "In scadenza", icon: Clock },
            { key: "ok", label: "OK", icon: Package },
            { key: "all", label: "Tutti", icon: Package },
          ] as const).map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setStatusFilter(key)}
              className={`flex items-center gap-1 whitespace-nowrap rounded-full px-3 py-1.5 text-[13px] font-medium border transition-colors ${
                statusFilter === key
                  ? "bg-primary text-primary-foreground shadow-sm border-primary"
                  : "bg-card text-muted-foreground border-border"
              }`}
            >
              <Icon className="h-3 w-3" />
              {label}
            </button>
          ))}
        </div>

        {/* Storage filter chips */}
        <div className="flex gap-1.5 overflow-x-auto no-scrollbar">
          {([
            { key: "all", label: "Tutti", icon: null },
            { key: "ambiente", label: "Dispensa", icon: Home },
            { key: "frigo", label: "Frigo", icon: Refrigerator },
            { key: "freezer", label: "Congelatore", icon: Snowflake },
          ] as const).map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setStorageFilter(key)}
              className={`flex items-center gap-1 rounded-full px-3 py-1 text-[12px] font-medium border transition-colors ${
                storageFilter === key
                  ? "bg-primary/10 text-primary border-primary"
                  : "bg-card text-muted-foreground border-border"
              }`}
            >
              {Icon && <Icon className="h-3 w-3" />}
              {label}
            </button>
          ))}
        </div>

        {/* Items list */}
        {loading ? (
          <ListSkeleton count={4} variant="card" />
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={Package}
            title="Nessun prodotto"
            description={search ? "Nessun risultato per la tua ricerca." : "Aggiungi il primo prodotto scansionando o manualmente."}
            actions={search ? undefined : [
              { label: "Aggiungi prodotto", icon: Plus, onClick: () => setAddOpen(true) },
              { label: "Scansiona", icon: ScanLine, variant: "outline" as const, onClick: () => window.location.href = "/scan" },
            ]}
          />
        ) : (
          <div className="space-y-2">
            {filtered.map((item) => {
              const status = getExpiryStatus(item.expiry_date);
              const cfg = statusConfig[status];
              const { calories: computedCal } = calcNutrition(
                item.quantity ?? 0,
                item.unit ?? "pezzi",
                item.product.calories_100g,
                item.product.macros_100g,
                item.product.serving_size_g
              );
              const displayCal = item.calories_total ?? computedCal;

              return (
                <button
                  key={item.id}
                  onClick={() => openEditDialog(item)}
                  className="flex w-full items-center gap-3 rounded-2xl border-2 border-accent bg-card p-3 text-left active:scale-[0.98] transition-transform"
                >
                  {/* Image / placeholder */}
                  <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl bg-secondary overflow-hidden">
                    {item.product.image_url ? (
                      <img
                        src={item.product.image_url}
                        alt={item.product.name}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <span className="text-3xl">{getFoodEmoji(item.product.category, item.product.name)}</span>
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <p className="truncate text-sm font-bold text-foreground">{item.product.name}</p>
                      {(item.product as any).data_source === "manual" && (
                        <Badge variant="outline" className="text-[8px] px-1 py-0 border-amber-400 text-amber-600 shrink-0">
                          ✏️ Manuale
                        </Badge>
                      )}
                      {!(item.product as any).nutrition_available && (
                        <Badge variant="outline" className="text-[8px] px-1 py-0 border-muted-foreground text-muted-foreground shrink-0">
                          ⚠️ No macro
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      x{item.quantity} {item.unit ?? ""}
                    </p>
                    <div className="flex items-center gap-2">
                      {displayCal != null ? (
                        <span className="flex items-center gap-0.5 text-[10px] font-semibold text-primary">
                          <Flame className="h-3 w-3" /> {displayCal} kcal
                        </span>
                      ) : (
                        <span className="text-[10px] text-muted-foreground">kcal: —</span>
                      )}
                      {item.expiry_date && (
                        <span className="text-[10px] text-muted-foreground">
                          Scad: {new Date(item.expiry_date).toLocaleDateString("it-IT")}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Badge */}
                  <Badge className={`shrink-0 rounded-lg px-2.5 py-1 text-[10px] font-bold ${cfg.className}`}>
                    {cfg.label}
                  </Badge>
                </button>
              );
            })}
          </div>
        )}
      </main>

      {/* ═══ Edit Item Dialog ═══ */}
      <Dialog open={!!editingItem} onOpenChange={(open) => { if (!open) { setEditingItem(null); setConfirmDelete(false); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Modifica prodotto</DialogTitle>
            <DialogDescription>{editingItem?.product.name}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Quantità</Label>
              <Input type="number" value={editQty} onChange={e => setEditQty(e.target.value)} min="0" step="0.1" />
            </div>
            <div className="space-y-2">
              <Label>Unità</Label>
              <Select value={editUnit} onValueChange={setEditUnit}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["pezzi", "kg", "g", "l", "ml", "porzioni"].map((u) => (
                    <SelectItem key={u} value={u}>{u}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Conservazione</Label>
              <Select value={editStorage} onValueChange={setEditStorage}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="frigo">Frigo</SelectItem>
                  <SelectItem value="freezer">Congelato</SelectItem>
                  <SelectItem value="ambiente">Dispensa</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Scadenza</Label>
              <Input type="date" value={editExpiry} onChange={e => setEditExpiry(e.target.value)} />
            </div>
          </div>
          <DialogFooter className="flex flex-col gap-2 sm:flex-col">
            <Button onClick={handleSaveEdit} disabled={savingEdit} className="w-full">
              {savingEdit ? "Salvataggio..." : "Salva"}
            </Button>
            {!confirmDelete ? (
              <Button variant="outline" onClick={() => setConfirmDelete(true)} className="w-full text-destructive border-destructive/30 gap-2">
                <Trash2 className="h-4 w-4" /> Elimina
              </Button>
            ) : (
              <Button variant="destructive" onClick={handleDeleteItem} className="w-full gap-2">
                <Trash2 className="h-4 w-4" /> Conferma eliminazione
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default memo(InventoryList);