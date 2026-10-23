import { useCallback, useEffect, useState } from "react";
import MobileHeader from "@/components/MobileHeader";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Loader2, ChevronDown, ChevronUp, ClipboardList } from "lucide-react";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import {
  ORDER_STATUS_COLORS, ORDER_STATUS_LABELS, formatEuro, type SupplierOrderStatus,
} from "@/lib/supplier-orders";

interface SupplierOrder {
  id: string;
  status: SupplierOrderStatus;
  total: number;
  created_at: string;
  requested_delivery_date: string | null;
  notes: string | null;
  supplier_note: string | null;
  restaurants: { name: string; address: string | null; phone: string | null } | null;
  supplier_order_items: { id: string; product_name: string; unit: string | null; quantity: number; line_total: number | null }[];
}

type Tab = "nuovi" | "in_corso" | "chiusi";

const TAB_STATUSES: Record<Tab, SupplierOrderStatus[]> = {
  nuovi: ["inviato"],
  in_corso: ["confermato"],
  chiusi: ["consegnato", "rifiutato", "annullato"],
};

type Action = "confermato" | "rifiutato" | "consegnato";

const ACTION_LABELS: Record<Action, { title: string; button: string; notePlaceholder: string }> = {
  confermato: { title: "Conferma ordine", button: "Conferma", notePlaceholder: "Es. consegna domani alle 8 (facoltativa)" },
  rifiutato: { title: "Rifiuta ordine", button: "Rifiuta", notePlaceholder: "Motivo, es. prodotto esaurito" },
  consegnato: { title: "Segna come consegnato", button: "Consegnato", notePlaceholder: "Nota per il ristorante (facoltativa)" },
};

