import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { saveReferralCode } from "@/pages/JoinReferralPage";
import { Loader2, MapPin, Globe, Instagram, Award, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import cibariusLogo from "@/assets/cibarius-logo.png";

interface NutritionistProfile {
  display_name: string;
  bio: string | null;
  specialization: string;
  city: string | null;
  photo_url: string | null;
  instagram: string | null;
  website: string | null;
  experience_years: number | null;
  works_online: boolean | null;
  works_in_person: boolean | null;
  additional_roles: string[] | null;
  user_id: string;
}

const NutritionistPublicPage = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<NutritionistProfile | null>(null);
  const [couponCode, setCouponCode] = useState<string | null>(null);
  const [discountPercent, setDiscountPercent] = useState(0);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!slug) { setNotFound(true); setLoading(false); return; }

    const load = async () => {
      // Fetch profile by slug
      const { data: prof, error } = await supabase
        .from("professional_profiles" as any)
        .select("display_name, bio, specialization, city, photo_url, instagram, website, experience_years, works_online, works_in_person, additional_roles, user_id")
        .eq("public_slug", slug)
        .eq("is_visible", true)
        .single();

      if (error || !prof) {
        setNotFound(true);
        setLoading(false);
        return;
      }

      setProfile(prof as any);

      // Fetch coupon for this nutritionist
      const { data: coupon } = await supabase
        .from("nutritionist_coupons" as any)
        .select("coupon_code, client_discount_percent")
        .eq("nutritionist_user_id", (prof as any).user_id)
        .eq("is_active", true)
        .single();

      if (coupon) {
        setCouponCode((coupon as any).coupon_code);
        setDiscountPercent((coupon as any).client_discount_percent || 0);
        // Auto-save referral
        saveReferralCode((coupon as any).coupon_code);
      }

      setLoading(false);
    };
    load();
  }, [slug]);

  // SEO meta tags
  useEffect(() => {
    if (profile) {
      document.title = `Nutrizionista ${profile.display_name} su Cibarius`;
      const metaDesc = document.querySelector('meta[name="description"]');
      const content = `Scopri i piani alimentari e segui il nutrizionista ${profile.display_name} su Cibarius.`;
      if (metaDesc) {
        metaDesc.setAttribute("content", content);
      } else {
        const meta = document.createElement("meta");
        meta.name = "description";
        meta.content = content;
        document.head.appendChild(meta);
      }
    }
    return () => { document.title = "Cibarius"; };
  }, [profile]);

  const handleCTA = () => {
    navigate("/auth/signup");
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  if (notFound || !profile) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4 text-center">
        <h1 className="text-2xl font-bold text-foreground mb-2">Profilo non trovato</h1>
        <p className="text-muted-foreground mb-6">Questo nutrizionista non ha un profilo pubblico.</p>
        <Button variant="outline" onClick={() => navigate("/auth/login")}>
          Vai al login
        </Button>
      </div>
    );
  }

  const initials = profile.display_name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Header */}
      <div className="relative bg-gradient-to-br from-primary to-primary/80 px-4 pb-24 pt-10 text-center">
        <img src={cibariusLogo} alt="Cibarius" className="mx-auto h-8 brightness-0 invert mb-8" />
        <Avatar className="mx-auto h-24 w-24 border-4 border-background shadow-xl">
          {profile.photo_url ? (
            <AvatarImage src={profile.photo_url} alt={profile.display_name} />
          ) : null}
          <AvatarFallback className="text-2xl font-bold bg-secondary text-secondary-foreground">
            {initials}
          </AvatarFallback>
        </Avatar>
        <div className="absolute bottom-0 left-0 right-0 translate-y-[1px]">
          <svg viewBox="0 0 1440 50" fill="none" xmlns="http://www.w3.org/2000/svg" className="block w-full">
            <path d="M0 0C0 0 360 50 720 50C1080 50 1440 0 1440 0V50H0V0Z" className="fill-background" />
          </svg>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 px-4 -mt-4 pb-8 max-w-lg mx-auto w-full space-y-5">
        {/* Name & specialization */}
        <div className="text-center space-y-1">
          <h1 className="text-2xl font-bold text-foreground">{profile.display_name}</h1>
          <p className="text-sm font-medium text-primary">{profile.specialization}</p>
          {profile.city && (
            <p className="text-sm text-muted-foreground flex items-center justify-center gap-1">
              <MapPin className="h-3.5 w-3.5" /> {profile.city}
            </p>
          )}
        </div>

        {/* Tags */}
        <div className="flex flex-wrap justify-center gap-2">
          {profile.experience_years && (
            <Badge variant="secondary" className="gap-1">
              <Award className="h-3 w-3" /> {profile.experience_years} anni di esperienza
            </Badge>
          )}
          {profile.works_online && (
            <Badge variant="outline">Consulenze online</Badge>
          )}
          {profile.works_in_person && (
            <Badge variant="outline">Visite in studio</Badge>
          )}
          {profile.additional_roles?.map((role) => (
            <Badge key={role} variant="secondary">{role}</Badge>
          ))}
        </div>

        {/* Bio */}
        {profile.bio && (
          <Card>
            <CardContent className="pt-4">
              <p className="text-sm text-foreground leading-relaxed whitespace-pre-line">
                {profile.bio}
              </p>
            </CardContent>
          </Card>
        )}

        {/* Social links */}
        {(profile.instagram || profile.website) && (
          <div className="flex justify-center gap-3">
            {profile.instagram && (
              <Button variant="outline" size="sm" className="gap-2" asChild>
                <a href={profile.instagram.startsWith("http") ? profile.instagram : `https://instagram.com/${profile.instagram}`} target="_blank" rel="noopener noreferrer">
                  <Instagram className="h-4 w-4" /> Instagram
                </a>
              </Button>
            )}
            {profile.website && (
              <Button variant="outline" size="sm" className="gap-2" asChild>
                <a href={profile.website.startsWith("http") ? profile.website : `https://${profile.website}`} target="_blank" rel="noopener noreferrer">
                  <Globe className="h-4 w-4" /> Sito web
                </a>
              </Button>
            )}
          </div>
        )}

        {/* Discount badge */}
        {discountPercent > 0 && (
          <div className="rounded-xl border-2 border-primary/30 bg-primary/5 p-4 text-center space-y-1">
            <p className="font-semibold text-foreground">Sconto {discountPercent}% sull'abbonamento</p>
            <p className="text-xs text-muted-foreground">
              Applicato automaticamente registrandoti da questa pagina
            </p>
          </div>
        )}

        {/* CTA */}
        <Button className="w-full gap-2" size="lg" onClick={handleCTA}>
          Usa Cibarius con questo nutrizionista <ArrowRight className="h-4 w-4" />
        </Button>

        <Button variant="outline" className="w-full" onClick={() => navigate("/auth/login")}>
          Ho già un account
        </Button>
      </div>
    </div>
  );
};

export default NutritionistPublicPage;
