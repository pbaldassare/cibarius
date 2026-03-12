import { useState, useEffect, useMemo } from "react";
import { useRestaurant } from "@/hooks/useRestaurant";
import { supabase } from "@/integrations/supabase/client";
import MobileHeader from "@/components/MobileHeader";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Checkbox } from "@/components/ui/checkbox";
import SearchBar from "@/components/SearchBar";
import ResolveExpiryFlow from "@/components/ResolveExpiryFlow";
import {
  Package, Clock, AlertCircle, Check, Trash2, CalendarClock,
  ChefHat, CheckSquare, Refrigerator, Snowflake, Home, Zap,
  UtensilsCrossed,
} from "lucide-react";
import { getFoodEmoji } from "@/lib/food-images";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle,
} from "@/components/ui/sheet";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
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
  lot_number: string | null;
}

type ExpiryStatus = "expired" | "expiring" | "ok";

const getStatus = (d: string | null): ExpiryStatus => {
  if (!d) return "ok";
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
};

const storageLabel: Record<string, string> = {
  frigo: "Frigo", freezer: "Congelatore", ambiente: "Dispensa",
};

const statusTabs = [
  { key: "expired", label: "Scaduti", icon: AlertCircle },
  { key: "expiring", label: "In scadenza", icon: Clock },
  { key: "all", label: "Tutti", icon: Package },
] as const;

