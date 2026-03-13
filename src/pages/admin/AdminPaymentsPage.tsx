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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import {
  Loader2, Store, Sparkles, Users, Clock, CheckCircle, XCircle,
  CreditCard, Gift, Settings, TrendingUp, Plus, Shield, Ticket, Copy, Search, Trash2,
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

  // Nutritionist coupons & commissions (from old CouponsPage)
  const [nutriCoupons, setNutriCoupons] = useState<any[]>([]);
  const [commissions, setCommissions] = useState<any[]>([]);

  // Dialogs
  const [showCouponDialog, setShowCouponDialog] = useState(false);
  const [showOverrideDialog, setShowOverrideDialog] = useState(false);
  const [showSettingsDialog, setShowSettingsDialog] = useState(false);

  // Coupon form
  const [couponForm, setCouponForm] = useState({
    code: "", description: "", discount_type: "percent", discount_value: "10",
    applies_to_role_type: "", max_uses: "", valid_until: "", assigned_to_email: "",
  });

  // Override form
  const [overrideForm, setOverrideForm] = useState({
    user_email: "", role_type: "user_plus", reason: "", end_date: "",
  });

  // Settings form
  const [settingsForm, setSettingsForm] = useState({
    publishable_key: "", secret_key: "", webhook_secret: "",
  });

  // User search for coupon assignment
  const [userSearchQuery, setUserSearchQuery] = useState("");
  const [userSearchResults, setUserSearchResults] = useState<any[]>([]);
  const [searchingUsers, setSearchingUsers] = useState(false);

  const fetchAll = async () => {
    setLoading(true);
    const [subsRes, plansRes, couponsRes, settingsRes, paymentsRes, overridesRes, nutriRes, comRes] = await Promise.all([
      supabase.from("subscriptions").select("*").order("created_at", { ascending: false }),
      supabase.from("subscription_plans").select("*").order("local_price"),
      supabase.from("custom_coupons").select("*").order("created_at", { ascending: false }),
      supabase.from("stripe_settings").select("*").limit(1).maybeSingle(),
      supabase.from("stripe_payments").select("*").order("created_at", { ascending: false }).limit(50),
      supabase.from("manual_subscription_overrides").select("*").order("created_at", { ascending: false }),
      supabase.from("nutritionist_coupons" as any).select("*, profiles:nutritionist_user_id(full_name, email)").order("created_at", { ascending: false }),
      supabase.from("nutritionist_commissions" as any).select("*, nutri_profile:nutritionist_user_id(full_name, email), client_profile:client_user_id(full_name, email)").order("created_at", { ascending: false }),
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

    // Enrich custom coupons with assigned user profile
    const couponData = couponsRes.data || [];
    const assignedIds = couponData.filter((c: any) => c.assigned_to_user_id).map((c: any) => c.assigned_to_user_id);
    let assignedMap = new Map();
    if (assignedIds.length > 0) {
      const { data: assignedProfiles } = await supabase.from("profiles").select("id, email, full_name").in("id", assignedIds);
      assignedMap = new Map((assignedProfiles || []).map((p: any) => [p.id, p]));
    }
    const enrichedCoupons = couponData.map((c: any) => ({
      ...c,
      assigned_profile: c.assigned_to_user_id ? assignedMap.get(c.assigned_to_user_id) : null,
    }));

    setSubs(enriched);
    setPlans(plansRes.data || []);
    setCoupons(enrichedCoupons);
    setSettings(settingsRes.data);
    setPayments(paymentsRes.data || []);
    setOverrides(overridesRes.data || []);
    setNutriCoupons((nutriRes.data as any[]) || []);
    setCommissions((comRes.data as any[]) || []);

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
      freeOverrides, activeCoupons: enrichedCoupons.filter((c: any) => c.is_active).length,
    });

    setLoading(false);
  };

  useEffect(() => { fetchAll(); }, []);

  // Search users for coupon assignment
  const handleSearchUsers = async (q: string) => {
    setUserSearchQuery(q);
    if (q.length < 2) { setUserSearchResults([]); return; }
    setSearchingUsers(true);
    const { data } = await supabase.from("profiles").select("id, email, full_name").or(`email.ilike.%${q}%,full_name.ilike.%${q}%`).limit(5);
    setUserSearchResults(data || []);
    setSearchingUsers(false);
  };

  const handleCreateCoupon = async () => {
    let assignedUserId: string | null = null;
    if (couponForm.assigned_to_email) {
      const { data: profile } = await supabase.from("profiles").select("id").eq("email", couponForm.assigned_to_email).maybeSingle();
      if (!profile) { toast({ variant: "destructive", title: "Utente non trovato con questa email" }); return; }
      assignedUserId = profile.id;
    }
    const { error } = await supabase.from("custom_coupons").insert({
      code: couponForm.code.toUpperCase(),
      description: couponForm.description,
      discount_type: couponForm.discount_type,
      discount_value: Number(couponForm.discount_value),
      applies_to_role_type: couponForm.applies_to_role_type && couponForm.applies_to_role_type !== "all" ? couponForm.applies_to_role_type : null,
      max_uses: couponForm.max_uses ? Number(couponForm.max_uses) : null,
      valid_until: couponForm.valid_until || null,
      created_by_admin_id: user?.id,
      assigned_to_user_id: assignedUserId,
    });
    if (error) {
      toast({ variant: "destructive", title: "Errore", description: error.message.includes("unique") ? "Codice già esistente" : error.message });
      return;
    }
    await supabase.from("admin_audit_log").insert({
      admin_id: user!.id, action: "create_coupon", entity_type: "custom_coupons",
      details: { code: couponForm.code.toUpperCase(), assigned_to: couponForm.assigned_to_email || null },
    });
    toast({ title: "Coupon creato ✓" });
    setShowCouponDialog(false);
    setCouponForm({ code: "", description: "", discount_type: "percent", discount_value: "10", applies_to_role_type: "", max_uses: "", valid_until: "", assigned_to_email: "" });
    setUserSearchQuery("");
    setUserSearchResults([]);
    fetchAll();
  };

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

  const handleToggleCoupon = async (couponId: string, currentActive: boolean) => {
    await supabase.from("custom_coupons").update({ is_active: !currentActive }).eq("id", couponId);
    fetchAll();
  };

  const handleDeleteCoupon = async (couponId: string, code: string) => {
    if (!confirm(`Eliminare il coupon ${code}?`)) return;
    const { error } = await supabase.from("custom_coupons").delete().eq("id", couponId);
    if (error) {
      toast({ title: "Errore", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Coupon eliminato 🗑️" });
      await supabase.from("admin_audit_log").insert({
        admin_id: user!.id, action: "delete_coupon", entity_type: "custom_coupons",
        entity_id: couponId, details: { code },
      });
      fetchAll();
    }
  };

  const handleToggleNutriCoupon = async (id: string, currentActive: boolean) => {
    await supabase.from("nutritionist_coupons" as any).update({ is_active: !currentActive }).eq("id", id);
    fetchAll();
  };

  const updateNutriPercent = async (id: string, field: string, value: string) => {
    const num = parseFloat(value);
    if (isNaN(num) || num < 0 || num > 100) return;
    await supabase.from("nutritionist_coupons" as any).update({ [field]: num }).eq("id", id);
    toast({ title: "Percentuale aggiornata" });
    fetchAll();
  };

  const markPaid = async (commissionId: string) => {
    await supabase.from("nutritionist_commissions" as any).update({ status: "paid", paid_at: new Date().toISOString() }).eq("id", commissionId);
    toast({ title: "Commissione segnata come pagata" });
    fetchAll();
  };

  const handleManualActivate = async (subId: string) => {
    await supabase.from("subscriptions").update({ status: "active", updated_at: new Date().toISOString() }).eq("id", subId);
    toast({ title: "Abbonamento attivato manualmente" });
    fetchAll();
  };

  const handleCancelSub = async (subId: string) => {
    await supabase.from("subscriptions").update({ status: "cancelled", updated_at: new Date().toISOString() }).eq("id", subId);
    toast({ title: "Abbonamento cancellato" });
    fetchAll();
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: "Codice copiato! 📋" });
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

  const commissionStatusLabel: Record<string, string> = {
    pending: "In attesa", approved: "Approvata", paid: "Pagata", cancelled: "Annullata",
  };

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
        <h1 className="text-2xl font-bold text-foreground">Pagamenti & Coupon</h1>
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
          { label: "Coupon attivi", value: stats.activeCoupons, icon: Ticket, color: "text-amber-600" },
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
          <TabsTrigger value="coupons">Coupon</TabsTrigger>
          <TabsTrigger value="nutri">Nutrizionisti</TabsTrigger>
          <TabsTrigger value="commissions">Commissioni</TabsTrigger>
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

        {/* COUPONS TAB (custom + create) */}
        <TabsContent value="coupons">
          <div className="flex justify-end mb-4">
            <Button size="sm" onClick={() => setShowCouponDialog(true)}>
              <Plus className="h-4 w-4 mr-1.5" />Nuovo coupon
            </Button>
          </div>
          <Card>
            <CardContent className="pt-4">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Codice</TableHead>
                      <TableHead>Descrizione</TableHead>
                      <TableHead>Sconto</TableHead>
                      <TableHead>Assegnato a</TableHead>
                      <TableHead className="text-center">Utilizzi</TableHead>
                      <TableHead>Scadenza</TableHead>
                      <TableHead className="text-center">Attivo</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {coupons.map((c: any) => (
                      <TableRow key={c.id}>
                        <TableCell className="font-mono font-bold text-primary">{c.code}</TableCell>
                        <TableCell className="text-sm text-muted-foreground max-w-[150px] truncate">{c.description || "—"}</TableCell>
                        <TableCell className="text-sm font-semibold">
                          {c.discount_type === "percent" ? `${c.discount_value}%` : `€${Number(c.discount_value).toFixed(2)}`}
                        </TableCell>
                        <TableCell className="text-xs">
                          {c.assigned_profile ? (
                            <span className="text-foreground">{c.assigned_profile.full_name || c.assigned_profile.email}</span>
                          ) : c.applies_to_role_type ? (
                            <Badge variant="secondary" className="text-[10px]">{c.applies_to_role_type}</Badge>
                          ) : (
                            <span className="text-muted-foreground">Tutti</span>
                          )}
                        </TableCell>
                        <TableCell className="text-center text-sm">
                          {c.current_uses}{c.max_uses ? ` / ${c.max_uses}` : ""}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {c.valid_until ? new Date(c.valid_until).toLocaleDateString("it-IT") : "—"}
                        </TableCell>
                        <TableCell className="text-center">
                          <Switch checked={c.is_active} onCheckedChange={() => handleToggleCoupon(c.id, c.is_active)} />
                        </TableCell>
                        <TableCell>
                          <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => copyToClipboard(c.code)}>
                            <Copy className="h-3.5 w-3.5" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                    {coupons.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-6 text-muted-foreground">Nessun coupon creato</TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* NUTRI COUPONS TAB */}
        <TabsContent value="nutri">
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
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {nutriCoupons.map((c: any) => (
                      <TableRow key={c.id}>
                        <TableCell className="text-sm">{(c.profiles as any)?.full_name || (c.profiles as any)?.email || "—"}</TableCell>
                        <TableCell className="font-mono font-bold text-primary">{c.coupon_code}</TableCell>
                        <TableCell>
                          <Input type="number" className="w-20 h-8 text-xs" defaultValue={c.client_discount_percent}
                            onBlur={(e) => updateNutriPercent(c.id, "client_discount_percent", e.target.value)} />
                        </TableCell>
                        <TableCell>
                          <Input type="number" className="w-20 h-8 text-xs" defaultValue={c.nutritionist_commission_percent}
                            onBlur={(e) => updateNutriPercent(c.id, "nutritionist_commission_percent", e.target.value)} />
                        </TableCell>
                        <TableCell className="text-center text-sm">
                          {c.current_uses}{c.max_uses ? ` / ${c.max_uses}` : ""}
                        </TableCell>
                        <TableCell className="text-center">
                          <Switch checked={c.is_active} onCheckedChange={() => handleToggleNutriCoupon(c.id, c.is_active)} />
                        </TableCell>
                        <TableCell>
                          <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => copyToClipboard(c.coupon_code)}>
                            <Copy className="h-3.5 w-3.5" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* COMMISSIONS TAB */}
        <TabsContent value="commissions">
          <Card>
            <CardContent className="pt-4">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nutrizionista</TableHead>
                      <TableHead>Cliente</TableHead>
                      <TableHead>Data</TableHead>
                      <TableHead className="text-right">Importo</TableHead>
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
                            {commissionStatusLabel[c.status] || c.status}
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

      {/* Create coupon dialog */}
      <Dialog open={showCouponDialog} onOpenChange={setShowCouponDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Nuovo coupon</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Codice *</Label>
              <Input value={couponForm.code} onChange={e => setCouponForm(f => ({ ...f, code: e.target.value.toUpperCase() }))} placeholder="es. PROMO2026" className="font-mono" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Tipo sconto</Label>
                <Select value={couponForm.discount_type} onValueChange={v => setCouponForm(f => ({ ...f, discount_type: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percent">Percentuale (%)</SelectItem>
                    <SelectItem value="fixed">Fisso (€)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Valore sconto</Label>
                <Input type="number" min={0} value={couponForm.discount_value} onChange={e => setCouponForm(f => ({ ...f, discount_value: e.target.value }))} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Descrizione</Label>
              <Input value={couponForm.description} onChange={e => setCouponForm(f => ({ ...f, description: e.target.value }))} placeholder="Descrizione opzionale" />
            </div>

            {/* User assignment with search */}
            <div className="space-y-1.5">
              <Label>Assegna a utente specifico (opzionale)</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  placeholder="Cerca per nome o email..."
                  value={userSearchQuery}
                  onChange={e => handleSearchUsers(e.target.value)}
                  className="pl-9"
                />
              </div>
              {userSearchResults.length > 0 && (
                <div className="border border-border rounded-lg overflow-hidden bg-card">
                  {userSearchResults.map((u: any) => (
                    <button
                      key={u.id}
                      onClick={() => {
                        setCouponForm(f => ({ ...f, assigned_to_email: u.email }));
                        setUserSearchQuery(u.full_name ? `${u.full_name} (${u.email})` : u.email);
                        setUserSearchResults([]);
                      }}
                      className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-secondary transition-colors"
                    >
                      <div>
                        <p className="font-medium text-foreground text-xs">{u.full_name || "—"}</p>
                        <p className="text-[10px] text-muted-foreground">{u.email}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
              {couponForm.assigned_to_email && (
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant="secondary" className="text-xs">{couponForm.assigned_to_email}</Badge>
                  <Button size="sm" variant="ghost" className="h-5 w-5 p-0" onClick={() => {
                    setCouponForm(f => ({ ...f, assigned_to_email: "" }));
                    setUserSearchQuery("");
                  }}>×</Button>
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Max utilizzi</Label>
                <Input type="number" min={0} value={couponForm.max_uses} onChange={e => setCouponForm(f => ({ ...f, max_uses: e.target.value }))} placeholder="Illimitati" />
              </div>
              <div className="space-y-1.5">
                <Label>Valido fino a</Label>
                <Input type="date" value={couponForm.valid_until} onChange={e => setCouponForm(f => ({ ...f, valid_until: e.target.value }))} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Applica a ruolo</Label>
              <Select value={couponForm.applies_to_role_type || "all"} onValueChange={v => setCouponForm(f => ({ ...f, applies_to_role_type: v }))}>
                <SelectTrigger><SelectValue placeholder="Tutti i ruoli" /></SelectTrigger>
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
            <Button variant="outline" onClick={() => setShowCouponDialog(false)}>Annulla</Button>
            <Button onClick={handleCreateCoupon} disabled={!couponForm.code.trim()}>
              <Plus className="mr-2 h-4 w-4" /> Crea coupon
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
};

export default AdminPaymentsPage;
