import { useEffect, useState } from "react";
import { useAuth } from "./useAuth";
import { supabase } from "@/integrations/supabase/client";

export interface Subscription {
  id: string;
  user_id: string;
  plan_type: "restaurant" | "user_plus";
  status: "trial" | "active" | "past_due" | "cancelled" | "expired";
  start_date: string;
  trial_end_date: string | null;
  next_billing_date: string | null;
  cancel_at_period_end: boolean;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  created_at: string;
}

export const useSubscription = (planType?: "restaurant" | "user_plus") => {
  const { user } = useAuth();
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setSubscription(null);
      setIsLoading(false);
      return;
    }

    const fetch = async () => {
      let query = supabase
        .from("subscriptions")
        .select("*")
        .eq("user_id", user.id);

      if (planType) {
        query = query.eq("plan_type", planType);
      }

      const { data } = await query.order("created_at", { ascending: false }).limit(1).maybeSingle();
      setSubscription(data as Subscription | null);
      setIsLoading(false);
    };

    fetch();
  }, [user, planType]);

  const isActive = subscription?.status === "trial" || subscription?.status === "active";
  const isTrial = subscription?.status === "trial";
  const isExpired = subscription?.status === "expired" || subscription?.status === "cancelled";

  const trialDaysLeft = isTrial && subscription?.trial_end_date
    ? Math.max(0, Math.ceil((new Date(subscription.trial_end_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : 0;

  return {
    subscription,
    isLoading,
    isActive,
    isTrial,
    isExpired,
    trialDaysLeft,
  };
};
