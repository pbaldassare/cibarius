import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useSubscription } from "@/hooks/useSubscription";
import { supabase } from "@/integrations/supabase/client";
import UpgradeScreen from "./UpgradeScreen";

/**
 * Gates /plan and /progress: requires either an active user_plus subscription
 * (incl. trial / admin override) or an active link with a nutritionist.
 */
const PlanProgressGuard = ({ children }: { children: React.ReactNode }) => {
  const { user } = useAuth();
  const { isActive: plusActive, isLoading: subLoading } = useSubscription("user_plus");
  const [hasNutritionist, setHasNutritionist] = useState<boolean | null>(null);

  useEffect(() => {
    if (!user) { setHasNutritionist(false); return; }
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("user_nutritionist_links")
        .select("id")
        .eq("client_user_id", user.id)
        .eq("is_active", true)
        .limit(1)
        .maybeSingle();
      if (!cancelled) setHasNutritionist(!!data);
    })();
    return () => { cancelled = true; };
  }, [user]);

  if (subLoading || hasNutritionist === null) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!plusActive && !hasNutritionist) {
    return <UpgradeScreen planType="user_plus" />;
  }

  return <>{children}</>;
};

export default PlanProgressGuard;
