import { useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Loader2, LogIn } from "lucide-react";

const LoginPage = () => {
  const { session, loading } = useAuth();
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (session) return <Navigate to="/" replace />;

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
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="items-center text-center">
          <div className="mb-2 text-4xl">🍏</div>
          <CardTitle className="text-2xl">Accedi</CardTitle>
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
            <Input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
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
  );
};

export default LoginPage;
