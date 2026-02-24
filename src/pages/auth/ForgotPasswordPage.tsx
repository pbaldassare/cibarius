import { useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Mail } from "lucide-react";

const ForgotPasswordPage = () => {
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setSubmitting(false);
    if (error) {
      toast({ variant: "destructive", title: "Errore", description: error.message });
    } else {
      setSent(true);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="items-center text-center">
          <div className="mb-2 text-4xl">📧</div>
          <CardTitle className="text-2xl">Password dimenticata</CardTitle>
          <CardDescription>Ti invieremo un link per reimpostare la password</CardDescription>
        </CardHeader>
        <CardContent>
          {sent ? (
            <div className="space-y-4 text-center">
              <p className="text-sm text-muted-foreground">
                Se l'indirizzo esiste, riceverai un'email con le istruzioni per reimpostare la password.
              </p>
              <Link to="/auth/login">
                <Button variant="outline" className="w-full">Torna al login</Button>
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <Input
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
              <Button type="submit" className="w-full" disabled={submitting}>
                {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Mail className="mr-2 h-4 w-4" />}
                Invia link
              </Button>
            </form>
          )}
          {!sent && (
            <p className="mt-4 text-center text-sm text-muted-foreground">
              <Link to="/auth/login" className="font-medium text-primary hover:underline">
                Torna al login
              </Link>
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ForgotPasswordPage;
