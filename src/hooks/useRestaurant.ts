import { useEffect, useState } from "react";
import { useAuth } from "./useAuth";
import { supabase } from "@/integrations/supabase/client";

export interface Restaurant {
  id: string;
  owner_id: string;
  name: string;
  address: string | null;
  phone: string;
  created_at: string;
  description: string | null;
  website: string | null;
  instagram: string | null;
  facebook: string | null;
  image_url: string | null;
  latitude: number | null;
  longitude: number | null;
}

/**
 * Il ristorante dell'utente: quello di cui e' titolare oppure, se non ne ha,
 * quello in cui e' staff. `isStaff` dice quale dei due: lo staff vede solo
 * le pagine HACCP (vedi `isStaffPath`).
 */
export const useRestaurant = () => {
  const { user, loading: authLoading } = useAuth();
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [isStaff, setIsStaff] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const fetchRestaurant = async () => {
    if (!user) {
      setRestaurant(null);
      setIsStaff(false);
      setIsLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from("restaurants")
      .select("*")
      .eq("owner_id", user.id)
      .maybeSingle();

    if (!error && data) {
      setRestaurant(data as Restaurant);
      setIsStaff(false);
      setIsLoading(false);
      return;
    }

    const { data: membership } = await supabase
      .from("restaurant_members")
      .select("restaurant:restaurants(*)")
      .eq("user_id", user.id)
      .eq("member_role", "staff")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const staffRestaurant = (membership?.restaurant ?? null) as Restaurant | null;
    setRestaurant(staffRestaurant);
    setIsStaff(!!staffRestaurant);
    setIsLoading(false);
  };

  useEffect(() => {
    if (authLoading) return;
    fetchRestaurant();
  }, [user, authLoading]);

  return {
    restaurant,
    isStaff,
    isLoading: authLoading || isLoading,
    refetch: fetchRestaurant,
  };
};
