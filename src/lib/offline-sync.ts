/**
 * Offline Sync System
 * 
 * Uses IndexedDB to queue operations when offline.
 * Auto-syncs when connection returns.
 */

import { supabase } from "@/integrations/supabase/client";

const DB_NAME = "cibarius_offline";
const DB_VERSION = 1;
const STORE_NAME = "pending_ops";

export interface PendingOperation {
  id: string;
  table: string;
  method: "insert" | "upsert" | "delete";
  payload: Record<string, any>;
  onConflict?: string;
  createdAt: string;
}

/* ── IndexedDB helpers ── */

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "id" });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function enqueueOperation(op: Omit<PendingOperation, "id" | "createdAt">): Promise<string> {
  const db = await openDB();
  const id = crypto.randomUUID();
  const record: PendingOperation = {
    ...op,
    id,
    createdAt: new Date().toISOString(),
  };
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).put(record);
    tx.oncomplete = () => resolve(id);
    tx.onerror = () => reject(tx.error);
  });
}

export async function getPendingOps(): Promise<PendingOperation[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const req = tx.objectStore(STORE_NAME).getAll();
    req.onsuccess = () => resolve(req.result ?? []);
    req.onerror = () => reject(req.error);
  });
}

async function removeOp(id: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function clearAllOps(): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).clear();
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

/* ── Sync engine ── */

export type SyncStatus = "idle" | "syncing" | "synced" | "error";

let syncListeners: Array<(status: SyncStatus, pending: number) => void> = [];

export function onSyncStatusChange(cb: (status: SyncStatus, pending: number) => void) {
  syncListeners.push(cb);
  return () => {
    syncListeners = syncListeners.filter((l) => l !== cb);
  };
}

function notifyListeners(status: SyncStatus, pending: number) {
  syncListeners.forEach((cb) => cb(status, pending));
}

let syncing = false;

export async function syncPendingOps(): Promise<{ synced: number; failed: number }> {
  if (syncing || !navigator.onLine) return { synced: 0, failed: 0 };
  syncing = true;

  const ops = await getPendingOps();
  if (ops.length === 0) {
    syncing = false;
    notifyListeners("idle", 0);
    return { synced: 0, failed: 0 };
  }

  notifyListeners("syncing", ops.length);

  let synced = 0;
  let failed = 0;

  // Process in chronological order
  const sorted = ops.sort((a, b) => a.createdAt.localeCompare(b.createdAt));

  for (const op of sorted) {
    try {
      let query: any;
      if (op.method === "insert") {
        query = supabase.from(op.table as any).insert(op.payload as any);
      } else if (op.method === "upsert") {
        query = supabase.from(op.table as any).upsert(op.payload as any, op.onConflict ? { onConflict: op.onConflict } : undefined);
      } else if (op.method === "delete") {
        query = supabase.from(op.table as any).delete().eq("id", op.payload.id);
      }

      const { error } = await query;
      if (error) {
        // If it's a duplicate key error, remove it anyway (already synced)
        if (error.code === "23505") {
          await removeOp(op.id);
          synced++;
        } else {
          console.error("[offline-sync] Failed to sync op:", op.id, error.message);
          failed++;
        }
      } else {
        await removeOp(op.id);
        synced++;
      }
    } catch (e) {
      console.error("[offline-sync] Exception syncing op:", op.id, e);
      failed++;
    }
  }

  syncing = false;
  const remaining = await getPendingOps();
  notifyListeners(failed > 0 ? "error" : "synced", remaining.length);

  // Auto-clear "synced" status after 3s
  if (failed === 0) {
    setTimeout(() => notifyListeners("idle", 0), 3000);
  }

  return { synced, failed };
}

/* ── Smart operation: tries online first, queues if offline ── */

export async function safeSupabaseOp(params: {
  table: string;
  method: "insert" | "upsert" | "delete";
  payload: Record<string, any>;
  onConflict?: string;
}): Promise<{ offline: boolean; error?: string }> {
  if (navigator.onLine) {
    try {
      let query: any;
      if (params.method === "insert") {
        query = supabase.from(params.table as any).insert(params.payload as any);
      } else if (params.method === "upsert") {
        query = supabase.from(params.table as any).upsert(params.payload as any, params.onConflict ? { onConflict: params.onConflict } : undefined);
      } else if (params.method === "delete") {
        query = supabase.from(params.table as any).delete().eq("id", params.payload.id);
      }

      const { error } = await query;
      if (error) {
        // Network error → queue
        if (error.message?.includes("fetch") || error.message?.includes("network")) {
          await enqueueOperation(params);
          notifyListeners("idle", (await getPendingOps()).length);
          return { offline: true };
        }
        return { offline: false, error: error.message };
      }
      return { offline: false };
    } catch (e: any) {
      // Fetch failed → queue
      await enqueueOperation(params);
      notifyListeners("idle", (await getPendingOps()).length);
      return { offline: true };
    }
  }

  // Offline: queue directly
  await enqueueOperation(params);
  const pending = await getPendingOps();
  notifyListeners("idle", pending.length);
  return { offline: true };
}

/* ── Auto-sync on reconnect ── */

let initialized = false;

export function initOfflineSync() {
  if (initialized) return;
  initialized = true;

  window.addEventListener("online", () => {
    console.log("[offline-sync] Back online, syncing...");
    syncPendingOps();
  });

  // Try syncing on load if there are pending ops
  syncPendingOps();
}
