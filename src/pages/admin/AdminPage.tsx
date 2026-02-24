import AdminLayout from "@/components/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, ShieldCheck, Activity } from "lucide-react";
import { Link } from "react-router-dom";

const AdminPage = () => {
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
