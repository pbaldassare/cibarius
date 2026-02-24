import { useEffect, useState } from "react";
import MobileHeader from "@/components/MobileHeader";
import { Card, CardContent } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Loader2, MessageSquare } from "lucide-react";

const ProNotesPage = () => {
  const { user } = useAuth();
  const [notes, setNotes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const { data } = await supabase
        .from("professional_notes")
        .select("*, profiles!professional_notes_client_user_id_fkey(full_name, email)")
        .eq("professional_id", user.id)
        .order("created_at", { ascending: false })
        .limit(50);
      setNotes(data ?? []);
      setLoading(false);
    };
    load();
  }, [user]);

  return (
    <div>
      <MobileHeader title="Note" />
      <main className="px-4 py-5 space-y-3">
        {loading ? (
          <div className="flex justify-center py-10"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
        ) : notes.length === 0 ? (
          <Card className="border-2 border-accent">
            <CardContent className="py-8 text-center">
              <MessageSquare className="h-10 w-10 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">Nessuna nota ancora. Vai nel dettaglio di un cliente per aggiungerne una.</p>
            </CardContent>
          </Card>
        ) : (
          notes.map((n) => (
            <Card key={n.id} className="border border-border">
              <CardContent className="py-3">
                <p className="text-xs text-muted-foreground mb-1">
                  {n.profiles?.full_name || n.profiles?.email || "Cliente"} — {new Date(n.created_at).toLocaleDateString("it-IT")}
                </p>
                <p className="text-sm text-foreground">{n.note}</p>
              </CardContent>
            </Card>
          ))
        )}
      </main>
    </div>
  );
};

export default ProNotesPage;
