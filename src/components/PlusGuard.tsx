import { useSubscription } from "@/hooks/useSubscription";
import UpgradeScreen from "./UpgradeScreen";
import { Loader2 } from "lucide-react";

/**
 * Guards user_plus features. If the user doesn't have an active Plus subscription,
 * shows the upgrade screen. Use this to wrap pages/components that require Plus.
 */
const PlusGuard = ({ children }: { children: React.ReactNode }) => {
  const { isActive, isLoading } = useSubscription("user_plus");

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!isActive) {
    return <UpgradeScreen planType="user_plus" />;
  }

  return <>{children}</>;
};

export default PlusGuard;
