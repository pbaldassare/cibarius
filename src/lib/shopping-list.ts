import { supabase } from "@/integrations/supabase/client";

/** Aggiunge un prodotto alla lista della spesa dell'utente in sessione. */
export const addToShoppingList = async (name: string, quantity?: number | null, unit?: string | null) => {
  const { error } = await supabase
    .from("shopping_list_items")
    .insert({ name: name.trim(), quantity: quantity ?? null, unit: unit ?? null });
  return error;
};
