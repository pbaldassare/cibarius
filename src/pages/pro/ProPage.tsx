import { useEffect, useState } from "react";
import MobileHeader from "@/components/MobileHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { Users, TrendingUp, MessageSquare, UserPlus, Loader2, BookmarkCheck } from "lucide-react";

const ProPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [clientCount, setClientCount] = useState(0);
  const [recentNotes, setRecentNotes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const [linksRes, notesRes] = await Promise.all([
        supabase.from("client_links").select("id", { count: "exact" }).eq("professional_id", user.id).eq("status", "active"),
        supabase.from("professional_notes").select("*").eq("professional_id", user.id).order("created_at", { ascending: false }).limit(5),
      ]);
      setClientCount(linksRes.count ?? 0);
      setRecentNotes(notesRes.data ?? []);
      setLoading(false);
    };
    load();
  }, [user]);

  if (loading) {
    return (
      <div>
        <MobileHeader title="Dashboard Pro" />
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  return (
    <div>
      <MobileHeader title="Dashboard Pro" />
      <main className="px-4 py-5 space-y-4">
        {/* Stats */}
        <div className="grid grid-cols-2 gap-3">
          <Card className="border-2 border-accent cursor-pointer" onClick={() => navigate("/pro/clients")}>
            <CardContent className="flex flex-col items-center py-5">
              <Users className="h-8 w-8 text-primary mb-2" />
              <span className="text-2xl font-bold text-foreground">{clientCount}</span>
              <span className="text-xs text-muted-foreground">Clienti attivi</span>
            </CardContent>
          </Card>
          <Card className="border-2 border-accent">
            <CardContent className="flex flex-col items-center py-5">
              <TrendingUp className="h-8 w-8 text-primary mb-2" />
              <span className="text-2xl font-bold text-foreground">—</span>
              <span className="text-xs text-muted-foreground">Ultimi 7 giorni</span>
            </CardContent>
          </Card>
        </div>

        {/* Quick actions */}
        <div className="flex gap-2">
          <Button className="flex-1 gap-2" onClick={() => navigate("/pro/clients")}>
            <UserPlus className="h-4 w-4" /> Gestisci clienti
          </Button>
          <Button variant="outline" className="gap-2" onClick={() => navigate("/pro/templates")}>
            <BookmarkCheck className="h-4 w-4" /> Template
          </Button>
        </div>

        {/* Recent notes */}
        <Card className="border-2 border-accent">
          <CardHeader className="flex flex-row items-center gap-3 pb-2">
            <MessageSquare className="h-5 w-5 text-primary" />
            <CardTitle className="text-base">Note recenti</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {recentNotes.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nessuna nota ancora.</p>
            ) : (
              recentNotes.map((n) => (
                <div key={n.id} className="rounded-lg bg-secondary p-3">
                  <p className="text-xs text-muted-foreground mb-1">
                    {n.profiles?.full_name || n.profiles?.email || "Cliente"} — {new Date(n.created_at).toLocaleDateString("it-IT")}
                  </p>
                  <p className="text-sm text-foreground line-clamp-2">{n.note}</p>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default ProPage;
