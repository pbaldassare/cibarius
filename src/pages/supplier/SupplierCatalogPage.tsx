import { useEffect, useState } from "react";
import MobileHeader from "@/components/MobileHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Package, Plus, Loader2, Search, Pencil, Trash2, Save } from "lucide-react";
import EmptyState from "@/components/EmptyState";
import ListSkeleton from "@/components/ListSkeleton";

interface CatalogItem {
  id: string;
  product_id: string;
  price: number;
  currency: string;
  unit: string | null;
  availability: string;
  products?: { name: string; brand: string | null; barcode: string | null } | null;
}

const SupplierCatalogPage = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [supplier, setSupplier] = useState<any>(null);
  const [items, setItems] = useState<CatalogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  // Add modal
  const [addOpen, setAddOpen] = useState(false);
  const [productSearch, setProductSearch] = useState("");
  const [productResults, setProductResults] = useState<any[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [price, setPrice] = useState("");
  const [unit, setUnit] = useState("kg");
  const [saving, setSaving] = useState(false);

  // Edit
  const [editId, setEditId] = useState<string | null>(null);
  const [editPrice, setEditPrice] = useState("");

  const loadData = async () => {
    if (!user) return;
    const { data: sup } = await supabase.from("suppliers").select("*").eq("owner_user_id", user.id).single();
    if (!sup) { setLoading(false); return; }
    setSupplier(sup);

    const { data } = await supabase
      .from("supplier_products")
      .select("*, products(name, brand, barcode)")
      .eq("supplier_id", sup.id)
      .order("updated_at", { ascending: false });

    setItems((data ?? []) as CatalogItem[]);
    setLoading(false);
  };

  useEffect(() => { loadData(); }, [user]);

  const searchProducts = async (q: string) => {
    setProductSearch(q);
    if (q.length < 2) { setProductResults([]); return; }
    const { data } = await supabase
      .from("products")
      .select("id, name, brand, barcode")
      .or(`name.ilike.%${q}%,barcode.ilike.%${q}%,brand.ilike.%${q}%`)
      .limit(10);
    setProductResults(data ?? []);
  };

  const handleAdd = async () => {
    if (!supplier || !selectedProduct || !price) return;
    setSaving(true);
    const { error } = await supabase.from("supplier_products").insert({
      supplier_id: supplier.id,
      product_id: selectedProduct.id,
      price: parseFloat(price),
      unit,
    });
    setSaving(false);
    if (error) {
      if (error.code === "23505") toast({ variant: "destructive", title: "Prodotto già in catalogo" });
      else toast({ variant: "destructive", title: "Errore", description: error.message });
    } else {
      toast({ title: "Prodotto aggiunto al catalogo!" });
      setAddOpen(false);
      setSelectedProduct(null);
      setPrice("");
      setProductSearch("");
      loadData();
    }
  };

  const handleUpdatePrice = async (itemId: string) => {
    const p = parseFloat(editPrice);
    if (isNaN(p)) return;
    const { error } = await supabase.from("supplier_products").update({ price: p, updated_at: new Date().toISOString() }).eq("id", itemId);
    if (!error) { toast({ title: "Prezzo aggiornato" }); setEditId(null); loadData(); }
  };

  const handleDelete = async (itemId: string) => {
    const { error } = await supabase.from("supplier_products").delete().eq("id", itemId);
    if (!error) { toast({ title: "Prodotto rimosso dal catalogo" }); loadData(); }
  };

  const filtered = items.filter((i) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return i.products?.name?.toLowerCase().includes(q) || i.products?.brand?.toLowerCase().includes(q);
  });

  return (
    <div>
      <MobileHeader title="Catalogo" />
      <main className="px-4 py-5 space-y-4">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Cerca nel catalogo…" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
          </div>
          <Button className="gap-2" onClick={() => setAddOpen(true)}>
            <Plus className="h-4 w-4" /> Aggiungi
          </Button>
        </div>

        {loading ? (
          <ListSkeleton count={4} variant="card" />
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={Package}
            title="Catalogo vuoto"
            description="Aggiungi il primo prodotto al tuo listino prezzi."
            actions={[{ label: "Aggiungi prodotto", icon: Plus, onClick: () => setAddOpen(true) }]}
          />
        ) : (
          <div className="space-y-2">
            {filtered.map((item) => (
              <Card key={item.id} className="border-2 border-accent">
                <CardContent className="flex items-center gap-3 py-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{item.products?.name}</p>
                    <p className="text-xs text-muted-foreground">{item.products?.brand || ""} {item.products?.barcode ? `· ${item.products.barcode}` : ""}</p>
                  </div>
                  {editId === item.id ? (
                    <div className="flex items-center gap-1">
                      <Input
                        type="number"
                        step="0.01"
                        value={editPrice}
                        onChange={(e) => setEditPrice(e.target.value)}
                        className="w-20 h-8 text-sm"
                      />
                      <Button size="icon" variant="ghost" onClick={() => handleUpdatePrice(item.id)}>
                        <Save className="h-4 w-4 text-primary" />
                      </Button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1">
                      <span className="text-sm font-bold text-foreground">€{item.price.toFixed(2)}</span>
                      <span className="text-xs text-muted-foreground">/{item.unit || "u"}</span>
                      <Button size="icon" variant="ghost" onClick={() => { setEditId(item.id); setEditPrice(String(item.price)); }}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  )}
                  <Button size="icon" variant="ghost" className="text-destructive" onClick={() => handleDelete(item.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Add product modal */}
        <Dialog open={addOpen} onOpenChange={setAddOpen}>
          <DialogContent className="max-w-sm">
            <DialogHeader><DialogTitle>Aggiungi prodotto</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <Input
                placeholder="Cerca prodotto per nome o barcode…"
                value={productSearch}
                onChange={(e) => searchProducts(e.target.value)}
              />
              {productResults.length > 0 && !selectedProduct && (
                <div className="max-h-40 overflow-y-auto space-y-1 rounded-lg border border-border p-2">
                  {productResults.map((p) => (
                    <button
                      key={p.id}
                      className="w-full text-left px-3 py-2 rounded-md hover:bg-secondary text-sm"
                      onClick={() => { setSelectedProduct(p); setProductSearch(p.name); }}
                    >
                      <span className="font-medium">{p.name}</span>
                      {p.brand && <span className="text-muted-foreground ml-1">({p.brand})</span>}
                    </button>
                  ))}
                </div>
              )}
              {selectedProduct && (
                <>
                  <div className="rounded-lg bg-secondary p-3 text-sm">
                    <p className="font-medium">{selectedProduct.name}</p>
                    {selectedProduct.brand && <p className="text-xs text-muted-foreground">{selectedProduct.brand}</p>}
                  </div>
                  <div className="flex gap-2">
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="Prezzo"
                      value={price}
                      onChange={(e) => setPrice(e.target.value)}
                      className="flex-1"
                    />
                    <Select value={unit} onValueChange={setUnit}>
                      <SelectTrigger className="w-24"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="kg">kg</SelectItem>
                        <SelectItem value="g">g</SelectItem>
                        <SelectItem value="l">l</SelectItem>
                        <SelectItem value="ml">ml</SelectItem>
                        <SelectItem value="pezzi">pezzi</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Button className="w-full" onClick={handleAdd} disabled={saving || !price}>
                    {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    Aggiungi al catalogo
                  </Button>
                </>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
};

export default SupplierCatalogPage;
