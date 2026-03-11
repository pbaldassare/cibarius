import { useEffect, useState } from "react";
import MobileHeader from "@/components/MobileHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Bell, BellOff, Clock, Loader2, Stethoscope, Send } from "lucide-react";

interface ReminderSettings {
  enabled: boolean;
  colazione_enabled: boolean;
  pranzo_enabled: boolean;
  cena_enabled: boolean;
  colazione_time: string;
  pranzo_time: string;
  cena_time: string;
}

const DEFAULT_SETTINGS: ReminderSettings = {
  enabled: true,
  colazione_enabled: true,
  pranzo_enabled: true,
  cena_enabled: true,
  colazione_time: "08:00",
  pranzo_time: "13:00",
  cena_time: "20:00",
};

const MEAL_LABELS: { mealKey: string; label: string; emoji: string; key: keyof ReminderSettings; timeKey: keyof ReminderSettings }[] = [
  { mealKey: "colazione", label: "Colazione", emoji: "☀️", key: "colazione_enabled", timeKey: "colazione_time" },
  { mealKey: "pranzo", label: "Pranzo", emoji: "🍝", key: "pranzo_enabled", timeKey: "pranzo_time" },
  { mealKey: "cena", label: "Cena", emoji: "🌙", key: "cena_enabled", timeKey: "cena_time" },
];

const MealRemindersPage = () => {
  const { user } = useAuth();
  const [settings, setSettings] = useState<ReminderSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [pushSupported, setPushSupported] = useState(false);
  const [pushGranted, setPushGranted] = useState(false);
  const [hasNutritionist, setHasNutritionist] = useState(false);

  useEffect(() => {
    if ("Notification" in window && "serviceWorker" in navigator) {
      setPushSupported(true);
      setPushGranted(Notification.permission === "granted");
    }
  }, []);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const [settingsRes, linkRes] = await Promise.all([
        supabase
          .from("meal_reminder_settings" as any)
          .select("*")
          .eq("user_id", user.id)
          .maybeSingle(),
        supabase
          .from("client_links")
          .select("id")
          .eq("client_user_id", user.id)
          .eq("status", "active")
          .limit(1)
          .maybeSingle(),
      ]);

      if (settingsRes.data) {
        const d = settingsRes.data as any;
        setSettings({
          enabled: d.enabled,
          colazione_enabled: d.colazione_enabled,
          pranzo_enabled: d.pranzo_enabled,
          cena_enabled: d.cena_enabled,
          colazione_time: (d.colazione_time || "08:00").slice(0, 5),
          pranzo_time: (d.pranzo_time || "13:00").slice(0, 5),
          cena_time: (d.cena_time || "20:00").slice(0, 5),
        });
      }
      setHasNutritionist(!!linkRes.data);
      setLoading(false);
    };
    load();
  }, [user]);

  const saveSettings = async (newSettings: ReminderSettings) => {
    if (!user) return;
    setSaving(true);
    setSettings(newSettings);

    const { error } = await supabase
      .from("meal_reminder_settings" as any)
      .upsert({
        user_id: user.id,
        ...newSettings,
        updated_at: new Date().toISOString(),
      } as any);

    if (error) {
      toast.error("Errore nel salvare le impostazioni");
    } else {
      toast.success("Impostazioni salvate");
    }
    setSaving(false);
  };

  const handleToggle = (key: keyof ReminderSettings, value: boolean) => {
    saveSettings({ ...settings, [key]: value });
  };

  const handleTimeChange = (key: keyof ReminderSettings, value: string) => {
    saveSettings({ ...settings, [key]: value });
  };

  const requestPushPermission = async () => {
    if (!pushSupported) return;
    try {
      const permission = await Notification.requestPermission();
      if (permission === "granted") {
        setPushGranted(true);
        toast.success("Notifiche push attivate!");
      } else {
        toast.error("Permesso notifiche negato");
      }
    } catch {
      toast.error("Errore nell'attivare le notifiche push");
    }
  };

  if (loading) {
    return (
      <div>
        <MobileHeader title="Promemoria pasti" />
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <MobileHeader title="Promemoria pasti" />
      <main className="px-4 py-5 space-y-4 pb-28">
        {/* Nutritionist message */}
        {hasNutritionist && (
          <div className="rounded-xl border-2 border-primary/20 bg-primary/5 p-3 flex items-start gap-2.5">
            <Stethoscope className="h-5 w-5 text-primary shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-foreground">Il tuo nutrizionista può monitorare i tuoi pasti</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Registra regolarmente i pasti per permettere al tuo professionista di seguirti al meglio
              </p>
            </div>
          </div>
        )}

        {/* Master toggle */}
        <Card>
          <CardContent className="flex items-center justify-between py-4">
            <div className="flex items-center gap-3">
              {settings.enabled ? (
                <Bell className="h-5 w-5 text-primary" />
              ) : (
                <BellOff className="h-5 w-5 text-muted-foreground" />
              )}
              <div>
                <p className="text-sm font-semibold text-foreground">Promemoria pasti</p>
                <p className="text-xs text-muted-foreground">Ricevi notifiche per registrare i pasti</p>
              </div>
            </div>
            <Switch
              checked={settings.enabled}
              onCheckedChange={(v) => handleToggle("enabled", v)}
            />
          </CardContent>
        </Card>

        {/* Push notification status */}
        {pushSupported && settings.enabled && (
          <Card>
            <CardContent className="py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Send className="h-5 w-5 text-primary" />
                  <div>
                    <p className="text-sm font-semibold text-foreground">Notifiche push</p>
                    <p className="text-xs text-muted-foreground">
                      {pushGranted
                        ? "Le notifiche push sono attive"
                        : "Ricevi notifiche anche con l'app chiusa"}
                    </p>
                  </div>
                </div>
                {pushGranted ? (
                  <Badge variant="default" className="text-xs">Attive</Badge>
                ) : (
                  <Button size="sm" variant="outline" onClick={requestPushPermission}>
                    Attiva
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Individual meal reminders */}
        {settings.enabled && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Clock className="h-4 w-4 text-primary" />
                Orari promemoria
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {MEAL_LABELS.map(({ mealKey, label, emoji, key, timeKey }) => (
                <div key={mealKey} className="flex items-center gap-3">
                  <Switch
                    checked={settings[key] as boolean}
                    onCheckedChange={(v) => handleToggle(key, v)}
                  />
                  <span className="text-lg">{emoji}</span>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-foreground">{label}</p>
                  </div>
                  <Input
                    type="time"
                    value={settings[timeKey] as string}
                    onChange={(e) => handleTimeChange(timeKey, e.target.value)}
                    disabled={!(settings[key] as boolean)}
                    className="w-28 h-9 text-sm text-center"
                  />
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Info */}
        {settings.enabled && (
          <div className="rounded-xl bg-muted/50 p-4 space-y-2">
            <p className="text-xs font-semibold text-foreground">Come funzionano i promemoria</p>
            <ul className="text-xs text-muted-foreground space-y-1">
              <li>📱 <strong>In-app:</strong> Vedrai un banner nella home quando è ora di registrare un pasto</li>
              {pushSupported && (
                <li>🔔 <strong>Push:</strong> Ricevi una notifica anche con l'app chiusa (se attivate)</li>
              )}
              <li>🎯 Cliccando il promemoria vai direttamente alla registrazione del pasto</li>
            </ul>
          </div>
        )}
      </main>
    </div>
  );
};

export default MealRemindersPage;
