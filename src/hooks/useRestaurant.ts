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

    const { data, error } = await supabase
      .from("restaurants")
      .select("*")
      .eq("owner_id", user.id)
      .maybeSingle();

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
    isLoading: authLoading || isLoading,
    refetch: fetchRestaurant,
  };
};