const RestaurantExpiryPage = () => {
  const { restaurant } = useRestaurant();
  const { toast } = useToast();
  const [items, setItems] = useState<ExpiryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<string>("expired");
  const [storageFilter, setStorageFilter] = useState("all");
  const [actionSheet, setActionSheet] = useState<ExpiryItem | null>(null);
  const [newDate, setNewDate] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [resolveOpen, setResolveOpen] = useState(false);

  // Selection mode
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const fetchItems = async () => {
    if (!restaurant) return;

    const [invRes, prepRes] = await Promise.all([
      supabase
        .from("inventory_items")
        .select("id, expiry_date, storage_type, quantity, unit, lot_number, product:products(name, image_url)")
        .eq("restaurant_id", restaurant.id)
        .order("expiry_date", { ascending: true, nullsFirst: false }),
      supabase
        .from("preparations")
        .select("id, name, use_by_date, storage_type, portions, image_url, lot_number")
        .eq("restaurant_id", restaurant.id),
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
          lot_number: i.lot_number ?? null,
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
          lot_number: p.lot_number ?? null,
        });
      }
    }

    setItems(result);
    setLoading(false);
  };

  useEffect(() => { fetchItems(); }, [restaurant]);

  const filtered = useMemo(() => {
    let list = items;
    if (activeTab !== "all") list = list.filter((i) => getStatus(i.expiry_date) === activeTab);
    if (storageFilter !== "all") list = list.filter((i) => i.storage_type === storageFilter);
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter((i) => i.name.toLowerCase().includes(q));
    }
    const order: Record<ExpiryStatus, number> = { expired: 0, expiring: 1, ok: 2 };
    return [...list].sort((a, b) => {
      const sa = getStatus(a.expiry_date), sb = getStatus(b.expiry_date);
      if (order[sa] !== order[sb]) return order[sa] - order[sb];
      if (a.expiry_date && b.expiry_date) return a.expiry_date.localeCompare(b.expiry_date);
      return a.expiry_date ? -1 : 1;
    });
  }, [items, activeTab, storageFilter, searchQuery]);

  const handleConsume = async (item: ExpiryItem) => {
    if (item.type === "product") {
      await supabase.from("inventory_items").delete().eq("id", item.id);
    } else {
      await supabase.from("preparations").delete().eq("id", item.id);
    }
    toast({ title: "Segnato come utilizzato ✓" });
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

  const handleChangeStorage = async (item: ExpiryItem, newStorage: string) => {
    if (item.storage_type === newStorage) return;
    if (item.type === "product") {
      await supabase.from("inventory_items").update({ storage_type: newStorage }).eq("id", item.id);
    } else {
      await supabase.from("preparations").update({ storage_type: newStorage }).eq("id", item.id);
    }
    toast({ title: `Spostato in ${storageLabel[newStorage] ?? newStorage} ✓` });
    setActionSheet((prev) => prev ? { ...prev, storage_type: newStorage } : null);
    fetchItems();
  };

  const tabCounts = useMemo(() => {
    const c: Record<string, number> = { expired: 0, expiring: 0, all: items.length };
    items.forEach((i) => { const s = getStatus(i.expiry_date); if (s in c) c[s]++; });
    return c;
  }, [items]);

  // Selection helpers
  const toggleSelection = (itemKey: string) => {
    const next = new Set(selectedIds);
    if (next.has(itemKey)) next.delete(itemKey); else next.add(itemKey);
    setSelectedIds(next);
  };
  const selectAll = () => setSelectedIds(new Set(filtered.map((i) => `${i.type}-${i.id}`)));
  const exitSelectionMode = () => { setSelectionMode(false); setSelectedIds(new Set()); };

  const handleBulkDelete = async () => {
    setDeleting(true);
    const invIds: string[] = [];
    const prepIds: string[] = [];
    selectedIds.forEach((key) => {
      const [type, ...rest] = key.split("-");
      const id = rest.join("-");
      if (type === "preparation") prepIds.push(id);
      else invIds.push(id);
    });
    if (invIds.length) await supabase.from("inventory_items").delete().in("id", invIds);
    if (prepIds.length) await supabase.from("preparations").delete().in("id", prepIds);
    toast({ title: `${selectedIds.size} elementi eliminati ✓` });
    setConfirmDeleteOpen(false);
    setDeleting(false);
    exitSelectionMode();
    fetchItems();
  };

  const urgentCount = tabCounts.expired + tabCounts.expiring;

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

  const headerRight = (
    <div className="flex items-center gap-1">
      {selectionMode ? (
        <>
          <button onClick={selectAll} className="text-[12px] font-medium text-white px-2 py-1 rounded-lg active:bg-white/10">Tutti</button>
          <button onClick={exitSelectionMode} className="text-[12px] font-medium text-white px-2 py-1 rounded-lg active:bg-white/10">Annulla</button>
        </>
      ) : (
        <button onClick={() => setSelectionMode(true)} className="p-1.5 rounded-lg active:bg-white/10 transition-colors" aria-label="Seleziona">
          <CheckSquare className="h-[18px] w-[18px] text-white" strokeWidth={2} />
        </button>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      <MobileHeader title="Scadenze" showBack right={headerRight} />
      <main className="space-y-3 px-4 py-4 pb-28">
        {/* Smart resolve banner */}
        {urgentCount > 0 && (
          <button
            onClick={() => setResolveOpen(true)}
            className="flex w-full items-center gap-3 rounded-[16px] bg-primary/10 border border-primary/20 px-4 py-3.5 text-left active:scale-[0.98] transition-all"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/20">
              <Zap className="h-5 w-5 text-primary" strokeWidth={2} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[14px] font-semibold text-foreground">Gestisci scadenze</p>
              <p className="text-[12px] text-muted-foreground">{urgentCount} prodott{urgentCount === 1 ? "o" : "i"} da risolvere · Swipe per agire</p>
            </div>
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-primary-foreground text-[12px] font-bold">{urgentCount}</span>
          </button>
        )}

        {/* Status tabs */}
        <div className="flex gap-1.5 overflow-x-auto no-scrollbar">
          {statusTabs.map(({ key, label, icon: Icon }) => {
            const active = activeTab === key;
            return (
              <button key={key} onClick={() => setActiveTab(key)}
                className={`flex items-center gap-1 whitespace-nowrap rounded-full px-3 py-1.5 text-[13px] font-medium transition-colors ${
                  active ? "bg-primary text-primary-foreground shadow-sm" : "bg-card text-foreground border border-border"
                }`}
              >
                <Icon className="h-3 w-3" />
                {label}
                <span className={`text-[11px] ${active ? "text-primary-foreground/70" : "text-muted-foreground"}`}>{tabCounts[key] ?? 0}</span>
              </button>
            );
          })}
        </div>

        {/* Storage filter */}
        <div className="flex gap-1.5 overflow-x-auto no-scrollbar">
          {([
            { key: "all", label: "Tutti", icon: null },
            { key: "ambiente", label: "Dispensa", icon: Home },
            { key: "frigo", label: "Frigo", icon: Refrigerator },
            { key: "freezer", label: "Congelatore", icon: Snowflake },
          ] as const).map(({ key, label, icon: Icon }) => (
            <button key={key} onClick={() => setStorageFilter(key)}
              className={`flex items-center gap-1 rounded-full px-3 py-1 text-[12px] font-medium border transition-colors ${
                storageFilter === key ? "bg-primary/10 text-primary border-primary" : "bg-card text-muted-foreground border-border"
              }`}
            >
              {Icon && <Icon className="h-3 w-3" />}
              {label}
            </button>
          ))}
        </div>

        <SearchBar placeholder="Cerca prodotto..." value={searchQuery} onChange={setSearchQuery} />

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
              const itemKey = `${item.type}-${item.id}`;
              const isSelected = selectedIds.has(itemKey);

              return (
                <button
                  key={itemKey}
                  className={`flex w-full items-center gap-2.5 rounded-[16px] bg-card px-3 py-2.5 shadow-card text-left active:scale-[0.98] transition-all ${
                    isSelected ? "ring-2 ring-primary" : ""
                  }`}
                  onClick={() => {
                    if (selectionMode) {
                      toggleSelection(itemKey);
                    } else {
                      setActionSheet(item);
                      setNewDate(item.expiry_date ?? "");
                    }
                  }}
                >
                  {selectionMode ? (
                    <div className="flex items-center justify-center w-6 shrink-0">
                      <Checkbox checked={isSelected} onCheckedChange={() => toggleSelection(itemKey)} onClick={(e) => e.stopPropagation()} className="h-5 w-5" />
                    </div>
                  ) : (
                    <div className={`w-[3px] self-stretch rounded-full ${cfg.barColor}`} />
                  )}
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[10px] bg-secondary overflow-hidden">
                    {item.image_url ? (
                      <img src={item.image_url} alt="" className="h-full w-full object-cover" />
                    ) : item.type === "preparation" ? (
                      <ChefHat className="h-5 w-5 text-muted-foreground" />
                    ) : (
                      <span className="text-xl">{getFoodEmoji(null, item.name)}</span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className="text-[15px] font-medium truncate text-foreground">{item.name}</p>
                      {item.type === "preparation" && (
                        <ChefHat className="h-3 w-3 text-muted-foreground shrink-0" />
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
                        {item.quantity ? ` · ${item.quantity}${item.unit ? ` ${item.unit}` : ""}` : ""}
                      </span>
                      {item.lot_number && (
                        <span className="text-[10px] text-muted-foreground">Lotto: {item.lot_number}</span>
                      )}
                    </div>
                  </div>
                  <span className="shrink-0 rounded-[8px] px-2 py-0.5 text-[9px] font-semibold text-white" style={{ backgroundColor: cfg.color }}>
                    {cfg.label}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </main>

      {/* Selection action bar */}
      {selectionMode && selectedIds.size > 0 && (
        <div className="fixed bottom-[calc(72px+env(safe-area-inset-bottom,0px))] left-0 right-0 z-50 px-4 pb-2">
          <div className="flex items-center gap-3 rounded-2xl bg-card shadow-elevated px-4 py-3 border border-border">
            <span className="text-[13px] font-medium text-foreground flex-1">
              {selectedIds.size} selezionat{selectedIds.size === 1 ? "o" : "i"}
            </span>
            <Button variant="destructive" size="sm" className="rounded-xl gap-1.5" onClick={() => setConfirmDeleteOpen(true)}>
              <Trash2 className="h-4 w-4" /> Elimina
            </Button>
          </div>
        </div>
      )}

      {/* Confirm bulk delete */}
      <Dialog open={confirmDeleteOpen} onOpenChange={setConfirmDeleteOpen}>
        <DialogContent className="rounded-2xl max-w-[340px]">
          <DialogHeader>
            <DialogTitle className="text-foreground">Eliminare {selectedIds.size} elementi?</DialogTitle>
            <DialogDescription>Questa azione non può essere annullata.</DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-row gap-2">
            <Button variant="outline" className="flex-1 rounded-xl" onClick={() => setConfirmDeleteOpen(false)} disabled={deleting}>Annulla</Button>
            <Button variant="destructive" className="flex-1 rounded-xl gap-1.5" onClick={handleBulkDelete} disabled={deleting}>
              {deleting ? "Eliminazione..." : "Elimina"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Action sheet — smart actions per item */}
      <Sheet open={!!actionSheet} onOpenChange={(o) => { if (!o) setActionSheet(null); }}>
        <SheetContent side="bottom" className="rounded-t-3xl">
          <SheetHeader>
            <SheetTitle className="text-foreground">{actionSheet?.name}</SheetTitle>
          </SheetHeader>
          <div className="space-y-3 py-4">
            {/* Info */}
            {actionSheet && (
              <div className="rounded-xl bg-secondary/50 p-3 space-y-1">
                <div className="flex items-center gap-2 text-[12px] text-muted-foreground">
                  <span>{storageLabel[actionSheet.storage_type] ?? actionSheet.storage_type}</span>
                  {actionSheet.quantity && <span>· x{actionSheet.quantity}{actionSheet.unit ? ` ${actionSheet.unit}` : ""}</span>}
                  {actionSheet.expiry_date && (
                    <span className="flex items-center gap-0.5">
                      · <Clock className="h-2.5 w-2.5" /> {new Date(actionSheet.expiry_date).toLocaleDateString("it-IT")}
                    </span>
                  )}
                </div>
                {actionSheet.lot_number && (
                  <p className="text-[11px] text-muted-foreground">Lotto: {actionSheet.lot_number}</p>
                )}
                {actionSheet.type === "preparation" && (
                  <p className="text-[11px] text-primary font-medium flex items-center gap-1"><ChefHat className="h-3 w-3" /> Preparazione interna</p>
                )}
              </div>
            )}

            {/* Storage selector */}
            {actionSheet && (
              <div className="space-y-1.5">
                <p className="text-[12px] font-medium text-muted-foreground">Conservazione</p>
                <div className="flex gap-2">
                  {([
                    { key: "ambiente", label: "Dispensa", icon: Home },
                    { key: "frigo", label: "Frigo", icon: Refrigerator },
                    { key: "freezer", label: "Congelatore", icon: Snowflake },
                  ] as const).map(({ key, label, icon: Icon }) => (
                    <button
                      key={key}
                      onClick={() => handleChangeStorage(actionSheet, key)}
                      className={`flex-1 flex items-center justify-center gap-1.5 rounded-xl py-2.5 text-[13px] font-medium transition-colors ${
                        actionSheet.storage_type === key ? "bg-primary text-primary-foreground" : "bg-card border border-border text-foreground"
                      }`}
                    >
                      <Icon className="h-3.5 w-3.5" /> {label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <Button className="w-full justify-start gap-3 h-12 rounded-xl" variant="outline" onClick={() => actionSheet && handleConsume(actionSheet)}>
              <UtensilsCrossed className="h-4 w-4 text-success" /> Utilizzato / Consumato
            </Button>
            <Button className="w-full justify-start gap-3 h-12 rounded-xl" variant="outline" onClick={() => actionSheet && handleTrash(actionSheet)}>
              <Trash2 className="h-4 w-4 text-destructive" /> Buttato / Eliminato
            </Button>
            <div className="flex gap-2">
              <Input type="date" value={newDate} onChange={(e) => setNewDate(e.target.value)} className="flex-1 h-12 rounded-xl" />
              <Button className="h-12 rounded-xl" onClick={() => actionSheet && handleUpdateDate(actionSheet)}>
                <CalendarClock className="h-4 w-4 mr-1" /> Aggiorna
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Resolve flow (swipe cards) */}
      {restaurant && (
        <ResolveExpiryFlow
          open={resolveOpen}
          onOpenChange={setResolveOpen}
          restaurantId={restaurant.id}
          onComplete={fetchItems}
        />
      )}
    </div>
  );
};

export default RestaurantExpiryPage;
