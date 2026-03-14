import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import RestaurantSubscriptionBanner from "@/components/RestaurantSubscriptionBanner";
import { useNavigate, Link } from "react-router-dom";
import { useRestaurant } from "@/hooks/useRestaurant";
import { useAuth } from "@/hooks/useAuth";
import MobileHeader from "@/components/MobileHeader";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import RestaurantAddFlow from "@/components/RestaurantAddFlow";
import ResolveExpiryFlow from "@/components/ResolveExpiryFlow";
import { useToast } from "@/hooks/use-toast";
import {
  Loader2, Clock, AlertCircle, Package, Plus, ChevronRight,
  ChefHat, FileText, Upload, User, Settings, Zap,
  ClipboardCheck, CheckCircle2, AlertTriangle, Circle,
  Thermometer, Wind, Flame, Trash2, UtensilsCrossed,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { getFoodEmoji } from "@/lib/food-images";
import { format, isSameDay } from "date-fns";
import { it } from "date-fns/locale";

/* ─── types ─── */
interface InventoryItem {
  id: string;
  expiry_date: string | null;
  storage_type: string;
  quantity: number | null;
  unit: string | null;
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
}

interface HaccpLog {
  id: string;
  task_id: string;
  log_date: string;
  status: string;
}

type ExpiryStatus = "expired" | "expiring" | "ok" | "nodate";

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

const QUICK_ACTIONS = [
  { label: "Controlli oggi", icon: ClipboardCheck, to: "/restaurant/haccp", color: "text-primary", bg: "bg-primary/10" },
  { label: "Cappe", icon: Wind, to: "/restaurant/haccp", color: "text-violet-600", bg: "bg-violet-500/10" },
  { label: "Forni", icon: Flame, to: "/restaurant/haccp", color: "text-orange-600", bg: "bg-orange-500/10" },
  { label: "Celle frigo", icon: Thermometer, to: "/restaurant/haccp", color: "text-sky-600", bg: "bg-sky-500/10" },
  { label: "Scadenze", icon: Clock, to: "/restaurant/products", color: "text-amber-600", bg: "bg-amber-500/10" },
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
  const { toast } = useToast();

  const today = new Date();
  const todayStr = format(today, "yyyy-MM-dd");

  const fetchData = async () => {
    if (!restaurant) return;
    const [invRes, prepRes, docRes, tasksRes, logsRes] = await Promise.all([
      supabase
        .from("inventory_items")
        .select("id, expiry_date, storage_type, quantity, unit, product:products(name, image_url)")
        .eq("restaurant_id", restaurant.id)
        .order("expiry_date", { ascending: true, nullsFirst: false }),
      supabase
        .from("preparations")
        .select("id, name, use_by_date, storage_type, portions")
        .eq("restaurant_id", restaurant.id)
        .order("use_by_date", { ascending: true }),
      supabase
        .from("restaurant_documents")
        .select("id", { count: "exact", head: true })
        .eq("restaurant_id", restaurant.id),
      supabase
        .from("haccp_tasks")
        .select("id, name, category, frequency")
        .eq("restaurant_id", restaurant.id)
        .eq("is_active", true)
        .order("sort_order"),
      supabase
        .from("haccp_logs")
        .select("id, task_id, log_date, status")
        .eq("restaurant_id", restaurant.id)
        .eq("log_date", todayStr),
    ]);
    if (invRes.data) setItems(invRes.data as unknown as InventoryItem[]);
    if (prepRes.data) setPreps(prepRes.data as unknown as PrepItem[]);
    if (tasksRes.data) setHaccpTasks(tasksRes.data as HaccpTask[]);
    if (logsRes.data) setHaccpLogs(logsRes.data as HaccpLog[]);
    setDocCount(docRes.count ?? 0);
    setLoading(false);
  };

  useEffect(() => { if (restaurant) fetchData(); }, [restaurant]);

  // HACCP today stats
  const haccpToday = useMemo(() => {
    const todayTasks = haccpTasks.filter(t => {
      if (t.frequency === "giornaliera") return true;
      if (t.frequency === "settimanale") return today.getDay() === 1;
      if (t.frequency === "mensile") return today.getDate() === 1;
      return true;
    });
    const completedIds = new Set(haccpLogs.filter(l => l.status === "completata").map(l => l.task_id));
    const completed = todayTasks.filter(t => completedIds.has(t.id));
    const pending = todayTasks.filter(t => !completedIds.has(t.id));
    return { total: todayTasks.length, completed, pending };
  }, [haccpTasks, haccpLogs]);

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
  const urgentList = useMemo(() => {
    type U = { id: string; name: string; image_url: string | null; date: string | null; storage: string; status: ExpiryStatus; type: "inv" | "prep" };
    const list: U[] = [];
    items.forEach((i) => {
      const s = getStatus(i.expiry_date);
      if (s === "expired" || s === "expiring")
        list.push({ id: i.id, name: i.product.name, image_url: i.product.image_url, date: i.expiry_date, storage: i.storage_type, status: s, type: "inv" });
    });
    preps.forEach((p) => {
      const s = getStatus(p.use_by_date);
      if (s === "expired" || s === "expiring")
        list.push({ id: p.id, name: p.name, image_url: null, date: p.use_by_date, storage: p.storage_type, status: s, type: "prep" });
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
        <div className="flex gap-2">
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

        {/* ═══ HACCP TODAY ═══ */}
        <div className="rounded-[14px] bg-card shadow-card p-3.5">
          <div className="flex items-center justify-between mb-2.5">
            <h3 className="text-[15px] font-semibold text-foreground flex items-center gap-2">
              <ClipboardCheck className="h-4 w-4 text-primary" />
              Controlli HACCP oggi
            </h3>
            <button onClick={() => navigate("/restaurant/haccp")} className="text-[12px] font-medium text-primary flex items-center gap-0.5">
              Apri <ChevronRight className="h-3 w-3" />
            </button>
          </div>

          {haccpToday.total === 0 ? (
            <div className="text-center py-4">
              <p className="text-sm text-muted-foreground mb-2">Nessuna attività configurata</p>
              <Link to="/restaurant/haccp/setup">
                <button className="text-sm font-medium text-primary">Configura HACCP →</button>
              </Link>
            </div>
          ) : (
            <>
              {/* Progress */}
              <div className="flex items-center gap-3 mb-3">
                <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full rounded-full bg-primary transition-all duration-500"
                    style={{ width: `${(haccpToday.completed.length / haccpToday.total) * 100}%` }}
                  />
                </div>
                <span className="text-sm font-bold text-foreground">
                  {haccpToday.completed.length}/{haccpToday.total}
                </span>
              </div>

              {/* Pending tasks */}
              {haccpToday.pending.length > 0 && (
                <div className="space-y-1.5 mb-2">
                  {haccpToday.pending.slice(0, 5).map(task => (
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
                  {haccpToday.pending.length > 5 && (
                    <p className="text-xs text-muted-foreground text-center">
                      +{haccpToday.pending.length - 5} altri controlli
                    </p>
                  )}
                </div>
              )}

              {/* HACCP Alerts */}
              {haccpToday.pending.length > 0 && (
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2 rounded-[12px] bg-amber-500/10 border border-amber-200/50 px-3 py-2.5">
                    <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
                    <span className="text-[13px] font-medium text-foreground">
                      Hai {haccpToday.pending.length} controlli HACCP da completare oggi
                    </span>
                  </div>
                  {haccpToday.pending.some(t => ["celle_frigo", "frigoriferi", "freezer", "controllo_temperatura", "temperature"].includes(t.category)) && (
                    <div className="flex items-center gap-2 rounded-[12px] bg-sky-500/10 border border-sky-200/50 px-3 py-2.5">
                      <Thermometer className="h-4 w-4 text-sky-600 shrink-0" />
                      <span className="text-[13px] font-medium text-foreground">
                        {haccpToday.pending.filter(t => ["celle_frigo", "frigoriferi", "freezer", "controllo_temperatura", "temperature"].includes(t.category)).length} controlli temperatura da completare
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* All done */}
              {haccpToday.pending.length === 0 && (
                <div className="flex items-center gap-2 rounded-[10px] bg-primary/5 border border-primary/10 px-3 py-3">
                  <CheckCircle2 className="h-5 w-5 text-primary" />
                  <span className="text-sm font-medium text-foreground">Tutti i controlli completati!</span>
                </div>
              )}
            </>
          )}
        </div>

        {/* ═══ Quick Actions ═══ */}
        <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-hide">
          {QUICK_ACTIONS.map(({ label, icon: Icon, to, color, bg }) => (
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

        {/* ═══ Expiry counters ═══ */}
        <div className="rounded-[14px] bg-card shadow-card p-3.5">
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

        {/* ═══ Quick rows: Produzione + Bolle ═══ */}
        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-[14px] bg-card shadow-card p-3.5">
            <div className="flex items-center gap-2 mb-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-[8px] bg-accent/10">
                <ChefHat className="h-4 w-4 text-accent" />
              </div>
              <div>
                <p className="text-[13px] font-semibold text-foreground leading-tight">Produzione</p>
              </div>
            </div>
            <button
              onClick={() => navigate("/restaurant/preparations")}
              className="flex w-full items-center justify-center gap-1.5 rounded-[8px] py-2 text-[12px] font-semibold bg-accent/10 text-accent active:scale-[0.97] transition-all"
            >
              <Plus className="h-3.5 w-3.5" /> Preparazione
            </button>
          </div>
          <div className="rounded-[14px] bg-card shadow-card p-3.5">
            <div className="flex items-center gap-2 mb-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-[8px] bg-success/10">
                <FileText className="h-4 w-4 text-success" />
              </div>
              <div>
                <p className="text-[13px] font-semibold text-foreground leading-tight">Bolle</p>
                <p className="text-[10px] text-muted-foreground">{docCount} documenti</p>
              </div>
            </div>
            <button
              onClick={() => navigate("/restaurant/invoices")}
              className="flex w-full items-center justify-center gap-1.5 rounded-[8px] py-2 text-[12px] font-semibold bg-success/10 text-success active:scale-[0.97] transition-all"
            >
              <Upload className="h-3.5 w-3.5" /> Carica bolla
            </button>
          </div>
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
                  onConsumed={async () => {
                    if (item.type === "inv") await supabase.from("inventory_items").delete().eq("id", item.id);
                    else await supabase.from("preparations").delete().eq("id", item.id);
                    toast({ title: "Segnato come utilizzato ✓" });
                    fetchData();
                  }}
                  onDiscarded={async () => {
                    if (item.type === "inv") await supabase.from("inventory_items").delete().eq("id", item.id);
                    else await supabase.from("preparations").delete().eq("id", item.id);
                    toast({ title: "Segnato come buttato 🗑" });
                    fetchData();
                  }}
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
        {/* Quick action buttons (desktop / no-swipe fallback) */}
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={(e) => { e.stopPropagation(); onConsumed(); }}
            className="flex h-7 w-7 items-center justify-center rounded-full bg-success/10 active:bg-success/20 transition-colors"
            title="Utilizzato"
          >
            <UtensilsCrossed className="h-3.5 w-3.5 text-success" />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onDiscarded(); }}
            className="flex h-7 w-7 items-center justify-center rounded-full bg-destructive/10 active:bg-destructive/20 transition-colors"
            title="Buttato"
          >
            <Trash2 className="h-3.5 w-3.5 text-destructive" />
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
