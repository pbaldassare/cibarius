import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import MobileHeader from "@/components/MobileHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Trash2 } from "lucide-react";

const MEAL_LABELS: Record<string, string> = {
  colazione: "☀️ Colazione",
  pranzo: "🌤️ Pranzo",
  cena: "🌙 Cena",
  spuntino: "🍎 Spuntino",
};

const ProTemplatesPage = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [templates, setTemplates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = async () => {
    if (!user) return;
    setLoading(true);
    const { data } = await supabase
      .from("diet_plan_templates")
      .select("*, diet_plan_template_meals(*)")
      .eq("professional_id", user.id)
      .order("created_at", { ascending: false });
    setTemplates(data ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, [user]);

  const handleDelete = async () => {
    if (!deleteId) return;
    setDeleting(true);
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
        {templates.length === 0 ? (
          <div className="text-center py-12 space-y-2">
            <p className="text-4xl">📋</p>
            <p className="text-sm text-muted-foreground">Nessun template salvato.</p>
            <p className="text-xs text-muted-foreground">Crea un piano per un cliente e salvalo come template dallo step di riepilogo.</p>
          </div>
        ) : (
          templates.map((tmpl) => (
            <Card key={tmpl.id} className="border border-border">
              <CardContent className="py-4 space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-semibold text-foreground">{tmpl.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(tmpl.created_at).toLocaleDateString("it-IT", { day: "numeric", month: "long", year: "numeric" })}
                    </p>
                  </div>
                  <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={() => setDeleteId(tmpl.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
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
          ))
        )}
      </main>

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
