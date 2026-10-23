import { useState } from "react";
import MobileHeader from "@/components/MobileHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useRestaurant } from "@/hooks/useRestaurant";
import { useToast } from "@/hooks/use-toast";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Loader2, Truck, ShieldCheck, Link2 } from "lucide-react";

const SupplierInvitePage = () => {
  const { user } = useAuth();
  const { restaurant } = useRestaurant();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [code, setCode] = useState(searchParams.get("code") ?? "");
  const [loading, setLoading] = useState(false);
  const [supplierInfo, setSupplierInfo] = useState<{ name: string } | null>(null);
  const [step, setStep] = useState<"input" | "confirm" | "done">("input");

  // Il collegamento passa dalle funzioni del database: il codice non e' piu'
  // leggibile da chiunque e viene consumato da accept_supplier_invite.
  const validateCode = async () => {
    if (!code.trim() || !user) return;
    setLoading(true);

    const { data } = await supabase.rpc("supplier_invite_preview", { _code: code });
    const row = Array.isArray(data) ? data[0] : null;

    if (!row) {
      toast({ variant: "destructive", title: "Codice non valido", description: "Il codice invito non esiste o è già stato usato." });
      setLoading(false);
      return;
    }

    setSupplierInfo({ name: row.supplier_name });
    setStep("confirm");
    setLoading(false);
  };

  const confirmLink = async () => {
    if (!user || !supplierInfo || !restaurant) return;
    setLoading(true);

    const { error } = await supabase.rpc("accept_supplier_invite", { _code: code });
    setLoading(false);
    if (error) {
      toast({ variant: "destructive", title: "Errore", description: error.message });
      return;
    }

    setStep("done");
    toast({ title: "Fornitore collegato!" });
  };

  if (!restaurant) {
    return (
      <div>
        <MobileHeader title="Collega Fornitore" />
        <main className="px-4 py-5">
          <Card>
            <CardContent className="py-8 text-center">
              <p className="text-sm text-muted-foreground">Devi avere un ristorante per collegare un fornitore.</p>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  return (
    <div>
      <MobileHeader title="Collega Fornitore" />
      <main className="px-4 py-5 space-y-4">
        {step === "input" && (
          <Card>
            <CardHeader className="items-center pb-2">
              <Link2 className="h-10 w-10 text-primary mb-2" />
              <CardTitle className="text-lg">Inserisci codice fornitore</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground text-center">
                Il tuo fornitore ti ha dato un codice? Inseriscilo qui per collegarlo al tuo ristorante.
              </p>
              <Input
                placeholder="Es. SA1B2C3"
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

        {step === "confirm" && supplierInfo && (
          <Card>
            <CardHeader className="items-center pb-2">
              <ShieldCheck className="h-10 w-10 text-primary mb-2" />
              <CardTitle className="text-lg">Conferma collegamento</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-xl bg-secondary p-4 text-center">
                <p className="text-sm font-medium text-foreground">{supplierInfo.name}</p>
              </div>
              <p className="text-xs text-muted-foreground text-center">
                Il fornitore potrà vedere il tuo ristorante nell'elenco. Potrai vedere il suo catalogo e inviargli ordini.
              </p>
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={() => setStep("input")} disabled={loading}>Annulla</Button>
                <Button className="flex-1" onClick={confirmLink} disabled={loading}>
                  {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  Conferma
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {step === "done" && (
          <Card>
            <CardHeader className="items-center pb-2">
              <Truck className="h-10 w-10 text-primary mb-2" />
              <CardTitle className="text-lg">Collegato!</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-center">
              <p className="text-sm text-muted-foreground">
                Il fornitore è ora collegato al tuo ristorante.
              </p>
              <Button className="w-full" onClick={() => navigate("/restaurant/suppliers")}>
                Vai ai fornitori
              </Button>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
};

export default SupplierInvitePage;
