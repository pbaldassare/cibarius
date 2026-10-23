import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import MobileHeader from "@/components/MobileHeader";
import RestaurantAddFlow, { type PrefilledStockItem } from "@/components/RestaurantAddFlow";
import { useRestaurant } from "@/hooks/useRestaurant";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Loader2, ChevronRight, Plus, PackageCheck, Boxes, ClipboardList } from "lucide-react";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import {
  ORDER_STATUS_COLORS, ORDER_STATUS_LABELS, formatEuro, isOpenOrder, type SupplierOrderStatus,
} from "@/lib/supplier-orders";

interface OrderRow {
  id: string;
  status: SupplierOrderStatus;
  total: number;
  created_at: string;
  requested_delivery_date: string | null;
  delivered_at: string | null;
  stock_loaded_at: string | null;
  notes: string | null;
  supplier_note: string | null;
  suppliers: { name: string } | null;
}

interface OrderItem {
  id: string;
  product_id: string | null;
  product_name: string;
  unit: string | null;
  unit_price: number | null;
  quantity: number;
  line_total: number | null;
}

const ORDER_SELECT =
  "id, status, total, created_at, requested_delivery_date, delivered_at, stock_loaded_at, notes, supplier_note, suppliers(name)";

const StatusBadge = ({ status }: { status: SupplierOrderStatus }) => (
  <Badge variant="outline" className={ORDER_STATUS_COLORS[status]}>{ORDER_STATUS_LABELS[status]}</Badge>
);

