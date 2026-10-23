-- Supplier orders.
--
-- A restaurant owner orders from the catalog of a linked supplier; the supplier
-- confirms, rejects or marks delivered; the restaurant can cancel a sent order
-- or mark it received, then load the goods into stock from the order.
-- Orders are written only through the functions below, so prices are taken
-- from the catalog at order time and states follow the allowed transitions.

-- 1. Linking a restaurant to a supplier ------------------------------------
-- Every authenticated user could list all active invite codes, and a
-- restaurant could insert a link to any supplier (or re-activate one the
-- supplier had revoked) without a code. Linking now goes through
-- accept_supplier_invite, which consumes the code.
DROP POLICY IF EXISTS "Auth users read active supplier invites" ON public.supplier_invites;
DROP POLICY IF EXISTS "Restaurant owner inserts supplier link" ON public.supplier_restaurants;

DROP POLICY IF EXISTS "Supplier or restaurant updates link" ON public.supplier_restaurants;
CREATE POLICY "Supplier or restaurant updates link" ON public.supplier_restaurants
  FOR UPDATE TO authenticated
  USING (
    public.owns_supplier(supplier_id)
    OR EXISTS (SELECT 1 FROM public.restaurants r WHERE r.id = supplier_restaurants.restaurant_id AND r.owner_id = auth.uid())
    OR public.current_user_is_admin()
  )
  -- The restaurant may only revoke; re-activating is the supplier's call.
  WITH CHECK (
    public.owns_supplier(supplier_id)
    OR public.current_user_is_admin()
    OR (status = 'revoked' AND EXISTS (SELECT 1 FROM public.restaurants r WHERE r.id = supplier_restaurants.restaurant_id AND r.owner_id = auth.uid()))
  );

-- Restaurants could not read the name of their own suppliers.
CREATE POLICY "Linked restaurant reads supplier" ON public.suppliers
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.supplier_restaurants sr
    JOIN public.restaurants r ON r.id = sr.restaurant_id
    WHERE sr.supplier_id = suppliers.id AND r.owner_id = auth.uid()
  ));

