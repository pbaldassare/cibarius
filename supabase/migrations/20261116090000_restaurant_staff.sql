-- Operatori del ristorante (ruolo profiles.role = 'restaurant_staff', riga in
-- restaurant_members con member_role 'staff'). Li crea la funzione invite-staff.
-- Oltre a leggere, devono poter caricare, scaricare e modificare prodotti e
-- preparazioni: lo scarico totale cancella la riga, quindi serve anche DELETE.
-- Il pulsante "Elimina" resta nascosto nell'app per gli operatori.

DROP POLICY IF EXISTS "Inventory insert own or restaurant owner or admin" ON public.inventory_items;
DROP POLICY IF EXISTS "Inventory update own or restaurant owner or admin" ON public.inventory_items;
DROP POLICY IF EXISTS "Inventory delete own or restaurant owner or admin" ON public.inventory_items;

CREATE POLICY "Inventory insert own or restaurant member or admin" ON public.inventory_items
  FOR INSERT WITH CHECK (owner_user_id = auth.uid() OR public.is_restaurant_accessible(restaurant_id) OR public.current_user_is_admin());
CREATE POLICY "Inventory update own or restaurant member or admin" ON public.inventory_items
  FOR UPDATE USING (owner_user_id = auth.uid() OR public.is_restaurant_accessible(restaurant_id) OR public.current_user_is_admin());
CREATE POLICY "Inventory delete own or restaurant member or admin" ON public.inventory_items
  FOR DELETE USING (owner_user_id = auth.uid() OR public.is_restaurant_accessible(restaurant_id) OR public.current_user_is_admin());

DROP POLICY IF EXISTS "Restaurant members read preparations" ON public.preparations;
CREATE POLICY "Restaurant members manage preparations" ON public.preparations
  FOR ALL USING (public.is_restaurant_accessible(restaurant_id))
  WITH CHECK (public.is_restaurant_accessible(restaurant_id));

-- Le preparazioni nascono dalle ricette del ristorante: l'operatore le legge.
CREATE POLICY "Restaurant members read recipes" ON public.recipes
  FOR SELECT USING (public.is_restaurant_accessible(restaurant_id));
CREATE POLICY "Restaurant members read recipe ingredients" ON public.recipe_ingredients
  FOR SELECT USING (EXISTS (SELECT 1 FROM public.recipes r WHERE r.id = recipe_id AND public.is_restaurant_accessible(r.restaurant_id)));
CREATE POLICY "Restaurant members read recipe allergens" ON public.recipe_allergens
  FOR SELECT USING (EXISTS (SELECT 1 FROM public.recipes r WHERE r.id = recipe_id AND public.is_restaurant_accessible(r.restaurant_id)));
