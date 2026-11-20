create or replace function public.save_restaurant_haccp_label(
  p_label jsonb, p_ingredients jsonb, p_documents uuid[]
) returns uuid
language plpgsql security invoker set search_path = ''
as $$
declare
  label public.haccp_preparation_labels;
  label_id uuid;
  v_operator_name text;
  finalize boolean := p_label->>'status' = 'finalized';
begin
  label := jsonb_populate_record(null::public.haccp_preparation_labels, p_label);
  if auth.uid() is null or public.is_restaurant_accessible(label.restaurant_id) is not true then
    raise exception 'Ristorante non accessibile';
  end if;
  if label.production_date is null or label.expiration_date is null or label.expiration_date < label.production_date then
    raise exception 'Date di produzione e scadenza non valide';
  end if;
  if finalize and (p_label->'allergens_reviewed' is distinct from 'true'::jsonb or not exists (
    select 1 from jsonb_array_elements(p_ingredients) i
    where nullif(btrim(i->>'ingredient_name'), '') is not null
  )) then
    raise exception 'Indica gli ingredienti e conferma la verifica degli allergeni';
  end if;
  if label.source_preparation_id is not null and not exists (
    select 1 from public.preparations p
    where p.id = label.source_preparation_id and p.restaurant_id = label.restaurant_id
  ) then
    raise exception 'Preparazione non accessibile';
  end if;
  if exists (
    select 1 from unnest(p_documents) d(id)
    where not exists (
      select 1 from public.haccp_documents h where h.id = d.id and h.restaurant_id = label.restaurant_id
    )
  ) or exists (
    select 1
    from jsonb_populate_recordset(null::public.haccp_preparation_ingredients, p_ingredients) i
    where (i.pantry_item_id is not null and not exists (
      select 1 from public.inventory_items v where v.id = i.pantry_item_id and v.restaurant_id = label.restaurant_id
    ) and not exists (
      select 1 from public.haccp_preparation_ingredients existing
      where existing.preparation_label_id = label.id and existing.pantry_item_id = i.pantry_item_id
    )) or (i.origin_document_id is not null and not exists (
      select 1 from public.haccp_documents h where h.id = i.origin_document_id and h.restaurant_id = label.restaurant_id
    ))
  ) then
    raise exception 'Lotto o documento non accessibile';
  end if;
  select coalesce(nullif(full_name, ''), email) into v_operator_name
  from public.profiles where id = auth.uid();

  if label.id is not null then
    select id into label_id from public.haccp_preparation_labels
    where id = label.id and restaurant_id = label.restaurant_id and status = 'draft'
    for update;
    if not found then raise exception 'Bozza non modificabile'; end if;

    delete from public.haccp_preparation_ingredients where preparation_label_id = label_id;
    delete from public.haccp_preparation_documents where preparation_label_id = label_id;
    update public.haccp_preparation_labels
    set preparation_name = label.preparation_name, quantity = label.quantity, unit = label.unit,
      production_date = label.production_date, expiration_date = label.expiration_date,
      conservation_type = label.conservation_type, internal_lot_code = coalesce(label.internal_lot_code, internal_lot_code),
      notes = label.notes, allergens = coalesce(label.allergens, array[]::text[]),
      operator_name = v_operator_name, operator_user_id = auth.uid(),
      status = case when finalize then 'finalized' else 'draft' end,
      finalized_at = case when finalize then now() end
    where id = label_id;
  else
  insert into public.haccp_preparation_labels (
    restaurant_id, preparation_name, quantity, unit, production_date, expiration_date,
    conservation_type, internal_lot_code, operator_user_id, operator_name, notes, allergens,
    status, finalized_at, created_by, source_preparation_id
  ) values (
    label.restaurant_id, label.preparation_name, label.quantity, label.unit, label.production_date,
    label.expiration_date, label.conservation_type, label.internal_lot_code, auth.uid(), v_operator_name,
    label.notes, coalesce(label.allergens, array[]::text[]),
    case when p_label->>'status' = 'finalized' then 'finalized' else 'draft' end,
    case when p_label->>'status' = 'finalized' then now() end, auth.uid(), label.source_preparation_id
  ) returning id into label_id;
  end if;

  insert into public.haccp_preparation_ingredients (
    preparation_label_id, pantry_item_id, ingredient_name, quantity_used, unit, source_lot_code,
    supplier_name, ingredient_expiration_date, origin_document_id
  )
  select label_id, pantry_item_id, ingredient_name, quantity_used, unit, source_lot_code,
    supplier_name, ingredient_expiration_date, origin_document_id
  from jsonb_populate_recordset(null::public.haccp_preparation_ingredients, p_ingredients);

  insert into public.haccp_preparation_documents (preparation_label_id, document_id)
  select label_id, d.id from unnest(p_documents) d(id);

  insert into public.haccp_label_audit_log (preparation_label_id, action, user_id, user_name, metadata)
  values (label_id, case when finalize then 'finalized' when label.id is not null then 'modified' else 'created' end,
    auth.uid(), v_operator_name, jsonb_build_object('allergens_reviewed', finalize));
  return label_id;
