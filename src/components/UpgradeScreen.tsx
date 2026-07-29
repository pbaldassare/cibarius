import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Crown, Lock, Sparkles, Store } from "lucide-react";

interface UpgradeScreenProps {
  planType: "restaurant" | "user_plus";
}

const configs = {
  restaurant: {
    icon: Store,
    title: "Abbonamento Ristorante richiesto",
    message: "Il tuo periodo di prova è terminato. Attiva l'abbonamento per continuare a usare Cibarius.",
    features: [
      "Modulo HACCP completo",
      "Gestione scadenze",
      "Controlli attività",
      "Report HACCP",
      "Gestione staff",
      "Registro controlli",
    ],
    price: "Da €19,90/mese",
    trial: "30 giorni gratis",
    cta: "Attiva abbonamento",
  },
  user_plus: {
    icon: Sparkles,
    title: "Sblocca Cibarius Plus",
    message: "Funzionalità premium in arrivo. Provalo 7 giorni gratis.",
    features: [
      "Funzionalità avanzate anti-spreco",
      "Priorità su nuove feature",
      "Supporto dedicato",
      "In arrivo: altre funzioni Plus",
    ],
    price: "€2,99/mese · €29,90/anno",
    trial: "7 giorni gratis",
    cta: "Inizia 7 giorni gratis",
  },
};

const UpgradeScreen = ({ planType }: UpgradeScreenProps) => {
  const navigate = useNavigate();
  const config = configs[planType];
  const Icon = config.icon;

  return (
    <div className="flex min-h-[80vh] items-center justify-center p-4 bg-background">
      <Card className="max-w-md w-full border-2 border-primary/20">
        <CardContent className="pt-8 pb-6 space-y-6 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
            <Lock className="h-8 w-8 text-primary" />
          </div>

          <div className="space-y-2">
            <h2 className="text-xl font-bold text-foreground">{config.title}</h2>
            <p className="text-sm text-muted-foreground">{config.message}</p>
          </div>

          <div className="text-left space-y-2 bg-muted/50 rounded-xl p-4">
            {config.features.map((f, i) => (
              <div key={i} className="flex items-center gap-2 text-sm">
                <Crown className="h-4 w-4 text-primary shrink-0" />
                <span className="text-foreground">{f}</span>
              </div>
            ))}
          </div>

          <div className="space-y-3">
            <p className="text-2xl font-extrabold text-foreground">{config.price}</p>
            {config.trial && (
              <p className="text-sm text-primary font-medium">{config.trial}</p>
            )}
            <Button
              className="w-full h-12 text-base font-bold rounded-xl"
              onClick={() => navigate("/subscription")}
            >
              <Icon className="h-5 w-5 mr-2" />
              {config.cta}
            </Button>
            <Button
              variant="ghost"
              className="w-full text-muted-foreground"
              onClick={() => navigate(-1)}
            >
              Torna indietro
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default UpgradeScreen;
