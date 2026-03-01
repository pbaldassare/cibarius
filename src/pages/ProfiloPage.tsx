import { useEffect, useState, useRef } from "react";
import MobileHeader from "@/components/MobileHeader";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { useRole } from "@/hooks/useRole";
import { supabase } from "@/integrations/supabase/client";
import { ChevronRight, Settings, Heart, Bell, LogOut, UserX, Stethoscope, Sparkles, ClipboardList, MessageSquareWarning, Trash2, Camera, MapPin, GraduationCap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";

const ProfiloPage = () => {
  const { user, signOut } = useAuth();
  const { role } = useRole();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [proLink, setProLink] = useState<any>(null);
  const [proProfile, setProProfile] = useState<any>(null);
  const [proProfessionalProfile, setProProfessionalProfile] = useState<any>(null);
  const [loadingPro, setLoadingPro] = useState(true);
  const [hasPlan, setHasPlan] = useState(false);

  // Profile data
  const [profile, setProfile] = useState<{ full_name: string | null; phone: string | null; avatar_url: string | null }>({ full_name: null, phone: null, avatar_url: null });

  // Dialogs
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [supportOpen, setSupportOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [coachDialogOpen, setCoachDialogOpen] = useState(false);

  // Settings form
  const [editName, setEditName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [savingSettings, setSavingSettings] = useState(false);

  // Support form
  const [supportType, setSupportType] = useState<string>("problema");
  const [supportMessage, setSupportMessage] = useState("");
  const [sendingSupport, setSendingSupport] = useState(false);

  // Avatar upload
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  // Deleting
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!user) return;
    // Load profile
    supabase.from("profiles").select("full_name, phone, avatar_url").eq("id", user.id).single().then(({ data }) => {
      if (data) setProfile(data as any);
    });

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
        const [profileRes, planRes, proProfRes] = await Promise.all([
          supabase.from("profiles").select("full_name, email").eq("id", link.professional_id).single(),
          supabase.from("diet_plans").select("id").eq("client_user_id", user.id).eq("is_active", true).maybeSingle(),
          supabase.from("professional_profiles").select("display_name, specialization, city, bio, photo_url").eq("user_id", link.professional_id).maybeSingle(),
        ]);
        setProProfile(profileRes.data);
        setHasPlan(!!planRes.data);
        setProProfessionalProfile(proProfRes.data);
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

  const handleAvatarClick = () => fileRef.current?.click();

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    setUploadingAvatar(true);
    try {
      const ext = file.name.split(".").pop() || "jpg";
      const path = `${user.id}/avatar.${ext}`;
      const { error: uploadErr } = await supabase.storage.from("avatars").upload(path, file, { upsert: true });
      if (uploadErr) throw uploadErr;
      const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(path);
      const avatarUrl = urlData.publicUrl + "?t=" + Date.now();
      const { error: updateErr } = await supabase.from("profiles").update({ avatar_url: avatarUrl } as any).eq("id", user.id);
      if (updateErr) throw updateErr;
      setProfile(p => ({ ...p, avatar_url: avatarUrl }));
      toast({ title: "Foto aggiornata!" });
    } catch (err: any) {
      toast({ variant: "destructive", title: "Errore upload", description: err.message });
    } finally {
      setUploadingAvatar(false);
    }
  };

  const openSettings = () => {
    setEditName(profile.full_name || "");
    setEditPhone(profile.phone || "");
    setSettingsOpen(true);
  };

  const saveSettings = async () => {
    if (!user) return;
    setSavingSettings(true);
    const { error } = await supabase.from("profiles").update({ full_name: editName, phone: editPhone }).eq("id", user.id);
    setSavingSettings(false);
    if (error) {
      toast({ variant: "destructive", title: "Errore", description: error.message });
    } else {
      setProfile(p => ({ ...p, full_name: editName, phone: editPhone }));
      setSettingsOpen(false);
      toast({ title: "Profilo aggiornato" });
    }
  };

  const sendSupport = async () => {
    if (!user || !supportMessage.trim()) return;
    setSendingSupport(true);
    const { error } = await supabase.from("support_requests" as any).insert({ user_id: user.id, type: supportType, message: supportMessage.trim() });
    setSendingSupport(false);
    if (error) {
      toast({ variant: "destructive", title: "Errore", description: error.message });
    } else {
      setSupportOpen(false);
      setSupportMessage("");
      toast({ title: "Segnalazione inviata", description: "Ti risponderemo al più presto." });
    }
  };

  const handleDeleteAccount = async () => {
    if (!user) return;
    setDeleting(true);
    await supabase.from("support_requests" as any).insert({ user_id: user.id, type: "delete_account", message: "Richiesta eliminazione account dall'utente." });
    setDeleting(false);
    setDeleteOpen(false);
    toast({ title: "Richiesta inviata", description: "Il tuo account verrà disattivato. Verrai disconnesso." });
    setTimeout(() => signOut(), 1500);
  };

  const coachDisplayName = proProfessionalProfile?.display_name || proProfile?.full_name || "Professionista";

  return (
    <div className="min-h-screen bg-background">
      <MobileHeader title="Profilo" />
      <main className="px-4 py-5 space-y-5 pb-28">
        {/* Avatar section */}
        <div className="flex items-center gap-4">
          <button onClick={handleAvatarClick} className="relative shrink-0 group" disabled={uploadingAvatar}>
            <Avatar className="h-16 w-16">
              {profile.avatar_url ? (
                <AvatarImage src={profile.avatar_url} alt="Avatar" className="object-cover" />
              ) : null}
              <AvatarFallback className="bg-primary/10 text-2xl">👤</AvatarFallback>
            </Avatar>
            <div className="absolute inset-0 rounded-full bg-black/30 flex items-center justify-center opacity-0 group-hover:opacity-100 group-active:opacity-100 transition-opacity">
              <Camera className="h-5 w-5 text-white" />
            </div>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
          </button>
          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-semibold text-foreground truncate">
              {profile.full_name || user?.user_metadata?.full_name || "Utente"}
            </h2>
            <p className="text-sm text-muted-foreground truncate">{user?.email || ""}</p>
          </div>
        </div>

        {/* ═══ Nutrizionista card ═══ */}
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
            ) : proLink ? (
              <div className="space-y-3">
                <button
                  onClick={() => setCoachDialogOpen(true)}
                  className="flex w-full items-center gap-3 rounded-[14px] bg-success/5 border border-success/20 p-3 text-left active:scale-[0.98] transition-transform"
                >
                  <Avatar className="h-10 w-10 shrink-0">
                    {proProfessionalProfile?.photo_url ? (
                      <AvatarImage src={proProfessionalProfile.photo_url} alt={coachDisplayName} className="object-cover" />
                    ) : null}
                    <AvatarFallback className="bg-success/10 text-lg font-semibold text-success">
                      {coachDisplayName.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{coachDisplayName}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {proProfessionalProfile?.specialization || proProfile?.email || ""}
                    </p>
                  </div>
                  <Badge className="bg-success/10 text-success border-0 text-[10px]">Attivo</Badge>
                </button>
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
          <button
            onClick={openSettings}
            className="flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors active:bg-secondary"
          >
            <Settings size={20} className="text-muted-foreground shrink-0" />
            <span className="flex-1 text-[15px] font-medium text-foreground">Impostazioni</span>
            <ChevronRight size={16} className="text-muted-foreground" />
          </button>
          <button
            onClick={() => setSupportOpen(true)}
            className="flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors active:bg-secondary border-t border-border"
          >
            <MessageSquareWarning size={20} className="text-muted-foreground shrink-0" />
            <span className="flex-1 text-[15px] font-medium text-foreground">Segnala un problema o suggerimento</span>
            <ChevronRight size={16} className="text-muted-foreground" />
          </button>
        </div>

        {/* Delete account */}
        <button
          onClick={() => setDeleteOpen(true)}
          className="flex w-full items-center justify-center gap-2 rounded-[18px] border border-destructive/20 py-3.5 text-sm font-medium text-destructive/70 transition-colors active:bg-destructive/5"
        >
          <Trash2 size={16} />
          Elimina account
        </button>

        {/* Logout */}
        <button
          onClick={handleLogout}
          className="flex w-full items-center justify-center gap-2 rounded-[18px] border border-destructive/20 py-3.5 text-sm font-medium text-destructive transition-colors active:bg-destructive/5"
        >
          <LogOut size={16} />
          Esci
        </button>
      </main>

      {/* ═══ Coach Info Dialog ═══ */}
      <Dialog open={coachDialogOpen} onOpenChange={setCoachDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Il tuo nutrizionista</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col items-center gap-4 py-4">
            <Avatar className="h-20 w-20">
              {proProfessionalProfile?.photo_url ? (
                <AvatarImage src={proProfessionalProfile.photo_url} alt={coachDisplayName} className="object-cover" />
              ) : null}
              <AvatarFallback className="bg-primary/10 text-2xl font-bold">
                {coachDisplayName.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="text-center space-y-1">
              <h3 className="text-lg font-semibold text-foreground">{coachDisplayName}</h3>
              {proProfessionalProfile?.specialization && (
                <div className="flex items-center justify-center gap-1.5 text-sm text-muted-foreground">
                  <GraduationCap className="h-4 w-4" />
                  {proProfessionalProfile.specialization}
                </div>
              )}
              {proProfessionalProfile?.city && (
                <div className="flex items-center justify-center gap-1.5 text-sm text-muted-foreground">
                  <MapPin className="h-4 w-4" />
                  {proProfessionalProfile.city}
                </div>
              )}
            </div>
            {proProfessionalProfile?.bio && (
              <p className="text-sm text-muted-foreground text-center leading-relaxed px-2">
                {proProfessionalProfile.bio}
              </p>
            )}
            {proProfile?.email && (
              <p className="text-xs text-muted-foreground">{proProfile.email}</p>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* ═══ Settings Dialog ═══ */}
      <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Impostazioni profilo</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Nome completo</Label>
              <Input value={editName} onChange={e => setEditName(e.target.value)} placeholder="Il tuo nome" />
            </div>
            <div className="space-y-2">
              <Label>Telefono</Label>
              <Input value={editPhone} onChange={e => setEditPhone(e.target.value)} placeholder="+39 ..." />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={saveSettings} disabled={savingSettings} className="w-full">
              {savingSettings ? "Salvataggio..." : "Salva"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ═══ Support Dialog ═══ */}
      <Dialog open={supportOpen} onOpenChange={setSupportOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Segnala un problema o suggerimento</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Tipo</Label>
              <Select value={supportType} onValueChange={setSupportType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="problema">Problema</SelectItem>
                  <SelectItem value="suggerimento">Suggerimento</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Messaggio</Label>
              <Textarea value={supportMessage} onChange={e => setSupportMessage(e.target.value)} placeholder="Descrivi il problema o il suggerimento..." rows={4} />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={sendSupport} disabled={sendingSupport || !supportMessage.trim()} className="w-full">
              {sendingSupport ? "Invio..." : "Invia segnalazione"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ═══ Delete Account Dialog ═══ */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Elimina account</DialogTitle>
            <DialogDescription>
              Sei sicuro? Questa azione è irreversibile. Il tuo account verrà segnalato per l'eliminazione.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setDeleteOpen(false)} className="flex-1">Annulla</Button>
            <Button variant="destructive" onClick={handleDeleteAccount} disabled={deleting} className="flex-1">
              {deleting ? "Eliminazione..." : "Elimina"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ProfiloPage;
