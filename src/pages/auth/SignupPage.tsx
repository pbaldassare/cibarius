import { useState, useEffect } from "react";
import { Link, Navigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { getSavedReferralCode, saveReferralCode } from "@/pages/JoinReferralPage";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Loader2, UserPlus, Eye, EyeOff, User, UtensilsCrossed, Stethoscope, ArrowLeft, ArrowRight, Check } from "lucide-react";
import cibariusLogo from "@/assets/cibarius-logo.png";
import AuthFeatureCarousel from "@/components/AuthFeatureCarousel";
import ReferralBadge from "@/components/ReferralBadge";


type AccountType = "user" | "restaurant_owner" | "professional";

const ACCOUNT_TYPES: { value: AccountType; label: string; desc: string; icon: typeof User }[] = [
  { value: "user", label: "Utente", desc: "Gestisci la tua alimentazione e dispensa", icon: User },
  { value: "restaurant_owner", label: "Ristorante", desc: "Gestisci il tuo ristorante e il magazzino", icon: UtensilsCrossed },
  { value: "professional", label: "Professionista", desc: "Segui i tuoi clienti come nutrizionista", icon: Stethoscope },
];

const SignupPage = () => {
  const { session, loading } = useAuth();
  const { toast } = useToast();
  const [searchParams] = useSearchParams();

  // Check for referral from URL param or localStorage
  const [refCode, setRefCode] = useState<string | null>(null);

  useEffect(() => {
    const urlRef = searchParams.get("ref");
    if (urlRef) {
      saveReferralCode(urlRef);
      setRefCode(urlRef.toUpperCase());
    } else {
      const saved = getSavedReferralCode();
      if (saved) setRefCode(saved);
    }
  }, [searchParams]);

  const [step, setStep] = useState(1);
  const [accountType, setAccountType] = useState<AccountType | null>(null);

  // Step 2 - base
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // Step 3 - restaurant
  const [restaurantName, setRestaurantName] = useState("");
  const [restaurantAddress, setRestaurantAddress] = useState("");
  const [restaurantPhone, setRestaurantPhone] = useState("");

  // Step 3 - professional
  const [displayName, setDisplayName] = useState("");
  const [specialization, setSpecialization] = useState("");
  const [city, setCity] = useState("");
  const [bio, setBio] = useState("");

  const [submitting, setSubmitting] = useState(false);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (session) return <Navigate to="/" replace />;

  const totalSteps = accountType === "user" ? 2 : 3;

  const canGoNext = () => {
    if (step === 1) return !!accountType;
    if (step === 2) {
      const baseOk = email && password && password.length >= 6 && fullName;
      if (accountType !== "user") return baseOk && phone;
      return baseOk;
    }
    if (step === 3) {
      if (accountType === "restaurant_owner") return restaurantName && restaurantPhone;
      if (accountType === "professional") return displayName && specialization;
    }
    return true;
  };

  const handleNext = () => {
    if (step < totalSteps) {
      setStep(step + 1);
    } else {
      handleSignup();
    }
  };

  const handleSignup = async () => {
    setSubmitting(true);

    const metadata: Record<string, string> = {
      full_name: fullName,
      email,
      role: accountType!,
      phone: phone || "",
    };
    // Include referral code in metadata if present
    if (refCode) {
      metadata.ref_coupon_code = refCode;
    }

    if (accountType === "restaurant_owner") {
      metadata.restaurant_name = restaurantName;
      metadata.restaurant_address = restaurantAddress;
      metadata.restaurant_phone = restaurantPhone;
    }

    if (accountType === "professional") {
      metadata.display_name = displayName;
      metadata.specialization = specialization;
      metadata.city = city;
      metadata.bio = bio;
    }

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: window.location.origin,
        data: metadata,
      },
    });

    setSubmitting(false);

    if (error) {
      toast({ variant: "destructive", title: "Errore", description: error.message });
    } else {
      toast({
        title: "Registrazione completata",
        description: "Controlla la tua email per confermare l'account.",
      });
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Header gradient */}
      <div className="relative bg-gradient-to-r from-primary to-primary-dark px-4 pb-16 pt-16 text-center">
        <img src={cibariusLogo} alt="Cibarius" className="mx-auto h-10 brightness-0 invert" />
        <div className="absolute bottom-0 left-0 right-0 translate-y-[1px]">
          <svg viewBox="0 0 1440 50" fill="none" xmlns="http://www.w3.org/2000/svg" className="block w-full">
            <path d="M0 0C0 0 360 50 720 50C1080 50 1440 0 1440 0V50H0V0Z" className="fill-background" />
          </svg>
        </div>
      </div>

      {/* Feature carousel */}
      <div className="px-4 pt-6 pb-2">
        <AuthFeatureCarousel />
      </div>

      {/* Referral badge */}
      <div className="px-4">
        <ReferralBadge className="max-w-md mx-auto" />
      </div>

      <div className="flex flex-1 items-start justify-center px-4 pt-2 pb-8">
        <Card className="w-full max-w-md border-0 shadow-lg">
          <CardHeader className="items-center text-center">
            {/* Progress dots */}
            <div className="flex gap-2 mb-3">
              {Array.from({ length: totalSteps }).map((_, i) => (
                <div
                  key={i}
                  className={`h-2 rounded-full transition-all ${
                    i + 1 <= step ? "w-8 bg-primary" : "w-2 bg-muted"
                  }`}
                />
              ))}
            </div>
            <CardTitle className="text-2xl text-foreground">
              {step === 1 && "Chi sei?"}
              {step === 2 && "I tuoi dati"}
              {step === 3 && accountType === "restaurant_owner" && "Il tuo ristorante"}
              {step === 3 && accountType === "professional" && "Il tuo profilo professionale"}
            </CardTitle>
            <CardDescription>
              {step === 1 && "Scegli il tipo di account per iniziare"}
              {step === 2 && "Inserisci le informazioni base"}
              {step === 3 && "Completa i dati specifici"}
            </CardDescription>
          </CardHeader>

          <CardContent>
            {/* ─── STEP 1: Account type ─── */}
            {step === 1 && (
              <div className="space-y-3">
                {ACCOUNT_TYPES.map(({ value, label, desc, icon: Icon }) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setAccountType(value)}
                    className={`w-full flex items-center gap-4 rounded-xl border-2 p-4 text-left transition-all ${
                      accountType === value
                        ? "border-primary bg-primary/5 shadow-sm"
                        : "border-border hover:border-primary/40"
                    }`}
                  >
                    <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full ${
                      accountType === value ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                    }`}>
                      <Icon className="h-6 w-6" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-foreground">{label}</p>
                      <p className="text-sm text-muted-foreground">{desc}</p>
                    </div>
                    {accountType === value && (
                      <Check className="h-5 w-5 text-primary shrink-0" />
                    )}
                  </button>
                ))}
              </div>
            )}

            {/* ─── STEP 2: Base data ─── */}
            {step === 2 && (
              <div className="space-y-4">
                <Input
                  type="text"
                  placeholder="Nome e cognome"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                />
                <Input
                  type="email"
                  placeholder="Email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
                <div className="relative">
                  <Input
                    type={showPassword ? "text" : "password"}
                    placeholder="Password (min. 6 caratteri)"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={6}
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                <Input
                  type="tel"
                  placeholder={accountType === "user" ? "Telefono (opzionale)" : "Telefono"}
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  required={accountType !== "user"}
                />
              </div>
            )}

            {/* ─── STEP 3: Restaurant ─── */}
            {step === 3 && accountType === "restaurant_owner" && (
              <div className="space-y-4">
                <Input
                  type="text"
                  placeholder="Nome del ristorante"
                  value={restaurantName}
                  onChange={(e) => setRestaurantName(e.target.value)}
                  required
                />
                <Input
                  type="text"
                  placeholder="Indirizzo (consigliato)"
                  value={restaurantAddress}
                  onChange={(e) => setRestaurantAddress(e.target.value)}
                />
                <Input
                  type="tel"
                  placeholder="Telefono ristorante"
                  value={restaurantPhone}
                  onChange={(e) => setRestaurantPhone(e.target.value)}
                  required
                />
              </div>
            )}

            {/* ─── STEP 3: Professional ─── */}
            {step === 3 && accountType === "professional" && (
              <div className="space-y-4">
                <Input
                  type="text"
                  placeholder="Nome professionale (es: Dott. Rossi)"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  required
                />
                <Input
                  type="text"
                  placeholder="Specializzazione (es: Nutrizionista)"
                  value={specialization}
                  onChange={(e) => setSpecialization(e.target.value)}
                  required
                />
                <Input
                  type="text"
                  placeholder="Città (opzionale)"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                />
                <Textarea
                  placeholder="Breve bio (opzionale)"
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  rows={3}
                />
              </div>
            )}

            {/* Navigation buttons */}
            <div className="flex gap-3 mt-6">
              {step > 1 && (
                <Button variant="outline" className="flex-1" onClick={() => setStep(step - 1)}>
                  <ArrowLeft className="mr-2 h-4 w-4" /> Indietro
                </Button>
              )}
              <Button
                className="flex-1"
                disabled={!canGoNext() || submitting}
                onClick={handleNext}
              >
                {submitting ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : step === totalSteps ? (
                  <UserPlus className="mr-2 h-4 w-4" />
                ) : (
                  <ArrowRight className="mr-2 h-4 w-4" />
                )}
                {step === totalSteps ? "Registrati" : "Avanti"}
              </Button>
            </div>

            <p className="mt-4 text-center text-sm text-muted-foreground">
              Hai già un account?{" "}
              <Link to="/auth/login" className="font-medium text-primary hover:underline">
                Accedi
              </Link>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default SignupPage;