end;
$$;

revoke execute on function public.save_restaurant_haccp_label(jsonb, jsonb, uuid[]) from public, anon;
grant execute on function public.save_restaurant_haccp_label(jsonb, jsonb, uuid[]) to authenticated;

create or replace function public.consume_restaurant_stock(
  p_restaurant_id uuid, p_item_id uuid, p_is_preparation boolean,
  p_movement_type text, p_quantity numeric
) returns numeric
language plpgsql security invoker set search_path = ''
as $$
declare
  item public.inventory_items;
  prep public.preparations;
  item_name text;
  v_operator_name text;
  available numeric;
  used numeric;
  remaining numeric;
begin
  if auth.uid() is null or public.is_restaurant_accessible(p_restaurant_id) is not true then
    raise exception 'Ristorante non accessibile';
  end if;
  if p_movement_type is null or p_movement_type not in ('consumo', 'spreco') then
    raise exception 'Movimento non valido';
  end if;
  if p_quantity is not null and p_quantity <= 0 then
    raise exception 'Quantità non valida';
  end if;
  if p_is_preparation then
    select * into strict prep from public.preparations
    where id = p_item_id and restaurant_id = p_restaurant_id for update;
    available := case when prep.portions > 0 then prep.portions else 1 end;
    used := case when p_quantity is null then available else least(available, greatest(1, round(p_quantity))) end;
    item_name := prep.name;
  else
    select * into strict item from public.inventory_items
    where id = p_item_id and restaurant_id = p_restaurant_id for update;
    available := case when item.quantity > 0 then item.quantity else 1 end;
    used := least(available, coalesce(p_quantity, available));
    select name into item_name from public.products where id = item.product_id;
  end if;
  remaining := round(available - used, 3);
  select coalesce(nullif(full_name, ''), email) into v_operator_name
  from public.profiles where id = auth.uid();

  insert into public.inventory_movements (
    restaurant_id, inventory_item_id, product_id, product_name, movement_type, quantity_delta,
    unit, lot_number, expiry_date, notes, user_id, user_name
  ) values (
    p_restaurant_id, item.id, item.product_id, coalesce(item_name, 'Prodotto'),
    p_movement_type, -used, case when p_is_preparation then 'porzioni' else item.unit end,
    coalesce(prep.lot_number, item.lot_number), coalesce(prep.use_by_date, item.expiry_date),
    case when p_is_preparation then 'Preparazione' end, auth.uid(), v_operator_name
  );

  if p_is_preparation then
    if remaining > 0 then
      update public.preparations set portions = remaining where id = prep.id;
    else
      delete from public.preparations where id = prep.id;
    end if;
  else
    if remaining > 0 then
      update public.inventory_items set quantity = remaining where id = item.id;
    else
      delete from public.inventory_items where id = item.id;
    end if;
  end if;
  if not found then raise exception 'Giacenza non aggiornata'; end if;
  return remaining;
exception when no_data_found then
  raise exception 'Giacenza non disponibile. Aggiorna e riprova.';
end;
$$;

revoke execute on function public.consume_restaurant_stock(uuid, uuid, boolean, text, numeric) from public, anon;
grant execute on function public.consume_restaurant_stock(uuid, uuid, boolean, text, numeric) to authenticated;