/** Ordini ricevuti dal fornitore: conferma, rifiuta, consegna. */
const SupplierOrdersPage = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [orders, setOrders] = useState<SupplierOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>("nuovi");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [action, setAction] = useState<{ order: SupplierOrder; status: Action } | null>(null);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!user) return;
    const { data: supplier } = await supabase.from("suppliers").select("id").eq("owner_user_id", user.id).maybeSingle();
    if (!supplier) {
      setLoading(false);
      return;
    }
    const { data } = await supabase
      .from("supplier_orders")
      .select("id, status, total, created_at, requested_delivery_date, notes, supplier_note, restaurants(name, address, phone), supplier_order_items(id, product_name, unit, quantity, line_total)")
      .eq("supplier_id", supplier.id)
      .order("created_at", { ascending: false })
      .limit(200);
    setOrders((data ?? []) as SupplierOrder[]);
    setLoading(false);
  }, [user]);

  useEffect(() => { load(); }, [load]);

  const runAction = async () => {
    if (!action) return;
    if (action.status === "rifiutato" && !note.trim()) {
      toast({ variant: "destructive", title: "Scrivi il motivo del rifiuto" });
      return;
    }
    setBusy(true);
    const { error } = await supabase.rpc("update_supplier_order_status", {
      _order_id: action.order.id,
      _status: action.status,
      _note: note.trim() || null,
    });
    setBusy(false);
    if (error) {
      toast({ variant: "destructive", title: "Errore", description: error.message });
      return;
    }
    toast({ title: `Ordine ${ORDER_STATUS_LABELS[action.status].toLowerCase()}`, description: "Il ristorante riceve una notifica." });
    setAction(null);
    setNote("");
    load();
  };

  const counts = Object.fromEntries(
    (Object.keys(TAB_STATUSES) as Tab[]).map((t) => [t, orders.filter((o) => TAB_STATUSES[t].includes(o.status)).length]),
  ) as Record<Tab, number>;
  const visible = orders.filter((o) => TAB_STATUSES[tab].includes(o.status));

  return (
    <div>
      <MobileHeader title="Ordini" />
      <main className="space-y-4 px-4 py-5">
        <div className="flex gap-2">
          {([["nuovi", "Nuovi"], ["in_corso", "Da consegnare"], ["chiusi", "Chiusi"]] as [Tab, string][]).map(([t, label]) => (
            <Button key={t} size="sm" variant={tab === t ? "default" : "outline"} onClick={() => setTab(t)}>
              {label}{counts[t] > 0 && t !== "chiusi" ? ` (${counts[t]})` : ""}
            </Button>
          ))}
        </div>

        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
        ) : visible.length === 0 ? (
          <Card>
            <CardContent className="space-y-2 py-10 text-center">
              <ClipboardList className="mx-auto h-10 w-10 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Nessun ordine in questa sezione.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {visible.map((o) => {
              const open = expanded === o.id;
              return (
                <Card key={o.id}>
                  <CardContent className="space-y-3 p-4">
                    <button className="flex w-full items-center gap-3 text-left" onClick={() => setExpanded(open ? null : o.id)} aria-expanded={open}>
                      <div className="min-w-0 flex-1 space-y-1">
                        <div className="flex items-center gap-2">
                          <p className="truncate text-sm font-semibold text-foreground">{o.restaurants?.name ?? "Ristorante"}</p>
                          <Badge variant="outline" className={ORDER_STATUS_COLORS[o.status]}>{ORDER_STATUS_LABELS[o.status]}</Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(o.created_at), "d MMM HH:mm", { locale: it })} · {o.supplier_order_items.length} prodotti · {formatEuro(Number(o.total))}
                          {o.requested_delivery_date && ` · consegna ${format(new Date(`${o.requested_delivery_date}T12:00:00`), "EEE d MMM", { locale: it })}`}
                        </p>
                      </div>
                      {open ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                    </button>

                    {open && (
                      <>
                        <div className="divide-y divide-border rounded-lg border border-border text-sm">
                          {o.supplier_order_items.map((i) => (
                            <div key={i.id} className="flex items-center justify-between gap-2 p-2">
                              <span className="min-w-0 flex-1 truncate">{i.product_name}</span>
                              <span className="text-muted-foreground">{Number(i.quantity)} {i.unit || "u"}</span>
                              <span className="w-20 text-right">{i.line_total === null ? "—" : formatEuro(Number(i.line_total))}</span>
                            </div>
                          ))}
                        </div>
                        {(o.restaurants?.address || o.restaurants?.phone) && (
                          <p className="text-xs text-muted-foreground">{[o.restaurants?.address, o.restaurants?.phone].filter(Boolean).join(" · ")}</p>
                        )}
                        {o.notes && <p className="rounded-lg bg-muted/60 p-2 text-xs"><strong>Note del ristorante:</strong> {o.notes}</p>}
                        {o.supplier_note && <p className="rounded-lg bg-primary/5 p-2 text-xs"><strong>Tua nota:</strong> {o.supplier_note}</p>}
                        {o.status === "inviato" && (
                          <div className="flex gap-2">
                            <Button className="flex-1" onClick={() => setAction({ order: o, status: "confermato" })}>Conferma</Button>
                            <Button variant="outline" className="flex-1 text-destructive hover:text-destructive" onClick={() => setAction({ order: o, status: "rifiutato" })}>Rifiuta</Button>
                          </div>
                        )}
                        {(o.status === "inviato" || o.status === "confermato") && (
                          <Button variant={o.status === "confermato" ? "default" : "outline"} className="w-full" onClick={() => setAction({ order: o, status: "consegnato" })}>
                            Segna come consegnato
                          </Button>
                        )}
                      </>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </main>

      <Dialog open={!!action} onOpenChange={(o) => { if (!o) { setAction(null); setNote(""); } }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{action && ACTION_LABELS[action.status].title}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            {action?.order.restaurants?.name} · {action && formatEuro(Number(action.order.total))}
          </p>
          <Textarea rows={3} placeholder={action ? ACTION_LABELS[action.status].notePlaceholder : ""} value={note} onChange={(e) => setNote(e.target.value)} />
          <DialogFooter>
            <Button variant="outline" onClick={() => { setAction(null); setNote(""); }}>Indietro</Button>
            <Button onClick={runAction} disabled={busy}>
              {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {action && ACTION_LABELS[action.status].button}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SupplierOrdersPage;
