import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import MobileHeader from "@/components/MobileHeader";
import { useRole, getRoleHomePath } from "@/hooks/useRole";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { useDebounce } from "@/hooks/useDebounce";
import AddFoodFlow from "@/components/AddFoodFlow";
import ResolveExpiryFlow from "@/components/ResolveExpiryFlow";
import { Link } from "react-router-dom";
import {
  Clock, Package, Plus, Search,
  Zap, ChevronRight, AlertCircle,
} from "lucide-react";

/* ─── types ─── */
interface InventoryItem {
  id: string;
  expiry_date: string | null;
  storage_type: string;
  quantity: number | null;
  unit: string | null;
  product: { name: string; image_url: string | null };
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
  expired:  { label: "Scaduto",     color: "hsl(1,76%,55%)",  barColor: "bg-destructive" },
  expiring: { label: "In scadenza", color: "hsl(37,90%,51%)", barColor: "bg-warning" },
  ok:       { label: "OK",          color: "hsl(152,56%,46%)", barColor: "bg-success" },
  nodate:   { label: "Senza data",  color: "hsl(215,10%,62%)", barColor: "bg-muted-foreground" },
};

const storageLabel: Record<string, string> = {
  frigo: "Frigo", freezer: "Congelatore", ambiente: "Dispensa",
};

