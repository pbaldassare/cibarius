import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import type { EmailOtpType } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { applyPendingSignupIntent } from "@/lib/googleAuth";
import { getRoleHomePath, type AppRole } from "@/hooks/useRole";
import { Loader2 } from "lucide-react";

const OTP_TYPES: EmailOtpType[] = ["signup", "recovery", "invite", "email", "email_change"];

/**
 * Dove mandare chi rientra dal redirect.
 *
 * Il ruolo va riletto adesso: se l'utente arriva da una registrazione con
 * Google, `complete_oauth_signup` lo ha appena cambiato. La radice "/" non e'
 * piu' una destinazione valida, ospita il sito pubblico.
 */
const resolveHomePath = async (userId: string): Promise<string> => {
  const { data } = await supabase.from("profiles").select("role").eq("id", userId).maybeSingle();
  return getRoleHomePath((data?.role as AppRole | undefined) ?? null);
};

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

        const goHome = async (userId: string) => {
          // Il tipo di account scelto prima di passare da Google esiste solo
          // nel browser: applicarlo prima di decidere dove atterrare.
          await applyPendingSignupIntent();
          navigate(nextPath || (await resolveHomePath(userId)), { replace: true });
        };

        if (session) {
          await goHome(session.user.id);
          return;
        }

        /*
         * L'attesa va fermata appena la sessione arriva. Senza, il rinvio di
         * sotto scattava comunque sei secondi dopo e sbatteva fuori dall'app
         * chi era appena entrato: `navigate` continua a funzionare anche a
         * componente smontato.
         */
        let settled = false;

        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, nextSession) => {
          if ((event === "SIGNED_IN" || event === "TOKEN_REFRESHED" || event === "USER_UPDATED" || event === "PASSWORD_RECOVERY") && nextSession) {
            settled = true;
            subscription.unsubscribe();
            void goHome(nextSession.user.id);
          }
        });

        setTimeout(() => {
          if (settled) return;
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
