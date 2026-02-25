import { useState, useEffect, useMemo } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import MobileHeader from "@/components/MobileHeader";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import AddFoodFlow from "@/components/AddFoodFlow";
import {
  Package, Clock, AlertCircle, HelpCircle, Check, Trash2, CalendarClock,
  Plus, ChefHat, SlidersHorizontal, X,
} from "lucide-react";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle,
} from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";

interface ExpiryItem {
  id: string;
  type: "product" | "preparation";
  name: string;
  image_url: string | null;
  expiry_date: string | null;
  storage_type: string;
  quantity: number | null;
  unit: string | null;
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

const statusTabs = [
  { key: "expired", label: "Scaduti", icon: AlertCircle },
  { key: "expiring", label: "In scadenza", icon: Clock },
  { key: "nodate", label: "Senza data", icon: HelpCircle },
  { key: "all", label: "Tutti", icon: Package },
] as const;

const ExpiryPage = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [items, setItems] = useState<ExpiryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<string>("expired");
  const [storageFilter, setStorageFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [filterSheetOpen, setFilterSheetOpen] = useState(false);
  const [actionSheet, setActionSheet] = useState<ExpiryItem | null>(null);
  const [addFoodOpen, setAddFoodOpen] = useState(false);
  const [newDate, setNewDate] = useState("");

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
        .select("id, name, use_by_date, storage_type, portions, image_url")
        .eq("owner_user_id", user.id),
    ]);

    const result: ExpiryItem[] = [];
    if (invRes.data) {
      for (const i of invRes.data as any[]) {
        result.push({
          id: i.id, type: "product",
          name: i.product?.name ?? "Prodotto",
          image_url: i.product?.image_url ?? null,
          expiry_date: i.expiry_date,
          storage_type: i.storage_type,
          quantity: i.quantity, unit: i.unit,
        });
      }
    }
    if (prepRes.data) {
      for (const p of prepRes.data as any[]) {
        result.push({
          id: p.id, type: "preparation",
          name: p.name,
          image_url: p.image_url ?? null,
          expiry_date: p.use_by_date,
          storage_type: p.storage_type ?? "frigo",
          quantity: p.portions, unit: "porzioni",
        });
      }
    }

    setItems(result);
    setLoading(false);
  };

  useEffect(() => { fetchItems(); }, [user]);

  const filtered = useMemo(() => {
    let list = items;
    if (activeTab !== "all") list = list.filter((i) => getStatus(i.expiry_date) === activeTab);
    if (storageFilter !== "all") list = list.filter((i) => i.storage_type === storageFilter);
    if (typeFilter !== "all") list = list.filter((i) => i.type === typeFilter);

    const order: Record<ExpiryStatus, number> = { expired: 0, expiring: 1, nodate: 2, ok: 3 };
    return [...list].sort((a, b) => {
      const sa = getStatus(a.expiry_date), sb = getStatus(b.expiry_date);
      if (order[sa] !== order[sb]) return order[sa] - order[sb];
      if (a.expiry_date && b.expiry_date) return a.expiry_date.localeCompare(b.expiry_date);
      return a.expiry_date ? -1 : 1;
    });
  }, [items, activeTab, storageFilter, typeFilter]);

  const handleConsume = async (item: ExpiryItem) => {
    if (item.type === "product") {
      await supabase.from("inventory_items").delete().eq("id", item.id);
    } else {
      await supabase.from("preparations").delete().eq("id", item.id);
    }
    toast({ title: "Segnato come consumato ✓" });
    setActionSheet(null);
    fetchItems();
  };

  const handleTrash = async (item: ExpiryItem) => {
    if (item.type === "product") {
      await supabase.from("inventory_items").delete().eq("id", item.id);
    } else {
      await supabase.from("preparations").delete().eq("id", item.id);
    }
    toast({ title: "Segnato come buttato 🗑" });
    setActionSheet(null);
    fetchItems();
  };

  const handleUpdateDate = async (item: ExpiryItem) => {
    if (!newDate) return;
    if (item.type === "product") {
      await supabase.from("inventory_items").update({ expiry_date: newDate }).eq("id", item.id);
    } else {
      await supabase.from("preparations").update({ use_by_date: newDate }).eq("id", item.id);
    }
    toast({ title: "Data aggiornata ✓" });
    setActionSheet(null);
    setNewDate("");
    fetchItems();
  };

  const tabCounts = useMemo(() => {
    const c: Record<string, number> = { expired: 0, expiring: 0, nodate: 0, all: items.length };
    items.forEach((i) => { const s = getStatus(i.expiry_date); if (s in c) c[s]++; });
    return c;
  }, [items]);

  const activeFilterCount = (storageFilter !== "all" ? 1 : 0) + (typeFilter !== "all" ? 1 : 0);

  if (loading) {
    return (
      <div>
        <MobileHeader title="Scadenze" showBack />
        <main className="space-y-4 px-4 py-5 pb-28">
          <Skeleton className="h-10 w-full rounded-2xl" />
          <Skeleton className="h-64 w-full rounded-2xl" />
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <MobileHeader title="Scadenze" showBack />
      <main className="space-y-3 px-4 py-4 pb-28">
        {/* Status tabs + filter button */}
        <div className="flex items-center gap-2">
          <div className="flex-1 flex gap-1.5 overflow-x-auto no-scrollbar">
            {statusTabs.map(({ key, label, icon: Icon }) => {
              const active = activeTab === key;
              return (
                <button
                  key={key}
                  onClick={() => setActiveTab(key)}
                  className={`flex items-center gap-1 whitespace-nowrap rounded-full px-3 py-1.5 text-[13px] font-medium transition-colors ${
                    active
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "bg-card text-foreground border border-border"
                  }`}
                >
                  <Icon className="h-3 w-3" />
                  {label}
                  <span className={`text-[11px] ${active ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
                    {tabCounts[key] ?? 0}
                  </span>
                </button>
              );
            })}
          </div>
          <button
            onClick={() => setFilterSheetOpen(true)}
            className={`flex items-center gap-1 rounded-full px-3 py-1.5 text-[13px] font-medium border transition-colors shrink-0 ${
              activeFilterCount > 0 ? "bg-primary text-primary-foreground border-primary" : "bg-card text-foreground border-border"
            }`}
          >
            <SlidersHorizontal className="h-3.5 w-3.5" />
            {activeFilterCount > 0 && <span>{activeFilterCount}</span>}
          </button>
        </div>

        {/* List */}
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center gap-2 rounded-[18px] bg-card p-8 shadow-card">
            <Check className="h-10 w-10 text-success" />
            <p className="text-[14px] font-medium text-foreground">Tutto in ordine!</p>
            <p className="text-[12px] text-muted-foreground">Nessun elemento in questa categoria</p>
          </div>
        ) : (
          <div className="space-y-1.5">
            {filtered.map((item) => {
              const status = getStatus(item.expiry_date);
              const cfg = statusCfg[status];
              const isPrep = item.type === "preparation";
              return (
                <button
                  key={`${item.type}-${item.id}`}
                  className="flex w-full items-center gap-2.5 rounded-[16px] bg-card px-3 py-2.5 shadow-card text-left active:scale-[0.98] transition-all"
                  onClick={() => { setActionSheet(item); setNewDate(item.expiry_date ?? ""); }}
                >
                  {/* Left accent bar */}
                  <div className={`w-[3px] self-stretch rounded-full ${cfg.barColor}`} />
                  {/* Image */}
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[10px] bg-secondary overflow-hidden">
                    {item.image_url ? (
                      <img src={item.image_url} alt="" className="h-full w-full object-cover" />
                    ) : isPrep ? (
                      <ChefHat className="h-5 w-5 text-muted-foreground" />
                    ) : (
                      <Package className="h-5 w-5 text-muted-foreground" />
                    )}
                  </div>
                  {/* Text */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className="text-[15px] font-medium truncate text-foreground">{item.name}</p>
                      {isPrep && (
                        <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded bg-accent/10 text-accent">
                          PREP
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
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
                  {/* Badge */}
                  <span
                    className="shrink-0 rounded-[8px] px-2 py-0.5 text-[9px] font-semibold text-white"
                    style={{ backgroundColor: cfg.color }}
                  >
                    {cfg.label}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </main>

      {/* ═══ Filter Bottom Sheet ═══ */}
      <Sheet open={filterSheetOpen} onOpenChange={setFilterSheetOpen}>
        <SheetContent side="bottom" className="rounded-t-3xl">
          <SheetHeader className="pb-3">
            <div className="flex items-center justify-between">
              <SheetTitle className="text-foreground">Filtri</SheetTitle>
              {activeFilterCount > 0 && (
                <button
                  onClick={() => { setStorageFilter("all"); setTypeFilter("all"); }}
                  className="text-xs font-medium text-primary"
                >
                  Resetta
                </button>
              )}
            </div>
          </SheetHeader>
          <div className="space-y-5 py-2 pb-6">
            {/* Type toggle */}
            <div className="space-y-2">
              <p className="text-sm font-semibold text-foreground">Tipo</p>
              <div className="flex gap-2">
                {[
                  { key: "all", label: "Tutto" },
                  { key: "product", label: "Prodotti" },
                  { key: "preparation", label: "Preparazioni" },
                ].map(({ key, label }) => (
                  <button
                    key={key}
                    onClick={() => setTypeFilter(key)}
                    className={`flex-1 rounded-xl py-2.5 text-sm font-medium transition-colors ${
                      typeFilter === key
                        ? "bg-primary text-primary-foreground"
                        : "bg-card border border-border text-foreground"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Storage filter */}
            <div className="space-y-2">
              <p className="text-sm font-semibold text-foreground">Conservazione</p>
              <div className="flex gap-2">
                {[
                  { key: "all", label: "Tutti" },
                  { key: "ambiente", label: "Dispensa" },
                  { key: "frigo", label: "Frigo" },
                  { key: "freezer", label: "Congelatore" },
                ].map(({ key, label }) => (
                  <button
                    key={key}
                    onClick={() => setStorageFilter(key)}
                    className={`flex-1 rounded-xl py-2.5 text-sm font-medium transition-colors ${
                      storageFilter === key
                        ? "bg-primary text-primary-foreground"
                        : "bg-card border border-border text-foreground"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <Button className="w-full h-12 rounded-2xl text-base font-semibold" onClick={() => setFilterSheetOpen(false)}>
              Applica filtri
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      {/* ═══ Action sheet ═══ */}
      <Sheet open={!!actionSheet} onOpenChange={(o) => { if (!o) setActionSheet(null); }}>
        <SheetContent side="bottom" className="rounded-t-3xl">
          <SheetHeader>
            <SheetTitle className="text-foreground">{actionSheet?.name}</SheetTitle>
          </SheetHeader>
          <div className="space-y-3 py-4">
            <Button
              className="w-full justify-start gap-3 h-12 rounded-xl"
              variant="outline"
              onClick={() => actionSheet && handleConsume(actionSheet)}
            >
              <Check className="h-4 w-4 text-success" /> Consumato
            </Button>
            <Button
              className="w-full justify-start gap-3 h-12 rounded-xl"
              variant="outline"
              onClick={() => actionSheet && handleTrash(actionSheet)}
            >
              <Trash2 className="h-4 w-4 text-destructive" /> Buttato
            </Button>
            <div className="flex gap-2">
              <Input
                type="date"
                value={newDate}
                onChange={(e) => setNewDate(e.target.value)}
                className="flex-1 h-12 rounded-xl"
              />
              <Button className="h-12 rounded-xl" onClick={() => actionSheet && handleUpdateDate(actionSheet)}>
                <CalendarClock className="h-4 w-4 mr-1" /> Aggiorna
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* FAB */}
      <div className="fixed bottom-[calc(72px+env(safe-area-inset-bottom,0px)+1rem)] right-4 z-40">
        <button
          onClick={() => setAddFoodOpen(true)}
          className="flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-elevated active:scale-95 transition-transform"
          aria-label="Aggiungi"
        >
          <Plus className="h-5 w-5" strokeWidth={2.2} />
        </button>
      </div>

      <AddFoodFlow
        open={addFoodOpen}
        onOpenChange={setAddFoodOpen}
        context="inventory"
        onComplete={fetchItems}
      />
    </div>
  );
};

export default ExpiryPage;
