import MobileHeader from "@/components/MobileHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Store } from "lucide-react";

const RestaurantPage = () => (
  <div>
    <MobileHeader title="Il mio Ristorante" />
    <main className="px-4 py-5 space-y-4">
      <Card>
        <CardHeader className="flex flex-row items-center gap-3 pb-2">
          <Store className="h-5 w-5 text-primary" />
          <CardTitle className="text-base">Dashboard Ristoratore</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Benvenuto nella tua area ristorante. Le funzionalità saranno disponibili a breve.</p>
        </CardContent>
      </Card>
    </main>
  </div>
);

export default RestaurantPage;
