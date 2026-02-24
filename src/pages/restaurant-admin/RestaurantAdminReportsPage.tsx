import RestaurantAdminLayout from "@/components/RestaurantAdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText } from "lucide-react";

const RestaurantAdminReportsPage = () => (
  <RestaurantAdminLayout>
    <h1 className="mb-6 text-2xl font-bold text-foreground">Report</h1>
    <Card className="border-2 border-accent">
      <CardHeader className="flex flex-row items-center gap-3 pb-2">
        <FileText className="h-5 w-5 text-primary" />
        <CardTitle className="text-base">Report</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">Sezione in costruzione.</p>
      </CardContent>
    </Card>
  </RestaurantAdminLayout>
);

export default RestaurantAdminReportsPage;
