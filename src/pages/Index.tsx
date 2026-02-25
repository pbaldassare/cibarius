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
      <div style={{ backgroundColor: "#F5F7FA" }}>
        <MobileHeader title="Home" />
        <main className="space-y-4 px-4 py-5 pb-32">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-[72px] w-full rounded-2xl" />
          <Skeleton className="h-10 w-full rounded-xl" />
          <Skeleton className="h-64 w-full rounded-2xl" />
        </main>
      </div>
    );
  }

  return (
    <div style={{ backgroundColor: "#F5F7FA" }} className="min-h-screen">
      <MobileHeader title="Home" />
      <main className="space-y-4 px-4 pt-2 pb-32">

        {/* ─── A) Greeting (minimal) ─── */}
        <div className="pt-1">
          <h2 className="text-[18px] font-bold" style={{ color: "#111827" }}>
            {greeting}{firstName ? `, ${firstName}` : ""} 👋
          </h2>
          <p className="text-[13px] mt-0.5" style={{ color: "#4B5563" }}>
            Ecco la tua dispensa
          </p>
        </div>

        {/* ─── B) Card "Da controllare" COMPATTA ─── */}
        <button
          onClick={() => navigate("/expiry")}
          className="flex w-full items-center gap-4 rounded-2xl bg-white p-4 shadow-sm active:scale-[0.98] transition-transform"
          style={{ maxHeight: 72 }}
        >
          {[
            { n: counts.expired, label: "Scaduti", color: "#E53935" },
            { n: counts.expiring, label: "In scadenza", color: "#F59E0B" },
            { n: counts.nodate, label: "Senza data", color: "#9CA3AF" },
          ].map(({ n, label, color }, i) => (
            <div key={label} className="flex flex-1 items-center gap-2">
              {i > 0 && <div className="h-8 w-px" style={{ backgroundColor: "#E5E7EB" }} />}
              <div className={`flex items-center gap-2 ${i > 0 ? "pl-2" : ""}`}>
                <div className="flex h-8 w-8 items-center justify-center rounded-lg" style={{ backgroundColor: `${color}15` }}>
                  <span className="text-base font-bold" style={{ color }}>{n}</span>
                </div>
                <span className="text-[11px] font-medium leading-tight" style={{ color: "#4B5563" }}>{label}</span>
              </div>
            </div>
          ))}
        </button>

        {/* ─── C) Storage pills (1 row) ─── */}
        <div className="flex gap-1.5">
          {storageTabs.map(({ key, label, icon: Icon }) => {
            const active = storageTab === key;
            return (
              <button
                key={key}
                onClick={() => setStorageTab(key)}
                className={`flex flex-1 items-center justify-center gap-1 rounded-xl py-2 text-[13px] font-semibold transition-colors ${
                  active
                    ? "bg-primary text-white shadow-sm"
                    : "bg-white text-foreground"
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                {key === "all" ? "Tutto" : label}
              </button>
            );
          })}
        </div>

        {/* ─── D) Search + filter icon ─── */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" style={{ color: "#9CA3AF" }} />
            <Input
              placeholder="Cerca prodotto..."
              className="h-10 rounded-xl border-0 bg-white pl-9 text-[14px] shadow-sm"
              style={{ color: "#111827" }}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <button
            onClick={() => setFilterSheet(true)}
            className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white shadow-sm"
          >
            <Filter className="h-4 w-4" style={{ color: "#4B5563" }} />
            {activeFilterCount > 0 && (
              <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[9px] font-bold text-white">
                {activeFilterCount}
              </span>
            )}
          </button>
        </div>

        {/* ─── E) Lista prodotti ─── */}
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center gap-2 rounded-2xl bg-white p-10 shadow-sm">
            <Package className="h-8 w-8" style={{ color: "#9CA3AF" }} />
            <p className="text-[14px] font-medium" style={{ color: "#111827" }}>
              {search ? "Nessun risultato" : "Nessun prodotto da controllare"}
            </p>
            <p className="text-[12px]" style={{ color: "#4B5563" }}>
              {search ? "Prova con un altro termine" : "Premi + per aggiungere"}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map((item) => {
              const status = getStatusCustom(item.expiry_date);
              const cfg = statusCfg[status];
              return (
                <div
                  key={item.id}
                  className="flex items-center gap-3 rounded-2xl bg-white p-3 shadow-sm overflow-hidden"
                >
                  {/* Left accent bar */}
                  <div className={`w-1 self-stretch rounded-full ${cfg.barColor}`} />

                  {/* Image */}
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#F5F7FA] overflow-hidden">
                    {item.product.image_url ? (
                      <img src={item.product.image_url} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <Package className="h-5 w-5" style={{ color: "#9CA3AF" }} />
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-[14px] font-semibold truncate" style={{ color: "#111827" }}>
                      {item.product.name}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5">
                      {item.expiry_date && (
                        <span className="text-[12px] flex items-center gap-0.5" style={{ color: "#4B5563" }}>
                          <Clock className="h-3 w-3" />
                          {new Date(item.expiry_date).toLocaleDateString("it-IT")}
                        </span>
                      )}
                      <span className="text-[11px]" style={{ color: "#9CA3AF" }}>
                        {storageLabel[item.storage_type] ?? item.storage_type}
                        {item.quantity ? ` · x${item.quantity}` : ""}
                      </span>
                    </div>
                  </div>

                  {/* Badge */}
                  <span className={`shrink-0 rounded-lg px-2 py-0.5 text-[10px] font-bold text-white ${cfg.badgeBg}`}>
                    {cfg.label}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* ─── FAB ─── */}
      <div className="fixed bottom-[calc(72px+env(safe-area-inset-bottom,0px)+1rem)] right-4 z-40">
        <button
          onClick={() => setAddFoodOpen(true)}
          className="flex h-12 w-12 items-center justify-center rounded-full shadow-lg active:scale-95 transition-transform"
          style={{ backgroundColor: "hsl(196, 88%, 54%)" }}
          aria-label="Aggiungi"
        >
          <Plus className="h-5 w-5 text-white" />
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
            {/* Status */}
            <div>
              <p className="text-[14px] font-semibold mb-2" style={{ color: "#111827" }}>Stato</p>
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
                    className={`rounded-xl px-4 py-2 text-[13px] font-semibold transition-colors ${
                      statusFilter === key
                        ? "bg-primary text-white"
                        : "bg-[#F5F7FA] text-foreground"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Days range */}
            <div>
              <p className="text-[14px] font-semibold mb-2" style={{ color: "#111827" }}>Giorni alla scadenza</p>
              <div className="flex gap-2">
                {[1, 2, 3, 5, 7].map((d) => (
                  <button
                    key={d}
                    onClick={() => setDaysRange(d)}
                    className={`flex-1 rounded-xl py-2 text-[13px] font-semibold transition-colors ${
                      daysRange === d
                        ? "bg-primary text-white"
                        : "bg-[#F5F7FA] text-foreground"
                    }`}
                  >
                    {d}g
                  </button>
                ))}
              </div>
            </div>

            {/* Storage */}
            <div>
              <p className="text-[14px] font-semibold mb-2" style={{ color: "#111827" }}>Conservazione</p>
              <div className="flex gap-2">
                {storageTabs.map(({ key, label }) => (
                  <button
                    key={key}
                    onClick={() => setStorageTab(key)}
                    className={`flex-1 rounded-xl py-2 text-[13px] font-semibold transition-colors ${
                      storageTab === key
                        ? "bg-primary text-white"
                        : "bg-[#F5F7FA] text-foreground"
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
    </div>
  );
};

export default Index;
