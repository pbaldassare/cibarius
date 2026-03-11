import { useState, useEffect } from "react";
import { X, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePwaInstall } from "@/hooks/usePwaInstall";

const PwaInstallBanner = () => {
  const { canInstall, isInstalled, isIos, install } = usePwaInstall();
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    if (isInstalled) return;

    const dismissed = localStorage.getItem("pwa-banner-dismissed");
    if (dismissed && Date.now() - Number(dismissed) < 2 * 60 * 60 * 1000) return;

    if (isIos || canInstall) {
      setShowBanner(true);
    }
  }, [isInstalled, isIos, canInstall]);

  const handleInstall = async () => {
    const accepted = await install();
    if (accepted) setShowBanner(false);
  };

  const handleDismiss = () => {
    setShowBanner(false);
    localStorage.setItem("pwa-banner-dismissed", String(Date.now()));
  };

  if (!showBanner) return null;

  return (
    <div className="fixed bottom-20 left-3 right-3 z-50 animate-in slide-in-from-bottom-4 duration-300">
      <div className="rounded-2xl border border-border bg-card p-4 shadow-lg flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10">
          <Download className="h-5 w-5 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-foreground">Installa Cibarius</p>
          {isIos ? (
            <p className="text-xs text-muted-foreground mt-0.5">
              Tocca <span className="font-medium">Condividi ↑</span> poi <span className="font-medium">"Aggiungi alla schermata Home"</span>
            </p>
          ) : (
            <p className="text-xs text-muted-foreground mt-0.5">
              Aggiungi l'app alla Home per un accesso rapido
            </p>
          )}
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {canInstall && (
            <Button size="sm" className="h-8 text-xs px-3" onClick={handleInstall}>
              Installa
            </Button>
          )}
          <button onClick={handleDismiss} className="p-1.5 rounded-lg text-muted-foreground hover:bg-muted">
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default PwaInstallBanner;
