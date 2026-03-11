import { useEffect, useState, useRef } from "react";
import { usePwaInstall } from "@/hooks/usePwaInstall";
import MobileHeader from "@/components/MobileHeader";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { useRole } from "@/hooks/useRole";
import { supabase } from "@/integrations/supabase/client";
import {
  ChevronRight, Settings, Heart, Bell, LogOut, UserX, Stethoscope, Sparkles,
  ClipboardList, MessageSquareWarning, Trash2, Camera, MapPin, GraduationCap,
  Globe, Instagram, Facebook, Linkedin, Briefcase, Monitor, Building2, Eye, EyeOff, Pencil, X,
  Download,
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

const ROLE_OPTIONS = [
  "Nutrizionista", "Dietologo", "Personal Trainer", "Mental Coach", "Biologo nutrizionista",
];

interface ProProfileData {
  id: string;
  display_name: string;
  specialization: string;
  city: string | null;
  bio: string | null;
  photo_url: string | null;
  experience_years: number | null;
  additional_roles: string[] | null;
  workplace: string | null;
  website: string | null;
  instagram: string | null;
  facebook: string | null;
  linkedin: string | null;
  works_online: boolean;
  works_in_person: boolean;
  is_visible: boolean;
}

// PWA install hook is used from usePwaInstall

const ProfiloPage = () => {
  const { user, signOut } = useAuth();
  const { role } = useRole();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [proLink, setProLink] = useState<any>(null);
  const [proProfile, setProProfile] = useState<any>(null);
  const [proProfessionalProfile, setProProfessionalProfile] = useState<ProProfileData | null>(null);
  const [loadingPro, setLoadingPro] = useState(true);
  const [hasPlan, setHasPlan] = useState(false);

  // Professional's own profile (when role=professional)
  const [myProProfile, setMyProProfile] = useState<ProProfileData | null>(null);
  const [loadingMyPro, setLoadingMyPro] = useState(true);
  const [proEditOpen, setProEditOpen] = useState(false);
  const [proForm, setProForm] = useState<Partial<ProProfileData>>({});
  const [savingProForm, setSavingProForm] = useState(false);
  const [customRole, setCustomRole] = useState("");

  // Pro photo upload
  const proPhotoRef = useRef<HTMLInputElement>(null);
  const [uploadingProPhoto, setUploadingProPhoto] = useState(false);

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

  // PWA install
  const { canInstall, isInstalled: isPwaInstalled, isIos, install: handlePwaInstall } = usePwaInstall();

  useEffect(() => {
    if (!user) return;
    // Load profile
    supabase.from("profiles").select("full_name, phone, avatar_url").eq("id", user.id).single().then(({ data }) => {
      if (data) setProfile(data as any);
    });

    // Load professional's own profile
    if (role === "professional") {
      (async () => {
        const { data, error } = await supabase
          .from("professional_profiles")
          .select("*")
          .eq("user_id", user.id)
          .maybeSingle();

        if (error) {
          console.error("Error loading pro profile:", error);
        }

        if (data) {
          setMyProProfile(data as any);
        } else if (user) {
          // Auto-create professional profile if missing
          const { data: profileData } = await supabase
            .from("profiles")
            .select("full_name")
            .eq("id", user.id)
            .single();
          const { data: newProfile, error: insertErr } = await supabase
            .from("professional_profiles")
            .insert({
              user_id: user.id,
              display_name: profileData?.full_name || "Professionista",
              specialization: "",
            })
            .select()
            .single();
          if (insertErr) {
            console.error("Error creating pro profile:", insertErr);
          } else if (newProfile) {
            setMyProProfile(newProfile as any);
          }
        }
        setLoadingMyPro(false);
      })();
    } else {
      setLoadingMyPro(false);
    }

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
          supabase.from("professional_profiles").select("*").eq("user_id", link.professional_id).maybeSingle(),
        ]);
        setProProfile(profileRes.data);
        setHasPlan(!!planRes.data);
        setProProfessionalProfile(proProfRes.data as any);
      }
      setLoadingPro(false);
    };
    loadProLink();
  }, [user, role]);

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

  // ═══ Pro profile handlers ═══
  const openProEdit = () => {
    if (!myProProfile) return;
    setProForm({ ...myProProfile });
    setCustomRole("");
    setProEditOpen(true);
  };

  const handleProPhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user || !myProProfile) return;
    setUploadingProPhoto(true);
    try {
      const ext = file.name.split(".").pop() || "jpg";
      const path = `${user.id}/pro-photo.${ext}`;
      const { error: uploadErr } = await supabase.storage.from("avatars").upload(path, file, { upsert: true });
      if (uploadErr) throw uploadErr;
      const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(path);
      const photoUrl = urlData.publicUrl + "?t=" + Date.now();
      await supabase.from("professional_profiles").update({ photo_url: photoUrl } as any).eq("id", myProProfile.id);
      setMyProProfile(p => p ? { ...p, photo_url: photoUrl } : p);
      toast({ title: "Foto profilo aggiornata!" });
    } catch (err: any) {
      toast({ variant: "destructive", title: "Errore upload", description: err.message });
    } finally {
      setUploadingProPhoto(false);
    }
  };

  const toggleRole = (r: string) => {
    const current = proForm.additional_roles || [];
    if (current.includes(r)) {
      setProForm(f => ({ ...f, additional_roles: current.filter(x => x !== r) }));
    } else {
      setProForm(f => ({ ...f, additional_roles: [...current, r] }));
    }
  };

  const addCustomRole = () => {
    const trimmed = customRole.trim();
    if (!trimmed) return;
    const current = proForm.additional_roles || [];
    if (!current.includes(trimmed)) {
      setProForm(f => ({ ...f, additional_roles: [...current, trimmed] }));
    }
    setCustomRole("");
  };

  const saveProProfile = async () => {
    if (!user || !myProProfile) return;
    setSavingProForm(true);
    const { error } = await supabase.from("professional_profiles").update({
      display_name: proForm.display_name || myProProfile.display_name,
      specialization: proForm.specialization || "",
      experience_years: proForm.experience_years ?? null,
      additional_roles: proForm.additional_roles || [],
      city: proForm.city || null,
      workplace: proForm.workplace || null,
      bio: proForm.bio || null,
      website: proForm.website || null,
      instagram: proForm.instagram || null,
      facebook: proForm.facebook || null,
      linkedin: proForm.linkedin || null,
      works_online: proForm.works_online ?? false,
      works_in_person: proForm.works_in_person ?? true,
      is_visible: proForm.is_visible ?? true,
    } as any).eq("id", myProProfile.id);
    setSavingProForm(false);
    if (error) {
      toast({ variant: "destructive", title: "Errore", description: error.message });
    } else {
      setMyProProfile(p => p ? { ...p, ...proForm } as ProProfileData : p);
      setProEditOpen(false);
      toast({ title: "Profilo professionale aggiornato!" });
    }
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

        {/* ═══ Professional Profile Card (only for professionals) ═══ */}
        {role === "professional" && (
          <div className="rounded-[18px] bg-card shadow-card overflow-hidden">
            <div className="px-4 pt-4 pb-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10">
                    <Briefcase className="h-4.5 w-4.5 text-primary" />
                  </div>
                  <div>
                    <p className="text-[15px] font-semibold text-foreground">Il tuo profilo professionale</p>
                    <p className="text-[12px] text-muted-foreground">Visibile ai tuoi clienti e nella ricerca</p>
                  </div>
                </div>
                <Button variant="ghost" size="icon" onClick={openProEdit} className="h-8 w-8">
                  <Pencil className="h-4 w-4" />
                </Button>
              </div>

              {loadingMyPro ? (
                <p className="text-sm text-muted-foreground py-2">Caricamento…</p>
              ) : myProProfile ? (
                <div className="space-y-3">
                  {/* Photo + name */}
                  <div className="flex items-center gap-3">
                    <button onClick={() => proPhotoRef.current?.click()} className="relative shrink-0 group" disabled={uploadingProPhoto}>
                      <Avatar className="h-14 w-14">
                        {myProProfile.photo_url ? (
                          <AvatarImage src={myProProfile.photo_url} alt="Pro photo" className="object-cover" />
                        ) : null}
                        <AvatarFallback className="bg-primary/10 text-xl font-bold">{myProProfile.display_name?.charAt(0)?.toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <div className="absolute inset-0 rounded-full bg-black/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <Camera className="h-4 w-4 text-white" />
                      </div>
                      <input ref={proPhotoRef} type="file" accept="image/*" className="hidden" onChange={handleProPhotoUpload} />
                    </button>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-foreground truncate">{myProProfile.display_name}</p>
                      {myProProfile.specialization && <p className="text-xs text-muted-foreground">{myProProfile.specialization}</p>}
                    </div>
                    <Badge variant={myProProfile.is_visible ? "default" : "secondary"} className="text-[10px] gap-1">
                      {myProProfile.is_visible ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
                      {myProProfile.is_visible ? "Visibile" : "Nascosto"}
                    </Badge>
                  </div>

                  {/* Details grid */}
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    {myProProfile.experience_years != null && (
                      <div className="flex items-center gap-1.5 text-muted-foreground">
                        <GraduationCap className="h-3.5 w-3.5 shrink-0" />
                        <span>{myProProfile.experience_years} anni di esperienza</span>
                      </div>
                    )}
                    {myProProfile.city && (
                      <div className="flex items-center gap-1.5 text-muted-foreground">
                        <MapPin className="h-3.5 w-3.5 shrink-0" />
                        <span className="truncate">{myProProfile.city}</span>
                      </div>
                    )}
                    {myProProfile.workplace && (
                      <div className="flex items-center gap-1.5 text-muted-foreground">
                        <Building2 className="h-3.5 w-3.5 shrink-0" />
                        <span className="truncate">{myProProfile.workplace}</span>
                      </div>
                    )}
                    {(myProProfile.works_online || myProProfile.works_in_person) && (
                      <div className="flex items-center gap-1.5 text-muted-foreground">
                        <Monitor className="h-3.5 w-3.5 shrink-0" />
                        <span>
                          {[myProProfile.works_online && "Online", myProProfile.works_in_person && "In presenza"].filter(Boolean).join(" · ")}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Additional roles */}
                  {myProProfile.additional_roles && myProProfile.additional_roles.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {myProProfile.additional_roles.map(r => (
                        <Badge key={r} variant="outline" className="text-[10px]">{r}</Badge>
                      ))}
                    </div>
                  )}

                  {/* Social links */}
                  {(myProProfile.website || myProProfile.instagram || myProProfile.facebook || myProProfile.linkedin) && (
                    <div className="flex gap-2">
                      {myProProfile.website && <a href={myProProfile.website} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-primary"><Globe className="h-4 w-4" /></a>}
                      {myProProfile.instagram && <a href={`https://instagram.com/${myProProfile.instagram.replace("@", "")}`} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-primary"><Instagram className="h-4 w-4" /></a>}
                      {myProProfile.facebook && <a href={myProProfile.facebook} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-primary"><Facebook className="h-4 w-4" /></a>}
                      {myProProfile.linkedin && <a href={myProProfile.linkedin} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-primary"><Linkedin className="h-4 w-4" /></a>}
                    </div>
                  )}

                  {myProProfile.bio && <p className="text-xs text-muted-foreground line-clamp-3">{myProProfile.bio}</p>}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Profilo non trovato.</p>
              )}
            </div>
          </div>
        )}

        {/* ═══ Nutrizionista card (for users) ═══ */}
        {role !== "professional" && role !== "restaurant_owner" && role !== "supplier" && <div className="rounded-[18px] bg-card shadow-card overflow-hidden">
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
          {!isPwaInstalled && (
            <button
              onClick={() => {
                if (pwaPrompt) {
                  handlePwaInstall();
                } else if (isIos) {
                  toast({ title: "Installa Cibarius", description: "Tocca Condividi ↑ poi \"Aggiungi alla schermata Home\"" });
                } else {
                  toast({ title: "Installa Cibarius", description: "Apri il menù del browser (⋮) e seleziona \"Installa app\" o \"Aggiungi alla schermata Home\"" });
                }
              }}
              className="flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors active:bg-secondary border-t border-border"
            >
              <Download size={20} className="text-primary shrink-0" />
              <span className="flex-1 text-[15px] font-medium text-foreground">Installa app</span>
              <ChevronRight size={16} className="text-muted-foreground" />
            </button>
          )}
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

      {/* ═══ Coach Info Dialog (enriched) ═══ */}
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
              {proProfessionalProfile?.experience_years != null && (
                <p className="text-sm text-muted-foreground">{proProfessionalProfile.experience_years} anni di esperienza</p>
              )}
              {proProfessionalProfile?.city && (
                <div className="flex items-center justify-center gap-1.5 text-sm text-muted-foreground">
                  <MapPin className="h-4 w-4" />
                  {proProfessionalProfile.city}
                </div>
              )}
              {proProfessionalProfile?.workplace && (
                <div className="flex items-center justify-center gap-1.5 text-sm text-muted-foreground">
                  <Building2 className="h-4 w-4" />
                  {proProfessionalProfile.workplace}
                </div>
              )}
            </div>

            {/* Availability */}
            {(proProfessionalProfile?.works_online || proProfessionalProfile?.works_in_person) && (
              <div className="flex gap-2">
                {proProfessionalProfile.works_online && <Badge variant="outline" className="text-[10px] gap-1"><Monitor className="h-3 w-3" /> Online</Badge>}
                {proProfessionalProfile.works_in_person && <Badge variant="outline" className="text-[10px] gap-1"><Building2 className="h-3 w-3" /> In presenza</Badge>}
              </div>
            )}

            {/* Additional roles */}
            {proProfessionalProfile?.additional_roles && proProfessionalProfile.additional_roles.length > 0 && (
              <div className="flex flex-wrap justify-center gap-1">
                {proProfessionalProfile.additional_roles.map(r => (
                  <Badge key={r} variant="secondary" className="text-[10px]">{r}</Badge>
                ))}
              </div>
            )}

            {proProfessionalProfile?.bio && (
              <p className="text-sm text-muted-foreground text-center leading-relaxed px-2">
                {proProfessionalProfile.bio}
              </p>
            )}

            {/* Social links */}
            {(proProfessionalProfile?.website || proProfessionalProfile?.instagram || proProfessionalProfile?.facebook || proProfessionalProfile?.linkedin) && (
              <div className="flex gap-3 pt-1">
                {proProfessionalProfile.website && <a href={proProfessionalProfile.website} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-primary"><Globe className="h-5 w-5" /></a>}
                {proProfessionalProfile.instagram && <a href={`https://instagram.com/${proProfessionalProfile.instagram.replace("@", "")}`} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-primary"><Instagram className="h-5 w-5" /></a>}
                {proProfessionalProfile.facebook && <a href={proProfessionalProfile.facebook} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-primary"><Facebook className="h-5 w-5" /></a>}
                {proProfessionalProfile.linkedin && <a href={proProfessionalProfile.linkedin} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-primary"><Linkedin className="h-5 w-5" /></a>}
              </div>
            )}

            {proProfile?.email && (
              <p className="text-xs text-muted-foreground">{proProfile.email}</p>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* ═══ Pro Profile Edit Dialog ═══ */}
      <Dialog open={proEditOpen} onOpenChange={setProEditOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Modifica profilo professionale</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Nome visualizzato</Label>
              <Input value={proForm.display_name || ""} onChange={e => setProForm(f => ({ ...f, display_name: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Specializzazione</Label>
              <Input value={proForm.specialization || ""} onChange={e => setProForm(f => ({ ...f, specialization: e.target.value }))} placeholder="es. Nutrizione sportiva" />
            </div>
            <div className="space-y-2">
              <Label>Anni di esperienza</Label>
              <Input type="number" value={proForm.experience_years ?? ""} onChange={e => setProForm(f => ({ ...f, experience_years: e.target.value ? parseInt(e.target.value) : null }))} placeholder="es. 5" />
            </div>

            {/* Additional roles */}
            <div className="space-y-2">
              <Label>Ruoli aggiuntivi</Label>
              <div className="flex flex-wrap gap-1.5">
                {ROLE_OPTIONS.map(r => {
                  const selected = (proForm.additional_roles || []).includes(r);
                  return (
                    <button
                      key={r}
                      type="button"
                      onClick={() => toggleRole(r)}
                      className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-colors ${
                        selected ? "bg-primary text-primary-foreground border-primary" : "bg-background text-muted-foreground border-border hover:border-primary/50"
                      }`}
                    >
                      {r}
                    </button>
                  );
                })}
                {/* Show custom roles not in presets */}
                {(proForm.additional_roles || []).filter(r => !ROLE_OPTIONS.includes(r)).map(r => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => toggleRole(r)}
                    className="px-2.5 py-1 rounded-full text-xs font-medium border bg-primary text-primary-foreground border-primary flex items-center gap-1"
                  >
                    {r} <X className="h-3 w-3" />
                  </button>
                ))}
              </div>
              <div className="flex gap-2">
                <Input value={customRole} onChange={e => setCustomRole(e.target.value)} placeholder="Altro ruolo…" className="flex-1" onKeyDown={e => e.key === "Enter" && (e.preventDefault(), addCustomRole())} />
                <Button type="button" variant="outline" size="sm" onClick={addCustomRole} disabled={!customRole.trim()}>Aggiungi</Button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Città</Label>
                <Input value={proForm.city || ""} onChange={e => setProForm(f => ({ ...f, city: e.target.value }))} placeholder="es. Roma" />
              </div>
              <div className="space-y-2">
                <Label>Luogo di lavoro</Label>
                <Input value={proForm.workplace || ""} onChange={e => setProForm(f => ({ ...f, workplace: e.target.value }))} placeholder="es. Studio privato" />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Bio</Label>
              <Textarea value={proForm.bio || ""} onChange={e => setProForm(f => ({ ...f, bio: e.target.value }))} placeholder="Racconta di te ai tuoi clienti..." rows={3} />
            </div>

            <div className="space-y-2">
              <Label>Sito web</Label>
              <Input value={proForm.website || ""} onChange={e => setProForm(f => ({ ...f, website: e.target.value }))} placeholder="https://..." />
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div className="space-y-1">
                <Label className="text-xs">Instagram</Label>
                <Input value={proForm.instagram || ""} onChange={e => setProForm(f => ({ ...f, instagram: e.target.value }))} placeholder="@handle" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Facebook</Label>
                <Input value={proForm.facebook || ""} onChange={e => setProForm(f => ({ ...f, facebook: e.target.value }))} placeholder="URL" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">LinkedIn</Label>
                <Input value={proForm.linkedin || ""} onChange={e => setProForm(f => ({ ...f, linkedin: e.target.value }))} placeholder="URL" />
              </div>
            </div>

            {/* Switches */}
            <div className="space-y-3 pt-1">
              <div className="flex items-center justify-between">
                <Label className="text-sm">Lavoro online</Label>
                <Switch checked={proForm.works_online ?? false} onCheckedChange={v => setProForm(f => ({ ...f, works_online: v }))} />
              </div>
              <div className="flex items-center justify-between">
                <Label className="text-sm">Lavoro in presenza</Label>
                <Switch checked={proForm.works_in_person ?? true} onCheckedChange={v => setProForm(f => ({ ...f, works_in_person: v }))} />
              </div>
              <div className="flex items-center justify-between">
                <Label className="text-sm">Visibile nella ricerca</Label>
                <Switch checked={proForm.is_visible ?? true} onCheckedChange={v => setProForm(f => ({ ...f, is_visible: v }))} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={saveProProfile} disabled={savingProForm} className="w-full">
              {savingProForm ? "Salvataggio..." : "Salva profilo"}
            </Button>
          </DialogFooter>
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
