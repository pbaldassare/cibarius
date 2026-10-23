import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, Euro, PackageCheck, Clock } from "lucide-react";
import {
  buildSupplierSpendReport, formatEuro, type SpendItem,
} from "@/lib/supplier-orders";

interface Props {
  restaurantId: string;
  month: Date;
}

interface OrderRow {
  id: string;
  supplier_id: string;
  status: string;
  total: number;
  created_at: string;
  delivered_at: string | null;
  suppliers: { name: string } | null;
}

/**
 * Spesa del ristorante sui fornitori nel mese: ordini consegnati per data di
 * consegna, per fornitore e per prodotto, piu' gli ordini ancora aperti.
 */
const SupplierSpendReport = ({ restaurantId, month }: Props) => {
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [items, setItems] = useState<Record<string, SpendItem[]>>({});
  const [loading, setLoading] = useState(true);

  const from = useMemo(() => new Date(month.getFullYear(), month.getMonth(), 1), [month]);
  const to = useMemo(() => new Date(month.getFullYear(), month.getMonth() + 1, 1), [month]);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      // Consegnati nel mese + aperti (per il riquadro "in corso").
      const [deliveredRes, openRes] = await Promise.all([
        supabase.from("supplier_orders")
          .select("id, supplier_id, status, total, created_at, delivered_at, suppliers(name)")
          .eq("restaurant_id", restaurantId).eq("status", "consegnato")
          .gte("delivered_at", from.toISOString()).lt("delivered_at", to.toISOString()),
        supabase.from("supplier_orders")
          .select("id, supplier_id, status, total, created_at, delivered_at, suppliers(name)")
          .eq("restaurant_id", restaurantId).in("status", ["inviato", "confermato"]),
      ]);
      const delivered = (deliveredRes.data ?? []) as OrderRow[];
      const ids = delivered.map((o) => o.id);
      const { data: itemRows } = ids.length
        ? await supabase.from("supplier_order_items").select("order_id, product_name, unit, quantity, line_total").in("order_id", ids)
        : { data: [] };
      const byOrder: Record<string, SpendItem[]> = {};
      for (const i of itemRows ?? []) {
        (byOrder[i.order_id] ??= []).push({
          product_name: i.product_name,
          unit: i.unit,
          quantity: Number(i.quantity),
          line_total: i.line_total === null ? null : Number(i.line_total),
        });
      }
      setOrders([...delivered, ...((openRes.data ?? []) as OrderRow[])]);
      setItems(byOrder);
      setLoading(false);
    };
    load();
  }, [restaurantId, from, to]);

  const report = useMemo(
    () => buildSupplierSpendReport(
      orders.map((o) => ({ ...o, total: Number(o.total), supplier_name: o.suppliers?.name ?? "Fornitore" })),
      items,
      from,
      to,
    ),
    [orders, items, from, to],
  );

  if (loading) {
    return <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  const stats = [
    { label: "Spesa del mese (consegnati)", value: formatEuro(report.total), icon: Euro, color: "text-primary" },
    { label: "Ordini consegnati", value: report.deliveredCount, icon: PackageCheck, color: "text-emerald-600" },
    { label: `Ordini in corso (${formatEuro(report.open.total)})`, value: report.open.count, icon: Clock, color: "text-amber-600" },
  ];

  return (
    <>
      <div className="mb-8 grid gap-4 sm:grid-cols-3">
        {stats.map(({ label, value, icon: Icon, color }) => (
          <Card key={label} className="border-border/50">
            <CardContent className="flex items-center gap-4 p-5">
              <div className={`flex h-12 w-12 items-center justify-center rounded-xl bg-muted ${color}`}>
                <Icon className="h-6 w-6" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{value}</p>
                <p className="text-sm text-muted-foreground">{label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="overflow-auto">
          <CardHeader className="pb-2"><CardTitle className="text-base">Per fornitore</CardTitle></CardHeader>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Fornitore</TableHead>
                <TableHead className="text-right">Ordini</TableHead>
                <TableHead className="text-right">Spesa</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {report.bySupplier.map((s) => (
                <TableRow key={s.supplierId}>
                  <TableCell className="text-sm font-medium">{s.name}</TableCell>
                  <TableCell className="text-right text-sm">{s.orders}</TableCell>
                  <TableCell className="text-right text-sm">{formatEuro(s.total)}</TableCell>
                </TableRow>
              ))}
              {report.bySupplier.length === 0 && (
                <TableRow><TableCell colSpan={3} className="py-8 text-center text-muted-foreground">Nessun ordine consegnato nel mese</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </Card>

        <Card className="overflow-auto">
          <CardHeader className="pb-2"><CardTitle className="text-base">Prodotti più acquistati</CardTitle></CardHeader>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Prodotto</TableHead>
                <TableHead className="text-right">Quantità</TableHead>
                <TableHead className="text-right">Spesa</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {report.topProducts.map((p) => (
                <TableRow key={`${p.name}|${p.unit}`}>
                  <TableCell className="text-sm">{p.name}</TableCell>
                  <TableCell className="text-right text-sm">{Math.round(p.quantity * 1000) / 1000} {p.unit || ""}</TableCell>
                  <TableCell className="text-right text-sm">{formatEuro(p.total)}</TableCell>
                </TableRow>
              ))}
              {report.topProducts.length === 0 && (
                <TableRow><TableCell colSpan={3} className="py-8 text-center text-muted-foreground">Nessun acquisto nel mese</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </Card>
      </div>

      <p className="mt-4 text-xs text-muted-foreground">
        Conta gli ordini fatti in app e consegnati nel mese. Gli ordini si gestiscono dall'app del ristorante, in{" "}
        <Link to="/restaurant/orders" className="underline">Ordini fornitori</Link>.
      </p>
    </>
  );
};

export default SupplierSpendReport;
