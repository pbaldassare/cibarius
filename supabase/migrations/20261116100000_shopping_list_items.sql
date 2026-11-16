-- Lista della spesa del cliente: la scrive lui (a mano, dalla dispensa, da
-- un prodotto scansionato). Prima si ricavava dalle ricette del nutrizionista.
CREATE TABLE public.shopping_list_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL CHECK (length(trim(name)) > 0),
  quantity numeric,
  unit text,
  checked boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX shopping_list_items_user_idx ON public.shopping_list_items (user_id, created_at);
ALTER TABLE public.shopping_list_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own shopping list" ON public.shopping_list_items
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
