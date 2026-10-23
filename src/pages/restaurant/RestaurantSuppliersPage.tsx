import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import MobileHeader from "@/components/MobileHeader";
import { useRestaurant } from "@/hooks/useRestaurant";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Loader2, Truck, Link2, ChevronRight, Minus, Plus, Search, ShoppingCart, ClipboardList } from "lucide-react";
import { format, addDays } from "date-fns";
import { cartTotal, formatEuro } from "@/lib/supplier-orders";

interface LinkedSupplier {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
}

interface CatalogItem {
  id: string;
  price: number;
  unit: string | null;
  availability: string | null;
  products: { name: string; brand: string | null } | null;
}

/** Elenco dei fornitori collegati. */
const SuppliersList = () => {
  const { restaurant } = useRestaurant();
  const [suppliers, setSuppliers] = useState<LinkedSupplier[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!restaurant) return;
    supabase
      .from("supplier_restaurants")
      .select("suppliers(id, name, phone, email)")
      .eq("restaurant_id", restaurant.id)
      .eq("status", "active")
      .then(({ data }) => {
        setSuppliers((data ?? []).map((r) => r.suppliers).filter(Boolean) as LinkedSupplier[]);
        setLoading(false);
      });
  }, [restaurant]);

  return (
    <div className="space-y-4 p-4">
      <MobileHeader className="-mx-4 -mt-4" title="Fornitori" />
      <div className="flex gap-2">
        <Button asChild variant="outline" className="flex-1 gap-2">
          <Link to="/restaurant/orders"><ClipboardList className="h-4 w-4" /> I miei ordini</Link>
        </Button>
        <Button asChild variant="outline" className="flex-1 gap-2">
          <Link to="/supplier-invite"><Link2 className="h-4 w-4" /> Collega fornitore</Link>
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
      ) : suppliers.length === 0 ? (
        <Card>
          <CardContent className="space-y-2 py-10 text-center">
            <Truck className="mx-auto h-10 w-10 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              Nessun fornitore collegato. Chiedi al tuo fornitore il codice invito Cibarius e collegalo qui.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {suppliers.map((s) => (
            <Link key={s.id} to={`/restaurant/suppliers/${s.id}`}>
              <Card className="transition-shadow hover:shadow-md">
                <CardContent className="flex items-center gap-3 p-4">
                  <Truck className="h-5 w-5 shrink-0 text-primary" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-foreground">{s.name}</p>
                    <p className="truncate text-xs text-muted-foreground">{[s.phone, s.email].filter(Boolean).join(" · ") || "Catalogo e ordini"}</p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
};

