import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import MobileHeader from "@/components/MobileHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useSubscription } from "@/hooks/useSubscription";
import { useToast } from "@/hooks/use-toast";
import { Check, Crown, Loader2, Shield, Sparkles, Store, Zap } from "lucide-react";

interface Plan {
  id: string;
  plan_name: string;
  name: string;
  role_type: string;
  billing_interval: string;
  local_price: number;
  stripe_product_id: string | null;
  trial_days: number;
}

const SubscriptionPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);
  const [couponCode, setCouponCode] = useState("");
  const [activeTab, setActiveTab] = useState<"user_plus" | "restaurant">("user_plus");

  const { subscription: userPlusSub } = useSubscription("user_plus");
  const { subscription: restaurantSub } = useSubscription("restaurant");

  const success = searchParams.get("success") === "true";

  useEffect(() => {
    const fetchPlans = async () => {
      const { data } = await supabase
        .from("subscription_plans")
        .select("*")
        .eq("is_active", true)
        .order("local_price", { ascending: true });
      setPlans((data as Plan[]) || []);
      setLoading(false);
    };
    fetchPlans();
  }, []);

  const handleCheckout = async (plan: Plan) => {
    if (!user) return;
    setProcessing(plan.id);
    try {
      const { data, error } = await supabase.functions.invoke("create-checkout-session", {
        body: {
          plan_id: plan.id,
          coupon_code: couponCode || undefined,
          success_url: `${window.location.origin}/subscription?success=true`,
          cancel_url: `${window.location.origin}/subscription?cancelled=true`,
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      if (data?.url) {
        window.location.href = data.url;
      }
    } catch (e: any) {
      toast({ variant: "destructive", title: "Errore", description: e.message });
    } finally {
      setProcessing(null);
    }
  };

  if (success) {
    return (
      <div>
        <MobileHeader title="Abbonamento" />
        <main className="px-4 py-8 space-y-6">
          <div className="text-center space-y-3">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
              <Check className="h-8 w-8 text-primary" />
            </div>
            <h1 className="text-2xl font-bold text-foreground">Pagamento completato!</h1>
            <p className="text-muted-foreground">Il tuo abbonamento è ora attivo.</p>
          </div>
          <Button className="w-full" onClick={() => navigate("/")}>
            Vai alla Home
          </Button>
        </main>
      </div>
    );
  }

  const filteredPlans = plans.filter((p) => p.role_type === activeTab);
  const activeSub = activeTab === "user_plus" ? userPlusSub : restaurantSub;

  const userPlusFeatures = [
    "Piano alimentare personalizzato",
    "Impostazione macro nutrienti",
    "Collegamento nutrizionista",
    "Piano dal nutrizionista",
    "Monitoraggio nutrizione avanzato",
  ];

  const restaurantFeatures = [
    "Modulo HACCP completo",
    "Gestione scadenze avanzata",
    "Controlli e report HACCP",
    "Gestione staff",
    "Registro controlli e temperature",
    "Export PDF/CSV",
  ];

  const features = activeTab === "user_plus" ? userPlusFeatures : restaurantFeatures;
  const Icon = activeTab === "user_plus" ? Sparkles : Store;

  return (
    <div>
      <MobileHeader title="Abbonamento" />
      <main className="px-4 py-5 space-y-5 pb-28">
        {/* Header */}
        <div className="text-center space-y-1">
          <Crown className="h-8 w-8 text-primary mx-auto" />
          <h1 className="text-xl font-bold text-foreground">Piani Cibarius</h1>
          <p className="text-sm text-muted-foreground">Scegli il piano perfetto per te</p>
        </div>

        {/* Tab selector */}
        <div className="flex bg-muted rounded-xl p-1 gap-1">
          <button
            onClick={() => setActiveTab("user_plus")}
            className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
              activeTab === "user_plus"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground"
            }`}
          >
            <Sparkles className="h-4 w-4 inline mr-1.5" />
            Utente Plus
          </button>
          <button
            onClick={() => setActiveTab("restaurant")}
            className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
              activeTab === "restaurant"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground"
            }`}
          >
            <Store className="h-4 w-4 inline mr-1.5" />
            Ristorante
          </button>
        </div>

        {/* Active sub banner */}
        {activeSub && ["active", "trial"].includes(activeSub.status) && (
          <Card className="border-primary/30 bg-primary/5">
            <CardContent className="pt-4 pb-3">
              <div className="flex items-center gap-2">
                <Check className="h-5 w-5 text-primary" />
                <div>
                  <p className="font-medium text-foreground text-sm">
                    {activeSub.status === "trial" ? "Trial attivo" : "Abbonamento attivo"}
                  </p>
                  {activeSub.is_free_override && (
                    <p className="text-xs text-primary">Accesso gratuito</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Features */}
        <Card>
          <CardContent className="pt-4">
            <div className="space-y-2">
              {features.map((f, i) => (
                <div key={i} className="flex items-center gap-2 text-sm">
                  <Check className="h-4 w-4 text-primary shrink-0" />
                  <span className="text-foreground">{f}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Free user features */}
        {activeTab === "user_plus" && (
          <Card className="bg-muted/50">
            <CardContent className="pt-4">
              <p className="text-xs font-semibold text-muted-foreground mb-2">GRATIS PER TUTTI</p>
              <div className="space-y-1.5">
                {["Gestione dispensa", "Scadenze e anti-spreco", "Scanner scontrini", "Piani standard (digiuno, low carb, mediterranea, vegetariana)", "Scelta calorie giornaliere"].map((f, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Check className="h-3 w-3 shrink-0" />
                    <span>{f}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Plan cards */}
        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3">
            {filteredPlans.map((plan) => {
              const isYearly = plan.billing_interval === "yearly";
              const monthlyEquivalent = isYearly ? (plan.local_price / 12).toFixed(2) : null;
              const isAlreadyActive = activeSub && ["active", "trial"].includes(activeSub.status);

              return (
                <Card
                  key={plan.id}
                  className={`relative border-2 transition-all ${
                    isYearly ? "border-primary shadow-md" : "border-border"
                  }`}
                >
                  {isYearly && (
                    <Badge className="absolute -top-2.5 left-4 text-[9px] px-2">
                      Più conveniente
                    </Badge>
                  )}
                  {plan.trial_days > 0 && (
                    <Badge variant="secondary" className="absolute -top-2.5 right-4 text-[9px] px-2">
                      {plan.trial_days}gg gratis
                    </Badge>
                  )}
                  <CardContent className="pt-5 pb-4">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <p className="font-bold text-foreground">
                          {isYearly ? "Annuale" : "Mensile"}
                        </p>
                        {monthlyEquivalent && (
                          <p className="text-xs text-primary font-medium">
                            €{monthlyEquivalent}/mese
                          </p>
                        )}
                      </div>
                      <div className="text-right">
                        <span className="text-2xl font-extrabold text-foreground">
                          €{Number(plan.local_price).toFixed(2)}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          /{isYearly ? "anno" : "mese"}
                        </span>
                      </div>
                    </div>
                    <Button
                      className="w-full"
                      variant={isYearly ? "default" : "outline"}
                      disabled={!!processing || !!isAlreadyActive}
                      onClick={() => handleCheckout(plan)}
                    >
                      {processing === plan.id ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      ) : (
                        <Icon className="h-4 w-4 mr-2" />
                      )}
                      {isAlreadyActive
                        ? "Già attivo"
                        : plan.trial_days > 0
                        ? `Inizia ${plan.trial_days}gg gratis`
                        : "Abbonati ora"}
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* Coupon */}
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground">Hai un codice sconto?</p>
          <Input
            placeholder="Inserisci codice coupon"
            value={couponCode}
            onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
            className="text-center font-mono"
          />
        </div>

        <div className="flex items-center justify-center gap-1.5 text-[11px] text-muted-foreground">
          <Shield className="h-3.5 w-3.5" />
          Pagamento sicuro via Stripe · Cancella quando vuoi
        </div>
      </main>
    </div>
  );
};

export default SubscriptionPage;
