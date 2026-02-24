import { useState, useEffect } from "react";
import RestaurantAdminLayout from "@/components/RestaurantAdminLayout";
import { useRestaurant } from "@/hooks/useRestaurant";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { Loader2, UserPlus, Trash2 } from "lucide-react";
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

    // Find user by email in profiles
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("id")
      .eq("email", email.trim().toLowerCase())
      .maybeSingle();

    if (profileError || !profile) {
      toast({ variant: "destructive", title: "Utente non trovato", description: "Nessun utente registrato con questa email." });
      setAdding(false);
      return;
    }

    const { error } = await supabase
      .from("restaurant_members")
      .insert({ restaurant_id: restaurant.id, user_id: profile.id, member_role: "staff" });

    setAdding(false);
    if (error) {
      toast({ variant: "destructive", title: "Errore", description: error.message });
    } else {
      toast({ title: "Membro aggiunto" });
      setEmail("");
      fetchMembers();
    }
  };

  const handleRemove = async (memberId: string) => {
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
      <h1 className="mb-6 text-2xl font-bold text-foreground">Staff</h1>

      {/* Add member */}
      <Card className="mb-6 max-w-lg border-2 border-accent">
        <CardHeader>
          <CardTitle className="text-base">Aggiungi membro</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleAdd} className="flex gap-2">
            <Input
              type="email"
              placeholder="Email utente"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="flex-1"
            />
            <Button type="submit" disabled={adding}>
              {adding ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Members list */}
      <Card className="border-2 border-accent overflow-auto">
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
                      {m.member_role}
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
                    Nessun membro
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
