import { useState, useEffect, useMemo } from "react";
import { useRestaurant } from "@/hooks/useRestaurant";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import MobileHeader from "@/components/MobileHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import {
  Loader2, CheckCircle2, Circle, AlertTriangle, ChevronLeft, ChevronRight,
  Settings2, Camera, Thermometer, X, Image,
} from "lucide-react";
import { format, startOfWeek, addDays, isSameDay } from "date-fns";
import { it } from "date-fns/locale";
import { Link } from "react-router-dom";

interface HaccpTask {
  id: string;
  name: string;
  category: string;
  frequency: string;
  custom_interval_days: number | null;
  is_active: boolean;
  sort_order: number;
}

interface HaccpLog {
  id: string;
  task_id: string;
  log_date: string;
  status: string;
  notes: string | null;
  completed_by: string;
  completed_at: string;
}

const DAY_NAMES = ["Lun", "Mar", "Mer", "Gio", "Ven", "Sab", "Dom"];

const TEMP_CATEGORIES = ["celle_frigo", "frigoriferi", "freezer", "temperature", "controllo_temperatura"];

const TEMP_THRESHOLDS: Record<string, { max: number; label: string; eqType: string }> = {
  celle_frigo: { max: 4, label: "Cella frigorifera", eqType: "cold_room" },
  frigoriferi: { max: 4, label: "Frigorifero", eqType: "fridge" },
  freezer: { max: -18, label: "Freezer", eqType: "freezer" },
  temperature: { max: 4, label: "Controllo temperatura", eqType: "fridge" },
  controllo_temperatura: { max: 4, label: "Controllo temperatura", eqType: "fridge" },
};

const shouldShowOnDay = (task: HaccpTask, dayIndex: number, date?: Date): boolean => {
  if (task.frequency === "giornaliera") return true;
  if (task.frequency === "settimanale") return dayIndex === 0; // Monday
  if (task.frequency === "mensile") return date ? date.getDate() === 1 : dayIndex === 0;
  return true;
};

const isTemperatureTask = (category: string): boolean => TEMP_CATEGORIES.includes(category);

