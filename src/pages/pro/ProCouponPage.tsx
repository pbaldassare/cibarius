import { useEffect, useState } from "react";
import MobileHeader from "@/components/MobileHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Loader2, Ticket, Copy, Check, Users, Banknote, Link2, QrCode, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import QRCode from "qrcode";

const ProCouponPage = () => {
  const { user } = useAuth();
  const [coupon, setCoupon] = useState<any>(null);
  const [commissions, setCommissions] = useState<any[]>([]);
  const [referralLinks, setReferralLinks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState<string | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string>("");

  const referralUrl = coupon ? `${window.location.origin}/join/${coupon.coupon_code}` : "";

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const [couponRes, commissionsRes, linksRes] = await Promise.all([
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
        supabase
          .from("user_nutritionist_links" as any)
          .select("*, profiles:client_user_id(full_name, email)")
          .eq("nutritionist_user_id", user.id)
          .order("linked_at", { ascending: false }),
      ]);
      setCoupon(couponRes.data);
      setCommissions((commissionsRes.data as any[]) ?? []);
      setReferralLinks((linksRes.data as any[]) ?? []);
      setLoading(false);
    };
    load();
  }, [user]);

  useEffect(() => {
    if (referralUrl) {
      QRCode.toDataURL(referralUrl, { width: 200, margin: 2 })
        .then(setQrDataUrl)
        .catch(() => {});
    }
  }, [referralUrl]);

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopied(label);
    toast.success(`${label} copiato!`);
    setTimeout(() => setCopied(null), 2000);
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: "Unisciti a Cibarius",
          text: `Il tuo nutrizionista ti invita su Cibarius! Usa il link per uno sconto:`,
          url: referralUrl,
        });
      } catch {}
    } else {
      handleCopy(referralUrl, "Link");
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

  const clientCount = new Set(referralLinks.map((l: any) => l.client_user_id)).size;
  const referralCount = referralLinks.filter((l: any) => l.link_source === "referral_link").length;

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
        {/* Coupon code card */}
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
                <Button variant="outline" size="icon" onClick={() => handleCopy(coupon.coupon_code, "Codice")}>
                  {copied === "Codice" ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
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

        {/* Referral link card */}
        {coupon && (
          <Card className="border-2 border-accent">
            <CardHeader className="flex flex-row items-center gap-3 pb-2">
              <Link2 className="h-5 w-5 text-primary" />
              <CardTitle className="text-base">Il tuo link referral</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-2">
                <code className="flex-1 text-xs bg-muted rounded-md px-3 py-2 break-all font-mono">
                  {referralUrl}
                </code>
                <Button variant="outline" size="icon" onClick={() => handleCopy(referralUrl, "Link")}>
                  {copied === "Link" ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1 gap-2 text-sm" onClick={handleShare}>
                  <Share2 className="h-4 w-4" /> Condividi
                </Button>
              </div>

              {/* QR Code */}
              {qrDataUrl && (
                <div className="flex flex-col items-center pt-2">
                  <p className="text-xs text-muted-foreground mb-2 flex items-center gap-1">
                    <QrCode className="h-3 w-3" /> QR Code
                  </p>
                  <img src={qrDataUrl} alt="QR Code referral" className="w-40 h-40 rounded-lg border" />
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3">
          <Card>
            <CardContent className="flex flex-col items-center py-4">
              <Users className="h-5 w-5 text-primary mb-1" />
              <span className="text-xl font-bold">{clientCount}</span>
              <span className="text-[10px] text-muted-foreground text-center">Clienti collegati</span>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex flex-col items-center py-4">
              <Link2 className="h-5 w-5 text-primary mb-1" />
              <span className="text-xl font-bold">{referralCount}</span>
              <span className="text-[10px] text-muted-foreground text-center">Via link referral</span>
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
