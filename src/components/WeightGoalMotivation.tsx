import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useSubscription } from "@/hooks/useSubscription";
import { supabase } from "@/integrations/supabase/client";
import { Progress } from "@/components/ui/progress";
import { Target, ArrowDown, ArrowUp, TrendingUp } from "lucide-react";

interface WeightGoalData {
  height_cm: number | null;
  starting_weight_kg: number | null;
  current_weight_kg: number | null;
  target_weight_kg: number | null;
}

interface MeasurementWeight {
  weight_kg: number | null;
}

function useWeightGoal() {
  const { user } = useAuth();
  const [goal, setGoal] = useState<WeightGoalData | null>(null);
  const [latestWeight, setLatestWeight] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) { setLoading(false); return; }
    const load = async () => {
      const [{ data: gData }, { data: mData }] = await Promise.all([
        supabase.from("weight_goals" as any).select("*").eq("user_id", user.id).maybeSingle(),
        supabase.from("body_measurements").select("weight_kg").eq("user_id", user.id)
          .not("weight_kg", "is", null).order("measured_at", { ascending: false }).limit(1).maybeSingle(),
      ]);
      if (gData) setGoal(gData as any);
      if (mData && (mData as MeasurementWeight).weight_kg) {
        setLatestWeight((mData as MeasurementWeight).weight_kg);
      } else if (gData) {
        setLatestWeight((gData as any).current_weight_kg);
      }
      setLoading(false);
    };
    load();
  }, [user]);

  const startWeight = goal?.starting_weight_kg ?? null;
  const targetWeight = goal?.target_weight_kg ?? null;
  const isLosingGoal = startWeight && targetWeight ? targetWeight < startWeight : null;
  const totalToChange = startWeight && targetWeight ? Math.abs(targetWeight - startWeight) : null;
  const progressPct = totalToChange && startWeight && latestWeight
    ? Math.min(100, Math.max(0, Math.round((Math.abs(startWeight - latestWeight) / totalToChange) * 100)))
    : null;
  const remaining = targetWeight && latestWeight ? Math.round(Math.abs(latestWeight - targetWeight) * 10) / 10 : null;
  const weightDiff = startWeight && latestWeight ? Math.round((latestWeight - startWeight) * 10) / 10 : null;

  return { goal, latestWeight, startWeight, targetWeight, isLosingGoal, progressPct, remaining, weightDiff, loading };
}

/**
 * Compact variant for Plan page — shows goal card with progress
 */
export const WeightGoalPlanCard = () => {
  const { isActive } = useSubscription("user_plus");
  const { goal, latestWeight, targetWeight, progressPct, remaining, isLosingGoal, weightDiff, loading } = useWeightGoal();

  if (!isActive || loading || !goal || !targetWeight) return null;

  return (
    <div className="rounded-xl border border-primary/15 bg-gradient-to-r from-primary/5 to-transparent p-3 space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Target className="h-3.5 w-3.5 text-primary" />
          <span className="text-xs font-semibold text-foreground">Obiettivo peso</span>
        </div>
        <span className="text-xs font-bold text-primary">🎯 {targetWeight} kg</span>
      </div>
      {latestWeight && (
        <div className="flex items-center gap-2 text-xs">
          <span className="font-bold text-foreground">{latestWeight} kg</span>
          {weightDiff !== null && weightDiff !== 0 && (
            <span className={`flex items-center gap-0.5 text-[10px] font-semibold ${
              (isLosingGoal && weightDiff < 0) || (!isLosingGoal && weightDiff > 0)
                ? "text-success" : "text-destructive"
            }`}>
              {weightDiff > 0 ? <ArrowUp className="h-2.5 w-2.5" /> : <ArrowDown className="h-2.5 w-2.5" />}
              {Math.abs(weightDiff)} kg
            </span>
          )}
          {remaining !== null && remaining > 0 && (
            <span className="text-muted-foreground ml-auto">Mancano {remaining} kg</span>
          )}
        </div>
      )}
      {progressPct !== null && <Progress value={progressPct} className="h-1.5" />}
    </div>
  );
};

/**
 * Tiny badge for Meals page header
 */
export const WeightGoalBadge = () => {
  const { isActive } = useSubscription("user_plus");
  const { targetWeight, latestWeight, remaining, loading } = useWeightGoal();

  if (!isActive || loading || !targetWeight) return null;

  return (
    <div className="flex items-center gap-1.5 rounded-lg bg-primary/10 px-2.5 py-1">
      <Target className="h-3 w-3 text-primary" />
      <span className="text-[10px] font-semibold text-primary">
        🎯 {targetWeight} kg
        {remaining !== null && remaining > 0 && (
          <span className="text-muted-foreground font-normal ml-1">(-{remaining})</span>
        )}
      </span>
    </div>
  );
};

/**
 * Compact home progress bar
 */
export const WeightGoalHomeBar = () => {
  const { isActive } = useSubscription("user_plus");
  const { goal, latestWeight, targetWeight, progressPct, remaining, loading } = useWeightGoal();

  if (!isActive || loading || !goal || !targetWeight) return null;

  return (
    <div className="rounded-[14px] bg-card shadow-card p-3 space-y-1.5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <TrendingUp className="h-3.5 w-3.5 text-primary" />
          <span className="text-[11px] font-semibold text-foreground">Percorso peso</span>
        </div>
        <span className="text-[10px] font-bold text-primary">🎯 {targetWeight} kg</span>
      </div>
      <div className="flex items-center gap-2">
        {latestWeight && (
          <span className="text-xs font-bold text-foreground">{latestWeight} kg</span>
        )}
        <div className="flex-1">
          <Progress value={progressPct ?? 0} className="h-1.5" />
        </div>
        {remaining !== null && remaining > 0 && (
          <span className="text-[10px] text-muted-foreground whitespace-nowrap">-{remaining} kg</span>
        )}
      </div>
    </div>
  );
};
