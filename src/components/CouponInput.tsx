import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Ticket, Check, X } from "lucide-react";

interface CouponResult {
  valid: boolean;
  coupon_id?: string;
  coupon_code?: string;
  client_discount_percent?: number;
  nutritionist_name?: string;
  error?: string;
}

interface CouponInputProps {
  onCouponApplied: (result: CouponResult | null) => void;
}

const CouponInput = ({ onCouponApplied }: CouponInputProps) => {
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<CouponResult | null>(null);

  const validate = async () => {
    if (!code.trim()) return;
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("validate-coupon", {
        body: { coupon_code: code.trim() },
      });
      if (error) throw error;
      setResult(data);
      if (data.valid) {
        onCouponApplied(data);
      } else {
        onCouponApplied(null);
      }
    } catch {
      setResult({ valid: false, error: "Errore nella validazione" });
      onCouponApplied(null);
    }
    setLoading(false);
  };

  const removeCoupon = () => {
    setCode("");
    setResult(null);
    onCouponApplied(null);
  };

  if (result?.valid) {
    return (
      <div className="rounded-lg border-2 border-emerald-500/30 bg-emerald-50 dark:bg-emerald-950/20 p-3 space-y-1">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Check className="h-4 w-4 text-emerald-600" />
            <span className="text-sm font-semibold text-emerald-700 dark:text-emerald-400">
              Coupon applicato!
            </span>
          </div>
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={removeCoupon}>
            <X className="h-3 w-3" />
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          Codice: <span className="font-mono font-bold">{result.coupon_code}</span> — Sconto {result.client_discount_percent}%
        </p>
        <p className="text-xs text-muted-foreground">
          Da: {result.nutritionist_name}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Ticket className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm text-muted-foreground">Hai un codice coupon?</span>
      </div>
      <div className="flex gap-2">
        <Input
          placeholder="Inserisci codice"
          value={code}
          onChange={(e) => {
            setCode(e.target.value.toUpperCase());
            if (result) setResult(null);
          }}
          className="font-mono uppercase"
        />
        <Button onClick={validate} disabled={loading || !code.trim()} size="sm">
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Applica"}
        </Button>
      </div>
      {result && !result.valid && (
        <p className="text-xs text-destructive">{result.error}</p>
      )}
    </div>
  );
};

export default CouponInput;
