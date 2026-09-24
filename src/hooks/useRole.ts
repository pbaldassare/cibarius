import { useEffect, useState } from "react";
import { useAuth } from "./useAuth";
import { supabase } from "@/integrations/supabase/client";
import { USER_HOME, RESTAURANT_HOME, PRO_HOME, SUPPLIER_HOME, ADMIN_HOME } from "@/lib/routes";

export type AppRole = "user" | "restaurant_owner" | "admin" | "professional" | "supplier";

export interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  phone: string | null;
  role: AppRole;
  created_at: string;
}

export const useRole = () => {
  const { user, loading: authLoading } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  /*
   * Utente a cui appartiene `profile`.
   *
   * Serve a distinguere "ruolo non ancora letto" da "utente senza ruolo".
   * Prima l'hook riportava isLoading false gia' dal giro senza sessione,
   * mentre `profile` era ancora null: al primo render dopo il login la
   * LoginPage vedeva "sessione valida, nessun ruolo" e mandava tutti sulla
   * home consumer. Un ristoratore finiva sulla dispensa personale invece
   * che sul suo cruscotto, e il redirect era gia' avvenuto prima che il
   * profilo arrivasse.
   */
  const [loadedFor, setLoadedFor] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setProfile(null);
      setLoadedFor(null);
      return;
    }

    let cancelled = false;
    const fetchProfile = async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      if (cancelled) return;
      if (!error && data) setProfile(data as Profile);
      setLoadedFor(user.id);
    };

    fetchProfile();
    return () => { cancelled = true; };
  }, [user, authLoading]);

  // Il ruolo e' attendibile solo quando il profilo caricato e' quello in sessione.
  const resolved = user ? loadedFor === user.id : true;

  return {
    role: resolved ? profile?.role ?? null : null,
    profile: resolved ? profile : null,
    isLoading: authLoading || !resolved,
  };
};

export const getRoleHomePath = (role: AppRole | null): string => {
  switch (role) {
    case "admin": return ADMIN_HOME;
    case "restaurant_owner": return RESTAURANT_HOME;
    case "professional": return PRO_HOME;
    case "supplier": return SUPPLIER_HOME;
    // La radice ora e' il sito pubblico: l'utente consumer va su /app.
    default: return USER_HOME;
  }
};
