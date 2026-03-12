import { useState, useEffect } from "react";
import { useRestaurant } from "@/hooks/useRestaurant";
import { supabase } from "@/integrations/supabase/client";
import MobileHeader from "@/components/MobileHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Plus, Trash2, Thermometer, Save } from "lucide-react";

interface HaccpTask {
  id: string;
  name: string;
  category: string;
  frequency: string;
  custom_interval_days: number | null;
  is_active: boolean;
  sort_order: number;
}

interface Equipment {
  equipment_type: string;
  count: number;
}

const CATEGORIES = [
  { value: "pulizia", label: "Pulizia" },
  { value: "controllo_temperatura", label: "Controllo temperatura" },
  { value: "verifica_attrezzature", label: "Verifica attrezzature" },
  { value: "altro", label: "Altro" },
];

const FREQUENCIES = [
  { value: "giornaliera", label: "Giornaliera" },
  { value: "settimanale", label: "Settimanale" },
  { value: "mensile", label: "Mensile" },
  { value: "personalizzata", label: "Personalizzata" },
];

const EQUIPMENT_TYPES = [
  { value: "cella_frigorifera", label: "Celle frigorifere" },
  { value: "frigorifero", label: "Frigoriferi" },
  { value: "freezer", label: "Freezer" },
];

const DEFAULT_TASKS = [
  { name: "Pulizia cappe", category: "pulizia", frequency: "settimanale" },
  { name: "Pulizia forni", category: "pulizia", frequency: "settimanale" },
  { name: "Pulizie generali", category: "pulizia", frequency: "giornaliera" },
  { name: "Verifica temperature", category: "controllo_temperatura", frequency: "giornaliera" },
];

