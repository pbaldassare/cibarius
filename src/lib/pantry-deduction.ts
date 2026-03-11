import { supabase } from "@/integrations/supabase/client";

/**
 * After a meal is logged, check if any meal items match inventory products
 * and auto-deduct quantities from the pantry.
 */
export async function deductPantryFromMeal(userId: string, mealItems: Array<{
  custom_name?: string | null;
  dish_name?: string | null;
  product_id?: string | null;
  quantity?: number | null;
  unit?: string | null;
}>) {
  if (!userId || mealItems.length === 0) return;

  // Get user's inventory
  const { data: inventory } = await supabase
    .from("inventory_items")
    .select("id, quantity, unit, product_id, product:products(id, name)")
    .eq("owner_user_id", userId);

  if (!inventory || inventory.length === 0) return;

  for (const item of mealItems) {
    const mealName = (item.dish_name || item.custom_name || "").toLowerCase();
    const mealQty = item.quantity ?? 1;
    const mealUnit = item.unit ?? "g";

    // Try matching by product_id first, then by name
    let match = item.product_id
      ? inventory.find((inv: any) => inv.product_id === item.product_id)
      : null;

    if (!match) {
      match = inventory.find((inv: any) => {
        const invName = ((inv as any).product?.name || "").toLowerCase();
        return invName && (mealName.includes(invName) || invName.includes(mealName));
      });
    }

    if (!match) continue;

    const invItem = match as any;
    const currentQty = invItem.quantity ?? 0;

    // Convert units if needed, otherwise assume same unit
    let deductQty = mealQty;
    if (mealUnit === "kg" && (invItem.unit === "g" || !invItem.unit)) {
      deductQty = mealQty * 1000;
    } else if (mealUnit === "g" && invItem.unit === "kg") {
      deductQty = mealQty / 1000;
    }

    const newQty = Math.max(0, currentQty - deductQty);

    // Only track as waste saving if the item is NOT expired
    const isExpired = invItem.expiry_date
      ? new Date(invItem.expiry_date).getTime() < new Date().setHours(0, 0, 0, 0)
      : false;

    if (newQty <= 0) {
      if (!isExpired) {
        await supabase.from("waste_savings" as any).insert({
          user_id: userId,
          item_name: invItem.product?.name || mealName,
          weight_g: currentQty * (invItem.unit === "kg" ? 1000 : 1),
          estimated_price: 1.0,
          source: "consumed",
        } as any);
      }

      await supabase.from("inventory_items").delete().eq("id", invItem.id);
    } else {
      if (!isExpired) {
        await supabase.from("waste_savings" as any).insert({
          user_id: userId,
          item_name: invItem.product?.name || mealName,
          weight_g: deductQty * (invItem.unit === "kg" ? 1000 : invItem.unit === "g" || !invItem.unit ? 1 : 1),
          estimated_price: 0.5,
          source: "consumed",
        } as any);
      }

      await supabase
        .from("inventory_items")
        .update({ quantity: newQty })
        .eq("id", invItem.id);
    }
  }
}
