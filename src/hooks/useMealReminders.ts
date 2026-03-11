import { useEffect } from "react";
import { useAuth } from "./useAuth";
import { supabase } from "@/integrations/supabase/client";

const MEAL_MESSAGES: Record<string, { first: string; second: string }> = {
  colazione: {
    first: "Hai già registrato la colazione? ☀️",
    second: "Non hai ancora registrato la colazione ☀️",
  },
  pranzo: {
    first: "Ricordati di registrare il pranzo su Cibarius 🍝",
    second: "Non hai ancora registrato il pranzo 🍝",
  },
  cena: {
    first: "Vuoi registrare la cena? 🌙",
    second: "Non hai ancora registrato la cena 🌙",
  },
};

const FOLLOWUP_DELAY_MS = 90 * 60 * 1000; // 90 minutes

function scheduleLocalNotification(
  mealType: string,
  timeStr: string,
  isFollowUp: boolean,
  checkMealLogged: () => Promise<boolean>
) {
  if (!("Notification" in window) || Notification.permission !== "granted") return null;

  const [hours, minutes] = timeStr.split(":").map(Number);
  const now = new Date();
  const target = new Date();
  target.setHours(hours, minutes, 0, 0);

  if (isFollowUp) {
    target.setTime(target.getTime() + FOLLOWUP_DELAY_MS);
  }

  if (target <= now) return null;

  const delay = target.getTime() - now.getTime();
  const msgs = MEAL_MESSAGES[mealType] || { first: "Registra il tuo pasto", second: "Non hai ancora registrato il pasto" };

  return setTimeout(async () => {
    // For follow-up, check if meal was logged in the meantime
    if (isFollowUp) {
      const logged = await checkMealLogged();
      if (logged) return;
    }

    const body = isFollowUp ? msgs.second : msgs.first;
    const tag = isFollowUp ? `meal-followup-${mealType}` : `meal-${mealType}`;

    const actions: NotificationAction[] = isFollowUp
      ? [
          { action: "photo", title: "📷 Scatta foto" },
          { action: "add", title: "➕ Aggiungi pasto" },
          { action: "skip", title: "Salta" },
        ]
      : [];

    const notification = new Notification("Cibarius", {
      body,
      icon: "/icons/icon-192.png",
      badge: "/icons/icon-192.png",
      tag,
      data: { url: `/meals?add=${mealType}`, mealType, isFollowUp },
      ...(isFollowUp && actions.length > 0 ? { actions } : {}),
    } as NotificationOptions);

    notification.onclick = () => {
      window.focus();
      window.location.href = `/meals?add=${mealType}`;
      notification.close();
    };
  }, delay);
}

export function useMealReminders() {
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;
    if (!("Notification" in window) || Notification.permission !== "granted") return;

    let timers: ReturnType<typeof setTimeout>[] = [];

    const checkMealLoggedFactory = (mealType: string) => async (): Promise<boolean> => {
      const today = new Date().toISOString().slice(0, 10);
      const { data: mealDay } = await supabase
        .from("meal_days")
        .select("id, meals(meal_type)")
        .eq("user_id", user.id)
        .eq("day_date", today)
        .maybeSingle();

      if (!mealDay) return false;
      const meals = (mealDay as any).meals || [];
      return meals.some((m: any) => m.meal_type === mealType);
    };

    const loadAndSchedule = async () => {
      const { data: settings } = await supabase
        .from("meal_reminder_settings" as any)
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (!settings || !(settings as any).enabled) return;

      const s = settings as any;
      const meals = [
        { key: "colazione", enabled: s.colazione_enabled, time: (s.colazione_time || "08:00").slice(0, 5) },
        { key: "pranzo", enabled: s.pranzo_enabled, time: (s.pranzo_time || "13:00").slice(0, 5) },
        { key: "cena", enabled: s.cena_enabled, time: (s.cena_time || "20:00").slice(0, 5) },
      ];

      // Check which meals already logged today
      const today = new Date().toISOString().slice(0, 10);
      const { data: mealDay } = await supabase
        .from("meal_days")
        .select("id, meals(meal_type)")
        .eq("user_id", user.id)
        .eq("day_date", today)
        .maybeSingle();

      const loggedMeals = new Set<string>();
      if (mealDay) {
        ((mealDay as any).meals || []).forEach((m: any) => loggedMeals.add(m.meal_type));
      }

      meals.forEach(({ key, enabled, time }) => {
        if (!enabled) return;
        if (loggedMeals.has(key)) return;

        // Schedule first notification
        const timer1 = scheduleLocalNotification(key, time, false, checkMealLoggedFactory(key));
        if (timer1) timers.push(timer1);

        // Schedule follow-up notification (90 min later, checks if meal was logged)
        const timer2 = scheduleLocalNotification(key, time, true, checkMealLoggedFactory(key));
        if (timer2) timers.push(timer2);
      });
    };

    loadAndSchedule();

    return () => {
      timers.forEach(clearTimeout);
    };
  }, [user]);
}
