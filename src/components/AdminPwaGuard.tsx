import { ShieldX, Monitor } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

/**
 * Detects if the app is running in standalone/PWA mode.
 * If so, blocks admin access and shows a browser-only message.
 */
const isStandaloneMode = (): boolean => {
  if (typeof window === "undefined") return false;
  // Check display-mode: standalone
  if (window.matchMedia("(display-mode: standalone)").matches) return true;
  // iOS standalone
  if ((navigator as any).standalone === true) return true;
  // TWA / Android standalone
  if (document.referrer.includes("android-app://")) return true;
  return false;
};

interface AdminPwaGuardProps {
  children: React.ReactNode;
}

const AdminPwaGuard = ({ children }: AdminPwaGuardProps) => {
  if (isStandaloneMode()) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-6">
        <Card className="max-w-md text-center">
          <CardHeader className="flex flex-col items-center gap-3">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
              <ShieldX className="h-8 w-8 text-destructive" />
            </div>
            <CardTitle className="text-xl">Area non disponibile</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground">
              L'area amministratore è disponibile solo da browser.
            </p>
            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <Monitor className="h-4 w-4" />
              <span>Accedi da un browser desktop per continuare.</span>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return <>{children}</>;
};

export default AdminPwaGuard;