/** Catalogo di un fornitore e carrello per l'ordine. */
const SupplierCatalog = ({ supplierId }: { supplierId: string }) => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [supplierName, setSupplierName] = useState("");
  const [catalog, setCatalog] = useState<CatalogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [cart, setCart] = useState<Record<string, number>>({});
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [notes, setNotes] = useState("");
  const [deliveryDate, setDeliveryDate] = useState(format(addDays(new Date(), 1), "yyyy-MM-dd"));
  const [sending, setSending] = useState(false);

  useEffect(() => {
    const load = async () => {
      const [supRes, catRes] = await Promise.all([
        supabase.from("suppliers").select("name").eq("id", supplierId).maybeSingle(),
        supabase
          .from("supplier_products")
          .select("id, price, unit, availability, products(name, brand)")
          .eq("supplier_id", supplierId),
      ]);
      setSupplierName(supRes.data?.name ?? "Fornitore");
      setCatalog(
        ((catRes.data ?? []) as CatalogItem[])
          .filter((c) => c.availability !== "unavailable")
          .sort((a, b) => (a.products?.name ?? "").localeCompare(b.products?.name ?? "")),
      );
      setLoading(false);
    };
    load();
  }, [supplierId]);

  const visible = catalog.filter((c) => {
    const q = search.trim().toLowerCase();
    return !q || `${c.products?.name ?? ""} ${c.products?.brand ?? ""}`.toLowerCase().includes(q);
  });

  const lines = useMemo(
    () => catalog.filter((c) => (cart[c.id] ?? 0) > 0).map((c) => ({ item: c, quantity: cart[c.id] })),
    [catalog, cart],
  );
  const total = cartTotal(lines.map((l) => ({ price: Number(l.item.price), quantity: l.quantity })));

  const setQty = (id: string, qty: number) =>
    setCart((prev) => ({ ...prev, [id]: Math.max(0, Math.round(qty * 1000) / 1000) }));

  const sendOrder = async () => {
    setSending(true);
    const { data, error } = await supabase.rpc("create_supplier_order", {
      _supplier_id: supplierId,
      _items: lines.map((l) => ({ supplier_product_id: l.item.id, quantity: l.quantity })),
      _notes: notes || null,
      _requested_delivery_date: deliveryDate || null,
    });
    setSending(false);
    if (error || !data) {
      toast({ variant: "destructive", title: "Ordine non inviato", description: error?.message });
      return;
    }
    toast({ title: "Ordine inviato ✓", description: `${supplierName} riceverà una notifica e un'email.` });
    navigate(`/restaurant/orders/${data}`, { replace: true });
  };

  return (
    <div className="space-y-4 p-4 pb-28">
      <MobileHeader className="-mx-4 -mt-4" title={supplierName || "Catalogo"} />

      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input placeholder="Cerca nel catalogo..." aria-label="Cerca nel catalogo" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
      ) : visible.length === 0 ? (
        <p className="py-10 text-center text-sm text-muted-foreground">
          {catalog.length === 0 ? "Il fornitore non ha ancora prodotti in catalogo." : "Nessun prodotto trovato."}
        </p>
      ) : (
        <div className="space-y-2">
          {visible.map((c) => {
            const qty = cart[c.id] ?? 0;
            return (
              <Card key={c.id} className={qty > 0 ? "border-primary/40" : ""}>
                <CardContent className="flex items-center gap-3 p-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-foreground">{c.products?.name ?? "Prodotto"}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatEuro(Number(c.price))} / {c.unit || "u"}{c.products?.brand ? ` · ${c.products.brand}` : ""}
                    </p>
                  </div>
                  {qty === 0 ? (
                    <Button size="sm" variant="outline" onClick={() => setQty(c.id, 1)} aria-label={`Aggiungi ${c.products?.name ?? "prodotto"}`}>
                      <Plus className="h-4 w-4" />
                    </Button>
                  ) : (
                    <div className="flex items-center gap-1">
                      <Button size="icon" variant="outline" className="h-8 w-8" onClick={() => setQty(c.id, qty - 1)} aria-label="Diminuisci">
                        <Minus className="h-4 w-4" />
                      </Button>
                      <Input
                        type="number"
                        inputMode="decimal"
                        min={0}
                        value={qty}
                        onChange={(e) => setQty(c.id, parseFloat(e.target.value) || 0)}
                        className="h-8 w-16 text-center"
                        aria-label={`Quantità ${c.products?.name ?? ""}`}
                      />
                      <Button size="icon" variant="outline" className="h-8 w-8" onClick={() => setQty(c.id, qty + 1)} aria-label="Aumenta">
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {lines.length > 0 && (
        <div className="fixed inset-x-0 bottom-[calc(64px+var(--sab))] z-40 mx-auto max-w-2xl px-4 pb-3">
          <Button className="h-12 w-full justify-between gap-2 shadow-lg" onClick={() => setCheckoutOpen(true)}>
            <span className="flex items-center gap-2"><ShoppingCart className="h-4 w-4" /> {lines.length} prodotti</span>
            <span>{formatEuro(total)} · Rivedi ordine</span>
          </Button>
        </div>
      )}

      <Sheet open={checkoutOpen} onOpenChange={setCheckoutOpen}>
        <SheetContent side="bottom" className="max-h-[90vh] overflow-y-auto rounded-t-[20px]">
          <SheetHeader><SheetTitle>Ordine a {supplierName}</SheetTitle></SheetHeader>
          <div className="space-y-4 py-4">
            <div className="divide-y divide-border rounded-lg border border-border">
              {lines.map((l) => (
                <div key={l.item.id} className="flex items-center justify-between gap-2 p-3 text-sm">
                  <span className="min-w-0 flex-1 truncate">{l.item.products?.name}</span>
                  <span className="text-muted-foreground">{l.quantity} {l.item.unit || "u"}</span>
                  <span className="w-20 text-right font-medium">{formatEuro(Math.round(Number(l.item.price) * l.quantity * 100) / 100)}</span>
                </div>
              ))}
              <div className="flex justify-between p-3 text-sm font-semibold">
                <span>Totale</span><span>{formatEuro(total)}</span>
              </div>
            </div>
            <div className="space-y-1">
              <label htmlFor="delivery" className="text-xs font-medium text-muted-foreground">Consegna richiesta</label>
              <Input id="delivery" type="date" min={format(new Date(), "yyyy-MM-dd")} value={deliveryDate} onChange={(e) => setDeliveryDate(e.target.value)} />
            </div>
            <div className="space-y-1">
              <label htmlFor="notes" className="text-xs font-medium text-muted-foreground">Note per il fornitore</label>
              <Textarea id="notes" rows={2} placeholder="Es. consegna entro le 10, scarico dal retro" value={notes} onChange={(e) => setNotes(e.target.value)} />
            </div>
            <p className="text-xs text-muted-foreground">I prezzi sono quelli del catalogo di oggi: il fornitore li vedrà così nell'ordine.</p>
            <Button className="w-full" onClick={sendOrder} disabled={sending}>
              {sending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Invia ordine
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
};

const RestaurantSuppliersPage = () => {
  const { supplierId } = useParams<{ supplierId: string }>();
  return supplierId ? <SupplierCatalog supplierId={supplierId} /> : <SuppliersList />;
};

export default RestaurantSuppliersPage;
