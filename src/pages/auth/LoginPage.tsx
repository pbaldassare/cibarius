import { useState, useEffect } from "react";
import { Link, useNavigate, Navigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useRole, getRoleHomePath } from "@/hooks/useRole";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Loader2, LogIn, Eye, EyeOff } from "lucide-react";
import cibariusLogo from "@/assets/cibarius-logo.png";

const LoginPage = () => {
  const { session, loading } = useAuth();
  const { role, isLoading: roleLoading } = useRole();
  const navigate = useNavigate();
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

  if (session && role) {
    return <Navigate to={getRoleHomePath(role)} replace />;
  }
  if (session && !role) {
    return <Navigate to="/" replace />;
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setSubmitting(false);
    if (error) {
      toast({ variant: "destructive", title: "Errore di accesso", description: error.message });
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Top gradient area */}
      <div className="relative bg-gradient-to-r from-primary to-primary-dark px-4 pb-12 pt-16 text-center">
        <img src={cibariusLogo} alt="Cibarius" className="mx-auto h-10 brightness-0 invert" />
        {/* Wave */}
        <div className="absolute bottom-0 left-0 right-0 translate-y-[1px]">
          <svg viewBox="0 0 1440 50" fill="none" xmlns="http://www.w3.org/2000/svg" className="block w-full">
            <path d="M0 0C0 0 360 50 720 50C1080 50 1440 0 1440 0V50H0V0Z" className="fill-background" />
          </svg>
        </div>
      </div>

      <div className="flex flex-1 items-start justify-center px-4 pt-4">
        <Card className="w-full max-w-md border-0 shadow-lg">
          <CardHeader className="items-center text-center">
            <CardTitle className="text-2xl text-foreground">Accedi</CardTitle>
            <CardDescription>Inserisci le tue credenziali per continuare</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <Input
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
              <div className="relative">
                <Input
                  type={showPassword ? "text" : "password"}
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <Button type="submit" className="w-full" disabled={submitting}>
                {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <LogIn className="mr-2 h-4 w-4" />}
                Accedi
              </Button>
            </form>
            <div className="mt-4 space-y-2 text-center text-sm">
              <p className="text-muted-foreground">
                Non hai un account?{" "}
                <Link to="/auth/signup" className="font-medium text-primary hover:underline">
                  Registrati
                </Link>
              </p>
              <Link to="/auth/forgot" className="text-muted-foreground hover:text-primary hover:underline">
                Password dimenticata?
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default LoginPage;
