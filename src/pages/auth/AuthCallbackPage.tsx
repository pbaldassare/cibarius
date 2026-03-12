import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";

/**
 * Processes Supabase auth tokens from email confirmation links.
 * Supabase appends tokens as URL hash fragments; the JS client
 * automatically detects and exchanges them when this page loads.
 */
const AuthCallbackPage = () => {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleCallback = async () => {
      try {
        // The Supabase client auto-detects hash params (#access_token=...&type=signup)
        // and exchanges them. We just need to wait for the session.
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();

        if (sessionError) {
          console.error("Auth callback error:", sessionError);
          setError(sessionError.message);
          setTimeout(() => navigate("/auth/login", { replace: true }), 3000);
          return;
        }

        if (session) {
          // User is authenticated, redirect to home
          navigate("/", { replace: true });
        } else {
          // No session yet — might need a moment for the token exchange
          // Listen for auth state change
          const { data: { subscription } } = supabase.auth.onAuthStateChange(
            (event, session) => {
              if (event === "SIGNED_IN" && session) {
                subscription.unsubscribe();
                navigate("/", { replace: true });
              } else if (event === "TOKEN_REFRESHED" || event === "USER_UPDATED") {
                subscription.unsubscribe();
                navigate("/", { replace: true });
              }
            }
          );

          // Timeout fallback: if no auth event fires within 5 seconds,
          // redirect to login with a success message
          setTimeout(() => {
            subscription.unsubscribe();
            navigate("/auth/login", { replace: true });
          }, 5000);
        }
      } catch (err) {
        console.error("Auth callback unexpected error:", err);
        setError("Errore durante la verifica. Riprova ad accedere.");
        setTimeout(() => navigate("/auth/login", { replace: true }), 3000);
      }
    };

    handleCallback();
  }, [navigate]);

  return (
    <div className="flex h-screen flex-col items-center justify-center bg-background gap-4">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
      {error ? (
        <p className="text-sm text-destructive text-center px-4">{error}</p>
      ) : (
        <p className="text-sm text-muted-foreground">Verifica in corso…</p>
      )}
    </div>
  );
};

export default AuthCallbackPage;
