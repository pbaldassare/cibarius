import { useSubscription } from "@/hooks/useSubscription";
import { Loader2 } from "lucide-react";
import UpgradeScreen from "./UpgradeScreen";

interface SubscriptionGuardProps {
  planType: "restaurant" | "user_plus";
  children: React.ReactNode;
}

/**
 * Wraps pages that require an active subscription.
 * Shows upgrade screen if subscription is expired/missing.
 */
const SubscriptionGuard = ({ planType, children }: SubscriptionGuardProps) => {
  const { isActive, isLoading } = useSubscription(planType);

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isActive) {
    return <UpgradeScreen planType={planType} />;
  }

  return <>{children}</>;
};

export default SubscriptionGuard;