const RestaurantHaccpPage = () => {
  const { restaurant } = useRestaurant();
  const { user } = useAuth();
  const { toast } = useToast();
  const [tasks, setTasks] = useState<HaccpTask[]>([]);
  const [logs, setLogs] = useState<HaccpLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [weekOffset, setWeekOffset] = useState(0);
  const [completeDialog, setCompleteDialog] = useState<{ task: HaccpTask; date: Date } | null>(null);
  const [notes, setNotes] = useState("");
  const [temperature, setTemperature] = useState("");
  const [photos, setPhotos] = useState<File[]>([]);
  const [saving, setSaving] = useState(false);

  const weekStart = useMemo(() => {
    const base = startOfWeek(new Date(), { weekStartsOn: 1 });
    return addDays(base, weekOffset * 7);
  }, [weekOffset]);

  const weekDays = useMemo(() =>
    Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)),
    [weekStart]
  );

  const fetchData = async () => {
    if (!restaurant) return;
    setLoading(true);
    const dateFrom = format(weekDays[0], "yyyy-MM-dd");
    const dateTo = format(weekDays[6], "yyyy-MM-dd");

    const [tasksRes, logsRes] = await Promise.all([
      supabase.from("haccp_tasks").select("*").eq("restaurant_id", restaurant.id).eq("is_active", true).order("sort_order"),
      supabase.from("haccp_logs").select("*").eq("restaurant_id", restaurant.id).gte("log_date", dateFrom).lte("log_date", dateTo),
    ]);

    if (tasksRes.data) setTasks(tasksRes.data as HaccpTask[]);
    if (logsRes.data) setLogs(logsRes.data as HaccpLog[]);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [restaurant, weekOffset]);

  const getLogForCell = (taskId: string, date: Date): HaccpLog | undefined => {
    const dateStr = format(date, "yyyy-MM-dd");
    return logs.find(l => l.task_id === taskId && l.log_date === dateStr);
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setPhotos(prev => [...prev, ...Array.from(e.target.files!)]);
    }
  };

  const removePhoto = (idx: number) => {
    setPhotos(prev => prev.filter((_, i) => i !== idx));
  };

  const handleComplete = async () => {
    if (!completeDialog || !restaurant || !user) return;

    const taskCategory = completeDialog.task.category;
    const needsTemp = isTemperatureTask(taskCategory);

    if (needsTemp && !temperature.trim()) {
      toast({ variant: "destructive", title: "Temperatura obbligatoria", description: "Inserisci la temperatura rilevata." });
      return;
    }

    setSaving(true);
    const dateStr = format(completeDialog.date, "yyyy-MM-dd");

    const { data: profile } = await supabase.from("profiles").select("full_name, email").eq("id", user.id).maybeSingle();
    const operatorName = profile?.full_name || profile?.email || "—";

    // Insert log
    const { data: logData, error } = await supabase.from("haccp_logs").insert({
      task_id: completeDialog.task.id,
      restaurant_id: restaurant.id,
      completed_by: user.id,
      log_date: dateStr,
      status: "completata",
      notes: notes || null,
      task_name: completeDialog.task.name,
      area: completeDialog.task.category,
      frequency: completeDialog.task.frequency,
      completed_by_name: operatorName,
    } as any).select("id").single();

    if (error || !logData) {
      toast({ variant: "destructive", title: "Errore", description: error?.message || "Errore salvataggio" });
      setSaving(false);
      return;
    }

    const logId = logData.id;

    // Save temperature if applicable
    if (needsTemp && temperature.trim()) {
      const thresholdCfg = TEMP_THRESHOLDS[taskCategory] || TEMP_THRESHOLDS.temperature;
      await supabase.from("haccp_temperature_logs" as any).insert({
        restaurant_id: restaurant.id,
        task_log_id: logId,
        equipment_type: thresholdCfg.eqType,
        equipment_name: completeDialog.task.name,
        temperature_value: parseFloat(temperature),
        recorded_by_user_id: user.id,
        recorded_by_name: operatorName,
        note: notes || null,
      });

      // Check threshold
      const tempVal = parseFloat(temperature);
      if (taskCategory === "freezer" && tempVal > thresholdCfg.max) {
        toast({ variant: "destructive", title: "⚠️ Temperatura anomala!", description: `${completeDialog.task.name}: ${tempVal}°C (soglia: ${thresholdCfg.max}°C)` });
      } else if (taskCategory !== "freezer" && tempVal > thresholdCfg.max) {
        toast({ variant: "destructive", title: "⚠️ Temperatura anomala!", description: `${completeDialog.task.name}: ${tempVal}°C (soglia: ${thresholdCfg.max}°C)` });
      }
    }

    // Upload photos
    if (photos.length > 0) {
      for (const photo of photos) {
        const ext = photo.name.split(".").pop() || "jpg";
        const path = `haccp/${restaurant.id}/${logId}/${Date.now()}.${ext}`;
        const { data: uploadData } = await supabase.storage.from("media").upload(path, photo);
        if (uploadData) {
          const { data: urlData } = supabase.storage.from("media").getPublicUrl(uploadData.path);
          await supabase.from("haccp_task_photos" as any).insert({
            restaurant_id: restaurant.id,
            task_log_id: logId,
            photo_url: urlData.publicUrl,
            uploaded_by_user_id: user.id,
            uploaded_by_name: operatorName,
          });
        }
      }
    }

    setSaving(false);
    toast({ title: "Controllo registrato ✓" });
    setCompleteDialog(null);
    setNotes("");
    setTemperature("");
    setPhotos([]);
    fetchData();
  };

  const today = new Date();
  const isCurrentWeek = weekOffset === 0;

  const getCellIcon = (task: HaccpTask, date: Date) => {
    if (!shouldShowOnDay(task, (date.getDay() + 6) % 7, date)) return null;
    const log = getLogForCell(task.id, date);
    if (log) return <CheckCircle2 className="h-5 w-5 text-emerald-500" />;
    const isPast = date < today && !isSameDay(date, today);
    if (isPast) return <AlertTriangle className="h-5 w-5 text-amber-500" />;
    return <Circle className="h-5 w-5 text-muted-foreground/40" />;
  };

  const needsTemp = completeDialog ? isTemperatureTask(completeDialog.task.category) : false;

  return (
    <div className="space-y-4 p-4">
      <MobileHeader title="HACCP" />

      {/* Week navigation */}
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="icon" onClick={() => setWeekOffset(w => w - 1)}>
          <ChevronLeft className="h-5 w-5" />
        </Button>
        <div className="text-center">
          <p className="text-sm font-semibold text-foreground">
            {format(weekDays[0], "d MMM", { locale: it })} — {format(weekDays[6], "d MMM yyyy", { locale: it })}
          </p>
          {isCurrentWeek && <Badge variant="secondary" className="text-xs mt-1">Settimana corrente</Badge>}
        </div>
        <Button variant="ghost" size="icon" onClick={() => setWeekOffset(w => w + 1)}>
          <ChevronRight className="h-5 w-5" />
        </Button>
      </div>

      {/* Config link */}
      <div className="flex justify-end gap-2">
        <Link to="/restaurant/haccp/setup">
          <Button variant="outline" size="sm" className="gap-1.5">
            <Settings2 className="h-4 w-4" /> Configura
          </Button>
        </Link>
        <Link to="/restaurant/haccp/history">
          <Button variant="outline" size="sm">Storico</Button>
        </Link>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
      ) : tasks.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground mb-3">Nessuna attività HACCP configurata</p>
            <Link to="/restaurant/haccp/setup">
              <Button>Configura attività</Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="overflow-x-auto -mx-4 px-4">
          <table className="w-full min-w-[600px] border-collapse">
            <thead>
              <tr>
                <th className="text-left text-xs font-semibold text-muted-foreground p-2 w-36">Attività</th>
                {weekDays.map((d, i) => {
                  const isToday = isSameDay(d, today);
                  return (
                    <th key={i} className={`text-center text-xs font-medium p-2 ${isToday ? "text-primary font-bold" : "text-muted-foreground"}`}>
                      <div>{DAY_NAMES[i]}</div>
                      <div className={`text-[11px] ${isToday ? "text-primary" : ""}`}>{format(d, "d")}</div>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {tasks.map(task => (
                <tr key={task.id} className="border-t border-border/50">
                  <td className="p-2">
                    <div className="flex items-center gap-1">
                      {isTemperatureTask(task.category) && <Thermometer className="h-3 w-3 text-sky-500 shrink-0" />}
                      <p className="text-sm font-medium text-foreground leading-tight">{task.name}</p>
                    </div>
                    <p className="text-[10px] text-muted-foreground capitalize">{task.frequency}</p>
                  </td>
                  {weekDays.map((d, i) => {
                    const dayIdx = (d.getDay() + 6) % 7;
                    const show = shouldShowOnDay(task, dayIdx, d);
                    const log = getLogForCell(task.id, d);
                    const canComplete = show && !log && (isSameDay(d, today) || d < today);

                    return (
                      <td key={i} className="p-1 text-center">
                        {show ? (
                          <button
                            className={`inline-flex items-center justify-center rounded-lg p-1.5 transition-colors ${
                              canComplete ? "hover:bg-primary/10 active:bg-primary/20 cursor-pointer" : ""
                            } ${log ? "bg-emerald-500/10" : ""}`}
                            disabled={!canComplete}
                            onClick={() => canComplete && setCompleteDialog({ task, date: d })}
                          >
                            {getCellIcon(task, d)}
                          </button>
                        ) : (
                          <span className="text-muted-foreground/20">—</span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Legend */}
      <div className="flex flex-wrap gap-4 text-xs text-muted-foreground pt-2">
        <span className="flex items-center gap-1"><CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" /> Completata</span>
        <span className="flex items-center gap-1"><Circle className="h-3.5 w-3.5 text-muted-foreground/40" /> Da fare</span>
        <span className="flex items-center gap-1"><AlertTriangle className="h-3.5 w-3.5 text-amber-500" /> In ritardo</span>
        <span className="flex items-center gap-1"><Thermometer className="h-3.5 w-3.5 text-sky-500" /> Temperatura</span>
      </div>

      {/* Complete dialog */}
      <Dialog open={!!completeDialog} onOpenChange={(o) => { if (!o) { setCompleteDialog(null); setPhotos([]); setTemperature(""); setNotes(""); } }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Registra controllo</DialogTitle>
          </DialogHeader>
          {completeDialog && (
            <div className="space-y-4 py-2">
              <p className="text-sm">
                <span className="font-medium">{completeDialog.task.name}</span>
                <br />
                <span className="text-muted-foreground">{format(completeDialog.date, "EEEE d MMMM yyyy", { locale: it })}</span>
              </p>

              {/* Temperature input for temp tasks */}
              {needsTemp && (
                <div className="space-y-2">
                  <Label className="flex items-center gap-1.5">
                    <Thermometer className="h-4 w-4 text-sky-500" />
                    Temperatura rilevata (°C) *
                  </Label>
                  <Input
                    type="number"
                    step="0.1"
                    placeholder="es. 3.5"
                    value={temperature}
                    onChange={e => setTemperature(e.target.value)}
                    className="text-lg font-bold"
                  />
                  {temperature && (() => {
                    const thresholdCfg = TEMP_THRESHOLDS[completeDialog.task.category];
                    if (!thresholdCfg) return null;
                    const val = parseFloat(temperature);
                    const isAnomaly = completeDialog.task.category === "freezer"
                      ? val > thresholdCfg.max
                      : val > thresholdCfg.max;
                    if (isAnomaly) {
                      return (
                        <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 rounded-lg px-3 py-2">
                          <AlertTriangle className="h-4 w-4 shrink-0" />
                          Temperatura sopra la soglia ({thresholdCfg.max}°C)
                        </div>
                      );
                    }
                    return (
                      <div className="flex items-center gap-2 text-sm text-emerald-700 bg-emerald-500/10 rounded-lg px-3 py-2">
                        <CheckCircle2 className="h-4 w-4 shrink-0" />
                        Temperatura nella norma
                      </div>
                    );
                  })()}
                </div>
              )}

              {/* Notes */}
              <div className="space-y-1.5">
                <Label>Note</Label>
                <Textarea
                  placeholder="Note opzionali..."
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  rows={2}
                />
              </div>

              {/* Photo upload */}
              <div className="space-y-2">
                <Label className="flex items-center gap-1.5">
                  <Camera className="h-4 w-4 text-muted-foreground" />
                  Foto prova (facoltativa)
                </Label>
                <div className="flex flex-wrap gap-2">
                  {photos.map((p, i) => (
                    <div key={i} className="relative h-16 w-16 rounded-lg overflow-hidden border border-border">
                      <img src={URL.createObjectURL(p)} alt="" className="h-full w-full object-cover" />
                      <button
                        onClick={() => removePhoto(i)}
                        className="absolute top-0 right-0 bg-background/80 rounded-bl-lg p-0.5"
                      >
                        <X className="h-3 w-3 text-foreground" />
                      </button>
                    </div>
                  ))}
                  <label className="flex h-16 w-16 items-center justify-center rounded-lg border-2 border-dashed border-border cursor-pointer hover:border-primary/50 transition-colors">
                    <Camera className="h-5 w-5 text-muted-foreground" />
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      className="hidden"
                      onChange={handlePhotoChange}
                    />
                  </label>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => { setCompleteDialog(null); setPhotos([]); setTemperature(""); setNotes(""); }}>Annulla</Button>
            <Button onClick={handleComplete} disabled={saving}>
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-2 h-4 w-4" />}
              Completato
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default RestaurantHaccpPage;
