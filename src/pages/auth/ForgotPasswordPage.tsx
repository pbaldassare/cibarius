import { useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Mail } from "lucide-react";
import cibariusLogo from "@/assets/cibarius-logo.png";

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
            <CardTitle className="text-2xl text-foreground">Password dimenticata</CardTitle>
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
                <Input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required />
                <Button type="submit" className="w-full" disabled={submitting}>
                  {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Mail className="mr-2 h-4 w-4" />}
                  Invia link
                </Button>
              </form>
            )}
            {!sent && (
              <p className="mt-4 text-center text-sm text-muted-foreground">
                <Link to="/auth/login" className="font-medium text-primary hover:underline">Torna al login</Link>
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ForgotPasswordPage;
