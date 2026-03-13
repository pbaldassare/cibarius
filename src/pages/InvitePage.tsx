import { useEffect, useState } from "react";
import MobileHeader from "@/components/MobileHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useSubscription } from "@/hooks/useSubscription";
import { useToast } from "@/hooks/use-toast";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Loader2, Search, MapPin, Briefcase, UserPlus, CheckCircle2, Clock, XCircle, Link2, ShieldCheck, UserCheck } from "lucide-react";
import UpgradeScreen from "@/components/UpgradeScreen";
import ListSkeleton from "@/components/ListSkeleton";
import EmptyState from "@/components/EmptyState";

interface ProfessionalProfile {
  user_id: string;
  display_name: string;
  specialization: string;
  city: string | null;
  bio: string | null;
  photo_url: string | null;
  experience_years: number | null;
  works_online: boolean | null;
  works_in_person: boolean | null;
}

type RequestStatus = "none" | "pending" | "approved" | "rejected";

const InvitePage = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { isActive: plusActive, isLoading: plusLoading } = useSubscription("user_plus");
  const [professionals, setProfessionals] = useState<ProfessionalProfile[]>([]);
  const [requestMap, setRequestMap] = useState<Record<string, RequestStatus>>({});
  const [linkedMap, setLinkedMap] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // Direct code flow state
  const [code, setCode] = useState(searchParams.get("code") ?? "");
  const [codeLoading, setCodeLoading] = useState(false);
  const [proProfile, setProProfile] = useState<any>(null);
  const [codeStep, setCodeStep] = useState<"input" | "confirm" | "done">("input");
  const [linked, setLinked] = useState(false);
  const defaultTab = searchParams.get("code") ? "code" : "search";

  const loadData = async () => {
    if (!user) return;
    setLoading(true);

    const [prosRes, reqRes, linksRes] = await Promise.all([
      supabase
        .from("professional_profiles")
        .select("user_id, display_name, specialization, city, bio, photo_url, experience_years, works_online, works_in_person")
        .order("display_name"),
      supabase
        .from("professional_link_requests")
        .select("professional_id, status")
        .eq("user_id", user.id),
      supabase
        .from("client_links")
        .select("professional_id, status")
        .eq("client_user_id", user.id)
        .eq("status", "active"),
    ]);

    setProfessionals(prosRes.data ?? []);

    const rMap: Record<string, RequestStatus> = {};
    (reqRes.data ?? []).forEach((r: any) => {
      rMap[r.professional_id] = r.status as RequestStatus;
    });
    setRequestMap(rMap);

    const lMap: Record<string, boolean> = {};
    (linksRes.data ?? []).forEach((l: any) => {
      lMap[l.professional_id] = true;
    });
    setLinkedMap(lMap);

    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, [user]);

  const sendRequest = async (proId: string) => {
    if (!user) return;
    setSending(proId);

    const { error } = await supabase.from("professional_link_requests").insert({
      user_id: user.id,
      professional_id: proId,
    });

    if (error) {
      if (error.code === "23505") {
        toast({ title: "Richiesta già inviata" });
      } else {
        toast({ variant: "destructive", title: "Errore", description: error.message });
      }
      setSending(null);
      return;
    }

    // Create in-app notification for the professional
    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name, email")
      .eq("id", user.id)
      .single();

    await supabase.from("in_app_notifications").insert({
      user_id: proId,
      type: "link_request",
      title: "Nuova richiesta di collegamento",
      body: `${profile?.full_name || profile?.email || "Un utente"} vorrebbe essere seguito da te.`,
      metadata: { request_user_id: user.id, request_user_name: profile?.full_name, request_user_email: profile?.email },
    });

    setRequestMap((prev) => ({ ...prev, [proId]: "pending" }));
    setSending(null);
    toast({ title: "Richiesta inviata!", description: "Il nutrizionista riceverà la tua richiesta." });
  };

  const getStatus = (proId: string): RequestStatus => {
    if (linkedMap[proId]) return "approved";
    return requestMap[proId] ?? "none";
  };

  const filtered = professionals.filter((p) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      p.display_name.toLowerCase().includes(q) ||
      (p.specialization?.toLowerCase().includes(q)) ||
      (p.city?.toLowerCase().includes(q))
    );
  });

  if (!plusActive && !plusLoading) {
    return (
      <div>
        <MobileHeader title="Collega Nutrizionista" showBack />
        <UpgradeScreen planType="user_plus" />
      </div>
    );
  }

  const validateCode = async () => {
    if (!code.trim() || !user) return;
    setCodeLoading(true);

    const { data: invite, error } = await supabase
      .from("professional_invites")
      .select("*")
      .eq("invite_code", code.trim().toUpperCase())
      .eq("status", "active")
      .single();

    if (error || !invite) {
      toast({ variant: "destructive", title: "Codice non valido", description: "Il codice invito non esiste o è già stato usato." });
      setCodeLoading(false);
      return;
    }

    const { data: existing } = await supabase
      .from("client_links")
      .select("id, status")
      .eq("professional_id", invite.professional_id)
      .eq("client_user_id", user.id)
      .single();

    if (existing && existing.status === "active") {
      toast({ title: "Già collegato", description: "Sei già collegato a questo professionista." });
      setCodeLoading(false);
      return;
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name, email")
      .eq("id", invite.professional_id)
      .single();

    setProProfile({ ...profile, professional_id: invite.professional_id, invite_id: invite.id, invite_code: invite.invite_code });
    setCodeStep("confirm");
    setCodeLoading(false);
  };

  const confirmLink = async () => {
    if (!user || !proProfile) return;
    setCodeLoading(true);

    const { error: linkErr } = await supabase.from("client_links").insert({
      professional_id: proProfile.professional_id,
      client_user_id: user.id,
      status: "active",
      invite_code: proProfile.invite_code,
      activated_at: new Date().toISOString(),
    });

    if (linkErr) {
      if (linkErr.code === "23505") {
        await supabase
          .from("client_links")
          .update({ status: "active", activated_at: new Date().toISOString() })
          .eq("professional_id", proProfile.professional_id)
          .eq("client_user_id", user.id);
      } else {
        toast({ variant: "destructive", title: "Errore", description: linkErr.message });
        setCodeLoading(false);
        return;
      }
    }

    await supabase.from("professional_invites").update({ status: "used" }).eq("id", proProfile.invite_id);

    setLinked(true);
    setCodeStep("done");
    setCodeLoading(false);
    toast({ title: "Collegato con successo!" });
  };

  return (
    <div>
      <MobileHeader title="Collega Nutrizionista" />
      <main className="px-4 py-5 space-y-4">
        <Tabs defaultValue={defaultTab}>
          <TabsList className="w-full grid grid-cols-2">
            <TabsTrigger value="search" className="gap-1.5"><Search className="h-3.5 w-3.5" /> Cerca</TabsTrigger>
            <TabsTrigger value="code" className="gap-1.5"><Link2 className="h-3.5 w-3.5" /> Hai un codice?</TabsTrigger>
          </TabsList>

          {/* TAB: Search professionals */}
          <TabsContent value="search" className="space-y-4 mt-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Cerca per nome, specializzazione, città..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>

            {loading ? (
              <ListSkeleton />
            ) : filtered.length === 0 ? (
              <EmptyState
                icon={UserPlus}
                title="Nessun nutrizionista trovato"
                description={search ? "Prova a modificare la ricerca." : "Non ci sono ancora nutrizionisti registrati."}
              />
            ) : (
              <div className="space-y-3">
                {filtered.map((pro) => {
                  const status = getStatus(pro.user_id);
                  return (
                    <ProfessionalCard
                      key={pro.user_id}
                      pro={pro}
                      status={status}
                      isSending={sending === pro.user_id}
                      onRequest={() => sendRequest(pro.user_id)}
                    />
                  );
                })}
              </div>
            )}
          </TabsContent>

          {/* TAB: Direct code entry */}
          <TabsContent value="code" className="mt-4">
            {codeStep === "input" && (
              <Card className="border-2 border-accent">
                <CardHeader className="items-center pb-2">
                  <Link2 className="h-10 w-10 text-primary mb-2" />
                  <CardTitle className="text-lg">Inserisci codice invito</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm text-muted-foreground text-center">
                    Il tuo nutrizionista ti ha dato un codice? Inseriscilo qui per collegare il tuo account direttamente.
                  </p>
                  <Input
                    placeholder="Es. A1B2C3D4"
                    value={code}
                    onChange={(e) => setCode(e.target.value.toUpperCase())}
                    className="text-center text-lg font-mono tracking-widest"
                    maxLength={10}
                  />
                  <Button className="w-full" onClick={validateCode} disabled={codeLoading || !code.trim()}>
                    {codeLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                    Verifica codice
                  </Button>
                </CardContent>
              </Card>
            )}

            {codeStep === "confirm" && proProfile && (
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
                  <div className="flex gap-2">
                    <Button variant="outline" className="flex-1" onClick={() => setCodeStep("input")} disabled={codeLoading}>
                      Annulla
                    </Button>
                    <Button className="flex-1" onClick={confirmLink} disabled={codeLoading}>
                      {codeLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                      Conferma
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {codeStep === "done" && (
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
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

function ProfessionalCard({
  pro,
  status,
  isSending,
  onRequest,
}: {
  pro: ProfessionalProfile;
  status: RequestStatus;
  isSending: boolean;
  onRequest: () => void;
}) {
  return (
    <Card className="border border-border">
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          {pro.photo_url ? (
            <img src={pro.photo_url} alt="" className="h-12 w-12 rounded-full object-cover flex-shrink-0" />
          ) : (
            <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
              <span className="text-primary font-bold text-lg">{pro.display_name.charAt(0).toUpperCase()}</span>
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-foreground truncate">{pro.display_name}</p>
            {pro.specialization && (
              <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                <Briefcase className="h-3 w-3" />
                <span className="truncate">{pro.specialization}</span>
              </div>
            )}
            {pro.city && (
              <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                <MapPin className="h-3 w-3" />
                <span>{pro.city}</span>
              </div>
            )}
            {pro.bio && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{pro.bio}</p>}
            <div className="flex gap-1 mt-1.5 flex-wrap">
              {pro.works_online && <Badge variant="secondary" className="text-[10px] px-1.5 py-0">Online</Badge>}
              {pro.works_in_person && <Badge variant="secondary" className="text-[10px] px-1.5 py-0">In studio</Badge>}
              {pro.experience_years && (
                <Badge variant="outline" className="text-[10px] px-1.5 py-0">{pro.experience_years} anni exp.</Badge>
              )}
            </div>
          </div>
          <div className="flex-shrink-0">
            {status === "approved" && (
              <Badge className="bg-primary text-primary-foreground text-[10px]">
                <CheckCircle2 className="h-3 w-3 mr-1" /> Collegato
              </Badge>
            )}
            {status === "pending" && (
              <Badge variant="secondary" className="text-[10px]">
                <Clock className="h-3 w-3 mr-1" /> In attesa
              </Badge>
            )}
            {status === "rejected" && (
              <Badge variant="destructive" className="text-[10px]">
                <XCircle className="h-3 w-3 mr-1" /> Rifiutata
              </Badge>
            )}
            {status === "none" && (
              <Button size="sm" onClick={onRequest} disabled={isSending} className="text-xs">
                {isSending ? <Loader2 className="h-3 w-3 animate-spin" /> : <UserPlus className="h-3 w-3 mr-1" />}
                Richiedi
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default InvitePage;
