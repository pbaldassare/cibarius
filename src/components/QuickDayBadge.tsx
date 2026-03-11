import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Zap, X } from "lucide-react";

const LABEL: Record<string, string> = {
  leggero: "🥗 Giorno leggero",
  equilibrato: "⚖️ Giorno equilibrato",
  abbondante: "🍕 Giorno abbondante",
};

const QuickDayBadge = () => {
  const { user } = useAuth();
  const [quickDay, setQuickDay] = useState<any>(null);

  useEffect(() => {
    if (!user) return;
    const today = new Date().toISOString().slice(0, 10);
    supabase
      .from("quick_day_logs" as any)
      .select("*")
      .eq("user_id", user.id)
      .eq("day_date", today)
      .maybeSingle()
      .then(({ data }) => setQuickDay(data));
  }, [user]);

  const handleRemove = async () => {
    if (!quickDay) return;
    await supabase.from("quick_day_logs" as any).delete().eq("id", (quickDay as any).id);
    setQuickDay(null);
  };

  if (!quickDay) return null;

  const q = quickDay as any;
  return (
    <div className="rounded-xl border-2 border-accent/40 bg-accent/10 p-3 flex items-center gap-3">
      <Zap className="h-5 w-5 text-accent shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-foreground">
          {LABEL[q.day_type] || "Giorno stimato"}
        </p>
        <p className="text-xs text-muted-foreground">
          ~{q.estimated_kcal} kcal · P{q.estimated_protein}g C{q.estimated_carbs}g G{q.estimated_fats}g
        </p>
      </div>
      <button onClick={handleRemove} className="p-1 rounded-lg hover:bg-muted shrink-0" aria-label="Rimuovi">
        <X className="h-4 w-4 text-muted-foreground" />
      </button>
    </div>
  );
};

export default QuickDayBadge;
