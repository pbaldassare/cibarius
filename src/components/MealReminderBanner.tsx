import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { UtensilsCrossed, X } from "lucide-react";

interface MealReminderBannerProps {
  className?: string;
}

const MEAL_CONFIG: Record<string, { label: string; emoji: string; message: string; enabledKey: string; timeKey: string }> = {
  colazione: {
    label: "Colazione",
    emoji: "☀️",
    message: "Hai già registrato la colazione?",
    enabledKey: "colazione_enabled",
    timeKey: "colazione_time",
  },
  pranzo: {
    label: "Pranzo",
    emoji: "🍝",
    message: "Ricordati di registrare il pranzo su Cibarius",
    enabledKey: "pranzo_enabled",
    timeKey: "pranzo_time",
  },
  cena: {
    label: "Cena",
    emoji: "🌙",
    message: "Vuoi registrare la cena?",
    enabledKey: "cena_enabled",
    timeKey: "cena_time",
  },
};

const DISMISSED_KEY = "meal_reminder_dismissed";

function getCurrentMealType(): string | null {
  const h = new Date().getHours();
  const m = new Date().getMinutes();
  const now = h * 60 + m;

  // colazione: 7:00-10:30, pranzo: 12:00-15:30, cena: 19:00-22:30
  if (now >= 420 && now <= 630) return "colazione";
  if (now >= 720 && now <= 930) return "pranzo";
  if (now >= 1140 && now <= 1350) return "cena";
  return null;
}

function isDismissedToday(mealType: string): boolean {
  try {
    const stored = localStorage.getItem(DISMISSED_KEY);
    if (!stored) return false;
    const data = JSON.parse(stored);
    const today = new Date().toISOString().slice(0, 10);
    return data[mealType] === today;
  } catch {
    return false;
  }
}

function dismissMeal(mealType: string) {
  try {
    const stored = localStorage.getItem(DISMISSED_KEY);
    const data = stored ? JSON.parse(stored) : {};
    data[mealType] = new Date().toISOString().slice(0, 10);
    localStorage.setItem(DISMISSED_KEY, JSON.stringify(data));
  } catch {}
}

const MealReminderBanner = ({ className = "" }: MealReminderBannerProps) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [activeMeal, setActiveMeal] = useState<string | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const [alreadyLogged, setAlreadyLogged] = useState(false);

  useEffect(() => {
    if (!user) return;

    const mealType = getCurrentMealType();
    if (!mealType) return;
    if (isDismissedToday(mealType)) return;

    // Check if reminder is enabled for this meal
    const checkSettings = async () => {
      const { data: settings } = await supabase
        .from("meal_reminder_settings" as any)
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      // Default to enabled if no settings exist
      if (settings) {
        const s = settings as any;
        if (!s.enabled) return;
        if (!s[MEAL_CONFIG[mealType].enabledKey]) return;
      }

      // Check if meal already logged today
      const today = new Date().toISOString().slice(0, 10);
      const { data: mealDay } = await supabase
        .from("meal_days")
        .select("id, meals(id, meal_type)")
        .eq("user_id", user.id)
        .eq("day_date", today)
        .maybeSingle();

      if (mealDay) {
        const meals = (mealDay as any).meals || [];
        const hasThisMeal = meals.some((m: any) => m.meal_type === mealType);
        if (hasThisMeal) {
          setAlreadyLogged(true);
          return;
        }
      }

      setActiveMeal(mealType);
    };

    checkSettings();
  }, [user]);

  const handleDismiss = () => {
    if (activeMeal) {
      dismissMeal(activeMeal);
    }
    setDismissed(true);
  };

  const handleNavigate = () => {
    // Navigate to meals page - the meal type will be used for deep linking
    navigate(`/meals?add=${activeMeal}`);
  };

  if (!activeMeal || dismissed || alreadyLogged) return null;

  const config = MEAL_CONFIG[activeMeal];

  return (
    <div className={`rounded-[14px] bg-primary/10 border border-primary/20 p-3 ${className}`}>
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/15 shrink-0">
          <UtensilsCrossed className="h-5 w-5 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-foreground flex items-center gap-1.5">
            {config.emoji} {config.message}
          </p>
          <button
            onClick={handleNavigate}
            className="mt-1.5 text-xs font-semibold text-primary hover:underline"
          >
            Registra {config.label.toLowerCase()} →
          </button>
        </div>
        <button
          onClick={handleDismiss}
          className="p-1 rounded-lg hover:bg-muted shrink-0"
          aria-label="Chiudi"
        >
          <X className="h-4 w-4 text-muted-foreground" />
        </button>
      </div>
    </div>
  );
};

export default MealReminderBanner;
