import { useState, useEffect, useCallback, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";

interface Macros {
  kcal: number;
  protein: number;
  carbs: number;
  fats: number;
}

interface MacroDetail {
  macro: string;
  label: string;
  value: number;
  remaining: number;
  over: boolean;
}

export type Verdict = "ok" | "warning" | "over";

interface CompatibilityResult {
  verdict: Verdict;
  details: MacroDetail[];
}

export function useDietCompatibility(userId: string | undefined) {
  const [dailyTargets, setDailyTargets] = useState<Macros | null>(null);
  const [todayConsumed, setTodayConsumed] = useState<Macros>({ kcal: 0, protein: 0, carbs: 0, fats: 0 });
  const [loading, setLoading] = useState(true);
  const [hasPlan, setHasPlan] = useState(false);

  useEffect(() => {
    if (!userId) { setLoading(false); return; }
    let cancelled = false;

    const load = async () => {
      setLoading(true);

      // 1. Get active diet plan
      const { data: plan } = await supabase
        .from("diet_plans")
        .select("id, kcal_day, protein_g_day, carbs_g_day, fats_g_day")
        .eq("client_user_id", userId)
        .eq("is_active", true)
        .limit(1)
        .maybeSingle();

      if (cancelled) return;
      if (!plan) {
        setHasPlan(false);
        setLoading(false);
        return;
      }

      setHasPlan(true);
      setDailyTargets({
        kcal: Number(plan.kcal_day),
        protein: Number(plan.protein_g_day),
        carbs: Number(plan.carbs_g_day),
        fats: Number(plan.fats_g_day),
      });

      // 2. Get today's consumed totals
      const today = format(new Date(), "yyyy-MM-dd");
      const { data: mealDay } = await supabase
        .from("meal_days")
        .select("id")
        .eq("user_id", userId)
        .eq("day_date", today)
        .maybeSingle();

      if (cancelled) return;
      if (!mealDay) {
        setTodayConsumed({ kcal: 0, protein: 0, carbs: 0, fats: 0 });
        setLoading(false);
        return;
      }

      const { data: meals } = await supabase
        .from("meals")
        .select("id")
        .eq("meal_day_id", mealDay.id);

      if (cancelled || !meals?.length) {
        setTodayConsumed({ kcal: 0, protein: 0, carbs: 0, fats: 0 });
        setLoading(false);
        return;
      }

      const mealIds = meals.map((m) => m.id);
      const { data: items } = await supabase
        .from("meal_items")
        .select("calories, macros")
        .in("meal_id", mealIds);

      if (cancelled) return;

      let kcal = 0, protein = 0, carbs = 0, fats = 0;
      for (const it of items || []) {
        kcal += Number(it.calories) || 0;
        const m = it.macros as Record<string, number> | null;
        if (m) {
          protein += Number(m.protein) || 0;
          carbs += Number(m.carbs) || 0;
          fats += Number(m.fats) || 0;
        }
      }
      setTodayConsumed({ kcal, protein, carbs, fats });
      setLoading(false);
    };

    load();
    return () => { cancelled = true; };
  }, [userId]);

  const remaining = useMemo<Macros | null>(() => {
    if (!dailyTargets) return null;
    return {
      kcal: Math.max(0, dailyTargets.kcal - todayConsumed.kcal),
      protein: Math.max(0, dailyTargets.protein - todayConsumed.protein),
      carbs: Math.max(0, dailyTargets.carbs - todayConsumed.carbs),
      fats: Math.max(0, dailyTargets.fats - todayConsumed.fats),
    };
  }, [dailyTargets, todayConsumed]);

  const checkProduct = useCallback(
    (kcal: number, protein: number, carbs: number, fats: number): CompatibilityResult => {
      if (!dailyTargets || !remaining) {
        return { verdict: "ok", details: [] };
      }

      const macros: { key: keyof Macros; label: string; value: number }[] = [
        { key: "kcal", label: "Kcal", value: kcal },
        { key: "protein", label: "Proteine", value: protein },
        { key: "carbs", label: "Carboidrati", value: carbs },
        { key: "fats", label: "Grassi", value: fats },
      ];

      let maxExcess = -Infinity;
      const details: MacroDetail[] = macros.map(({ key, label, value }) => {
        const rem = remaining[key];
        const target = dailyTargets[key];
        const excess = target > 0 ? (value - rem) / target : 0;
        if (excess > maxExcess) maxExcess = excess;
        return { macro: key, label, value, remaining: rem, over: excess > 0.10 };
      });

      let verdict: Verdict = "ok";
      if (maxExcess >= 0.30) verdict = "over";
      else if (maxExcess > 0.10) verdict = "warning";

      return { verdict, details };
    },
    [dailyTargets, remaining]
  );

  return { hasPlan, loading, dailyTargets, todayConsumed, remaining, checkProduct };
}
