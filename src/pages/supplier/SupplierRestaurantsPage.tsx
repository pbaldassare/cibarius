import { useEffect, useState } from "react";
import MobileHeader from "@/components/MobileHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Building2, Plus, Copy, Loader2, UserX, Link2 } from "lucide-react";

const SupplierRestaurantsPage = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [supplier, setSupplier] = useState<any>(null);
  const [links, setLinks] = useState<any[]>([]);
  const [invites, setInvites] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [showInvites, setShowInvites] = useState(false);

  const loadData = async () => {
    if (!user) return;
    setLoading(true);

    const { data: sup } = await supabase.from("suppliers").select("*").eq("owner_user_id", user.id).single();
    if (!sup) { setLoading(false); return; }
    setSupplier(sup);

    const [linksRes, invitesRes] = await Promise.all([
      supabase.from("supplier_restaurants").select("*, restaurants(name, phone, address)").eq("supplier_id", sup.id).order("created_at", { ascending: false }),
      supabase.from("supplier_invites").select("*").eq("supplier_id", sup.id).order("created_at", { ascending: false }),
    ]);

    setLinks(linksRes.data ?? []);
    setInvites(invitesRes.data ?? []);
    setLoading(false);
  };

  useEffect(() => { loadData(); }, [user]);

  const generateInvite = async () => {
    if (!supplier) return;
    setCreating(true);
    const code = "S" + Math.random().toString(36).substring(2, 9).toUpperCase();
    const { error } = await supabase.from("supplier_invites").insert({
      supplier_id: supplier.id,
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

  const copyLink = (code: string) => {
    const url = `${window.location.origin}/supplier-invite?code=${code}`;
    navigator.clipboard.writeText(url);
    toast({ title: "Link copiato!" });
  };

  const revokeLink = async (linkId: string) => {
    const { error } = await supabase.from("supplier_restaurants").update({ status: "revoked" }).eq("id", linkId);
    if (!error) { toast({ title: "Collegamento revocato" }); loadData(); }
  };

  const disableInvite = async (invId: string) => {
    const { error } = await supabase.from("supplier_invites").update({ status: "disabled" }).eq("id", invId);
    if (!error) { toast({ title: "Invito disabilitato" }); loadData(); }
  };

  const activeLinks = links.filter((l) => l.status === "active");
  const otherLinks = links.filter((l) => l.status !== "active");
  const activeInvites = invites.filter((i) => i.status === "active");

  return (
    <div>
      <MobileHeader title="Ristoranti" />
      <main className="px-4 py-5 space-y-4">
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
          <div className="flex justify-center py-10"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
        ) : (
          <>
            <div>
              <h3 className="text-sm font-semibold text-muted-foreground mb-2">Ristoranti attivi ({activeLinks.length})</h3>
              {activeLinks.length === 0 ? (
                <Card className="border-2 border-accent">
                  <CardContent className="py-6 text-center">
                    <Building2 className="h-10 w-10 text-muted-foreground mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">Nessun ristorante collegato.</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-2">
                  {activeLinks.map((l) => (
                    <Card key={l.id} className="border-2 border-accent">
                      <CardContent className="flex items-center gap-3 py-3">
                        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">🏪</div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">{l.restaurants?.name || "Ristorante"}</p>
                          <p className="text-xs text-muted-foreground truncate">{l.restaurants?.address || l.restaurants?.phone || ""}</p>
                        </div>
                        <Button size="sm" variant="ghost" className="text-destructive" onClick={() => revokeLink(l.id)}>
                          <UserX className="h-4 w-4" />
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>

            {otherLinks.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-muted-foreground mb-2">Precedenti</h3>
                <div className="space-y-2">
                  {otherLinks.map((l) => (
                    <Card key={l.id} className="border border-border opacity-60">
                      <CardContent className="flex items-center gap-3 py-3">
                        <div className="h-10 w-10 rounded-full bg-secondary flex items-center justify-center">🏪</div>
                        <div className="flex-1"><p className="text-sm text-foreground truncate">{l.restaurants?.name || "Ristorante"}</p></div>
                        <Badge variant="secondary">{l.status === "revoked" ? "Revocato" : l.status}</Badge>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        <Dialog open={showInvites} onOpenChange={setShowInvites}>
          <DialogContent className="max-w-sm">
            <DialogHeader><DialogTitle>Inviti generati</DialogTitle></DialogHeader>
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
                        <Button size="icon" variant="ghost" onClick={() => copyLink(inv.invite_code)}><Copy className="h-4 w-4" /></Button>
                        <Button size="icon" variant="ghost" className="text-destructive" onClick={() => disableInvite(inv.id)}><UserX className="h-4 w-4" /></Button>
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

export default SupplierRestaurantsPage;
