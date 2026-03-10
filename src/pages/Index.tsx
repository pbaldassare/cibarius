import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import MobileHeader from "@/components/MobileHeader";
import { useRole, getRoleHomePath } from "@/hooks/useRole";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useDebounce } from "@/hooks/useDebounce";
import { useToast } from "@/hooks/use-toast";
import { getFoodImage } from "@/lib/food-images";
import AddFoodFlow from "@/components/AddFoodFlow";
import ResolveExpiryFlow from "@/components/ResolveExpiryFlow";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Clock, Plus, Search, Zap, ChevronRight,
  BookOpen, SlidersHorizontal, X, Trash2,
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

/* ─── Food Thumbnail ─── */
const FoodThumb = ({ imageUrl, category, name }: { imageUrl: string | null | undefined; category: string | null | undefined; name?: string | null }) => {
  const img = getFoodImage(imageUrl, category, name);
  if (img.type === "image") {
    return (
      <img
        src={img.value}
        alt=""
        className="h-10 w-10 rounded-lg object-cover shrink-0 bg-muted"
      />
    );
  }
  return (
    <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center shrink-0 text-lg">
      {img.value}
    </div>
  );
};

/* ─── Swipeable item component ─── */
interface SwipeableItemProps {
  itemKey: string;
  onDelete: () => Promise<void>;
  children: React.ReactNode;
}

const SwipeableItem = ({ itemKey, onDelete, children }: SwipeableItemProps) => {
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
      if (Math.abs(dy) > Math.abs(dx) && Math.abs(dy) > 10) {
        startX.current = null;
        return;
      }
      if (Math.abs(dx) > 10) locked.current = true;
    }

    if (locked.current) {
      setSwipeX(Math.min(0, dx));
    }
  };

  const onTouchEnd = async () => {
    startX.current = null;
    startY.current = null;
    locked.current = false;
    if (swipeX < -80) {
      setRemoving(true);
      await onDelete();
    } else {
      setSwipeX(0);
    }
  };

  if (removing) {
    return (
      <div
        className="overflow-hidden transition-all duration-300 ease-out"
        style={{ maxHeight: 0, opacity: 0, marginBottom: 0, padding: 0 }}
      />
    );
  }

  return (
    <div className="relative overflow-hidden rounded-[14px]">
      <div className="absolute inset-0 flex items-center justify-end bg-destructive rounded-[14px] px-4">
        <Trash2 className="h-5 w-5 text-white" />
      </div>
      <div
        className="relative"
        style={{
          transform: `translateX(${swipeX}px)`,
          transition: swipeX === 0 ? "transform 0.25s ease-out" : "none",
        }}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        {children}
      </div>
    </div>
  );
};

/* ─── UrgentItem type ─── */
type UrgentItem = {
  id: string; name: string; date: string | null; storage: string;
  status: ExpiryStatus; type: "inv" | "prep";
  qty: number | null; unit: string | null;
  image_url: string | null; category: string | null;
};

