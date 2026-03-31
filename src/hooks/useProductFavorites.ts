import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

export interface ProductFavorite {
  id: string;
  product_id: string;
  created_at: string;
  product: {
    id: string;
    name: string;
    brand: string | null;
    image_url: string | null;
    category: string | null;
    calories_100g: number | null;
    macros_100g: any;
    nutrition_available: boolean;
  };
}

export function useProductFavorites() {
  const { user } = useAuth();
  const [favorites, setFavorites] = useState<ProductFavorite[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchFavorites = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from("user_product_favorites")
      .select("id, product_id, created_at, product:products(id, name, brand, image_url, category, calories_100g, macros_100g, nutrition_available)")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    setFavorites((data as any[]) || []);
    setLoading(false);
  }, [user]);

  useEffect(() => { fetchFavorites(); }, [fetchFavorites]);

  const isFavorite = useCallback(
    (productId: string) => favorites.some((f) => f.product_id === productId),
    [favorites]
  );

  const toggleFavorite = useCallback(
    async (productId: string) => {
      if (!user) return;
      const existing = favorites.find((f) => f.product_id === productId);
      if (existing) {
        await supabase.from("user_product_favorites").delete().eq("id", existing.id);
        setFavorites((prev) => prev.filter((f) => f.id !== existing.id));
        toast.success("Rimosso dai preferiti");
      } else {
        const { data, error } = await supabase
          .from("user_product_favorites")
          .insert({ user_id: user.id, product_id: productId } as any)
          .select("id, product_id, created_at, product:products(id, name, brand, image_url, category, calories_100g, macros_100g, nutrition_available)")
          .single();
        if (error) {
          toast.error("Errore nel salvataggio");
          return;
        }
        setFavorites((prev) => [data as any, ...prev]);
        toast.success("Aggiunto ai preferiti ⭐");
      }
    },
    [user, favorites]
  );

  // Log product usage (for auto-suggest)
  const logUsage = useCallback(
    async (productId: string) => {
      if (!user) return;
      await supabase.from("product_usage_log").insert({ user_id: user.id, product_id: productId } as any);
    },
    [user]
  );

  // Check frequently used products that are NOT favorites yet
  const checkAutoSuggest = useCallback(
    async (): Promise<{ product_id: string; name: string; count: number } | null> => {
      if (!user) return null;
      const { data } = await supabase
        .from("product_usage_log")
        .select("product_id")
        .eq("user_id", user.id)
        .order("used_at", { ascending: false })
        .limit(100);
      if (!data || data.length === 0) return null;

      // Count occurrences
      const counts = new Map<string, number>();
      (data as any[]).forEach((r) => {
        counts.set(r.product_id, (counts.get(r.product_id) || 0) + 1);
      });

      // Find product with 3+ uses that's not a favorite
      const favIds = new Set(favorites.map((f) => f.product_id));
      let best: { product_id: string; count: number } | null = null;
      counts.forEach((count, pid) => {
        if (count >= 3 && !favIds.has(pid)) {
          if (!best || count > best.count) best = { product_id: pid, count };
        }
      });

      if (!best) return null;

      // Get product name
      const { data: prod } = await supabase
        .from("products")
        .select("name")
        .eq("id", best.product_id)
        .single();

      return prod ? { product_id: best.product_id, name: prod.name, count: best.count } : null;
    },
    [user, favorites]
  );

  return { favorites, loading, isFavorite, toggleFavorite, logUsage, checkAutoSuggest, fetchFavorites };
}
