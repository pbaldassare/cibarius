import { useEffect, useState } from "react";
import AdminLayout from "@/components/AdminLayout";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Store, Sparkles, Users, Clock, CheckCircle, XCircle } from "lucide-react";
import { format } from "date-fns";

interface SubRow {
  id: string;
  user_id: string;
  plan_type: string;
  status: string;
  start_date: string;
  trial_end_date: string | null;
  created_at: string;
  profiles?: { email: string; full_name: string | null } | null;
}

const statusColors: Record<string, string> = {
  trial: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400",
  active: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400",
  past_due: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400",
  cancelled: "bg-muted text-muted-foreground",
  expired: "bg-destructive/10 text-destructive",
};

const statusLabels: Record<string, string> = {
  trial: "Trial",
  active: "Attivo",
  past_due: "Scaduto",
  cancelled: "Cancellato",
  expired: "Scaduto",
};

const AdminSubscriptionsPage = () => {
  const [loading, setLoading] = useState(true);
  const [subs, setSubs] = useState<SubRow[]>([]);
  const [stats, setStats] = useState({
    restaurantTrial: 0,
    restaurantActive: 0,
    restaurantExpired: 0,
    userPlus: 0,
    freeUsers: 0,
  });

  useEffect(() => {
    const fetchAll = async () => {
      // Fetch subscriptions
      const { data: subData } = await supabase
        .from("subscriptions")
        .select("*")
        .order("created_at", { ascending: false });

      // Fetch profiles for each sub
      const enriched: SubRow[] = [];
      if (subData) {
        const userIds = [...new Set(subData.map((s: any) => s.user_id))];
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, email, full_name")
          .in("id", userIds);

        const profileMap = new Map((profiles || []).map((p: any) => [p.id, p]));

        for (const s of subData) {
          enriched.push({
            ...s,
            profiles: profileMap.get(s.user_id) || null,
          } as SubRow);
        }
      }

      setSubs(enriched);

      // Calculate stats
      const restTrial = enriched.filter(s => s.plan_type === "restaurant" && s.status === "trial").length;
      const restActive = enriched.filter(s => s.plan_type === "restaurant" && s.status === "active").length;
      const restExpired = enriched.filter(s => s.plan_type === "restaurant" && ["expired", "cancelled"].includes(s.status)).length;
      const uPlus = enriched.filter(s => s.plan_type === "user_plus" && ["trial", "active"].includes(s.status)).length;

      // Free users = total users - plus users
      const { count: totalUsers } = await supabase
        .from("profiles")
        .select("id", { count: "exact", head: true })
        .eq("role", "user");

      setStats({
        restaurantTrial: restTrial,
        restaurantActive: restActive,
        restaurantExpired: restExpired,
        userPlus: uPlus,
        freeUsers: (totalUsers ?? 0) - uPlus,
      });

      setLoading(false);
    };

    fetchAll();
  }, []);

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AdminLayout>
    );
  }

  const statCards = [
    { label: "Ristoranti in trial", value: stats.restaurantTrial, icon: Clock, color: "text-amber-600" },
    { label: "Ristoranti paganti", value: stats.restaurantActive, icon: Store, color: "text-emerald-600" },
    { label: "Ristoranti scaduti", value: stats.restaurantExpired, icon: XCircle, color: "text-destructive" },
    { label: "Utenti Plus", value: stats.userPlus, icon: Sparkles, color: "text-primary" },
    { label: "Utenti gratuiti", value: stats.freeUsers, icon: Users, color: "text-muted-foreground" },
  ];

  return (
    <AdminLayout>
      <h1 className="mb-6 text-2xl font-bold text-foreground">Abbonamenti</h1>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5 mb-8">
        {statCards.map(({ label, value, icon: Icon, color }) => (
          <Card key={label}>
            <CardContent className="pt-4 pb-3 text-center">
              <Icon className={`h-6 w-6 mx-auto mb-1 ${color}`} />
              <p className="text-2xl font-bold text-foreground">{value}</p>
              <p className="text-xs text-muted-foreground">{label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Tutti gli abbonamenti</CardTitle>
        </CardHeader>
        <CardContent>
          {subs.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">Nessun abbonamento registrato</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left">
                    <th className="pb-2 font-medium text-muted-foreground">Utente</th>
                    <th className="pb-2 font-medium text-muted-foreground">Piano</th>
                    <th className="pb-2 font-medium text-muted-foreground">Stato</th>
                    <th className="pb-2 font-medium text-muted-foreground">Inizio</th>
                    <th className="pb-2 font-medium text-muted-foreground">Fine trial</th>
                  </tr>
                </thead>
                <tbody>
                  {subs.map(s => (
                    <tr key={s.id} className="border-b border-border/50">
                      <td className="py-2.5">
                        <p className="font-medium text-foreground">{s.profiles?.full_name || "—"}</p>
                        <p className="text-xs text-muted-foreground">{s.profiles?.email || s.user_id.slice(0, 8)}</p>
                      </td>
                      <td className="py-2.5">
                        <Badge variant="outline" className="text-xs">
                          {s.plan_type === "restaurant" ? "Ristorante" : "Plus"}
                        </Badge>
                      </td>
                      <td className="py-2.5">
                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${statusColors[s.status] || ""}`}>
                          {statusLabels[s.status] || s.status}
                        </span>
                      </td>
                      <td className="py-2.5 text-muted-foreground">
                        {format(new Date(s.start_date), "dd/MM/yyyy")}
                      </td>
                      <td className="py-2.5 text-muted-foreground">
                        {s.trial_end_date ? format(new Date(s.trial_end_date), "dd/MM/yyyy") : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </AdminLayout>
  );
};

export default AdminSubscriptionsPage;
