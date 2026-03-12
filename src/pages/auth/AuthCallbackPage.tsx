import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import type { EmailOtpType } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";

const OTP_TYPES: EmailOtpType[] = ["signup", "recovery", "invite", "email", "email_change"];

const AuthCallbackPage = () => {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleCallback = async () => {
      try {
        const url = new URL(window.location.href);
        const code = url.searchParams.get("code");
        const tokenHash = url.searchParams.get("token_hash");
        const type = url.searchParams.get("type") as EmailOtpType | null;

        // PKCE/code flow
        if (code) {
          const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
          if (exchangeError) {
            setError(exchangeError.message);
            setTimeout(() => navigate("/auth/login", { replace: true }), 3000);
            return;
          }
        }

        // token_hash flow (used by some Supabase email links)
        if (tokenHash && type && OTP_TYPES.includes(type)) {
          const { error: verifyError } = await supabase.auth.verifyOtp({
            token_hash: tokenHash,
            type,
          });

          if (verifyError) {
            setError(verifyError.message);
            setTimeout(() => navigate("/auth/login", { replace: true }), 3000);
            return;
          }
        }

        const { data: { session }, error: sessionError } = await supabase.auth.getSession();

        if (sessionError) {
          setError(sessionError.message);
          setTimeout(() => navigate("/auth/login", { replace: true }), 3000);
          return;
        }

        // Check if there's a ?next= param (e.g. /reset-password)
        const nextPath = url.searchParams.get("next");

        if (session) {
          navigate(nextPath || "/", { replace: true });
          return;
        }

        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, nextSession) => {
          if ((event === "SIGNED_IN" || event === "TOKEN_REFRESHED" || event === "USER_UPDATED" || event === "PASSWORD_RECOVERY") && nextSession) {
            subscription.unsubscribe();
            navigate(nextPath || "/", { replace: true });
          }
        });

        setTimeout(() => {
          subscription.unsubscribe();
          navigate("/auth/login", { replace: true });
        }, 6000);
      } catch (err) {
        console.error("Auth callback unexpected error:", err);
        setError("Errore durante la verifica. Riprova ad accedere.");
        setTimeout(() => navigate("/auth/login", { replace: true }), 3000);
      }
    };

    handleCallback();
  }, [navigate]);

  return (
    <div className="flex h-screen flex-col items-center justify-center gap-4 bg-background">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
      {error ? (
        <p className="px-4 text-center text-sm text-destructive">{error}</p>
      ) : (
        <p className="text-sm text-muted-foreground">Verifica in corso…</p>
      )}
    </div>
  );
};

export default AuthCallbackPage;
