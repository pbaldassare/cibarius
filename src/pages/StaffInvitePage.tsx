import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, ChefHat, XCircle } from "lucide-react";
import { LOGIN_PATH, SIGNUP_PATH, USER_HOME } from "@/lib/routes";
import { STAFF_HOME } from "@/lib/restaurant-tabs";
import { clearPendingInvite, savePendingInvite } from "@/lib/staff-invite";
import cibariusLogo from "@/assets/cibarius-logo.png";

type InviteStatus = "valid" | "used" | "expired" | "revoked" | "not_found";

const STATUS_MESSAGES: Record<Exclude<InviteStatus, "valid">, string> = {
  used: "Questo invito è già stato usato. Chiedi al titolare un nuovo link.",
  expired: "Questo invito è scaduto. Chiedi al titolare un nuovo link.",
  revoked: "Questo invito è stato annullato dal titolare.",
  not_found: "Invito non trovato. Controlla di aver aperto il link completo.",
};

/**
 * Pagina del link di invito nello staff di un ristorante.
 *
 * Senza sessione mostra il ristorante e manda a login o registrazione,
 * ricordando il token (vedi `staff-invite.ts`). Con la sessione chiede
 * conferma e chiama `accept_restaurant_invite`.
 */
const StaffInvitePage = () => {
  const { token = "" } = useParams<{ token: string }>();
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [status, setStatus] = useState<InviteStatus | null>(null);
  const [restaurantName, setRestaurantName] = useState("");
  const [accepting, setAccepting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase.rpc("restaurant_invite_preview", { _token: token });
      const row = Array.isArray(data) ? data[0] : null;
      if (!row) {
        setStatus("not_found");
        clearPendingInvite();
        return;
      }
      setRestaurantName(row.restaurant_name);
      setStatus(row.status as InviteStatus);
      if (row.status === "valid") savePendingInvite(token);
      else clearPendingInvite();
    };
    load();
  }, [token]);

  const accept = async () => {
    setAccepting(true);
    setError(null);
    const { error: rpcError } = await supabase.rpc("accept_restaurant_invite", { _token: token });
    setAccepting(false);
    if (rpcError) {
      setError(rpcError.message);
      return;
    }
    clearPendingInvite();
    navigate(STAFF_HOME, { replace: true });
  };

  const decline = () => {
    clearPendingInvite();
    navigate(USER_HOME, { replace: true });
  };

  const loading = authLoading || status === null;

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-sm">
        <CardContent className="space-y-5 p-6 text-center">
          <img src={cibariusLogo} alt="Cibarius" className="mx-auto h-8" />
          {loading ? (
            <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" />
          ) : status !== "valid" ? (
            <>
              <XCircle className="mx-auto h-10 w-10 text-destructive" />
              <p className="text-sm text-muted-foreground">{STATUS_MESSAGES[status]}</p>
              <Button variant="outline" className="w-full" onClick={() => navigate(user ? USER_HOME : LOGIN_PATH)}>
                {user ? "Vai alla tua app" : "Accedi"}
              </Button>
            </>
          ) : (
            <>
              <ChefHat className="mx-auto h-10 w-10 text-primary" />
              <div className="space-y-1">
                <h1 className="text-lg font-semibold text-foreground">Entra nello staff di {restaurantName}</h1>
                <p className="text-sm text-muted-foreground">
                  Potrai registrare controlli HACCP, temperature ed etichette delle preparazioni.
                </p>
              </div>
              {error && <p className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">{error}</p>}
              {user ? (
                <div className="space-y-2">
                  <Button className="w-full" onClick={accept} disabled={accepting}>
                    {accepting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Accetta invito
                  </Button>
                  <Button variant="ghost" className="w-full" onClick={decline} disabled={accepting}>
                    Non ora
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  <Button asChild className="w-full"><Link to={LOGIN_PATH}>Ho già un account</Link></Button>
                  <Button asChild variant="outline" className="w-full"><Link to={SIGNUP_PATH}>Crea un account</Link></Button>
                  <p className="text-xs text-muted-foreground">Dopo l'accesso tornerai qui per confermare.</p>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default StaffInvitePage;
