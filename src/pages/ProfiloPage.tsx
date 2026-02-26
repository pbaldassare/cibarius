import { useEffect, useState } from "react";
import MobileHeader from "@/components/MobileHeader";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { useRole } from "@/hooks/useRole";
import { supabase } from "@/integrations/supabase/client";
import { ChevronRight, Settings, Heart, Bell, HelpCircle, LogOut, UserX, Stethoscope, Sparkles, ClipboardList } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";

const ProfiloPage = () => {
  const { user, signOut } = useAuth();
  const { role } = useRole();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [proLink, setProLink] = useState<any>(null);
  const [proProfile, setProProfile] = useState<any>(null);
  const [loadingPro, setLoadingPro] = useState(true);
  const [hasPlan, setHasPlan] = useState(false);

  useEffect(() => {
    if (!user) return;
    const loadProLink = async () => {
      const { data: link } = await supabase
        .from("client_links")
        .select("*")
        .eq("client_user_id", user.id)
        .eq("status", "active")
        .limit(1)
        .maybeSingle();

      if (link) {
        setProLink(link);
        const [profileRes, planRes] = await Promise.all([
          supabase.from("profiles").select("full_name, email").eq("id", link.professional_id).single(),
          supabase.from("diet_plans").select("id").eq("client_user_id", user.id).eq("is_active", true).maybeSingle(),
        ]);
        setProProfile(profileRes.data);
        setHasPlan(!!planRes.data);
      }
      setLoadingPro(false);
    };
    loadProLink();
  }, [user]);

  const handleLogout = async () => {
    await signOut();
    navigate("/auth/login", { replace: true });
  };

  const revokeAccess = async () => {
    if (!proLink) return;
    const { error } = await supabase
      .from("client_links")
      .update({ status: "revoked" })
      .eq("id", proLink.id);
    if (error) {
      toast({ variant: "destructive", title: "Errore", description: error.message });
    } else {
      toast({ title: "Accesso revocato" });
      setProLink(null);
      setProProfile(null);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <MobileHeader title="Profilo" />
      <main className="px-4 py-5 space-y-5 pb-28">
        {/* Avatar section */}
        <div className="flex items-center gap-4">
          <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center text-2xl shrink-0">
            👤
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-semibold text-foreground truncate">
              {user?.user_metadata?.full_name || "Utente"}
            </h2>
            <p className="text-sm text-muted-foreground truncate">{user?.email || ""}</p>
          </div>
        </div>

        {/* ═══ Nutrizionista card — PROMINENT ═══ */}
        {role !== "professional" && <div className="rounded-[18px] bg-card shadow-card overflow-hidden">
          <div className="px-4 pt-4 pb-3">
            <div className="flex items-center gap-2 mb-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10">
                <Stethoscope className="h-4.5 w-4.5 text-primary" />
              </div>
              <div className="flex-1">
                <p className="text-[15px] font-semibold text-foreground">Il tuo nutrizionista</p>
                <p className="text-[12px] text-muted-foreground">Monitoraggio alimentare</p>
              </div>
            </div>

            {loadingPro ? (
              <p className="text-sm text-muted-foreground py-2">Caricamento…</p>
            ) : proLink && proProfile ? (
              <div className="space-y-3">
                <div className="flex items-center gap-3 rounded-[14px] bg-success/5 border border-success/20 p-3">
                  <div className="h-10 w-10 rounded-full bg-success/10 flex items-center justify-center">🩺</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{proProfile.full_name || "Professionista"}</p>
                    <p className="text-xs text-muted-foreground truncate">{proProfile.email}</p>
                  </div>
                  <Badge className="bg-success/10 text-success border-0 text-[10px]">Attivo</Badge>
                </div>
                <Button variant="outline" size="sm" className="w-full text-destructive border-destructive/30 gap-2 rounded-xl" onClick={revokeAccess}>
                  <UserX className="h-4 w-4" /> Revoca accesso
                </Button>
                {hasPlan && (
                  <Button variant="outline" size="sm" className="w-full gap-2 rounded-xl" onClick={() => navigate("/diet")}>
                    <ClipboardList className="h-4 w-4" /> Vedi il mio piano
                  </Button>
                )}
              </div>
            ) : (
              <button
                onClick={() => navigate("/invite")}
                className="flex w-full items-center gap-3 rounded-[14px] bg-primary/5 border border-primary/15 p-3.5 text-left active:scale-[0.98] transition-transform"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 shrink-0">
                  <Sparkles className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-foreground">Collega un nutrizionista</p>
                  <p className="text-xs text-muted-foreground">Condividi i tuoi dati alimentari</p>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
              </button>
            )}
          </div>
        </div>}

        {/* ═══ Menu items ═══ */}
        <div className="rounded-[18px] bg-card shadow-card overflow-hidden">
          {[
            { icon: Heart, label: "Preferiti", path: undefined },
            { icon: Bell, label: "Promemoria scadenze", path: "/reminders" },
          ].map((item, i) => (
            <button
              key={item.label}
              onClick={() => item.path ? navigate(item.path) : toast({ title: "In arrivo!", description: `${item.label} sarà disponibile a breve.` })}
              className={`flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors active:bg-secondary ${
                i > 0 ? "border-t border-border" : ""
              }`}
            >
              <item.icon size={20} className="text-primary shrink-0" />
              <span className="flex-1 text-[15px] font-medium text-foreground">{item.label}</span>
              <ChevronRight size={16} className="text-muted-foreground" />
            </button>
          ))}
        </div>

        <div className="rounded-[18px] bg-card shadow-card overflow-hidden">
          {[
            { icon: Settings, label: "Impostazioni" },
            { icon: HelpCircle, label: "Aiuto" },
          ].map((item, i) => (
            <button
              key={item.label}
              onClick={() => toast({ title: "In arrivo!", description: `${item.label} sarà disponibile a breve.` })}
              className={`flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors active:bg-secondary ${
                i > 0 ? "border-t border-border" : ""
              }`}
            >
              <item.icon size={20} className="text-muted-foreground shrink-0" />
              <span className="flex-1 text-[15px] font-medium text-foreground">{item.label}</span>
              <ChevronRight size={16} className="text-muted-foreground" />
            </button>
          ))}
        </div>

        <button
          onClick={handleLogout}
          className="flex w-full items-center justify-center gap-2 rounded-[18px] border border-destructive/20 py-3.5 text-sm font-medium text-destructive transition-colors active:bg-destructive/5"
        >
          <LogOut size={16} />
          Esci
        </button>
      </main>
    </div>
  );
};

export default ProfiloPage;
