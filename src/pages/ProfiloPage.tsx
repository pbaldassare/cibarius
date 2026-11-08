import { useEffect, useState, useRef } from "react";
import { vendeAbbonamenti } from "@/lib/native";
import { useTour, TourRole } from "@/components/AppTourContext";
import cibariusLogo from "@/assets/cibarius-logo.png";
import MobileHeader from "@/components/MobileHeader";
import { useAuth } from "@/hooks/useAuth";
import { Link, useNavigate } from "react-router-dom";
import { useRole } from "@/hooks/useRole";
import { supabase } from "@/integrations/supabase/client";
import {
  ChevronRight, Settings, Heart, Bell, LogOut, Sparkles, MessageSquareWarning, MessageCircle, Trash2, Camera, Share2, Copy, Lock, MessageCircleMore, Map as MapIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Switch } from "@/components/ui/switch";


const ProfiloPage = () => {
  const { user, signOut } = useAuth();
  const { role } = useRole();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { startTour } = useTour();

  // Profile data
  const [profile, setProfile] = useState<{ full_name: string | null; phone: string | null; avatar_url: string | null }>({ full_name: null, phone: null, avatar_url: null });

  // Dialogs
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [supportOpen, setSupportOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  

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

  // Email preferences
  const [emailPrefs, setEmailPrefs] = useState({ receive_verification: true, receive_password_reset: true, receive_expiry_alerts: true });
  const [savingEmailPrefs, setSavingEmailPrefs] = useState(false);

  // Change password
  const [passwordOpen, setPasswordOpen] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);

  useEffect(() => {
    if (!user) return;
    // Load profile
    supabase.from("profiles").select("full_name, phone, avatar_url").eq("id", user.id).maybeSingle().then(({ data }) => {
      if (data) setProfile(data as any);
    });

    // Load email preferences: la riga nasce al primo salvataggio, prima
    // valgono i default (maybeSingle, altrimenti PostgREST risponde 406)
    supabase.from("email_preferences").select("*").eq("user_id", user.id).maybeSingle().then(({ data }) => {
      if (data) setEmailPrefs({ receive_verification: data.receive_verification, receive_password_reset: data.receive_password_reset, receive_expiry_alerts: data.receive_expiry_alerts });
    });


  }, [user, role]);

  const handleLogout = async () => {
    await signOut();
    navigate("/auth/login", { replace: true });
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
    if (role === "restaurant_owner") {
      navigate("/restaurant/settings");
      return;
    }
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

  

  return (
    <div className="min-h-screen bg-background" data-tour="profile-page-header">
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


        {/* ═══ Menu items (il fornitore non ha voci: preferiti e abbonamento sono del consumer) ═══ */}
        {role !== "supplier" && (
        <div className="rounded-[18px] bg-card shadow-card overflow-hidden">
          {([
            { icon: Heart, label: "Preferiti", path: "/favorites", badge: 0 },
            role === "restaurant_owner"
              ? { icon: Sparkles, label: "Abbonamento", path: "/restaurant/subscription", badge: 0 }
              : { icon: Sparkles, label: "Abbonamento Premium", path: "/subscription", badge: 0 },
            { icon: Bell, label: "Promemoria scadenze", path: "/reminders", badge: 0 },
          ]).filter((item) => vendeAbbonamenti() || !item.path.endsWith("/subscription")).map((item, i) => (
            <button
              key={item.label}
              onClick={() => item.path ? navigate(item.path) : toast({ title: "In arrivo!", description: `${item.label} sarà disponibile a breve.` })}
              className={`flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors active:bg-secondary ${
                i > 0 ? "border-t border-border" : ""
              }`}
            >
              <item.icon size={20} className="text-primary shrink-0" />
              <span className="flex-1 text-[15px] font-medium text-foreground">{item.label}</span>
              {item.badge > 0 && (
                <Badge variant="destructive" className="text-[10px] px-1.5 py-0 min-w-[20px] h-5 flex items-center justify-center">
                  {item.badge > 9 ? "9+" : item.badge}
                </Badge>
              )}
              <ChevronRight size={16} className="text-muted-foreground" />
            </button>
          ))}
        </div>
        )}

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
          <button
            onClick={() => setPasswordOpen(true)}
            className="flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors active:bg-secondary border-t border-border"
          >
            <Lock size={20} className="text-muted-foreground shrink-0" />
            <span className="flex-1 text-[15px] font-medium text-foreground">Modifica password</span>
            <ChevronRight size={16} className="text-muted-foreground" />
          </button>
        </div>

        {/* ═══ Email Preferences ═══ */}
        <div className="overflow-hidden rounded-[18px] border border-border bg-card">
          <div className="px-4 py-3 border-b border-border">
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Bell size={16} className="text-primary" />
              Notifiche email
            </h3>
          </div>
          {[
            { key: "receive_expiry_alerts" as const, label: "Avvisi scadenze prodotti" },
            { key: "receive_verification" as const, label: "Email conferma account" },
            { key: "receive_password_reset" as const, label: "Email recupero password" },
          ].map((item) => (
            <div key={item.key} className="flex items-center justify-between px-4 py-3 border-b border-border last:border-b-0">
              <span className="text-[14px] text-foreground">{item.label}</span>
              <Switch
                checked={emailPrefs[item.key]}
                onCheckedChange={async (checked) => {
                  const newPrefs = { ...emailPrefs, [item.key]: checked };
                  setEmailPrefs(newPrefs);
                  setSavingEmailPrefs(true);
                  const { error } = await supabase
                    .from("email_preferences")
                    .upsert({ user_id: user!.id, ...newPrefs, updated_at: new Date().toISOString() });
                  setSavingEmailPrefs(false);
                  if (error) {
                    toast({ variant: "destructive", title: "Errore", description: "Impossibile salvare le preferenze." });
                    setEmailPrefs({ ...emailPrefs }); // revert
                  } else {
                    toast({ title: "Preferenze aggiornate" });
                  }
                }}
              />
            </div>
          ))}
        </div>

        {/* ═══ Condividi Cibarius ═══ */}
        <div className="rounded-[18px] overflow-hidden border border-border bg-gradient-to-br from-primary/10 via-card to-primary/5">
          <div className="px-4 pt-4 pb-4">
            <div className="flex items-center gap-2 mb-1">
              <Share2 size={18} className="text-primary" />
              <h3 className="text-[15px] font-semibold text-foreground">Condividi Cibarius</h3>
            </div>
            <p className="text-[13px] text-muted-foreground mb-3">
              Invita amici e colleghi a provare Cibarius! Condividi il link dell'app. 🍽️
            </p>
            <Button
              size="sm"
              className="w-full gap-1.5 text-[13px]"
              onClick={() => {
                if (typeof navigator.share === "function") {
                  navigator.share({
                    title: "Cibarius",
                    text: "Prova Cibarius! Gestisci dispensa, pasti e ricette in modo intelligente 🍽️",
                    url: "https://cibarius.online",
                  }).catch(() => {});
                } else {
                  navigator.clipboard.writeText("https://cibarius.online");
                  toast({ title: "Link copiato!" });
                }
              }}
            >
              <Share2 size={14} /> Condividi
            </Button>
          </div>
        </div>

        {/* ═══ Rivedi tour ═══ */}
        <button
          onClick={() => {
            localStorage.removeItem("cibarius_tour_done");
            startTour((role as TourRole) ?? "user");
          }}
          className="flex w-full items-center gap-3 rounded-[18px] border border-border bg-card px-4 py-3.5 text-left transition-colors active:bg-secondary"
        >
          <MapIcon size={20} className="text-primary shrink-0" />
          <span className="flex-1 text-[15px] font-medium text-foreground">Rivedi il tour dell'app</span>
          <ChevronRight size={16} className="text-muted-foreground" />
        </button>

        <Button variant="ghost" asChild className="w-full gap-2 text-primary">
          <Link to="/privacy"><Lock size={16} /> Privacy <ChevronRight size={16} /></Link>
        </Button>

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

      {/* ═══ Change Password Dialog ═══ */}
      <Dialog open={passwordOpen} onOpenChange={(o) => { setPasswordOpen(o); if (!o) { setNewPassword(""); setConfirmPassword(""); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Modifica password</DialogTitle>
            <DialogDescription>Inserisci la nuova password (minimo 6 caratteri).</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Nuova password</Label>
              <Input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="Minimo 6 caratteri" />
            </div>
            <div className="space-y-2">
              <Label>Conferma nuova password</Label>
              <Input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Ripeti la password" />
              {confirmPassword.length > 0 && newPassword !== confirmPassword && (
                <p className="text-[12px] text-destructive">Le password non coincidono</p>
              )}
              {newPassword.length > 0 && newPassword.length < 6 && (
                <p className="text-[12px] text-destructive">La password deve avere almeno 6 caratteri</p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPasswordOpen(false)}>Annulla</Button>
            <Button
              disabled={savingPassword || newPassword.length < 6 || newPassword !== confirmPassword}
              onClick={async () => {
                setSavingPassword(true);
                const { error } = await supabase.auth.updateUser({ password: newPassword });
                setSavingPassword(false);
                if (error) {
                  toast({ variant: "destructive", title: "Errore", description: error.message });
                } else {
                  toast({ title: "Password aggiornata!" });
                  setPasswordOpen(false);
                  setNewPassword("");
                  setConfirmPassword("");
                }
              }}
            >
              {savingPassword ? "Salvataggio..." : "Salva"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ProfiloPage;
