import { useEffect, useState } from "react";
import { Ticket } from "lucide-react";
import { getSavedReferralCode } from "@/pages/JoinReferralPage";
import { supabase } from "@/integrations/supabase/client";

interface ReferralBadgeProps {
  className?: string;
}

const ReferralBadge = ({ className = "" }: ReferralBadgeProps) => {
  const [refCode, setRefCode] = useState<string | null>(null);
  const [nutritionistName, setNutritionistName] = useState<string | null>(null);

  useEffect(() => {
    const code = getSavedReferralCode();
    if (!code) return;
    setRefCode(code);

    // Try to fetch nutritionist name
    supabase
      .from("nutritionist_coupons" as any)
      .select("nutritionist_user_id, profiles:nutritionist_user_id(full_name)")
      .eq("coupon_code", code)
      .eq("is_active", true)
      .single()
      .then(({ data }) => {
        if (data) {
          setNutritionistName((data as any).profiles?.full_name || null);
        }
      });
  }, []);

  if (!refCode) return null;

  return (
    <div className={`rounded-lg border-2 border-primary/30 bg-primary/5 p-3 ${className}`}>
      <div className="flex items-center gap-2 mb-1">
        <Ticket className="h-4 w-4 text-primary shrink-0" />
        <span className="text-sm font-semibold text-foreground">
          Coupon nutrizionista attivo
        </span>
      </div>
      <p className="text-xs text-muted-foreground">
        Lo sconto verrà applicato automaticamente
      </p>
      {nutritionistName && (
        <p className="text-xs text-muted-foreground mt-0.5">
          Invitato da: <span className="font-medium text-foreground">{nutritionistName}</span>
        </p>
      )}
    </div>
  );
};

export default ReferralBadge;