const Index = () => {
  const { user } = useAuth();
  const { role, profile, isLoading: roleLoading } = useRole();
  const navigate = useNavigate();

  const [items, setItems] = useState<InventoryItem[]>([]);
  const [prepItems, setPrepItems] = useState<{ id: string; name: string; use_by_date: string | null; image_url: string | null; storage_type: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [addFoodOpen, setAddFoodOpen] = useState(false);
  const [resolveOpen, setResolveOpen] = useState(false);
  const debouncedSearch = useDebounce(search, 250);

  useEffect(() => {
    if (!roleLoading && role && role !== "user") {
      navigate(getRoleHomePath(role), { replace: true });
    }
  }, [role, roleLoading, navigate]);

  const fetchItems = async () => {
    if (!user) return;
    const [invRes, prepRes] = await Promise.all([
      supabase
        .from("inventory_items")
        .select("id, expiry_date, storage_type, quantity, unit, product:products(name, image_url)")
        .eq("owner_user_id", user.id)
        .order("expiry_date", { ascending: true, nullsFirst: false }),
      supabase
        .from("preparations")
        .select("id, name, use_by_date, image_url, storage_type")
        .eq("owner_user_id", user.id),
    ]);
    if (invRes.data) setItems(invRes.data as unknown as InventoryItem[]);
    if (prepRes.data) setPrepItems(prepRes.data as any[]);
    setLoading(false);
  };

  useEffect(() => { fetchItems(); }, [user]);

  // Counts
  const counts = useMemo(() => {
    let expired = 0, expiring = 0, nodate = 0;
    items.forEach((i) => {
      const s = getStatus(i.expiry_date);
      if (s === "expired") expired++;
      else if (s === "expiring") expiring++;
      else if (s === "nodate") nodate++;
    });
    prepItems.forEach((p) => {
      const s = getStatus(p.use_by_date);
      if (s === "expired") expired++;
      else if (s === "expiring") expiring++;
    });
    return { expired, expiring, nodate, total: expired + expiring + nodate };
  }, [items, prepItems]);

  // Urgent list: max 6, expired + expiring only, mixed inv + prep
  const urgentList = useMemo(() => {
    type UrgentItem = { id: string; name: string; image_url: string | null; date: string | null; storage: string; status: ExpiryStatus; type: "inv" | "prep" };
    const list: UrgentItem[] = [];

    items.forEach((i) => {
      const s = getStatus(i.expiry_date);
      if (s === "expired" || s === "expiring") {
        list.push({ id: i.id, name: i.product.name, image_url: i.product.image_url, date: i.expiry_date, storage: i.storage_type, status: s, type: "inv" });
      }
    });
    prepItems.forEach((p) => {
      const s = getStatus(p.use_by_date);
      if (s === "expired" || s === "expiring") {
        list.push({ id: p.id, name: p.name, image_url: p.image_url, date: p.use_by_date, storage: p.storage_type, status: s, type: "prep" });
      }
    });

    // Sort expired first
    list.sort((a, b) => {
      if (a.status !== b.status) return a.status === "expired" ? -1 : 1;
      if (a.date && b.date) return a.date.localeCompare(b.date);
      return 0;
    });

    // Filter by search
    if (debouncedSearch) {
      const q = debouncedSearch.toLowerCase();
      return list.filter((i) => i.name.toLowerCase().includes(q)).slice(0, 6);
    }
    return list.slice(0, 6);
  }, [items, prepItems, debouncedSearch]);

  const greeting = useMemo(() => {
    const h = new Date().getHours();
    if (h < 12) return "Buongiorno";
    if (h < 18) return "Buon pomeriggio";
    return "Buonasera";
  }, []);
  const firstName = profile?.full_name?.split(" ")[0] ?? "";

  if (loading) {
    return (
      <div className="bg-background min-h-screen">
        <MobileHeader title="" />
        <main className="space-y-4 px-4 py-3 pb-32">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-40 w-full rounded-[18px]" />
          <Skeleton className="h-10 w-full rounded-[12px]" />
          <Skeleton className="h-48 w-full rounded-[18px]" />
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <MobileHeader title="" />
      <main className="space-y-4 px-4 pt-1 pb-28">

        {/* ─── Greeting ─── */}
        <div>
          <h2 className="text-base text-foreground">
            {greeting}{firstName ? `, ${firstName}` : ""} 👋
          </h2>
          <p className="text-[13px] text-muted-foreground">Ecco cosa serve oggi</p>
        </div>

        {/* ═══════ HERO: Da controllare oggi ═══════ */}
        <div className="rounded-[20px] bg-card shadow-card overflow-hidden">
          {/* Top section */}
          <div className="px-4 pt-4 pb-3">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-[16px] text-foreground">Da controllare oggi</h3>
              <button
                onClick={() => navigate("/expiry")}
                className="text-[12px] font-medium text-primary flex items-center gap-0.5"
              >
                Vedi tutto <ChevronRight className="h-3 w-3" />
              </button>
            </div>

            {/* Counters row */}
            <div className="flex gap-3 mb-4">
              {[
                { n: counts.expired, label: "Scaduti", color: "hsl(1,76%,55%)", bg: "hsl(1,76%,55%,0.08)" },
                { n: counts.expiring, label: "In scadenza", color: "hsl(37,90%,51%)", bg: "hsl(37,90%,51%,0.08)" },
                { n: counts.nodate, label: "Senza data", color: "hsl(215,10%,62%)", bg: "hsl(215,10%,62%,0.08)" },
              ].map(({ n, label, color, bg }) => (
                <div key={label} className="flex-1 rounded-[12px] px-2.5 py-2 text-center" style={{ backgroundColor: bg }}>
                  <p className="text-[20px] font-semibold leading-none mb-0.5" style={{ color }}>{n}</p>
                  <p className="text-[10px] font-medium text-muted-foreground">{label}</p>
                </div>
              ))}
            </div>

            {/* CTA */}
            {counts.total > 0 ? (
              <button
                onClick={() => setResolveOpen(true)}
                className="flex w-full items-center justify-center gap-2.5 rounded-[14px] py-3.5 text-[15px] font-semibold text-primary-foreground bg-primary shadow-card active:scale-[0.97] transition-all"
              >
                <Zap className="h-5 w-5" strokeWidth={2.2} />
                Risolvi tutto · {counts.total}
              </button>
            ) : (
              <div className="flex items-center justify-center gap-2 rounded-[14px] py-3.5 bg-success/10">
                <span className="text-[14px] font-medium text-success">✓ Tutto sotto controllo</span>
              </div>
            )}
          </div>
        </div>

        {/* ─── Search ─── */}
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Cerca prodotti..."
            className="h-10 rounded-[14px] border-0 bg-card pl-10 text-[14px] shadow-card text-foreground"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {/* ═══════ Urgent list ═══════ */}
        {urgentList.length > 0 ? (
          <div>
            <div className="flex items-center justify-between mb-2 px-0.5">
              <h3 className="text-[14px] text-foreground flex items-center gap-1.5">
                <AlertCircle className="h-4 w-4 text-destructive" strokeWidth={2} />
                Urgenti
              </h3>
              <span className="text-[11px] text-muted-foreground">{urgentList.length} elementi</span>
            </div>
            <div className="space-y-1.5">
              {urgentList.map((item) => {
                const cfg = statusCfg[item.status];
                return (
                  <div
                    key={`${item.type}-${item.id}`}
                    className="flex items-center gap-2.5 rounded-[16px] bg-card px-3 py-2.5 shadow-card transition-all"
                  >
                    <div className={`w-[3px] self-stretch rounded-full ${cfg.barColor}`} />
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] bg-secondary overflow-hidden">
                      {item.image_url ? (
                        <img src={item.image_url} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <Package className="h-4 w-4 text-muted-foreground" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[14px] font-medium truncate text-foreground">{item.name}</p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        {item.date && (
                          <span className="text-[12px] flex items-center gap-0.5 text-muted-foreground">
                            <Clock className="h-2.5 w-2.5" />
                            {new Date(item.date).toLocaleDateString("it-IT")}
                          </span>
                        )}
                        <span className="text-[11px] text-muted-foreground">
                          {storageLabel[item.storage] ?? item.storage}
                        </span>
                      </div>
                    </div>
                    <span
                      className="shrink-0 rounded-[8px] px-2 py-0.5 text-[9px] font-semibold text-white"
                      style={{ backgroundColor: cfg.color }}
                    >
                      {cfg.label}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* See all link */}
            {counts.total > 6 && (
              <button
                onClick={() => navigate("/expiry")}
                className="flex w-full items-center justify-center gap-1 mt-2 py-2 text-[13px] font-medium text-primary"
              >
                Vedi tutti i {counts.total} elementi <ChevronRight className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        ) : !search ? (
          <div className="flex flex-col items-center gap-2 rounded-[18px] bg-card p-8 shadow-card">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-success/10">
              <Package className="h-6 w-6 text-success" />
            </div>
            <p className="text-[14px] font-medium text-foreground">Nessun urgente</p>
            <p className="text-[12px] text-muted-foreground text-center">Tutti i tuoi prodotti sono in regola</p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-1.5 rounded-[18px] bg-card p-8 shadow-card">
            <Package className="h-7 w-7 text-muted-foreground" />
            <p className="text-[14px] font-medium text-foreground">Nessun risultato per "{search}"</p>
          </div>
        )}
      </main>

      {/* ─── FAB ─── */}
      <div className="fixed bottom-[calc(68px+env(safe-area-inset-bottom,0px)+0.75rem)] right-3.5 z-40">
        <button
          onClick={() => setAddFoodOpen(true)}
          className="flex h-12 w-12 items-center justify-center rounded-full shadow-elevated active:scale-95 transition-all bg-primary"
          aria-label="Aggiungi"
        >
          <Plus className="h-5 w-5 text-primary-foreground" strokeWidth={2.2} />
        </button>
      </div>

      <AddFoodFlow
        open={addFoodOpen}
        onOpenChange={setAddFoodOpen}
        context="inventory"
        onComplete={fetchItems}
      />

      <ResolveExpiryFlow
        open={resolveOpen}
        onOpenChange={setResolveOpen}
        onComplete={fetchItems}
      />
    </div>
  );
};

export default Index;
