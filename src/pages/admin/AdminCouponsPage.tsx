import { useEffect, useState } from "react";
import AdminLayout from "@/components/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Ticket, CheckCircle } from "lucide-react";
import { toast } from "sonner";

const AdminCouponsPage = () => {
  const [coupons, setCoupons] = useState<any[]>([]);
  const [commissions, setCommissions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"coupons" | "commissions">("coupons");

  const load = async () => {
    setLoading(true);
    const [cRes, comRes] = await Promise.all([
      supabase
        .from("nutritionist_coupons" as any)
        .select("*, profiles:nutritionist_user_id(full_name, email)")
        .order("created_at", { ascending: false }),
      supabase
        .from("nutritionist_commissions" as any)
        .select("*, nutri_profile:nutritionist_user_id(full_name, email), client_profile:client_user_id(full_name, email)")
        .order("created_at", { ascending: false }),
    ]);
    setCoupons((cRes.data as any[]) ?? []);
    setCommissions((comRes.data as any[]) ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const toggleActive = async (id: string, currentActive: boolean) => {
    await supabase
      .from("nutritionist_coupons" as any)
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
      <div className="flex items-center gap-3 mb-6">
        <Ticket className="h-6 w-6 text-primary" />
        <h1 className="text-2xl font-bold text-foreground">Gestione Coupon</h1>
      </div>

      <div className="flex gap-2 mb-4">
        <Button
          variant={tab === "coupons" ? "default" : "outline"}
          size="sm"
          onClick={() => setTab("coupons")}
        >
          Coupon ({coupons.length})
        </Button>
        <Button
          variant={tab === "commissions" ? "default" : "outline"}
          size="sm"
          onClick={() => setTab("commissions")}
        >
          Commissioni ({commissions.length})
        </Button>
      </div>

      {tab === "coupons" && (
        <Card>
          <CardContent className="pt-4">
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
                      <TableCell className="font-mono font-bold text-primary">
                        {c.coupon_code}
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          className="w-20 h-8 text-xs"
                          defaultValue={c.client_discount_percent}
                          onBlur={(e) => updatePercent(c.id, "client_discount_percent", e.target.value)}
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          className="w-20 h-8 text-xs"
                          defaultValue={c.nutritionist_commission_percent}
                          onBlur={(e) => updatePercent(c.id, "nutritionist_commission_percent", e.target.value)}
                        />
                      </TableCell>
                      <TableCell className="text-center text-sm">
                        {c.current_uses}{c.max_uses ? ` / ${c.max_uses}` : ""}
                      </TableCell>
                      <TableCell className="text-center">
                        <Switch
                          checked={c.is_active}
                          onCheckedChange={() => toggleActive(c.id, c.is_active)}
                        />
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
                      <TableCell className="text-xs">
                        {(c.nutri_profile as any)?.full_name || "—"}
                      </TableCell>
                      <TableCell className="text-xs">
                        {(c.client_profile as any)?.full_name || (c.client_profile as any)?.email || "—"}
                      </TableCell>
                      <TableCell className="text-xs">
                        {new Date(c.created_at).toLocaleDateString("it-IT")}
                      </TableCell>
                      <TableCell className="text-right text-xs">
                        €{Number(c.final_paid_amount).toFixed(2)}
                      </TableCell>
                      <TableCell className="text-right text-xs font-semibold">
                        €{Number(c.commission_amount).toFixed(2)}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={c.status === "paid" ? "default" : c.status === "cancelled" ? "destructive" : "secondary"}
                          className="text-[10px]"
                        >
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
    </AdminLayout>
  );
};

export default AdminCouponsPage;
