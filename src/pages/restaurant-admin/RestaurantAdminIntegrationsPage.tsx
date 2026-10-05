import { useEffect, useState } from "react";
import RestaurantAdminLayout from "@/components/RestaurantAdminLayout";
import { useRestaurant } from "@/hooks/useRestaurant";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { functionsUrl } from "@/lib/supabaseUrls";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle,
} from "@/components/ui/sheet";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Key, Plus, Copy, Check, Trash2, Plug, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { it } from "date-fns/locale";

type ApiKeyRow = {
  id: string;
  name: string;
  key_prefix: string;
  created_at: string;
  last_used_at: string | null;
  is_active: boolean;
};

type RunRow = {
  id: string;
  connector_type: string;
  status: string;
  idempotency_key: string | null;
  stats: { created?: number; total?: number; skip_reason?: string | null } | null;
  error_message: string | null;
  created_at: string;
  finished_at: string | null;
};

const generateRestaurantKey = () => {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let key = "cibr_";
  for (let i = 0; i < 40; i++) key += chars.charAt(Math.floor(Math.random() * chars.length));
  return key;
};

const hashKey = async (key: string) => {
  const encoded = new TextEncoder().encode(key);
  const hashBuffer = await crypto.subtle.digest("SHA-256", encoded);
  return Array.from(new Uint8Array(hashBuffer)).map((b) => b.toString(16).padStart(2, "0")).join("");
};

const statusLabel: Record<string, string> = {
  success: "OK",
  partial: "Parziale",
  failed: "Errore",
  skipped: "Saltato",
  running: "In corso",
};

