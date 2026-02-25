import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import MobileHeader from "@/components/MobileHeader";
import { useRole, getRoleHomePath } from "@/hooks/useRole";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { useDebounce } from "@/hooks/useDebounce";
import AddFoodFlow from "@/components/AddFoodFlow";
import ResolveExpiryFlow from "@/components/ResolveExpiryFlow";
import { Link } from "react-router-dom";
import {
  AlertTriangle, Clock, Package, Plus,
  ScanLine, Snowflake, Archive, Search,
  Thermometer, AlertCircle, HelpCircle, Filter,
  X, ChevronRight, ChevronDown, Zap, ChefHat,
} from "lucide-react";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";

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

const statusCfg: Record<ExpiryStatus, { label: string; badgeBg: string; barColor: string }> = {
  expired:  { label: "SCADUTO",     badgeBg: "bg-[#E53935]",  barColor: "bg-[#E53935]" },
  expiring: { label: "IN SCADENZA", badgeBg: "bg-[#F59E0B]",  barColor: "bg-[#F59E0B]" },
  ok:       { label: "OK",          badgeBg: "bg-success",     barColor: "bg-success" },
  nodate:   { label: "SENZA DATA",  badgeBg: "bg-[#9CA3AF]",  barColor: "bg-[#9CA3AF]" },
};

const storageLabel: Record<string, string> = {
  frigo: "Frigo",
  freezer: "Congelatore",
  ambiente: "Dispensa",
};

const storageTabs = [
  { key: "all", label: "Tutto", icon: Package },
  { key: "ambiente", label: "Dispensa", icon: Archive },
  { key: "frigo", label: "Frigo", icon: Thermometer },
  { key: "freezer", label: "Congelatore", icon: Snowflake },
] as const;

