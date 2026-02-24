import MobileHeader from "@/components/MobileHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MessageSquare } from "lucide-react";

const ProNotesPage = () => (
  <div>
    <MobileHeader title="Note" />
    <main className="px-4 py-5">
      <Card>
        <CardHeader className="flex flex-row items-center gap-3 pb-2">
          <MessageSquare className="h-5 w-5 text-primary" />
          <CardTitle className="text-base">Note e Messaggi</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Le tue note e comunicazioni. In costruzione.</p>
        </CardContent>
      </Card>
    </main>
  </div>
);

export default ProNotesPage;
