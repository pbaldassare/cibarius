import { Navigate } from "react-router-dom";
import { useRestaurant } from "@/hooks/useRestaurant";
import { useRole } from "@/hooks/useRole";
import { useAuth } from "@/hooks/useAuth";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Wraps restaurant pages. If the owner has no restaurant yet,
 * redirects to the onboarding page.
 */
const RestaurantGuard = ({ children }: { children: React.ReactNode }) => {
  const { restaurant, isLoading } = useRestaurant();
  const { role, isLoading: roleLoading } = useRole();
  const { signOut } = useAuth();

  if (isLoading || roleLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Operatore rimosso dal titolare: non ha un ristorante e non puo' crearne uno.
  if (!restaurant && role === "restaurant_staff") {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-4 bg-background px-6 text-center">
        <p className="text-sm text-muted-foreground">Il tuo account non è più collegato a nessun ristorante.</p>
        <Button variant="outline" onClick={() => signOut()}>Esci</Button>
      </div>
    );
  }

  if (!restaurant) {
    return <Navigate to="/restaurant/onboarding" replace />;
  }

  return <>{children}</>;
};

export default RestaurantGuard;
