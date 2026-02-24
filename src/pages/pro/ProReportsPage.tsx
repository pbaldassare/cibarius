import MobileHeader from "@/components/MobileHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText } from "lucide-react";

const ProReportsPage = () => (
  <div>
    <MobileHeader title="Report" />
    <main className="px-4 py-5">
      <Card>
        <CardHeader className="flex flex-row items-center gap-3 pb-2">
          <FileText className="h-5 w-5 text-primary" />
          <CardTitle className="text-base">Report</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">I tuoi report professionali. In costruzione.</p>
        </CardContent>
      </Card>
    </main>
  </div>
);

export default ProReportsPage;
