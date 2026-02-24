import MobileHeader from "@/components/MobileHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, TrendingUp, Package } from "lucide-react";

const SupplierReportsPage = () => (
  <div>
    <MobileHeader title="Report" />
    <main className="px-4 py-5 space-y-4">
      <Card className="border-2 border-accent">
        <CardHeader className="flex flex-row items-center gap-3 pb-2">
          <TrendingUp className="h-5 w-5 text-primary" />
          <CardTitle className="text-base">Prezzi medi</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Analisi dei prezzi medi dei tuoi prodotti. Prossimamente.</p>
        </CardContent>
      </Card>
      <Card className="border-2 border-accent">
        <CardHeader className="flex flex-row items-center gap-3 pb-2">
          <Package className="h-5 w-5 text-primary" />
          <CardTitle className="text-base">Prodotti più richiesti</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">I prodotti più ordinati dai ristoranti. Prossimamente.</p>
        </CardContent>
      </Card>
      <Card className="border-2 border-accent">
        <CardHeader className="flex flex-row items-center gap-3 pb-2">
          <FileText className="h-5 w-5 text-primary" />
          <CardTitle className="text-base">Storico ordini</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Storico degli ordini ricevuti. Prossimamente.</p>
        </CardContent>
      </Card>
    </main>
  </div>
);

export default SupplierReportsPage;
