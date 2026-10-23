import { useState, useEffect } from "react";
import RestaurantAdminLayout from "@/components/RestaurantAdminLayout";
import { useRestaurant } from "@/hooks/useRestaurant";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Link2, Trash2, Copy, Share2, Info } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { isNativeApp } from "@/lib/native";
import { SITE_URL } from "@/lib/site";
import { invitePath } from "@/lib/staff-invite";

interface MemberWithProfile {
  id: string;
  user_id: string;
  member_role: string;
  email: string;
  full_name: string | null;
}

interface PendingInvite {
  id: string;
  token: string;
  created_at: string;
  expires_at: string;
}

// Nell'app nativa l'origine e' locale: il link da condividere e' quello del sito.
const inviteUrl = (token: string) =>
  `${isNativeApp() ? SITE_URL : window.location.origin}${invitePath(token)}`;

const RestaurantAdminStaffPage = () => {
  const { restaurant, isLoading: restaurantLoading } = useRestaurant();
  const { toast } = useToast();
  const [members, setMembers] = useState<MemberWithProfile[]>([]);
  const [invites, setInvites] = useState<PendingInvite[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [removing, setRemoving] = useState<MemberWithProfile | null>(null);

  const fetchAll = async () => {
    if (!restaurant) return;
    setLoading(true);

    const [membersRes, invitesRes] = await Promise.all([
      supabase
        .from("restaurant_members")
        .select("id, user_id, member_role")
        .eq("restaurant_id", restaurant.id),
      supabase
        .from("restaurant_invites")
        .select("id, token, created_at, expires_at")
        .eq("restaurant_id", restaurant.id)
        .is("used_at", null)
        .is("revoked_at", null)
        .gt("expires_at", new Date().toISOString())
        .order("created_at", { ascending: false }),
    ]);

    const data = membersRes.data ?? [];
    const userIds = data.map((m) => m.user_id);
    const { data: profiles } = userIds.length
      ? await supabase.from("profiles").select("id, email, full_name").in("id", userIds)
      : { data: [] };
    const profileMap = new Map((profiles ?? []).map((p) => [p.id, p]));

    setMembers(
      data
        .map((m) => ({
          ...m,
          email: profileMap.get(m.user_id)?.email ?? "—",
          full_name: profileMap.get(m.user_id)?.full_name ?? null,
        }))
        .sort((a, b) => (a.member_role === "owner" ? -1 : b.member_role === "owner" ? 1 : 0)),
    );
    setInvites((invitesRes.data ?? []) as PendingInvite[]);
    setLoading(false);
  };

  useEffect(() => {
    if (!restaurantLoading && restaurant) fetchAll();
  }, [restaurant, restaurantLoading]);

  const copyLink = async (token: string) => {
    try {
      await navigator.clipboard.writeText(inviteUrl(token));
      toast({ title: "Link copiato", description: "Mandalo al collaboratore, ad esempio su WhatsApp." });
    } catch {
      toast({ variant: "destructive", title: "Copia non riuscita", description: inviteUrl(token) });
    }
  };

  const shareLink = async (token: string) => {
    if (!navigator.share) return copyLink(token);
    try {
      await navigator.share({
        title: `Invito nello staff di ${restaurant?.name ?? "Cibarius"}`,
        text: "Apri il link per entrare nello staff del ristorante su Cibarius:",
        url: inviteUrl(token),
      });
    } catch {
      // condivisione annullata
    }
  };

  const createInvite = async () => {
    if (!restaurant) return;
    setCreating(true);
    const { data, error } = await supabase
      .from("restaurant_invites")
      .insert({ restaurant_id: restaurant.id })
      .select("id, token, created_at, expires_at")
      .single();
    setCreating(false);
    if (error || !data) {
      toast({ variant: "destructive", title: "Errore", description: error?.message ?? "Invito non creato" });
      return;
    }
    setInvites((prev) => [data as PendingInvite, ...prev]);
    shareLink(data.token);
  };

  const revokeInvite = async (id: string) => {
    const { error } = await supabase
      .from("restaurant_invites")
      .update({ revoked_at: new Date().toISOString() })
      .eq("id", id);
    if (error) {
      toast({ variant: "destructive", title: "Errore", description: error.message });
      return;
    }
    setInvites((prev) => prev.filter((i) => i.id !== id));
    toast({ title: "Invito annullato" });
  };

  const handleRemove = async () => {
    if (!removing) return;
    const { error } = await supabase.from("restaurant_members").delete().eq("id", removing.id);
    setRemoving(null);
    if (error) {
      toast({ variant: "destructive", title: "Errore", description: error.message });
    } else {
      toast({ title: "Collaboratore rimosso" });
      fetchAll();
    }
  };

  if (restaurantLoading) {
    return (
      <RestaurantAdminLayout>
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </RestaurantAdminLayout>
    );
  }

  return (
    <RestaurantAdminLayout>
      <h1 className="mb-6 text-2xl font-bold text-foreground">Staff</h1>

      <Card className="mb-6 max-w-2xl">
        <CardHeader>
          <CardTitle className="text-base">Invita un collaboratore</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-start gap-2 rounded-xl bg-muted/60 p-3">
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              Crea un link e mandalo al collaboratore: lo apre, accede o si registra ed entra nello staff.
              Ogni link vale per una persona e scade dopo 7 giorni. Lo staff usa solo la parte HACCP:
              controlli, temperature, storico ed etichette. Configurazione, magazzino, documenti e
              backoffice restano a te.
            </p>
          </div>
          <Button onClick={createInvite} disabled={creating || !restaurant} className="gap-2">
            {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Link2 className="h-4 w-4" />}
            Crea link di invito
          </Button>

          {invites.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-medium text-foreground">Inviti in attesa</p>
              {invites.map((inv) => (
                <div key={inv.id} className="flex flex-wrap items-center gap-2 rounded-lg border border-border p-2">
                  <span className="min-w-0 flex-1 truncate font-mono text-xs text-muted-foreground">
                    {inviteUrl(inv.token)}
                  </span>
                  <span className="text-xs text-muted-foreground">scade il {format(new Date(inv.expires_at), "dd/MM")}</span>
                  <Button variant="ghost" size="sm" onClick={() => copyLink(inv.token)} aria-label="Copia link">
                    <Copy className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => shareLink(inv.token)} aria-label="Condividi link">
                    <Share2 className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => revokeInvite(inv.id)}
                    className="text-destructive hover:text-destructive"
                    aria-label="Annulla invito"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="overflow-auto">
        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Ruolo</TableHead>
                <TableHead className="w-16" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {members.map((m) => (
                <TableRow key={m.id}>
                  <TableCell className="text-sm">{m.full_name || "—"}</TableCell>
                  <TableCell className="text-sm">{m.email}</TableCell>
                  <TableCell>
                    <Badge variant={m.member_role === "owner" ? "default" : "secondary"}>
                      {m.member_role === "owner" ? "Titolare" : "Staff"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {m.member_role !== "owner" && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setRemoving(m)}
                        className="text-destructive hover:text-destructive"
                        aria-label={`Rimuovi ${m.full_name || m.email}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
              {members.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="py-8 text-center text-muted-foreground">
                    Nessun membro
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        )}
      </Card>

      <AlertDialog open={!!removing} onOpenChange={(o) => !o && setRemoving(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Rimuovere {removing?.full_name || removing?.email}?</AlertDialogTitle>
            <AlertDialogDescription>
              Non potrà più registrare controlli per il ristorante. I controlli già registrati restano nel registro.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annulla</AlertDialogCancel>
            <AlertDialogAction onClick={handleRemove}>Rimuovi</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </RestaurantAdminLayout>
  );
};

export default RestaurantAdminStaffPage;
