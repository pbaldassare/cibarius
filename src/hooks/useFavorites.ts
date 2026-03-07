import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

export interface UserFavorite {
  id: string;
  item_type: string;
  item_id: string;
  meal_types: string[];
  item_snapshot: Record<string, any>;
}

export function useFavorites() {
  const { user } = useAuth();
  const [favorites, setFavorites] = useState<UserFavorite[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchFavorites = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from("user_favorites")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    setFavorites(
      (data || []).map((d: any) => ({
        id: d.id,
        item_type: d.item_type,
        item_id: d.item_id,
        meal_types: (d.meal_types as string[]) || [],
        item_snapshot: (d.item_snapshot as Record<string, any>) || {},
      }))
    );
    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchFavorites();
  }, [fetchFavorites]);

  const isFavorite = useCallback(
    (itemType: string, itemId: string) =>
      favorites.some((f) => f.item_type === itemType && f.item_id === itemId),
    [favorites]
  );

  const toggleFavorite = useCallback(
    async (
      itemType: string,
      itemId: string,
      mealTypes: string[],
      snapshot: Record<string, any>
    ) => {
      if (!user) return;
      const existing = favorites.find(
        (f) => f.item_type === itemType && f.item_id === itemId
      );
      if (existing) {
        await supabase.from("user_favorites").delete().eq("id", existing.id);
        setFavorites((prev) => prev.filter((f) => f.id !== existing.id));
        toast.success("Rimosso dai preferiti");
      } else {
        const { data, error } = await supabase
          .from("user_favorites")
          .insert({
            user_id: user.id,
            item_type: itemType,
            item_id: itemId,
            meal_types: mealTypes as any,
            item_snapshot: snapshot as any,
          })
          .select("id")
          .single();
        if (error) {
          toast.error("Errore nel salvataggio");
          return;
        }
        setFavorites((prev) => [
          {
            id: data.id,
            item_type: itemType,
            item_id: itemId,
            meal_types: mealTypes,
            item_snapshot: snapshot,
          },
          ...prev,
        ]);
        toast.success("Aggiunto ai preferiti ❤️");
      }
    },
    [user, favorites]
  );

  const getFavoritesForMeal = useCallback(
    (mealType: string) =>
      favorites.filter((f) => f.meal_types.includes(mealType)),
    [favorites]
  );

  return { favorites, loading, isFavorite, toggleFavorite, getFavoritesForMeal, fetchFavorites };
}
