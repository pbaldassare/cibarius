import MobileHeader from "@/components/MobileHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BookOpen } from "lucide-react";

const RestaurantRecipesPage = () => (
  <div>
    <MobileHeader title="Ricette" />
    <main className="px-4 py-5">
      <Card>
        <CardHeader className="flex flex-row items-center gap-3 pb-2">
          <BookOpen className="h-5 w-5 text-primary" />
          <CardTitle className="text-base">Ricette</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Gestisci le tue ricette. In costruzione.</p>
        </CardContent>
      </Card>
    </main>
  </div>
);

export default RestaurantRecipesPage;
