import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Leaf, TrendingDown, ChevronRight, Recycle } from "lucide-react";

const WasteSavingsCard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState<{ count: number; weightKg: number; money: number } | null>(null);

  useEffect(() => {
    if (!user) return;
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    supabase
      .from("waste_savings" as any)
      .select("weight_g, estimated_price")
      .eq("user_id", user.id)
      .gte("saved_at", startOfMonth.toISOString())
      .then(({ data }) => {
        if (!data || data.length === 0) {
          setStats({ count: 0, weightKg: 0, money: 0 });
          return;
        }
        const rows = data as any[];
        setStats({
          count: rows.length,
          weightKg: Math.round(rows.reduce((s, r) => s + (r.weight_g || 0), 0) / 100) / 10,
          money: Math.round(rows.reduce((s, r) => s + (r.estimated_price || 0), 0) * 100) / 100,
        });
      });
  }, [user]);

  if (!stats || stats.count === 0) return null;

  return (
    <button
      onClick={() => navigate("/anti-waste")}
      className="w-full rounded-[18px] bg-card shadow-card overflow-hidden active:scale-[0.98] transition-transform text-left"
    >
      <div className="h-1.5 w-full" style={{ background: "linear-gradient(90deg, hsl(var(--success)), hsl(var(--primary)))" }} />
      <div className="flex items-center gap-3 px-4 py-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-success/15 shrink-0">
          <Recycle className="h-5 w-5 text-success" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[13px] font-semibold text-foreground">Spreco evitato questo mese</p>
          <div className="flex gap-3 mt-0.5">
            <span className="text-xs text-muted-foreground">
              <span className="font-bold text-success">{stats.count}</span> alimenti
            </span>
            <span className="text-xs text-muted-foreground">
              <span className="font-bold text-success">{stats.weightKg}</span> kg
            </span>
            <span className="text-xs text-muted-foreground">
              <span className="font-bold text-success">€{stats.money.toFixed(0)}</span> risparmiati
            </span>
          </div>
        </div>
        <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
      </div>
    </button>
  );
};

export default WasteSavingsCard;
