import { useState } from "react";
import { useNavigate } from "react-router-dom";
import MobileHeader from "@/components/MobileHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import CouponInput from "@/components/CouponInput";
import { Check, Crown, Loader2, Shield, Sparkles, Zap } from "lucide-react";

interface CouponResult {
  valid: boolean;
  coupon_id?: string;
  coupon_code?: string;
  client_discount_percent?: number;
  nutritionist_name?: string;
}

const PLANS = [
  {
    id: "monthly",
    name: "Mensile",
    price: 9.99,
    period: "/ mese",
    features: ["Dispensa illimitata", "Scansione scontrini", "Ricette AI", "Diario alimentare"],
    popular: false,
  },
  {
    id: "annual",
    name: "Annuale",
    price: 79.99,
    period: "/ anno",
    features: ["Tutto il mensile", "Risparmia il 33%", "Piani nutrizionali", "Supporto prioritario"],
    popular: true,
    savings: "Risparmi €39,89",
  },
];

const SubscriptionPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [selectedPlan, setSelectedPlan] = useState<string>("annual");
  const [coupon, setCoupon] = useState<CouponResult | null>(null);
  const [processing, setProcessing] = useState(false);
  const [paymentDone, setPaymentDone] = useState(false);
  const [paymentResult, setPaymentResult] = useState<any>(null);

  const plan = PLANS.find(p => p.id === selectedPlan)!;
  const originalPrice = plan.price;
  const discountPercent = coupon?.client_discount_percent || 0;
  const discountAmount = Math.round(originalPrice * discountPercent) / 100;
  const finalPrice = Math.round((originalPrice - discountAmount) * 100) / 100;

  const handleCheckout = async () => {
    if (!user) return;
    setProcessing(true);
    try {
      const { data, error } = await supabase.functions.invoke("process-coupon-payment", {
        body: {
          coupon_id: coupon?.coupon_id || null,
          original_amount: originalPrice,
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      setPaymentResult(data);
      setPaymentDone(true);
      toast({ title: "Pagamento completato! 🎉", description: `Abbonamento ${plan.name} attivato` });
    } catch (e: any) {
      toast({ variant: "destructive", title: "Errore pagamento", description: e.message });
    } finally {
      setProcessing(false);
    }
  };

  if (paymentDone && paymentResult) {
    return (
      <div>
        <MobileHeader title="Abbonamento" />
        <main className="px-4 py-8 space-y-6">
          <div className="text-center space-y-3">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
              <Check className="h-8 w-8 text-primary" />
            </div>
            <h1 className="text-2xl font-bold text-foreground">Pagamento completato!</h1>
            <p className="text-muted-foreground">Il tuo abbonamento {plan.name} è ora attivo.</p>
          </div>

          <Card>
            <CardContent className="pt-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Importo originale</span>
                <span>€{originalPrice.toFixed(2)}</span>
              </div>
              {paymentResult.discount_amount > 0 && (
                <div className="flex justify-between text-sm text-primary">
                  <span>Sconto coupon</span>
                  <span>-€{paymentResult.discount_amount.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between text-base font-bold border-t border-border pt-2">
                <span>Totale pagato</span>
                <span>€{paymentResult.final_amount.toFixed(2)}</span>
              </div>
              {paymentResult.commission_amount > 0 && (
                <p className="text-[11px] text-muted-foreground pt-1">
                  Commissione nutrizionista: €{paymentResult.commission_amount.toFixed(2)}
                </p>
              )}
            </CardContent>
          </Card>

          <Button className="w-full" onClick={() => navigate("/")}>
            Vai alla Home
          </Button>
        </main>
      </div>
    );
  }

  return (
    <div>
      <MobileHeader title="Abbonamento" />
      <main className="px-4 py-5 space-y-5 pb-28">

        {/* Header */}
        <div className="text-center space-y-1">
          <Crown className="h-8 w-8 text-primary mx-auto" />
          <h1 className="text-xl font-bold text-foreground">Cibarius Premium</h1>
          <p className="text-sm text-muted-foreground">Gestisci il cibo come un professionista</p>
        </div>

        {/* Plan selection */}
        <div className="grid grid-cols-2 gap-3">
          {PLANS.map(p => (
            <button
              key={p.id}
              onClick={() => setSelectedPlan(p.id)}
              className={`relative rounded-2xl border-2 p-4 text-left transition-all ${
                selectedPlan === p.id
                  ? "border-primary bg-primary/5 shadow-md"
                  : "border-border bg-card"
              }`}
            >
              {p.popular && (
                <Badge className="absolute -top-2.5 left-1/2 -translate-x-1/2 text-[9px] px-2">
                  Più scelto
                </Badge>
              )}
              <p className="text-base font-bold text-foreground">{p.name}</p>
              <div className="mt-1">
                <span className="text-2xl font-extrabold text-foreground">€{p.price.toFixed(2)}</span>
                <span className="text-xs text-muted-foreground">{p.period}</span>
              </div>
              {p.savings && (
                <p className="text-[10px] text-primary font-semibold mt-1">{p.savings}</p>
              )}
            </button>
          ))}
        </div>

        {/* Features */}
        <Card>
          <CardContent className="pt-4">
            <div className="space-y-2">
              {plan.features.map((f, i) => (
                <div key={i} className="flex items-center gap-2 text-sm">
                  <Check className="h-4 w-4 text-primary shrink-0" />
                  <span className="text-foreground">{f}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Coupon input */}
        <CouponInput onCouponApplied={setCoupon} />

        {/* Price summary */}
        <Card className="border-2 border-primary/20">
          <CardContent className="pt-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Piano {plan.name}</span>
              <span className="text-foreground">€{originalPrice.toFixed(2)}</span>
            </div>
            {coupon && discountPercent > 0 && (
              <div className="flex justify-between text-sm text-primary">
                <span>Sconto {discountPercent}% ({coupon.coupon_code})</span>
                <span>-€{discountAmount.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between text-lg font-bold border-t border-border pt-2">
              <span>Totale</span>
              <span className="text-foreground">€{finalPrice.toFixed(2)}</span>
            </div>
            {coupon?.nutritionist_name && (
              <p className="text-[11px] text-muted-foreground">
                Coupon di: {coupon.nutritionist_name}
              </p>
            )}
          </CardContent>
        </Card>

        {/* Checkout button */}
        <Button
          className="w-full h-12 text-base font-bold rounded-xl"
          onClick={handleCheckout}
          disabled={processing}
        >
          {processing ? (
            <Loader2 className="h-5 w-5 animate-spin mr-2" />
          ) : (
            <Zap className="h-5 w-5 mr-2" />
          )}
          {processing ? "Elaborazione..." : `Paga €${finalPrice.toFixed(2)}`}
        </Button>

        <div className="flex items-center justify-center gap-1.5 text-[11px] text-muted-foreground">
          <Shield className="h-3.5 w-3.5" />
          Pagamento sicuro · Cancella quando vuoi
        </div>
      </main>
    </div>
  );
};

export default SubscriptionPage;
