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

export const useRestaurant = () => {
  const { user, loading: authLoading } = useAuth();
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchRestaurant = async () => {
    if (!user) {
      setRestaurant(null);
      setIsLoading(false);
      return;
    }

    let { data, error } = await supabase
      .from("restaurants")
      .select("*")
      .eq("owner_id", user.id)
      .maybeSingle();

    // Operatore: il ristorante e' quello a cui il titolare l'ha collegato.
    if (!error && !data) {
      const { data: member } = await supabase
        .from("restaurant_members")
        .select("restaurants(*)")
        .eq("user_id", user.id)
        .limit(1)
        .maybeSingle();
      data = (member?.restaurants as typeof data) ?? null;
    }

    if (!error && data) {
      setRestaurant(data as Restaurant);
    } else {
      setRestaurant(null);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    if (authLoading) return;
    fetchRestaurant();
  }, [user, authLoading]);

  return {
    restaurant,
    /** false per gli operatori: niente backoffice, abbonamento, dati ristorante, cancellazioni. */
    isOwner: !!restaurant && restaurant.owner_id === user?.id,
    isLoading: authLoading || isLoading,
    refetch: fetchRestaurant,
  };
};
