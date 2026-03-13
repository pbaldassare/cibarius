import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { Check, X, Loader2, UserPlus, Bell, MessageCircle } from "lucide-react";

interface LinkRequest {
  id: string;
  user_id: string;
  status: string;
  created_at: string;
  user_name?: string;
  user_email?: string;
}

export default function ProLinkRequests({ onApproved }: { onApproved?: () => void }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [requests, setRequests] = useState<LinkRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState<string | null>(null);

  const loadRequests = async () => {
    if (!user) return;
    setLoading(true);

    const { data } = await supabase
      .from("professional_link_requests")
      .select("id, user_id, status, created_at")
      .eq("professional_id", user.id)
      .eq("status", "pending")
      .order("created_at", { ascending: false });

    const reqs = data ?? [];

    if (reqs.length > 0) {
      const userIds = reqs.map((r) => r.user_id);
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name, email")
        .in("id", userIds);

      const profileMap = new Map((profiles ?? []).map((p) => [p.id, p]));
      reqs.forEach((r: any) => {
        const p = profileMap.get(r.user_id);
        r.user_name = p?.full_name || null;
        r.user_email = p?.email || null;
      });
    }

    setRequests(reqs);
    setLoading(false);
  };

  useEffect(() => {
    loadRequests();
  }, [user]);

  const handleAction = async (req: LinkRequest, action: "approved" | "rejected") => {
    if (!user) return;
    setActing(req.id);

    // Update request status
    await supabase
      .from("professional_link_requests")
      .update({ status: action, responded_at: new Date().toISOString() })
      .eq("id", req.id);

    if (action === "approved") {
      // Generate invite code
      const code = Math.random().toString(36).substring(2, 10).toUpperCase();

      // Create invite
      await supabase.from("professional_invites").insert({
        professional_id: user.id,
        invite_code: code,
      });

      // Create client_link
      const { error: linkErr } = await supabase.from("client_links").insert({
        professional_id: user.id,
        client_user_id: req.user_id,
        status: "active",
        invite_code: code,
        activated_at: new Date().toISOString(),
      });

      if (linkErr && linkErr.code === "23505") {
        await supabase
          .from("client_links")
          .update({ status: "active", activated_at: new Date().toISOString() })
          .eq("professional_id", user.id)
          .eq("client_user_id", req.user_id);
      }

      // Get nutritionist coupon
      const { data: coupon } = await supabase
        .from("nutritionist_coupons")
        .select("coupon_code, client_discount_percent")
        .eq("nutritionist_user_id", user.id)
        .eq("is_active", true)
        .limit(1)
        .single();

      const { data: proProfile } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", user.id)
        .single();

      // Send notification to user
      await supabase.from("in_app_notifications").insert({
        user_id: req.user_id,
        type: "link_approved",
        title: "Richiesta approvata! 🎉",
        body: `${proProfile?.full_name || "Il nutrizionista"} ha accettato la tua richiesta di collegamento.${
          coupon ? ` Usa il codice ${coupon.coupon_code} per uno sconto del ${coupon.client_discount_percent}% sull'abbonamento Plus!` : ""
        }`,
        metadata: {
          professional_id: user.id,
          professional_name: proProfile?.full_name,
          coupon_code: coupon?.coupon_code || null,
          discount_percent: coupon?.client_discount_percent || null,
        },
      });

      toast({ title: "Richiesta approvata!", description: `${req.user_name || "Utente"} è stato collegato.` });
      onApproved?.();
    } else {
      // Send rejection notification
      const { data: proProfile } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", user.id)
        .single();

      await supabase.from("in_app_notifications").insert({
        user_id: req.user_id,
        type: "link_rejected",
        title: "Richiesta non accettata",
        body: `${proProfile?.full_name || "Il nutrizionista"} non ha accettato la richiesta di collegamento al momento.`,
        metadata: { professional_id: user.id },
      });

      toast({ title: "Richiesta rifiutata" });
    }

    setActing(null);
    loadRequests();
  };

  if (loading || requests.length === 0) return null;

  return (
    <Card className="border-2 border-primary/20 bg-primary/5">
      <CardContent className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <Bell className="h-4 w-4 text-primary" />
          <h3 className="font-semibold text-sm text-foreground">
            Richieste di collegamento
          </h3>
          <Badge className="bg-primary text-primary-foreground text-[10px]">{requests.length}</Badge>
        </div>
        <div className="space-y-2">
          {requests.map((req) => (
            <div key={req.id} className="flex items-center justify-between bg-background rounded-lg p-3">
              <div>
                <p className="text-sm font-medium text-foreground">{req.user_name && req.user_name.trim() ? req.user_name : req.user_email || "Utente sconosciuto"}</p>
                <p className="text-xs text-muted-foreground">{req.user_email}</p>
              </div>
              <div className="flex gap-1.5">
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 text-xs text-destructive border-destructive/30 hover:bg-destructive/10"
                  onClick={() => handleAction(req, "rejected")}
                  disabled={acting === req.id}
                >
                  {acting === req.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <X className="h-3 w-3" />}
                </Button>
                <Button
                  size="sm"
                  className="h-8 text-xs"
                  onClick={() => handleAction(req, "approved")}
                  disabled={acting === req.id}
                >
                  {acting === req.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <><Check className="h-3 w-3 mr-1" /> Approva</>}
                </Button>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