const OrdersList = () => {
  const { restaurant } = useRestaurant();
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    if (!restaurant) return;
    supabase
      .from("supplier_orders")
      .select(ORDER_SELECT)
      .eq("restaurant_id", restaurant.id)
      .order("created_at", { ascending: false })
      .limit(100)
      .then(({ data }) => {
        setOrders((data ?? []) as OrderRow[]);
        setLoading(false);
      });
  }, [restaurant]);

  // In evidenza: aperti e consegnati ancora da caricare in magazzino.
  const toHandle = (o: OrderRow) => isOpenOrder(o.status) || (o.status === "consegnato" && !o.stock_loaded_at);
  const visible = showAll ? orders : orders.filter(toHandle);

  return (
    <div className="space-y-4 p-4">
      <MobileHeader className="-mx-4 -mt-4" title="Ordini fornitori" />
      <Button asChild className="w-full gap-2">
        <Link to="/restaurant/suppliers"><Plus className="h-4 w-4" /> Nuovo ordine</Link>
      </Button>
      <div className="flex gap-2">
        <Button size="sm" variant={showAll ? "outline" : "default"} onClick={() => setShowAll(false)}>Da gestire</Button>
        <Button size="sm" variant={showAll ? "default" : "outline"} onClick={() => setShowAll(true)}>Tutti</Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
      ) : visible.length === 0 ? (
        <Card>
          <CardContent className="space-y-2 py-10 text-center">
            <ClipboardList className="mx-auto h-10 w-10 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">{showAll ? "Nessun ordine." : "Nessun ordine da gestire."}</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {visible.map((o) => (
            <Link key={o.id} to={`/restaurant/orders/${o.id}`}>
              <Card className="transition-shadow hover:shadow-md">
                <CardContent className="flex items-center gap-3 p-4">
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      <p className="truncate text-sm font-semibold text-foreground">{o.suppliers?.name ?? "Fornitore"}</p>
                      <StatusBadge status={o.status} />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(o.created_at), "d MMM HH:mm", { locale: it })} · {formatEuro(Number(o.total))}
                      {o.status === "consegnato" && !o.stock_loaded_at && " · da caricare in magazzino"}
                    </p>
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

const OrderDetail = ({ orderId }: { orderId: string }) => {
  const { restaurant } = useRestaurant();
  const { toast } = useToast();
  const [order, setOrder] = useState<OrderRow | null>(null);
  const [items, setItems] = useState<OrderItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [confirm, setConfirm] = useState<"annullato" | "consegnato" | null>(null);
  const [loadOpen, setLoadOpen] = useState(false);

  const load = useCallback(async () => {
    const [orderRes, itemsRes] = await Promise.all([
      supabase.from("supplier_orders").select(ORDER_SELECT).eq("id", orderId).maybeSingle(),
      supabase
        .from("supplier_order_items")
        .select("id, product_id, product_name, unit, unit_price, quantity, line_total")
        .eq("order_id", orderId)
        .order("product_name"),
    ]);
    setOrder((orderRes.data ?? null) as OrderRow | null);
    setItems((itemsRes.data ?? []) as OrderItem[]);
    setLoading(false);
  }, [orderId]);

  useEffect(() => { load(); }, [load]);

  const prefill: PrefilledStockItem[] = useMemo(
    () => items.map((i) => ({ name: i.product_name, quantity: Number(i.quantity), unit: i.unit, productId: i.product_id })),
    [items],
  );

  const changeStatus = async (status: "annullato" | "consegnato") => {
    setBusy(true);
    const { error } = await supabase.rpc("update_supplier_order_status", { _order_id: orderId, _status: status });
    setBusy(false);
    setConfirm(null);
    if (error) {
      toast({ variant: "destructive", title: "Errore", description: error.message });
      return;
    }
    toast({ title: status === "annullato" ? "Ordine annullato" : "Merce ricevuta ✓" });
    load();
  };

  const markLoaded = async () => {
    const { error } = await supabase.rpc("mark_supplier_order_stock_loaded", { _order_id: orderId });
    if (error) toast({ variant: "destructive", title: "Errore", description: error.message });
    load();
  };

  if (loading) {
    return <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }
  if (!order) {
    return (
      <div className="space-y-4 p-4">
        <MobileHeader className="-mx-4 -mt-4" title="Ordine" />
        <p className="py-10 text-center text-sm text-muted-foreground">Ordine non trovato.</p>
      </div>
    );
  }

  const supplierName = order.suppliers?.name ?? "Fornitore";

  return (
    <div className="space-y-4 p-4">
      <MobileHeader className="-mx-4 -mt-4" title={supplierName} />

      <Card>
        <CardContent className="space-y-2 p-4 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Stato</span>
            <StatusBadge status={order.status} />
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Inviato</span>
            <span>{format(new Date(order.created_at), "d MMMM yyyy HH:mm", { locale: it })}</span>
          </div>
          {order.requested_delivery_date && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Consegna richiesta</span>
              <span>{format(new Date(`${order.requested_delivery_date}T12:00:00`), "EEEE d MMMM", { locale: it })}</span>
            </div>
          )}
          {order.delivered_at && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Consegnato</span>
              <span>{format(new Date(order.delivered_at), "d MMMM HH:mm", { locale: it })}</span>
            </div>
          )}
          {order.notes && <p className="rounded-lg bg-muted/60 p-2 text-xs"><strong>Tue note:</strong> {order.notes}</p>}
          {order.supplier_note && <p className="rounded-lg bg-primary/5 p-2 text-xs"><strong>Nota del fornitore:</strong> {order.supplier_note}</p>}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="divide-y divide-border p-0 text-sm">
          {items.map((i) => (
            <div key={i.id} className="flex items-center justify-between gap-2 p-3">
              <span className="min-w-0 flex-1 truncate">{i.product_name}</span>
              <span className="text-muted-foreground">{Number(i.quantity)} {i.unit || "u"}</span>
              <span className="w-20 text-right">{i.line_total === null ? "—" : formatEuro(Number(i.line_total))}</span>
            </div>
          ))}
          <div className="flex justify-between p-3 font-semibold">
            <span>Totale</span><span>{formatEuro(Number(order.total))}</span>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-2">
        {isOpenOrder(order.status) && (
          <Button className="w-full gap-2" onClick={() => setConfirm("consegnato")} disabled={busy}>
            <PackageCheck className="h-4 w-4" /> Merce ricevuta
          </Button>
        )}
        {order.status === "consegnato" && !order.stock_loaded_at && (
          <Button className="w-full gap-2" onClick={() => setLoadOpen(true)}>
            <Boxes className="h-4 w-4" /> Carica in magazzino
          </Button>
        )}
        {order.stock_loaded_at && (
          <p className="text-center text-xs text-muted-foreground">
            Caricato in magazzino il {format(new Date(order.stock_loaded_at), "d MMMM HH:mm", { locale: it })}
          </p>
        )}
        {order.status === "inviato" && (
          <Button variant="outline" className="w-full text-destructive hover:text-destructive" onClick={() => setConfirm("annullato")} disabled={busy}>
            Annulla ordine
          </Button>
        )}
      </div>

      <AlertDialog open={!!confirm} onOpenChange={(o) => !o && setConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{confirm === "annullato" ? "Annullare l'ordine?" : "Segnare la merce come ricevuta?"}</AlertDialogTitle>
            <AlertDialogDescription>
              {confirm === "annullato"
                ? `${supplierName} riceverà una notifica dell'annullamento.`
                : "Poi potrai caricarla in magazzino con scadenze e lotti."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Indietro</AlertDialogCancel>
            <AlertDialogAction onClick={() => confirm && changeStatus(confirm)}>
              {confirm === "annullato" ? "Annulla ordine" : "Ricevuta"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {restaurant && (
        <RestaurantAddFlow
          open={loadOpen}
          onOpenChange={setLoadOpen}
          restaurantId={restaurant.id}
          initialItems={prefill}
          movementNotes={`Da ordine a ${supplierName}`}
          onComplete={markLoaded}
        />
      )}
    </div>
  );
};

const RestaurantOrdersPage = () => {
  const { orderId } = useParams<{ orderId: string }>();
  return orderId ? <OrderDetail orderId={orderId} /> : <OrdersList />;
};

export default RestaurantOrdersPage;
