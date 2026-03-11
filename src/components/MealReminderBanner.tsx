import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { UtensilsCrossed, Camera, X } from "lucide-react";

interface MealReminderBannerProps {
  className?: string;
}

const MEAL_CONFIG: Record<string, { label: string; emoji: string; message: string; followUpMessage: string; enabledKey: string; timeKey: string }> = {
  colazione: {
    label: "Colazione",
    emoji: "☀️",
    message: "Hai già registrato la colazione?",
    followUpMessage: "Non hai ancora registrato la colazione",
    enabledKey: "colazione_enabled",
    timeKey: "colazione_time",
  },
  pranzo: {
    label: "Pranzo",
    emoji: "🍝",
    message: "Ricordati di registrare il pranzo su Cibarius",
    followUpMessage: "Non hai ancora registrato il pranzo",
    enabledKey: "pranzo_enabled",
    timeKey: "pranzo_time",
  },
  cena: {
    label: "Cena",
    emoji: "🌙",
    message: "Vuoi registrare la cena?",
    followUpMessage: "Non hai ancora registrato la cena",
    enabledKey: "cena_enabled",
    timeKey: "cena_time",
  },
};

const DISMISSED_KEY = "meal_reminder_dismissed";
const FOLLOWUP_DELAY_MIN = 90;

function getCurrentMealType(): { mealType: string; isFollowUp: boolean } | null {
  const h = new Date().getHours();
  const m = new Date().getMinutes();
  const now = h * 60 + m;

  // colazione: 7:00-10:30, pranzo: 12:00-15:30, cena: 19:00-22:30
  // Follow-up windows start 90 min after default time
  const windows = [
    { key: "colazione", start: 420, followUp: 420 + FOLLOWUP_DELAY_MIN, end: 630 },
    { key: "pranzo", start: 720, followUp: 720 + FOLLOWUP_DELAY_MIN, end: 930 },
    { key: "cena", start: 1140, followUp: 1140 + FOLLOWUP_DELAY_MIN, end: 1350 },
  ];

  for (const w of windows) {
    if (now >= w.start && now <= w.end) {
      return { mealType: w.key, isFollowUp: now >= w.followUp };
    }
  }
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
  const [isFollowUp, setIsFollowUp] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [alreadyLogged, setAlreadyLogged] = useState(false);

  useEffect(() => {
    if (!user) return;

    const result = getCurrentMealType();
    if (!result) return;
    const { mealType, isFollowUp: followUp } = result;
    if (isDismissedToday(mealType)) return;

    const checkSettings = async () => {
      const { data: settings } = await supabase
        .from("meal_reminder_settings" as any)
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

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
        if (meals.some((m: any) => m.meal_type === mealType)) {
          setAlreadyLogged(true);
          return;
        }
      }

      setActiveMeal(mealType);
      setIsFollowUp(followUp);
    };

    checkSettings();
  }, [user]);

  const handleDismiss = () => {
    if (activeMeal) dismissMeal(activeMeal);
    setDismissed(true);
  };

  const handleNavigate = () => {
    navigate(`/meals?add=${activeMeal}`);
  };

  const handlePhoto = () => {
    navigate(`/meal-photo?meal=${activeMeal}`);
  };

  if (!activeMeal || dismissed || alreadyLogged) return null;

  const config = MEAL_CONFIG[activeMeal];
  const message = isFollowUp ? config.followUpMessage : config.message;

  return (
    <div className={`rounded-[14px] ${isFollowUp ? "bg-destructive/10 border-destructive/20" : "bg-primary/10 border-primary/20"} border p-3 ${className}`}>
      <div className="flex items-start gap-3">
        <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${isFollowUp ? "bg-destructive/15" : "bg-primary/15"} shrink-0`}>
          <UtensilsCrossed className={`h-5 w-5 ${isFollowUp ? "text-destructive" : "text-primary"}`} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-foreground flex items-center gap-1.5">
            {config.emoji} {message}
          </p>
          <div className="mt-1.5 flex flex-wrap gap-2">
            {isFollowUp && (
              <button
                onClick={handlePhoto}
                className="text-xs font-semibold text-destructive hover:underline flex items-center gap-1"
              >
                <Camera className="h-3.5 w-3.5" /> Scatta foto
              </button>
            )}
            <button
              onClick={handleNavigate}
              className={`text-xs font-semibold ${isFollowUp ? "text-destructive" : "text-primary"} hover:underline`}
            >
              {isFollowUp ? "➕ Aggiungi pasto" : `Registra ${config.label.toLowerCase()} →`}
            </button>
          </div>
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
