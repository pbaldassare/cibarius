import { useRestaurant } from "@/hooks/useRestaurant";
import MobileHeader from "@/components/MobileHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, Clock, BookOpen, FileText, Monitor, ChevronRight } from "lucide-react";
import { Link } from "react-router-dom";

const cards = [
  { to: "/restaurant/products", icon: Clock, label: "Scadenze / Magazzino", desc: "Controlla scadenze e inventario", color: "#F59E0B" },
  { to: "/restaurant/recipes", icon: BookOpen, label: "Ricette", desc: "Gestisci le tue ricette", color: "#22B6F2" },
  { to: "/restaurant/invoices", icon: FileText, label: "Bolle e Documenti", desc: "Carica e consulta bolle", color: "#10B981" },
];

const RestaurantPage = () => {
  const { restaurant, isLoading } = useRestaurant();

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#F5F7FA" }}>
      <MobileHeader title={restaurant?.name ?? "Il mio Ristorante"} />
      <main className="px-4 py-4 pb-28 space-y-3">
        {/* Admin link */}
        <Link to="/restaurant-admin">
          <Card className="border border-primary/20 bg-primary/5 shadow-sm">
            <CardContent className="flex items-center gap-3 py-3 px-4">
              <Monitor className="h-5 w-5 text-primary" />
              <span className="flex-1 text-sm font-medium text-primary">Pannello Gestione Ristorante</span>
              <ChevronRight className="h-4 w-4 text-primary/60" />
            </CardContent>
          </Card>
        </Link>

        {/* Main cards */}
        {cards.map(({ to, icon: Icon, label, desc, color }) => (
          <Link key={to} to={to}>
            <Card className="shadow-sm overflow-hidden transition-shadow hover:shadow-md">
              <CardContent className="flex items-center gap-4 p-4">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl" style={{ backgroundColor: `${color}15` }}>
                  <Icon className="h-5 w-5" style={{ color }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold" style={{ color: "#111827" }}>{label}</p>
                  <p className="text-xs text-muted-foreground">{desc}</p>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </CardContent>
            </Card>
          </Link>
        ))}
      </main>
    </div>
  );
};

export default RestaurantPage;