const Index = () => {
  const { user } = useAuth();
  const { role, profile, isLoading: roleLoading } = useRole();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [items, setItems] = useState<InventoryItem[]>([]);
  const [prepItems, setPrepItems] = useState<{ id: string; name: string; use_by_date: string | null; image_url: string | null; storage_type: string; quantity?: number | null }[]>([]);
  const [loading, setLoading] = useState(true);
  const [addFoodOpen, setAddFoodOpen] = useState(false);
  const [resolveOpen, setResolveOpen] = useState(false);

  // Inline edit state
  const [editItem, setEditItem] = useState<UrgentItem | null>(null);
  const [editQty, setEditQty] = useState("");
  const [editStorage, setEditStorage] = useState("frigo");
  const [editDate, setEditDate] = useState("");
  const [saving, setSaving] = useState(false);

  // Search overlay
  const [searchOpen, setSearchOpen] = useState(false);
  const [search, setSearch] = useState("");
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
        .select("id, expiry_date, storage_type, quantity, unit, product:products(name, image_url, category)")
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
    let expired = 0, expiring = 0;
    items.forEach((i) => {
      const s = getStatus(i.expiry_date);
      if (s === "expired") expired++;
      else if (s === "expiring") expiring++;
    });
    prepItems.forEach((p) => {
      const s = getStatus(p.use_by_date);
      if (s === "expired") expired++;
      else if (s === "expiring") expiring++;
    });
    return { expired, expiring, allItems: items.length + prepItems.length, total: expired + expiring };
  }, [items, prepItems]);

  // Urgent list: max 3
  const urgentList = useMemo(() => {
    const list: UrgentItem[] = [];

    items.forEach((i) => {
      const s = getStatus(i.expiry_date);
      if (s === "expired" || s === "expiring") {
        list.push({
          id: i.id, name: i.product.name, date: i.expiry_date,
          storage: i.storage_type, status: s, type: "inv",
          qty: i.quantity, unit: i.unit,
          image_url: i.product.image_url, category: i.product.category,
        });
      }
    });
    prepItems.forEach((p) => {
      const s = getStatus(p.use_by_date);
      if (s === "expired" || s === "expiring") {
        list.push({
          id: p.id, name: p.name, date: p.use_by_date,
          storage: p.storage_type, status: s, type: "prep",
          qty: null, unit: null,
          image_url: p.image_url, category: null,
        });
      }
    });

    list.sort((a, b) => {
      if (a.status !== b.status) return a.status === "expired" ? -1 : 1;
      if (a.date && b.date) return a.date.localeCompare(b.date);
      return 0;
    });

    return list.slice(0, 3);
  }, [items, prepItems]);

  const handleDeleteUrgent = useCallback(async (id: string, type: "inv" | "prep") => {
    if (type === "inv") {
      await supabase.from("inventory_items").delete().eq("id", id);
    } else {
      await supabase.from("preparations").delete().eq("id", id);
    }
    toast({ title: "Eliminato ✓" });
    fetchItems();
  }, [user]);

  const openEdit = (item: UrgentItem) => {
    setEditItem(item);
    setEditQty(item.qty != null ? String(item.qty) : "1");
    setEditStorage(item.storage);
    setEditDate(item.date ?? "");
  };

  const handleSaveEdit = async () => {
    if (!editItem) return;
    setSaving(true);
    try {
      if (editItem.type === "inv") {
        await supabase.from("inventory_items").update({
          quantity: parseFloat(editQty) || 1,
          storage_type: editStorage,
          expiry_date: editDate || null,
        }).eq("id", editItem.id);
      } else {
        await supabase.from("preparations").update({
          storage_type: editStorage,
          use_by_date: editDate || null,
        }).eq("id", editItem.id);
      }
      toast({ title: "Salvato ✓" });
      setEditItem(null);
      fetchItems();
    } catch {
      toast({ title: "Errore nel salvataggio", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteFromEdit = async () => {
    if (!editItem) return;
    setSaving(true);
    await handleDeleteUrgent(editItem.id, editItem.type);
    setEditItem(null);
    setSaving(false);
  };

  // Search results
  const searchResults = useMemo(() => {
    if (!debouncedSearch) return [];
    const q = debouncedSearch.toLowerCase();
    const results: { id: string; name: string; date: string | null; storage: string; status: ExpiryStatus; image_url: string | null; category: string | null }[] = [];
    items.forEach((i) => {
      if (i.product.name.toLowerCase().includes(q)) {
        results.push({ id: i.id, name: i.product.name, date: i.expiry_date, storage: i.storage_type, status: getStatus(i.expiry_date), image_url: i.product.image_url, category: i.product.category });
      }
    });
    prepItems.forEach((p) => {
      if (p.name.toLowerCase().includes(q)) {
        results.push({ id: p.id, name: p.name, date: p.use_by_date, storage: p.storage_type, status: getStatus(p.use_by_date), image_url: p.image_url, category: null });
      }
    });
    return results.slice(0, 12);
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
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-16 w-full rounded-[18px]" />
          <Skeleton className="h-12 w-full rounded-[14px]" />
          <Skeleton className="h-24 w-full rounded-[18px]" />
        </main>
      </div>
    );
  }

  const headerRight = (
    <div className="flex items-center gap-1">
      <button
        onClick={() => setSearchOpen(true)}
        className="p-1.5 rounded-lg active:bg-white/10 transition-colors"
        aria-label="Cerca"
      >
        <Search className="h-[18px] w-[18px] text-white" strokeWidth={2} />
      </button>
      <button
        onClick={() => navigate("/expiry")}
        className="p-1.5 rounded-lg active:bg-white/10 transition-colors"
        aria-label="Filtri"
      >
        <SlidersHorizontal className="h-[18px] w-[18px] text-white" strokeWidth={2} />
      </button>
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      <MobileHeader title="" showBack={false} right={headerRight} />

      <main className="space-y-4 px-4 pt-1 pb-28">

        {/* ─── Greeting ─── */}
        <div>
          <h2 className="text-base text-foreground">
            {greeting}{firstName ? `, ${firstName}` : ""} 👋
          </h2>
          <p className="text-[12px] text-muted-foreground mt-0.5">Ecco cosa serve oggi</p>
        </div>

        {/* ═══ COMPACT COUNTERS ═══ */}
        <div className="flex items-center gap-2.5 rounded-[18px] bg-card px-4 py-3 shadow-card">
          {[
            { n: counts.expired, label: "Scaduti", color: "hsl(1,76%,55%)" },
            { n: counts.expiring, label: "In scadenza", color: "hsl(37,90%,51%)" },
            { n: counts.allItems, label: "Totale", color: "hsl(215,50%,55%)" },
          ].map(({ n, label, color }, idx) => (
            <div key={label} className="flex items-center gap-2 flex-1">
              {idx > 0 && <div className="w-px h-7 bg-border" />}
              <div className={`${idx > 0 ? "pl-2.5" : ""} flex-1`}>
                <p className="text-[22px] font-bold leading-none" style={{ color }}>{n}</p>
                <p className="text-[9px] font-medium text-muted-foreground mt-0.5 uppercase tracking-wider">{label}</p>
              </div>
            </div>
          ))}
          <button
            onClick={() => navigate("/expiry")}
            className="text-[11px] font-medium text-primary flex items-center gap-0.5 shrink-0"
          >
            Vedi <ChevronRight className="h-3 w-3" />
          </button>
        </div>

        {/* ═══ CTA GESTISCI SCADENZE ═══ */}
        {counts.total > 0 ? (
          <button
            onClick={() => setResolveOpen(true)}
            className="flex w-full items-center justify-center gap-2 rounded-[14px] h-11 text-[14px] font-semibold text-white btn-brand active:scale-[0.97] transition-all"
          >
            <Zap className="h-4 w-4" strokeWidth={2.2} />
            Gestisci scadenze · {counts.total}
          </button>
        ) : (
          <div className="flex items-center justify-center gap-2 rounded-[14px] h-11 bg-success/8">
            <span className="text-[13px] font-medium text-success">✓ Tutto sotto controllo</span>
          </div>
        )}

        {/* ═══ URGENT (MAX 3) — swipeable + tappable ═══ */}
        {urgentList.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-[13px] font-semibold text-foreground">Urgenti</h3>
              {counts.total > 3 && (
                <button
                  onClick={() => navigate("/expiry")}
                  className="text-[11px] font-medium text-primary flex items-center gap-0.5"
                >
                  Vedi tutti ({counts.total}) <ChevronRight className="h-3 w-3" />
                </button>
              )}
            </div>
            <div className="space-y-1.5">
              {urgentList.map((item) => {
                const cfg = statusCfg[item.status];
                return (
                  <SwipeableItem
                    key={`${item.type}-${item.id}`}
                    itemKey={`${item.type}-${item.id}`}
                    onDelete={() => handleDeleteUrgent(item.id, item.type)}
                  >
                    <div
                      className="flex items-center gap-2 rounded-[14px] bg-card pl-0 pr-3 py-2 shadow-card cursor-pointer active:bg-accent/50 transition-colors"
                      onClick={() => openEdit(item)}
                    >
                      <div className={`w-[3px] self-stretch rounded-full ml-0 ${cfg.barColor}`} />
                      <FoodThumb imageUrl={item.image_url} category={item.category} name={item.name} />
                      <div className="flex-1 min-w-0 ml-0.5">
                        <p className="text-[13px] font-medium truncate text-foreground">{item.name}</p>
                        <p className="text-[11px] text-muted-foreground mt-0.5">
                          {item.date && <>Scade il {new Date(item.date).toLocaleDateString("it-IT", { day: "2-digit", month: "2-digit" })}</>}
                          {item.date && " · "}
                          {storageLabel[item.storage] ?? item.storage}
                          {item.qty != null && ` · x${item.qty}`}
                        </p>
                      </div>
                      <span
                        className="shrink-0 rounded-[6px] px-1.5 py-[2px] text-[8px] font-bold uppercase tracking-wider text-white"
                        style={{ backgroundColor: cfg.color }}
                      >
                        {cfg.label}
                      </span>
                    </div>
                  </SwipeableItem>
                );
              })}
            </div>
          </div>
        )}

        {urgentList.length === 0 && (
          <div className="flex items-center justify-center rounded-[18px] bg-card py-6 shadow-card">
            <p className="text-[13px] text-muted-foreground">Nessun prodotto urgente 🎉</p>
          </div>
        )}

        {/* ═══ RICETTE HERO CARD ═══ */}
        <button
          onClick={() => navigate("/recipes")}
          className="relative w-full overflow-hidden rounded-[18px] bg-card shadow-card active:scale-[0.98] transition-transform text-left"
        >
          <div className="h-2 w-full bg-brand-gradient" />
          <div className="flex items-center gap-4 px-5 py-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-brand-gradient shadow-brand">
              <BookOpen className="h-6 w-6 text-white" strokeWidth={1.8} />
            </div>
            <div className="flex-1">
              <p className="text-[15px] font-bold text-foreground">Ricette dai ristoranti</p>
              <p className="text-[12px] text-muted-foreground mt-0.5">Scopri e replica ricette pubbliche</p>
            </div>
            <div className="flex items-center gap-1 shrink-0 rounded-[10px] btn-brand px-3 py-1.5">
              <span className="text-[12px] font-semibold">Sfoglia</span>
              <ChevronRight className="h-3.5 w-3.5" />
            </div>
          </div>
        </button>

      </main>

      {/* ─── FAB ─── */}
      <div className="fixed bottom-[calc(76px+env(safe-area-inset-bottom,0px))] right-4 z-40">
        <button
          onClick={() => setAddFoodOpen(true)}
          className="flex h-12 w-12 items-center justify-center rounded-full btn-brand active:scale-95 transition-all"
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
              <Input
                autoFocus
                placeholder="Cerca nei tuoi prodotti..."
                className="h-10 rounded-[12px] border-border bg-card pl-9 text-[14px] text-foreground"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <button
              onClick={() => { setSearchOpen(false); setSearch(""); }}
              className="p-2 text-muted-foreground"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="px-4 pt-2 pb-8 overflow-y-auto" style={{ maxHeight: "calc(100vh - 60px)" }}>
            {!debouncedSearch && (
              <p className="text-[13px] text-muted-foreground text-center py-12">Digita per cercare tra i tuoi prodotti</p>
            )}
            {debouncedSearch && searchResults.length === 0 && (
              <p className="text-[13px] text-muted-foreground text-center py-12">Nessun risultato per "{search}"</p>
            )}
            {searchResults.length > 0 && (
              <div className="space-y-1.5">
                {searchResults.map((r) => {
                  const cfg = statusCfg[r.status];
                  return (
                    <div key={r.id} className="flex items-center gap-2 rounded-[14px] bg-card pl-0 pr-3 py-2 shadow-card">
                      <div className={`w-[3px] self-stretch rounded-full ${cfg.barColor}`} />
                      <FoodThumb imageUrl={r.image_url} category={r.category} />
                      <div className="flex-1 min-w-0 ml-0.5">
                        <p className="text-[13px] font-medium truncate text-foreground">{r.name}</p>
                        <p className="text-[11px] text-muted-foreground">
                          {r.date ? new Date(r.date).toLocaleDateString("it-IT") : "Senza data"} · {storageLabel[r.storage] ?? r.storage}
                        </p>
                      </div>
                      <span
                        className="shrink-0 rounded-[6px] px-1.5 py-[2px] text-[8px] font-bold uppercase text-white"
                        style={{ backgroundColor: cfg.color }}
                      >
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

      {/* ─── EDIT DIALOG ─── */}
      <Dialog open={!!editItem} onOpenChange={(open) => { if (!open) setEditItem(null); }}>
        <DialogContent className="max-w-[92vw] rounded-[18px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              {editItem && <FoodThumb imageUrl={editItem.image_url} category={editItem.category} />}
              <span className="truncate">{editItem?.name}</span>
            </DialogTitle>
            <DialogDescription className="sr-only">Modifica prodotto urgente</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 pt-2">
            {editItem?.type === "inv" && (
              <div>
                <Label className="text-[12px] text-muted-foreground">Quantità</Label>
                <Input
                  type="number"
                  inputMode="decimal"
                  value={editQty}
                  onChange={(e) => setEditQty(e.target.value)}
                  className="mt-1 h-10 rounded-[10px]"
                />
              </div>
            )}

            <div>
              <Label className="text-[12px] text-muted-foreground">Conservazione</Label>
              <Select value={editStorage} onValueChange={setEditStorage}>
                <SelectTrigger className="mt-1 h-10 rounded-[10px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="frigo">Frigo</SelectItem>
                  <SelectItem value="freezer">Congelatore</SelectItem>
                  <SelectItem value="ambiente">Dispensa</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-[12px] text-muted-foreground">Scadenza</Label>
              <Input
                type="date"
                value={editDate}
                onChange={(e) => setEditDate(e.target.value)}
                className="mt-1 h-10 rounded-[10px]"
              />
            </div>
          </div>

          <DialogFooter className="flex-row gap-2 pt-2">
            <button
              onClick={handleDeleteFromEdit}
              disabled={saving}
              className="flex-1 h-10 rounded-[10px] border border-destructive text-destructive text-[13px] font-semibold active:scale-[0.97] transition-all"
            >
              Elimina
            </button>
            <button
              onClick={handleSaveEdit}
              disabled={saving}
              className="flex-1 h-10 rounded-[10px] btn-brand text-[13px] font-semibold active:scale-[0.97] transition-all"
            >
              {saving ? "Salvo..." : "Salva"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
