import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useRestaurant } from "@/hooks/useRestaurant";
import { supabase } from "@/integrations/supabase/client";
import MobileHeader from "@/components/MobileHeader";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Plus, Search, SlidersHorizontal, Package, Loader2 } from "lucide-react";

interface InventoryItemWithProduct {
  id: string;
  quantity: number;
  unit: string | null;
  storage_type: string;
  expiry_date: string | null;
  notes: string | null;
  product: {
    id: string;
    name: string;
    brand: string | null;
    image_url: string | null;
    category: string | null;
  };
}

type ExpiryStatus = "expired" | "expiring" | "ok";

const getExpiryStatus = (expiryDate: string | null): ExpiryStatus => {
  if (!expiryDate) return "ok";
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
};

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
  const [showFilters, setShowFilters] = useState(false);
  const [addOpen, setAddOpen] = useState(false);

  // Add form state
  const [newName, setNewName] = useState("");
  const [newCategory, setNewCategory] = useState("");
  const [newQuantity, setNewQuantity] = useState("1");
  const [newUnit, setNewUnit] = useState("pezzi");
  const [newStorage, setNewStorage] = useState("frigo");
  const [newExpiry, setNewExpiry] = useState("");
  const [newNotes, setNewNotes] = useState("");
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    if (externalStorageFilter) setStorageFilter(externalStorageFilter);
  }, [externalStorageFilter]);

  const fetchItems = async () => {
    if (!user) return;
    setLoading(true);

    let query = supabase
      .from("inventory_items")
      .select("id, quantity, unit, storage_type, expiry_date, notes, product:products(id, name, brand, image_url, category)")
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

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setAdding(true);

    // Create product in catalog
    const { data: product, error: productError } = await supabase
      .from("products")
      .insert({ name: newName, category: newCategory || null, unit: newUnit })
      .select()
      .single();

    if (productError || !product) {
      toast({ variant: "destructive", title: "Errore", description: productError?.message ?? "Errore creazione prodotto" });
      setAdding(false);
      return;
    }

    // Create inventory item
    const insertData: any = {
      product_id: product.id,
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
  };

  const filtered = items.filter((item) => {
    const matchSearch = !search || item.product.name.toLowerCase().includes(search.toLowerCase());
    const matchStorage = storageFilter === "all" || item.storage_type === storageFilter;
    const status = getExpiryStatus(item.expiry_date);
    const matchStatus = statusFilter === "all" || status === statusFilter;
    return matchSearch && matchStorage && matchStatus;
  });

  return (
    <div>
      <MobileHeader
        title={mode === "user" ? "I miei Prodotti" : "Magazzino"}
        right={
          <Dialog open={addOpen} onOpenChange={setAddOpen}>
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
        {/* Search + filter toggle */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Cerca prodotto..."
              className="pl-9 bg-card border-accent/30"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Button
            variant="outline"
            size="icon"
            className="border-accent/30"
            onClick={() => setShowFilters(!showFilters)}
          >
            <SlidersHorizontal className="h-4 w-4" />
          </Button>
        </div>

        {/* Filters */}
        {showFilters && (
          <div className="flex gap-2">
            <Select value={storageFilter} onValueChange={setStorageFilter}>
              <SelectTrigger className="flex-1 border-accent/30"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tutti</SelectItem>
                <SelectItem value="frigo">Frigo</SelectItem>
                <SelectItem value="freezer">Congelato</SelectItem>
                <SelectItem value="ambiente">Dispensa</SelectItem>
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="flex-1 border-accent/30"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tutti</SelectItem>
                <SelectItem value="expired">Scaduti</SelectItem>
                <SelectItem value="expiring">In scadenza</SelectItem>
                <SelectItem value="ok">OK</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Items list */}
        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <Package className="mb-2 h-12 w-12" />
            <p className="text-sm">Nessun prodotto trovato</p>
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map((item) => {
              const status = getExpiryStatus(item.expiry_date);
              const cfg = statusConfig[status];
              return (
                <div
                  key={item.id}
                  className="flex items-center gap-3 rounded-2xl border-2 border-accent bg-card p-3"
                >
                  {/* Image / placeholder */}
                  <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl bg-secondary">
                    {item.product.image_url ? (
                      <img
                        src={item.product.image_url}
                        alt={item.product.name}
                        className="h-full w-full rounded-xl object-cover"
                      />
                    ) : (
                      <Package className="h-8 w-8 text-muted-foreground" />
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="truncate text-sm font-bold text-foreground">{item.product.name}</p>
                    <p className="text-xs text-muted-foreground">
                      x{item.quantity} {item.unit ?? ""}
                    </p>
                    {item.expiry_date && (
                      <p className="text-[10px] text-muted-foreground">
                        Scad: {new Date(item.expiry_date).toLocaleDateString("it-IT")}
                      </p>
                    )}
                  </div>

                  {/* Badge */}
                  <Badge className={`shrink-0 rounded-lg px-2.5 py-1 text-[10px] font-bold ${cfg.className}`}>
                    {cfg.label}
                  </Badge>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
};

export default InventoryList;
