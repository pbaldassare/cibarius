import { useEffect, useMemo, useState } from "react";
import { useRestaurant } from "@/hooks/useRestaurant";
import { supabase } from "@/integrations/supabase/client";
import MobileHeader from "@/components/MobileHeader";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import {
  Loader2, Search, Package, TrendingDown, Trash2, ArrowDownToLine,
  ArrowUpFromLine, SlidersHorizontal, Clock, AlertTriangle,
} from "lucide-react";
import {
  forecastFromMovements, fmtQty, MOVEMENT_LABELS,
  type Movement, type MovementType,
} from "@/lib/inventory-movements";

interface Lot {
  id: string;
  product_id: string | null;
  quantity: number | null;
  unit: string | null;
  expiry_date: string | null;
  lot_number: string | null;
  storage_type: string;
  product: { name: string } | null;
}

/** Una riga della lista: tutti i lotti dello stesso prodotto, aggregati. */
interface StockRow {
  productId: string;
  name: string;
  unit: string | null;
  totalQty: number;
  lots: Lot[];
  /** Scadenza piu' vicina fra i lotti. */
  nextExpiry: string | null;
  dailyRate: number;
  daysLeft: number | null;
}

const movementIcon: Record<MovementType, typeof ArrowDownToLine> = {
  carico: ArrowDownToLine,
  consumo: ArrowUpFromLine,
  spreco: Trash2,
  rettifica: SlidersHorizontal,
};

const movementColor: Record<MovementType, string> = {
  carico: "text-emerald-600",
  consumo: "text-sky-600",
  spreco: "text-destructive",
  rettifica: "text-amber-600",
};

const daysUntil = (d: string) =>
  Math.ceil((new Date(d).getTime() - Date.now()) / 86400000);

