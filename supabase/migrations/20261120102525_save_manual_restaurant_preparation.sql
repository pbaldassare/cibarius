create or replace function public.save_manual_restaurant_preparation(
  p_preparation jsonb, p_ingredients jsonb, p_allergen_ids uuid[]
) returns uuid
language plpgsql security invoker set search_path = ''
as $$
declare
  draft public.preparations;
  preparation_id uuid;
  label_id uuid;
begin
  draft := jsonb_populate_record(null::public.preparations, p_preparation);
  if auth.uid() is null or public.is_restaurant_accessible(draft.restaurant_id) is not true then
    raise exception 'Ristorante non accessibile';
  end if;
  if nullif(btrim(draft.name), '') is null
     or draft.production_date is null or draft.use_by_date is null
     or draft.use_by_date < draft.production_date or coalesce(draft.portions, 0) < 1
     or draft.net_weight_g < 0 or draft.chef_life_hours < 1 then
    raise exception 'Controlla nome, date, quantità, peso e durata della preparazione';
  end if;

  insert into public.preparations (
    name, restaurant_id, storage_type, use_by_date, lot_number, chef_life_hours,
    production_date, portions, description, notes, net_weight_g
  ) values (
    btrim(draft.name), draft.restaurant_id, draft.storage_type, draft.use_by_date,
    draft.lot_number, draft.chef_life_hours, draft.production_date, draft.portions,
    draft.description, draft.notes, draft.net_weight_g
  ) returning id into preparation_id;

  insert into public.preparation_ingredients (preparation_id, custom_name, quantity, unit)
  select preparation_id, btrim(i.name), i.quantity, i.unit
  from jsonb_to_recordset(p_ingredients) i(name text, quantity numeric, unit text)
  where nullif(btrim(i.name), '') is not null;

  insert into public.preparation_allergens (preparation_id, allergen_id)
  select preparation_id, a.id from (select distinct unnest(p_allergen_ids) as id) a;

  select l.id into strict label_id from public.haccp_preparation_labels l
  where l.source_preparation_id = preparation_id and l.restaurant_id = draft.restaurant_id and l.status = 'draft';

  update public.haccp_preparation_labels
  set allergens = array(select a.name from public.allergens a where a.id = any(p_allergen_ids) order by a.name)
  where id = label_id;
  if not found then raise exception 'Bozza HACCP non aggiornata'; end if;

  insert into public.haccp_preparation_ingredients (preparation_label_id, ingredient_name, quantity_used, unit)
  select label_id, btrim(i.name), i.quantity, i.unit
  from jsonb_to_recordset(p_ingredients) i(name text, quantity numeric, unit text)
  where nullif(btrim(i.name), '') is not null;

  return preparation_id;
end;
$$;

revoke execute on function public.save_manual_restaurant_preparation(jsonb, jsonb, uuid[]) from public, anon;
grant execute on function public.save_manual_restaurant_preparation(jsonb, jsonb, uuid[]) to authenticated;
