import { useState } from "react";
import MobileHeader from "@/components/MobileHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Loader2, UserCheck, ShieldCheck, Link2 } from "lucide-react";

const InvitePage = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [code, setCode] = useState(searchParams.get("code") ?? "");
  const [loading, setLoading] = useState(false);
  const [proProfile, setProProfile] = useState<any>(null);
  const [linked, setLinked] = useState(false);
  const [step, setStep] = useState<"input" | "confirm" | "done">("input");

  const validateCode = async () => {
    if (!code.trim() || !user) return;
    setLoading(true);

    // Find active invite
    const { data: invite, error } = await supabase
      .from("professional_invites")
      .select("*")
      .eq("invite_code", code.trim().toUpperCase())
      .eq("status", "active")
      .single();

    if (error || !invite) {
      toast({ variant: "destructive", title: "Codice non valido", description: "Il codice invito non esiste o è già stato usato." });
      setLoading(false);
      return;
    }

    // Check if already linked
    const { data: existing } = await supabase
      .from("client_links")
      .select("id, status")
      .eq("professional_id", invite.professional_id)
      .eq("client_user_id", user.id)
      .single();

    if (existing && existing.status === "active") {
      toast({ title: "Già collegato", description: "Sei già collegato a questo professionista." });
      setLoading(false);
      return;
    }

    // Get professional profile
    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name, email")
      .eq("id", invite.professional_id)
      .single();

    setProProfile({ ...profile, professional_id: invite.professional_id, invite_id: invite.id, invite_code: invite.invite_code });
    setStep("confirm");
    setLoading(false);
  };

  const confirmLink = async () => {
    if (!user || !proProfile) return;
    setLoading(true);

    // Create client_link
    const { error: linkErr } = await supabase.from("client_links").insert({
      professional_id: proProfile.professional_id,
      client_user_id: user.id,
      status: "active",
      invite_code: proProfile.invite_code,
      activated_at: new Date().toISOString(),
    });

    if (linkErr) {
      // Might be unique conflict, try update
      if (linkErr.code === "23505") {
        await supabase
          .from("client_links")
          .update({ status: "active", activated_at: new Date().toISOString() })
          .eq("professional_id", proProfile.professional_id)
          .eq("client_user_id", user.id);
      } else {
        toast({ variant: "destructive", title: "Errore", description: linkErr.message });
        setLoading(false);
        return;
      }
    }

    // Mark invite as used (optional)
    await supabase.from("professional_invites").update({ status: "used" }).eq("id", proProfile.invite_id);

    setLinked(true);
    setStep("done");
    setLoading(false);
    toast({ title: "Collegato con successo!" });
  };

  return (
    <div>
      <MobileHeader title="Collega Nutrizionista" />
      <main className="px-4 py-5 space-y-4">
        {step === "input" && (
          <Card className="border-2 border-accent">
            <CardHeader className="items-center pb-2">
              <Link2 className="h-10 w-10 text-primary mb-2" />
              <CardTitle className="text-lg">Inserisci codice invito</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground text-center">
                Il tuo nutrizionista ti ha dato un codice? Inseriscilo qui per collegare il tuo account.
              </p>
              <Input
                placeholder="Es. A1B2C3D4"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                className="text-center text-lg font-mono tracking-widest"
                maxLength={10}
              />
              <Button className="w-full" onClick={validateCode} disabled={loading || !code.trim()}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Verifica codice
              </Button>
            </CardContent>
          </Card>
        )}

        {step === "confirm" && proProfile && (
          <Card className="border-2 border-accent">
            <CardHeader className="items-center pb-2">
              <ShieldCheck className="h-10 w-10 text-primary mb-2" />
              <CardTitle className="text-lg">Conferma collegamento</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-xl bg-secondary p-4 text-center">
                <p className="text-sm font-medium text-foreground">{proProfile.full_name || "Professionista"}</p>
                <p className="text-xs text-muted-foreground">{proProfile.email}</p>
              </div>
              <div className="rounded-xl border border-accent/30 bg-accent/5 p-3">
                <p className="text-sm text-foreground font-medium mb-1">Cosa condividerai:</p>
                <ul className="text-xs text-muted-foreground space-y-1 list-disc list-inside">
                  <li>I tuoi pasti e il diario alimentare</li>
                  <li>I tuoi obiettivi nutrizionali</li>
                  <li>Il professionista potrà lasciarti note e feedback</li>
                </ul>
              </div>
              <p className="text-xs text-muted-foreground text-center">
                Puoi revocare l'accesso in qualsiasi momento dal tuo profilo.
              </p>
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={() => setStep("input")} disabled={loading}>
                  Annulla
                </Button>
                <Button className="flex-1" onClick={confirmLink} disabled={loading}>
                  {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  Conferma
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {step === "done" && (
          <Card className="border-2 border-accent">
            <CardHeader className="items-center pb-2">
              <UserCheck className="h-10 w-10 text-primary mb-2" />
              <CardTitle className="text-lg">Collegato!</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-center">
              <p className="text-sm text-muted-foreground">
                Il tuo nutrizionista può ora vedere i tuoi pasti e obiettivi. Puoi revocare l'accesso in qualsiasi momento.
              </p>
              <Button className="w-full" onClick={() => navigate("/profile")}>
                Vai al profilo
              </Button>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
};

export default InvitePage;
