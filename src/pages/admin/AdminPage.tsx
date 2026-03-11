import { useState, useEffect } from "react";
import AdminLayout from "@/components/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, ShieldCheck, Activity, Package, MessageSquareWarning, Ticket } from "lucide-react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";

const AdminPage = () => {
  const [pendingCount, setPendingCount] = useState(0);
  const [supportCount, setSupportCount] = useState(0);

  useEffect(() => {
    supabase
      .from("product_submissions" as any)
      .select("id", { count: "exact", head: true })
      .eq("status", "pending")
      .then(({ count }) => { if (count != null) setPendingCount(count); });
    supabase
      .from("support_requests" as any)
      .select("id", { count: "exact", head: true })
      .eq("status", "open")
      .then(({ count }) => { if (count != null) setSupportCount(count); });
  }, []);

  return (
    <AdminLayout>
      <h1 className="mb-6 text-2xl font-bold text-foreground">Dashboard Admin</h1>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Link to="/admin/users">
          <Card className="transition-shadow hover:shadow-md">
            <CardHeader className="flex flex-row items-center gap-3 pb-2">
              <Users className="h-5 w-5 text-primary" />
              <CardTitle className="text-base">Gestione Utenti</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">Visualizza e gestisci i ruoli degli utenti</p>
            </CardContent>
          </Card>
        </Link>
        <Link to="/admin/product-review">
          <Card className="transition-shadow hover:shadow-md">
            <CardHeader className="flex flex-row items-center gap-3 pb-2">
              <Package className="h-5 w-5 text-primary" />
              <CardTitle className="text-base flex items-center gap-2">
                Prodotti da Revisione
                {pendingCount > 0 && (
                  <Badge variant="destructive" className="text-xs">{pendingCount}</Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">Approva o rifiuta inserimenti manuali</p>
            </CardContent>
          </Card>
        </Link>
        <Link to="/admin/support">
          <Card className="transition-shadow hover:shadow-md">
            <CardHeader className="flex flex-row items-center gap-3 pb-2">
              <MessageSquareWarning className="h-5 w-5 text-primary" />
              <CardTitle className="text-base flex items-center gap-2">
                Segnalazioni Utenti
                {supportCount > 0 && (
                  <Badge variant="destructive" className="text-xs">{supportCount}</Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">Gestisci problemi e suggerimenti</p>
            </CardContent>
          </Card>
        </Link>
        <Card>
          <CardHeader className="flex flex-row items-center gap-3 pb-2">
            <Activity className="h-5 w-5 text-primary" />
            <CardTitle className="text-base">Attività</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">Statistiche e monitoraggio</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center gap-3 pb-2">
            <ShieldCheck className="h-5 w-5 text-primary" />
            <CardTitle className="text-base">Sicurezza</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">Impostazioni di sicurezza</p>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
};

export default AdminPage;
