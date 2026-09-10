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
  ArrowUpFromLine, SlidersHorizontal, Clock, AlertTriangle, Plus,
} from "lucide-react";
import {
  forecastFromMovements, fmtQty, MOVEMENT_LABELS, consumeFromItem, recordMovement,
  type Movement, type MovementType,
} from "@/lib/inventory-movements";
import { loadProductIndex, resolveProduct } from "@/lib/restaurant-products";
import { fetchAllRows } from "@/lib/supabase-paging";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";

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
  const [caricoOpen, setCaricoOpen] = useState(false);
  const [scaricoLot, setScaricoLot] = useState<Lot | null>(null);
  const [qty, setQty] = useState("");
  const [busy, setBusy] = useState(false);
  // Carico rapido: nome libero, cosi' si registra merce non ancora a catalogo
  const [cNome, setCNome] = useState("");
  const [cQta, setCQta] = useState("");
  const [cUnita, setCUnita] = useState("kg");
  const [cLotto, setCLotto] = useState("");
  const [cScad, setCScad] = useState("");
  const [cStorage, setCStorage] = useState("frigo");
  const { toast } = useToast();

  const fetchAll = async () => {
    if (!restaurant) return;
    // I lotti si leggono a pagine: oltre le mille righe PostgREST tronca in
    // silenzio e le giacenze risulterebbero piu' basse del vero.
    const [lotsRes, movRes] = await Promise.all([
      fetchAllRows<Lot>((from, to) =>
        supabase
          .from("inventory_items")
          .select("id, product_id, quantity, unit, expiry_date, lot_number, storage_type, product:products(name)")
          .eq("restaurant_id", restaurant.id)
          .range(from, to) as unknown as PromiseLike<{ data: Lot[] | null; error: { message: string } | null }>,
      ),
      supabase
        .from("inventory_movements")
        .select("id, inventory_item_id, product_id, product_name, movement_type, quantity_delta, unit, lot_number, expiry_date, notes, user_name, created_at")
        .eq("restaurant_id", restaurant.id)
        .order("created_at", { ascending: false })
        .limit(500),
    ]);
    setLots(lotsRes.data);
    setMovements((movRes.data ?? []) as unknown as Movement[]);
    setLoading(false);
  };

  useEffect(() => { fetchAll(); }, [restaurant]);

  /**
   * Carico manuale: riusa il prodotto se il ristorante lo ha gia' avuto,
   * poi crea il lotto e il movimento in entrata.
   *
   * Prima creava sempre un prodotto nuovo, quindi lo stesso articolo caricato
   * due volte finiva in due righe distinte di Giacenze.
   */
  const handleCarico = async () => {
    if (!restaurant) return;
    const q = Number(cQta.replace(",", "."));
    if (!cNome.trim() || !Number.isFinite(q) || q <= 0) {
      toast({ variant: "destructive", title: "Servono nome e quantità" });
      return;
    }
    setBusy(true);
    try {
      const index = await loadProductIndex(restaurant.id);
      const { productId, error: pErr } = await resolveProduct(index, cNome.trim(), cUnita);
      if (pErr || !productId) throw new Error(pErr ?? "Prodotto non creato");

      const { data: inv, error: iErr } = await supabase.from("inventory_items").insert({
        product_id: productId,
        restaurant_id: restaurant.id,
        storage_type: cStorage,
        quantity: q,
        unit: cUnita,
        lot_number: cLotto || null,
        expiry_date: cScad || null,
      }).select("id").single();
      if (iErr || !inv) throw new Error(iErr?.message ?? "Lotto non creato");

      await recordMovement({
        restaurantId: restaurant.id,
        inventoryItemId: inv.id,
        productId,
        productName: cNome.trim(),
        movementType: "carico",
        quantity: q,
        unit: cUnita,
        lotNumber: cLotto || null,
        expiryDate: cScad || null,
      });

      toast({ title: `Caricato ${fmtQty(q, cUnita)} di ${cNome.trim()} ✓` });
      setCaricoOpen(false);
      setCNome(""); setCQta(""); setCLotto(""); setCScad("");
      await fetchAll();
    } catch (e) {
      toast({ variant: "destructive", title: "Errore", description: (e as Error).message });
    } finally {
      setBusy(false);
    }
  };

  /** Scarico di un singolo lotto, come consumo o come spreco. */
  const handleScarico = async (type: "consumo" | "spreco") => {
    if (!restaurant || !scaricoLot) return;
    const q = qty.trim() ? Number(qty.replace(",", ".")) : undefined;
    if (q != null && (!Number.isFinite(q) || q <= 0)) {
      toast({ variant: "destructive", title: "Quantità non valida" });
      return;
    }
    setBusy(true);
    const { error, remaining } = await consumeFromItem(
      { ...scaricoLot, restaurant_id: restaurant.id },
      scaricoLot.product?.name ?? "Prodotto",
      type,
      q,
    );
    setBusy(false);
    if (error) {
      toast({ variant: "destructive", title: "Errore", description: error });
      return;
    }
    toast({
      title: type === "consumo" ? "Scaricato ✓" : "Registrato come spreco 🗑",
      description: remaining > 0 ? `Restano ${fmtQty(remaining, scaricoLot.unit)}` : "Lotto esaurito",
    });
    setScaricoLot(null); setQty(""); setDetail(null);
    await fetchAll();
  };

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
    <div className="min-h-screen bg-background" data-tour="rest-stock-page">
      <MobileHeader title="Magazzino" showBack />
      <main className="px-4 py-4 pb-28 space-y-3">
        <Button onClick={() => setCaricoOpen(true)} className="w-full gap-2 h-11">
          <Plus className="h-4 w-4" /> Carico merce
        </Button>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cerca prodotto…"
            className="pl-9 bg-card"
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
                    <div className="rounded-[18px] bg-card p-3 shadow-card">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold truncate text-foreground">{row.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {row.lots.length} lott{row.lots.length === 1 ? "o" : "i"}
                          </p>
                        </div>
                        <p className="text-base font-bold shrink-0 text-foreground">
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
                      <div key={l.id} className="rounded-xl border p-2.5 text-xs space-y-2">
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
                        <Button
                          size="sm"
                          variant="outline"
                          className="w-full gap-1.5 h-8 text-xs"
                          onClick={() => { setScaricoLot(l); setQty(""); }}
                        >
                          <ArrowUpFromLine className="h-3.5 w-3.5" /> Scarica questo lotto
                        </Button>
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

      {/* Carico merce */}
      <Sheet open={caricoOpen} onOpenChange={setCaricoOpen}>
        <SheetContent side="bottom" className="rounded-t-2xl max-h-[90vh] overflow-y-auto">
          <SheetHeader><SheetTitle>Carico merce</SheetTitle></SheetHeader>
          <p className="text-xs text-muted-foreground pt-1">
            Registra merce in entrata. Per caricare un'intera bolla in un colpo solo,
            aprila da <b>Bolle</b> e usa "Carica articoli in magazzino".
          </p>
          <div className="space-y-3 py-4">
            <div className="space-y-1.5">
              <Label>Prodotto *</Label>
              <Input value={cNome} onChange={(e) => setCNome(e.target.value)} placeholder="es. Pomodori pelati" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1.5">
                <Label>Quantità *</Label>
                <Input type="number" inputMode="decimal" min="0" step="any"
                  value={cQta} onChange={(e) => setCQta(e.target.value)} placeholder="0" />
              </div>
              <div className="space-y-1.5">
                <Label>Unità</Label>
                <select
                  value={cUnita}
                  onChange={(e) => setCUnita(e.target.value)}
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                >
                  {["kg", "g", "l", "ml", "pz", "cf"].map((u) => <option key={u} value={u}>{u}</option>)}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1.5">
                <Label>Lotto</Label>
                <Input value={cLotto} onChange={(e) => setCLotto(e.target.value)} placeholder="es. L-1180-A" />
              </div>
              <div className="space-y-1.5">
                <Label>Scadenza</Label>
                <Input type="date" value={cScad} onChange={(e) => setCScad(e.target.value)} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Conservazione</Label>
              <div className="grid grid-cols-3 gap-2">
                {[["frigo", "Frigo"], ["freezer", "Congelatore"], ["ambiente", "Dispensa"]].map(([k, l]) => (
                  <button
                    key={k}
                    onClick={() => setCStorage(k)}
                    className={`h-10 rounded-lg text-xs font-medium transition-colors ${
                      cStorage === k ? "bg-primary text-primary-foreground" : "bg-card border border-border"
                    }`}
                  >{l}</button>
                ))}
              </div>
            </div>
            <Button onClick={handleCarico} disabled={busy} className="w-full gap-2">
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowDownToLine className="h-4 w-4" />}
              Registra carico
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      {/* Scarico di un lotto */}
      <Sheet open={!!scaricoLot} onOpenChange={(o) => { if (!o) { setScaricoLot(null); setQty(""); } }}>
        <SheetContent side="bottom" className="rounded-t-2xl">
          <SheetHeader>
            <SheetTitle>Scarico — {scaricoLot?.product?.name ?? "Prodotto"}</SheetTitle>
          </SheetHeader>
          {scaricoLot && (
            <div className="space-y-3 py-4">
              <p className="text-xs text-muted-foreground">
                {scaricoLot.lot_number ? `Lotto ${scaricoLot.lot_number} · ` : ""}
                disponibili <b>{fmtQty(Number(scaricoLot.quantity ?? 0), scaricoLot.unit)}</b>
              </p>
              <div className="space-y-1.5">
                <Label>Quantità da scaricare</Label>
                <Input type="number" inputMode="decimal" min="0" step="any"
                  value={qty} onChange={(e) => setQty(e.target.value)} placeholder="Tutto il lotto" />
                <p className="text-[10px] text-muted-foreground">
                  Lascia vuoto per scaricare l'intero lotto.
                </p>
              </div>
              <Button onClick={() => handleScarico("consumo")} disabled={busy} className="w-full gap-2">
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowUpFromLine className="h-4 w-4" />}
                Consumato in cucina
              </Button>
              <Button onClick={() => handleScarico("spreco")} disabled={busy} variant="outline" className="w-full gap-2">
                <Trash2 className="h-4 w-4 text-destructive" /> Buttato / spreco
              </Button>
              <p className="text-[10px] text-muted-foreground text-center">
                Consumo e spreco finiscono entrambi a registro, ma restano distinti nei report.
              </p>
            </div>
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
  <div className="flex flex-col items-center gap-2 rounded-[18px] bg-card p-10 shadow-card">
    <Icon className="h-8 w-8 text-muted-foreground" />
    <p className="text-sm font-medium text-foreground">{title}</p>
    <p className="text-xs text-muted-foreground text-center">{hint}</p>
  </div>
);

const MovementRow = ({ m }: { m: Movement }) => {
  const Icon = movementIcon[m.movement_type] ?? SlidersHorizontal;
  const delta = Number(m.quantity_delta);
  return (
    <div className="flex items-center gap-3 rounded-xl bg-card p-3 shadow-card">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted">
        <Icon className={`h-4 w-4 ${movementColor[m.movement_type] ?? ""}`} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium truncate text-foreground">{m.product_name}</p>
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
