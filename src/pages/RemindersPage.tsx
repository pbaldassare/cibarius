import { useState, useEffect } from "react";
import MobileHeader from "@/components/MobileHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Bell, Save } from "lucide-react";

const STORAGE_KEY = "cibarius_reminder_prefs";

export interface ReminderPrefs {
  daysBeforeExpiry: number;
  showExpired: boolean;
  showExpiring: boolean;
}

export const defaultPrefs: ReminderPrefs = {
  daysBeforeExpiry: 3,
  showExpired: true,
  showExpiring: true,
};

export const getPrefs = (): ReminderPrefs => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return { ...defaultPrefs, ...JSON.parse(raw) };
  } catch {}
  return defaultPrefs;
};

const savePrefs = (p: ReminderPrefs) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(p));
};

const RemindersPage = () => {
  const { toast } = useToast();
  const [prefs, setPrefs] = useState<ReminderPrefs>(getPrefs);

  const handleSave = () => {
    savePrefs(prefs);
    toast({ title: "Preferenze salvate" });
  };

  return (
    <div>
      <MobileHeader title="Promemoria" showBack />
      <main className="px-4 py-5 space-y-4">
        <Card className="border-2 border-accent">
          <CardContent className="py-5 space-y-5">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                <Bell className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-foreground">Notifiche scadenze</h3>
                <p className="text-xs text-muted-foreground">Scegli quando ricevere avvisi in-app</p>
              </div>
            </div>

            {/* Days before */}
            <div className="space-y-1.5">
              <Label className="text-sm">Avvisa prima della scadenza</Label>
              <Select
                value={String(prefs.daysBeforeExpiry)}
                onValueChange={(v) => setPrefs({ ...prefs, daysBeforeExpiry: parseInt(v) })}
              >
                <SelectTrigger className="border-accent/30">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[1, 2, 3, 5, 7].map((d) => (
                    <SelectItem key={d} value={String(d)}>
                      {d} {d === 1 ? "giorno" : "giorni"} prima
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Toggle expired */}
            <div className="flex items-center justify-between">
              <Label className="text-sm">Mostra prodotti scaduti</Label>
              <Switch
                checked={prefs.showExpired}
                onCheckedChange={(v) => setPrefs({ ...prefs, showExpired: v })}
              />
            </div>

            {/* Toggle expiring */}
            <div className="flex items-center justify-between">
              <Label className="text-sm">Mostra prodotti in scadenza</Label>
              <Switch
                checked={prefs.showExpiring}
                onCheckedChange={(v) => setPrefs({ ...prefs, showExpiring: v })}
              />
            </div>

            <Button className="w-full gap-2" onClick={handleSave}>
              <Save className="h-4 w-4" /> Salva preferenze
            </Button>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default RemindersPage;
