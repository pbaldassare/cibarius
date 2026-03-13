import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { Check, X, Loader2, Bell, MessageCircle, ChevronDown, ChevronUp, Mail, User } from "lucide-react";

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
  const navigate = useNavigate();
  const [requests, setRequests] = useState<LinkRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

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

    await supabase
      .from("professional_link_requests")
      .update({ status: action, responded_at: new Date().toISOString() })
      .eq("id", req.id);

    if (action === "approved") {
      const code = Math.random().toString(36).substring(2, 10).toUpperCase();

      await supabase.from("professional_invites").insert({
        professional_id: user.id,
        invite_code: code,
      });

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
    setExpandedId(null);
    loadRequests();
  };

  const timeAgo = (date: string) => {
    const diff = Date.now() - new Date(date).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "adesso";
    if (mins < 60) return `${mins}m fa`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h fa`;
    return `${Math.floor(hrs / 24)}g fa`;
  };

  if (loading || requests.length === 0) return null;

  return (
    <Card className="border border-primary/20 overflow-hidden">
      <div className="bg-primary/5 px-4 py-2.5 flex items-center gap-2">
        <Bell className="h-4 w-4 text-primary" />
        <span className="font-semibold text-sm text-foreground">Richieste di collegamento</span>
        <Badge className="bg-primary text-primary-foreground text-[10px] ml-auto">{requests.length}</Badge>
      </div>
      <CardContent className="p-0 divide-y divide-border">
        {requests.map((req) => {
          const isExpanded = expandedId === req.id;
          const displayName = req.user_name && req.user_name.trim() ? req.user_name : req.user_email || "Utente";
          const initials = displayName.split(" ").map((w) => w[0]).join("").substring(0, 2).toUpperCase();

          return (
            <div key={req.id}>
              <button
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted/30 transition-colors text-left"
                onClick={() => setExpandedId(isExpanded ? null : req.id)}
              >
                <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <span className="text-primary font-semibold text-xs">{initials}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{displayName}</p>
                  <p className="text-[11px] text-muted-foreground">{timeAgo(req.created_at)}</p>
                </div>
                {isExpanded ? (
                  <ChevronUp className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                )}
              </button>

              {isExpanded && (
                <div className="px-4 pb-4 pt-1 space-y-3 animate-in slide-in-from-top-2 duration-200">
                  <div className="rounded-lg bg-muted/40 p-3 space-y-1.5">
                    {req.user_name && req.user_name.trim() && (
                      <div className="flex items-center gap-2 text-xs text-foreground">
                        <User className="h-3.5 w-3.5 text-muted-foreground" />
                        <span>{req.user_name}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Mail className="h-3.5 w-3.5" />
                      <span>{req.user_email || "—"}</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-9 text-xs gap-1.5"
                      onClick={() => navigate(`/pro/client/${req.user_id}/messages`)}
                    >
                      <MessageCircle className="h-3.5 w-3.5" />
                      Contatta
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-9 text-xs gap-1.5 text-destructive border-destructive/30 hover:bg-destructive/10"
                      onClick={() => handleAction(req, "rejected")}
                      disabled={acting === req.id}
                    >
                      {acting === req.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <><X className="h-3.5 w-3.5" /> Rifiuta</>}
                    </Button>
                    <Button
                      size="sm"
                      className="h-9 text-xs gap-1.5"
                      onClick={() => handleAction(req, "approved")}
                      disabled={acting === req.id}
                    >
                      {acting === req.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <><Check className="h-3.5 w-3.5" /> Approva</>}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
