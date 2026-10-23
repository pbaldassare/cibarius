/**
 * Ordini ai fornitori: stati, etichette e conti condivisi fra ristorante,
 * fornitore e report. Gli stati e i passaggi ammessi li decide il database
 * (`update_supplier_order_status`); qui c'e' solo come mostrarli.
 */

export type SupplierOrderStatus = "inviato" | "confermato" | "rifiutato" | "consegnato" | "annullato";

export const ORDER_STATUS_LABELS: Record<SupplierOrderStatus, string> = {
  inviato: "Inviato",
  confermato: "Confermato",
  rifiutato: "Rifiutato",
  consegnato: "Consegnato",
  annullato: "Annullato",
};

export const ORDER_STATUS_COLORS: Record<SupplierOrderStatus, string> = {
  inviato: "bg-sky-500/10 text-sky-700 border-sky-200",
  confermato: "bg-violet-500/10 text-violet-700 border-violet-200",
  rifiutato: "bg-red-500/10 text-red-700 border-red-200",
  consegnato: "bg-emerald-500/10 text-emerald-700 border-emerald-200",
  annullato: "bg-muted text-muted-foreground",
};

/** Ordini ancora in corso: inviati o confermati, non ancora arrivati. */
export const isOpenOrder = (status: string) => status === "inviato" || status === "confermato";

export const formatEuro = (n: number) =>
  n.toLocaleString("it-IT", { style: "currency", currency: "EUR" });

export interface CartLine {
  price: number | null;
  quantity: number;
}

/** Totale del carrello come lo calcola il database: riga arrotondata al centesimo. */
export const cartTotal = (lines: CartLine[]): number =>
  lines.reduce((acc, l) => acc + (l.price === null ? 0 : Math.round(l.price * l.quantity * 100) / 100), 0);

export interface SpendOrder {
  supplier_id: string;
  supplier_name: string;
  status: string;
  total: number;
  created_at: string;
  delivered_at: string | null;
}

export interface SpendItem {
  product_name: string;
  unit: string | null;
  quantity: number;
  line_total: number | null;
}

export interface SupplierSpendReport {
  /** Speso: ordini consegnati nel periodo (per data di consegna). */
  total: number;
  deliveredCount: number;
  bySupplier: { supplierId: string; name: string; total: number; orders: number }[];
  topProducts: { name: string; unit: string | null; quantity: number; total: number }[];
  /** Ordini ancora aperti, a prescindere dal periodo. */
  open: { count: number; total: number };
}

/**
 * Spesa del ristorante sui fornitori in un intervallo [from, to).
 *
 * Conta solo gli ordini consegnati, alla data di consegna: un ordine inviato
 * o confermato non e' ancora una spesa, e uno rifiutato o annullato non lo
 * sara' mai. `itemsByOrder` sono le righe degli ordini consegnati.
 */
export const buildSupplierSpendReport = (
  orders: (SpendOrder & { id: string })[],
  itemsByOrder: Record<string, SpendItem[]>,
  from: Date,
  to: Date,
): SupplierSpendReport => {
  const inPeriod = orders.filter((o) => {
    if (o.status !== "consegnato" || !o.delivered_at) return false;
    const d = new Date(o.delivered_at);
    return d >= from && d < to;
  });

  const suppliers = new Map<string, { supplierId: string; name: string; total: number; orders: number }>();
  const products = new Map<string, { name: string; unit: string | null; quantity: number; total: number }>();
  for (const o of inPeriod) {
    const s = suppliers.get(o.supplier_id) ?? { supplierId: o.supplier_id, name: o.supplier_name, total: 0, orders: 0 };
    s.total += Number(o.total);
    s.orders++;
    suppliers.set(o.supplier_id, s);
    for (const item of itemsByOrder[o.id] ?? []) {
      const key = `${item.product_name}|${item.unit ?? ""}`;
      const p = products.get(key) ?? { name: item.product_name, unit: item.unit, quantity: 0, total: 0 };
      p.quantity += Number(item.quantity);
      p.total += Number(item.line_total ?? 0);
      products.set(key, p);
    }
  }

  const open = orders.filter((o) => isOpenOrder(o.status));
  const round = (n: number) => Math.round(n * 100) / 100;

  return {
    total: round(inPeriod.reduce((acc, o) => acc + Number(o.total), 0)),
    deliveredCount: inPeriod.length,
    bySupplier: [...suppliers.values()].map((s) => ({ ...s, total: round(s.total) })).sort((a, b) => b.total - a.total),
    topProducts: [...products.values()]
      .map((p) => ({ ...p, total: round(p.total) }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 10),
    open: { count: open.length, total: round(open.reduce((acc, o) => acc + Number(o.total), 0)) },
  };
};
