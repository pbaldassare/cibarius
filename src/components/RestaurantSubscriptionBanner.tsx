import { useSubscription } from "@/hooks/useSubscription";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Clock, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

/**
 * Shows trial countdown or expiry warning on restaurant pages.
 */
const RestaurantSubscriptionBanner = () => {
  const { isTrial, trialDaysLeft, isExpired, isLoading } = useSubscription("restaurant");
  const navigate = useNavigate();

  if (isLoading) return null;

  if (isTrial && trialDaysLeft <= 7) {
    return (
      <Alert className="border-amber-500/30 bg-amber-50 dark:bg-amber-950/20">
        <Clock className="h-4 w-4 text-amber-600" />
        <AlertTitle className="text-amber-800 dark:text-amber-400">
          Periodo di prova: {trialDaysLeft} giorni rimasti
        </AlertTitle>
        <AlertDescription className="text-amber-700 dark:text-amber-500 text-sm">
          Attiva l'abbonamento per continuare a usare tutte le funzioni.
          <Button
            variant="link"
            className="text-amber-800 dark:text-amber-400 px-1 h-auto"
            onClick={() => navigate("/subscription")}
          >
            Attiva ora →
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  if (isExpired) {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Abbonamento scaduto</AlertTitle>
        <AlertDescription className="text-sm">
          Il tuo periodo di prova è terminato. Attiva l'abbonamento per continuare.
          <Button
            variant="link"
            className="text-destructive-foreground px-1 h-auto"
            onClick={() => navigate("/subscription")}
          >
            Attiva ora →
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  return null;
};

export default RestaurantSubscriptionBanner;
