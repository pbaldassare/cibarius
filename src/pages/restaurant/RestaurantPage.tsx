import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import RestaurantSubscriptionBanner from "@/components/RestaurantSubscriptionBanner";
import { useNavigate, Link } from "react-router-dom";
import { useRestaurant } from "@/hooks/useRestaurant";
import { useAuth } from "@/hooks/useAuth";
import MobileHeader from "@/components/MobileHeader";
import { supabase } from "@/integrations/supabase/client";
import { consumeFromItem, consumeFromPreparation } from "@/lib/inventory-movements";
import { buildAgenda, groupCategories } from "@/lib/haccp-schedule";
import { fetchAllRows } from "@/lib/supabase-paging";
import { Skeleton } from "@/components/ui/skeleton";
import RestaurantAddFlow from "@/components/RestaurantAddFlow";
import ResolveExpiryFlow from "@/components/ResolveExpiryFlow";
import { useToast } from "@/hooks/use-toast";
import {
  Loader2, Clock, AlertCircle, Package, Plus, ChevronRight,
  ChefHat, FileText, Upload, User, Settings, Zap,
  ClipboardCheck, CheckCircle2, AlertTriangle, Circle,
  Thermometer, Wind, Flame, Trash2, UtensilsCrossed, QrCode, BookOpen,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { getFoodEmoji } from "@/lib/food-images";
import { format } from "date-fns";

/* ─── types ─── */
interface InventoryItem {
  id: string;
  product_id: string | null;
  expiry_date: string | null;
  storage_type: string;
  quantity: number | null;
  unit: string | null;
  lot_number: string | null;
  product: { name: string; image_url: string | null };
}

interface PrepItem {
  id: string;
  name: string;
  use_by_date: string;
  storage_type: string;
  portions: number | null;
}

interface HaccpTask {
  id: string;
  name: string;
  category: string;
  frequency: string;
  custom_interval_days: number | null;
  created_at: string;
}

interface HaccpLog {
  id: string;
  task_id: string;
  log_date: string;
  status: string;
}

/** Giorni di arretrato mostrati sul cruscotto. */
const HACCP_LOOKBACK_DAYS = 14;

const TEMP_CATEGORIES = ["celle_frigo", "frigoriferi", "freezer", "controllo_temperatura", "temperature"];

type ExpiryStatus = "expired" | "expiring" | "ok" | "nodate";

/** Riga della lista "Urgenti cucina". */
interface UrgentItem {
  id: string;
  name: string;
  image_url: string | null;
  date: string | null;
  storage: string;
  status: ExpiryStatus;
  type: "inv" | "prep";
  product_id?: string | null;
  quantity?: number | null;
  unit?: string | null;
  lot_number?: string | null;
}

const getStatus = (d: string | null): ExpiryStatus => {
  if (!d) return "nodate";
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const diff = (new Date(d).getTime() - today.getTime()) / 864e5;
  if (diff < 0) return "expired";
  if (diff <= 3) return "expiring";
  return "ok";
};

const statusCfg: Record<ExpiryStatus, { label: string; color: string; barColor: string }> = {
  expired:  { label: "Scaduto",     color: "hsl(1,76%,55%)",   barColor: "bg-destructive" },
  expiring: { label: "In scadenza", color: "hsl(37,90%,51%)",  barColor: "bg-warning" },
  ok:       { label: "OK",          color: "hsl(152,56%,46%)", barColor: "bg-success" },
  nodate:   { label: "Senza data",  color: "hsl(215,10%,62%)", barColor: "bg-muted-foreground" },
};

const storageLabel: Record<string, string> = {
  frigo: "Frigo", freezer: "Congelatore", ambiente: "Dispensa",
};

/**
 * Scorciatoie del cruscotto.
 *
 * Cappe, Forni e Celle frigo puntavano tutte e tre alla stessa lista HACCP
 * senza filtro, e le prime due a categorie che non esistono in nessun
 * template. Ora ogni voce porta davvero dove promette: i gruppi HACCP
 * arrivano alla pagina controlli gia' filtrata, e quelli senza nemmeno
 * un'attivita' configurata non vengono proposti (portavano a una lista vuota).
 */
const QUICK_ACTIONS = [
  { label: "Controlli oggi", icon: ClipboardCheck, to: "/restaurant/haccp", color: "text-primary", bg: "bg-primary/10" },
  { label: "Temperature", icon: Thermometer, to: "/restaurant/haccp?gruppo=temperature", group: "temperature", color: "text-sky-600", bg: "bg-sky-500/10" },
  { label: "Pulizie", icon: Wind, to: "/restaurant/haccp?gruppo=pulizie", group: "pulizie", color: "text-violet-600", bg: "bg-violet-500/10" },
  { label: "Attrezzature", icon: Flame, to: "/restaurant/haccp?gruppo=attrezzature", group: "attrezzature", color: "text-orange-600", bg: "bg-orange-500/10" },
  { label: "Scadenze", icon: Clock, to: "/restaurant/products", color: "text-amber-600", bg: "bg-amber-500/10" },
  { label: "Magazzino", icon: Package, to: "/restaurant/stock", color: "text-indigo-600", bg: "bg-indigo-500/10" },
  { label: "Etichette HACCP", icon: QrCode, to: "/restaurant/haccp-labels", color: "text-emerald-600", bg: "bg-emerald-500/10" },
  { label: "Ricette", icon: BookOpen, to: "/restaurant/recipes", color: "text-rose-600", bg: "bg-rose-500/10" },
];

const RestaurantPage = () => {
  const { restaurant, isLoading: restLoading } = useRestaurant();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [items, setItems] = useState<InventoryItem[]>([]);
  const [preps, setPreps] = useState<PrepItem[]>([]);
  const [haccpTasks, setHaccpTasks] = useState<HaccpTask[]>([]);
  const [haccpLogs, setHaccpLogs] = useState<HaccpLog[]>([]);
  const [docCount, setDocCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [addFoodOpen, setAddFoodOpen] = useState(false);
  const [resolveOpen, setResolveOpen] = useState(false);
  /** Elemento in attesa di conferma per lo scarto. */
  const [daButtare, setDaButtare] = useState<UrgentItem | null>(null);
  const { toast } = useToast();

  const today = new Date();
  const todayStr = format(today, "yyyy-MM-dd");

  const fetchData = async () => {
    if (!restaurant) return;
    const lookbackFrom = format(new Date(Date.now() - HACCP_LOOKBACK_DAYS * 86400000), "yyyy-MM-dd");

    const [invRes, prepRes, docRes, tasksRes, logsRes] = await Promise.all([
      // A pagine: oltre i mille lotti PostgREST tronca senza segnalarlo e i
      // contatori delle scadenze risulterebbero piu' bassi del vero.
      fetchAllRows<InventoryItem>((from, to) =>
        supabase
          .from("inventory_items")
          .select("id, product_id, expiry_date, storage_type, quantity, unit, lot_number, product:products(name, image_url)")
          .eq("restaurant_id", restaurant.id)
          .order("expiry_date", { ascending: true, nullsFirst: false })
          .range(from, to) as unknown as PromiseLike<{ data: InventoryItem[] | null; error: { message: string } | null }>,
      ),
      supabase
        .from("preparations")
        .select("id, name, use_by_date, storage_type, portions")
        .eq("restaurant_id", restaurant.id)
        .order("use_by_date", { ascending: true }),
      supabase
        .from("haccp_documents")
        .select("id", { count: "exact", head: true })
        .eq("restaurant_id", restaurant.id),
      supabase
        .from("haccp_tasks")
        .select("id, name, category, frequency, custom_interval_days, created_at")
        .eq("restaurant_id", restaurant.id)
        .eq("is_active", true)
        .order("sort_order"),
      supabase
        .from("haccp_logs")
        .select("id, task_id, log_date, status")
        .eq("restaurant_id", restaurant.id)
        .gte("log_date", lookbackFrom),
    ]);
    setItems(invRes.data);
    if (prepRes.data) setPreps(prepRes.data as unknown as PrepItem[]);
    if (tasksRes.data) setHaccpTasks(tasksRes.data as HaccpTask[]);
    if (logsRes.data) setHaccpLogs(logsRes.data as HaccpLog[]);
    setDocCount(docRes.count ?? 0);
    setLoading(false);
  };

  useEffect(() => { if (restaurant) fetchData(); }, [restaurant]);

  /**
   * Controlli di oggi piu' quelli rimasti indietro.
   *
   * Prima si guardava solo la giornata corrente, quindi un controllo
   * settimanale saltato il lunedi' spariva dal cruscotto il martedi'.
   */
  const agenda = useMemo(
    () => buildAgenda(haccpTasks, haccpLogs, today, HACCP_LOOKBACK_DAYS),
    [haccpTasks, haccpLogs, todayStr],
  );

  /** Controlli di oggi che si trascinano da giorni, per il riepilogo. */
  const staleCount = useMemo(
    () => agenda.todayPending.filter((p) => p.missedCount > 1).length,
    [agenda],
  );

  const longestGap = useMemo(
    () => agenda.todayPending.reduce((max, p) => Math.max(max, p.missedCount - 1), 0),
    [agenda],
  );

  /** Scorciatoie proposte: si tolgono i gruppi HACCP senza attivita'. */
  const quickActions = useMemo(() => {
    const presenti = new Set(haccpTasks.map((t) => t.category));
    return QUICK_ACTIONS.filter(
      (a) => !a.group || groupCategories(a.group).some((c) => presenti.has(c)),
    );
  }, [haccpTasks]);

  const tempPendingCount = useMemo(
    () => [...agenda.todayPending, ...agenda.overdue]
      .filter(({ task }) => TEMP_CATEGORIES.includes(task.category)).length,
    [agenda],
  );

  // Inventory counts
  const counts = useMemo(() => {
    let expired = 0, expiring = 0, nodate = 0;
    items.forEach((i) => {
      const s = getStatus(i.expiry_date);
      if (s === "expired") expired++;
      else if (s === "expiring") expiring++;
      else if (s === "nodate") nodate++;
    });
    preps.forEach((p) => {
      const s = getStatus(p.use_by_date);
      if (s === "expired") expired++;
      else if (s === "expiring") expiring++;
    });
    return { expired, expiring, nodate, total: expired + expiring + nodate };
  }, [items, preps]);

  // Urgent list
  /**
   * Lo swipe scarica l'intero lotto, ma ora "utilizzato" e "buttato" sono due
   * movimenti distinti a registro invece della stessa DELETE indistinta.
   * Per scaricare solo una parte si passa dalla scheda scadenze.
   */
  const handleScarico = async (
    item: { id: string; name: string; type: "inv" | "prep"; product_id?: string | null;
            quantity?: number | null; unit?: string | null; lot_number?: string | null; date: string | null },
    movementType: "consumo" | "spreco",
  ) => {
    if (!restaurant) return;

    if (item.type === "inv") {
      const { error } = await consumeFromItem(
        {
          id: item.id,
          restaurant_id: restaurant.id,
          product_id: item.product_id,
          quantity: item.quantity,
          unit: item.unit,
          lot_number: item.lot_number,
          expiry_date: item.date,
        },
        item.name,
        movementType,
      );
      if (error) {
        toast({ variant: "destructive", title: "Errore", description: error });
        return;
      }
    } else {
      const { error } = await consumeFromPreparation(
        {
          id: item.id,
          restaurant_id: restaurant.id,
          quantity: item.quantity,
          unit: item.unit,
          lot_number: item.lot_number,
          expiry_date: item.date,
        },
        item.name,
        movementType,
      );
      if (error) {
        toast({ variant: "destructive", title: "Errore", description: error });
        return;
      }
    }

    toast({ title: movementType === "consumo" ? "Segnato come utilizzato ✓" : "Segnato come buttato 🗑" });
    fetchData();
  };

  const urgentList = useMemo(() => {
    const list: UrgentItem[] = [];
    items.forEach((i) => {
      const s = getStatus(i.expiry_date);
      if (s === "expired" || s === "expiring")
        list.push({ id: i.id, name: i.product.name, image_url: i.product.image_url, date: i.expiry_date, storage: i.storage_type, status: s, type: "inv",
                    product_id: i.product_id, quantity: i.quantity, unit: i.unit, lot_number: i.lot_number });
    });
    preps.forEach((p) => {
      const s = getStatus(p.use_by_date);
      if (s === "expired" || s === "expiring")
        list.push({ id: p.id, name: p.name, image_url: null, date: p.use_by_date, storage: p.storage_type, status: s, type: "prep",
                    quantity: p.portions, unit: "porzioni" });
    });
    list.sort((a, b) => {
      if (a.status !== b.status) return a.status === "expired" ? -1 : 1;
      if (a.date && b.date) return a.date.localeCompare(b.date);
      return 0;
    });
    return list.slice(0, 8);
  }, [items, preps]);

  if (restLoading || loading) {
    return (
      <div className="min-h-screen bg-background">
        <MobileHeader title="" />
        <main className="space-y-3 px-4 py-3 pb-28">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-28 w-full rounded-[14px]" />
          <Skeleton className="h-20 w-full rounded-[14px]" />
          <Skeleton className="h-60 w-full rounded-[14px]" />
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background" data-tour="rest-greeting">
      <MobileHeader title={restaurant?.name ?? "Dashboard"} />
      <main className="space-y-3 px-4 pt-1 pb-28">
        <RestaurantSubscriptionBanner />

        {/* Top bar */}
        <div className="flex gap-2" data-tour="rest-topbar">
          <button
            onClick={() => navigate("/restaurant/profile")}
            className="flex items-center gap-2 rounded-[12px] bg-card shadow-card px-3 py-2 flex-1 text-left active:scale-[0.98] transition-transform"
          >
            <User className="h-4 w-4 text-muted-foreground" />
            <span className="text-[13px] font-medium text-foreground">Profilo</span>
          </button>
          <Link
            to="/restaurant-admin"
            className="flex items-center gap-2 rounded-[12px] bg-card shadow-card px-3 py-2 flex-1 active:scale-[0.98] transition-transform"
          >
            <Settings className="h-4 w-4 text-muted-foreground" />
            <span className="text-[13px] font-medium text-foreground">Backoffice</span>
          </Link>
        </div>

        {/* ═══ Expiry counters (moved up) ═══ */}
        <div className="rounded-[14px] bg-card shadow-card p-3.5" data-tour="rest-expiry-card">
          <div className="flex items-center justify-between mb-2.5">
            <h3 className="text-[15px] font-semibold text-foreground">Scadenze</h3>
            <button onClick={() => navigate("/restaurant/products")} className="text-[12px] font-medium text-primary flex items-center gap-0.5">
              Apri <ChevronRight className="h-3 w-3" />
            </button>
          </div>
          <div className="grid grid-cols-3 gap-2 mb-3">
            {[
              { n: counts.expired, label: "Scaduti", color: "hsl(1,76%,55%)", bg: "hsl(1,76%,55%,0.08)" },
              { n: counts.expiring, label: "In scadenza", color: "hsl(37,90%,51%)", bg: "hsl(37,90%,51%,0.08)" },
              { n: counts.nodate, label: "Senza data", color: "hsl(215,10%,62%)", bg: "hsl(215,10%,62%,0.08)" },
            ].map(({ n, label, color, bg }) => (
              <div key={label} className="rounded-[10px] px-2 py-2 text-center" style={{ backgroundColor: bg }}>
                <p className="text-[22px] font-bold leading-none mb-0.5" style={{ color }}>{n}</p>
                <p className="text-[10px] font-medium text-muted-foreground">{label}</p>
              </div>
            ))}
          </div>

          {counts.total > 0 && (
            <button
              onClick={() => setResolveOpen(true)}
              className="flex w-full items-center justify-center gap-2 rounded-[10px] py-2.5 text-[14px] font-semibold text-primary-foreground bg-primary active:scale-[0.97] transition-all"
            >
              <Zap className="h-4 w-4" strokeWidth={2.2} />
              Gestisci scadenze · {counts.total}
            </button>
          )}
        </div>

        {/* ═══ HACCP TODAY ═══ */}
        <div className="rounded-[14px] bg-card shadow-card p-3.5" data-tour="rest-haccp-card">
          <div className="flex items-center justify-between mb-2.5">
            <h3 className="text-[15px] font-semibold text-foreground flex items-center gap-2">
              <ClipboardCheck className="h-4 w-4 text-primary" />
              Controlli HACCP oggi
            </h3>
            <button onClick={() => navigate("/restaurant/haccp")} className="text-[12px] font-medium text-primary flex items-center gap-0.5">
              Apri <ChevronRight className="h-3 w-3" />
            </button>
          </div>

          {/* Distinguere "non configurato" da "oggi non c'e' nulla in scadenza":
              con soli controlli settimanali, un martedi' senza arretrati non
              significa che l'HACCP non sia impostato. */}
          {haccpTasks.length === 0 ? (
            <div className="text-center py-4">
              <p className="text-sm text-muted-foreground mb-2">Nessuna attività configurata</p>
              <Link to="/restaurant/haccp/setup">
                <button className="text-sm font-medium text-primary">Configura HACCP →</button>
              </Link>
            </div>
          ) : (
            <>
              {/* Avanzamento di oggi */}
              {agenda.todayTotal > 0 && (
                <div className="flex items-center gap-3 mb-3">
                  <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full rounded-full bg-primary transition-all duration-500"
                      style={{ width: `${(agenda.todayDone / agenda.todayTotal) * 100}%` }}
                    />
                  </div>
                  <span className="text-sm font-bold text-foreground">
                    {agenda.todayDone}/{agenda.todayTotal}
                  </span>
                </div>
              )}

              {/* Controlli di oggi ancora aperti */}
              {agenda.todayPending.length > 0 && (
                <div className="space-y-1.5 mb-2">
                  {agenda.todayPending.slice(0, 5).map(({ task, missedCount }) => (
                    <button
                      key={task.id}
                      onClick={() => navigate("/restaurant/haccp")}
                      className="flex items-center gap-2 w-full rounded-[10px] bg-destructive/5 border border-destructive/10 px-3 py-2 text-left active:scale-[0.98] transition-transform"
                    >
                      <Circle className="h-4 w-4 text-destructive/60 shrink-0" />
                      <span className="text-[13px] font-medium text-foreground truncate">{task.name}</span>
                      <Badge variant="outline" className="ml-auto text-[10px] text-destructive border-destructive/20 shrink-0">
                        Da fare
                      </Badge>
                    </button>
                  ))}
                  {agenda.todayPending.length > 5 && (
                    <p className="text-xs text-muted-foreground text-center">
                      +{agenda.todayPending.length - 5} altri controlli
                    </p>
                  )}

                  {/* Il pregresso si dice una volta sola: ripeterlo su ogni
                      riga riempiva la scheda di badge identici. */}
                  {staleCount > 0 && (
                    <p className="text-[11px] font-medium text-foreground bg-warning/15 rounded-[8px] px-2.5 py-1.5">
                      {staleCount === 1
                        ? `Un controllo non viene registrato da ${longestGap} giorni`
                        : `${staleCount} controlli non vengono registrati da giorni`}
                    </p>
                  )}
                </div>
              )}

              {/* Arretrati: restano visibili finche' non vengono registrati */}
              {agenda.overdue.length > 0 && (
                <div className="space-y-1.5 mb-2">
                  <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">
                    Arretrati
                  </p>
                  {agenda.overdue.slice(0, 4).map(({ task, daysLate }) => (
                    <button
                      key={task.id}
                      onClick={() => navigate("/restaurant/haccp")}
                      className="flex items-center gap-2 w-full rounded-[10px] bg-warning/10 border border-warning/20 px-3 py-2 text-left active:scale-[0.98] transition-transform"
                    >
                      <AlertTriangle className="h-4 w-4 text-warning shrink-0" />
                      <span className="text-[13px] font-medium text-foreground truncate">{task.name}</span>
                      <Badge variant="outline" className="ml-auto text-[10px] shrink-0">
                        {daysLate === 1 ? "ieri" : `${daysLate} giorni fa`}
                      </Badge>
                    </button>
                  ))}
                  {agenda.overdue.length > 4 && (
                    <p className="text-xs text-muted-foreground text-center">
                      +{agenda.overdue.length - 4} altri arretrati
                    </p>
                  )}
                </div>
              )}

              {/* Riepilogo temperature ancora da rilevare */}
              {tempPendingCount > 0 && (
                <div className="flex items-center gap-2 rounded-[12px] bg-sky-500/10 border border-sky-200/50 px-3 py-2.5">
                  <Thermometer className="h-4 w-4 text-sky-600 shrink-0" />
                  <span className="text-[13px] font-medium text-foreground">
                    {tempPendingCount} controlli temperatura da completare
                  </span>
                </div>
              )}

              {/* Tutto in regola */}
              {agenda.todayPending.length === 0 && agenda.overdue.length === 0 && (
                <div className="flex items-center gap-2 rounded-[10px] bg-primary/5 border border-primary/10 px-3 py-3">
                  <CheckCircle2 className="h-5 w-5 text-primary" />
                  <span className="text-sm font-medium text-foreground">Tutti i controlli completati!</span>
                </div>
              )}
            </>
          )}
        </div>

        {/* ═══ Quick Actions ═══ */}
        <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-hide" data-tour="rest-quick-actions">
          {quickActions.map(({ label, icon: Icon, to, color, bg }) => (
            <button
              key={label}
              onClick={() => navigate(to)}
              className="flex flex-col items-center gap-1.5 rounded-[12px] bg-card shadow-card px-3 py-2.5 min-w-[72px] active:scale-[0.96] transition-transform"
            >
              <div className={`flex h-9 w-9 items-center justify-center rounded-[8px] ${bg}`}>
                <Icon className={`h-4 w-4 ${color}`} />
              </div>
              <span className="text-[10px] font-medium text-foreground text-center leading-tight">{label}</span>
            </button>
          ))}
        </div>

        {/* ═══ Quick rows: Produzione + Bolle (solo navigazione) ═══ */}
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => navigate("/restaurant/preparations")}
            className="rounded-[14px] bg-card shadow-card p-3.5 text-left active:scale-[0.98] transition-transform"
            data-tour="rest-production-card"
          >
            <div className="flex items-center gap-2 mb-1">
              <div className="flex h-8 w-8 items-center justify-center rounded-[8px] bg-accent/10">
                <ChefHat className="h-4 w-4 text-accent" />
              </div>
              <p className="text-[13px] font-semibold text-foreground leading-tight">Produzione</p>
            </div>
            <p className="text-[11px] text-muted-foreground">Preparazioni e semilavorati</p>
          </button>
          <button
            onClick={() => navigate("/restaurant/invoices")}
            className="rounded-[14px] bg-card shadow-card p-3.5 text-left active:scale-[0.98] transition-transform"
            data-tour="rest-invoices-card"
          >
            <div className="flex items-center gap-2 mb-1">
              <div className="flex h-8 w-8 items-center justify-center rounded-[8px] bg-success/10">
                <FileText className="h-4 w-4 text-success" />
              </div>
              <p className="text-[13px] font-semibold text-foreground leading-tight">Bolle</p>
            </div>
            <p className="text-[11px] text-muted-foreground">{docCount} documenti</p>
          </button>
        </div>

        {/* ═══ Urgenti cucina — swipeable ═══ */}
        {urgentList.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-2 px-0.5">
              <h3 className="text-[14px] font-semibold text-foreground flex items-center gap-1.5">
                <AlertCircle className="h-4 w-4 text-destructive" strokeWidth={2} />
                Urgenti cucina
              </h3>
              <span className="text-[11px] text-muted-foreground">{urgentList.length} elementi</span>
            </div>
            <div className="space-y-1">
              {urgentList.map((item) => (
                <SwipeableUrgentItem
                  key={`${item.type}-${item.id}`}
                  item={item}
                  onConsumed={() => handleScarico(item, "consumo")}
                  onDiscarded={() => setDaButtare(item)}
                />
              ))}
            </div>
          </div>
        )}

        {urgentList.length === 0 && counts.total === 0 && (
          <div className="flex items-center gap-3 rounded-[14px] bg-primary/5 border border-primary/10 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
              <Package className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-[14px] font-medium text-foreground">Tutto in ordine</p>
              <p className="text-[12px] text-muted-foreground">Nessun prodotto urgente in cucina</p>
            </div>
          </div>
        )}
      </main>

      {/* FAB */}
      <div className="fixed bottom-[calc(68px+env(safe-area-inset-bottom,0px)+0.75rem)] right-3.5 z-40">
        <button
          onClick={() => setAddFoodOpen(true)}
          className="flex h-12 w-12 items-center justify-center rounded-full shadow-elevated active:scale-95 transition-all bg-primary"
          aria-label="Aggiungi prodotto"
        >
          <Plus className="h-5 w-5 text-primary-foreground" strokeWidth={2.2} />
        </button>
      </div>

      <RestaurantAddFlow
        open={addFoodOpen}
        onOpenChange={setAddFoodOpen}
        restaurantId={restaurant?.id ?? ""}
        onComplete={fetchData}
      />

      {/*
        Conferma per lo scarto.
        Lo swipe e il pulsante scaricano l'intero lotto: senza una domanda,
        un tocco sbagliato buttava via tutta la merce senza modo di tornare
        indietro, perche' il registro movimenti e' append-only.
      */}
      <AlertDialog open={!!daButtare} onOpenChange={(o) => { if (!o) setDaButtare(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Buttare {daButtare?.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              {daButtare?.quantity
                ? `Vengono registrati come spreco ${daButtare.quantity} ${daButtare.unit ?? ""} e il lotto esce dal magazzino.`
                : "Il lotto viene registrato come spreco ed esce dal magazzino."}
              {" "}Per scaricarne solo una parte usa il Magazzino.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annulla</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                const item = daButtare;
                setDaButtare(null);
                if (item) handleScarico(item, "spreco");
              }}
            >
              Butta
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {restaurant && (
        <ResolveExpiryFlow
          open={resolveOpen}
          onOpenChange={setResolveOpen}
          restaurantId={restaurant.id}
          onComplete={fetchData}
        />
      )}
    </div>
  );
};

/* ═══ Swipeable urgent item ═══ */
interface SwipeableProps {
  item: { id: string; name: string; image_url: string | null; date: string | null; storage: string; status: "expired" | "expiring" | "ok" | "nodate"; type: "inv" | "prep" };
  onConsumed: () => void;
  onDiscarded: () => void;
}

const SwipeableUrgentItem = ({ item, onConsumed, onDiscarded }: SwipeableProps) => {
  const cfg = statusCfg[item.status];
  const touchStartRef = useRef<{ x: number; t: number } | null>(null);
  const [offsetX, setOffsetX] = useState(0);
  const [swiped, setSwiped] = useState<"left" | "right" | null>(null);

  const onTouchStart = (e: React.TouchEvent) => {
    touchStartRef.current = { x: e.touches[0].clientX, t: Date.now() };
  };
  const onTouchMove = (e: React.TouchEvent) => {
    if (!touchStartRef.current) return;
    setOffsetX(e.touches[0].clientX - touchStartRef.current.x);
  };
  const onTouchEnd = () => {
    if (!touchStartRef.current) return;
    const threshold = 80;
    if (offsetX > threshold) {
      setSwiped("right");
      setTimeout(onConsumed, 250);
    } else if (offsetX < -threshold) {
      setSwiped("left");
      setTimeout(onDiscarded, 250);
    } else {
      setOffsetX(0);
    }
    touchStartRef.current = null;
  };

  const bgReveal = offsetX > 40 ? "bg-success/20" : offsetX < -40 ? "bg-destructive/20" : "bg-transparent";

  return (
    <div className={`relative rounded-[12px] overflow-hidden ${bgReveal} transition-colors`}>
      {/* Reveal labels behind */}
      {offsetX > 20 && (
        <div className="absolute inset-y-0 left-0 flex items-center pl-4 z-0">
          <span className="flex items-center gap-1 text-success font-semibold text-[12px]">
            <UtensilsCrossed className="h-4 w-4" /> Utilizzato
          </span>
        </div>
      )}
      {offsetX < -20 && (
        <div className="absolute inset-y-0 right-0 flex items-center pr-4 z-0">
          <span className="flex items-center gap-1 text-destructive font-semibold text-[12px]">
            Buttato <Trash2 className="h-4 w-4" />
          </span>
        </div>
      )}

      <div
        className="relative z-10 flex items-center gap-2 rounded-[12px] bg-card px-3 py-2 shadow-card touch-pan-y"
        style={{
          transform: swiped === "right" ? "translateX(120%)" : swiped === "left" ? "translateX(-120%)" : `translateX(${offsetX}px)`,
          opacity: swiped ? 0 : 1,
          transition: offsetX === 0 || swiped ? "transform 0.25s ease, opacity 0.25s" : "none",
        }}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        <div className={`w-[3px] self-stretch rounded-full ${cfg.barColor}`} />
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[8px] bg-secondary overflow-hidden">
          {item.image_url ? (
            <img src={item.image_url} alt="" className="h-full w-full object-cover" />
          ) : item.type === "prep" ? (
            <ChefHat className="h-4 w-4 text-muted-foreground" />
          ) : (
            <span className="text-lg">{getFoodEmoji(null, item.name)}</span>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[13px] font-medium truncate text-foreground">{item.name}</p>
          <div className="flex items-center gap-1.5 mt-0.5">
            {item.date && (
              <span className="text-[11px] flex items-center gap-0.5 text-muted-foreground">
                <Clock className="h-2.5 w-2.5" />
                {new Date(item.date).toLocaleDateString("it-IT")}
              </span>
            )}
            <span className="text-[10px] text-muted-foreground">{storageLabel[item.storage] ?? item.storage}</span>
            {item.type === "prep" && (
              <span className="text-[9px] font-semibold px-1 py-0.5 rounded bg-accent/10 text-accent">PREP</span>
            )}
          </div>
        </div>
        {/*
          Alternativa allo swipe.
          Erano due cerchi da 28px appaiati a 4px di distanza, con lo scarto
          accanto al consumo e nessuna conferma: un tocco impreciso buttava
          via un lotto intero. Ora sono bersagli da 40px, distanziati, e
          "buttato" chiede conferma.
        */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={(e) => { e.stopPropagation(); onConsumed(); }}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-success/10 active:bg-success/20 transition-colors"
            aria-label={`Segna ${item.name} come utilizzato`}
            title="Utilizzato"
          >
            <UtensilsCrossed className="h-4 w-4 text-success" />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onDiscarded(); }}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-destructive/10 active:bg-destructive/20 transition-colors"
            aria-label={`Segna ${item.name} come buttato`}
            title="Buttato"
          >
            <Trash2 className="h-4 w-4 text-destructive" />
          </button>
        </div>
        <span
          className="shrink-0 rounded-[6px] px-1.5 py-0.5 text-[9px] font-bold text-white"
          style={{ backgroundColor: cfg.color }}
        >
          {cfg.label}
        </span>
      </div>
    </div>
  );
};

export default RestaurantPage;
