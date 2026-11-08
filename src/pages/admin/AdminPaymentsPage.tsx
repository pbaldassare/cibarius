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
  Loader2, Store, Sparkles, Users, Clock, XCircle,
  CreditCard, Gift, Settings, TrendingUp, Plus, Shield,
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
  const [settings, setSettings] = useState<any>(null);
  const [payments, setPayments] = useState<any[]>([]);
  const [overrides, setOverrides] = useState<any[]>([]);
  const [stats, setStats] = useState<any>({});
  const [filter, setFilter] = useState("all");

  // Dialogs
  const [showOverrideDialog, setShowOverrideDialog] = useState(false);
  const [showSettingsDialog, setShowSettingsDialog] = useState(false);

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
    const [subsRes, plansRes, settingsRes, paymentsRes, overridesRes] = await Promise.all([
      supabase.from("subscriptions").select("*").order("created_at", { ascending: false }),
      supabase.from("subscription_plans").select("*").order("local_price"),
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
    const activeRestMonthly = enriched.filter((s: any) => s.plan_type === "restaurant" && s.status === "active" && !s.is_free_override).length;
    const activePlusMonthly = enriched.filter((s: any) => s.plan_type === "user_plus" && s.status === "active" && !s.is_free_override).length;
    const mrr = activeRestMonthly * 19.9 + activePlusMonthly * 2.49;

    setStats({
      restaurantTrial: restTrial, restaurantActive: restActive, restaurantExpired: restExpired,
      userPlus: uPlus, freeUsers: (totalUsers ?? 0) - uPlus, mrr: mrr.toFixed(2),
      freeOverrides,
    });

    setLoading(false);
  };

  useEffect(() => { fetchAll(); }, []);

  const handleCreateOverride = async () => {
    const { data: profile } = await supabase.from("profiles").select("id").eq("email", overrideForm.user_email).maybeSingle();
    if (!profile) { toast({ variant: "destructive", title: "Utente non trovato" }); return; }

    await supabase.from("manual_subscription_overrides").insert({
      user_id: profile.id, role_type: overrideForm.role_type, override_type: "free",
      reason: overrideForm.reason, end_date: overrideForm.end_date || null, granted_by_admin_id: user?.id,
    });

    const { data: existingSub } = await supabase
      .from("subscriptions").select("id").eq("user_id", profile.id).eq("plan_type", overrideForm.role_type)
      .in("status", ["active", "trial"]).maybeSingle();

    if (!existingSub) {
      await supabase.from("subscriptions").insert({
        user_id: profile.id, plan_type: overrideForm.role_type, status: "active",
        start_date: new Date().toISOString(), is_free_override: true,
        free_override_reason: overrideForm.reason, granted_by_admin_id: user?.id,
      });
    } else {
      await supabase.from("subscriptions").update({
        is_free_override: true, free_override_reason: overrideForm.reason,
        granted_by_admin_id: user?.id, status: "active",
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
    if (settingsForm.publishable_key) updates.publishable_key_masked = settingsForm.publishable_key.slice(0, 12) + "..." + settingsForm.publishable_key.slice(-4);
    if (settingsForm.secret_key) updates.secret_key_masked = settingsForm.secret_key.slice(0, 12) + "..." + settingsForm.secret_key.slice(-4);
    if (settingsForm.webhook_secret) updates.webhook_secret_masked = settingsForm.webhook_secret.slice(0, 8) + "..." + settingsForm.webhook_secret.slice(-4);

    if (settings?.id) {
      await supabase.from("stripe_settings").update(updates).eq("id", settings.id);
    } else {
      await supabase.from("stripe_settings").insert(updates);
    }
    toast({ title: "Configurazione aggiornata" });
    setShowSettingsDialog(false);
    setSettingsForm({ publishable_key: "", secret_key: "", webhook_secret: "" });
    fetchAll();
  };

  const handleTogglePlan = async (planId: string, currentActive: boolean) => {
    await supabase.from("subscription_plans").update({ is_active: !currentActive }).eq("id", planId);
    fetchAll();
  };

  const handleManualActivate = async (subId: string) => {
    const { error } = await supabase.from("subscriptions").update({ status: "active", updated_at: new Date().toISOString() }).eq("id", subId);
    if (error) { toast({ variant: "destructive", title: "Errore", description: error.message }); return; }
    toast({ title: "Abbonamento attivato manualmente" });
    fetchAll();
  };

  const handleCancelSub = async (subId: string) => {
    const { error } = await supabase.from("subscriptions").update({ status: "cancelled", updated_at: new Date().toISOString() }).eq("id", subId);
    if (error) { toast({ variant: "destructive", title: "Errore", description: error.message }); return; }
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
        <h1 className="text-2xl font-bold text-foreground">Pagamenti</h1>
        <div className="flex gap-2">
          <Dialog open={showSettingsDialog} onOpenChange={setShowSettingsDialog}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm"><Settings className="h-4 w-4 mr-1.5" />Configurazione</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Configurazione pagamenti</DialogTitle></DialogHeader>
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
        <TabsList className="mb-4 flex-wrap">
          <TabsTrigger value="subscriptions">Abbonamenti</TabsTrigger>
          <TabsTrigger value="plans">Piani</TabsTrigger>
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
                  </div>
                </CardContent>
              </Card>
            ))}
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
            <CardHeader><CardTitle className="text-base">Ultimi pagamenti</CardTitle></CardHeader>
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
