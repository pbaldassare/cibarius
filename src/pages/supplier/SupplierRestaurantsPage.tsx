import MobileHeader from "@/components/MobileHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Building2 } from "lucide-react";

const SupplierRestaurantsPage = () => (
  <div>
    <MobileHeader title="Ristoranti" />
    <main className="px-4 py-5">
      <Card>
        <CardHeader className="flex flex-row items-center gap-3 pb-2">
          <Building2 className="h-5 w-5 text-primary" />
          <CardTitle className="text-base">Ristoranti collegati</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">I ristoranti a cui fornisci prodotti. In costruzione.</p>
        </CardContent>
      </Card>
    </main>
  </div>
);

export default SupplierRestaurantsPage;
