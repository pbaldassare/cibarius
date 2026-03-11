import { useOfflineSync } from "@/hooks/useOfflineSync";
import { WifiOff, RefreshCw, CheckCircle2, AlertTriangle, Loader2 } from "lucide-react";

const OfflineStatusBanner = () => {
  const { isOnline, syncStatus, pendingCount, manualSync } = useOfflineSync();

  // Nothing to show
  if (isOnline && syncStatus === "idle" && pendingCount === 0) return null;

  // Offline
  if (!isOnline) {
    return (
      <div className="rounded-xl border-2 border-orange-300 bg-orange-50 dark:bg-orange-950/30 p-3 flex items-center gap-3">
        <WifiOff className="h-5 w-5 text-orange-500 shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-foreground">Sei offline</p>
          <p className="text-xs text-muted-foreground">
            I pasti verranno salvati localmente{pendingCount > 0 && ` (${pendingCount} in coda)`} e sincronizzati al ritorno della connessione.
          </p>
        </div>
      </div>
    );
  }

  // Syncing
  if (syncStatus === "syncing") {
    return (
      <div className="rounded-xl border-2 border-primary/30 bg-primary/5 p-3 flex items-center gap-3">
        <Loader2 className="h-5 w-5 text-primary animate-spin shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-foreground">Sincronizzazione in corso...</p>
          <p className="text-xs text-muted-foreground">{pendingCount} operazioni in coda</p>
        </div>
      </div>
    );
  }

  // Synced successfully
  if (syncStatus === "synced") {
    return (
      <div className="rounded-xl border-2 border-green-300 bg-green-50 dark:bg-green-950/20 p-3 flex items-center gap-3">
        <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-foreground">Tutto sincronizzato ✓</p>
          <p className="text-xs text-muted-foreground">I pasti offline sono stati salvati nel database.</p>
        </div>
      </div>
    );
  }

  // Error syncing
  if (syncStatus === "error") {
    return (
      <div className="rounded-xl border-2 border-destructive/40 bg-destructive/10 p-3 flex items-center gap-3">
        <AlertTriangle className="h-5 w-5 text-destructive shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-destructive">Errore di sincronizzazione</p>
          <p className="text-xs text-muted-foreground">{pendingCount} operazioni non sincronizzate</p>
        </div>
        <button onClick={manualSync} className="p-2 rounded-lg hover:bg-muted shrink-0" aria-label="Riprova">
          <RefreshCw className="h-4 w-4 text-muted-foreground" />
        </button>
      </div>
    );
  }

  // Pending ops while online (shouldn't happen often)
  if (pendingCount > 0) {
    return (
      <div className="rounded-xl border-2 border-orange-300 bg-orange-50 dark:bg-orange-950/30 p-3 flex items-center gap-3">
        <RefreshCw className="h-5 w-5 text-orange-500 shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-foreground">{pendingCount} in attesa di sincronizzazione</p>
        </div>
        <button onClick={manualSync} className="p-2 rounded-lg hover:bg-muted shrink-0" aria-label="Sincronizza">
          <RefreshCw className="h-4 w-4 text-muted-foreground" />
        </button>
      </div>
    );
  }

  return null;
};

export default OfflineStatusBanner;