const Index = () => {
  const { user } = useAuth();
  const { role, profile, isLoading: roleLoading } = useRole();
  const navigate = useNavigate();

  const [items, setItems] = useState<InventoryItem[]>([]);
  const [prepCount, setPrepCount] = useState({ expired: 0, expiring: 0 });
  const [loading, setLoading] = useState(true);
  const [storageTab, setStorageTab] = useState("all");
  const [search, setSearch] = useState("");
  const [filterSheet, setFilterSheet] = useState(false);
  const [storageSheet, setStorageSheet] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>("relevant");
  const [daysRange, setDaysRange] = useState(3);
  const [addFoodOpen, setAddFoodOpen] = useState(false);
  const [resolveOpen, setResolveOpen] = useState(false);
  const debouncedSearch = useDebounce(search, 250);

  // Redirect non-user roles
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
        .select("id, use_by_date")
        .eq("owner_user_id", user.id),
    ]);
    if (invRes.data) setItems(invRes.data as unknown as InventoryItem[]);
    if (prepRes.data) {
      let pExp = 0, pIng = 0;
      (prepRes.data as any[]).forEach((p) => {
        const s = getStatus(p.use_by_date);
        if (s === "expired") pExp++;
        else if (s === "expiring") pIng++;
      });
      setPrepCount({ expired: pExp, expiring: pIng });
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchItems();
  }, [user]);

  // Counts (inventory + preparations)
  const counts = useMemo(() => {
    let expired = 0, expiring = 0, nodate = 0;
    items.forEach((i) => {
      const s = getStatus(i.expiry_date);
      if (s === "expired") expired++;
      else if (s === "expiring") expiring++;
      else if (s === "nodate") nodate++;
    });
    return {
      expired: expired + prepCount.expired,
      expiring: expiring + prepCount.expiring,
      nodate,
    };
  }, [items, prepCount]);

  // Custom status with daysRange
  const getStatusCustom = (d: string | null): ExpiryStatus => {
    if (!d) return "nodate";
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const diff = (new Date(d).getTime() - today.getTime()) / 864e5;
    if (diff < 0) return "expired";
    if (diff <= daysRange) return "expiring";
    return "ok";
  };

  // Filtered list
  const filtered = useMemo(() => {
    let list = items;

    // storage tab
    if (storageTab !== "all") list = list.filter((i) => i.storage_type === storageTab);

    // search
    if (debouncedSearch) {
      const q = debouncedSearch.toLowerCase();
      list = list.filter((i) => i.product.name.toLowerCase().includes(q));
    }

    // status filter
    if (statusFilter === "relevant") {
      list = list.filter((i) => {
        const s = getStatusCustom(i.expiry_date);
        return s === "expired" || s === "expiring" || s === "nodate";
      });
    } else if (statusFilter !== "all") {
      list = list.filter((i) => getStatusCustom(i.expiry_date) === statusFilter);
    }

    // Sort: expired first, then expiring, nodate, ok
    const order: Record<ExpiryStatus, number> = { expired: 0, expiring: 1, nodate: 2, ok: 3 };
    list = [...list].sort((a, b) => {
      const sa = getStatusCustom(a.expiry_date);
      const sb = getStatusCustom(b.expiry_date);
      if (order[sa] !== order[sb]) return order[sa] - order[sb];
      // within same status, sort by date
      if (a.expiry_date && b.expiry_date) return a.expiry_date.localeCompare(b.expiry_date);
      if (a.expiry_date) return -1;
      return 1;
    });

    return list;
  }, [items, storageTab, debouncedSearch, statusFilter, daysRange]);

  const greeting = useMemo(() => {
    const h = new Date().getHours();
    if (h < 12) return "Buongiorno";
    if (h < 18) return "Buon pomeriggio";
    return "Buonasera";
  }, []);
  const firstName = profile?.full_name?.split(" ")[0] ?? "";

  // Count active filters
  const activeFilterCount = useMemo(() => {
    let c = 0;
    if (statusFilter !== "relevant") c++;
    if (daysRange !== 3) c++;
    if (storageTab !== "all") c++;
    return c;
  }, [statusFilter, daysRange, storageTab]);

  const resetFilters = () => {
    setStatusFilter("relevant");
    setDaysRange(3);
    setStorageTab("all");
  };

  if (loading) {
    return (
      <div className="bg-background">
        <MobileHeader title="" />
        <main className="space-y-3 px-4 py-3 pb-32">
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-14 w-full rounded-[18px]" />
          <Skeleton className="h-10 w-full rounded-[14px]" />
          <Skeleton className="h-64 w-full rounded-[18px]" />
        </main>
      </div>
    );
  }

  const storageChipLabel = storageTab === "all" ? "Tutto" : storageLabel[storageTab] ?? storageTab;

  return (
    <div className="min-h-screen bg-background">
      <MobileHeader title="" />
      <main className="space-y-3 px-4 pt-1 pb-28">

        {/* ─── A) Greeting ─── */}
        <div>
          <h2 className="text-base" style={{ color: "hsl(220,20%,14%)" }}>
            {greeting}{firstName ? `, ${firstName}` : ""} 👋
          </h2>
          <p className="text-[13px] text-muted-foreground">La tua dispensa</p>
        </div>

        {/* ─── B) Counters card ─── */}
        <button
          onClick={() => navigate("/expiry")}
          className="flex w-full items-center rounded-[18px] bg-card px-3.5 py-3 shadow-card active:shadow-card-hover active:scale-[0.98] transition-all"
          style={{ height: 56 }}
        >
          {[
            { n: counts.expired, label: "Scaduti", color: "hsl(1,76%,55%)" },
            { n: counts.expiring, label: "In scadenza", color: "hsl(37,90%,51%)" },
            { n: counts.nodate, label: "Senza data", color: "hsl(215,10%,62%)" },
          ].map(({ n, label, color }, i) => (
            <div key={label} className={`flex flex-1 items-center gap-1.5 ${i > 0 ? "border-l border-border pl-3" : ""}`}>
              <span className="text-lg font-semibold leading-none" style={{ color }}>{n}</span>
              <span className="text-[10px] font-medium leading-tight text-muted-foreground">{label}</span>
            </div>
          ))}
          <ChevronRight className="h-4 w-4 shrink-0 ml-1 text-muted-foreground" />
        </button>

        {/* ─── Risolvi tutto ─── */}
        {(counts.expired + counts.expiring + counts.nodate) > 0 && (
          <button
            onClick={() => setResolveOpen(true)}
            className="flex w-full items-center justify-center gap-2 rounded-[14px] py-2.5 text-[13px] font-medium transition-all active:scale-[0.98] bg-primary/8 text-primary"
          >
            <Zap className="h-4 w-4" />
            Risolvi tutto
          </button>
        )}

        {/* ─── Preparazioni card ─── */}
        <Link to="/preparations">
          <div className="flex items-center gap-3 rounded-[18px] bg-card px-3.5 py-3 shadow-card active:shadow-card-hover active:scale-[0.98] transition-all">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[12px]" style={{ backgroundColor: "hsl(263,75%,95%)" }}>
              <ChefHat className="h-[18px] w-[18px]" style={{ color: "hsl(263,60%,50%)" }} />
            </div>
            <div className="flex-1">
              <p className="text-[14px] font-medium" style={{ color: "hsl(220,20%,14%)" }}>Preparazioni</p>
              <p className="text-[12px] text-muted-foreground">Gestisci i tuoi piatti preparati</p>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </div>
        </Link>

        {/* ─── Search + filters ─── */}
        <div className="flex gap-2 items-center">
          <button
            onClick={() => setStorageSheet(true)}
            className="flex items-center gap-1 rounded-[12px] bg-card px-3 py-2 text-[12px] font-medium shadow-card shrink-0 text-foreground"
          >
            {storageChipLabel}
            <ChevronDown className="h-3 w-3 text-muted-foreground" />
          </button>
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Cerca..."
              className="h-9 rounded-[12px] border-0 bg-card pl-8 text-[13px] shadow-card text-foreground"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <button
            onClick={() => setFilterSheet(true)}
            className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-[12px] bg-card shadow-card"
          >
            <Filter className="h-3.5 w-3.5 text-muted-foreground" />
            {activeFilterCount > 0 && (
              <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[8px] font-semibold text-primary-foreground">
                {activeFilterCount}
              </span>
            )}
          </button>
        </div>

        {/* ─── E) Product list ─── */}
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center gap-1.5 rounded-[18px] bg-card p-8 shadow-card">
            <Package className="h-7 w-7 text-muted-foreground" />
            <p className="text-[14px] font-medium text-foreground">
              {search ? "Nessun risultato" : "Nessun prodotto da controllare"}
            </p>
            <p className="text-[12px] text-muted-foreground">
              {search ? "Prova con un altro termine" : "Premi + per aggiungere"}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map((item) => {
              const status = getStatusCustom(item.expiry_date);
              const cfg = statusCfg[status];
              const isAlert = status === "expired" || status === "expiring" || status === "nodate";
              return (
                <div
                  key={item.id}
                  className="flex items-center gap-2.5 rounded-[18px] bg-card px-3 py-2.5 shadow-card overflow-hidden transition-all"
                  style={{ minHeight: 64 }}
                >
                  {/* Color bar only for alert items */}
                  {isAlert && <div className={`w-[3px] self-stretch rounded-full ${cfg.barColor}`} />}
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[12px] bg-secondary overflow-hidden">
                    {item.product.image_url ? (
                      <img src={item.product.image_url} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <Package className="h-4 w-4 text-muted-foreground" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[14px] font-medium truncate text-foreground">
                      {item.product.name}
                    </p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      {item.expiry_date && (
                        <span className="text-[12px] flex items-center gap-0.5 text-muted-foreground">
                          <Clock className="h-2.5 w-2.5" />
                          {new Date(item.expiry_date).toLocaleDateString("it-IT")}
                        </span>
                      )}
                      <span className="text-[11px] text-muted-foreground">
                        {storageLabel[item.storage_type] ?? item.storage_type}
                        {item.quantity ? ` · x${item.quantity}` : ""}
                      </span>
                    </div>
                  </div>
                  {isAlert && (
                    <span className={`shrink-0 rounded-[8px] px-2 py-0.5 text-[9px] font-semibold text-white ${cfg.badgeBg}`}>
                      {cfg.label}
                    </span>
                  )}
                </div>
              );
            })}
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

      {/* ─── Filter bottom sheet ─── */}
      <Sheet open={filterSheet} onOpenChange={setFilterSheet}>
        <SheetContent side="bottom" className="rounded-t-2xl">
          <SheetHeader>
            <SheetTitle className="text-foreground">Filtri avanzati</SheetTitle>
          </SheetHeader>
          <div className="space-y-5 py-4">
            {/* Status */}
            <div>
              <p className="text-[14px] font-medium mb-2 text-foreground">Stato</p>
              <div className="flex gap-2 flex-wrap">
                {[
                  { key: "relevant", label: "Da controllare" },
                  { key: "expired", label: "Solo scaduti" },
                  { key: "expiring", label: "Solo in scadenza" },
                  { key: "nodate", label: "Senza data" },
                  { key: "all", label: "Tutti" },
                ].map(({ key, label }) => (
                  <button
                    key={key}
                    onClick={() => setStatusFilter(key)}
                    className={`rounded-[12px] px-4 py-2 text-[13px] font-medium transition-colors ${
                      statusFilter === key
                        ? "bg-primary text-primary-foreground"
                        : "bg-secondary text-foreground"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Days range */}
            <div>
              <p className="text-[14px] font-medium mb-2 text-foreground">Giorni alla scadenza</p>
              <div className="flex gap-2">
                {[1, 2, 3, 5, 7].map((d) => (
                  <button
                    key={d}
                    onClick={() => setDaysRange(d)}
                    className={`flex-1 rounded-[12px] py-2 text-[13px] font-medium transition-colors ${
                      daysRange === d
                        ? "bg-primary text-primary-foreground"
                        : "bg-secondary text-foreground"
                    }`}
                  >
                    {d}g
                  </button>
                ))}
              </div>
            </div>

            {/* Storage */}
            <div>
              <p className="text-[14px] font-medium mb-2 text-foreground">Conservazione</p>
              <div className="flex gap-2">
                {storageTabs.map(({ key, label }) => (
                  <button
                    key={key}
                    onClick={() => setStorageTab(key)}
                    className={`flex-1 rounded-[12px] py-2 text-[13px] font-medium transition-colors ${
                      storageTab === key
                        ? "bg-primary text-primary-foreground"
                        : "bg-secondary text-foreground"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <Button variant="outline" className="flex-1" onClick={() => { resetFilters(); setFilterSheet(false); }}>
                Reset
              </Button>
              <Button className="flex-1" onClick={() => setFilterSheet(false)}>
                Applica
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* ─── Storage bottom sheet ─── */}
      <Sheet open={storageSheet} onOpenChange={setStorageSheet}>
        <SheetContent side="bottom" className="rounded-t-2xl">
          <SheetHeader>
            <SheetTitle className="text-foreground">Conservazione</SheetTitle>
          </SheetHeader>
          <div className="flex flex-col gap-1 py-3">
            {storageTabs.map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                onClick={() => { setStorageTab(key); setStorageSheet(false); }}
                className={`flex items-center gap-3 rounded-xl px-4 py-3 text-[14px] font-medium transition-colors ${
                  storageTab === key ? "bg-primary/10 text-primary" : "text-foreground"
                }`}
              >
                <Icon className="h-4 w-4" />
                {key === "all" ? "Tutto" : label}
              </button>
            ))}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
};

export default Index;
