import { useState, useEffect } from "react";
import AdminLayout from "@/components/AdminLayout";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CheckCircle, XCircle, AlertTriangle, Lightbulb, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { it } from "date-fns/locale";

interface SupportRequest {
  id: string;
  user_id: string;
  type: string;
  message: string;
  status: string;
  admin_notes: string | null;
  created_at: string;
  resolved_at: string | null;
  user_email?: string;
  user_name?: string;
}

const AdminSupportPage = () => {
  const { toast } = useToast();
  const [requests, setRequests] = useState<SupportRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("open");
  const [notes, setNotes] = useState<Record<string, string>>({});

  const fetchRequests = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("support_requests" as any)
      .select("*")
      .eq("status", filter)
      .order("created_at", { ascending: false });

    if (error) {
      toast({ variant: "destructive", title: "Errore", description: error.message });
      setLoading(false);
      return;
    }

    // Fetch user emails
    const userIds = [...new Set((data as any[]).map((r: any) => r.user_id))];
    let profileMap: Record<string, { email: string; full_name: string | null }> = {};
    if (userIds.length > 0) {
      const { data: profiles } = await supabase.from("profiles").select("id, email, full_name").in("id", userIds);
      if (profiles) {
        profiles.forEach((p: any) => { profileMap[p.id] = { email: p.email, full_name: p.full_name }; });
      }
    }

    setRequests((data as any[]).map((r: any) => ({
      ...r,
      user_email: profileMap[r.user_id]?.email || "—",
      user_name: profileMap[r.user_id]?.full_name || null,
    })));
    setLoading(false);
  };

  useEffect(() => { fetchRequests(); }, [filter]);

  const updateStatus = async (id: string, status: string) => {
    const updates: any = { status, resolved_at: status === "resolved" ? new Date().toISOString() : null };
    if (notes[id]) updates.admin_notes = notes[id];

    const { error } = await supabase.from("support_requests" as any).update(updates).eq("id", id);
    if (error) {
      toast({ variant: "destructive", title: "Errore", description: error.message });
    } else {
      toast({ title: status === "resolved" ? "Segnalazione risolta" : "Segnalazione chiusa" });
      fetchRequests();
    }
  };

  const typeConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive"; icon: any }> = {
    problema: { label: "Problema", variant: "destructive", icon: AlertTriangle },
    suggerimento: { label: "Suggerimento", variant: "secondary", icon: Lightbulb },
    delete_account: { label: "Elimina Account", variant: "destructive", icon: Trash2 },
  };

  return (
    <AdminLayout>
      <h1 className="mb-4 text-2xl font-bold text-foreground">Segnalazioni Utenti</h1>

      <Tabs value={filter} onValueChange={setFilter} className="mb-5">
        <TabsList>
          <TabsTrigger value="open">Aperte</TabsTrigger>
          <TabsTrigger value="resolved">Risolte</TabsTrigger>
          <TabsTrigger value="closed">Chiuse</TabsTrigger>
        </TabsList>
      </Tabs>

      {loading ? (
        <p className="text-muted-foreground text-sm">Caricamento…</p>
      ) : requests.length === 0 ? (
        <p className="text-muted-foreground text-sm">Nessuna segnalazione {filter === "open" ? "aperta" : filter === "resolved" ? "risolta" : "chiusa"}.</p>
      ) : (
        <div className="space-y-3">
          {requests.map(req => {
            const tc = typeConfig[req.type] || typeConfig.problema;
            const Icon = tc.icon;
            return (
              <Card key={req.id}>
                <CardContent className="pt-4 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Icon className="h-4 w-4 shrink-0" />
                      <Badge variant={tc.variant}>{tc.label}</Badge>
                    </div>
                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                      {format(new Date(req.created_at), "dd MMM yyyy HH:mm", { locale: it })}
                    </span>
                  </div>

                  <p className="text-sm text-foreground">{req.message}</p>

                  <div className="text-xs text-muted-foreground">
                    <span className="font-medium">{req.user_name || "Utente"}</span> · {req.user_email}
                  </div>

                  {req.admin_notes && (
                    <div className="text-xs bg-muted/50 rounded-lg p-2 text-muted-foreground">
                      <span className="font-medium">Note admin:</span> {req.admin_notes}
                    </div>
                  )}

                  {filter === "open" && (
                    <div className="space-y-2 pt-1">
                      <Textarea
                        placeholder="Note admin (opzionale)…"
                        rows={2}
                        value={notes[req.id] || ""}
                        onChange={e => setNotes(n => ({ ...n, [req.id]: e.target.value }))}
                        className="text-sm"
                      />
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" className="flex-1 gap-1.5" onClick={() => updateStatus(req.id, "resolved")}>
                          <CheckCircle className="h-3.5 w-3.5" /> Risolto
                        </Button>
                        <Button size="sm" variant="outline" className="flex-1 gap-1.5 text-muted-foreground" onClick={() => updateStatus(req.id, "closed")}>
                          <XCircle className="h-3.5 w-3.5" /> Chiudi
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </AdminLayout>
  );
};

export default AdminSupportPage;
