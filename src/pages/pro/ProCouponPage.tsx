import { useEffect, useState } from "react";
import MobileHeader from "@/components/MobileHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Loader2, Ticket, Copy, Check, Users, Banknote } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const ProCouponPage = () => {
  const { user } = useAuth();
  const [coupon, setCoupon] = useState<any>(null);
  const [commissions, setCommissions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const [couponRes, commissionsRes] = await Promise.all([
        supabase
          .from("nutritionist_coupons" as any)
          .select("*")
          .eq("nutritionist_user_id", user.id)
          .single(),
        supabase
          .from("nutritionist_commissions" as any)
          .select("*, profiles:client_user_id(full_name, email)")
          .eq("nutritionist_user_id", user.id)
          .order("created_at", { ascending: false }),
      ]);
      setCoupon(couponRes.data);
      setCommissions((commissionsRes.data as any[]) ?? []);
      setLoading(false);
    };
    load();
  }, [user]);

  const handleCopy = () => {
    if (coupon?.coupon_code) {
      navigator.clipboard.writeText(coupon.coupon_code);
      setCopied(true);
      toast.success("Codice copiato!");
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (loading) {
    return (
      <div>
        <MobileHeader title="Guadagni da Coupon" />
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  const totalPending = commissions
    .filter((c: any) => c.status === "pending" || c.status === "approved")
    .reduce((sum: number, c: any) => sum + Number(c.commission_amount), 0);

  const totalPaid = commissions
    .filter((c: any) => c.status === "paid")
    .reduce((sum: number, c: any) => sum + Number(c.commission_amount), 0);

  const clientCount = new Set(commissions.map((c: any) => c.client_user_id)).size;

  const statusLabel: Record<string, string> = {
    pending: "In attesa",
    approved: "Approvata",
    paid: "Pagata",
    cancelled: "Annullata",
  };

  const statusVariant = (s: string) => {
    if (s === "paid") return "default" as const;
    if (s === "cancelled") return "destructive" as const;
    return "secondary" as const;
  };

  return (
    <div>
      <MobileHeader title="Guadagni da Coupon" />
      <main className="px-4 py-5 space-y-4">
        {/* Coupon card */}
        <Card className="border-2 border-primary/30">
          <CardHeader className="flex flex-row items-center gap-3 pb-2">
            <Ticket className="h-5 w-5 text-primary" />
            <CardTitle className="text-base">Il tuo codice coupon</CardTitle>
          </CardHeader>
          <CardContent>
            {coupon ? (
              <div className="flex items-center gap-3">
                <span className="text-2xl font-bold font-mono tracking-wider text-primary">
                  {coupon.coupon_code}
                </span>
                <Button variant="outline" size="icon" onClick={handleCopy}>
                  {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Nessun coupon trovato</p>
            )}
            {coupon && (
              <div className="mt-2 text-xs text-muted-foreground space-y-1">
                <p>Sconto cliente: {coupon.client_discount_percent}%</p>
                <p>Tua commissione: {coupon.nutritionist_commission_percent}%</p>
                <p>Utilizzi: {coupon.current_uses}{coupon.max_uses ? ` / ${coupon.max_uses}` : ""}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          <Card>
            <CardContent className="flex flex-col items-center py-4">
              <Users className="h-5 w-5 text-primary mb-1" />
              <span className="text-xl font-bold">{clientCount}</span>
              <span className="text-[10px] text-muted-foreground text-center">Clienti</span>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex flex-col items-center py-4">
              <Banknote className="h-5 w-5 text-amber-500 mb-1" />
              <span className="text-xl font-bold">€{totalPending.toFixed(2)}</span>
              <span className="text-[10px] text-muted-foreground text-center">Pending</span>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex flex-col items-center py-4">
              <Banknote className="h-5 w-5 text-emerald-500 mb-1" />
              <span className="text-xl font-bold">€{totalPaid.toFixed(2)}</span>
              <span className="text-[10px] text-muted-foreground text-center">Pagate</span>
            </CardContent>
          </Card>
        </div>

        {/* Commissions table */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Dettaglio commissioni</CardTitle>
          </CardHeader>
          <CardContent>
            {commissions.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nessuna commissione ancora.</p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Cliente</TableHead>
                      <TableHead>Data</TableHead>
                      <TableHead className="text-right">Pagato</TableHead>
                      <TableHead className="text-right">Commissione</TableHead>
                      <TableHead>Stato</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {commissions.map((c: any) => (
                      <TableRow key={c.id}>
                        <TableCell className="text-xs">
                          {(c.profiles as any)?.full_name || (c.profiles as any)?.email || "—"}
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
                          <Badge variant={statusVariant(c.status)} className="text-[10px]">
                            {statusLabel[c.status] || c.status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default ProCouponPage;
