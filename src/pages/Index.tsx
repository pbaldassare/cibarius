import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import MobileHeader from "@/components/MobileHeader";
import { useRole, getRoleHomePath } from "@/hooks/useRole";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { getFoodImage } from "@/lib/food-images";
import AddFoodFlow from "@/components/AddFoodFlow";
import { useTour } from "@/components/AppTourContext";
import { useIngredientCompatibility } from "@/hooks/useIngredientCompatibility";
import MealReminderBanner from "@/components/MealReminderBanner";
import { WeightGoalHomeBar } from "@/components/WeightGoalMotivation";
import ResolveExpiryFlow from "@/components/ResolveExpiryFlow";
import AutoSuggestFavBanner from "@/components/AutoSuggestFavBanner";
import {
  Clock, Plus, Search, ChevronRight,
  SlidersHorizontal, X, Trash2,
  Sparkles, Leaf, ScanLine, Refrigerator,
  UtensilsCrossed, ShoppingCart, Package,
  MessageSquare, ClipboardList, AlertTriangle,
} from "lucide-react";

/* ─── types ─── */
interface InventoryItem {
  id: string;
  expiry_date: string | null;
  storage_type: string;
  quantity: number | null;
  unit: string | null;
  product: { name: string; image_url: string | null; category: string | null };
}

type ExpiryStatus = "expired" | "today" | "tomorrow" | "soon" | "ok" | "nodate";

const getStatus = (d: string | null): ExpiryStatus => {
  if (!d) return "nodate";
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const diff = Math.ceil((new Date(d).getTime() - today.getTime()) / 864e5);
  if (diff < 0) return "expired";
  if (diff === 0) return "today";
  if (diff === 1) return "tomorrow";
  if (diff <= 3) return "soon";
  return "ok";
};

const statusCfg: Record<ExpiryStatus, { label: string; color: string; barColor: string }> = {
  expired:  { label: "Scaduto",         color: "hsl(var(--destructive))",    barColor: "bg-destructive" },
  today:    { label: "Scade oggi",      color: "hsl(1,76%,55%)",            barColor: "bg-destructive" },
  tomorrow: { label: "Scade domani",    color: "hsl(37,90%,51%)",           barColor: "bg-warning" },
  soon:     { label: "Scade tra 3gg",   color: "hsl(37,90%,51%)",           barColor: "bg-warning" },
  ok:       { label: "OK",              color: "hsl(152,56%,46%)",          barColor: "bg-success" },
  nodate:   { label: "Senza data",      color: "hsl(215,10%,62%)",          barColor: "bg-muted-foreground" },
};

const storageLabel: Record<string, string> = {
  frigo: "Frigo", freezer: "Congelatore", ambiente: "Dispensa",
};

/* ─── Food Thumbnail ─── */
const FoodThumb = ({ imageUrl, category, name }: { imageUrl: string | null | undefined; category: string | null | undefined; name?: string | null }) => {
  const img = getFoodImage(imageUrl, category, name);
  if (img.type === "image") {
    return <img src={img.value} alt="" className="h-10 w-10 rounded-lg object-cover shrink-0 bg-muted" />;
  }
  return (
    <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center shrink-0 text-lg">
      {img.value}
    </div>
  );
};

/* ─── Swipeable item ─── */
const SwipeableItem = ({ itemKey, onDelete, children }: { itemKey: string; onDelete: () => Promise<void>; children: React.ReactNode }) => {
  const [swipeX, setSwipeX] = useState(0);
  const [removing, setRemoving] = useState(false);
  const startX = useRef<number | null>(null);
  const startY = useRef<number | null>(null);
  const locked = useRef(false);

  const onTouchStart = (e: React.TouchEvent) => {
    startX.current = e.touches[0].clientX;
    startY.current = e.touches[0].clientY;
    locked.current = false;
  };
  const onTouchMove = (e: React.TouchEvent) => {
    if (startX.current === null || startY.current === null) return;
    const dx = e.touches[0].clientX - startX.current;
    const dy = e.touches[0].clientY - startY.current;
    if (!locked.current) {
      if (Math.abs(dy) > Math.abs(dx) && Math.abs(dy) > 10) { startX.current = null; return; }
      if (Math.abs(dx) > 10) locked.current = true;
    }
    if (locked.current) setSwipeX(Math.min(0, dx));
  };
  const onTouchEnd = async () => {
    startX.current = null; startY.current = null; locked.current = false;
    if (swipeX < -80) { setRemoving(true); await onDelete(); } else setSwipeX(0);
  };

  if (removing) return <div className="overflow-hidden transition-all duration-300 ease-out" style={{ maxHeight: 0, opacity: 0 }} />;

  return (
    <div className="relative overflow-hidden rounded-[14px]">
      <div className="absolute inset-0 flex items-center justify-end bg-destructive rounded-[14px] px-4">
        <Trash2 className="h-5 w-5 text-white" />
      </div>
      <div className="relative" style={{ transform: `translateX(${swipeX}px)`, transition: swipeX === 0 ? "transform 0.25s ease-out" : "none" }}
        onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd}>
        {children}
      </div>
    </div>
  );
};

