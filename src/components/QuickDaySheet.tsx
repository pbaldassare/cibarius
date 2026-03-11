import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { safeSupabaseOp } from "@/lib/offline-sync";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Loader2, Zap, Leaf, Flame } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  targetKcal?: number | null;
  onComplete: () => void;
}

const DAY_TYPES = [
  {
    key: "leggero",
    label: "Giorno leggero",
    emoji: "🥗",
    icon: Leaf,
    description: "Pasti leggeri, meno calorie del solito",
    factor: 0.75,
    color: "border-green-300 bg-green-50 dark:bg-green-950/20",
  },
  {
    key: "equilibrato",
    label: "Giorno equilibrato",
    emoji: "⚖️",
    icon: Zap,
    description: "Alimentazione nella norma",
    factor: 1.0,
    color: "border-primary/30 bg-primary/5",
  },
  {
    key: "abbondante",
    label: "Giorno abbondante",
    emoji: "🍕",
    icon: Flame,
    description: "Pasti più ricchi del solito",
    factor: 1.3,
    color: "border-orange-300 bg-orange-50 dark:bg-orange-950/20",
  },
];

const BASE_KCAL = 2000;
const MACRO_RATIOS = { protein: 0.25, carbs: 0.50, fats: 0.25 }; // kcal ratios

const QuickDaySheet = ({ open, onOpenChange, targetKcal, onComplete }: Props) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [saving, setSaving] = useState<string | null>(null);

  const baseKcal = targetKcal || BASE_KCAL;

  const handleSelect = async (dayType: string, factor: number) => {
    if (!user) return;
    setSaving(dayType);

    const kcal = Math.round(baseKcal * factor);
    const protein = Math.round((kcal * MACRO_RATIOS.protein) / 4); // 4 kcal/g
    const carbs = Math.round((kcal * MACRO_RATIOS.carbs) / 4);
    const fats = Math.round((kcal * MACRO_RATIOS.fats) / 9); // 9 kcal/g

    try {
      const today = new Date().toISOString().slice(0, 10);

      const { offline, error } = await safeSupabaseOp({
        table: "quick_day_logs",
        method: "upsert",
        payload: {
          user_id: user.id,
          day_date: today,
          day_type: dayType,
          estimated_kcal: kcal,
          estimated_protein: protein,
          estimated_carbs: carbs,
          estimated_fats: fats,
        },
        onConflict: "user_id,day_date",
      });
      if (error) throw new Error(error);

      toast({
        title: offline ? "Salvato offline 📴" : "Giorno veloce registrato ✅",
        description: `${DAY_TYPES.find((d) => d.key === dayType)?.label} — ~${kcal} kcal stimati${offline ? " (verrà sincronizzato)" : ""}`,
      });
      onComplete();
      onOpenChange(false);
    } catch (e: any) {
      toast({ variant: "destructive", title: "Errore", description: e.message });
    } finally {
      setSaving(null);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-3xl">
        <SheetHeader className="pb-3 border-b border-border">
          <SheetTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-primary" /> Giorno veloce
          </SheetTitle>
        </SheetHeader>
        <div className="py-4 space-y-3">
          <p className="text-sm text-muted-foreground">
            Non vuoi registrare ogni pasto? Seleziona il tipo di giornata per una stima rapida.
          </p>

          {DAY_TYPES.map((dt) => {
            const kcal = Math.round(baseKcal * dt.factor);
            const Icon = dt.icon;
            return (
              <button
                key={dt.key}
                onClick={() => handleSelect(dt.key, dt.factor)}
                disabled={!!saving}
                className={`w-full rounded-2xl border-2 ${dt.color} p-4 text-left transition-all active:scale-[0.98] disabled:opacity-50`}
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-card">
                    <span className="text-2xl">{dt.emoji}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground">{dt.label}</p>
                    <p className="text-xs text-muted-foreground">{dt.description}</p>
                    <p className="text-xs font-medium text-primary mt-0.5">~{kcal} kcal stimate</p>
                  </div>
                  {saving === dt.key ? (
                    <Loader2 className="h-5 w-5 animate-spin text-primary" />
                  ) : (
                    <Icon className="h-5 w-5 text-muted-foreground" />
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default QuickDaySheet;
