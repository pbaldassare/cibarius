import { useState, useEffect } from "react";
import AdminLayout from "@/components/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Users, ShieldCheck, Activity, Package, MessageSquareWarning, Ticket,
  Store, Stethoscope, AlertTriangle, CheckCircle2, Clock, TrendingUp, Key,
} from "lucide-react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";

interface PlatformStats {
  totalUsers: number;
  totalRestaurants: number;
  totalProfessionals: number;
  pendingProducts: number;
  openSupport: number;
  expiringItems: number;
}

const AdminPage = () => {
  const [stats, setStats] = useState<PlatformStats>({
    totalUsers: 0, totalRestaurants: 0, totalProfessionals: 0,
    pendingProducts: 0, openSupport: 0, expiringItems: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      const today = format(new Date(), "yyyy-MM-dd");
      const in3days = format(new Date(Date.now() + 3 * 86400000), "yyyy-MM-dd");

      const [users, restaurants, professionals, pending, support, expiring] = await Promise.all([
        supabase.from("profiles").select("id", { count: "exact", head: true }).eq("role", "user"),
        supabase.from("restaurants").select("id", { count: "exact", head: true }),
        supabase.from("profiles").select("id", { count: "exact", head: true }).eq("role", "professional"),
        supabase.from("product_submissions").select("id", { count: "exact", head: true }).eq("status", "pending"),
        supabase.from("support_requests").select("id", { count: "exact", head: true }).eq("status", "open"),
        supabase.from("inventory_items").select("id", { count: "exact", head: true }).lte("expiry_date", in3days).gte("expiry_date", today),
      ]);

      setStats({
        totalUsers: users.count ?? 0,
        totalRestaurants: restaurants.count ?? 0,
        totalProfessionals: professionals.count ?? 0,
        pendingProducts: pending.count ?? 0,
        openSupport: support.count ?? 0,
        expiringItems: expiring.count ?? 0,
      });
      setLoading(false);
    };
    fetchStats();
  }, []);

  const statCards = [
    { label: "Utenti", value: stats.totalUsers, icon: Users, color: "text-blue-600" },
    { label: "Ristoranti", value: stats.totalRestaurants, icon: Store, color: "text-orange-600" },
    { label: "Nutrizionisti", value: stats.totalProfessionals, icon: Stethoscope, color: "text-emerald-600" },
    { label: "In scadenza (3gg)", value: stats.expiringItems, icon: AlertTriangle, color: "text-amber-600" },
    { label: "Prodotti in attesa", value: stats.pendingProducts, icon: Clock, color: "text-violet-600" },
    { label: "Segnalazioni aperte", value: stats.openSupport, icon: MessageSquareWarning, color: "text-red-600" },
  ];

  return (
    <AdminLayout>
      <h1 className="mb-6 text-2xl font-bold text-foreground">Dashboard Piattaforma</h1>

      {/* Stats grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 mb-8">
        {statCards.map(({ label, value, icon: Icon, color }) => (
          <Card key={label} className="border-border/50">
            <CardContent className="flex items-center gap-4 p-5">
              <div className={`flex h-12 w-12 items-center justify-center rounded-xl bg-muted ${color}`}>
                <Icon className="h-6 w-6" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">
                  {loading ? "—" : value}
                </p>
                <p className="text-sm text-muted-foreground">{label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Quick links */}
      <h2 className="mb-4 text-lg font-semibold text-foreground">Gestione Piattaforma</h2>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Link to="/admin/users">
          <Card className="transition-shadow hover:shadow-md">
            <CardHeader className="flex flex-row items-center gap-3 pb-2">
              <Users className="h-5 w-5 text-primary" />
              <CardTitle className="text-base">Gestione Utenti</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">Visualizza e gestisci tutti gli utenti e i ruoli</p>
            </CardContent>
          </Card>
        </Link>
        <Link to="/admin/restaurants">
          <Card className="transition-shadow hover:shadow-md">
            <CardHeader className="flex flex-row items-center gap-3 pb-2">
              <Store className="h-5 w-5 text-primary" />
              <CardTitle className="text-base">Gestione Ristoranti</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">Monitora ristoranti, HACCP e scadenze</p>
            </CardContent>
          </Card>
        </Link>
        <Link to="/admin/product-review">
          <Card className="transition-shadow hover:shadow-md">
            <CardHeader className="flex flex-row items-center gap-3 pb-2">
              <Package className="h-5 w-5 text-primary" />
              <CardTitle className="text-base flex items-center gap-2">
                Prodotti da Revisione
                {stats.pendingProducts > 0 && (
                  <Badge variant="destructive" className="text-xs">{stats.pendingProducts}</Badge>
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
                Segnalazioni
                {stats.openSupport > 0 && (
                  <Badge variant="destructive" className="text-xs">{stats.openSupport}</Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">Gestisci problemi e suggerimenti</p>
            </CardContent>
          </Card>
        </Link>
        <Link to="/admin/coupons">
          <Card className="transition-shadow hover:shadow-md">
            <CardHeader className="flex flex-row items-center gap-3 pb-2">
              <Ticket className="h-5 w-5 text-primary" />
              <CardTitle className="text-base">Gestione Coupon</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">Coupon referral nutrizionisti</p>
            </CardContent>
          </Card>
        </Link>
        <Link to="/admin/products-db">
          <Card className="transition-shadow hover:shadow-md">
            <CardHeader className="flex flex-row items-center gap-3 pb-2">
              <Package className="h-5 w-5 text-primary" />
              <CardTitle className="text-base">Database Prodotti</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">Tutti i prodotti, fonti e dati nutrizionali</p>
            </CardContent>
          </Card>
        </Link>
        <Link to="/admin/stats">
          <Card className="transition-shadow hover:shadow-md">
            <CardHeader className="flex flex-row items-center gap-3 pb-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              <CardTitle className="text-base">Statistiche</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">Statistiche e monitoraggio piattaforma</p>
            </CardContent>
          </Card>
        </Link>
      </div>
    </AdminLayout>
  );
};

export default AdminPage;
