import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import MobileHeader from "@/components/MobileHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Trash2, Plus, Upload, Copy, FileText, Pencil } from "lucide-react";

const MEAL_LABELS: Record<string, string> = {
  colazione: "☀️ Colazione",
  pranzo: "🌤️ Pranzo",
  cena: "🌙 Cena",
  spuntino: "🍎 Spuntino",
};

const SYSTEM_PRO_ID = "00000000-0000-0000-0000-000000000000";

const ProTemplatesPage = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [templates, setTemplates] = useState<any[]>([]);
  const [systemTemplates, setSystemTemplates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Create template dialog
  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState({ title: "", kcal: "2000", protein: "120", carbs: "220", fats: "70", notes: "" });
  const [savingCreate, setSavingCreate] = useState(false);

  // Import dialog
  const [importOpen, setImportOpen] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importPreview, setImportPreview] = useState<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Duplicating
  const [duplicating, setDuplicating] = useState<string | null>(null);

  const load = async () => {
    if (!user) return;
    setLoading(true);
    const [own, system] = await Promise.all([
      supabase
        .from("diet_plan_templates")
        .select("*, diet_plan_template_meals(*)")
        .eq("professional_id", user.id)
        .order("created_at", { ascending: false }),
      supabase
        .from("diet_plan_templates")
        .select("*, diet_plan_template_meals(*)")
        .eq("professional_id", SYSTEM_PRO_ID)
        .order("title"),
    ]);
    setTemplates(own.data ?? []);
    setSystemTemplates(system.data ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, [user]);

  const handleDelete = async () => {
    if (!deleteId) return;
    setDeleting(true);
    await supabase.from("diet_plan_template_meals").delete().eq("template_id", deleteId);
    const { error } = await supabase.from("diet_plan_templates").delete().eq("id", deleteId);
    setDeleting(false);
    if (error) {
      toast({ variant: "destructive", title: "Errore", description: error.message });
    } else {
      toast({ title: "Template eliminato" });
      setDeleteId(null);
      await load();
    }
  };

  const handleCreate = async () => {
    if (!user) return;
    setSavingCreate(true);
    const { error } = await supabase.from("diet_plan_templates").insert({
      professional_id: user.id,
      title: createForm.title || "Nuovo template",
      kcal_day: parseFloat(createForm.kcal) || 2000,
      protein_g_day: parseFloat(createForm.protein) || 120,
      carbs_g_day: parseFloat(createForm.carbs) || 220,
      fats_g_day: parseFloat(createForm.fats) || 70,
      notes: createForm.notes || null,
    });
    setSavingCreate(false);
    if (error) {
      toast({ variant: "destructive", title: "Errore", description: error.message });
    } else {
      toast({ title: "Template creato! 📋" });
      setCreateOpen(false);
      setCreateForm({ title: "", kcal: "2000", protein: "120", carbs: "220", fats: "70", notes: "" });
      await load();
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.name.endsWith(".csv")) {
      // Client-side CSV parsing
      const text = await file.text();
      const lines = text.split("\n").filter(l => l.trim());
      if (lines.length < 2) {
        toast({ variant: "destructive", title: "CSV vuoto o non valido" });
        return;
      }
      // Expected columns: pasto, alimento, quantita, kcal, proteine, carbo, grassi
      const meals: Record<string, { kcal: number; protein: number; carbs: number; fats: number }> = {};
      let totalKcal = 0, totalP = 0, totalC = 0, totalF = 0;

      for (let i = 1; i < lines.length; i++) {
        const cols = lines[i].split(/[;,]/).map(c => c.trim());
        if (cols.length < 4) continue;
        const mealType = cols[0].toLowerCase();
        const kcal = parseFloat(cols[3]) || 0;
        const prot = parseFloat(cols[4]) || 0;
        const carbs = parseFloat(cols[5]) || 0;
        const fats = parseFloat(cols[6]) || 0;
        totalKcal += kcal;
        totalP += prot;
        totalC += carbs;
        totalF += fats;
        if (!meals[mealType]) meals[mealType] = { kcal: 0, protein: 0, carbs: 0, fats: 0 };
        meals[mealType].kcal += kcal;
        meals[mealType].protein += prot;
        meals[mealType].carbs += carbs;
        meals[mealType].fats += fats;
      }

      setImportPreview({
        title: file.name.replace(/\.csv$/i, ""),
        kcal_day: Math.round(totalKcal),
        protein_g_day: Math.round(totalP),
        carbs_g_day: Math.round(totalC),
        fats_g_day: Math.round(totalF),
        meals: Object.entries(meals).map(([mt, v]) => ({
          meal_type: mt,
          kcal_target: Math.round(v.kcal),
          protein_g: Math.round(v.protein),
          carbs_g: Math.round(v.carbs),
          fats_g: Math.round(v.fats),
        })),
      });
      setImportOpen(true);
    } else {
      // PDF → send to edge function
      setImporting(true);
      setImportOpen(true);
      try {
        const formData = new FormData();
        formData.append("file", file);
        const res = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/extract-diet-template`,
          {
            method: "POST",
            headers: { Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}` },
            body: formData,
          }
        );
        if (!res.ok) {
          const err = await res.json().catch(() => ({ error: "Errore sconosciuto" }));
          throw new Error(err.error || `HTTP ${res.status}`);
        }
        const data = await res.json();
        setImportPreview(data);
      } catch (err: any) {
        toast({ variant: "destructive", title: "Errore importazione", description: err.message });
        setImportOpen(false);
      } finally {
        setImporting(false);
      }
    }
    // Reset input
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const confirmImport = async () => {
    if (!user || !importPreview) return;
    setSavingCreate(true);
    try {
      const { data: tmpl, error } = await supabase.from("diet_plan_templates").insert({
        professional_id: user.id,
        title: importPreview.title || "Template importato",
        kcal_day: importPreview.kcal_day || 2000,
        protein_g_day: importPreview.protein_g_day || 100,
        carbs_g_day: importPreview.carbs_g_day || 220,
        fats_g_day: importPreview.fats_g_day || 70,
        sugars_g_day: importPreview.sugars_g_day || null,
        fiber_g_day: importPreview.fiber_g_day || null,
        saturated_fats_g_day: importPreview.saturated_fats_g_day || null,
        unsaturated_fats_g_day: importPreview.unsaturated_fats_g_day || null,
        notes: importPreview.notes || null,
        weekly_data: importPreview.weekly_data || null,
      }).select().single();
      if (error) throw error;

      if (importPreview.meals?.length > 0) {
        await supabase.from("diet_plan_template_meals").insert(
          importPreview.meals.map((m: any) => ({
            template_id: tmpl.id,
            meal_type: m.meal_type,
            kcal_target: m.kcal_target || 0,
            protein_g: m.protein_g || 0,
            carbs_g: m.carbs_g || 0,
            fats_g: m.fats_g || 0,
          }))
        );
      }

      toast({ title: "Template importato! 📋" });
      setImportOpen(false);
      setImportPreview(null);
      // Navigate to editor for further refinement
      navigate(`/pro/template/${tmpl.id}`);
    } catch (err: any) {
      toast({ variant: "destructive", title: "Errore", description: err.message });
    }
    setSavingCreate(false);
  };

  const duplicateTemplate = async (tmpl: any) => {
    if (!user) return;
    setDuplicating(tmpl.id);
    try {
      const { data: newTmpl, error } = await supabase.from("diet_plan_templates").insert({
        professional_id: user.id,
        title: `${tmpl.title} (copia)`,
        kcal_day: tmpl.kcal_day,
        protein_g_day: tmpl.protein_g_day,
        carbs_g_day: tmpl.carbs_g_day,
        fats_g_day: tmpl.fats_g_day,
        notes: tmpl.notes,
      }).select().single();
      if (error) throw error;

      if (tmpl.diet_plan_template_meals?.length > 0) {
        await supabase.from("diet_plan_template_meals").insert(
          tmpl.diet_plan_template_meals.map((m: any) => ({
            template_id: newTmpl.id,
            meal_type: m.meal_type,
            kcal_target: m.kcal_target,
            protein_g: m.protein_g,
            carbs_g: m.carbs_g,
            fats_g: m.fats_g,
          }))
        );
      }

      toast({ title: "Template duplicato! 📋" });
      await load();
    } catch (err: any) {
      toast({ variant: "destructive", title: "Errore", description: err.message });
    }
    setDuplicating(null);
  };

  const TemplateCard = ({ tmpl, isSystem = false }: { tmpl: any; isSystem?: boolean }) => (
    <Card className="border border-border">
      <CardContent className="py-4 space-y-3">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm font-semibold text-foreground">{tmpl.title}</p>
            <p className="text-xs text-muted-foreground">
              {isSystem ? (
                <Badge variant="secondary" className="text-[9px]">Di base</Badge>
              ) : (
                new Date(tmpl.created_at).toLocaleDateString("it-IT", { day: "numeric", month: "long", year: "numeric" })
              )}
            </p>
          </div>
          <div className="flex gap-1">
            {isSystem ? (
              <Button
                size="sm"
                variant="outline"
                className="h-7 text-[10px] gap-1"
                onClick={() => duplicateTemplate(tmpl)}
                disabled={duplicating === tmpl.id}
              >
                {duplicating === tmpl.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Copy className="h-3 w-3" />}
                Duplica
              </Button>
            ) : (
              <>
                <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => navigate(`/pro/template/${tmpl.id}`)}>
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={() => setDeleteId(tmpl.id)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </>
            )}
          </div>
        </div>

        <div className="grid grid-cols-4 gap-2 text-center">
          <div className="rounded-lg bg-primary/10 p-1.5">
            <p className="text-sm font-bold text-primary">{tmpl.kcal_day}</p>
            <p className="text-[9px] text-muted-foreground">kcal</p>
          </div>
          <div className="rounded-lg bg-blue-500/10 p-1.5">
            <p className="text-sm font-bold text-blue-600">{tmpl.protein_g_day}g</p>
            <p className="text-[9px] text-muted-foreground">prot</p>
          </div>
          <div className="rounded-lg bg-amber-500/10 p-1.5">
            <p className="text-sm font-bold text-amber-600">{tmpl.carbs_g_day}g</p>
            <p className="text-[9px] text-muted-foreground">carbo</p>
          </div>
          <div className="rounded-lg bg-red-500/10 p-1.5">
            <p className="text-sm font-bold text-red-600">{tmpl.fats_g_day}g</p>
            <p className="text-[9px] text-muted-foreground">grassi</p>
          </div>
        </div>

        {tmpl.diet_plan_template_meals?.length > 0 && (
          <div className="space-y-1">
            {tmpl.diet_plan_template_meals.map((mt: any) => (
              <div key={mt.meal_type} className="flex items-center justify-between text-xs bg-secondary/50 rounded-lg px-3 py-1.5">
                <span className="font-medium">{MEAL_LABELS[mt.meal_type] || mt.meal_type}</span>
                <span className="text-muted-foreground">{mt.kcal_target} kcal · P{mt.protein_g} C{mt.carbs_g} G{mt.fats_g}</span>
              </div>
            ))}
          </div>
        )}

        {tmpl.notes && (
          <p className="text-xs text-muted-foreground bg-muted rounded-lg p-2">{tmpl.notes}</p>
        )}
      </CardContent>
    </Card>
  );

  if (loading) {
    return (
      <div>
        <MobileHeader title="I miei template" />
        <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
      </div>
    );
  }

  return (
    <div>
      <MobileHeader title="I miei template" />
      <main className="px-4 py-5 pb-28 space-y-4">
        {/* Action buttons */}
        <div className="flex gap-2">
          <Button onClick={() => navigate("/pro/template/new")} className="flex-1 gap-2" size="sm">
            <Plus className="h-4 w-4" /> Crea template
          </Button>
          <Button variant="outline" onClick={() => fileInputRef.current?.click()} className="flex-1 gap-2" size="sm">
            <Upload className="h-4 w-4" /> Importa PDF/CSV
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.csv"
            className="hidden"
            onChange={handleFileUpload}
          />
        </div>

        {/* My templates */}
        {templates.length === 0 && systemTemplates.length === 0 ? (
          <div className="text-center py-12 space-y-2">
            <p className="text-4xl">📋</p>
            <p className="text-sm text-muted-foreground">Nessun template salvato.</p>
            <p className="text-xs text-muted-foreground">Crea un template o importa un piano alimentare da PDF/CSV.</p>
          </div>
        ) : (
          <>
            {templates.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-sm font-bold text-foreground">I tuoi template</h3>
                {templates.map((tmpl) => <TemplateCard key={tmpl.id} tmpl={tmpl} />)}
              </div>
            )}

            {systemTemplates.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-sm font-bold text-foreground flex items-center gap-1.5">
                  <FileText className="h-4 w-4 text-primary" /> Template di base
                </h3>
                <p className="text-xs text-muted-foreground">Template pre-compilati. Duplicali per personalizzarli.</p>
                {systemTemplates.map((tmpl) => <TemplateCard key={tmpl.id} tmpl={tmpl} isSystem />)}
              </div>
            )}
          </>
        )}
      </main>

      {/* Create template dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Crea template</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-xs text-muted-foreground">Titolo</label>
              <Input value={createForm.title} onChange={(e) => setCreateForm(f => ({ ...f, title: e.target.value }))} placeholder="Es. Piano mantenimento" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs text-muted-foreground">Kcal/giorno</label>
                <Input type="number" value={createForm.kcal} onChange={(e) => setCreateForm(f => ({ ...f, kcal: e.target.value }))} />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Proteine (g)</label>
                <Input type="number" value={createForm.protein} onChange={(e) => setCreateForm(f => ({ ...f, protein: e.target.value }))} />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Carboidrati (g)</label>
                <Input type="number" value={createForm.carbs} onChange={(e) => setCreateForm(f => ({ ...f, carbs: e.target.value }))} />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Grassi (g)</label>
                <Input type="number" value={createForm.fats} onChange={(e) => setCreateForm(f => ({ ...f, fats: e.target.value }))} />
              </div>
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Note</label>
              <Textarea value={createForm.notes} onChange={(e) => setCreateForm(f => ({ ...f, notes: e.target.value }))} rows={2} />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleCreate} disabled={savingCreate} className="w-full">
              {savingCreate ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Crea template
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Import preview dialog */}
      <Dialog open={importOpen} onOpenChange={(open) => { if (!open) { setImportOpen(false); setImportPreview(null); } }}>
        <DialogContent className="max-w-sm max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Importa template</DialogTitle>
          </DialogHeader>
          {importing ? (
            <div className="flex flex-col items-center gap-3 py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Analisi del documento in corso…</p>
            </div>
          ) : importPreview ? (
            <div className="space-y-3">
              <div>
                <label className="text-xs text-muted-foreground">Titolo</label>
                <Input
                  value={importPreview.title || ""}
                  onChange={(e) => setImportPreview((p: any) => ({ ...p, title: e.target.value }))}
                />
              </div>
              <div className="grid grid-cols-4 gap-2 text-center">
                <div className="rounded-lg bg-primary/10 p-2">
                  <p className="text-sm font-bold text-primary">{importPreview.kcal_day}</p>
                  <p className="text-[9px] text-muted-foreground">kcal</p>
                </div>
                <div className="rounded-lg bg-primary/5 p-2">
                  <p className="text-sm font-bold text-foreground">{importPreview.protein_g_day}g</p>
                  <p className="text-[9px] text-muted-foreground">prot</p>
                </div>
                <div className="rounded-lg bg-primary/5 p-2">
                  <p className="text-sm font-bold text-foreground">{importPreview.carbs_g_day}g</p>
                  <p className="text-[9px] text-muted-foreground">carbo</p>
                </div>
                <div className="rounded-lg bg-primary/5 p-2">
                  <p className="text-sm font-bold text-foreground">{importPreview.fats_g_day}g</p>
                  <p className="text-[9px] text-muted-foreground">grassi</p>
                </div>
              </div>
              {importPreview.meals?.length > 0 && (
                <div className="space-y-1">
                  <p className="text-xs font-medium text-foreground">Pasti estratti:</p>
                  {importPreview.meals.map((m: any, i: number) => (
                    <div key={i} className="flex items-center justify-between text-xs bg-secondary/50 rounded-lg px-3 py-1.5">
                      <span className="font-medium">{MEAL_LABELS[m.meal_type] || m.meal_type}</span>
                      <span className="text-muted-foreground">{m.kcal_target} kcal · P{m.protein_g} C{m.carbs_g} G{m.fats_g}</span>
                    </div>
                  ))}
                </div>
              )}
              {importPreview.weekly_data?.weeks?.length > 0 && (
                <div className="space-y-1">
                  <p className="text-xs font-medium text-foreground">
                    📅 Piano settimanale estratto: {importPreview.weekly_data.weeks.length} settimana/e,{" "}
                    {importPreview.weekly_data.weeks.reduce((sum: number, w: any) => sum + (w.days?.length || 0), 0)} giorni
                  </p>
                  <p className="text-[10px] text-muted-foreground">Potrai modificare i dettagli nell'editor dopo l'importazione.</p>
                </div>
              )}
              {importPreview.notes && (
                <div className="space-y-1">
                  <p className="text-xs font-medium text-foreground">Note:</p>
                  <p className="text-[10px] text-muted-foreground bg-secondary/50 rounded-lg px-3 py-2 whitespace-pre-wrap">{importPreview.notes}</p>
                </div>
              )}
            </div>
          ) : null}
          {importPreview && (
            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => { setImportOpen(false); setImportPreview(null); }}>Annulla</Button>
              <Button onClick={confirmImport} disabled={savingCreate}>
                {savingCreate ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Salva template
              </Button>
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <Dialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Eliminare questo template?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">Questa azione è irreversibile.</p>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDeleteId(null)}>Annulla</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
              {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4 mr-1" />}
              Elimina
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ProTemplatesPage;