/* ─── UrgentItem ─── */
type UrgentItem = {
  id: string; name: string; date: string | null; storage: string;
  status: ExpiryStatus; type: "inv" | "prep";
  qty: number | null; unit: string | null;
  image_url: string | null; category: string | null;
};

/* ─── Section Header ─── */
const SectionHeader = ({ title, action, onAction }: { title: string; action?: string; onAction?: () => void }) => (
  <div className="flex items-center justify-between">
    <h3 className="text-[14px] font-bold text-foreground">{title}</h3>
    {action && onAction && (
      <button onClick={onAction} className="text-[11px] font-medium text-primary flex items-center gap-0.5">
        {action} <ChevronRight className="h-3 w-3" />
      </button>
    )}
  </div>
);

/* ═══════════════════ MAIN COMPONENT ═══════════════════ */
const Index = () => {
  const { user } = useAuth();
  const { role, profile, isLoading: roleLoading } = useRole();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { loaded: compatLoaded, buildGroups } = useIngredientCompatibility();
  const { registerAddFoodControl } = useTour();

  const [items, setItems] = useState<InventoryItem[]>([]);
  const [prepItems, setPrepItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [addFoodOpen, setAddFoodOpen] = useState(false);
  const [resolveOpen, setResolveOpen] = useState(false);

  // Register add food modal control for tour
  useEffect(() => {
    registerAddFoodControl(
      () => setAddFoodOpen(true),
      () => setAddFoodOpen(false),
    );
  }, [registerAddFoodControl]);

  // Today's meals
  const [todayMeals, setTodayMeals] = useState<{ type: string; count: number }[]>([]);

  // Nutritionist link
  const [hasNutritionist, setHasNutritionist] = useState(false);
  const [unreadMessages, setUnreadMessages] = useState(0);

  // Waste stats
  const [wasteStats, setWasteStats] = useState<{ count: number; weightKg: number; money: number } | null>(null);

  // Search overlay
  const [searchOpen, setSearchOpen] = useState(false);
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (!roleLoading && role && role !== "user") {
      navigate(getRoleHomePath(role), { replace: true });
    }
  }, [role, roleLoading, navigate]);

  const fetchItems = async () => {
    if (!user) return;
    const today = new Date().toISOString().slice(0, 10);

    const [invRes, prepRes, mealDayRes, linkRes, msgRes, wasteRes] = await Promise.all([
      supabase
        .from("inventory_items")
        .select("id, expiry_date, storage_type, quantity, unit, product:products(name, image_url, category)")
        .eq("owner_user_id", user.id)
        .order("expiry_date", { ascending: true, nullsFirst: false }),
      supabase
        .from("preparations")
        .select("id, name, use_by_date, image_url, storage_type")
        .eq("owner_user_id", user.id),
      supabase
        .from("meal_days")
        .select("id, meals(meal_type, meal_items(id))")
        .eq("user_id", user.id)
        .eq("day_date", today)
        .maybeSingle(),
      supabase
        .from("client_links")
        .select("id, professional_id")
        .eq("client_user_id", user.id)
        .eq("status", "active")
        .limit(1),
      supabase
        .from("messages")
        .select("id")
        .eq("receiver_id", user.id)
        .is("read_at", null)
        .limit(10),
      (() => {
        const startOfMonth = new Date();
        startOfMonth.setDate(1);
        startOfMonth.setHours(0, 0, 0, 0);
        return supabase
          .from("waste_savings" as any)
          .select("weight_g, estimated_price")
          .eq("user_id", user.id)
          .gte("saved_at", startOfMonth.toISOString());
      })(),
    ]);

    if (invRes.data) setItems(invRes.data as unknown as InventoryItem[]);
    if (prepRes.data) setPrepItems(prepRes.data as any[]);

    // Today's meals
    if (mealDayRes.data) {
      const meals = (mealDayRes.data as any).meals || [];
      const mealTypes = ["colazione", "pranzo", "cena", "spuntino"];
      setTodayMeals(mealTypes.map(t => ({
        type: t,
        count: meals.filter((m: any) => m.meal_type === t).reduce((acc: number, m: any) => acc + ((m.meal_items || []).length), 0),
      })));
    } else {
      setTodayMeals([
        { type: "colazione", count: 0 },
        { type: "pranzo", count: 0 },
        { type: "cena", count: 0 },
      ]);
    }

    // Nutritionist
    if (linkRes.data && linkRes.data.length > 0) setHasNutritionist(true);
    if (msgRes.data) setUnreadMessages(msgRes.data.length);

    // Waste stats
    if (wasteRes.data && (wasteRes.data as any[]).length > 0) {
      const rows = wasteRes.data as any[];
      setWasteStats({
        count: rows.length,
        weightKg: Math.round(rows.reduce((s, r) => s + (r.weight_g || 0), 0) / 100) / 10,
        money: Math.round(rows.reduce((s, r) => s + (r.estimated_price || 0), 0) * 100) / 100,
      });
    }

    setLoading(false);
  };

  useEffect(() => { fetchItems(); }, [user]);

  // Meal context based on time of day — reactive every 5 minutes
  type MealContext = "colazione" | "pranzo" | "snack" | "cena" | "generico";
  const [timeSlot, setTimeSlot] = useState(() => new Date().getHours());

  useEffect(() => {
    const interval = setInterval(() => {
      const h = new Date().getHours();
      setTimeSlot(prev => prev !== h ? h : prev);
    }, 5 * 60_000);
    return () => clearInterval(interval);
  }, []);

  const mealContext = useMemo((): MealContext => {
    if (timeSlot >= 5 && timeSlot < 11) return "colazione";
    if (timeSlot >= 11 && timeSlot < 15) return "pranzo";
    if (timeSlot >= 15 && timeSlot < 18) return "snack";
    if (timeSlot >= 18 && timeSlot < 22) return "cena";
    return "generico";
  }, [timeSlot]);

  // Realtime: re-fetch on inventory/meal changes
  useEffect(() => {
    if (!user) return;
    const channel = supabase.channel("home-live")
      .on("postgres_changes", { event: "*", schema: "public", table: "inventory_items", filter: `owner_user_id=eq.${user.id}` }, () => fetchItems())
      .on("postgres_changes", { event: "*", schema: "public", table: "meal_days", filter: `user_id=eq.${user.id}` }, () => fetchItems())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user]);

  const mealContextCfg: Record<MealContext, { icon: string; text: string }> = {
    colazione: { icon: "☀️", text: "Perfetto per una colazione veloce" },
    pranzo:    { icon: "🍽", text: "Puoi preparare un pranzo semplice" },
    snack:     { icon: "🥪", text: "Perfetto per uno spuntino veloce" },
    cena:      { icon: "🍳", text: "Ideale per una cena leggera" },
    generico:  { icon: "⏳", text: "Questi ingredienti stanno per scadere" },
  };

  // Smart suggestion
  interface SmartSuggestion {
    items: string[];
    recipes: string[];
    isExpiring: boolean;
  }

  const aiSuggestion = useMemo((): SmartSuggestion | null => {
    if (items.length === 0 || !compatLoaded) return null;

    const expiring = items.filter(i => {
      const s = getStatus(i.expiry_date);
      return s === "expired" || s === "today" || s === "tomorrow" || s === "soon";
    });

    // Priority 1: expiring items with compatible pairs
    if (expiring.length >= 2) {
      const names = expiring.map(i => i.product.name);
      const groups = buildGroups(names, 1);
      if (groups.length > 0) {
        return { items: groups[0].items.slice(0, 2), recipes: groups[0].recipes.slice(0, 2), isExpiring: true };
      }
    }

    if (expiring.length === 1) {
      return { items: [expiring[0].product.name], recipes: [], isExpiring: true };
    }

    // Priority 2: available ingredients
    if (items.length >= 2) {
      const names = items.slice(0, 10).map(i => i.product.name);
      const groups = buildGroups(names, 1);
      if (groups.length > 0 && groups[0].recipes.length > 0) {
        return { items: groups[0].items.slice(0, 2), recipes: groups[0].recipes.slice(0, 2), isExpiring: false };
      }
    }

    return null;
  }, [items, compatLoaded, buildGroups]);

  // Counts
  const counts = useMemo(() => {
    let expired = 0, expiring = 0;
    items.forEach(i => {
      const s = getStatus(i.expiry_date);
      if (s === "expired") expired++;
      else if (s === "today" || s === "tomorrow" || s === "soon") expiring++;
    });
    prepItems.forEach(p => {
      const s = getStatus(p.use_by_date);
      if (s === "expired") expired++;
      else if (s === "today" || s === "tomorrow" || s === "soon") expiring++;
    });
    return { expired, expiring, allItems: items.length + prepItems.length, total: expired + expiring };
  }, [items, prepItems]);

  // Urgent list: max 5
  const urgentList = useMemo(() => {
    const list: UrgentItem[] = [];
    items.forEach(i => {
      const s = getStatus(i.expiry_date);
      if (s === "expired" || s === "today" || s === "tomorrow" || s === "soon") {
        list.push({
          id: i.id, name: i.product.name, date: i.expiry_date,
          storage: i.storage_type, status: s, type: "inv",
          qty: i.quantity, unit: i.unit,
          image_url: i.product.image_url, category: i.product.category,
        });
      }
    });
    prepItems.forEach(p => {
      const s = getStatus(p.use_by_date);
      if (s === "expired" || s === "today" || s === "tomorrow" || s === "soon") {
        list.push({
          id: p.id, name: p.name, date: p.use_by_date,
          storage: p.storage_type, status: s, type: "prep",
          qty: null, unit: null, image_url: p.image_url, category: null,
        });
      }
    });
    list.sort((a, b) => {
      const order: Record<ExpiryStatus, number> = { expired: 0, today: 1, tomorrow: 2, soon: 3, ok: 4, nodate: 5 };
      if (order[a.status] !== order[b.status]) return order[a.status] - order[b.status];
      if (a.date && b.date) return a.date.localeCompare(b.date);
      return 0;
    });
    return list.slice(0, 5);
  }, [items, prepItems]);

  const handleDeleteUrgent = useCallback(async (id: string, type: "inv" | "prep") => {
    if (type === "inv") await supabase.from("inventory_items").delete().eq("id", id);
    else await supabase.from("preparations").delete().eq("id", id);
    toast({ title: "Eliminato ✓" });
    fetchItems();
  }, [user]);

  const greeting = useMemo(() => {
    const h = new Date().getHours();
    if (h < 12) return "Buongiorno";
    if (h < 18) return "Buon pomeriggio";
    return "Buonasera";
  }, []);
  const firstName = profile?.full_name?.split(" ")[0] ?? "";

  const mealTypeLabel: Record<string, { label: string; emoji: string }> = {
    colazione: { label: "Colazione", emoji: "☀️" },
    pranzo: { label: "Pranzo", emoji: "🍝" },
    cena: { label: "Cena", emoji: "🌙" },
    spuntino: { label: "Spuntino", emoji: "🍎" },
  };

  // Search
  const searchResults = useMemo(() => {
    if (!search) return [];
    const q = search.toLowerCase();
    const results: any[] = [];
    items.forEach(i => {
      if (i.product.name.toLowerCase().includes(q))
        results.push({ id: i.id, name: i.product.name, date: i.expiry_date, storage: i.storage_type, status: getStatus(i.expiry_date), image_url: i.product.image_url, category: i.product.category });
    });
    return results.slice(0, 12);
  }, [items, search]);

  if (loading) {
    return (
      <div className="bg-background min-h-screen">
        <MobileHeader title="" />
        <main className="space-y-4 px-4 py-3 pb-32">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-24 w-full rounded-[18px]" />
          <Skeleton className="h-20 w-full rounded-[18px]" />
          <Skeleton className="h-16 w-full rounded-[14px]" />
        </main>
      </div>
    );
  }

  const headerRight = (
    <div className="flex items-center gap-1">
      <button data-tour="home-search" onClick={() => setSearchOpen(true)} className="p-1.5 rounded-lg active:bg-white/10 transition-colors" aria-label="Cerca">
        <Search className="h-[18px] w-[18px] text-white" strokeWidth={2} />
      </button>
      <button onClick={() => navigate("/expiry")} className="p-1.5 rounded-lg active:bg-white/10 transition-colors" aria-label="Filtri">
        <SlidersHorizontal className="h-[18px] w-[18px] text-white" strokeWidth={2} />
      </button>
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      <MobileHeader title="" showBack={false} right={headerRight} />

      <main className="space-y-5 px-4 pt-1 pb-28">

        {/* ─── Greeting ─── */}
        <div data-tour="home-greeting">
          <h2 className="text-base text-foreground">
            {greeting}{firstName ? `, ${firstName}` : ""} 👋
          </h2>
          <p className="text-[12px] text-muted-foreground mt-0.5">Ecco cosa serve oggi</p>
        </div>

        <MealReminderBanner />

        {/* Weight goal progress for Plus users */}
        <WeightGoalHomeBar />

        {/* ═══ 1 — ATTENZIONE OGGI (Scadenze) ═══ */}
        <section className="space-y-2.5" data-tour="home-expiry">
          <SectionHeader title="⚠️ Attenzione oggi" action={counts.total > 0 ? `Vedi tutti (${counts.total})` : undefined} onAction={() => navigate("/expiry")} />

          {counts.total > 0 ? (
            <>
              {/* Summary badges */}
              <div className="flex gap-2">
                {counts.expired > 0 && (
                  <div className="flex items-center gap-1.5 rounded-xl bg-destructive/10 border border-destructive/20 px-3 py-2 flex-1">
                    <AlertTriangle className="h-4 w-4 text-destructive shrink-0" />
                    <div>
                      <p className="text-[15px] font-bold text-destructive leading-none">{counts.expired}</p>
                      <p className="text-[9px] text-destructive/70 uppercase tracking-wider mt-0.5">Scadut{counts.expired === 1 ? "o" : "i"}</p>
                    </div>
                  </div>
                )}
                {counts.expiring > 0 && (
                  <div className="flex items-center gap-1.5 rounded-xl bg-warning/10 border border-warning/20 px-3 py-2 flex-1">
                    <Clock className="h-4 w-4 text-warning shrink-0" />
                    <div>
                      <p className="text-[15px] font-bold text-warning leading-none">{counts.expiring}</p>
                      <p className="text-[9px] text-warning/70 uppercase tracking-wider mt-0.5">In scadenza</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Urgent items */}
              <div className="space-y-1.5">
                {urgentList.map(item => {
                  const cfg = statusCfg[item.status];
                  return (
                    <SwipeableItem key={`${item.type}-${item.id}`} itemKey={`${item.type}-${item.id}`} onDelete={() => handleDeleteUrgent(item.id, item.type)}>
                      <button
                        type="button"
                        onClick={() => navigate(`/expiry?openId=${item.id}`)}
                        className="w-full flex items-center gap-2 rounded-[14px] bg-card pl-0 pr-3 py-2 shadow-card text-left active:scale-[0.99] transition-transform"
                      >
                        <div className={`w-[3px] self-stretch rounded-full ml-0 ${cfg.barColor}`} />
                        <FoodThumb imageUrl={item.image_url} category={item.category} name={item.name} />
                        <div className="flex-1 min-w-0 ml-0.5">
                          <p className="text-[13px] font-medium truncate text-foreground">{item.name}</p>
                          <p className="text-[11px] text-muted-foreground mt-0.5">
                            {item.date && <>Scade il {new Date(item.date).toLocaleDateString("it-IT", { day: "2-digit", month: "2-digit" })}</>}
                            {item.date && " · "}
                            {storageLabel[item.storage] ?? item.storage}
                            {item.qty != null && ` · ${item.qty}${item.unit ? ` ${item.unit}` : ""}`}
                          </p>
                        </div>
                        <span className="shrink-0 rounded-[6px] px-1.5 py-[2px] text-[8px] font-bold uppercase tracking-wider text-white" style={{ backgroundColor: cfg.color }}>
                          {cfg.label}
                        </span>
                      </button>
                    </SwipeableItem>
                  );
                })}
              </div>

              {/* Action buttons */}
              <div className="flex gap-2">
                <button
                  onClick={() => setResolveOpen(true)}
                  className="flex-1 flex items-center justify-center gap-2 rounded-[12px] h-10 text-[13px] font-semibold text-white btn-brand active:scale-[0.97] transition-all"
                >
                  Gestisci scadenze
                </button>
                <button
                  onClick={() => navigate("/anti-waste")}
                  className="flex-1 flex items-center justify-center gap-2 rounded-[12px] h-10 text-[13px] font-semibold border border-primary text-primary active:scale-[0.97] transition-all"
                >
                  <Leaf className="h-3.5 w-3.5" /> Trova ricette
                </button>
              </div>
            </>
          ) : (
            <div className="flex items-center justify-center gap-2 rounded-[14px] h-12 bg-success/8">
              <span className="text-[13px] font-medium text-success">✓ Nessuna scadenza urgente</span>
            </div>
          )}
        </section>

        {/* ═══ 2 — AZIONI RAPIDE ═══ */}
        <section className="space-y-2.5">
          <SectionHeader title="Cosa vuoi fare?" />
          <div className="grid grid-cols-5 gap-2">
            {[
              { icon: ScanLine, label: "Scansiona", color: "hsl(var(--primary))", bg: "bg-primary/10", onClick: () => navigate("/scan"), tourId: "home-action-scan" },
              { icon: Plus, label: "Aggiungi", color: "hsl(152,56%,46%)", bg: "bg-success/10", onClick: () => setAddFoodOpen(true), tourId: "home-action-add" },
              { icon: ShoppingCart, label: "Confronta", color: "hsl(280,70%,55%)", bg: "bg-accent/10", onClick: () => navigate("/compare"), tourId: "home-action-compare" },
              { icon: Refrigerator, label: "Svuota frigo", color: "hsl(37,90%,51%)", bg: "bg-warning/10", onClick: () => navigate("/anti-waste?mode=expiring"), tourId: "home-action-fridge" },
              { icon: Sparkles, label: "Cosa mangio?", color: "hsl(262,83%,58%)", bg: "bg-accent/10", onClick: () => navigate("/anti-waste"), tourId: "home-action-suggest" },
            ].map(({ icon: Icon, label, color, bg, onClick, tourId }) => (
              <button
                key={label}
                data-tour={tourId}
                onClick={onClick}
                className={`flex flex-col items-center gap-1.5 rounded-[14px] ${bg} py-3 active:scale-[0.95] transition-all`}
              >
                <Icon className="h-5 w-5" style={{ color }} strokeWidth={2} />
                <span className="text-[10px] font-semibold text-foreground leading-tight text-center">{label}</span>
              </button>
            ))}
          </div>
        </section>

        {/* ═══ AUTO-SUGGEST FAVORITE ═══ */}
        <AutoSuggestFavBanner />

        {/* ═══ 3 — SUGGERIMENTO CIBARIUS ═══ */}
        {(aiSuggestion || counts.total > 0) && (
          <section>
            <div className="rounded-[18px] bg-card shadow-card overflow-hidden">
              <div className="px-4 pt-2.5 pb-0">
                <p className="text-[9px] font-semibold uppercase tracking-widest text-muted-foreground">Consiglio del momento</p>
              </div>
              <div className="px-4 py-2.5 flex items-center gap-3">
                {aiSuggestion ? (
                  <>
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl shrink-0 bg-primary/10 text-base">
                      {aiSuggestion.isExpiring && mealContext === "generico"
                        ? "⏳"
                        : mealContextCfg[mealContext].icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-semibold text-foreground leading-snug">
                        Usa prima {aiSuggestion.items.join(" e ")}
                      </p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        {aiSuggestion.isExpiring && mealContext === "generico"
                          ? mealContextCfg.generico.text
                          : mealContextCfg[mealContext].text}
                      </p>
                    </div>
                    <button
                      onClick={() => navigate("/anti-waste")}
                      className="shrink-0 h-8 px-3 rounded-lg text-[11px] font-semibold btn-brand active:scale-[0.97] transition-all"
                    >
                      Trova ricette
                    </button>
                  </>
                ) : (
                  <>
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl shrink-0 bg-warning/10">
                      <AlertTriangle className="h-[18px] w-[18px] text-warning" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-semibold text-foreground leading-snug">
                        Hai {counts.total} prodott{counts.total === 1 ? "o" : "i"} da consumare presto
                      </p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">⏳ Controlla le scadenze</p>
                    </div>
                    <button
                      onClick={() => navigate("/anti-waste")}
                      className="shrink-0 h-8 px-3 rounded-lg text-[11px] font-semibold btn-brand active:scale-[0.97] transition-all"
                    >
                      Anti-spreco
                    </button>
                  </>
                )}
              </div>
            </div>
          </section>
        )}

        {/* ═══ 4 — LA TUA DISPENSA ═══ */}
        <section className="space-y-2.5" data-tour="home-pantry">
          <SectionHeader title="🏠 I tuoi alimenti" action="Vedi tutti" onAction={() => navigate("/products")} />
          <div className="grid grid-cols-3 gap-2">
            {[
              { key: "frigo", label: "Frigo", icon: "🧊", path: "/products?storage=frigo" },
              { key: "freezer", label: "Congelatore", icon: "❄️", path: "/freezer" },
              { key: "ambiente", label: "Dispensa", icon: "🏠", path: "/pantry" },
            ].map(({ key, label, icon, path }) => {
              const count = items.filter(i => i.storage_type === key).length;
              return (
                <button
                  key={key}
                  onClick={() => navigate(path)}
                  className="rounded-[14px] bg-card shadow-card p-3 flex flex-col items-center gap-1 active:scale-[0.97] transition-transform"
                >
                  <span className="text-xl leading-none">{icon}</span>
                  <p className="text-[18px] font-bold text-foreground leading-none">{count}</p>
                  <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">{label}</p>
                </button>
              );
            })}
          </div>
          {wasteStats && wasteStats.count > 0 && (
            <div className="rounded-[14px] bg-card shadow-card p-3 flex items-center gap-2">
              <Leaf className="h-4 w-4 text-success shrink-0" />
              <p className="text-[11px] text-muted-foreground flex-1">
                Questo mese hai salvato <span className="font-bold text-success">{wasteStats.count}</span> alimenti · <span className="font-bold text-success">{wasteStats.weightKg} kg</span> · <span className="font-bold text-success">€{wasteStats.money.toFixed(0)}</span>
              </p>
            </div>
          )}
        </section>


        {/* ═══ 5 — RICETTE ANTI-SPRECO ═══ */}
        <section className="space-y-2.5" data-tour="home-recipes">
          <SectionHeader title="🍳 Ricette anti-spreco" action="Vedi tutte" onAction={() => navigate("/anti-waste")} />
          <div className="grid grid-cols-1 gap-2">
            {(() => {
              // Quick local recipe matching (top 3)
              const pantryNames = items.map(i => i.product.name.toLowerCase());
              const recipes = [
                { title: "Frittata di verdure", ingredients: ["uova", "zucchine", "parmigiano"], emoji: "🍳" },
                { title: "Pasta al pomodoro", ingredients: ["pasta", "pomodoro", "olio"], emoji: "🍝" },
                { title: "Bruschetta", ingredients: ["pane", "pomodoro", "olio"], emoji: "🥖" },
                { title: "Insalata mista", ingredients: ["lattuga", "pomodoro", "carote"], emoji: "🥗" },
                { title: "Verdure al forno", ingredients: ["zucchine", "melanzane", "peperoni"], emoji: "🥘" },
              ];
              const scored = recipes.map(r => {
                const matched = r.ingredients.filter(ing => pantryNames.some(p => p.includes(ing) || ing.includes(p))).length;
                return { ...r, matched, total: r.ingredients.length };
              }).filter(r => r.matched > 0).sort((a, b) => b.matched - a.matched).slice(0, 3);

              if (scored.length === 0) {
                return (
                  <div className="rounded-[14px] bg-card shadow-card p-4 text-center">
                    <p className="text-[12px] text-muted-foreground">Aggiungi prodotti per ricevere suggerimenti</p>
                  </div>
                );
              }

              return scored.map((recipe, idx) => (
                <button
                  key={idx}
                  onClick={() => navigate("/anti-waste")}
                  className="flex items-center gap-3 rounded-[14px] bg-card shadow-card px-4 py-3 text-left active:scale-[0.98] transition-all"
                >
                  <span className="text-xl shrink-0">{recipe.emoji}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-semibold text-foreground truncate">{recipe.title}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      {recipe.matched}/{recipe.total} ingredienti disponibili
                    </p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                </button>
              ));
            })()}
          </div>
        </section>

        {/* ═══ 6 — I TUOI PASTI DI OGGI ═══ */}
        <section className="space-y-2.5" data-tour="home-meals">
          <SectionHeader title="🍽️ I tuoi pasti di oggi" action="Vai al diario" onAction={() => navigate("/meals")} />
          <div className="rounded-[18px] bg-card shadow-card overflow-hidden divide-y divide-border">
            {todayMeals.filter(m => m.type !== "spuntino" || m.count > 0).map(meal => {
              const cfg = mealTypeLabel[meal.type] || { label: meal.type, emoji: "🍽️" };
              return (
                <button
                  key={meal.type}
                  onClick={() => navigate(meal.count > 0 ? "/meals" : `/meals?add=${meal.type}`)}
                  className="flex items-center gap-3 w-full px-4 py-3 text-left active:bg-accent/30 transition-colors"
                >
                  <span className="text-lg shrink-0">{cfg.emoji}</span>
                  <div className="flex-1">
                    <p className="text-[13px] font-medium text-foreground">{cfg.label}</p>
                    {meal.count > 0 ? (
                      <p className="text-[11px] text-success mt-0.5">✓ {meal.count} aliment{meal.count === 1 ? "o" : "i"} registrat{meal.count === 1 ? "o" : "i"}</p>
                    ) : (
                      <p className="text-[11px] text-muted-foreground mt-0.5">Non ancora registrato</p>
                    )}
                  </div>
                  {meal.count === 0 ? (
                    <span className="text-[11px] font-semibold text-primary">+ Aggiungi</span>
                  ) : (
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  )}
                </button>
              );
            })}
          </div>
        </section>

        {/* ═══ 7 — NUTRIZIONISTA (se presente) ═══ */}
        {hasNutritionist && (
          <section className="space-y-2.5">
            <SectionHeader title="👩‍⚕️ Dal tuo nutrizionista" />
            <div className="rounded-[18px] bg-card shadow-card overflow-hidden divide-y divide-border">
              <button
                onClick={() => navigate("/messages")}
                className="flex items-center gap-3 w-full px-4 py-3 text-left active:bg-accent/30 transition-colors"
              >
                <MessageSquare className="h-5 w-5 text-primary shrink-0" />
                <div className="flex-1">
                  <p className="text-[13px] font-medium text-foreground">Messaggi</p>
                  {unreadMessages > 0 && (
                    <p className="text-[11px] text-primary mt-0.5">{unreadMessages} non lett{unreadMessages === 1 ? "o" : "i"}</p>
                  )}
                </div>
                {unreadMessages > 0 && (
                  <span className="h-5 w-5 rounded-full bg-primary flex items-center justify-center text-[10px] font-bold text-primary-foreground">{unreadMessages}</span>
                )}
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </button>
              <button
                onClick={() => navigate("/plan")}
                className="flex items-center gap-3 w-full px-4 py-3 text-left active:bg-accent/30 transition-colors"
              >
                <ClipboardList className="h-5 w-5 text-primary shrink-0" />
                <div className="flex-1">
                  <p className="text-[13px] font-medium text-foreground">Piano alimentare</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">Consulta il tuo piano</p>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </button>
            </div>
          </section>
        )}

      </main>

      {/* ─── FAB ─── */}
      <div className="fixed bottom-[calc(76px+env(safe-area-inset-bottom,0px))] right-4 z-40" data-tour="home-fab">
        <button
          onClick={() => setAddFoodOpen(true)}
          className="flex h-12 w-12 items-center justify-center rounded-full btn-brand active:scale-95 transition-all shadow-brand"
          aria-label="Aggiungi"
        >
          <Plus className="h-5 w-5" strokeWidth={2.2} />
        </button>
      </div>

      {/* ─── SEARCH OVERLAY ─── */}
      {searchOpen && (
        <div className="fixed inset-0 z-[60] bg-background">
          <div className="flex items-center gap-2 px-4 pt-3 pb-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                autoFocus
                placeholder="Cerca nei tuoi prodotti..."
                className="h-10 w-full rounded-[12px] border border-border bg-card pl-9 pr-3 text-[14px] text-foreground outline-none focus:ring-2 focus:ring-primary/30"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <button onClick={() => { setSearchOpen(false); setSearch(""); }} className="p-2 text-muted-foreground">
              <X className="h-5 w-5" />
            </button>
          </div>
          <div className="px-4 pt-2 pb-8 overflow-y-auto" style={{ maxHeight: "calc(100vh - 60px)" }}>
            {!search && <p className="text-[13px] text-muted-foreground text-center py-12">Digita per cercare tra i tuoi prodotti</p>}
            {search && searchResults.length === 0 && <p className="text-[13px] text-muted-foreground text-center py-12">Nessun risultato per "{search}"</p>}
            {searchResults.length > 0 && (
              <div className="space-y-1.5">
                {searchResults.map(r => {
                  const cfg = statusCfg[r.status as ExpiryStatus];
                  return (
                    <div key={r.id} className="flex items-center gap-2 rounded-[14px] bg-card pl-0 pr-3 py-2 shadow-card">
                      <div className={`w-[3px] self-stretch rounded-full ${cfg.barColor}`} />
                      <FoodThumb imageUrl={r.image_url} category={r.category} name={r.name} />
                      <div className="flex-1 min-w-0 ml-0.5">
                        <p className="text-[13px] font-medium truncate text-foreground">{r.name}</p>
                        <p className="text-[11px] text-muted-foreground">
                          {r.date ? new Date(r.date).toLocaleDateString("it-IT") : "Senza data"} · {storageLabel[r.storage] ?? r.storage}
                        </p>
                      </div>
                      <span className="shrink-0 rounded-[6px] px-1.5 py-[2px] text-[8px] font-bold uppercase text-white" style={{ backgroundColor: cfg.color }}>
                        {cfg.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      <AddFoodFlow open={addFoodOpen} onOpenChange={setAddFoodOpen} context="inventory" onComplete={fetchItems} />
      <ResolveExpiryFlow open={resolveOpen} onOpenChange={setResolveOpen} onComplete={fetchItems} />
    </div>
  );
};

export default Index;
