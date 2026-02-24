import RestaurantAdminLayout from "@/components/RestaurantAdminLayout";
import { useRestaurant } from "@/hooks/useRestaurant";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, FileText, Store, Loader2 } from "lucide-react";
import { Link } from "react-router-dom";

const RestaurantAdminPage = () => {
  const { restaurant, isLoading } = useRestaurant();

  if (isLoading) {
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
      <h1 className="mb-6 text-2xl font-bold text-foreground">Panoramica</h1>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Link to="/restaurant-admin/settings">
          <Card className="border-2 border-accent transition-shadow hover:shadow-md">
            <CardHeader className="flex flex-row items-center gap-3 pb-2">
              <Store className="h-5 w-5 text-primary" />
              <CardTitle className="text-base">Dati Ristorante</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">{restaurant?.name}</p>
              <p className="text-xs text-muted-foreground">{restaurant?.address ?? "Nessun indirizzo"}</p>
            </CardContent>
          </Card>
        </Link>
        <Link to="/restaurant-admin/staff">
          <Card className="border-2 border-accent transition-shadow hover:shadow-md">
            <CardHeader className="flex flex-row items-center gap-3 pb-2">
              <Users className="h-5 w-5 text-primary" />
              <CardTitle className="text-base">Staff</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">Gestisci il team del ristorante</p>
            </CardContent>
          </Card>
        </Link>
        <Card className="border-2 border-accent">
          <CardHeader className="flex flex-row items-center gap-3 pb-2">
            <FileText className="h-5 w-5 text-primary" />
            <CardTitle className="text-base">Report</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">In costruzione</p>
          </CardContent>
        </Card>
      </div>
    </RestaurantAdminLayout>
  );
};

export default RestaurantAdminPage;
