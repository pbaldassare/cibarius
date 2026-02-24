import MobileHeader from "@/components/MobileHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users } from "lucide-react";

const ProClientsPage = () => (
  <div>
    <MobileHeader title="Clienti" />
    <main className="px-4 py-5">
      <Card>
        <CardHeader className="flex flex-row items-center gap-3 pb-2">
          <Users className="h-5 w-5 text-primary" />
          <CardTitle className="text-base">I miei Clienti</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Gestisci i tuoi clienti. In costruzione.</p>
        </CardContent>
      </Card>
    </main>
  </div>
);

export default ProClientsPage;
