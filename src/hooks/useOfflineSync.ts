import { useState, useEffect, useCallback } from "react";
import { onSyncStatusChange, syncPendingOps, getPendingOps, initOfflineSync, type SyncStatus } from "@/lib/offline-sync";

export function useOfflineSync() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>("idle");
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    initOfflineSync();

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    const unsub = onSyncStatusChange((status, pending) => {
      setSyncStatus(status);
      setPendingCount(pending);
    });

    // Check initial pending count
    getPendingOps().then((ops) => setPendingCount(ops.length));

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      unsub();
    };
  }, []);

  const manualSync = useCallback(() => {
    if (navigator.onLine) syncPendingOps();
  }, []);

  return { isOnline, syncStatus, pendingCount, manualSync };
}
