import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Sheet, SheetContent,
} from "@/components/ui/sheet";
import {
  Package, Clock, CalendarClock, Trash2, UtensilsCrossed,
  X, Check, ArrowRightLeft, ChefHat,
  Thermometer, Snowflake, Archive, SkipForward,
} from "lucide-react";

type ExpiryStatus = "expired" | "expiring" | "nodate";

interface ResolveItem {
  id: string;
  type: "inventory" | "preparation";
  name: string;
  image_url: string | null;
  expiry_date: string | null;
  prepared_at?: string | null;
  storage_type: string;
  quantity: number | null;
  unit: string | null;
  status: ExpiryStatus;
}

const statusCfg: Record<ExpiryStatus, { label: string; color: string; bg: string }> = {
  expired:  { label: "SCADUTO",     color: "hsl(1,76%,55%)",  bg: "hsl(1,76%,55%,0.08)" },
  expiring: { label: "IN SCADENZA", color: "hsl(37,90%,51%)", bg: "hsl(37,90%,51%,0.08)" },
  nodate:   { label: "SENZA DATA",  color: "hsl(215,10%,62%)", bg: "hsl(215,10%,62%,0.08)" },
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

type ActionType = "consumed" | "discarded" | "updated" | "moved" | "skipped";

const ResolveExpiryFlow = ({ open, onOpenChange, onComplete }: Props) => {
  const { user } = useAuth();
  const [items, setItems] = useState<ResolveItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);
  const [showDateInput, setShowDateInput] = useState(false);
  const [showMovePanel, setShowMovePanel] = useState(false);
  const [newDate, setNewDate] = useState("");
  const [cardAnim, setCardAnim] = useState<"in" | "out-right" | "out-left" | "out-up" | "check">("in");
  const [done, setDone] = useState(false);

  // Stats
  const [stats, setStats] = useState({ consumed: 0, discarded: 0, updated: 0, moved: 0 });

  // Swipe
  const cardRef = useRef<HTMLDivElement>(null);
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  const [swipeOffset, setSwipeOffset] = useState({ x: 0, y: 0 });
  const [showSwipeHint, setShowSwipeHint] = useState(() => !localStorage.getItem("cibarius_swipe_hint"));

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
        .select("id, name, use_by_date, storage_type, portions, image_url, prepared_at")
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
          prepared_at: p.prepared_at,
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
    setDone(false);
    setStats({ consumed: 0, discarded: 0, updated: 0, moved: 0 });
  };

  useEffect(() => {
    if (open) {
      fetchItems();
      setShowDateInput(false);
      setShowMovePanel(false);
      setNewDate("");
      setCardAnim("in");
    }
  }, [open, user]);

  const current = items[currentIndex] ?? null;
  const total = items.length;

  const vibrate = () => { try { navigator.vibrate?.(30); } catch {} };

  const advance = useCallback((dir: "out-right" | "out-left" | "out-up" | "check", stat?: keyof typeof stats) => {
    setShowDateInput(false);
    setShowMovePanel(false);
    setNewDate("");
    setSwipeOffset({ x: 0, y: 0 });

    if (stat) {
      setStats((s) => ({ ...s, [stat]: s[stat] + 1 }));
    }

    setCardAnim(dir);
    vibrate();

    setTimeout(() => {
      if (currentIndex + 1 >= items.length) {
        setDone(true);
      } else {
        setCurrentIndex((i) => i + 1);
        setCardAnim("in");
      }
    }, 300);
  }, [currentIndex, items.length]);

  const handleConsumed = async () => {
    if (!current || acting) return;
    setActing(true);
    if (current.type === "inventory") {
      await supabase.from("inventory_items").delete().eq("id", current.id);
    } else {
      await supabase.from("preparations").delete().eq("id", current.id);
    }
    setActing(false);
    advance("out-right", "consumed");
  };

  const handleDiscarded = async () => {
    if (!current || acting) return;
    setActing(true);
    if (current.type === "inventory") {
      await supabase.from("inventory_items").delete().eq("id", current.id);
    } else {
      await supabase.from("preparations").delete().eq("id", current.id);
    }
    setActing(false);
    advance("out-left", "discarded");
  };

  const handleUpdateDate = async () => {
    if (!current || !newDate || acting) return;
    setActing(true);
    if (current.type === "inventory") {
      await supabase.from("inventory_items").update({ expiry_date: newDate }).eq("id", current.id);
    } else {
      await supabase.from("preparations").update({ use_by_date: newDate }).eq("id", current.id);
    }
    setActing(false);
    advance("check", "updated");
  };

  const handleMove = async (newStorage: string) => {
    if (!current || acting) return;
    setActing(true);
    if (current.type === "inventory") {
      await supabase.from("inventory_items").update({ storage_type: newStorage }).eq("id", current.id);
    } else {
      await supabase.from("preparations").update({ storage_type: newStorage }).eq("id", current.id);
    }
    setActing(false);
    advance("check", "moved");
  };

  const handleSkip = () => advance("out-up");

  // Touch handlers for swipe
  const onTouchStart = (e: React.TouchEvent) => {
    touchStartRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
  };

  const onTouchMove = (e: React.TouchEvent) => {
    if (!touchStartRef.current) return;
    const dx = e.touches[0].clientX - touchStartRef.current.x;
    const dy = e.touches[0].clientY - touchStartRef.current.y;
    setSwipeOffset({ x: dx, y: Math.min(0, dy) }); // only allow up swipe
  };

  const onTouchEnd = () => {
    if (!touchStartRef.current) return;
    const { x, y } = swipeOffset;
    const threshold = 80;

    if (x > threshold) {
      handleConsumed();
      dismissSwipeHint();
    } else if (x < -threshold) {
      handleDiscarded();
      dismissSwipeHint();
    } else if (y < -threshold) {
      handleSkip();
      dismissSwipeHint();
    } else {
      setSwipeOffset({ x: 0, y: 0 });
    }
    touchStartRef.current = null;
  };

  const dismissSwipeHint = () => {
    if (showSwipeHint) {
      setShowSwipeHint(false);
      localStorage.setItem("cibarius_swipe_hint", "1");
    }
  };

  // Card transform for swipe
  const cardTransform = swipeOffset.x !== 0 || swipeOffset.y !== 0
    ? `translate(${swipeOffset.x}px, ${swipeOffset.y}px) rotate(${swipeOffset.x * 0.05}deg)`
    : undefined;

  const cardOpacity = Math.max(0.4, 1 - Math.abs(swipeOffset.x) / 300);

  // Swipe indicator overlays
  const swipeIndicator = swipeOffset.x > 40 ? "consumed" : swipeOffset.x < -40 ? "discarded" : swipeOffset.y < -40 ? "skip" : null;

  const totalResolved = stats.consumed + stats.discarded + stats.updated + stats.moved;

  return (
    <>
      <style>{`
        @keyframes rcSlideIn { from { opacity:0; transform:translateY(30px) scale(0.95); } to { opacity:1; transform:translateY(0) scale(1); } }
        @keyframes rcOutRight { to { opacity:0; transform:translateX(120%) rotate(8deg); } }
        @keyframes rcOutLeft { to { opacity:0; transform:translateX(-120%) rotate(-8deg); } }
        @keyframes rcOutUp { to { opacity:0; transform:translateY(-100%) scale(0.9); } }
        @keyframes rcCheck { 0% { transform:scale(1); } 50% { transform:scale(1.03); } 100% { opacity:0; transform:scale(0.9) translateY(-20px); } }
        @keyframes rcDoneIn { from { opacity:0; transform:scale(0.8); } to { opacity:1; transform:scale(1); } }
        @keyframes rcHintPulse { 0%,100% { opacity:0.6; } 50% { opacity:1; } }
      `}</style>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="bottom" className="rounded-t-[28px] h-[95vh] flex flex-col p-0 bg-background">
          {/* Header */}
          <div className="flex items-center justify-between px-5 pt-5 pb-1">
            <div>
              <h2 className="text-[18px] font-bold text-foreground">Risolvi scadenze</h2>
            </div>
            <button onClick={() => { onOpenChange(false); onComplete?.(); }} className="p-2 rounded-full bg-secondary active:bg-muted transition-colors">
              <X className="h-4 w-4 text-muted-foreground" />
            </button>
          </div>

          {/* Progress bar */}
          {!loading && total > 0 && !done && (
            <div className="px-5 pt-1 pb-3">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[12px] font-semibold text-foreground">{currentIndex + 1} / {total}</span>
                <span className="text-[11px] text-muted-foreground">{total - currentIndex - 1} rimasti</span>
              </div>
              <div className="h-[4px] w-full rounded-full bg-secondary">
                <div
                  className="h-full rounded-full bg-primary transition-all duration-500 ease-out"
                  style={{ width: `${((currentIndex + 1) / total) * 100}%` }}
                />
              </div>
            </div>
          )}

          {/* Content */}
          <div className="flex-1 overflow-hidden flex flex-col px-5 pb-6">
            {loading ? (
              <div className="flex flex-1 items-center justify-center">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              </div>
            ) : done ? (
              /* ═══ DONE SCREEN ═══ */
              <div
                className="flex flex-1 flex-col items-center justify-center gap-5"
                style={{ animation: "rcDoneIn 0.5s cubic-bezier(0.22,1,0.36,1)" }}
              >
                <div className="flex h-20 w-20 items-center justify-center rounded-full bg-success/10">
                  <Check className="h-10 w-10 text-success" strokeWidth={2.5} />
                </div>
                <div className="text-center">
                  <h2 className="text-[22px] font-bold text-foreground">Fatto! 🎉</h2>
                  <p className="text-[13px] text-muted-foreground mt-1">Hai risolto {totalResolved} elementi</p>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 gap-3 w-full max-w-xs">
                  {[
                    { n: stats.consumed, label: "Consumati", icon: UtensilsCrossed, color: "text-success" },
                    { n: stats.discarded, label: "Buttati", icon: Trash2, color: "text-destructive" },
                    { n: stats.updated, label: "Aggiornati", icon: CalendarClock, color: "text-primary" },
                    { n: stats.moved, label: "Spostati", icon: ArrowRightLeft, color: "text-primary" },
                  ].filter((s) => s.n > 0).map(({ n, label, icon: Icon, color }) => (
                    <div key={label} className="flex items-center gap-2.5 rounded-[14px] bg-card shadow-card px-3 py-3">
                      <Icon className={`h-5 w-5 ${color}`} strokeWidth={1.8} />
                      <div>
                        <p className="text-[18px] font-bold text-foreground leading-none">{n}</p>
                        <p className="text-[10px] text-muted-foreground mt-0.5">{label}</p>
                      </div>
                    </div>
                  ))}
                </div>

                <Button
                  className="w-full max-w-xs h-12 rounded-[14px] text-[15px] font-semibold mt-2"
                  onClick={() => { onOpenChange(false); onComplete?.(); }}
                >
                  Torna Home
                </Button>
              </div>
            ) : items.length === 0 ? (
              <div className="flex flex-1 flex-col items-center justify-center gap-4">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-success/10">
                  <Check className="h-8 w-8 text-success" />
                </div>
                <p className="text-[16px] font-medium text-foreground">Tutto a posto!</p>
                <p className="text-[13px] text-muted-foreground">Nessun prodotto da risolvere</p>
              </div>
            ) : current ? (
              <div className="flex flex-1 flex-col">
                {/* Swipe hint */}
                {showSwipeHint && currentIndex === 0 && (
                  <div
                    className="flex items-center justify-center gap-3 rounded-[12px] bg-primary/5 px-4 py-2 mb-3"
                    style={{ animation: "rcHintPulse 2s ease-in-out infinite" }}
                  >
                    <span className="text-[11px] text-primary font-medium">👉 Swipe per agire · Destra = Consumato · Sinistra = Buttato · Su = Salta</span>
                  </div>
                )}

                {/* ═══ THE CARD ═══ */}
                <div
                  ref={cardRef}
                  key={currentIndex}
                  className="relative rounded-[22px] bg-card shadow-elevated overflow-hidden flex-shrink-0 touch-pan-x"
                  style={{
                    animation: cardAnim === "in" ? "rcSlideIn 0.4s cubic-bezier(0.22,1,0.36,1)" :
                      cardAnim === "out-right" ? "rcOutRight 0.3s ease-in forwards" :
                      cardAnim === "out-left" ? "rcOutLeft 0.3s ease-in forwards" :
                      cardAnim === "out-up" ? "rcOutUp 0.3s ease-in forwards" :
                      "rcCheck 0.35s ease-in forwards",
                    transform: cardTransform,
                    opacity: cardOpacity,
                    transition: swipeOffset.x === 0 && swipeOffset.y === 0 ? "transform 0.3s, opacity 0.3s" : "none",
                  }}
                  onTouchStart={onTouchStart}
                  onTouchMove={onTouchMove}
                  onTouchEnd={onTouchEnd}
                >
                  {/* Swipe overlay indicators */}
                  {swipeIndicator === "consumed" && (
                    <div className="absolute inset-0 bg-success/10 flex items-center justify-center z-10 pointer-events-none">
                      <div className="flex items-center gap-2 bg-success/90 text-white px-5 py-2.5 rounded-full">
                        <UtensilsCrossed className="h-5 w-5" /> <span className="font-bold text-sm">Consumato</span>
                      </div>
                    </div>
                  )}
                  {swipeIndicator === "discarded" && (
                    <div className="absolute inset-0 bg-destructive/10 flex items-center justify-center z-10 pointer-events-none">
                      <div className="flex items-center gap-2 bg-destructive/90 text-white px-5 py-2.5 rounded-full">
                        <Trash2 className="h-5 w-5" /> <span className="font-bold text-sm">Buttato</span>
                      </div>
                    </div>
                  )}
                  {swipeIndicator === "skip" && (
                    <div className="absolute inset-0 bg-muted/30 flex items-center justify-center z-10 pointer-events-none">
                      <div className="flex items-center gap-2 bg-muted-foreground/80 text-white px-5 py-2.5 rounded-full">
                        <SkipForward className="h-5 w-5" /> <span className="font-bold text-sm">Salta</span>
                      </div>
                    </div>
                  )}

                  {/* Image area */}
                  {current.image_url ? (
                    <div className="h-48 w-full bg-secondary">
                      <img src={current.image_url} alt="" className="h-full w-full object-cover" />
                    </div>
                  ) : (
                    <div className="h-36 w-full bg-secondary flex items-center justify-center">
                      {current.type === "preparation" ? (
                        <ChefHat className="h-14 w-14 text-muted-foreground/30" strokeWidth={1.2} />
                      ) : (
                        <Package className="h-14 w-14 text-muted-foreground/30" strokeWidth={1.2} />
                      )}
                    </div>
                  )}

                  {/* Card body */}
                  <div className="px-5 py-4">
                    {/* Badge */}
                    <div className="flex items-center justify-between mb-2">
                      <span
                        className="rounded-[8px] px-2.5 py-[3px] text-[9px] font-bold uppercase tracking-wider text-white"
                        style={{ backgroundColor: statusCfg[current.status].color }}
                      >
                        {statusCfg[current.status].label}
                      </span>
                      <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">
                        {current.type === "preparation" ? "Preparazione" : "Prodotto"}
                      </span>
                    </div>

                    {/* Name */}
                    <h3 className="text-[20px] font-bold text-foreground leading-tight">{current.name}</h3>

                    {/* Info line */}
                    <p className="text-[13px] text-muted-foreground mt-1.5">
                      {current.expiry_date && (
                        <>Scade il {new Date(current.expiry_date).toLocaleDateString("it-IT", { day: "2-digit", month: "2-digit", year: "2-digit" })}</>
                      )}
                      {!current.expiry_date && "Nessuna data di scadenza"}
                      {" · "}
                      {storageLabel[current.storage_type] ?? current.storage_type}
                      {current.quantity != null && ` · x${current.quantity}`}
                    </p>

                    {/* Prep-specific info */}
                    {current.type === "preparation" && current.prepared_at && (
                      <p className="text-[12px] text-muted-foreground mt-1">
                        Preparato il {new Date(current.prepared_at).toLocaleDateString("it-IT")}
                        {current.expiry_date && <> · Servibile fino al {new Date(current.expiry_date).toLocaleDateString("it-IT")}</>}
                      </p>
                    )}

                    {/* Date input */}
                    {showDateInput && (
                      <div className="flex gap-2 mt-4 animate-in slide-in-from-bottom-2">
                        <Input
                          type="date"
                          value={newDate}
                          onChange={(e) => setNewDate(e.target.value)}
                          className="flex-1 rounded-[12px] h-11"
                        />
                        <Button
                          disabled={!newDate || acting}
                          onClick={handleUpdateDate}
                          className="rounded-[12px] h-11 px-5"
                        >
                          Salva
                        </Button>
                      </div>
                    )}

                    {/* Move panel */}
                    {showMovePanel && (
                      <div className="flex gap-2 mt-4 animate-in slide-in-from-bottom-2">
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
                </div>

                {/* ═══ ACTION BUTTONS ═══ */}
                <div className="grid grid-cols-4 gap-2 mt-4">
                  <button
                    onClick={handleConsumed}
                    disabled={acting}
                    className="flex flex-col items-center gap-1.5 rounded-[16px] py-3.5 bg-card shadow-card active:scale-[0.94] transition-all"
                  >
                    <UtensilsCrossed className="h-6 w-6 text-success" strokeWidth={1.8} />
                    <span className="text-[10px] font-semibold text-foreground">Consumato</span>
                  </button>

                  <button
                    onClick={handleDiscarded}
                    disabled={acting}
                    className="flex flex-col items-center gap-1.5 rounded-[16px] py-3.5 bg-card shadow-card active:scale-[0.94] transition-all"
                  >
                    <Trash2 className="h-6 w-6 text-destructive" strokeWidth={1.8} />
                    <span className="text-[10px] font-semibold text-foreground">Buttato</span>
                  </button>

                  <button
                    onClick={() => { setShowDateInput(!showDateInput); setShowMovePanel(false); }}
                    disabled={acting}
                    className="flex flex-col items-center gap-1.5 rounded-[16px] py-3.5 bg-card shadow-card active:scale-[0.94] transition-all"
                  >
                    <CalendarClock className="h-6 w-6 text-primary" strokeWidth={1.8} />
                    <span className="text-[10px] font-semibold text-foreground">Data</span>
                  </button>

                  <button
                    onClick={() => { setShowMovePanel(!showMovePanel); setShowDateInput(false); }}
                    disabled={acting}
                    className="flex flex-col items-center gap-1.5 rounded-[16px] py-3.5 bg-card shadow-card active:scale-[0.94] transition-all"
                  >
                    <ArrowRightLeft className="h-6 w-6 text-primary" strokeWidth={1.8} />
                    <span className="text-[10px] font-semibold text-foreground">Sposta</span>
                  </button>
                </div>

                {/* Skip */}
                <button
                  onClick={handleSkip}
                  disabled={acting}
                  className="flex items-center justify-center gap-1 text-[12px] font-medium text-muted-foreground py-3 mt-1"
                >
                  <SkipForward className="h-3 w-3" /> Salta
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
