import { Navigate, useLocation } from "react-router-dom";
import { useRestaurant } from "@/hooks/useRestaurant";
import { useRole, getRoleHomePath } from "@/hooks/useRole";
import { isStaffPath, STAFF_HOME } from "@/lib/restaurant-tabs";
import { Loader2 } from "lucide-react";

/**
 * Wraps restaurant pages.
 *
 * - Titolare: tutto l'app ristorante; senza ristorante va all'onboarding.
 * - Staff (membro invitato, di solito con ruolo 'user'): solo le pagine
 *   HACCP, il resto lo rimanda a STAFF_HOME.
 * - Chiunque altro torna alla home del proprio ruolo.
 */
const RestaurantGuard = ({ children }: { children: React.ReactNode }) => {
  const { restaurant, isStaff, isLoading } = useRestaurant();
  const { role, isLoading: roleLoading } = useRole();
  const location = useLocation();

  if (isLoading || roleLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!restaurant) {
    if (role === "restaurant_owner" || role === "admin") {
      return <Navigate to="/restaurant/onboarding" replace />;
    }
    return <Navigate to={getRoleHomePath(role)} replace />;
  }

  if (isStaff && !isStaffPath(location.pathname)) {
    return <Navigate to={STAFF_HOME} replace />;
  }

  return <>{children}</>;
};

export default RestaurantGuard;
