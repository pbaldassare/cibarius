import { useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Loader2, UserPlus } from "lucide-react";
import cibariusLogo from "@/assets/cibarius-logo.png";

const SignupPage = () => {
  const { session, loading } = useAuth();
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (session) return <Navigate to="/" replace />;

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: window.location.origin,
        data: { full_name: fullName, email },
      },
    });
    setSubmitting(false);
    if (error) {
      toast({ variant: "destructive", title: "Errore", description: error.message });
    } else {
      toast({ title: "Registrazione completata", description: "Controlla la tua email per confermare l'account." });
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <div className="relative bg-gradient-to-r from-primary to-primary-dark px-4 pb-12 pt-16 text-center">
        <img src={cibariusLogo} alt="Cibarius" className="mx-auto h-10 brightness-0 invert" />
        <div className="absolute bottom-0 left-0 right-0 translate-y-[1px]">
          <svg viewBox="0 0 1440 50" fill="none" xmlns="http://www.w3.org/2000/svg" className="block w-full">
            <path d="M0 0C0 0 360 50 720 50C1080 50 1440 0 1440 0V50H0V0Z" className="fill-background" />
          </svg>
        </div>
      </div>

      <div className="flex flex-1 items-start justify-center px-4 pt-4">
        <Card className="w-full max-w-md border-0 shadow-lg">
          <CardHeader className="items-center text-center">
            <CardTitle className="text-2xl text-foreground">Registrati</CardTitle>
            <CardDescription>Crea il tuo account per iniziare</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSignup} className="space-y-4">
              <Input type="text" placeholder="Nome completo" value={fullName} onChange={(e) => setFullName(e.target.value)} />
              <Input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required />
              <Input type="password" placeholder="Password (min. 6 caratteri)" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} />
              <Button type="submit" className="w-full" disabled={submitting}>
                {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UserPlus className="mr-2 h-4 w-4" />}
                Registrati
              </Button>
            </form>
            <p className="mt-4 text-center text-sm text-muted-foreground">
              Hai già un account?{" "}
              <Link to="/auth/login" className="font-medium text-primary hover:underline">Accedi</Link>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default SignupPage;
