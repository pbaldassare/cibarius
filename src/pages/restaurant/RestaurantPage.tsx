import { useNavigate } from "react-router-dom";
import { useRestaurant } from "@/hooks/useRestaurant";
import MobileHeader from "@/components/MobileHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ShoppingBag, BookOpen, Settings, Loader2, Monitor } from "lucide-react";
import { Link } from "react-router-dom";

const cards = [
  { to: "/restaurant/products", icon: ShoppingBag, label: "Magazzino", desc: "Gestisci i tuoi prodotti" },
  { to: "/restaurant/recipes", icon: BookOpen, label: "Ricette", desc: "Le tue ricette" },
  { to: "/restaurant/settings", icon: Settings, label: "Impostazioni", desc: "Dati del ristorante" },
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
    <div>
      <MobileHeader title={restaurant?.name ?? "Il mio Ristorante"} />
      <main className="px-4 py-5 space-y-4">
        {/* Admin link */}
        <Link to="/restaurant-admin">
          <Card className="border-2 border-primary/30 bg-primary/5">
            <CardContent className="flex items-center gap-3 py-3">
              <Monitor className="h-5 w-5 text-primary" />
              <span className="text-sm font-medium text-primary">Apri Dashboard Admin Ristorante</span>
            </CardContent>
          </Card>
        </Link>

        {/* Main cards */}
        {cards.map(({ to, icon: Icon, label, desc }) => (
          <Link key={to} to={to}>
            <Card className="border-2 border-accent transition-shadow hover:shadow-md">
              <CardHeader className="flex flex-row items-center gap-3 pb-2">
                <Icon className="h-6 w-6 text-primary" />
                <CardTitle className="text-base">{label}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">{desc}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </main>
    </div>
  );
};

export default RestaurantPage;
