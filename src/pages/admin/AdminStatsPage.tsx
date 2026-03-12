import { useEffect, useState } from "react";
import AdminLayout from "@/components/AdminLayout";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Users, Store, Stethoscope, Package, TrendingUp, AlertTriangle } from "lucide-react";
import { format, subDays } from "date-fns";

const AdminStatsPage = () => {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState({
    totalUsers: 0,
    totalRestaurants: 0,
    totalProfessionals: 0,
    totalProducts: 0,
    totalInventory: 0,
    expiredItems: 0,
    newUsersWeek: 0,
    newRestaurantsWeek: 0,
  });

  useEffect(() => {
    const fetch = async () => {
      const weekAgo = subDays(new Date(), 7).toISOString();
      const today = format(new Date(), "yyyy-MM-dd");

      const [users, rests, pros, prods, inv, expired, newUsers, newRests] = await Promise.all([
        supabase.from("profiles").select("id", { count: "exact", head: true }).eq("role", "user"),
        supabase.from("restaurants").select("id", { count: "exact", head: true }),
        supabase.from("profiles").select("id", { count: "exact", head: true }).eq("role", "professional"),
        supabase.from("products").select("id", { count: "exact", head: true }),
        supabase.from("inventory_items").select("id", { count: "exact", head: true }),
        supabase.from("inventory_items").select("id", { count: "exact", head: true }).lt("expiry_date", today),
        supabase.from("profiles").select("id", { count: "exact", head: true }).eq("role", "user").gte("created_at", weekAgo),
        supabase.from("restaurants").select("id", { count: "exact", head: true }).gte("created_at", weekAgo),
      ]);

      setData({
        totalUsers: users.count ?? 0,
        totalRestaurants: rests.count ?? 0,
        totalProfessionals: pros.count ?? 0,
        totalProducts: prods.count ?? 0,
        totalInventory: inv.count ?? 0,
        expiredItems: expired.count ?? 0,
        newUsersWeek: newUsers.count ?? 0,
        newRestaurantsWeek: newRests.count ?? 0,
      });
      setLoading(false);
    };
    fetch();
  }, []);

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
      </AdminLayout>
    );
  }

  const cards = [
    { label: "Utenti totali", value: data.totalUsers, icon: Users, sub: `+${data.newUsersWeek} questa settimana` },
    { label: "Ristoranti totali", value: data.totalRestaurants, icon: Store, sub: `+${data.newRestaurantsWeek} questa settimana` },
    { label: "Nutrizionisti", value: data.totalProfessionals, icon: Stethoscope },
    { label: "Prodotti catalogo", value: data.totalProducts, icon: Package },
    { label: "Articoli in inventario", value: data.totalInventory, icon: TrendingUp },
    { label: "Articoli scaduti", value: data.expiredItems, icon: AlertTriangle },
  ];

  return (
    <AdminLayout>
      <h1 className="mb-6 text-2xl font-bold text-foreground">Statistiche Piattaforma</h1>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map(({ label, value, icon: Icon, sub }) => (
          <Card key={label}>
            <CardHeader className="flex flex-row items-center gap-3 pb-2">
              <Icon className="h-5 w-5 text-primary" />
              <CardTitle className="text-base">{label}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-foreground">{value}</p>
              {sub && <p className="text-sm text-muted-foreground mt-1">{sub}</p>}
            </CardContent>
          </Card>
        ))}
      </div>
    </AdminLayout>
  );
};

export default AdminStatsPage;
