import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, CheckCircle, XCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import cibariusLogo from "@/assets/cibarius-logo.png";

const REFERRAL_STORAGE_KEY = "ref_coupon_code";
const REFERRAL_EXPIRY_KEY = "ref_coupon_expires";
const REFERRAL_COOKIE_DAYS = 30;

export function saveReferralCode(code: string) {
  const expires = Date.now() + REFERRAL_COOKIE_DAYS * 24 * 60 * 60 * 1000;
  localStorage.setItem(REFERRAL_STORAGE_KEY, code.toUpperCase().trim());
  localStorage.setItem(REFERRAL_EXPIRY_KEY, expires.toString());
  // Also set cookie as backup
  const d = new Date();
  d.setTime(d.getTime() + REFERRAL_COOKIE_DAYS * 24 * 60 * 60 * 1000);
  document.cookie = `${REFERRAL_STORAGE_KEY}=${code.toUpperCase().trim()};expires=${d.toUTCString()};path=/;SameSite=Lax`;
}

export function getSavedReferralCode(): string | null {
  const code = localStorage.getItem(REFERRAL_STORAGE_KEY);
  const expires = localStorage.getItem(REFERRAL_EXPIRY_KEY);
  if (code && expires && Date.now() < parseInt(expires)) {
    return code;
  }
  // Fallback to cookie
  const match = document.cookie.match(new RegExp(`(^| )${REFERRAL_STORAGE_KEY}=([^;]+)`));
  if (match) return match[2];
  // Expired in localStorage
  localStorage.removeItem(REFERRAL_STORAGE_KEY);
  localStorage.removeItem(REFERRAL_EXPIRY_KEY);
  return null;
}

export function clearReferralCode() {
  localStorage.removeItem(REFERRAL_STORAGE_KEY);
  localStorage.removeItem(REFERRAL_EXPIRY_KEY);
  document.cookie = `${REFERRAL_STORAGE_KEY}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`;
}

const JoinReferralPage = () => {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();
  const [status, setStatus] = useState<"loading" | "valid" | "invalid">("loading");
  const [nutritionistName, setNutritionistName] = useState("");

  useEffect(() => {
    if (!code) {
      setStatus("invalid");
      return;
    }

    const validate = async () => {
      try {
        // We can check if the coupon exists via the public edge function
        // But since we don't need auth for just saving, let's validate via a simple anon query
        const { data, error } = await supabase
          .from("nutritionist_coupons" as any)
          .select("coupon_code, nutritionist_user_id, is_active, profiles:nutritionist_user_id(full_name)")
          .eq("coupon_code", code.toUpperCase().trim())
          .eq("is_active", true)
          .single();

        if (error || !data) {
          setStatus("invalid");
          return;
        }

        // Save referral
        saveReferralCode(code);
        setNutritionistName((data as any).profiles?.full_name || "il tuo nutrizionista");
        setStatus("valid");
      } catch {
        setStatus("invalid");
      }
    };

    validate();
  }, [code]);

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <div className="relative bg-gradient-to-r from-primary to-primary-dark px-4 pb-16 pt-16 text-center">
        <img src={cibariusLogo} alt="Cibarius" className="mx-auto h-10 brightness-0 invert" />
        <div className="absolute bottom-0 left-0 right-0 translate-y-[1px]">
          <svg viewBox="0 0 1440 50" fill="none" xmlns="http://www.w3.org/2000/svg" className="block w-full">
            <path d="M0 0C0 0 360 50 720 50C1080 50 1440 0 1440 0V50H0V0Z" className="fill-background" />
          </svg>
        </div>
      </div>

      <div className="flex flex-1 items-start justify-center px-4 pt-8">
        <Card className="w-full max-w-md border-0 shadow-lg">
          <CardContent className="pt-6 text-center space-y-4">
            {status === "loading" && (
              <>
                <Loader2 className="h-10 w-10 animate-spin text-primary mx-auto" />
                <p className="text-muted-foreground">Verifica del codice referral...</p>
              </>
            )}

            {status === "valid" && (
              <>
                <CheckCircle className="h-12 w-12 text-primary mx-auto" />
                <h2 className="text-xl font-bold text-foreground">Invito ricevuto!</h2>
                <p className="text-muted-foreground">
                  <span className="font-semibold text-foreground">{nutritionistName}</span> ti ha invitato su Cibarius.
                </p>
                <p className="text-sm text-muted-foreground">
                  Registrati ora per ricevere uno sconto sul tuo abbonamento!
                </p>
                <div className="flex flex-col gap-2 pt-2">
                  <Button className="w-full" onClick={() => navigate("/auth/signup")}>
                    Registrati ora
                  </Button>
                  <Button variant="outline" className="w-full" onClick={() => navigate("/auth/login")}>
                    Ho già un account
                  </Button>
                </div>
              </>
            )}

            {status === "invalid" && (
              <>
                <XCircle className="h-12 w-12 text-destructive mx-auto" />
                <h2 className="text-xl font-bold text-foreground">Link non valido</h2>
                <p className="text-muted-foreground">
                  Il codice referral non è valido o è scaduto.
                </p>
                <Button variant="outline" className="w-full" onClick={() => navigate("/auth/signup")}>
                  Registrati comunque
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default JoinReferralPage;
