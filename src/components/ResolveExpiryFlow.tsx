import { useState, useEffect } from "react";
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
  X, Check, ArrowRightLeft,
  Thermometer, Snowflake, Archive,
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

const statusCfg: Record<ExpiryStatus, { label: string; color: string }> = {
  expired:  { label: "SCADUTO",     color: "hsl(1,76%,55%)" },
  expiring: { label: "IN SCADENZA", color: "hsl(37,90%,51%)" },
  nodate:   { label: "SENZA DATA",  color: "hsl(215,10%,62%)" },
};

const storageLabel: Record<string, string> = {
  frigo: "Frigo", freezer: "Congelatore", ambiente: "Dispensa",
};

const storageOptions = [
  { key: "frigo", label: "Frigo", icon: Thermometer },
  { key: "freezer", label: "Congelatore", icon: Snowflake },
  { key: "ambiente", label: "Dispensa", icon: Archive },
];

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
  const [showMovePanel, setShowMovePanel] = useState(false);
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
      setShowMovePanel(false);
      setNewDate("");
      setAnimDir("in");
    }
  }, [open, user]);

  const current = items[currentIndex] ?? null;
  const remaining = items.length - currentIndex;
  const progress = items.length > 0 ? (currentIndex / items.length) * 100 : 0;

  const advance = () => {
    setShowDateInput(false);
    setShowMovePanel(false);
    setNewDate("");
    setAnimDir("out");
    setTimeout(() => {
      if (currentIndex + 1 >= items.length) {
        toast({ title: "Tutto risolto! 🎉" });
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
    toast({ title: "Data aggiornata ✓" });
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
    toast({ title: "Consumato ✅" });
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
    toast({ title: "Buttato 🗑️" });
    setActing(false);
    advance();
  };

  const handleMove = async (newStorage: string) => {
    if (!current) return;
    setActing(true);
    if (current.type === "inventory") {
      await supabase.from("inventory_items").update({ storage_type: newStorage }).eq("id", current.id);
    } else {
      await supabase.from("preparations").update({ storage_type: newStorage }).eq("id", current.id);
    }
    toast({ title: `Spostato in ${storageLabel[newStorage]} ✓` });
    setActing(false);
    advance();
  };

  return (
    <>
      <style>{`
        @keyframes resolveSlideIn {
          from { opacity: 0; transform: translateY(24px) scale(0.97); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes resolveSlideOut {
          from { opacity: 1; transform: translateY(0) scale(1); }
          to   { opacity: 0; transform: translateY(-24px) scale(0.97); }
        }
      `}</style>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="bottom" className="rounded-t-[24px] h-[92vh] flex flex-col p-0">
          {/* Header */}
          <div className="flex items-center justify-between px-5 pt-5 pb-2">
            <div>
              <h2 className="text-[17px] text-foreground">Risolvi scadenze</h2>
              {!loading && items.length > 0 && (
                <p className="text-[12px] text-muted-foreground mt-0.5">
                  {remaining} {remaining === 1 ? "rimasto" : "rimasti"}
                </p>
              )}
            </div>
            <button onClick={() => onOpenChange(false)} className="p-1.5 rounded-full bg-secondary">
              <X className="h-4 w-4 text-muted-foreground" />
            </button>
          </div>

          {/* Progress */}
          {!loading && items.length > 0 && (
            <div className="px-5 pb-3">
              <div className="h-[5px] w-full rounded-full bg-secondary">
                <div
                  className="h-full rounded-full bg-primary transition-all duration-500 ease-out"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}

          {/* Content */}
          <div className="flex-1 overflow-y-auto px-5 pb-6">
            {loading ? (
              <div className="flex h-full items-center justify-center">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              </div>
            ) : items.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center gap-4">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-success/10">
                  <Check className="h-8 w-8 text-success" />
                </div>
                <p className="text-[16px] font-medium text-foreground">Tutto a posto!</p>
                <p className="text-[13px] text-muted-foreground">Nessun prodotto da risolvere</p>
              </div>
            ) : current ? (
              <div
                key={currentIndex}
                className="flex flex-col gap-5 pt-2"
                style={{
                  animation: animDir === "in"
                    ? "resolveSlideIn 0.35s cubic-bezier(0.22,1,0.36,1)"
                    : "resolveSlideOut 0.25s cubic-bezier(0.55,0,1,0.45) forwards",
                }}
              >
                {/* Product card */}
                <div className="rounded-[20px] bg-card shadow-card p-5">
                  {/* Status pill */}
                  <div className="flex justify-between items-center mb-4">
                    <span
                      className="rounded-[10px] px-3 py-1 text-[11px] font-semibold text-white"
                      style={{ backgroundColor: statusCfg[current.status].color }}
                    >
                      {statusCfg[current.status].label}
                    </span>
                    <span className="text-[11px] text-muted-foreground">
                      {current.type === "preparation" ? "Preparazione" : "Prodotto"}
                    </span>
                  </div>

                  {/* Image + name */}
                  <div className="flex items-center gap-4">
                    <div className="flex h-[72px] w-[72px] shrink-0 items-center justify-center rounded-[16px] bg-secondary overflow-hidden">
                      {current.image_url ? (
                        <img src={current.image_url} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <Package className="h-8 w-8 text-muted-foreground" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[18px] font-medium truncate text-foreground">{current.name}</p>
                      <div className="flex items-center gap-2 mt-1">
                        {current.expiry_date && (
                          <span className="flex items-center gap-1 text-[13px] text-muted-foreground">
                            <Clock className="h-3.5 w-3.5" />
                            {new Date(current.expiry_date).toLocaleDateString("it-IT")}
                          </span>
                        )}
                      </div>
                      <p className="text-[12px] text-muted-foreground mt-0.5">
                        {storageLabel[current.storage_type] ?? current.storage_type}
                        {current.quantity ? ` · x${current.quantity} ${current.unit ?? ""}` : ""}
                      </p>
                    </div>
                  </div>

                  {/* Date input */}
                  {showDateInput && (
                    <div className="flex gap-2 mt-4 animate-in slide-in-from-top-2">
                      <Input
                        type="date"
                        value={newDate}
                        onChange={(e) => setNewDate(e.target.value)}
                        className="flex-1 rounded-[12px]"
                      />
                      <Button
                        size="sm"
                        disabled={!newDate || acting}
                        onClick={handleUpdateDate}
                        className="rounded-[12px]"
                      >
                        Salva
                      </Button>
                    </div>
                  )}

                  {/* Move panel */}
                  {showMovePanel && (
                    <div className="flex gap-2 mt-4 animate-in slide-in-from-top-2">
                      {storageOptions
                        .filter((s) => s.key !== current.storage_type)
                        .map(({ key, label, icon: Icon }) => (
                          <button
                            key={key}
                            onClick={() => handleMove(key)}
                            disabled={acting}
                            className="flex-1 flex flex-col items-center gap-1.5 rounded-[14px] py-3 bg-secondary text-foreground active:scale-[0.97] transition-all"
                          >
                            <Icon className="h-5 w-5 text-primary" strokeWidth={1.8} />
                            <span className="text-[12px] font-medium">{label}</span>
                          </button>
                        ))}
                    </div>
                  )}
                </div>

                {/* Action grid – BIG buttons */}
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => { setShowDateInput(!showDateInput); setShowMovePanel(false); }}
                    disabled={acting}
                    className="flex flex-col items-center gap-2 rounded-[18px] py-5 bg-card shadow-card active:scale-[0.96] transition-all"
                  >
                    <CalendarClock className="h-7 w-7 text-primary" strokeWidth={1.6} />
                    <span className="text-[13px] font-medium text-foreground">Aggiorna data</span>
                  </button>

                  <button
                    onClick={handleConsumed}
                    disabled={acting}
                    className="flex flex-col items-center gap-2 rounded-[18px] py-5 bg-card shadow-card active:scale-[0.96] transition-all"
                  >
                    <UtensilsCrossed className="h-7 w-7 text-success" strokeWidth={1.6} />
                    <span className="text-[13px] font-medium text-foreground">Consumato</span>
                  </button>

                  <button
                    onClick={handleDiscarded}
                    disabled={acting}
                    className="flex flex-col items-center gap-2 rounded-[18px] py-5 bg-card shadow-card active:scale-[0.96] transition-all"
                  >
                    <Trash2 className="h-7 w-7 text-destructive" strokeWidth={1.6} />
                    <span className="text-[13px] font-medium text-foreground">Buttato</span>
                  </button>

                  <button
                    onClick={() => { setShowMovePanel(!showMovePanel); setShowDateInput(false); }}
                    disabled={acting}
                    className="flex flex-col items-center gap-2 rounded-[18px] py-5 bg-card shadow-card active:scale-[0.96] transition-all"
                  >
                    <ArrowRightLeft className="h-7 w-7 text-primary" strokeWidth={1.6} />
                    <span className="text-[13px] font-medium text-foreground">Sposta</span>
                  </button>
                </div>

                {/* Skip */}
                <button
                  onClick={advance}
                  disabled={acting}
                  className="text-[13px] font-medium text-muted-foreground py-2 self-center"
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
