import { useState, useEffect } from "react";
import AdminLayout from "@/components/AdminLayout";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import {
  Loader2, Plus, Trash2, FileText, ClipboardCheck, Store, Edit, ChevronDown, ChevronUp,
} from "lucide-react";

interface TemplateTask {
  id: string;
  task_name: string;
  category: string;
  frequency_type: string;
  default_area_type: string | null;
  is_required: boolean;
  sort_order: number;
}

interface Template {
  id: string;
  name: string;
  business_type: string;
  description: string | null;
  is_active: boolean;
  created_at: string;
  tasks: TemplateTask[];
  restaurantCount?: number;
}

const BUSINESS_TYPES = [
  "ristorante_generico", "pizzeria", "bar_caffetteria", "pub_hamburgeria",
  "gastronomia", "pasticceria", "gelateria", "paninoteca",
  "ristorante_pesce", "ristorante_carne",
];

const CATEGORIES = [
  "temperature", "pulizie", "attrezzature", "celle_frigo", "frigoriferi",
  "freezer", "superfici", "prodotti_scadenza", "area_lavoro", "attrezzature_speciali",
];

const FREQUENCIES = ["giornaliera", "settimanale", "mensile", "personalizzata"];

const AdminHaccpTemplatesPage = () => {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);

  // New template dialog
  const [newDialog, setNewDialog] = useState(false);
  const [newName, setNewName] = useState("");
  const [newType, setNewType] = useState("ristorante_generico");
  const [newDesc, setNewDesc] = useState("");
  const [saving, setSaving] = useState(false);

  // Add task dialog
  const [addTaskDialog, setAddTaskDialog] = useState<string | null>(null);
  const [taskName, setTaskName] = useState("");
  const [taskCat, setTaskCat] = useState("pulizie");
  const [taskFreq, setTaskFreq] = useState("giornaliera");
  const [taskRequired, setTaskRequired] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    const [tplRes, tasksRes, restRes] = await Promise.all([
      supabase.from("haccp_templates").select("*").order("name"),
      supabase.from("haccp_template_tasks").select("*").order("sort_order"),
      supabase.from("restaurants").select("id, haccp_template_id"),
    ]);

    const tasksByTpl: Record<string, TemplateTask[]> = {};
    ((tasksRes.data ?? []) as any[]).forEach(t => {
      if (!tasksByTpl[t.template_id]) tasksByTpl[t.template_id] = [];
      tasksByTpl[t.template_id].push(t);
    });

    const restCount: Record<string, number> = {};
    ((restRes.data ?? []) as any[]).forEach(r => {
      if (r.haccp_template_id) restCount[r.haccp_template_id] = (restCount[r.haccp_template_id] || 0) + 1;
    });

    setTemplates(((tplRes.data ?? []) as any[]).map(t => ({
      ...t,
      tasks: tasksByTpl[t.id] || [],
      restaurantCount: restCount[t.id] || 0,
    })));
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const handleCreateTemplate = async () => {
    if (!newName.trim()) return;
    setSaving(true);
    const { error } = await supabase.from("haccp_templates").insert({
      name: newName.trim(),
      business_type: newType,
      description: newDesc.trim() || null,
    } as any);
    setSaving(false);
    if (error) { toast.error(error.message); } else {
      toast.success("Template creato");
      setNewDialog(false);
      setNewName(""); setNewDesc("");
      fetchData();
    }
  };

  const handleToggleActive = async (id: string, active: boolean) => {
    await supabase.from("haccp_templates").update({ is_active: active } as any).eq("id", id);
    setTemplates(t => t.map(x => x.id === id ? { ...x, is_active: active } : x));
  };

  const handleDeleteTemplate = async (id: string) => {
    if (!confirm("Eliminare questo template? Le attività associate verranno rimosse.")) return;
    await supabase.from("haccp_templates").delete().eq("id", id);
    toast.success("Template eliminato");
    fetchData();
  };

  const handleAddTask = async () => {
    if (!addTaskDialog || !taskName.trim()) return;
    setSaving(true);
    const tpl = templates.find(t => t.id === addTaskDialog);
    const { error } = await supabase.from("haccp_template_tasks").insert({
      template_id: addTaskDialog,
      task_name: taskName.trim(),
      category: taskCat,
      frequency_type: taskFreq,
      is_required: taskRequired,
      sort_order: (tpl?.tasks.length ?? 0),
    } as any);
    setSaving(false);
    if (error) { toast.error(error.message); } else {
      toast.success("Attività aggiunta al template");
      setAddTaskDialog(null);
      setTaskName("");
      fetchData();
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    await supabase.from("haccp_template_tasks").delete().eq("id", taskId);
    fetchData();
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <ClipboardCheck className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-bold text-foreground">Template HACCP</h1>
          </div>
          <Button onClick={() => setNewDialog(true)} className="gap-1.5">
            <Plus className="h-4 w-4" /> Nuovo template
          </Button>
        </div>

        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
        ) : templates.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              Nessun template creato
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {templates.map(tpl => (
              <Card key={tpl.id} className={`${!tpl.is_active ? "opacity-60" : ""}`}>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <Switch checked={tpl.is_active} onCheckedChange={v => handleToggleActive(tpl.id, v)} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-foreground">{tpl.name}</p>
                        <Badge variant="secondary" className="text-[10px]">{tpl.business_type.replace(/_/g, " ")}</Badge>
                        {(tpl.restaurantCount ?? 0) > 0 && (
                          <Badge variant="outline" className="text-[10px] gap-1">
                            <Store className="h-2.5 w-2.5" /> {tpl.restaurantCount} ristoranti
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">{tpl.description || "—"} · {tpl.tasks.length} attività</p>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => setExpanded(expanded === tpl.id ? null : tpl.id)}>
                      {expanded === tpl.id ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </Button>
                    <Button variant="ghost" size="sm" className="text-destructive" onClick={() => handleDeleteTemplate(tpl.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>

                  {expanded === tpl.id && (
                    <div className="mt-4 border-t pt-3">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-sm font-medium text-foreground">Attività del template</p>
                        <Button variant="outline" size="sm" onClick={() => { setAddTaskDialog(tpl.id); setTaskName(""); }}>
                          <Plus className="h-3 w-3 mr-1" /> Aggiungi
                        </Button>
                      </div>
                      {tpl.tasks.length === 0 ? (
                        <p className="text-sm text-muted-foreground py-4 text-center">Nessuna attività</p>
                      ) : (
                        <div className="rounded-lg border overflow-auto">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Attività</TableHead>
                                <TableHead>Categoria</TableHead>
                                <TableHead>Frequenza</TableHead>
                                <TableHead>Obblig.</TableHead>
                                <TableHead className="w-[60px]"></TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {tpl.tasks.map(task => (
                                <TableRow key={task.id}>
                                  <TableCell className="text-sm font-medium">{task.task_name}</TableCell>
                                  <TableCell className="text-xs text-muted-foreground capitalize">{task.category.replace(/_/g, " ")}</TableCell>
                                  <TableCell className="text-xs capitalize">{task.frequency_type}</TableCell>
                                  <TableCell>
                                    {task.is_required ? (
                                      <Badge className="text-[9px] bg-primary/10 text-primary border-0">Sì</Badge>
                                    ) : (
                                      <span className="text-xs text-muted-foreground">No</span>
                                    )}
                                  </TableCell>
                                  <TableCell>
                                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-destructive" onClick={() => handleDeleteTask(task.id)}>
                                      <Trash2 className="h-3 w-3" />
                                    </Button>
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* New template dialog */}
      <Dialog open={newDialog} onOpenChange={setNewDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>Nuovo template HACCP</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label>Nome</Label>
              <Input value={newName} onChange={e => setNewName(e.target.value)} placeholder="es. Ristorante generico" />
            </div>
            <div className="space-y-1.5">
              <Label>Tipologia attività</Label>
              <Select value={newType} onValueChange={setNewType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {BUSINESS_TYPES.map(bt => (
                    <SelectItem key={bt} value={bt}>{bt.replace(/_/g, " ")}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Descrizione</Label>
              <Input value={newDesc} onChange={e => setNewDesc(e.target.value)} placeholder="Descrizione opzionale" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNewDialog(false)}>Annulla</Button>
            <Button onClick={handleCreateTemplate} disabled={saving || !newName.trim()}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Crea
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add task to template dialog */}
      <Dialog open={!!addTaskDialog} onOpenChange={v => { if (!v) setAddTaskDialog(null); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Aggiungi attività al template</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label>Nome attività</Label>
              <Input value={taskName} onChange={e => setTaskName(e.target.value)} placeholder="es. Pulizia cappe" />
            </div>
            <div className="space-y-1.5">
              <Label>Categoria</Label>
              <Select value={taskCat} onValueChange={setTaskCat}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map(c => <SelectItem key={c} value={c}>{c.replace(/_/g, " ")}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Frequenza</Label>
              <Select value={taskFreq} onValueChange={setTaskFreq}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {FREQUENCIES.map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={taskRequired} onCheckedChange={setTaskRequired} />
              <Label className="text-sm">Obbligatoria</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddTaskDialog(null)}>Annulla</Button>
            <Button onClick={handleAddTask} disabled={saving || !taskName.trim()}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Aggiungi
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
};

export default AdminHaccpTemplatesPage;
