import { Navigate } from "react-router-dom";
import { useRestaurant } from "@/hooks/useRestaurant";
import { Loader2 } from "lucide-react";

/**
 * Wraps restaurant pages. If the owner has no restaurant yet,
 * redirects to the onboarding page.
 */
const RestaurantGuard = ({ children }: { children: React.ReactNode }) => {
  const { restaurant, isLoading } = useRestaurant();

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!restaurant) {
    return <Navigate to="/restaurant/onboarding" replace />;
  }

  return <>{children}</>;
};

export default RestaurantGuard;
