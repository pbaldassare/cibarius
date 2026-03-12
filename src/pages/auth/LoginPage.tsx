import { useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useRole, getRoleHomePath } from "@/hooks/useRole";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Loader2, LogIn, Eye, EyeOff, ArrowRight } from "lucide-react";
import cibariusLogo from "@/assets/cibarius-logo.png";
import AuthFeatureCarousel from "@/components/AuthFeatureCarousel";

const LoginPage = () => {
  const { session, loading } = useAuth();
  const { role, isLoading: roleLoading } = useRole();
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  if (loading || roleLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (session && role) return <Navigate to={getRoleHomePath(role)} replace />;
  if (session && !role) return <Navigate to="/" replace />;

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setSubmitting(false);
    if (error) {
      const isInvalidCreds = error.message.toLowerCase().includes("invalid login credentials");
      toast({
        variant: "destructive",
        title: "Errore di accesso",
        description: isInvalidCreds
          ? "Credenziali non valide. Se hai appena cliccato conferma email ma avevi già un account, usa la password originale o il recupero password."
          : error.message,
      });
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* ── Hero zone: gradient + logo + carousel ── */}
      <div className="relative bg-brand-gradient overflow-hidden">
        {/* Glass overlay */}
        <div className="absolute inset-0 bg-white/[0.08]" />

        <div className="relative z-10 flex flex-col items-center px-4 pt-14 pb-10">
          {/* Logo */}
          <img
            src={cibariusLogo}
            alt="Cibarius"
            className="h-9 brightness-0 invert mb-6"
          />

          {/* Carousel inside hero */}
          <div className="w-full max-w-sm">
            <AuthFeatureCarousel />
          </div>
        </div>

        {/* Wave transition */}
        <div className="absolute bottom-0 left-0 right-0 translate-y-[1px]">
          <svg viewBox="0 0 1440 44" fill="none" xmlns="http://www.w3.org/2000/svg" className="block w-full">
            <path d="M0 0C0 0 360 44 720 44C1080 44 1440 0 1440 0V44H0V0Z" className="fill-background" />
          </svg>
        </div>
      </div>

      {/* ── Login form ── */}
      <div className="flex flex-1 items-start justify-center px-5 -mt-1">
        <div className="w-full max-w-sm">
          {/* Title */}
          <div className="text-center mb-5 pt-4">
            <h1 className="font-display text-xl font-semibold text-foreground">
              Bentornato
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Accedi al tuo account
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-3">
            <Input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="h-11 rounded-xl bg-card border-border/60 shadow-card text-sm"
            />
            <div className="relative">
              <Input
                type={showPassword ? "text" : "password"}
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="h-11 rounded-xl bg-card border-border/60 shadow-card pr-11 text-sm"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>

            {/* Forgot link inline */}
            <div className="flex justify-end">
              <Link
                to="/auth/forgot"
                className="text-xs text-muted-foreground hover:text-primary transition-colors"
              >
                Password dimenticata?
              </Link>
            </div>

            <Button
              type="submit"
              disabled={submitting}
              className="w-full h-11 rounded-xl btn-brand text-sm font-semibold tracking-wide active:scale-[0.97] transition-transform"
            >
              {submitting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <LogIn className="mr-2 h-4 w-4" />
              )}
              Accedi
            </Button>
          </form>

          {/* Bottom links */}
          <div className="mt-6 flex flex-col items-center gap-3">
            <p className="text-sm text-muted-foreground">
              Non hai un account?{" "}
              <Link
                to="/auth/signup"
                className="font-semibold text-primary hover:underline inline-flex items-center gap-0.5"
              >
                Registrati <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
