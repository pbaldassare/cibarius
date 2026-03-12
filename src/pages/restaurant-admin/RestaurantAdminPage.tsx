import RestaurantAdminLayout from "@/components/RestaurantAdminLayout";
import { useRestaurant } from "@/hooks/useRestaurant";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Users, Store, Loader2, ClipboardCheck, Settings2, FileText,
  Package, AlertTriangle, CheckCircle2, Clock,
} from "lucide-react";
import { Link } from "react-router-dom";
import { format } from "date-fns";

const RestaurantAdminPage = () => {
  const { restaurant, isLoading } = useRestaurant();
  const [stats, setStats] = useState({
    totalTasks: 0, completedToday: 0, pendingToday: 0,
    totalInventory: 0, expiringItems: 0, staffCount: 0,
  });
  const [loadingStats, setLoadingStats] = useState(true);

  useEffect(() => {
    if (!restaurant) return;
    const fetch = async () => {
      const todayStr = format(new Date(), "yyyy-MM-dd");
      const in3days = format(new Date(Date.now() + 3 * 86400000), "yyyy-MM-dd");

      const [tasks, logsToday, inv, expiring, staff] = await Promise.all([
        supabase.from("haccp_tasks").select("id", { count: "exact", head: true }).eq("restaurant_id", restaurant.id).eq("is_active", true),
        supabase.from("haccp_logs").select("id", { count: "exact", head: true }).eq("restaurant_id", restaurant.id).eq("log_date", todayStr),
        supabase.from("inventory_items").select("id", { count: "exact", head: true }).eq("restaurant_id", restaurant.id),
        supabase.from("inventory_items").select("id", { count: "exact", head: true }).eq("restaurant_id", restaurant.id).lte("expiry_date", in3days).gte("expiry_date", todayStr),
        supabase.from("restaurant_members").select("id", { count: "exact", head: true }).eq("restaurant_id", restaurant.id),
      ]);

      setStats({
        totalTasks: tasks.count ?? 0,
        completedToday: logsToday.count ?? 0,
        pendingToday: Math.max(0, (tasks.count ?? 0) - (logsToday.count ?? 0)),
        totalInventory: inv.count ?? 0,
        expiringItems: expiring.count ?? 0,
        staffCount: staff.count ?? 0,
      });
      setLoadingStats(false);
    };
    fetch();
  }, [restaurant]);

  if (isLoading) {
    return (
      <RestaurantAdminLayout>
        <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
      </RestaurantAdminLayout>
    );
  }

  const statCards = [
    { label: "Controlli HACCP", value: stats.totalTasks, icon: ClipboardCheck, color: "text-primary" },
    { label: "Completati oggi", value: stats.completedToday, icon: CheckCircle2, color: "text-emerald-600" },
    { label: "Da completare", value: stats.pendingToday, icon: Clock, color: "text-amber-600" },
    { label: "Prodotti inventario", value: stats.totalInventory, icon: Package, color: "text-blue-600" },
    { label: "In scadenza (3gg)", value: stats.expiringItems, icon: AlertTriangle, color: "text-red-600" },
    { label: "Staff", value: stats.staffCount, icon: Users, color: "text-violet-600" },
  ];

  return (
    <RestaurantAdminLayout>
      <h1 className="mb-6 text-2xl font-bold text-foreground">Backoffice — {restaurant?.name}</h1>

      {/* Stats */}
      {!loadingStats && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 mb-8">
          {statCards.map(({ label, value, icon: Icon, color }) => (
            <Card key={label} className="border-border/50">
              <CardContent className="flex items-center gap-4 p-5">
                <div className={`flex h-12 w-12 items-center justify-center rounded-xl bg-muted ${color}`}>
                  <Icon className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{value}</p>
                  <p className="text-sm text-muted-foreground">{label}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Management links */}
      <h2 className="mb-4 text-lg font-semibold text-foreground">Gestione</h2>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Link to="/restaurant-admin/haccp-control">
          <Card className="transition-shadow hover:shadow-md border-primary/20">
            <CardHeader className="flex flex-row items-center gap-3 pb-2">
              <ShieldCheck className="h-5 w-5 text-primary" />
              <CardTitle className="text-base">Modalità Controllo HACCP</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">Registro verificabile pronto per ispezioni</p>
            </CardContent>
          </Card>
        </Link>

        <Link to="/restaurant-admin/settings">
          <Card className="transition-shadow hover:shadow-md">
            <CardHeader className="flex flex-row items-center gap-3 pb-2">
              <Store className="h-5 w-5 text-primary" />
              <CardTitle className="text-base">Dati Ristorante</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">{restaurant?.name} · {restaurant?.address ?? "Nessun indirizzo"}</p>
            </CardContent>
          </Card>
        </Link>

        <Link to="/restaurant/haccp/setup">
          <Card className="transition-shadow hover:shadow-md">
            <CardHeader className="flex flex-row items-center gap-3 pb-2">
              <Settings2 className="h-5 w-5 text-primary" />
              <CardTitle className="text-base">Configura HACCP</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">Attività, frequenze, attrezzature</p>
            </CardContent>
          </Card>
        </Link>

        <Link to="/restaurant/haccp/history">
          <Card className="transition-shadow hover:shadow-md">
            <CardHeader className="flex flex-row items-center gap-3 pb-2">
              <FileText className="h-5 w-5 text-primary" />
              <CardTitle className="text-base">Storico HACCP</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">Esporta report PDF/Excel</p>
            </CardContent>
          </Card>
        </Link>

        <Link to="/restaurant-admin/staff">
          <Card className="transition-shadow hover:shadow-md">
            <CardHeader className="flex flex-row items-center gap-3 pb-2">
              <Users className="h-5 w-5 text-primary" />
              <CardTitle className="text-base flex items-center gap-2">
                Staff
                <Badge variant="secondary" className="text-xs">{stats.staffCount}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">Gestisci il team</p>
            </CardContent>
          </Card>
        </Link>

        <Link to="/restaurant-admin/reports">
          <Card className="transition-shadow hover:shadow-md">
            <CardHeader className="flex flex-row items-center gap-3 pb-2">
              <FileText className="h-5 w-5 text-primary" />
              <CardTitle className="text-base">Report</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">Scadenze e attività</p>
            </CardContent>
          </Card>
        </Link>
      </div>
    </RestaurantAdminLayout>
  );
};

export default RestaurantAdminPage;
