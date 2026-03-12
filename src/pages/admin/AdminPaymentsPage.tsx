import { useEffect, useState } from "react";
import AdminLayout from "@/components/AdminLayout";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import {
  Loader2, Store, Sparkles, Users, Clock, CheckCircle, XCircle,
  CreditCard, Gift, Settings, TrendingUp, Plus, Eye, EyeOff, Shield,
} from "lucide-react";
import { format } from "date-fns";

const statusColors: Record<string, string> = {
  trial: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400",
  active: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400",
  past_due: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400",
  cancelled: "bg-muted text-muted-foreground",
  expired: "bg-destructive/10 text-destructive",
};
const statusLabels: Record<string, string> = {
  trial: "Trial", active: "Attivo", past_due: "Scaduto", cancelled: "Cancellato", expired: "Scaduto",
};

const AdminPaymentsPage = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [subs, setSubs] = useState<any[]>([]);
  const [plans, setPlans] = useState<any[]>([]);
  const [coupons, setCoupons] = useState<any[]>([]);
  const [settings, setSettings] = useState<any>(null);
  const [payments, setPayments] = useState<any[]>([]);
  const [overrides, setOverrides] = useState<any[]>([]);
  const [stats, setStats] = useState<any>({});
  const [filter, setFilter] = useState("all");

  // Dialogs
  const [showCouponDialog, setShowCouponDialog] = useState(false);
  const [showOverrideDialog, setShowOverrideDialog] = useState(false);
  const [showSettingsDialog, setShowSettingsDialog] = useState(false);

  // Coupon form
  const [couponForm, setCouponForm] = useState({
    code: "", description: "", discount_type: "percent", discount_value: "10",
    applies_to_role_type: "", max_uses: "", valid_until: "",
  });

  // Override form
  const [overrideForm, setOverrideForm] = useState({
    user_email: "", role_type: "user_plus", reason: "", end_date: "",
  });

  // Settings form
  const [settingsForm, setSettingsForm] = useState({
    publishable_key: "", secret_key: "", webhook_secret: "",
  });

  const fetchAll = async () => {
    setLoading(true);
    const [subsRes, plansRes, couponsRes, settingsRes, paymentsRes, overridesRes] = await Promise.all([
      supabase.from("subscriptions").select("*").order("created_at", { ascending: false }),
      supabase.from("subscription_plans").select("*").order("local_price"),
      supabase.from("custom_coupons").select("*").order("created_at", { ascending: false }),
      supabase.from("stripe_settings").select("*").limit(1).maybeSingle(),
      supabase.from("stripe_payments").select("*").order("created_at", { ascending: false }).limit(50),
      supabase.from("manual_subscription_overrides").select("*").order("created_at", { ascending: false }),
    ]);

    // Enrich subs with profiles
    const subData = subsRes.data || [];
    const userIds = [...new Set(subData.map((s: any) => s.user_id))];
    let profileMap = new Map();
    if (userIds.length > 0) {
      const { data: profiles } = await supabase.from("profiles").select("id, email, full_name").in("id", userIds);
      profileMap = new Map((profiles || []).map((p: any) => [p.id, p]));
    }
    const enriched = subData.map((s: any) => ({ ...s, profile: profileMap.get(s.user_id) }));

    setSubs(enriched);
    setPlans(plansRes.data || []);
    setCoupons(couponsRes.data || []);
    setSettings(settingsRes.data);
    setPayments(paymentsRes.data || []);
    setOverrides(overridesRes.data || []);

    // Stats
    const restTrial = enriched.filter((s: any) => s.plan_type === "restaurant" && s.status === "trial").length;
    const restActive = enriched.filter((s: any) => s.plan_type === "restaurant" && s.status === "active").length;
    const restExpired = enriched.filter((s: any) => s.plan_type === "restaurant" && ["expired", "cancelled"].includes(s.status)).length;
    const uPlus = enriched.filter((s: any) => s.plan_type === "user_plus" && ["trial", "active"].includes(s.status)).length;
    const { count: totalUsers } = await supabase.from("profiles").select("id", { count: "exact", head: true }).eq("role", "user");
    const freeOverrides = enriched.filter((s: any) => s.is_free_override).length;

    // MRR estimate
    const activeRestMonthly = enriched.filter((s: any) => s.plan_type === "restaurant" && s.status === "active" && !s.is_free_override).length;
    const activePlusMonthly = enriched.filter((s: any) => s.plan_type === "user_plus" && s.status === "active" && !s.is_free_override).length;
    const mrr = activeRestMonthly * 19.9 + activePlusMonthly * 2.49;

    setStats({
      restaurantTrial: restTrial, restaurantActive: restActive, restaurantExpired: restExpired,
      userPlus: uPlus, freeUsers: (totalUsers ?? 0) - uPlus, mrr: mrr.toFixed(2),
      freeOverrides, activeCoupons: (couponsRes.data || []).filter((c: any) => c.is_active).length,
    });

    setLoading(false);
  };

  useEffect(() => { fetchAll(); }, []);

  const handleCreateCoupon = async () => {
    const { error } = await supabase.from("custom_coupons").insert({
      code: couponForm.code.toUpperCase(),
      description: couponForm.description,
      discount_type: couponForm.discount_type,
      discount_value: Number(couponForm.discount_value),
      applies_to_role_type: couponForm.applies_to_role_type && couponForm.applies_to_role_type !== "all" ? couponForm.applies_to_role_type : null,
      max_uses: couponForm.max_uses ? Number(couponForm.max_uses) : null,
      valid_until: couponForm.valid_until || null,
      created_by_admin_id: user?.id,
    });
    if (error) { toast({ variant: "destructive", title: "Errore", description: error.message }); return; }
    // Audit
    await supabase.from("admin_audit_log").insert({
      admin_id: user!.id, action: "create_coupon", entity_type: "custom_coupons",
      details: { code: couponForm.code.toUpperCase() },
    });
    toast({ title: "Coupon creato" });
    setShowCouponDialog(false);
    setCouponForm({ code: "", description: "", discount_type: "percent", discount_value: "10", applies_to_role_type: "", max_uses: "", valid_until: "" });
    fetchAll();
  };

  const handleCreateOverride = async () => {
    // Find user by email
    const { data: profile } = await supabase.from("profiles").select("id").eq("email", overrideForm.user_email).maybeSingle();
    if (!profile) { toast({ variant: "destructive", title: "Utente non trovato" }); return; }

    await supabase.from("manual_subscription_overrides").insert({
      user_id: profile.id,
      role_type: overrideForm.role_type,
      override_type: "free",
      reason: overrideForm.reason,
      end_date: overrideForm.end_date || null,
      granted_by_admin_id: user?.id,
    });

    // Also create/update subscription with free override
    const { data: existingSub } = await supabase
      .from("subscriptions")
      .select("id")
      .eq("user_id", profile.id)
      .eq("plan_type", overrideForm.role_type)
      .in("status", ["active", "trial"])
      .maybeSingle();

    if (!existingSub) {
      await supabase.from("subscriptions").insert({
        user_id: profile.id,
        plan_type: overrideForm.role_type,
        status: "active",
        start_date: new Date().toISOString(),
        is_free_override: true,
        free_override_reason: overrideForm.reason,
        granted_by_admin_id: user?.id,
      });
    } else {
      await supabase.from("subscriptions").update({
        is_free_override: true,
        free_override_reason: overrideForm.reason,
        granted_by_admin_id: user?.id,
        status: "active",
      }).eq("id", existingSub.id);
    }

    await supabase.from("admin_audit_log").insert({
      admin_id: user!.id, action: "create_free_override", entity_type: "manual_subscription_overrides",
      details: { email: overrideForm.user_email, role_type: overrideForm.role_type, reason: overrideForm.reason },
    });

    toast({ title: "Accesso gratuito concesso" });
    setShowOverrideDialog(false);
    setOverrideForm({ user_email: "", role_type: "user_plus", reason: "", end_date: "" });
    fetchAll();
  };

  const handleUpdateSettings = async () => {
    const updates: any = { updated_by_admin_id: user?.id, updated_at: new Date().toISOString() };
    if (settingsForm.publishable_key) {
      updates.publishable_key_masked = settingsForm.publishable_key.slice(0, 12) + "..." + settingsForm.publishable_key.slice(-4);
    }
    if (settingsForm.secret_key) {
      updates.secret_key_masked = settingsForm.secret_key.slice(0, 12) + "..." + settingsForm.secret_key.slice(-4);
    }
    if (settingsForm.webhook_secret) {
      updates.webhook_secret_masked = settingsForm.webhook_secret.slice(0, 8) + "..." + settingsForm.webhook_secret.slice(-4);
    }

    if (settings?.id) {
      await supabase.from("stripe_settings").update(updates).eq("id", settings.id);
    } else {
      await supabase.from("stripe_settings").insert(updates);
    }

    await supabase.from("admin_audit_log").insert({
      admin_id: user!.id, action: "update_stripe_settings", entity_type: "stripe_settings",
      details: { fields_changed: Object.keys(updates).filter(k => k !== "updated_by_admin_id" && k !== "updated_at") },
    });

    toast({ title: "Configurazione aggiornata" });
    setShowSettingsDialog(false);
    setSettingsForm({ publishable_key: "", secret_key: "", webhook_secret: "" });
    fetchAll();
  };

  const handleTogglePlan = async (planId: string, currentActive: boolean) => {
    await supabase.from("subscription_plans").update({ is_active: !currentActive }).eq("id", planId);
    await supabase.from("admin_audit_log").insert({
      admin_id: user!.id, action: currentActive ? "deactivate_plan" : "activate_plan",
      entity_type: "subscription_plans", entity_id: planId,
    });
    fetchAll();
  };

  const handleToggleCoupon = async (couponId: string, currentActive: boolean) => {
    await supabase.from("custom_coupons").update({ is_active: !currentActive }).eq("id", couponId);
    fetchAll();
  };

  const handleManualActivate = async (subId: string) => {
    await supabase.from("subscriptions").update({ status: "active", updated_at: new Date().toISOString() }).eq("id", subId);
    await supabase.from("admin_audit_log").insert({
      admin_id: user!.id, action: "manual_activate", entity_type: "subscriptions", entity_id: subId,
    });
    toast({ title: "Abbonamento attivato manualmente" });
    fetchAll();
  };

  const handleCancelSub = async (subId: string) => {
    await supabase.from("subscriptions").update({ status: "cancelled", updated_at: new Date().toISOString() }).eq("id", subId);
    await supabase.from("admin_audit_log").insert({
      admin_id: user!.id, action: "cancel_subscription", entity_type: "subscriptions", entity_id: subId,
    });
    toast({ title: "Abbonamento cancellato" });
    fetchAll();
  };

  const filteredSubs = subs.filter((s: any) => {
    if (filter === "all") return true;
    if (filter === "restaurant") return s.plan_type === "restaurant";
    if (filter === "user_plus") return s.plan_type === "user_plus";
    if (filter === "trial") return s.status === "trial";
    if (filter === "active") return s.status === "active";
    if (filter === "expired") return ["expired", "cancelled"].includes(s.status);
    if (filter === "past_due") return s.status === "past_due";
    if (filter === "free") return s.is_free_override;
    return true;
  });

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-foreground">Pagamenti & Stripe</h1>
        <div className="flex gap-2">
          <Dialog open={showSettingsDialog} onOpenChange={setShowSettingsDialog}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm"><Settings className="h-4 w-4 mr-1.5" />Config Stripe</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Configurazione Stripe</DialogTitle></DialogHeader>
              <div className="space-y-4">
                {settings && (
                  <div className="space-y-2 bg-muted/50 p-3 rounded-lg text-xs">
                    <p><span className="text-muted-foreground">Chiave pubblica:</span> {settings.publishable_key_masked || "—"}</p>
                    <p><span className="text-muted-foreground">Chiave privata:</span> {settings.secret_key_masked || "—"}</p>
                    <p><span className="text-muted-foreground">Webhook:</span> {settings.webhook_secret_masked || "—"}</p>
                    <p><span className="text-muted-foreground">Ambiente:</span> {settings.environment}</p>
                    <p><span className="text-muted-foreground">Ultimo aggiornamento:</span> {format(new Date(settings.updated_at), "dd/MM/yyyy HH:mm")}</p>
                  </div>
                )}
                <div className="space-y-3">
                  <div>
                    <Label className="text-xs">Nuova chiave pubblica</Label>
                    <Input placeholder="pk_live_..." value={settingsForm.publishable_key} onChange={e => setSettingsForm(f => ({ ...f, publishable_key: e.target.value }))} />
                  </div>
                  <div>
                    <Label className="text-xs">Nuova chiave privata</Label>
                    <Input placeholder="sk_live_..." type="password" value={settingsForm.secret_key} onChange={e => setSettingsForm(f => ({ ...f, secret_key: e.target.value }))} />
                  </div>
                  <div>
                    <Label className="text-xs">Nuovo webhook secret</Label>
                    <Input placeholder="whsec_..." type="password" value={settingsForm.webhook_secret} onChange={e => setSettingsForm(f => ({ ...f, webhook_secret: e.target.value }))} />
                  </div>
                  <Button className="w-full" onClick={handleUpdateSettings}>
                    <Shield className="h-4 w-4 mr-1.5" />Aggiorna configurazione
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4 mb-6">
        {[
          { label: "Ristoranti trial", value: stats.restaurantTrial, icon: Clock, color: "text-amber-600" },
          { label: "Ristoranti attivi", value: stats.restaurantActive, icon: Store, color: "text-emerald-600" },
          { label: "User Plus", value: stats.userPlus, icon: Sparkles, color: "text-primary" },
          { label: "MRR stimato", value: `€${stats.mrr}`, icon: TrendingUp, color: "text-emerald-600" },
          { label: "Utenti gratuiti", value: stats.freeUsers, icon: Users, color: "text-muted-foreground" },
          { label: "Override gratis", value: stats.freeOverrides, icon: Gift, color: "text-primary" },
          { label: "Coupon attivi", value: stats.activeCoupons, icon: CreditCard, color: "text-amber-600" },
          { label: "Ristoranti scaduti", value: stats.restaurantExpired, icon: XCircle, color: "text-destructive" },
        ].map(({ label, value, icon: Icon, color }) => (
          <Card key={label}>
            <CardContent className="pt-3 pb-2 text-center">
              <Icon className={`h-5 w-5 mx-auto mb-1 ${color}`} />
              <p className="text-xl font-bold text-foreground">{value}</p>
              <p className="text-[10px] text-muted-foreground">{label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs defaultValue="subscriptions">
        <TabsList className="mb-4">
          <TabsTrigger value="subscriptions">Abbonamenti</TabsTrigger>
          <TabsTrigger value="plans">Piani</TabsTrigger>
          <TabsTrigger value="coupons">Coupon</TabsTrigger>
          <TabsTrigger value="overrides">Override</TabsTrigger>
          <TabsTrigger value="payments">Pagamenti</TabsTrigger>
        </TabsList>

        {/* SUBSCRIPTIONS TAB */}
        <TabsContent value="subscriptions">
          <Card>
            <CardHeader className="flex-row items-center justify-between">
              <CardTitle className="text-base">Tutti gli abbonamenti</CardTitle>
              <Select value={filter} onValueChange={setFilter}>
                <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tutti</SelectItem>
                  <SelectItem value="restaurant">Ristoranti</SelectItem>
                  <SelectItem value="user_plus">User Plus</SelectItem>
                  <SelectItem value="trial">Trial</SelectItem>
                  <SelectItem value="active">Attivi</SelectItem>
                  <SelectItem value="expired">Scaduti</SelectItem>
                  <SelectItem value="past_due">Pagamento fallito</SelectItem>
                  <SelectItem value="free">Gratuiti</SelectItem>
                </SelectContent>
              </Select>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-left">
                      <th className="pb-2 font-medium text-muted-foreground">Utente</th>
                      <th className="pb-2 font-medium text-muted-foreground">Piano</th>
                      <th className="pb-2 font-medium text-muted-foreground">Stato</th>
                      <th className="pb-2 font-medium text-muted-foreground">Inizio</th>
                      <th className="pb-2 font-medium text-muted-foreground">Azioni</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredSubs.map((s: any) => (
                      <tr key={s.id} className="border-b border-border/50">
                        <td className="py-2">
                          <p className="font-medium text-foreground text-xs">{s.profile?.full_name || "—"}</p>
                          <p className="text-[10px] text-muted-foreground">{s.profile?.email || s.user_id.slice(0, 8)}</p>
                        </td>
                        <td className="py-2">
                          <Badge variant="outline" className="text-[10px]">
                            {s.plan_type === "restaurant" ? "Ristorante" : "Plus"}
                          </Badge>
                          {s.is_free_override && <Badge className="ml-1 text-[9px] bg-primary/20 text-primary">Gratis</Badge>}
                        </td>
                        <td className="py-2">
                          <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${statusColors[s.status] || ""}`}>
                            {statusLabels[s.status] || s.status}
                          </span>
                        </td>
                        <td className="py-2 text-xs text-muted-foreground">
                          {format(new Date(s.start_date), "dd/MM/yy")}
                        </td>
                        <td className="py-2">
                          <div className="flex gap-1">
                            {s.status !== "active" && (
                              <Button size="sm" variant="ghost" className="h-7 text-[10px]" onClick={() => handleManualActivate(s.id)}>
                                Attiva
                              </Button>
                            )}
                            {["active", "trial"].includes(s.status) && (
                              <Button size="sm" variant="ghost" className="h-7 text-[10px] text-destructive" onClick={() => handleCancelSub(s.id)}>
                                Cancella
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* PLANS TAB */}
        <TabsContent value="plans">
          <div className="grid gap-4 md:grid-cols-2">
            {plans.map((plan: any) => (
              <Card key={plan.id}>
                <CardContent className="pt-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-bold text-foreground">{plan.name || plan.plan_name}</p>
                      <p className="text-xs text-muted-foreground">{plan.role_type} · {plan.billing_interval}</p>
                    </div>
                    <Switch checked={plan.is_active} onCheckedChange={() => handleTogglePlan(plan.id, plan.is_active)} />
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div><span className="text-muted-foreground">Prezzo:</span> €{Number(plan.local_price).toFixed(2)}</div>
                    <div><span className="text-muted-foreground">Trial:</span> {plan.trial_days}gg</div>
                    <div className="col-span-2"><span className="text-muted-foreground">Product ID:</span> {plan.stripe_product_id || "—"}</div>
                    <div className="col-span-2"><span className="text-muted-foreground">Price ID:</span> {plan.stripe_price_id || "Auto-detect"}</div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* COUPONS TAB */}
        <TabsContent value="coupons">
          <div className="flex justify-end mb-4">
            <Dialog open={showCouponDialog} onOpenChange={setShowCouponDialog}>
              <DialogTrigger asChild>
                <Button size="sm"><Plus className="h-4 w-4 mr-1.5" />Nuovo coupon</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Crea coupon</DialogTitle></DialogHeader>
                <div className="space-y-3">
                  <div>
                    <Label className="text-xs">Codice</Label>
                    <Input placeholder="TEST100" value={couponForm.code} onChange={e => setCouponForm(f => ({ ...f, code: e.target.value }))} className="font-mono" />
                  </div>
                  <div>
                    <Label className="text-xs">Descrizione</Label>
                    <Input value={couponForm.description} onChange={e => setCouponForm(f => ({ ...f, description: e.target.value }))} />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs">Tipo sconto</Label>
                      <Select value={couponForm.discount_type} onValueChange={v => setCouponForm(f => ({ ...f, discount_type: v }))}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="percent">Percentuale</SelectItem>
                          <SelectItem value="fixed">Importo fisso</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-xs">Valore</Label>
                      <Input type="number" value={couponForm.discount_value} onChange={e => setCouponForm(f => ({ ...f, discount_value: e.target.value }))} />
                    </div>
                  </div>
                  <div>
                    <Label className="text-xs">Applicabile a</Label>
                    <Select value={couponForm.applies_to_role_type} onValueChange={v => setCouponForm(f => ({ ...f, applies_to_role_type: v }))}>
                      <SelectTrigger><SelectValue placeholder="Tutti i piani" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Tutti</SelectItem>
                        <SelectItem value="restaurant">Solo ristoranti</SelectItem>
                        <SelectItem value="user_plus">Solo user plus</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs">Max utilizzi</Label>
                      <Input type="number" placeholder="Illimitato" value={couponForm.max_uses} onChange={e => setCouponForm(f => ({ ...f, max_uses: e.target.value }))} />
                    </div>
                    <div>
                      <Label className="text-xs">Scadenza</Label>
                      <Input type="date" value={couponForm.valid_until} onChange={e => setCouponForm(f => ({ ...f, valid_until: e.target.value }))} />
                    </div>
                  </div>
                  <Button className="w-full" onClick={handleCreateCoupon}>Crea coupon</Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
          <div className="space-y-3">
            {coupons.map((c: any) => (
              <Card key={c.id}>
                <CardContent className="pt-3 pb-2 flex items-center justify-between">
                  <div>
                    <p className="font-mono font-bold text-foreground">{c.code}</p>
                    <p className="text-xs text-muted-foreground">
                      {c.discount_type === "percent" ? `${c.discount_value}%` : `€${c.discount_value}`}
                      {c.applies_to_role_type ? ` · ${c.applies_to_role_type}` : " · tutti"}
                      {" · "}{c.current_uses}{c.max_uses ? `/${c.max_uses}` : ""} usi
                    </p>
                  </div>
                  <Switch checked={c.is_active} onCheckedChange={() => handleToggleCoupon(c.id, c.is_active)} />
                </CardContent>
              </Card>
            ))}
            {coupons.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">Nessun coupon creato</p>}
          </div>
        </TabsContent>

        {/* OVERRIDES TAB */}
        <TabsContent value="overrides">
          <div className="flex justify-end mb-4">
            <Dialog open={showOverrideDialog} onOpenChange={setShowOverrideDialog}>
              <DialogTrigger asChild>
                <Button size="sm"><Gift className="h-4 w-4 mr-1.5" />Accesso gratuito</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Concedi accesso gratuito</DialogTitle></DialogHeader>
                <div className="space-y-3">
                  <div>
                    <Label className="text-xs">Email utente</Label>
                    <Input placeholder="utente@email.com" value={overrideForm.user_email} onChange={e => setOverrideForm(f => ({ ...f, user_email: e.target.value }))} />
                  </div>
                  <div>
                    <Label className="text-xs">Tipo piano</Label>
                    <Select value={overrideForm.role_type} onValueChange={v => setOverrideForm(f => ({ ...f, role_type: v }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="user_plus">User Plus</SelectItem>
                        <SelectItem value="restaurant">Ristorante</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs">Motivazione</Label>
                    <Textarea placeholder="Motivo dell'accesso gratuito" value={overrideForm.reason} onChange={e => setOverrideForm(f => ({ ...f, reason: e.target.value }))} />
                  </div>
                  <div>
                    <Label className="text-xs">Scadenza (vuoto = illimitato)</Label>
                    <Input type="date" value={overrideForm.end_date} onChange={e => setOverrideForm(f => ({ ...f, end_date: e.target.value }))} />
                  </div>
                  <Button className="w-full" onClick={handleCreateOverride}>
                    <Gift className="h-4 w-4 mr-1.5" />Concedi accesso
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
          <div className="space-y-3">
            {overrides.map((o: any) => (
              <Card key={o.id}>
                <CardContent className="pt-3 pb-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-foreground">{o.user_id.slice(0, 8)}...</p>
                      <p className="text-xs text-muted-foreground">
                        {o.role_type} · {o.override_type}
                        {o.end_date ? ` · fino al ${format(new Date(o.end_date), "dd/MM/yyyy")}` : " · illimitato"}
                      </p>
                      {o.reason && <p className="text-[10px] text-muted-foreground mt-0.5">{o.reason}</p>}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
            {overrides.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">Nessun override</p>}
          </div>
        </TabsContent>

        {/* PAYMENTS TAB */}
        <TabsContent value="payments">
          <Card>
            <CardHeader><CardTitle className="text-base">Ultimi pagamenti Stripe</CardTitle></CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-left">
                      <th className="pb-2 font-medium text-muted-foreground">Data</th>
                      <th className="pb-2 font-medium text-muted-foreground">Importo</th>
                      <th className="pb-2 font-medium text-muted-foreground">Stato</th>
                      <th className="pb-2 font-medium text-muted-foreground">Invoice</th>
                    </tr>
                  </thead>
                  <tbody>
                    {payments.map((p: any) => (
                      <tr key={p.id} className="border-b border-border/50">
                        <td className="py-2 text-xs">{format(new Date(p.created_at), "dd/MM/yy HH:mm")}</td>
                        <td className="py-2 text-xs font-medium">€{Number(p.amount).toFixed(2)}</td>
                        <td className="py-2">
                          <Badge variant={p.status === "paid" ? "default" : "destructive"} className="text-[10px]">{p.status}</Badge>
                        </td>
                        <td className="py-2 text-[10px] text-muted-foreground font-mono">{p.stripe_invoice_id?.slice(0, 20) || "—"}</td>
                      </tr>
                    ))}
                    {payments.length === 0 && (
                      <tr><td colSpan={4} className="py-6 text-center text-muted-foreground text-sm">Nessun pagamento registrato</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </AdminLayout>
  );
};

export default AdminPaymentsPage;
