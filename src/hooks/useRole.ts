import { useEffect, useState } from "react";
import { useAuth } from "./useAuth";
import { supabase } from "@/integrations/supabase/client";

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
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setProfile(null);
      setIsLoading(false);
      return;
    }

    const fetchProfile = async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      if (!error && data) {
        setProfile(data as Profile);
      }
      setIsLoading(false);
    };

    fetchProfile();
  }, [user, authLoading]);

  return {
    role: profile?.role ?? null,
    profile,
    isLoading: authLoading || isLoading,
  };
};

export const getRoleHomePath = (role: AppRole | null): string => {
  switch (role) {
    case "admin": return "/admin";
    case "restaurant_owner": return "/restaurant";
    case "professional": return "/pro";
    case "supplier": return "/supplier";
    default: return "/";
  }
};
