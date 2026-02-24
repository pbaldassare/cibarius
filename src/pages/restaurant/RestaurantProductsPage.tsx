import MobileHeader from "@/components/MobileHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ShoppingBag } from "lucide-react";

const RestaurantProductsPage = () => (
  <div>
    <MobileHeader title="Magazzino" />
    <main className="px-4 py-5">
      <Card>
        <CardHeader className="flex flex-row items-center gap-3 pb-2">
          <ShoppingBag className="h-5 w-5 text-primary" />
          <CardTitle className="text-base">Magazzino</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Gestisci i prodotti del tuo magazzino. In costruzione.</p>
        </CardContent>
      </Card>
    </main>
  </div>
);

export default RestaurantProductsPage;
