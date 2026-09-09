-- Registro movimenti di magazzino (carico / scarico).
--
-- Finora l'inventario era una lista piatta di lotti: le righe venivano create
-- (carico manuale) e cancellate. "Utilizzato" e "Buttato" eseguivano la stessa
-- identica DELETE, quindi non restava traccia di quanto si consuma ne' di
-- quanto si butta, e "quando finisce la merce" non era calcolabile.
--
-- inventory_items resta la giacenza corrente; questa tabella e' il libro
-- mastro append-only che la spiega.

CREATE TABLE public.inventory_movements (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id      uuid NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,

  -- Il lotto puo' sparire (consumato del tutto): lo storico deve sopravvivere,
  -- percio' il nome prodotto e' denormalizzato.
  inventory_item_id  uuid REFERENCES public.inventory_items(id) ON DELETE SET NULL,
  product_id         uuid REFERENCES public.products(id) ON DELETE SET NULL,
  product_name       text NOT NULL,

  movement_type      text NOT NULL
                       CHECK (movement_type IN ('carico', 'consumo', 'spreco', 'rettifica')),
  -- Delta con segno: >0 entra, <0 esce. La giacenza e' la somma dei delta.
  quantity_delta     numeric NOT NULL CHECK (quantity_delta <> 0),
  unit               text,

  lot_number         text,
  expiry_date        date,
  source_document_id uuid REFERENCES public.haccp_documents(id) ON DELETE SET NULL,
  notes              text,

  user_id            uuid,
  user_name          text,
  created_at         timestamptz NOT NULL DEFAULT now(),

  -- Il segno deve essere coerente col tipo; 'rettifica' puo' andare in entrambe
  -- le direzioni perche' serve proprio a correggere in piu' o in meno.
  CONSTRAINT inventory_movements_segno_coerente CHECK (
    (movement_type = 'carico'  AND quantity_delta > 0) OR
    (movement_type IN ('consumo', 'spreco') AND quantity_delta < 0) OR
    (movement_type = 'rettifica')
  )
);

COMMENT ON TABLE public.inventory_movements IS
  'Libro mastro append-only dei movimenti di magazzino. inventory_items tiene la giacenza corrente.';
COMMENT ON COLUMN public.inventory_movements.quantity_delta IS
  'Delta con segno: positivo in entrata (carico), negativo in uscita (consumo/spreco).';
COMMENT ON COLUMN public.inventory_movements.product_name IS
  'Nome prodotto al momento del movimento: lo storico resta leggibile anche se il lotto viene eliminato.';

GRANT SELECT, INSERT, UPDATE, DELETE ON public.inventory_movements TO authenticated;
GRANT ALL ON public.inventory_movements TO service_role;

ALTER TABLE public.inventory_movements ENABLE ROW LEVEL SECURITY;

-- Nessuna policy UPDATE/DELETE per gli utenti del ristorante: il registro e'
-- append-only, si corregge con un movimento di 'rettifica', non riscrivendo.
CREATE POLICY "movements read"
  ON public.inventory_movements FOR SELECT
  USING (is_restaurant_accessible(restaurant_id) OR current_user_is_admin());

CREATE POLICY "movements insert"
  ON public.inventory_movements FOR INSERT
  WITH CHECK (is_restaurant_accessible(restaurant_id));

CREATE POLICY "Admin full access on inventory_movements"
  ON public.inventory_movements FOR ALL
  USING (current_user_is_admin())
  WITH CHECK (current_user_is_admin());

-- Lista movimenti del ristorante, dal piu' recente
CREATE INDEX inventory_movements_restaurant_created_idx
  ON public.inventory_movements (restaurant_id, created_at DESC);

-- Consumo medio per prodotto (stima di quando finisce la merce)
CREATE INDEX inventory_movements_product_created_idx
  ON public.inventory_movements (restaurant_id, product_id, created_at DESC);
