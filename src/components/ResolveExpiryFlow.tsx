import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Sheet, SheetContent,
} from "@/components/ui/sheet";
import {
  Package, Clock, CalendarClock, Trash2, UtensilsCrossed,
  AlertTriangle, ChevronRight, X, Check,
} from "lucide-react";

type ExpiryStatus = "expired" | "expiring" | "nodate";

interface ResolveItem {
  id: string;
  type: "inventory" | "preparation";
  name: string;
  image_url: string | null;
  expiry_date: string | null;
  storage_type: string;
  quantity: number | null;
  unit: string | null;
  status: ExpiryStatus;
}

const statusCfg: Record<ExpiryStatus, { label: string; color: string; bg: string }> = {
  expired:  { label: "SCADUTO",     color: "#E53935", bg: "rgba(229,57,53,0.1)" },
  expiring: { label: "IN SCADENZA", color: "#F59E0B", bg: "rgba(245,158,11,0.1)" },
  nodate:   { label: "SENZA DATA",  color: "#9CA3AF", bg: "rgba(156,163,175,0.1)" },
};

const storageLabel: Record<string, string> = {
  frigo: "Frigo", freezer: "Congelatore", ambiente: "Dispensa",
};

const getStatus = (d: string | null): ExpiryStatus | "ok" => {
  if (!d) return "nodate";
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const diff = (new Date(d).getTime() - today.getTime()) / 864e5;
  if (diff < 0) return "expired";
  if (diff <= 3) return "expiring";
  return "ok";
};

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onComplete?: () => void;
}

