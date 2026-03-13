import { useEffect, useState } from "react";
import MobileHeader from "@/components/MobileHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Plus, CalendarIcon, Clock, User } from "lucide-react";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import { cn } from "@/lib/utils";

interface Appointment {
  id: string;
  professional_id: string;
  client_user_id: string;
  title: string;
  starts_at: string;
  ends_at: string | null;
  notes: string | null;
  status: string;
  created_at: string;
  client_name?: string;
}

const STATUS_COLORS: Record<string, string> = {
  scheduled: "bg-primary/15 text-primary border-primary/30",
  completed: "bg-emerald-500/15 text-emerald-700 border-emerald-500/30",
  cancelled: "bg-destructive/10 text-destructive border-destructive/30",
};

const ProAppointmentsPage = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [clients, setClients] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);

  // Form state
  const [formClientId, setFormClientId] = useState("");
  const [formTitle, setFormTitle] = useState("Visita");
  const [formDate, setFormDate] = useState<Date | undefined>(new Date());
  const [formTime, setFormTime] = useState("10:00");
  const [formNotes, setFormNotes] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const [aptsRes, linksRes] = await Promise.all([
        supabase
          .from("appointments" as any)
          .select("*")
          .eq("professional_id", user.id)
          .order("starts_at", { ascending: true }),
        supabase
          .from("client_links")
          .select("id, client_user_id, status")
          .eq("professional_id", user.id)
          .eq("status", "active"),
      ]);

      const clientUserIds = (linksRes.data ?? []).map((l: any) => l.client_user_id);
      let clientsList: { id: string; name: string }[] = [];
      if (clientUserIds.length > 0) {
        const { data: profilesData } = await supabase
          .from("profiles")
          .select("id, full_name, email")
          .in("id", clientUserIds);
        clientsList = (profilesData ?? []).map((p: any) => ({
          id: p.id,
          name: p.full_name || p.email || "Cliente",
        }));
      }
      setClients(clientsList);

      const clientMap = Object.fromEntries(clientsList.map((c) => [c.id, c.name]));
      setAppointments(
        ((aptsRes.data as any[]) ?? []).map((a) => ({
          ...a,
          client_name: clientMap[a.client_user_id] || "Cliente",
        }))
      );
      setLoading(false);
    };
    load();
  }, [user]);

  const handleCreate = async () => {
    if (!user || !formClientId || !formDate) return;
    setSaving(true);

    const [hours, minutes] = formTime.split(":").map(Number);
    const startsAt = new Date(formDate);
    startsAt.setHours(hours, minutes, 0, 0);

    const { error } = await supabase.from("appointments" as any).insert({
      professional_id: user.id,
      client_user_id: formClientId,
      title: formTitle || "Visita",
      starts_at: startsAt.toISOString(),
      notes: formNotes || null,
    } as any);

    setSaving(false);
    if (error) {
      toast({ variant: "destructive", title: "Errore", description: error.message });
    } else {
      toast({ title: "Appuntamento creato" });
      setDialogOpen(false);
      setFormTitle("Visita");
      setFormNotes("");
      // Reload
      const { data } = await supabase
        .from("appointments" as any)
        .select("*")
        .eq("professional_id", user.id)
        .order("starts_at", { ascending: true });
      const clientMap = Object.fromEntries(clients.map((c) => [c.id, c.name]));
      setAppointments(
        ((data as any[]) ?? []).map((a) => ({
          ...a,
          client_name: clientMap[a.client_user_id] || "Cliente",
        }))
      );
    }
  };

  const upcoming = appointments.filter(
    (a) => a.status === "scheduled" && new Date(a.starts_at) >= new Date()
  );
  const past = appointments.filter(
    (a) => a.status !== "scheduled" || new Date(a.starts_at) < new Date()
  );

  if (loading) {
    return (
      <div>
        <MobileHeader title="Appuntamenti" />
        <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
      </div>
    );
  }

  return (
    <div>
      <MobileHeader title="Appuntamenti" />
      <main className="px-4 py-5 pb-28 space-y-4">
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="w-full gap-2">
              <Plus className="h-4 w-4" /> Nuovo appuntamento
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Nuovo appuntamento</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Cliente</Label>
                <Select value={formClientId} onValueChange={setFormClientId}>
                  <SelectTrigger><SelectValue placeholder="Seleziona cliente" /></SelectTrigger>
                  <SelectContent>
                    {clients.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Titolo</Label>
                <Input value={formTitle} onChange={(e) => setFormTitle(e.target.value)} />
              </div>
              <div>
                <Label>Data</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !formDate && "text-muted-foreground")}>
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {formDate ? format(formDate, "PPP", { locale: it }) : "Seleziona data"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar mode="single" selected={formDate} onSelect={setFormDate} initialFocus className="p-3 pointer-events-auto" />
                  </PopoverContent>
                </Popover>
              </div>
              <div>
                <Label>Ora</Label>
                <Input type="time" value={formTime} onChange={(e) => setFormTime(e.target.value)} />
              </div>
              <div>
                <Label>Note</Label>
                <Textarea value={formNotes} onChange={(e) => setFormNotes(e.target.value)} placeholder="Note opzionali..." />
              </div>
              <Button className="w-full" onClick={handleCreate} disabled={saving || !formClientId || !formDate}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Crea appuntamento
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Upcoming */}
        {upcoming.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-sm font-bold text-foreground">📅 Prossimi</h3>
            {upcoming.map((a) => (
              <AppointmentCard key={a.id} appointment={a} />
            ))}
          </div>
        )}

        {upcoming.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-6">Nessun appuntamento in programma.</p>
        )}

        {/* Past */}
        {past.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-sm font-bold text-muted-foreground">Passati</h3>
            {past.map((a) => (
              <AppointmentCard key={a.id} appointment={a} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

function AppointmentCard({ appointment: a }: { appointment: Appointment }) {
  const date = new Date(a.starts_at);
  return (
    <Card className="border border-border">
      <CardContent className="py-3 space-y-1.5">
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold text-foreground">{a.title}</span>
          <Badge className={`text-[10px] ${STATUS_COLORS[a.status] || ""}`}>{a.status}</Badge>
        </div>
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <CalendarIcon className="h-3 w-3" />
            {format(date, "d MMM yyyy", { locale: it })}
          </span>
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {format(date, "HH:mm")}
          </span>
          <span className="flex items-center gap-1">
            <User className="h-3 w-3" />
            {a.client_name}
          </span>
        </div>
        {a.notes && <p className="text-[11px] text-muted-foreground italic">{a.notes}</p>}
      </CardContent>
    </Card>
  );
}

export default ProAppointmentsPage;
