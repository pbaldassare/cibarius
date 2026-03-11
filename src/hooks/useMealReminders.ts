import { useEffect } from "react";
import { useAuth } from "./useAuth";
import { supabase } from "@/integrations/supabase/client";

const MEAL_MESSAGES: Record<string, string> = {
  colazione: "Hai già registrato la colazione? ☀️",
  pranzo: "Ricordati di registrare il pranzo su Cibarius 🍝",
  cena: "Vuoi registrare la cena? 🌙",
};

// Schedule local notifications using the Notification API
function scheduleLocalNotification(mealType: string, timeStr: string) {
  if (!("Notification" in window) || Notification.permission !== "granted") return null;

  const [hours, minutes] = timeStr.split(":").map(Number);
  const now = new Date();
  const target = new Date();
  target.setHours(hours, minutes, 0, 0);

  // If time already passed today, skip
  if (target <= now) return null;

  const delay = target.getTime() - now.getTime();
  
  return setTimeout(() => {
    const notification = new Notification("Cibarius", {
      body: MEAL_MESSAGES[mealType] || `Registra il tuo pasto su Cibarius`,
      icon: "/icons/icon-192.png",
      badge: "/icons/icon-192.png",
      tag: `meal-${mealType}`,
      data: { url: `/meals?add=${mealType}` },
    });

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
        const timer = scheduleLocalNotification(key, time);
        if (timer) timers.push(timer);
      });
    };

    loadAndSchedule();

    return () => {
      timers.forEach(clearTimeout);
    };
  }, [user]);
}
