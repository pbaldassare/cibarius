import { useState, useEffect } from "react";
import RestaurantAdminLayout from "@/components/RestaurantAdminLayout";
import { useRestaurant } from "@/hooks/useRestaurant";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { Loader2, UserPlus, Trash2, Info } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface MemberWithProfile {
  id: string;
  user_id: string;
  member_role: string;
  email: string;
  full_name: string | null;
}

const RestaurantAdminStaffPage = () => {
  const { restaurant, isLoading: restaurantLoading } = useRestaurant();
  const { toast } = useToast();
  const [members, setMembers] = useState<MemberWithProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [adding, setAdding] = useState(false);

  const fetchMembers = async () => {
    if (!restaurant) return;
    setLoading(true);

    const { data, error } = await supabase
      .from("restaurant_members")
      .select("id, user_id, member_role")
      .eq("restaurant_id", restaurant.id);

    if (error || !data) {
      setLoading(false);
      return;
    }

    // Fetch profile info for each member
    const userIds = data.map((m) => m.user_id);
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, email, full_name")
      .in("id", userIds);

    const profileMap = new Map((profiles ?? []).map((p) => [p.id, p]));

    const merged: MemberWithProfile[] = data.map((m) => ({
      ...m,
      email: profileMap.get(m.user_id)?.email ?? "—",
      full_name: profileMap.get(m.user_id)?.full_name ?? null,
    }));

    setMembers(merged);
    setLoading(false);
  };

  useEffect(() => {
    if (!restaurantLoading && restaurant) fetchMembers();
  }, [restaurant, restaurantLoading]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!restaurant) return;
    setAdding(true);
    const { data, error } = await supabase.functions.invoke("invite-staff", {
      body: { email: email.trim(), full_name: fullName.trim() },
    });
    setAdding(false);
    // Con status != 2xx il messaggio della funzione sta nel corpo della risposta.
    const message = data?.error ?? (error && (await (error as { context?: Response }).context?.json?.().catch(() => null))?.error) ?? error?.message;
    if (message) {
      toast({ variant: "destructive", title: "Invito non riuscito", description: message });
    } else {
      toast({ title: "Invito inviato", description: `${email.trim()} riceverà una mail per scegliere la password.` });
      setEmail("");
      setFullName("");
      fetchMembers();
    }
  };

  const handleRemove = async (memberId: string) => {
    if (!window.confirm("Togliere l'accesso a questo operatore?")) return;
    const { error } = await supabase
      .from("restaurant_members")
      .delete()
      .eq("id", memberId);

    if (error) {
      toast({ variant: "destructive", title: "Errore", description: error.message });
    } else {
      toast({ title: "Membro rimosso" });
      fetchMembers();
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
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-bold text-foreground">Operatori</h1>
      </div>

      <Card className="mb-6 max-w-lg">
        <CardHeader>
          <CardTitle className="text-base">Invita un operatore</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-start gap-2 rounded-xl bg-muted/60 p-3">
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              L'operatore riceve una mail per scegliere la password. Vede solo l'app operativa
              (scadenze, magazzino, HACCP, etichette) e i controlli che registra portano il suo nome.
            </p>
          </div>
          <form onSubmit={handleAdd} className="space-y-2">
            <Input placeholder="Nome e cognome" value={fullName} onChange={(e) => setFullName(e.target.value)} required />
            <div className="flex gap-2">
              <Input
                type="email"
                placeholder="Email operatore"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="flex-1"
              />
              <Button type="submit" disabled={adding} className="gap-2">
                {adding ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
                Invita
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Members list */}
      <Card className="overflow-auto">
        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Email</TableHead>
                <TableHead>Nome</TableHead>
                <TableHead>Ruolo</TableHead>
                <TableHead className="w-16" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {members.map((m) => (
                <TableRow key={m.id}>
                  <TableCell className="text-sm">{m.email}</TableCell>
                  <TableCell className="text-sm">{m.full_name || "—"}</TableCell>
                  <TableCell>
                    <Badge variant={m.member_role === "owner" ? "default" : "secondary"}>
                      {m.member_role === "owner" ? "Titolare" : "Operatore"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {m.member_role !== "owner" && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemove(m.id)}
                        className="text-destructive hover:text-destructive"
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
                    Nessun operatore
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        )}
      </Card>
    </RestaurantAdminLayout>
  );
};

export default RestaurantAdminStaffPage;
