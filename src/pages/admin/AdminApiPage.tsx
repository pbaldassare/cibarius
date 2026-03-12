import { useState, useEffect } from "react";
import AdminLayout from "@/components/AdminLayout";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { Key, Plus, Copy, Check, Trash2, Globe, ShieldCheck, Clock } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const PROJECT_ID = import.meta.env.VITE_SUPABASE_PROJECT_ID;

const ENDPOINTS = [
  { method: "GET", path: "/products", description: "Lista prodotti con paginazione e filtri", scopes: ["read"] },
  { method: "GET", path: "/products/:id", description: "Dettaglio singolo prodotto", scopes: ["read"] },
  { method: "POST", path: "/products", description: "Crea un nuovo prodotto", scopes: ["write"] },
  { method: "GET", path: "/ingredients", description: "Lista ingredienti con valori nutrizionali", scopes: ["read"] },
  { method: "GET", path: "/food-templates", description: "Database alimenti base", scopes: ["read"] },
  { method: "GET", path: "/inventory", description: "Inventario per restaurant_id", scopes: ["read"] },
  { method: "POST", path: "/search-food", description: "Ricerca unificata alimenti", scopes: ["read"] },
];

type ApiKey = {
  id: string;
  name: string;
  key_prefix: string;
  created_at: string;
  last_used_at: string | null;
  is_active: boolean;
  scopes: string[];
};