const ResolveExpiryFlow = ({ open, onOpenChange, onComplete }: Props) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [items, setItems] = useState<ResolveItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);
  const [showDateInput, setShowDateInput] = useState(false);
  const [newDate, setNewDate] = useState("");
  const [animDir, setAnimDir] = useState<"in" | "out">("in");

  const fetchItems = async () => {
    if (!user) return;
    setLoading(true);

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

    const result: ResolveItem[] = [];

    if (invRes.data) {
      for (const i of invRes.data as any[]) {
        const s = getStatus(i.expiry_date);
        if (s === "ok") continue;
        result.push({
          id: i.id, type: "inventory",
          name: i.product?.name ?? "Prodotto",
          image_url: i.product?.image_url ?? null,
          expiry_date: i.expiry_date,
          storage_type: i.storage_type,
          quantity: i.quantity, unit: i.unit,
          status: s as ExpiryStatus,
        });
      }
    }

    if (prepRes.data) {
      for (const p of prepRes.data as any[]) {
        const s = getStatus(p.use_by_date);
        if (s === "ok") continue;
        result.push({
          id: p.id, type: "preparation",
          name: p.name,
          image_url: p.image_url ?? null,
          expiry_date: p.use_by_date,
          storage_type: p.storage_type ?? "frigo",
          quantity: p.portions, unit: "porzioni",
          status: s as ExpiryStatus,
        });
      }
    }

    // Sort: expired first, then expiring, then nodate
    const order: Record<ExpiryStatus, number> = { expired: 0, expiring: 1, nodate: 2 };
    result.sort((a, b) => order[a.status] - order[b.status]);

    setItems(result);
    setCurrentIndex(0);
    setLoading(false);
  };

  useEffect(() => {
    if (open) {
      fetchItems();
      setShowDateInput(false);
      setNewDate("");
      setAnimDir("in");
    }
  }, [open, user]);

  const current = items[currentIndex] ?? null;
  const remaining = items.length - currentIndex;

  const advance = () => {
    setShowDateInput(false);
    setNewDate("");
    // Trigger exit animation
    setAnimDir("out");
    setTimeout(() => {
      if (currentIndex + 1 >= items.length) {
        toast({ title: "Tutto risolto! 🎉", description: "Nessun altro prodotto da controllare." });
        onOpenChange(false);
        onComplete?.();
      } else {
        setCurrentIndex((i) => i + 1);
        setAnimDir("in");
      }
    }, 250);
  };

  const handleUpdateDate = async () => {
    if (!current || !newDate) return;
    setActing(true);
    if (current.type === "inventory") {
      await supabase.from("inventory_items").update({ expiry_date: newDate }).eq("id", current.id);
    } else {
      await supabase.from("preparations").update({ use_by_date: newDate }).eq("id", current.id);
    }
    toast({ title: "Data aggiornata" });
    setActing(false);
    advance();
  };

  const handleConsumed = async () => {
    if (!current) return;
    setActing(true);
    if (current.type === "inventory") {
      await supabase.from("inventory_items").delete().eq("id", current.id);
    } else {
      await supabase.from("preparations").delete().eq("id", current.id);
    }
    toast({ title: "Segnato come consumato ✅" });
    setActing(false);
    advance();
  };

  const handleDiscarded = async () => {
    if (!current) return;
    setActing(true);
    if (current.type === "inventory") {
      await supabase.from("inventory_items").delete().eq("id", current.id);
    } else {
      await supabase.from("preparations").delete().eq("id", current.id);
    }
    toast({ title: "Segnato come buttato 🗑️" });
    setActing(false);
    advance();
  };

  const handleMarkExpired = async () => {
    if (!current) return;
    setActing(true);
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const dateStr = yesterday.toISOString().split("T")[0];
    if (current.type === "inventory") {
      await supabase.from("inventory_items").update({ expiry_date: dateStr }).eq("id", current.id);
    } else {
      await supabase.from("preparations").update({ use_by_date: dateStr }).eq("id", current.id);
    }
    toast({ title: "Segnato come scaduto" });
    setActing(false);
    advance();
  };

  return (
    <>
      <style>{`
        @keyframes resolveSlideIn {
          from { opacity: 0; transform: translateX(60px) scale(0.95); }
          to   { opacity: 1; transform: translateX(0) scale(1); }
        }
        @keyframes resolveSlideOut {
          from { opacity: 1; transform: translateX(0) scale(1); }
          to   { opacity: 0; transform: translateX(-60px) scale(0.95); }
        }
      `}</style>
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-2xl h-[85vh] flex flex-col p-0">
        {/* Header */}
        <div className="flex items-center justify-between px-4 pt-4 pb-2">
          <div>
            <h2 className="text-base font-bold" style={{ color: "#111827" }}>Risolvi scadenze</h2>
            {!loading && items.length > 0 && (
              <p className="text-xs" style={{ color: "#6B7280" }}>
                {remaining} {remaining === 1 ? "elemento rimasto" : "elementi rimasti"}
              </p>
            )}
          </div>
          <button onClick={() => onOpenChange(false)} className="p-1">
            <X className="h-5 w-5" style={{ color: "#9CA3AF" }} />
          </button>
        </div>

        {/* Progress bar */}
        {!loading && items.length > 0 && (
          <div className="px-4 pb-2">
            <div className="h-1.5 w-full rounded-full" style={{ backgroundColor: "#E5E7EB" }}>
              <div
                className="h-full rounded-full bg-primary transition-all duration-300"
                style={{ width: `${((currentIndex) / items.length) * 100}%` }}
              />
            </div>
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-4 pb-4">
          {loading ? (
            <div className="flex h-full items-center justify-center">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            </div>
          ) : items.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center gap-3">
              <Check className="h-12 w-12 text-primary" />
              <p className="text-base font-semibold" style={{ color: "#111827" }}>Tutto a posto!</p>
              <p className="text-sm" style={{ color: "#6B7280" }}>Nessun prodotto da risolvere.</p>
            </div>
          ) : current ? (
            <div
              key={currentIndex}
              className="flex flex-col items-center gap-4 pt-4 transition-all duration-250"
              style={{
                animation: animDir === "in"
                  ? "resolveSlideIn 0.3s cubic-bezier(0.22,1,0.36,1)"
                  : "resolveSlideOut 0.25s cubic-bezier(0.55,0,1,0.45) forwards",
              }}
            >
              {/* Card */}
              <div
                className="w-full rounded-2xl bg-white p-5 shadow-md"
                style={{ border: `2px solid ${statusCfg[current.status].color}20` }}
              >
                {/* Status badge */}
                <div className="flex justify-between items-start mb-4">
                  <span
                    className="rounded-lg px-2.5 py-1 text-[11px] font-bold text-white"
                    style={{ backgroundColor: statusCfg[current.status].color }}
                  >
                    {statusCfg[current.status].label}
                  </span>
                  <span className="text-[11px] font-medium" style={{ color: "#6B7280" }}>
                    {current.type === "preparation" ? "Preparazione" : "Prodotto"}
                  </span>
                </div>

                {/* Image + info */}
                <div className="flex items-center gap-4 mb-4">
                  <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl overflow-hidden" style={{ backgroundColor: "#F5F7FA" }}>
                    {current.image_url ? (
                      <img src={current.image_url} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <Package className="h-7 w-7" style={{ color: "#9CA3AF" }} />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-lg font-bold truncate" style={{ color: "#111827" }}>{current.name}</p>
                    <div className="flex items-center gap-2 mt-1">
                      {current.expiry_date && (
                        <span className="flex items-center gap-1 text-xs" style={{ color: "#6B7280" }}>
                          <Clock className="h-3 w-3" />
                          {new Date(current.expiry_date).toLocaleDateString("it-IT")}
                        </span>
                      )}
                      <span className="text-xs" style={{ color: "#9CA3AF" }}>
                        {storageLabel[current.storage_type] ?? current.storage_type}
                      </span>
                    </div>
                    {current.quantity && (
                      <p className="text-xs mt-0.5" style={{ color: "#9CA3AF" }}>
                        x{current.quantity} {current.unit ?? ""}
                      </p>
                    )}
                  </div>
                </div>

                {/* Date input (conditional) */}
                {showDateInput && (
                  <div className="flex gap-2 mb-2 animate-in slide-in-from-top-2">
                    <Input
                      type="date"
                      value={newDate}
                      onChange={(e) => setNewDate(e.target.value)}
                      className="flex-1"
                    />
                    <Button
                      size="sm"
                      disabled={!newDate || acting}
                      onClick={handleUpdateDate}
                    >
                      Salva
                    </Button>
                  </div>
                )}
              </div>

              {/* Action buttons */}
              <div className="w-full grid grid-cols-2 gap-2.5">
                <button
                  onClick={() => setShowDateInput(!showDateInput)}
                  disabled={acting}
                  className="flex flex-col items-center gap-1.5 rounded-xl py-4 transition-colors active:scale-[0.97]"
                  style={{ backgroundColor: "#EFF6FF", color: "#2563EB" }}
                >
                  <CalendarClock className="h-6 w-6" />
                  <span className="text-xs font-semibold">Aggiorna data</span>
                </button>

                <button
                  onClick={handleConsumed}
                  disabled={acting}
                  className="flex flex-col items-center gap-1.5 rounded-xl py-4 transition-colors active:scale-[0.97]"
                  style={{ backgroundColor: "#ECFDF5", color: "#059669" }}
                >
                  <UtensilsCrossed className="h-6 w-6" />
                  <span className="text-xs font-semibold">Consumato</span>
                </button>

                <button
                  onClick={handleDiscarded}
                  disabled={acting}
                  className="flex flex-col items-center gap-1.5 rounded-xl py-4 transition-colors active:scale-[0.97]"
                  style={{ backgroundColor: "#FEF2F2", color: "#DC2626" }}
                >
                  <Trash2 className="h-6 w-6" />
                  <span className="text-xs font-semibold">Buttato</span>
                </button>

                <button
                  onClick={handleMarkExpired}
                  disabled={acting}
                  className="flex flex-col items-center gap-1.5 rounded-xl py-4 transition-colors active:scale-[0.97]"
                  style={{ backgroundColor: "#FFF7ED", color: "#D97706" }}
                >
                  <AlertTriangle className="h-6 w-6" />
                  <span className="text-xs font-semibold">Segna scaduto</span>
                </button>
              </div>

              {/* Skip */}
              <button
                onClick={advance}
                disabled={acting}
                className="text-xs font-medium py-2"
                style={{ color: "#9CA3AF" }}
              >
                Salta →
              </button>
            </div>
          ) : null}
        </div>
      </SheetContent>
    </Sheet>
    </>
  );
};

export default ResolveExpiryFlow;