const RestaurantStockPage = () => {
  const { restaurant, isLoading: restLoading } = useRestaurant();
  const [lots, setLots] = useState<Lot[]>([]);
  const [movements, setMovements] = useState<Movement[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState("giacenze");
  const [detail, setDetail] = useState<StockRow | null>(null);

  useEffect(() => {
    if (!restaurant) return;
    (async () => {
      const [lotsRes, movRes] = await Promise.all([
        supabase
          .from("inventory_items")
          .select("id, product_id, quantity, unit, expiry_date, lot_number, storage_type, product:products(name)")
          .eq("restaurant_id", restaurant.id),
        supabase
          .from("inventory_movements")
          .select("id, inventory_item_id, product_id, product_name, movement_type, quantity_delta, unit, lot_number, expiry_date, notes, user_name, created_at")
          .eq("restaurant_id", restaurant.id)
          .order("created_at", { ascending: false })
          .limit(500),
      ]);
      setLots((lotsRes.data ?? []) as unknown as Lot[]);
      setMovements((movRes.data ?? []) as unknown as Movement[]);
      setLoading(false);
    })();
  }, [restaurant]);

  /** Giacenza per prodotto + stima di esaurimento dai movimenti in uscita. */
  const rows = useMemo<StockRow[]>(() => {
    const byProduct = new Map<string, Lot[]>();
    for (const lot of lots) {
      const key = lot.product_id ?? lot.id;
      const list = byProduct.get(key);
      if (list) list.push(lot);
      else byProduct.set(key, [lot]);
    }

    const out: StockRow[] = [];
    for (const [productId, group] of byProduct) {
      const totalQty = group.reduce((sum, l) => sum + Number(l.quantity ?? 0), 0);
      const expiries = group.map((l) => l.expiry_date).filter(Boolean) as string[];
      const productMovements = movements.filter((m) => m.product_id === productId);
      const { dailyRate, daysLeft } = forecastFromMovements(productMovements, totalQty);

      out.push({
        productId,
        name: group[0].product?.name ?? "Prodotto",
        unit: group[0].unit,
        totalQty,
        lots: group,
        nextExpiry: expiries.length ? expiries.sort()[0] : null,
        dailyRate,
        daysLeft,
      });
    }

    const q = search.trim().toLowerCase();
    return out
      .filter((r) => !q || r.name.toLowerCase().includes(q))
      .sort((a, b) => {
        // Prima quello che sta per finire, poi il resto in ordine alfabetico
        const da = a.daysLeft ?? Infinity;
        const db = b.daysLeft ?? Infinity;
        if (da !== db) return da - db;
        return a.name.localeCompare(b.name);
      });
  }, [lots, movements, search]);

  const filteredMovements = useMemo(() => {
    const q = search.trim().toLowerCase();
    return q ? movements.filter((m) => m.product_name.toLowerCase().includes(q)) : movements;
  }, [movements, search]);

  if (restLoading || loading) {
    return (
      <div>
        <MobileHeader title="Magazzino" showBack />
        <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#F5F7FA" }} data-tour="rest-stock-page">
      <MobileHeader title="Magazzino" showBack />
      <main className="px-4 py-4 pb-28 space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cerca prodotto…"
            className="pl-9 bg-white"
          />
        </div>

        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="giacenze">Giacenze ({rows.length})</TabsTrigger>
            <TabsTrigger value="movimenti">Movimenti ({movements.length})</TabsTrigger>
          </TabsList>
        </Tabs>

        {tab === "giacenze" && (
          rows.length === 0 ? (
            <EmptyState
              icon={Package}
              title="Magazzino vuoto"
              hint="Aggiungi prodotti dalla dashboard per vederli qui."
            />
          ) : (
            <div className="space-y-2">
              {rows.map((row) => {
                const expDays = row.nextExpiry ? daysUntil(row.nextExpiry) : null;
                return (
                  <button key={row.productId} onClick={() => setDetail(row)} className="w-full text-left">
                    <div className="rounded-2xl bg-white p-3 shadow-sm">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold truncate" style={{ color: "#111827" }}>{row.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {row.lots.length} lott{row.lots.length === 1 ? "o" : "i"}
                          </p>
                        </div>
                        <p className="text-base font-bold shrink-0" style={{ color: "#111827" }}>
                          {fmtQty(row.totalQty, row.unit)}
                        </p>
                      </div>

                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {row.daysLeft != null ? (
                          <Badge
                            variant={row.daysLeft <= 3 ? "destructive" : "secondary"}
                            className="gap-1 text-[10px] font-medium"
                          >
                            <TrendingDown className="h-3 w-3" />
                            Finisce in ~{row.daysLeft} g
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-[10px] text-muted-foreground">
                            Consumo non ancora misurabile
                          </Badge>
                        )}

                        {expDays != null && (
                          <Badge
                            variant={expDays < 0 ? "destructive" : expDays <= 3 ? "default" : "outline"}
                            className="gap-1 text-[10px] font-medium"
                          >
                            {expDays < 0 ? <AlertTriangle className="h-3 w-3" /> : <Clock className="h-3 w-3" />}
                            {expDays < 0 ? `Scaduto da ${-expDays} g` : `Scade fra ${expDays} g`}
                          </Badge>
                        )}
                      </div>

                      {row.dailyRate > 0 && (
                        <p className="mt-1.5 text-[10px] text-muted-foreground">
                          Consumo medio {fmtQty(row.dailyRate, row.unit)} al giorno
                        </p>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )
        )}

        {tab === "movimenti" && (
          filteredMovements.length === 0 ? (
            <EmptyState
              icon={ArrowUpFromLine}
              title="Nessun movimento"
              hint="Carichi e scarichi compariranno qui."
            />
          ) : (
            <div className="space-y-2">
              {filteredMovements.map((m) => <MovementRow key={m.id} m={m} />)}
            </div>
          )
        )}
      </main>

      {/* Dettaglio prodotto: lotti e storico */}
      <Sheet open={!!detail} onOpenChange={(o) => { if (!o) setDetail(null); }}>
        <SheetContent side="bottom" className="h-[80vh] rounded-t-2xl overflow-y-auto">
          {detail && (
            <>
              <SheetHeader><SheetTitle>{detail.name}</SheetTitle></SheetHeader>
              <div className="space-y-4 py-4">
                <div className="grid grid-cols-2 gap-2">
                  <Stat label="Giacenza" value={fmtQty(detail.totalQty, detail.unit)} />
                  <Stat
                    label="Esaurimento stimato"
                    value={detail.daysLeft != null ? `~${detail.daysLeft} giorni` : "—"}
                  />
                </div>

                <div>
                  <p className="text-xs font-semibold text-muted-foreground mb-2">
                    Lotti in giacenza ({detail.lots.length})
                  </p>
                  <div className="space-y-1.5">
                    {detail.lots.map((l) => (
                      <div key={l.id} className="rounded-xl border p-2.5 text-xs">
                        <div className="flex justify-between gap-2">
                          <span className="font-medium">
                            {l.lot_number ? `Lotto ${l.lot_number}` : "Senza lotto"}
                          </span>
                          <span className="font-semibold">{fmtQty(Number(l.quantity ?? 0), l.unit)}</span>
                        </div>
                        <p className="text-muted-foreground">
                          {l.storage_type}
                          {l.expiry_date ? ` · scade ${new Date(l.expiry_date).toLocaleDateString("it-IT")}` : " · senza scadenza"}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <p className="text-xs font-semibold text-muted-foreground mb-2">Storico movimenti</p>
                  <div className="space-y-2">
                    {movements.filter((m) => m.product_id === detail.productId).length === 0 ? (
                      <p className="text-xs text-muted-foreground">Nessun movimento registrato.</p>
                    ) : (
                      movements
                        .filter((m) => m.product_id === detail.productId)
                        .map((m) => <MovementRow key={m.id} m={m} />)
                    )}
                  </div>
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
};

const Stat = ({ label, value }: { label: string; value: string }) => (
  <div className="rounded-xl bg-muted p-3">
    <p className="text-[10px] font-medium text-muted-foreground">{label}</p>
    <p className="text-sm font-semibold">{value}</p>
  </div>
);

const EmptyState = ({ icon: Icon, title, hint }: { icon: typeof Package; title: string; hint: string }) => (
  <div className="flex flex-col items-center gap-2 rounded-2xl bg-white p-10 shadow-sm">
    <Icon className="h-8 w-8 text-muted-foreground" />
    <p className="text-sm font-medium" style={{ color: "#111827" }}>{title}</p>
    <p className="text-xs text-muted-foreground text-center">{hint}</p>
  </div>
);

const MovementRow = ({ m }: { m: Movement }) => {
  const Icon = movementIcon[m.movement_type] ?? SlidersHorizontal;
  const delta = Number(m.quantity_delta);
  return (
    <div className="flex items-center gap-3 rounded-xl bg-white p-3 shadow-sm">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted">
        <Icon className={`h-4 w-4 ${movementColor[m.movement_type] ?? ""}`} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium truncate" style={{ color: "#111827" }}>{m.product_name}</p>
        <p className="text-[11px] text-muted-foreground truncate">
          {MOVEMENT_LABELS[m.movement_type] ?? m.movement_type}
          {m.lot_number ? ` · lotto ${m.lot_number}` : ""}
          {m.user_name ? ` · ${m.user_name}` : ""}
        </p>
        <p className="text-[10px] text-muted-foreground">
          {new Date(m.created_at).toLocaleString("it-IT", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })}
        </p>
      </div>
      <p className={`text-sm font-bold shrink-0 ${delta > 0 ? "text-emerald-600" : "text-destructive"}`}>
        {delta > 0 ? "+" : ""}{fmtQty(delta, m.unit)}
      </p>
    </div>
  );
};

export default RestaurantStockPage;
