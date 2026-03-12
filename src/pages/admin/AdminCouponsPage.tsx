import { useEffect, useState } from "react";
import AdminLayout from "@/components/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Ticket, CheckCircle, Plus } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";

const AdminCouponsPage = () => {
  const { user } = useAuth();
  const [coupons, setCoupons] = useState<any[]>([]);
  const [commissions, setCommissions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"coupons" | "commissions">("coupons");

  // New coupon dialog
  const [createOpen, setCreateOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [newCode, setNewCode] = useState("");
  const [newDiscount, setNewDiscount] = useState("10");
  const [newDiscountType, setNewDiscountType] = useState("percent");
  const [newDescription, setNewDescription] = useState("");
  const [newMaxUses, setNewMaxUses] = useState("");
  const [newValidUntil, setNewValidUntil] = useState("");
  const [newRoleType, setNewRoleType] = useState("all");

  const load = async () => {
    setLoading(true);
    const [cRes, comRes, customRes] = await Promise.all([
      supabase
        .from("nutritionist_coupons" as any)
        .select("*, profiles:nutritionist_user_id(full_name, email)")
        .order("created_at", { ascending: false }),
      supabase
        .from("nutritionist_commissions" as any)
        .select("*, nutri_profile:nutritionist_user_id(full_name, email), client_profile:client_user_id(full_name, email)")
        .order("created_at", { ascending: false }),
      supabase
        .from("custom_coupons")
        .select("*")
        .order("created_at", { ascending: false }),
    ]);
    setCoupons((cRes.data as any[]) ?? []);
    setCommissions((comRes.data as any[]) ?? []);
    // Merge custom coupons into state (we'll show them in a separate section)
    setCustomCoupons((customRes.data as any[]) ?? []);
    setLoading(false);
  };

  const [customCoupons, setCustomCoupons] = useState<any[]>([]);

  useEffect(() => { load(); }, []);

  const toggleActive = async (id: string, currentActive: boolean) => {
    await supabase
      .from("nutritionist_coupons" as any)
      .update({ is_active: !currentActive })
      .eq("id", id);
    toast.success(currentActive ? "Coupon disattivato" : "Coupon attivato");
    load();
  };

  const toggleCustomActive = async (id: string, currentActive: boolean) => {
    await supabase
      .from("custom_coupons")
      .update({ is_active: !currentActive })
      .eq("id", id);
    toast.success(currentActive ? "Coupon disattivato" : "Coupon attivato");
    load();
  };

  const updatePercent = async (id: string, field: string, value: string) => {
    const num = parseFloat(value);
    if (isNaN(num) || num < 0 || num > 100) return;
    await supabase
      .from("nutritionist_coupons" as any)
      .update({ [field]: num })
      .eq("id", id);
    toast.success("Percentuale aggiornata");
    load();
  };

  const markPaid = async (commissionId: string) => {
    await supabase
      .from("nutritionist_commissions" as any)
      .update({ status: "paid", paid_at: new Date().toISOString() })
      .eq("id", commissionId);
    toast.success("Commissione segnata come pagata");
    load();
  };

  const handleCreateCoupon = async () => {
    if (!newCode.trim()) {
      toast.error("Inserisci un codice coupon");
      return;
    }
    setSaving(true);
    const { error } = await supabase.from("custom_coupons").insert({
      code: newCode.trim().toUpperCase(),
      discount_type: newDiscountType,
      discount_value: parseFloat(newDiscount) || 0,
      description: newDescription || null,
      max_uses: newMaxUses ? parseInt(newMaxUses) : null,
      valid_until: newValidUntil || null,
      applies_to_role_type: newRoleType === "all" ? null : newRoleType,
      created_by_admin_id: user?.id || null,
      is_active: true,
    });
    setSaving(false);
    if (error) {
      toast.error(error.message.includes("unique") ? "Codice già esistente" : error.message);
    } else {
      toast.success("Coupon creato!");
      setCreateOpen(false);
      resetForm();
      load();
    }
  };

  const resetForm = () => {
    setNewCode("");
    setNewDiscount("10");
    setNewDiscountType("percent");
    setNewDescription("");
    setNewMaxUses("");
    setNewValidUntil("");
    setNewRoleType("all");
  };

  const statusLabel: Record<string, string> = {
    pending: "In attesa",
    approved: "Approvata",
    paid: "Pagata",
    cancelled: "Annullata",
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Ticket className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold text-foreground">Gestione Coupon</h1>
        </div>
        <Button onClick={() => setCreateOpen(true)} className="gap-1.5">
          <Plus className="h-4 w-4" /> Nuovo coupon
        </Button>
      </div>

      <div className="flex gap-2 mb-4">
        <Button variant={tab === "coupons" ? "default" : "outline"} size="sm" onClick={() => setTab("coupons")}>
          Nutrizionisti ({coupons.length})
        </Button>
        <Button variant={tab === "commissions" ? "default" : "outline"} size="sm" onClick={() => setTab("commissions")}>
          Commissioni ({commissions.length})
        </Button>
      </div>

      {/* Custom coupons */}
      {tab === "coupons" && customCoupons.length > 0 && (
        <Card className="mb-4">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Coupon personalizzati</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Codice</TableHead>
                    <TableHead>Descrizione</TableHead>
                    <TableHead>Sconto</TableHead>
                    <TableHead>Ruolo</TableHead>
                    <TableHead className="text-center">Utilizzi</TableHead>
                    <TableHead>Scadenza</TableHead>
                    <TableHead className="text-center">Attivo</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {customCoupons.map((c: any) => (
                    <TableRow key={c.id}>
                      <TableCell className="font-mono font-bold text-primary">{c.code}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{c.description || "—"}</TableCell>
                      <TableCell className="text-sm font-semibold">
                        {c.discount_type === "percent" ? `${c.discount_value}%` : `€${Number(c.discount_value).toFixed(2)}`}
                      </TableCell>
                      <TableCell className="text-xs">
                        {c.applies_to_role_type ? (
                          <Badge variant="secondary" className="text-[10px]">{c.applies_to_role_type}</Badge>
                        ) : "Tutti"}
                      </TableCell>
                      <TableCell className="text-center text-sm">
                        {c.current_uses}{c.max_uses ? ` / ${c.max_uses}` : ""}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {c.valid_until ? new Date(c.valid_until).toLocaleDateString("it-IT") : "—"}
                      </TableCell>
                      <TableCell className="text-center">
                        <Switch checked={c.is_active} onCheckedChange={() => toggleCustomActive(c.id, c.is_active)} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {tab === "coupons" && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Coupon nutrizionisti</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nutrizionista</TableHead>
                    <TableHead>Codice</TableHead>
                    <TableHead>Sconto %</TableHead>
                    <TableHead>Commissione %</TableHead>
                    <TableHead className="text-center">Utilizzi</TableHead>
                    <TableHead className="text-center">Attivo</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {coupons.map((c: any) => (
                    <TableRow key={c.id}>
                      <TableCell className="text-sm">
                        {(c.profiles as any)?.full_name || (c.profiles as any)?.email || "—"}
                      </TableCell>
                      <TableCell className="font-mono font-bold text-primary">{c.coupon_code}</TableCell>
                      <TableCell>
                        <Input type="number" className="w-20 h-8 text-xs" defaultValue={c.client_discount_percent}
                          onBlur={(e) => updatePercent(c.id, "client_discount_percent", e.target.value)} />
                      </TableCell>
                      <TableCell>
                        <Input type="number" className="w-20 h-8 text-xs" defaultValue={c.nutritionist_commission_percent}
                          onBlur={(e) => updatePercent(c.id, "nutritionist_commission_percent", e.target.value)} />
                      </TableCell>
                      <TableCell className="text-center text-sm">
                        {c.current_uses}{c.max_uses ? ` / ${c.max_uses}` : ""}
                      </TableCell>
                      <TableCell className="text-center">
                        <Switch checked={c.is_active} onCheckedChange={() => toggleActive(c.id, c.is_active)} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {tab === "commissions" && (
        <Card>
          <CardContent className="pt-4">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nutrizionista</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead className="text-right">Importo pagato</TableHead>
                    <TableHead className="text-right">Commissione</TableHead>
                    <TableHead>Stato</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {commissions.map((c: any) => (
                    <TableRow key={c.id}>
                      <TableCell className="text-xs">{(c.nutri_profile as any)?.full_name || "—"}</TableCell>
                      <TableCell className="text-xs">{(c.client_profile as any)?.full_name || (c.client_profile as any)?.email || "—"}</TableCell>
                      <TableCell className="text-xs">{new Date(c.created_at).toLocaleDateString("it-IT")}</TableCell>
                      <TableCell className="text-right text-xs">€{Number(c.final_paid_amount).toFixed(2)}</TableCell>
                      <TableCell className="text-right text-xs font-semibold">€{Number(c.commission_amount).toFixed(2)}</TableCell>
                      <TableCell>
                        <Badge variant={c.status === "paid" ? "default" : c.status === "cancelled" ? "destructive" : "secondary"} className="text-[10px]">
                          {statusLabel[c.status] || c.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {(c.status === "pending" || c.status === "approved") && (
                          <Button size="sm" variant="outline" className="gap-1 text-xs" onClick={() => markPaid(c.id)}>
                            <CheckCircle className="h-3 w-3" /> Paga
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Create coupon dialog */}
      <Dialog open={createOpen} onOpenChange={(o) => { if (!o) resetForm(); setCreateOpen(o); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Nuovo coupon</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Codice *</Label>
              <Input value={newCode} onChange={e => setNewCode(e.target.value.toUpperCase())} placeholder="es. PROMO2026" className="font-mono" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Tipo sconto</Label>
                <Select value={newDiscountType} onValueChange={setNewDiscountType}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percent">Percentuale (%)</SelectItem>
                    <SelectItem value="fixed">Fisso (€)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Valore sconto</Label>
                <Input type="number" min={0} value={newDiscount} onChange={e => setNewDiscount(e.target.value)} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Descrizione</Label>
              <Input value={newDescription} onChange={e => setNewDescription(e.target.value)} placeholder="Descrizione opzionale" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Max utilizzi</Label>
                <Input type="number" min={0} value={newMaxUses} onChange={e => setNewMaxUses(e.target.value)} placeholder="Illimitati" />
              </div>
              <div className="space-y-1.5">
                <Label>Valido fino a</Label>
                <Input type="date" value={newValidUntil} onChange={e => setNewValidUntil(e.target.value)} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Applica a ruolo</Label>
              <Select value={newRoleType} onValueChange={setNewRoleType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tutti i ruoli</SelectItem>
                  <SelectItem value="user">Utente</SelectItem>
                  <SelectItem value="professional">Professionista</SelectItem>
                  <SelectItem value="restaurant_owner">Ristorante</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { resetForm(); setCreateOpen(false); }}>Annulla</Button>
            <Button onClick={handleCreateCoupon} disabled={saving || !newCode.trim()}>
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
              Crea coupon
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
};

export default AdminCouponsPage;
