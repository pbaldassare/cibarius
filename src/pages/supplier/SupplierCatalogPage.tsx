import MobileHeader from "@/components/MobileHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Package } from "lucide-react";

const SupplierCatalogPage = () => (
  <div>
    <MobileHeader title="Catalogo" />
    <main className="px-4 py-5">
      <Card>
        <CardHeader className="flex flex-row items-center gap-3 pb-2">
          <Package className="h-5 w-5 text-primary" />
          <CardTitle className="text-base">Catalogo Prodotti</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Gestisci il tuo catalogo prodotti. In costruzione.</p>
        </CardContent>
      </Card>
    </main>
  </div>
);

export default SupplierCatalogPage;
