import MobileHeader from "@/components/MobileHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LayoutDashboard } from "lucide-react";

const ProPage = () => (
  <div>
    <MobileHeader title="Dashboard Pro" />
    <main className="px-4 py-5">
      <Card>
        <CardHeader className="flex flex-row items-center gap-3 pb-2">
          <LayoutDashboard className="h-5 w-5 text-primary" />
          <CardTitle className="text-base">Dashboard Professionista</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Benvenuto nella tua area professionale. In costruzione.</p>
        </CardContent>
      </Card>
    </main>
  </div>
);

export default ProPage;
