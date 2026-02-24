import { useEffect, useState } from "react";
import MobileHeader from "@/components/MobileHeader";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { ChevronRight, Settings, Heart, Bell, HelpCircle, LogOut, UserX, Stethoscope } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";

const menuItems = [
  { icon: Heart, label: "Preferiti", count: 12 },
  { icon: Bell, label: "Notifiche" },
  { icon: Settings, label: "Impostazioni" },
  { icon: HelpCircle, label: "Aiuto" },
];

const ProfiloPage = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [proLink, setProLink] = useState<any>(null);
  const [proProfile, setProProfile] = useState<any>(null);
  const [loadingPro, setLoadingPro] = useState(true);

  useEffect(() => {
    if (!user) return;
    const loadProLink = async () => {
      const { data: link } = await supabase
        .from("client_links")
        .select("*")
        .eq("client_user_id", user.id)
        .eq("status", "active")
        .limit(1)
        .single();

      if (link) {
        setProLink(link);
        const { data: profile } = await supabase
          .from("profiles")
          .select("full_name, email")
          .eq("id", link.professional_id)
          .single();
        setProProfile(profile);
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
    <div>
      <MobileHeader title="Profilo" />
      <main className="px-4 py-5 space-y-6">
        {/* Avatar section */}
        <div className="flex flex-col items-center py-4">
          <div className="h-20 w-20 rounded-full bg-primary/10 flex items-center justify-center text-3xl">
            👤
          </div>
          <h2 className="mt-3 text-lg font-semibold text-foreground">
            {user?.user_metadata?.full_name || "Utente"}
          </h2>
          <p className="text-sm text-muted-foreground">{user?.email || ""}</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "Scansioni", value: "48" },
            { label: "Preferiti", value: "12" },
            { label: "Pasti", value: "23" },
          ].map((stat) => (
            <div
              key={stat.label}
              className="flex flex-col items-center rounded-xl bg-secondary p-3"
            >
              <span className="text-xl font-bold text-foreground">{stat.value}</span>
              <span className="text-xs text-muted-foreground">{stat.label}</span>
            </div>
          ))}
        </div>

        {/* Professional section */}
        <Card className="border-2 border-accent">
          <CardContent className="py-4 space-y-3">
            <div className="flex items-center gap-2">
              <Stethoscope className="h-5 w-5 text-primary" />
              <span className="text-sm font-semibold text-foreground">Professionista</span>
            </div>
            {loadingPro ? (
              <p className="text-sm text-muted-foreground">Caricamento…</p>
            ) : proLink && proProfile ? (
              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">🩺</div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-foreground">{proProfile.full_name || "Professionista"}</p>
                    <p className="text-xs text-muted-foreground">{proProfile.email}</p>
                  </div>
                  <Badge>Attivo</Badge>
                </div>
                <Button variant="outline" size="sm" className="w-full text-destructive border-destructive/30 gap-2" onClick={revokeAccess}>
                  <UserX className="h-4 w-4" /> Revoca accesso
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Nessun nutrizionista collegato.</p>
                <Button variant="outline" size="sm" className="w-full" onClick={() => navigate("/invite")}>
                  Collega nutrizionista
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Menu */}
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          {menuItems.map((item, i) => (
            <button
              key={item.label}
              className={`flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors active:bg-secondary ${
                i > 0 ? "border-t border-border" : ""
              }`}
            >
              <item.icon size={20} className="text-primary shrink-0" />
              <span className="flex-1 text-sm font-medium text-card-foreground">{item.label}</span>
              {item.count && (
                <span className="text-xs text-muted-foreground mr-1">{item.count}</span>
              )}
              <ChevronRight size={16} className="text-muted-foreground" />
            </button>
          ))}
        </div>

        <button
          onClick={handleLogout}
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-destructive/30 py-3 text-sm font-medium text-destructive transition-colors active:bg-destructive/5"
        >
          <LogOut size={16} />
          Esci
        </button>
      </main>
    </div>
  );
};

export default ProfiloPage;