const AdminApiPage = () => {
  const { user } = useAuth();
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [newKeyName, setNewKeyName] = useState("Default");
  const [generatedKey, setGeneratedKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [revokeId, setRevokeId] = useState<string | null>(null);

  const baseUrl = `${SUPABASE_URL}/functions/v1`;

  const fetchKeys = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("api_keys")
      .select("id, name, key_prefix, created_at, last_used_at, is_active, scopes")
      .order("created_at", { ascending: false });
    setKeys((data as ApiKey[]) ?? []);
    setLoading(false);
  };

  useEffect(() => { fetchKeys(); }, []);

  const generateKey = () => {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    let key = "cib_";
    for (let i = 0; i < 40; i++) key += chars.charAt(Math.floor(Math.random() * chars.length));
    return key;
  };

  const hashKey = async (key: string) => {
    const encoded = new TextEncoder().encode(key);
    const hashBuffer = await crypto.subtle.digest("SHA-256", encoded);
    return Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, "0")).join("");
  };

  const handleCreate = async () => {
    if (!user) return;
    const rawKey = generateKey();
    const keyHash = await hashKey(rawKey);
    const keyPrefix = rawKey.slice(0, 12) + "...";

    const { error } = await supabase.from("api_keys").insert({
      name: newKeyName || "Default",
      key_hash: keyHash,
      key_prefix: keyPrefix,
      created_by: user.id,
      scopes: ["read", "write"],
    } as any);

    if (error) {
      toast.error("Errore nella creazione");
      return;
    }

    setGeneratedKey(rawKey);
    fetchKeys();
  };

  const handleRevoke = async () => {
    if (!revokeId) return;
    await supabase.from("api_keys").update({ is_active: false } as any).eq("id", revokeId);
    toast.success("Chiave revocata");
    setRevokeId(null);
    fetchKeys();
  };

  const copyKey = () => {
    if (!generatedKey) return;
    navigator.clipboard.writeText(generatedKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <AdminLayout>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Key className="h-6 w-6" /> API Cibarius
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Gestisci le chiavi API per integrazioni interne</p>
        </div>
        <Button onClick={() => { setCreateOpen(true); setGeneratedKey(null); setNewKeyName("Default"); }} className="gap-2">
          <Plus className="h-4 w-4" /> Genera Chiave
        </Button>
      </div>

      {/* Base URL */}
      <Card className="mb-6">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Globe className="h-4 w-4" /> Base URL
          </CardTitle>
        </CardHeader>
        <CardContent>
          <code className="text-sm bg-muted px-3 py-2 rounded-md block font-mono break-all">
            {baseUrl}
          </code>
          <p className="text-xs text-muted-foreground mt-2">
            Header richiesto: <code className="bg-muted px-1 rounded">x-api-key: cib_...</code>
          </p>
        </CardContent>
      </Card>

      {/* API Keys Table */}
      <Card className="mb-6">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <ShieldCheck className="h-4 w-4" /> Chiavi API
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Chiave</TableHead>
                <TableHead>Scopes</TableHead>
                <TableHead>Creata</TableHead>
                <TableHead>Ultimo uso</TableHead>
                <TableHead>Stato</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Caricamento...</TableCell></TableRow>
              ) : keys.length === 0 ? (
                <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Nessuna chiave API generata</TableCell></TableRow>
              ) : (
                keys.map((k) => (
                  <TableRow key={k.id}>
                    <TableCell className="font-medium">{k.name}</TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">{k.key_prefix}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        {k.scopes.map(s => (
                          <Badge key={s} variant="outline" className="text-xs">{s}</Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(k.created_at).toLocaleDateString("it-IT")}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {k.last_used_at ? new Date(k.last_used_at).toLocaleDateString("it-IT") : "Mai"}
                    </TableCell>
                    <TableCell>
                      <Badge variant={k.is_active ? "default" : "secondary"}>
                        {k.is_active ? "Attiva" : "Revocata"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {k.is_active && (
                        <Button variant="ghost" size="icon" onClick={() => setRevokeId(k.id)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Endpoints Reference */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Clock className="h-4 w-4" /> Endpoint Disponibili
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[100px]">Metodo</TableHead>
                <TableHead>Endpoint</TableHead>
                <TableHead>Descrizione</TableHead>
                <TableHead>Scopes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {ENDPOINTS.map((ep) => (
                <TableRow key={ep.method + ep.path}>
                  <TableCell>
                    <Badge variant={ep.method === "GET" ? "outline" : "default"}
                      className={ep.method === "GET" ? "bg-emerald-100 text-emerald-700 border-emerald-200" : "bg-blue-100 text-blue-700 border-blue-200"}>
                      {ep.method}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-mono text-sm">{ep.path}</TableCell>
                  <TableCell className="text-muted-foreground">{ep.description}</TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      {ep.scopes.map(s => <Badge key={s} variant="outline" className="text-xs">{s}</Badge>)}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Create Sheet */}
      <Sheet open={createOpen} onOpenChange={setCreateOpen}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>Genera Chiave API</SheetTitle>
          </SheetHeader>
          <div className="mt-6 space-y-4">
            {!generatedKey ? (
              <>
                <div>
                  <Label>Nome chiave</Label>
                  <Input value={newKeyName} onChange={(e) => setNewKeyName(e.target.value)} placeholder="Es. Backend App" className="mt-1" />
                </div>
                <Button onClick={handleCreate} className="w-full">Genera</Button>
              </>
            ) : (
              <>
                <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
                  <p className="text-sm font-medium text-amber-800 mb-2">⚠️ Copia la chiave ora — non sarà più visibile</p>
                  <div className="flex gap-2">
                    <code className="flex-1 text-xs bg-background p-2 rounded font-mono break-all border">{generatedKey}</code>
                    <Button variant="outline" size="icon" onClick={copyKey}>
                      {copied ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
                <Button variant="outline" className="w-full" onClick={() => setCreateOpen(false)}>Chiudi</Button>
              </>
            )}
          </div>
        </SheetContent>
      </Sheet>

      {/* Revoke Dialog */}
      <AlertDialog open={!!revokeId} onOpenChange={(o) => !o && setRevokeId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Revocare questa chiave?</AlertDialogTitle>
            <AlertDialogDescription>La chiave non potrà più essere usata. Questa azione è irreversibile.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annulla</AlertDialogCancel>
            <AlertDialogAction onClick={handleRevoke} className="bg-destructive text-destructive-foreground">Revoca</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminLayout>
  );
};

export default AdminApiPage;
