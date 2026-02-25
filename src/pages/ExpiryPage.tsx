import { useState, useEffect, useMemo } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import MobileHeader from "@/components/MobileHeader";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import AddFoodFlow from "@/components/AddFoodFlow";
import {
  Package, Clock, AlertCircle, HelpCircle, Check, Trash2, CalendarClock,
  Archive, Thermometer, Snowflake, Plus, ChefHat,
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

const statusCfg: Record<ExpiryStatus, { label: string; cls: string }> = {
  expired:  { label: "SCADUTO",     cls: "bg-destructive text-destructive-foreground" },
  expiring: { label: "IN SCADENZA", cls: "bg-accent text-accent-foreground" },
  ok:       { label: "OK",          cls: "bg-success text-success-foreground" },
  nodate:   { label: "SENZA DATA",  cls: "bg-muted text-muted-foreground" },
};

const storageLabel: Record<string, string> = {
  frigo: "Frigo", freezer: "Congelatore", ambiente: "Dispensa",
};

const tabs = [
  { key: "expired", label: "Scaduti", icon: AlertCircle },
  { key: "expiring", label: "In scadenza", icon: Clock },
  { key: "nodate", label: "Senza data", icon: HelpCircle },
  { key: "all", label: "Tutti", icon: Package },
] as const;

const storageTabs = [
  { key: "all", label: "Tutti" },
  { key: "ambiente", label: "Dispensa" },
  { key: "frigo", label: "Frigo" },
  { key: "freezer", label: "Congelatore" },
];

const typeTabs = [
  { key: "all", label: "Tutto" },
  { key: "product", label: "Prodotti" },
  { key: "preparation", label: "Preparazioni" },
];

const ExpiryPage = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [items, setItems] = useState<ExpiryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<string>("expired");
  const [storageFilter, setStorageFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
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
    <div>
      <MobileHeader title="Scadenze" showBack />
      <main className="space-y-4 px-4 py-4 pb-28">
        {/* Tabs */}
        <div className="flex gap-1.5 overflow-x-auto no-scrollbar">
          {tabs.map(({ key, label, icon: Icon }) => {
            const active = activeTab === key;
            return (
              <button
                key={key}
                onClick={() => setActiveTab(key)}
                className={`flex items-center gap-1.5 whitespace-nowrap rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
                  active
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "bg-card text-foreground border border-border"
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                {label}
                <span className={`ml-0.5 text-xs ${active ? "text-primary-foreground/80" : "text-muted-foreground"}`}>
                  ({tabCounts[key] ?? 0})
                </span>
              </button>
            );
          })}
        </div>

        {/* Type filter: Tutto | Prodotti | Preparazioni */}
        <div className="flex gap-2">
          {typeTabs.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setTypeFilter(key)}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                typeFilter === key
                  ? "bg-primary text-primary-foreground"
                  : "bg-card text-foreground border border-border"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Storage filter */}
        <div className="flex gap-2">
          {storageTabs.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setStorageFilter(key)}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                storageFilter === key
                  ? "bg-primary text-primary-foreground"
                  : "bg-card text-foreground border border-border"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* List */}
        {filtered.length === 0 ? (
          <Card className="border-0 shadow-sm">
            <CardContent className="p-8 text-center">
              <Check className="h-10 w-10 mx-auto mb-2 text-success" />
              <p className="text-sm font-medium" style={{ color: "#111827" }}>Tutto in ordine!</p>
              <p className="text-xs mt-1" style={{ color: "#4B5563" }}>Nessun elemento in questa categoria</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {filtered.map((item) => {
              const status = getStatus(item.expiry_date);
              const cfg = statusCfg[status];
              const isPrep = item.type === "preparation";
              return (
                <Card
                  key={`${item.type}-${item.id}`}
                  className="border-0 shadow-sm cursor-pointer active:scale-[0.98] transition-transform"
                  onClick={() => { setActionSheet(item); setNewDate(item.expiry_date ?? ""); }}
                >
                  <CardContent className="flex items-center gap-3 p-3">
                    <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-secondary overflow-hidden">
                      {item.image_url ? (
                        <img src={item.image_url} alt="" className="h-full w-full object-cover" />
                      ) : isPrep ? (
                        <ChefHat className="h-6 w-6 text-muted-foreground" />
                      ) : (
                        <Package className="h-6 w-6 text-muted-foreground" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <p className="text-sm font-bold truncate" style={{ color: "#111827" }}>{item.name}</p>
                        {isPrep && (
                          <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded bg-[#EDE9FE]" style={{ color: "#7C3AED" }}>
                            PREP
                          </span>
                        )}
                      </div>
                      {item.expiry_date && (
                        <p className="text-xs flex items-center gap-1 mt-0.5" style={{ color: "#4B5563" }}>
                          <Clock className="h-3 w-3" />
                          {new Date(item.expiry_date).toLocaleDateString("it-IT")}
                        </p>
                      )}
                      <p className="text-[10px] mt-0.5" style={{ color: "#4B5563" }}>
                        {storageLabel[item.storage_type] ?? item.storage_type}
                        {item.quantity ? ` · x${item.quantity}` : ""}
                      </p>
                    </div>
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

      {/* Action sheet */}
      <Sheet open={!!actionSheet} onOpenChange={(o) => { if (!o) setActionSheet(null); }}>
        <SheetContent side="bottom" className="rounded-t-2xl">
          <SheetHeader>
            <SheetTitle style={{ color: "#111827" }}>{actionSheet?.name}</SheetTitle>
          </SheetHeader>
          <div className="space-y-3 py-4">
            <Button
              className="w-full justify-start gap-3"
              variant="outline"
              onClick={() => actionSheet && handleConsume(actionSheet)}
            >
              <Check className="h-4 w-4 text-success" /> Consumato
            </Button>
            <Button
              className="w-full justify-start gap-3"
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
                className="flex-1"
              />
              <Button onClick={() => actionSheet && handleUpdateDate(actionSheet)}>
                <CalendarClock className="h-4 w-4 mr-1" /> Aggiorna data
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* FAB */}
      <div className="fixed bottom-[calc(72px+env(safe-area-inset-bottom,0px)+1rem)] right-4 z-40">
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
    </div>
  );
};

export default ExpiryPage;
