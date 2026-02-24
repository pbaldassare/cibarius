import { useEffect, useState } from "react";
import MobileHeader from "@/components/MobileHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { Users, Plus, Copy, Loader2, UserX, Eye, Link2 } from "lucide-react";
import ListSkeleton from "@/components/ListSkeleton";
import EmptyState from "@/components/EmptyState";

interface ClientLink {
  id: string;
  client_user_id: string;
  status: string;
  invite_code: string;
  created_at: string;
  profiles?: { full_name: string | null; email: string } | null;
}

interface Invite {
  id: string;
  invite_code: string;
  status: string;
  created_at: string;
}

const ProClientsPage = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [clients, setClients] = useState<ClientLink[]>([]);
  const [invites, setInvites] = useState<Invite[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [showInvites, setShowInvites] = useState(false);

  const loadData = async () => {
    if (!user) return;
    setLoading(true);
    const [linksRes, invitesRes] = await Promise.all([
      supabase
        .from("client_links")
        .select("id, client_user_id, status, invite_code, created_at")
        .eq("professional_id", user.id)
        .order("created_at", { ascending: false }),
      supabase
        .from("professional_invites")
        .select("*")
        .eq("professional_id", user.id)
        .order("created_at", { ascending: false }),
    ]);

    const links = linksRes.data ?? [];
    // Fetch client profiles
    if (links.length > 0) {
      const clientIds = links.map((l) => l.client_user_id);
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name, email")
        .in("id", clientIds);
      const profileMap = new Map((profiles ?? []).map((p) => [p.id, p]));
      links.forEach((l: any) => {
        l.profiles = profileMap.get(l.client_user_id) ?? null;
      });
    }

    setClients(links);
    setInvites(invitesRes.data ?? []);
    setLoading(false);
  };

  useEffect(() => { loadData(); }, [user]);

  const generateInvite = async () => {
    if (!user) return;
    setCreating(true);
    const code = Math.random().toString(36).substring(2, 10).toUpperCase();
    const { error } = await supabase.from("professional_invites").insert({
      professional_id: user.id,
      invite_code: code,
    });
    setCreating(false);
    if (error) {
      toast({ variant: "destructive", title: "Errore", description: error.message });
    } else {
      toast({ title: "Invito creato!", description: `Codice: ${code}` });
      loadData();
    }
  };

  const copyInviteLink = (code: string) => {
    const url = `${window.location.origin}/invite?code=${code}`;
    navigator.clipboard.writeText(url);
    toast({ title: "Link copiato!" });
  };

  const revokeClient = async (linkId: string) => {
    const { error } = await supabase.from("client_links").update({ status: "revoked" }).eq("id", linkId);
    if (error) {
      toast({ variant: "destructive", title: "Errore", description: error.message });
    } else {
      toast({ title: "Accesso revocato" });
      loadData();
    }
  };

  const disableInvite = async (inviteId: string) => {
    const { error } = await supabase.from("professional_invites").update({ status: "disabled" }).eq("id", inviteId);
    if (!error) {
      toast({ title: "Invito disabilitato" });
      loadData();
    }
  };

  const activeClients = clients.filter((c) => c.status === "active");
  const otherClients = clients.filter((c) => c.status !== "active");
  const activeInvites = invites.filter((i) => i.status === "active");

  return (
    <div>
      <MobileHeader title="Clienti" />
      <main className="px-4 py-5 space-y-4">
        {/* Actions */}
        <div className="flex gap-2">
          <Button className="flex-1 gap-2" onClick={generateInvite} disabled={creating}>
            {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            Genera invito
          </Button>
          <Button variant="outline" className="gap-2" onClick={() => setShowInvites(true)}>
            <Link2 className="h-4 w-4" /> Inviti ({activeInvites.length})
          </Button>
        </div>

        {loading ? (
          <ListSkeleton count={3} variant="row" />
        ) : (
          <>
            {/* Active clients */}
            <div>
              <h3 className="text-sm font-semibold text-muted-foreground mb-2">
                Clienti attivi ({activeClients.length})
              </h3>
              {activeClients.length === 0 ? (
                <EmptyState
                  icon={Users}
                  title="Nessun cliente collegato"
                  description="Genera un invito per collegare i tuoi clienti."
                  actions={[{ label: "Genera invito", icon: Plus, onClick: generateInvite }]}
                />
              ) : (
                <div className="space-y-2">
                  {activeClients.map((c) => (
                    <Card key={c.id} className="border-2 border-accent">
                      <CardContent className="flex items-center gap-3 py-3">
                        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-lg">
                          👤
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">
                            {c.profiles?.full_name || "Senza nome"}
                          </p>
                          <p className="text-xs text-muted-foreground truncate">{c.profiles?.email}</p>
                        </div>
                        <Button size="sm" variant="ghost" onClick={() => navigate(`/pro/client/${c.client_user_id}`)}>
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button size="sm" variant="ghost" className="text-destructive" onClick={() => revokeClient(c.id)}>
                          <UserX className="h-4 w-4" />
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>

            {/* Revoked/other */}
            {otherClients.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-muted-foreground mb-2">Precedenti</h3>
                <div className="space-y-2">
                  {otherClients.map((c) => (
                    <Card key={c.id} className="border border-border opacity-60">
                      <CardContent className="flex items-center gap-3 py-3">
                        <div className="h-10 w-10 rounded-full bg-secondary flex items-center justify-center text-lg">👤</div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">
                            {c.profiles?.full_name || "Senza nome"}
                          </p>
                          <p className="text-xs text-muted-foreground truncate">{c.profiles?.email}</p>
                        </div>
                        <Badge variant="secondary">{c.status === "revoked" ? "Revocato" : c.status}</Badge>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {/* Invites modal */}
        <Dialog open={showInvites} onOpenChange={setShowInvites}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle>Inviti generati</DialogTitle>
            </DialogHeader>
            <div className="space-y-2 max-h-80 overflow-y-auto">
              {invites.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">Nessun invito.</p>
              ) : (
                invites.map((inv) => (
                  <div key={inv.id} className="flex items-center gap-2 rounded-lg border border-border p-3">
                    <code className="flex-1 text-sm font-mono">{inv.invite_code}</code>
                    <Badge variant={inv.status === "active" ? "default" : "secondary"}>
                      {inv.status === "active" ? "Attivo" : inv.status === "used" ? "Usato" : "Disabilitato"}
                    </Badge>
                    {inv.status === "active" && (
                      <>
                        <Button size="icon" variant="ghost" onClick={() => copyInviteLink(inv.invite_code)}>
                          <Copy className="h-4 w-4" />
                        </Button>
                        <Button size="icon" variant="ghost" className="text-destructive" onClick={() => disableInvite(inv.id)}>
                          <UserX className="h-4 w-4" />
                        </Button>
                      </>
                    )}
                  </div>
                ))
              )}
            </div>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
};

export default ProClientsPage;