CREATE OR REPLACE FUNCTION public.supplier_invite_preview(_code text)
RETURNS TABLE (supplier_name text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT s.name
  FROM public.supplier_invites i
  JOIN public.suppliers s ON s.id = i.supplier_id
  WHERE i.invite_code = upper(trim(_code)) AND i.status = 'active';
$$;

REVOKE ALL ON FUNCTION public.supplier_invite_preview(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.supplier_invite_preview(text) TO authenticated;

CREATE OR REPLACE FUNCTION public.accept_supplier_invite(_code text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _restaurant_id uuid;
  _inv public.supplier_invites;
BEGIN
  SELECT id INTO _restaurant_id FROM public.restaurants WHERE owner_id = auth.uid() LIMIT 1;
  IF _restaurant_id IS NULL THEN
    RAISE EXCEPTION 'Solo il titolare di un ristorante può collegare un fornitore';
  END IF;

  SELECT * INTO _inv FROM public.supplier_invites
  WHERE invite_code = upper(trim(_code)) AND status = 'active'
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Il codice invito non esiste o è già stato usato';
  END IF;

  INSERT INTO public.supplier_restaurants (supplier_id, restaurant_id, status, invite_code)
  VALUES (_inv.supplier_id, _restaurant_id, 'active', _inv.invite_code)
  ON CONFLICT (supplier_id, restaurant_id)
  DO UPDATE SET status = 'active', invite_code = EXCLUDED.invite_code;

  UPDATE public.supplier_invites SET status = 'used' WHERE id = _inv.id;
  RETURN _inv.supplier_id;
END;
$$;

REVOKE ALL ON FUNCTION public.accept_supplier_invite(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.accept_supplier_invite(text) TO authenticated;

-- 2. Orders ----------------------------------------------------------------
ALTER TABLE public.supplier_orders
  ADD COLUMN status text NOT NULL DEFAULT 'inviato'
    CHECK (status IN ('inviato', 'confermato', 'rifiutato', 'consegnato', 'annullato')),
  ADD COLUMN notes text,
  ADD COLUMN requested_delivery_date date,
  ADD COLUMN supplier_note text,
  ADD COLUMN created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN updated_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN confirmed_at timestamptz,
  ADD COLUMN delivered_at timestamptz,
  ADD COLUMN stock_loaded_at timestamptz;

CREATE INDEX IF NOT EXISTS supplier_orders_restaurant_idx ON public.supplier_orders (restaurant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS supplier_orders_supplier_idx ON public.supplier_orders (supplier_id, created_at DESC);

CREATE TABLE public.supplier_order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.supplier_orders(id) ON DELETE CASCADE,
  supplier_product_id uuid REFERENCES public.supplier_products(id) ON DELETE SET NULL,
  product_id uuid REFERENCES public.products(id) ON DELETE SET NULL,
  -- Snapshot at order time: the catalog can change afterwards.
  product_name text NOT NULL,
  unit text,
  unit_price numeric,
  quantity numeric NOT NULL CHECK (quantity > 0),
  line_total numeric GENERATED ALWAYS AS (round(unit_price * quantity, 2)) STORED
);

CREATE INDEX supplier_order_items_order_idx ON public.supplier_order_items (order_id);

ALTER TABLE public.supplier_order_items ENABLE ROW LEVEL SECURITY;

-- Visible to whoever sees the order (supplier_orders policies apply inside).
CREATE POLICY "Order parties read items" ON public.supplier_order_items
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.supplier_orders o WHERE o.id = supplier_order_items.order_id));

CREATE OR REPLACE FUNCTION public.create_supplier_order(
  _supplier_id uuid,
  _items jsonb,
  _notes text DEFAULT NULL,
  _requested_delivery_date date DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _restaurant_id uuid;
  _restaurant_name text;
  _order_id uuid;
  _supplier_owner uuid;
  _lines int;
  _total numeric;
BEGIN
  SELECT id, name INTO _restaurant_id, _restaurant_name FROM public.restaurants WHERE owner_id = auth.uid() LIMIT 1;
  IF _restaurant_id IS NULL THEN
    RAISE EXCEPTION 'Solo il titolare del ristorante può ordinare';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.supplier_restaurants
    WHERE supplier_id = _supplier_id AND restaurant_id = _restaurant_id AND status = 'active'
  ) THEN
    RAISE EXCEPTION 'Il fornitore non è collegato al ristorante';
  END IF;
  IF _requested_delivery_date IS NOT NULL AND _requested_delivery_date < current_date THEN
    RAISE EXCEPTION 'La data di consegna è già passata';
  END IF;

  INSERT INTO public.supplier_orders (supplier_id, restaurant_id, status, notes, requested_delivery_date, created_by, total)
  VALUES (_supplier_id, _restaurant_id, 'inviato', nullif(trim(_notes), ''), _requested_delivery_date, auth.uid(), 0)
  RETURNING id INTO _order_id;

  INSERT INTO public.supplier_order_items (order_id, supplier_product_id, product_id, product_name, unit, unit_price, quantity)
  SELECT _order_id, sp.id, sp.product_id, coalesce(p.name, 'Prodotto'), coalesce(sp.unit, p.unit), sp.price, (item->>'quantity')::numeric
  FROM jsonb_array_elements(_items) AS item
  JOIN public.supplier_products sp
    ON sp.id = (item->>'supplier_product_id')::uuid AND sp.supplier_id = _supplier_id
  LEFT JOIN public.products p ON p.id = sp.product_id
  WHERE (item->>'quantity')::numeric > 0
    AND coalesce(sp.availability, 'available') <> 'unavailable';

  GET DIAGNOSTICS _lines = ROW_COUNT;
  IF _lines = 0 OR _lines <> jsonb_array_length(_items) THEN
    RAISE EXCEPTION 'Ordine non valido: controlla prodotti e quantità';
  END IF;

  SELECT coalesce(sum(line_total), 0) INTO _total FROM public.supplier_order_items WHERE order_id = _order_id;
  UPDATE public.supplier_orders SET total = _total WHERE id = _order_id;

  SELECT owner_user_id INTO _supplier_owner FROM public.suppliers WHERE id = _supplier_id;
  IF _supplier_owner IS NOT NULL THEN
    INSERT INTO public.in_app_notifications (user_id, type, title, body, metadata)
    VALUES (_supplier_owner, 'supplier_order_new', 'Nuovo ordine da ' || _restaurant_name,
      format('%s prodotti, totale € %s', _lines, to_char(_total, 'FM999G990D00')),
      jsonb_build_object('order_id', _order_id));
  END IF;

  -- Email to the supplier, best effort: a pg_net failure must not lose the order.
  BEGIN
    PERFORM net.http_post(
      url := 'https://dqhzopbjhxyhgcpedskl.supabase.co/functions/v1/send-supplier-order',
      headers := '{"Content-Type": "application/json"}'::jsonb,
      body := jsonb_build_object('order_id', _order_id)
    );
  EXCEPTION WHEN others THEN
    RAISE WARNING 'send-supplier-order not queued: %', SQLERRM;
  END;

  RETURN _order_id;
END;
$$;

REVOKE ALL ON FUNCTION public.create_supplier_order(uuid, jsonb, text, date) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_supplier_order(uuid, jsonb, text, date) TO authenticated;

-- Allowed transitions:
--   supplier:   inviato -> confermato | rifiutato | consegnato, confermato -> consegnato
--   restaurant: inviato -> annullato, inviato | confermato -> consegnato (merce ricevuta)
CREATE OR REPLACE FUNCTION public.update_supplier_order_status(_order_id uuid, _status text, _note text DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _o public.supplier_orders;
  _is_supplier boolean;
  _is_restaurant boolean;
  _notify uuid;
  _label text;
  _party text;
BEGIN
  SELECT * INTO _o FROM public.supplier_orders WHERE id = _order_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Ordine non trovato';
  END IF;

  _is_supplier := public.owns_supplier(_o.supplier_id);
  _is_restaurant := EXISTS (SELECT 1 FROM public.restaurants WHERE id = _o.restaurant_id AND owner_id = auth.uid());

  IF NOT (
    (_is_supplier AND (
      (_o.status = 'inviato' AND _status IN ('confermato', 'rifiutato', 'consegnato'))
      OR (_o.status = 'confermato' AND _status = 'consegnato')))
    OR (_is_restaurant AND (
      (_o.status = 'inviato' AND _status IN ('annullato', 'consegnato'))
      OR (_o.status = 'confermato' AND _status = 'consegnato')))
  ) THEN
    RAISE EXCEPTION 'Cambio di stato non consentito (% -> %)', _o.status, _status;
  END IF;

  UPDATE public.supplier_orders SET
    status = _status,
    updated_at = now(),
    confirmed_at = CASE WHEN _status = 'confermato' THEN now() ELSE confirmed_at END,
    delivered_at = CASE WHEN _status = 'consegnato' THEN now() ELSE delivered_at END,
    supplier_note = CASE WHEN _is_supplier AND nullif(trim(_note), '') IS NOT NULL THEN trim(_note) ELSE supplier_note END
  WHERE id = _order_id;

  _label := CASE _status
    WHEN 'confermato' THEN 'confermato'
    WHEN 'rifiutato' THEN 'rifiutato'
    WHEN 'consegnato' THEN 'consegnato'
    WHEN 'annullato' THEN 'annullato'
  END;

  IF _is_supplier THEN
    SELECT owner_id INTO _notify FROM public.restaurants WHERE id = _o.restaurant_id;
    SELECT name INTO _party FROM public.suppliers WHERE id = _o.supplier_id;
  ELSE
    SELECT owner_user_id INTO _notify FROM public.suppliers WHERE id = _o.supplier_id;
    SELECT name INTO _party FROM public.restaurants WHERE id = _o.restaurant_id;
  END IF;

  IF _notify IS NOT NULL AND _notify <> auth.uid() THEN
    INSERT INTO public.in_app_notifications (user_id, type, title, body, metadata)
    VALUES (_notify, 'supplier_order_update',
      'Ordine ' || _label,
      _party || ' ha segnato l''ordine del ' || to_char(_o.created_at AT TIME ZONE 'Europe/Rome', 'DD/MM') || ' come ' || _label
        || coalesce('. Nota: ' || nullif(trim(_note), ''), ''),
      jsonb_build_object('order_id', _order_id, 'for', CASE WHEN _is_supplier THEN 'restaurant' ELSE 'supplier' END));
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.update_supplier_order_status(uuid, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.update_supplier_order_status(uuid, text, text) TO authenticated;

-- The restaurant records that a delivered order has been loaded into stock.
CREATE OR REPLACE FUNCTION public.mark_supplier_order_stock_loaded(_order_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.supplier_orders o SET stock_loaded_at = now(), updated_at = now()
  WHERE o.id = _order_id
    AND o.status = 'consegnato'
    AND EXISTS (SELECT 1 FROM public.restaurants r WHERE r.id = o.restaurant_id AND r.owner_id = auth.uid());
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Ordine non trovato o non ancora consegnato';
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.mark_supplier_order_stock_loaded(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.mark_supplier_order_stock_loaded(uuid) TO authenticated;
