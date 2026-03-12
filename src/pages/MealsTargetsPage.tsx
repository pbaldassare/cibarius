import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useSubscription } from "@/hooks/useSubscription";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import MobileHeader from "@/components/MobileHeader";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Save, Crown } from "lucide-react";

const MealsTargetsPage = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [kcal, setKcal] = useState("2000");
  const [protein, setProtein] = useState("120");
  const [carbs, setCarbs] = useState("220");
  const [fats, setFats] = useState("70");
  const [sugars, setSugars] = useState("0");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) return;
    supabase.from("nutrition_targets").select("*").eq("user_id", user.id).maybeSingle().then(({ data }) => {
      if (data) {
        setKcal(String(data.kcal_day));
        setProtein(String(data.protein_g));
        setCarbs(String(data.carbs_g));
        setFats(String(data.fats_g));
        setSugars(String((data as any).sugars_g ?? 0));
      }
      setLoading(false);
    });
  }, [user]);

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);

    const payload = {
      user_id: user.id,
      kcal_day: parseFloat(kcal) || 2000,
      protein_g: parseFloat(protein) || 120,
      carbs_g: parseFloat(carbs) || 220,
      fats_g: parseFloat(fats) || 70,
      sugars_g: parseFloat(sugars) || 0,
      updated_at: new Date().toISOString(),
    };

    const { error } = await supabase.from("nutrition_targets").upsert(payload, { onConflict: "user_id" });
    setSaving(false);

    if (error) {
      toast({ variant: "destructive", title: "Errore", description: error.message });
    } else {
      toast({ title: "Obiettivi salvati!" });
      navigate("/meals");
    }
  };

  if (loading) {
    return (
      <div>
        <MobileHeader title="Obiettivi" showBack />
        <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
      </div>
    );
  }

  return (
    <div>
      <MobileHeader title="Obiettivi nutrizionali" showBack />

      <main className="px-4 pb-28 space-y-4">
        <div className="rounded-2xl border-2 border-accent bg-card p-4 space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-semibold text-foreground">Calorie giornaliere (kcal)</label>
            <Input type="number" value={kcal} onChange={e => setKcal(e.target.value)} className="border-accent/30" />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-semibold text-foreground">Proteine (g)</label>
            <Input type="number" value={protein} onChange={e => setProtein(e.target.value)} className="border-accent/30" />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-semibold text-foreground">Carboidrati (g)</label>
            <Input type="number" value={carbs} onChange={e => setCarbs(e.target.value)} className="border-accent/30" />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-semibold text-foreground">di cui Zuccheri (g)</label>
            <Input type="number" value={sugars} onChange={e => setSugars(e.target.value)} className="border-accent/30" />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-semibold text-foreground">Grassi (g)</label>
            <Input type="number" value={fats} onChange={e => setFats(e.target.value)} className="border-accent/30" />
          </div>

          <Button className="w-full h-12 text-base font-bold" onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            Salva obiettivi
          </Button>
        </div>
      </main>
    </div>
  );
};

export default MealsTargetsPage;
