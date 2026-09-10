-- Fusione di prodotti duplicati nel magazzino di un ristorante.
--
-- Fino alla deduplica dei carichi, ogni bolla importata e ogni carico rapido
-- creavano una riga nuova in `products`: lo stesso articolo compariva due
-- volte in Giacenze e i movimenti si dividevano fra due id, spezzando la
-- stima di consumo. La deduplica ferma i nuovi duplicati, ma quelli gia'
-- creati restavano per sempre: su `products` non esiste nessuna policy di
-- DELETE, nemmeno per l'amministratore.
--
-- Aggiungere una policy di DELETE generica sarebbe pericoloso:
-- `inventory_items.product_id` e' ON DELETE CASCADE, quindi cancellare un
-- prodotto del catalogo condiviso farebbe sparire in silenzio le giacenze di
-- chiunque lo stesse usando. Si passa invece da due funzioni SECURITY DEFINER
-- che fanno il lavoro con i controlli giusti.

-- 1) Fonde due prodotti nel magazzino di un ristorante.
--
--    Sposta lotti e movimenti dal prodotto di origine a quello di
--    destinazione, poi elimina l'origine solo se non la usa piu' nessuno,
--    da nessuna parte. Se il prodotto e' condiviso con altri (un'altra
--    dispensa, una ricetta, un catalogo fornitore) resta a catalogo: il
--    magazzino del ristorante e' comunque a posto.
CREATE OR REPLACE FUNCTION public.merge_restaurant_products(
  p_restaurant_id uuid,
  p_target_product uuid,
  p_source_product uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_target_name text;
  v_lots        integer;
  v_movements   integer;
  v_deleted     boolean := false;
BEGIN
  IF p_target_product = p_source_product THEN
    RAISE EXCEPTION 'Il prodotto di origine e quello di destinazione coincidono';
  END IF;

  -- Solo chi ha accesso al ristorante puo' toccarne il magazzino.
  IF NOT public.is_restaurant_accessible(p_restaurant_id) THEN
    RAISE EXCEPTION 'Nessun accesso a questo ristorante';
  END IF;

  SELECT name INTO v_target_name FROM public.products WHERE id = p_target_product;
  IF v_target_name IS NULL THEN
    RAISE EXCEPTION 'Prodotto di destinazione inesistente';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.products WHERE id = p_source_product) THEN
    RAISE EXCEPTION 'Prodotto di origine inesistente';
  END IF;

  UPDATE public.inventory_items
     SET product_id = p_target_product
   WHERE restaurant_id = p_restaurant_id
     AND product_id = p_source_product;
  GET DIAGNOSTICS v_lots = ROW_COUNT;

  -- Anche il nome denormalizzato va allineato, altrimenti il registro
  -- continuerebbe a mostrare due grafie per lo stesso articolo.
  UPDATE public.inventory_movements
     SET product_id = p_target_product,
         product_name = v_target_name
   WHERE restaurant_id = p_restaurant_id
     AND product_id = p_source_product;
  GET DIAGNOSTICS v_movements = ROW_COUNT;

  -- Si elimina l'origine solo se non e' piu' referenziata da nessuno.
  IF NOT EXISTS (SELECT 1 FROM public.inventory_items       WHERE product_id = p_source_product)
 AND NOT EXISTS (SELECT 1 FROM public.inventory_movements   WHERE product_id = p_source_product)
 AND NOT EXISTS (SELECT 1 FROM public.meal_items            WHERE product_id = p_source_product)
 AND NOT EXISTS (SELECT 1 FROM public.preparation_ingredients WHERE product_id = p_source_product)
 AND NOT EXISTS (SELECT 1 FROM public.recipe_ingredients    WHERE product_id = p_source_product)
 AND NOT EXISTS (SELECT 1 FROM public.supplier_products     WHERE product_id = p_source_product)
 AND NOT EXISTS (SELECT 1 FROM public.user_product_favorites WHERE product_id = p_source_product)
 AND NOT EXISTS (SELECT 1 FROM public.product_usage_log     WHERE product_id = p_source_product)
  THEN
    DELETE FROM public.products WHERE id = p_source_product;
    v_deleted := true;
  END IF;

  RETURN jsonb_build_object(
    'lots_moved', v_lots,
    'movements_moved', v_movements,
    'source_deleted', v_deleted,
    'target_name', v_target_name
  );
END;
$$;

COMMENT ON FUNCTION public.merge_restaurant_products IS
  'Unisce due prodotti nel magazzino di un ristorante: sposta lotti e movimenti, poi elimina il prodotto di origine se non lo usa piu'' nessuno.';

REVOKE ALL ON FUNCTION public.merge_restaurant_products(uuid, uuid, uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.merge_restaurant_products(uuid, uuid, uuid) TO authenticated;

-- 2) Rimuove dal catalogo un prodotto che non usa piu' nessuno.
--
--    Serve per la spazzatura lasciata dai vecchi import. Il controllo di non
--    referenzialita' e' la ragione per cui non basta una policy di DELETE:
--    qui il CASCADE su `inventory_items` non puo' fare danni, perche' la
--    riga viene eliminata solo quando nessun lotto la punta.
CREATE OR REPLACE FUNCTION public.purge_unused_product(p_product_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.current_user_is_admin() THEN
    RAISE EXCEPTION 'Riservato agli amministratori';
  END IF;

  IF EXISTS (SELECT 1 FROM public.inventory_items         WHERE product_id = p_product_id)
  OR EXISTS (SELECT 1 FROM public.inventory_movements     WHERE product_id = p_product_id)
  OR EXISTS (SELECT 1 FROM public.meal_items              WHERE product_id = p_product_id)
  OR EXISTS (SELECT 1 FROM public.preparation_ingredients WHERE product_id = p_product_id)
  OR EXISTS (SELECT 1 FROM public.recipe_ingredients      WHERE product_id = p_product_id)
  OR EXISTS (SELECT 1 FROM public.supplier_products       WHERE product_id = p_product_id)
  OR EXISTS (SELECT 1 FROM public.user_product_favorites  WHERE product_id = p_product_id)
  OR EXISTS (SELECT 1 FROM public.product_usage_log       WHERE product_id = p_product_id)
  THEN
    RETURN false;
  END IF;

  DELETE FROM public.products WHERE id = p_product_id;
  RETURN true;
END;
$$;

COMMENT ON FUNCTION public.purge_unused_product IS
  'Elimina un prodotto dal catalogo solo se non e'' referenziato da nulla. Riservato agli amministratori.';

REVOKE ALL ON FUNCTION public.purge_unused_product(uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.purge_unused_product(uuid) TO authenticated;
