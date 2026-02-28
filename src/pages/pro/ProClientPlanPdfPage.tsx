import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import MobileHeader from "@/components/MobileHeader";
import PlanPdfView from "@/components/PlanPdfView";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Loader2, Download } from "lucide-react";

const ProClientPlanPdfPage = () => {
  const { clientId } = useParams<{ clientId: string }>();
  const { user } = useAuth();
  const [plan, setPlan] = useState<any>(null);
  const [mealTargets, setMealTargets] = useState<any[]>([]);
  const [proName, setProName] = useState("");
  const [clientName, setClientName] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || !clientId) return;
    const load = async () => {
      const [planRes, proRes, clientRes] = await Promise.all([
        supabase
          .from("diet_plans")
          .select("*, diet_plan_meal_targets(*)")
          .eq("professional_id", user.id)
          .eq("client_user_id", clientId)
          .eq("is_active", true)
          .maybeSingle(),
        supabase.from("profiles").select("full_name").eq("id", user.id).single(),
        supabase.from("profiles").select("full_name").eq("id", clientId).single(),
      ]);

      if (planRes.data) {
        setPlan(planRes.data);
        setMealTargets((planRes.data as any).diet_plan_meal_targets || []);
      }
      setProName(proRes.data?.full_name || "");
      setClientName(clientRes.data?.full_name || "");
      setLoading(false);
    };
    load();
  }, [user, clientId]);

  if (loading) {
    return (
      <div>
        <MobileHeader title="PDF Piano" />
        <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
      </div>
    );
  }

  if (!plan) {
    return (
      <div>
        <MobileHeader title="PDF Piano" />
        <main className="px-4 py-10 text-center">
          <p className="text-muted-foreground">Nessun piano attivo per questo cliente.</p>
        </main>
      </div>
    );
  }

  return (
    <div>
      <div className="print:hidden">
        <MobileHeader title="PDF Piano" />
        <div className="px-4 py-4">
          <Button className="w-full gap-2" onClick={() => window.print()}>
            <Download className="h-4 w-4" /> Scarica PDF
          </Button>
        </div>
      </div>
      <PlanPdfView
        plan={plan}
        mealTargets={mealTargets}
        proName={proName}
        clientName={clientName}
      />
    </div>
  );
};

export default ProClientPlanPdfPage;
