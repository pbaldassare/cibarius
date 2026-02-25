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
import {
  AlertTriangle, Clock, Package, Plus,
  ScanLine, Snowflake, Archive, Search,
  Thermometer, AlertCircle, HelpCircle, Filter,
  X,
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

const statusCfg: Record<ExpiryStatus, { label: string; cls: string; dot: string }> = {
  expired:  { label: "SCADUTO",     cls: "bg-destructive text-destructive-foreground", dot: "bg-destructive" },
  expiring: { label: "IN SCADENZA", cls: "bg-accent text-accent-foreground",           dot: "bg-accent" },
  ok:       { label: "OK",          cls: "bg-success text-success-foreground",          dot: "bg-success" },
  nodate:   { label: "SENZA DATA",  cls: "bg-muted text-muted-foreground",             dot: "bg-muted-foreground" },
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
  const [loading, setLoading] = useState(true);
  const [storageTab, setStorageTab] = useState("all");
  const [search, setSearch] = useState("");
  const [filterSheet, setFilterSheet] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>("relevant");
  const [daysRange, setDaysRange] = useState(3);
  const [addFoodOpen, setAddFoodOpen] = useState(false);
  const debouncedSearch = useDebounce(search, 250);

  // Redirect non-user roles
  useEffect(() => {
    if (!roleLoading && role && role !== "user") {
      navigate(getRoleHomePath(role), { replace: true });
    }
  }, [role, roleLoading, navigate]);

  const fetchItems = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("inventory_items")
      .select("id, expiry_date, storage_type, quantity, unit, product:products(name, image_url)")
      .eq("owner_user_id", user.id)
      .order("expiry_date", { ascending: true, nullsFirst: false });
    if (data) setItems(data as unknown as InventoryItem[]);
    setLoading(false);
  };

  useEffect(() => {
    fetchItems();
  }, [user]);

  // Counts
  const counts = useMemo(() => {
    let expired = 0, expiring = 0, nodate = 0;
    items.forEach((i) => {
      const s = getStatus(i.expiry_date);
      if (s === "expired") expired++;
      else if (s === "expiring") expiring++;
      else if (s === "nodate") nodate++;
    });
    return { expired, expiring, nodate };
  }, [items]);

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

  if (loading) {
    return (
      <div>
        <MobileHeader title="Home" />
        <main className="space-y-4 px-4 py-5 pb-28">
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-28 w-full rounded-2xl" />
          <Skeleton className="h-10 w-full rounded-2xl" />
          <Skeleton className="h-64 w-full rounded-2xl" />
        </main>
      </div>
    );
  }

  return (
    <div>
      <MobileHeader title="Home" />
      <main className="space-y-4 px-4 py-4 pb-28">
        {/* Greeting */}
        <div>
          <h2 className="text-xl font-bold" style={{ color: "#111827" }}>
            {greeting}{firstName ? `, ${firstName}` : ""} 👋
          </h2>
          <p className="mt-0.5 text-sm" style={{ color: "#4B5563" }}>
            Controlla le scadenze e gestisci la tua dispensa
          </p>
        </div>

        {/* ─── SEZIONE A: Da controllare ─── */}
        <Card
          className="cursor-pointer border-0 shadow-md active:scale-[0.98] transition-transform"
          onClick={() => navigate("/expiry")}
        >
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-destructive/10">
                <AlertTriangle className="h-4 w-4 text-destructive" />
              </div>
              <h3 className="text-base font-bold" style={{ color: "#111827" }}>Da controllare</h3>
            </div>
            <div className="grid grid-cols-3 gap-3">
              {[
                { n: counts.expired, label: "Scaduti", icon: AlertCircle, color: "text-destructive", bg: "bg-destructive/10" },
                { n: counts.expiring, label: "In scadenza", icon: Clock, color: "text-accent", bg: "bg-accent/10" },
                { n: counts.nodate, label: "Senza data", icon: HelpCircle, color: "text-muted-foreground", bg: "bg-muted" },
              ].map(({ n, label, icon: Icon, color, bg }) => (
                <div key={label} className="flex flex-col items-center gap-1 rounded-xl p-3" style={{ backgroundColor: "white" }}>
                  <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${bg}`}>
                    <Icon className={`h-4 w-4 ${color}`} />
                  </div>
                  <span className="text-2xl font-bold" style={{ color: "#111827" }}>{n}</span>
                  <span className="text-[10px] font-medium" style={{ color: "#4B5563" }}>{label}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* ─── SEZIONE B: Tab Conservazione ─── */}
        <div className="flex gap-2 overflow-x-auto no-scrollbar">
          {storageTabs.map(({ key, label, icon: Icon }) => {
            const active = storageTab === key;
            return (
              <button
                key={key}
                onClick={() => setStorageTab(key)}
                className={`flex items-center gap-1.5 whitespace-nowrap rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
                  active
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "bg-card text-foreground border border-border"
                }`}
              >
                <Icon className="h-4 w-4" />
                {label}
              </button>
            );
          })}
        </div>

        {/* ─── Search + Filters ─── */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" style={{ color: "#4B5563" }} />
            <Input
              placeholder="Cerca nel tuo inventario..."
              className="pl-9 bg-card border-border"
              style={{ color: "#111827" }}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Button
            variant="outline"
            size="icon"
            className="border-border bg-card"
            onClick={() => setFilterSheet(true)}
          >
            <Filter className="h-4 w-4" />
          </Button>
        </div>

        {/* Quick status filters */}
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
              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                statusFilter === key
                  ? "bg-primary text-primary-foreground"
                  : "bg-card text-foreground border border-border"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* ─── SEZIONE C: Lista prodotti ─── */}
        {filtered.length === 0 ? (
          <Card className="border-0 shadow-sm">
            <CardContent className="p-8 text-center">
              <Package className="h-10 w-10 mx-auto mb-2" style={{ color: "#4B5563" }} />
              <p className="text-sm font-medium" style={{ color: "#111827" }}>
                {search ? "Nessun risultato" : "Nessun prodotto da controllare"}
              </p>
              <p className="text-xs mt-1" style={{ color: "#4B5563" }}>
                {search ? "Prova con un altro termine" : "Aggiungi prodotti per iniziare"}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {filtered.map((item) => {
              const status = getStatusCustom(item.expiry_date);
              const cfg = statusCfg[status];
              return (
                <Card key={item.id} className="border-0 shadow-sm">
                  <CardContent className="flex items-center gap-3 p-3">
                    {/* Image */}
                    <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-secondary overflow-hidden">
                      {item.product.image_url ? (
                        <img src={item.product.image_url} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <Package className="h-6 w-6 text-muted-foreground" />
                      )}
                    </div>
                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold truncate" style={{ color: "#111827" }}>{item.product.name}</p>
                      {item.expiry_date && (
                        <p className="text-xs flex items-center gap-1 mt-0.5" style={{ color: "#4B5563" }}>
                          <Clock className="h-3 w-3" />
                          {new Date(item.expiry_date).toLocaleDateString("it-IT")}
                        </p>
                      )}
                      <p className="text-[10px] mt-0.5" style={{ color: "#4B5563" }}>
                        {storageLabel[item.storage_type] ?? item.storage_type}
                        {item.quantity ? ` · x${item.quantity} ${item.unit ?? ""}` : ""}
                      </p>
                    </div>
                    {/* Badge */}
                    <Badge className={`shrink-0 rounded-lg px-2.5 py-1 text-[10px] font-bold ${cfg.cls}`}>
                      {cfg.label}
                    </Badge>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </main>

      {/* ─── SEZIONE D: FAB rapide ─── */}
      <div className="fixed bottom-[calc(72px+env(safe-area-inset-bottom,0px)+1rem)] right-4 z-40 flex flex-col gap-2">
        <button
          onClick={() => setAddFoodOpen(true)}
          className="flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg active:scale-95 transition-transform"
          aria-label="Aggiungi"
        >
          <Plus className="h-6 w-6" />
        </button>
      </div>

      <AddFoodFlow
        open={addFoodOpen}
        onOpenChange={setAddFoodOpen}
        context="inventory"
        onComplete={fetchItems}
      />

      {/* ─── Filter bottom sheet ─── */}
      <Sheet open={filterSheet} onOpenChange={setFilterSheet}>
        <SheetContent side="bottom" className="rounded-t-2xl">
          <SheetHeader>
            <SheetTitle style={{ color: "#111827" }}>Filtri avanzati</SheetTitle>
          </SheetHeader>
          <div className="space-y-5 py-4">
            {/* Days range */}
            <div>
              <p className="text-sm font-semibold mb-2" style={{ color: "#111827" }}>Giorni alla scadenza</p>
              <div className="flex gap-2">
                {[1, 2, 3, 5, 7].map((d) => (
                  <button
                    key={d}
                    onClick={() => setDaysRange(d)}
                    className={`flex-1 rounded-xl py-2 text-sm font-semibold transition-colors ${
                      daysRange === d
                        ? "bg-primary text-primary-foreground"
                        : "bg-card border border-border text-foreground"
                    }`}
                  >
                    {d}g
                  </button>
                ))}
              </div>
            </div>

            {/* Storage */}
            <div>
              <p className="text-sm font-semibold mb-2" style={{ color: "#111827" }}>Conservazione</p>
              <div className="flex gap-2">
                {storageTabs.map(({ key, label }) => (
                  <button
                    key={key}
                    onClick={() => setStorageTab(key)}
                    className={`flex-1 rounded-xl py-2 text-sm font-semibold transition-colors ${
                      storageTab === key
                        ? "bg-primary text-primary-foreground"
                        : "bg-card border border-border text-foreground"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Status */}
            <div>
              <p className="text-sm font-semibold mb-2" style={{ color: "#111827" }}>Stato</p>
              <div className="flex gap-2 flex-wrap">
                {[
                  { key: "all", label: "Tutti" },
                  { key: "expired", label: "Scaduti" },
                  { key: "expiring", label: "In scadenza" },
                  { key: "nodate", label: "Senza data" },
                  { key: "ok", label: "OK" },
                ].map(({ key, label }) => (
                  <button
                    key={key}
                    onClick={() => setStatusFilter(key)}
                    className={`rounded-xl px-4 py-2 text-sm font-semibold transition-colors ${
                      statusFilter === key
                        ? "bg-primary text-primary-foreground"
                        : "bg-card border border-border text-foreground"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <Button className="w-full" onClick={() => setFilterSheet(false)}>
              Applica filtri
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
};

export default Index;