const RestaurantHaccpSetupPage = () => {
  const { restaurant } = useRestaurant();
  const { toast } = useToast();
  const [tasks, setTasks] = useState<HaccpTask[]>([]);
  const [equipment, setEquipment] = useState<Equipment[]>([
    { equipment_type: "cella_frigorifera", count: 0 },
    { equipment_type: "frigorifero", count: 0 },
    { equipment_type: "freezer", count: 0 },
  ]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newCat, setNewCat] = useState("pulizia");
  const [newFreq, setNewFreq] = useState("giornaliera");

  useEffect(() => {
    if (!restaurant) return;
    const fetch = async () => {
      const [tasksRes, eqRes] = await Promise.all([
        supabase.from("haccp_tasks").select("*").eq("restaurant_id", restaurant.id).order("sort_order"),
        supabase.from("haccp_equipment").select("*").eq("restaurant_id", restaurant.id),
      ]);
      if (tasksRes.data) setTasks(tasksRes.data as HaccpTask[]);
      if (eqRes.data) {
        const eqMap: Record<string, number> = {};
        (eqRes.data as any[]).forEach(e => { eqMap[e.equipment_type] = e.count; });
        setEquipment(EQUIPMENT_TYPES.map(t => ({
          equipment_type: t.value,
          count: eqMap[t.value] ?? 0,
        })));
      }
      setLoading(false);
    };
    fetch();
  }, [restaurant]);

  const handleInitDefaults = async () => {
    if (!restaurant) return;
    setSaving(true);
    const inserts = DEFAULT_TASKS.map((t, i) => ({
      ...t,
      restaurant_id: restaurant.id,
      sort_order: i,
    }));
    const { error } = await supabase.from("haccp_tasks").insert(inserts as any);
    setSaving(false);
    if (error) {
      toast({ variant: "destructive", title: "Errore", description: error.message });
    } else {
      toast({ title: "Attività predefinite create" });
      // refetch
      const { data } = await supabase.from("haccp_tasks").select("*").eq("restaurant_id", restaurant.id).order("sort_order");
      if (data) setTasks(data as HaccpTask[]);
    }
  };

  const handleAddTask = async () => {
    if (!restaurant || !newName.trim()) return;
    setSaving(true);
    const { error } = await supabase.from("haccp_tasks").insert({
      name: newName.trim(),
      category: newCat,
      frequency: newFreq,
      restaurant_id: restaurant.id,
      sort_order: tasks.length,
    } as any);
    setSaving(false);
    if (error) {
      toast({ variant: "destructive", title: "Errore", description: error.message });
    } else {
      toast({ title: "Attività aggiunta" });
      setAddOpen(false);
      setNewName("");
      const { data } = await supabase.from("haccp_tasks").select("*").eq("restaurant_id", restaurant.id).order("sort_order");
      if (data) setTasks(data as HaccpTask[]);
    }
  };

  const handleDeleteTask = async (id: string) => {
    const { error } = await supabase.from("haccp_tasks").delete().eq("id", id);
    if (error) {
      toast({ variant: "destructive", title: "Errore", description: error.message });
    } else {
      setTasks(t => t.filter(x => x.id !== id));
    }
  };

  const handleToggleTask = async (id: string, active: boolean) => {
    await supabase.from("haccp_tasks").update({ is_active: active } as any).eq("id", id);
    setTasks(t => t.map(x => x.id === id ? { ...x, is_active: active } : x));
  };

  const handleSaveEquipment = async () => {
    if (!restaurant) return;
    setSaving(true);

    for (const eq of equipment) {
      await supabase.from("haccp_equipment").upsert({
        restaurant_id: restaurant.id,
        equipment_type: eq.equipment_type,
        count: eq.count,
      } as any, { onConflict: "restaurant_id,equipment_type" });
    }

    // Auto-generate temperature check tasks for each unit
    for (const eq of equipment) {
      if (eq.count === 0) continue;
      const typeLabel = EQUIPMENT_TYPES.find(t => t.value === eq.equipment_type)?.label?.replace(/i$/, "o").replace(/e$/, "a") ?? eq.equipment_type;
      for (let i = 1; i <= eq.count; i++) {
        const taskName = `Controllo ${typeLabel} ${i}`;
        const existing = tasks.find(t => t.name === taskName);
        if (!existing) {
          await supabase.from("haccp_tasks").insert({
            name: taskName,
            category: "controllo_temperatura",
            frequency: "giornaliera",
            restaurant_id: restaurant.id,
            sort_order: tasks.length + i,
          } as any);
        }
      }
    }

    setSaving(false);
    toast({ title: "Configurazione salvata" });
    // refetch
    const { data } = await supabase.from("haccp_tasks").select("*").eq("restaurant_id", restaurant.id).order("sort_order");
    if (data) setTasks(data as HaccpTask[]);
  };

  if (loading) {
    return (
      <div className="p-4">
        <MobileHeader title="Configura HACCP" />
        <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
      </div>
    );
  }

  return (
    <div className="space-y-4 p-4">
      <MobileHeader title="Configura HACCP" />

      {/* Equipment config */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Thermometer className="h-4 w-4 text-primary" />
            Attrezzature da controllare
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {equipment.map((eq, idx) => {
            const label = EQUIPMENT_TYPES.find(t => t.value === eq.equipment_type)?.label ?? eq.equipment_type;
            return (
              <div key={eq.equipment_type} className="flex items-center justify-between">
                <Label className="text-sm">{label}</Label>
                <Input
                  type="number"
                  min={0}
                  max={20}
                  className="w-20 text-center"
                  value={eq.count}
                  onChange={e => {
                    const val = parseInt(e.target.value) || 0;
                    setEquipment(prev => prev.map((x, i) => i === idx ? { ...x, count: val } : x));
                  }}
                />
              </div>
            );
          })}
          <Button onClick={handleSaveEquipment} disabled={saving} className="w-full mt-2">
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            Salva e genera controlli
          </Button>
        </CardContent>
      </Card>

      <Separator />

      {/* Tasks list */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-foreground">Attività HACCP</h2>
        <div className="flex gap-2">
          {tasks.length === 0 && (
            <Button variant="outline" size="sm" onClick={handleInitDefaults} disabled={saving}>
              Usa predefinite
            </Button>
          )}
          <Button size="sm" onClick={() => setAddOpen(true)}>
            <Plus className="mr-1 h-4 w-4" /> Aggiungi
          </Button>
        </div>
      </div>

      <div className="space-y-2">
        {tasks.map(task => (
          <Card key={task.id} className={`${!task.is_active ? "opacity-50" : ""}`}>
            <CardContent className="flex items-center gap-3 p-3">
              <Switch
                checked={task.is_active}
                onCheckedChange={(v) => handleToggleTask(task.id, v)}
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{task.name}</p>
                <p className="text-xs text-muted-foreground capitalize">{task.frequency} · {task.category.replace(/_/g, " ")}</p>
              </div>
              <Button variant="ghost" size="icon" className="text-destructive" onClick={() => handleDeleteTask(task.id)}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Add task dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Nuova attività HACCP</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label>Nome attività</Label>
              <Input value={newName} onChange={e => setNewName(e.target.value)} placeholder="es. Pulizia cappe" />
            </div>
            <div className="space-y-1.5">
              <Label>Categoria</Label>
              <Select value={newCat} onValueChange={setNewCat}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Frequenza</Label>
              <Select value={newFreq} onValueChange={setNewFreq}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {FREQUENCIES.map(f => <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>Annulla</Button>
            <Button onClick={handleAddTask} disabled={saving || !newName.trim()}>
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
              Aggiungi
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default RestaurantHaccpSetupPage;
