import AdminLayout from "@/components/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const AdminSettingsPage = () => (
  <AdminLayout>
    <h1 className="mb-6 text-2xl font-bold text-foreground">Impostazioni</h1>
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Impostazioni generali</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">Sezione in costruzione.</p>
      </CardContent>
    </Card>
  </AdminLayout>
);

export default AdminSettingsPage;