const RestaurantAdminIntegrationsPage = () => {
  const { restaurant, isLoading: restLoading } = useRestaurant();
  const { user } = useAuth();
  const [keys, setKeys] = useState<ApiKeyRow[]>([]);
  const [runs, setRuns] = useState<RunRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [newKeyName, setNewKeyName] = useState("Integrazione gestionale");
  const [generatedKey, setGeneratedKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [revokeId, setRevokeId] = useState<string | null>(null);

  const ingestUrl = `${functionsUrl()}/restaurant-ingest`;

  const fetchAll = async () => {
    if (!restaurant) return;
    setLoading(true);
    const [keysRes, runsRes] = await Promise.all([
      supabase
        .from("restaurant_api_keys")
        .select("id, name, key_prefix, created_at, last_used_at, is_active")
        .eq("restaurant_id", restaurant.id)
        .order("created_at", { ascending: false }),
      supabase
        .from("integration_runs")
        .select("id, connector_type, status, idempotency_key, stats, error_message, created_at, finished_at")
        .eq("restaurant_id", restaurant.id)
        .order("created_at", { ascending: false })
        .limit(30),
    ]);
    setKeys((keysRes.data as ApiKeyRow[]) ?? []);
    setRuns((runsRes.data as RunRow[]) ?? []);
    setLoading(false);
  };

  useEffect(() => {
    if (restaurant) fetchAll();
  }, [restaurant]);

  const handleCreate = async () => {
    if (!user || !restaurant) return;
    const rawKey = generateRestaurantKey();
    const keyHash = await hashKey(rawKey);
    const keyPrefix = rawKey.slice(0, 14) + "...";

    const { error } = await supabase.from("restaurant_api_keys").insert({
      restaurant_id: restaurant.id,
      name: newKeyName || "Integrazione",
      key_hash: keyHash,
      key_prefix: keyPrefix,
      created_by: user.id,
      scopes: ["ingest:write"],
    } as never);

    if (error) {
      toast.error("Errore nella creazione della chiave");
      return;
    }

    setGeneratedKey(rawKey);
    setCreateOpen(false);
    fetchAll();
    toast.success("Chiave creata — copiala ora, non sarà più visibile");
  };

  const handleRevoke = async () => {
    if (!revokeId) return;
    await supabase.from("restaurant_api_keys").update({ is_active: false }).eq("id", revokeId);
    setRevokeId(null);
    fetchAll();
    toast.success("Chiave disattivata");
  };

  const copyExample = async () => {
    const example = `curl -X POST '${ingestUrl}' \\
  -H 'Content-Type: application/json' \\
  -H 'x-restaurant-key: LA_TUA_CHIAVE' \\
  -d '{
    "idempotency_key": "bolla-2026-001",
    "header": {
      "supplier_name": "Metro",
      "document_number": "DDT-123",
      "document_type": "ddt"
    },
    "lines": [
      { "name": "Mozzarella fiordilatte", "quantity": 5, "unit": "kg", "storage_type": "frigo" }
    ]
  }'`;
    await navigator.clipboard.writeText(example);
    toast.success("Esempio curl copiato");
  };

  if (restLoading) {
    return (
      <RestaurantAdminLayout>
        <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
      </RestaurantAdminLayout>
    );
  }

  return (
    <RestaurantAdminLayout>
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <Plug className="h-7 w-7 text-primary" />
        <div>
          <h1 className="text-2xl font-bold text-foreground">Integrazioni carico magazzino</h1>
          <p className="text-sm text-muted-foreground">
            Collega il gestionale via API REST — stesso motore delle Bolle in app.
          </p>
        </div>
      </div>

      <Card className="mb-6 border-primary/20">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Key className="h-4 w-4" /> Chiavi API ristorante
          </CardTitle>
          <Button size="sm" onClick={() => { setCreateOpen(true); setNewKeyName("Integrazione gestionale"); }}>
            <Plus className="h-4 w-4 mr-1" /> Nuova chiave
          </Button>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground">Caricamento…</p>
          ) : keys.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Nessuna chiave. Creane una per inviare carichi dal tuo software.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Prefisso</TableHead>
                  <TableHead>Ultimo uso</TableHead>
                  <TableHead>Stato</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {keys.map((k) => (
                  <TableRow key={k.id}>
                    <TableCell>{k.name}</TableCell>
                    <TableCell className="font-mono text-xs">{k.key_prefix}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {k.last_used_at
                        ? format(new Date(k.last_used_at), "d MMM yyyy HH:mm", { locale: it })
                        : "—"}
                    </TableCell>
                    <TableCell>
                      <Badge variant={k.is_active ? "default" : "secondary"}>
                        {k.is_active ? "Attiva" : "Revocata"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {k.is_active && (
                        <Button size="icon" variant="ghost" onClick={() => setRevokeId(k.id)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-base">Endpoint</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <Label className="text-xs text-muted-foreground">POST</Label>
            <p className="font-mono text-sm break-all">{ingestUrl}</p>
          </div>
          <p className="text-sm text-muted-foreground">
            Header <code className="text-xs bg-muted px-1 rounded">x-restaurant-key</code> o Bearer.
            Campo obbligatorio <code className="text-xs bg-muted px-1 rounded">idempotency_key</code> per evitare doppi carichi.
          </p>
          <Button variant="outline" size="sm" onClick={copyExample}>Copia esempio curl</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Ultimi import</CardTitle>
        </CardHeader>
        <CardContent>
          {runs.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nessun run registrato.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Stato</TableHead>
                  <TableHead>Righe</TableHead>
                  <TableHead>Idempotency</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {runs.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="text-sm">
                      {format(new Date(r.created_at), "d MMM HH:mm", { locale: it })}
                    </TableCell>
                    <TableCell>
                      <Badge variant={r.status === "success" ? "default" : "secondary"}>
                        {statusLabel[r.status] ?? r.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm">
                      {r.stats?.created != null ? `${r.stats.created}/${r.stats.total ?? "?"}` : "—"}
                    </TableCell>
                    <TableCell className="font-mono text-xs truncate max-w-[180px]">
                      {r.idempotency_key ?? "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Sheet open={createOpen} onOpenChange={setCreateOpen}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>Nuova chiave API</SheetTitle>
          </SheetHeader>
          <div className="mt-6 space-y-4">
            <div>
              <Label>Nome (es. gestionale cassa)</Label>
              <Input value={newKeyName} onChange={(e) => setNewKeyName(e.target.value)} />
            </div>
            <Button className="w-full" onClick={handleCreate}>Genera chiave</Button>
          </div>
        </SheetContent>
      </Sheet>

      <Sheet open={!!generatedKey} onOpenChange={() => setGeneratedKey(null)}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>Copia la chiave ora</SheetTitle>
          </SheetHeader>
          <p className="text-sm text-muted-foreground mt-2 mb-4">
            Non potrai più visualizzarla per intero. Conservala nel gestionale in modo sicuro.
          </p>
          <div className="flex gap-2">
            <Input readOnly value={generatedKey ?? ""} className="font-mono text-xs" />
            <Button
              size="icon"
              variant="outline"
              onClick={async () => {
                if (generatedKey) {
                  await navigator.clipboard.writeText(generatedKey);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 2000);
                }
              }}
            >
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      <AlertDialog open={!!revokeId} onOpenChange={() => setRevokeId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Revocare la chiave?</AlertDialogTitle>
            <AlertDialogDescription>
              Le integrazioni che usano questa chiave smetteranno di funzionare.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annulla</AlertDialogCancel>
            <AlertDialogAction onClick={handleRevoke}>Revoca</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </RestaurantAdminLayout>
  );
};

export default RestaurantAdminIntegrationsPage;
