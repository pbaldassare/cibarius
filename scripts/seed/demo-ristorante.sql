-- Dati dimostrativi per il lato ristorante: bolle, lotti, movimenti e
-- preparazioni, pensati per provare i flussi di carico/scarico e la stima
-- di esaurimento.
--
-- Lo storico dei consumi copre gli ultimi 20 giorni con quantita' variabili:
-- senza movimenti datati la pagina Magazzino non avrebbe nulla da cui
-- calcolare il consumo medio, e mostrerebbe solo "consumo non ancora
-- misurabile" su ogni riga.
--
-- Le scadenze sono volutamente distribuite (scaduti, in scadenza, lontani)
-- per popolare tutti i filtri della scheda scadenze.
--
-- Uso: sostituire i due UUID sotto con quelli del proprio ristorante
--      (select id, owner_id from public.restaurants) ed eseguire.
--      Tutto e' marcato [DEMO]; per ripulire vedi demo-ristorante-pulizia.sql.

do $$
declare
  v_rest uuid := 'a1244511-0238-400c-b040-aabf26816851';
  v_user uuid := '4ba41ade-64ba-4a92-a2cf-6c096600adf1';
  v_doc1 uuid; v_doc2 uuid; v_doc3 uuid;
  v_prod uuid; v_item uuid;
  r record; d int; qty numeric;
begin
  -- ── 1. Bolle / DDT con dati gia' "estratti" ────────────────────────
  insert into public.haccp_documents
    (restaurant_id, document_type, document_number, document_date, supplier_name,
     storage_bucket, created_by, extracted_data)
  values
    (v_rest,'ddt','DDT/2026/1180', current_date - 21,'[DEMO] Ortofrutta Verde Srl','haccp-documents',v_user,
     '{"supplier_name":"[DEMO] Ortofrutta Verde Srl","document_number":"DDT/2026/1180","items":[{"name":"Pomodori pelati","quantity":24,"unit":"kg"},{"name":"Cipolle dorate","quantity":15,"unit":"kg"}],"total":186.40}'::jsonb)
  returning id into v_doc1;

  insert into public.haccp_documents
    (restaurant_id, document_type, document_number, document_date, supplier_name,
     storage_bucket, created_by, extracted_data)
  values
    (v_rest,'ddt','DDT/2026/1204', current_date - 12,'[DEMO] Carni Bianchi SpA','haccp-documents',v_user,
     '{"supplier_name":"[DEMO] Carni Bianchi SpA","document_number":"DDT/2026/1204","items":[{"name":"Petto di pollo","quantity":18,"unit":"kg"},{"name":"Macinato di manzo","quantity":12,"unit":"kg"}],"total":312.00}'::jsonb)
  returning id into v_doc2;

  insert into public.haccp_documents
    (restaurant_id, document_type, document_number, document_date, supplier_name,
     storage_bucket, created_by, extracted_data)
  values
    (v_rest,'bolla','BOL/2026/0447', current_date - 4,'[DEMO] Latteria del Sud','haccp-documents',v_user,
     '{"supplier_name":"[DEMO] Latteria del Sud","document_number":"BOL/2026/0447","items":[{"name":"Mozzarella fiordilatte","quantity":10,"unit":"kg"},{"name":"Parmigiano 24 mesi","quantity":4,"unit":"kg"}],"total":148.90}'::jsonb)
  returning id into v_doc3;

  -- ── 2. Prodotti + lotti, con scadenze volutamente diversificate ────
  --    consumo_gg guida lo storico: serve a far comparire previsioni
  --    di esaurimento diverse fra loro.
  for r in
    select * from (values
      -- nome,                    cat,        qty,  unit, giorni_a_scadenza, storage,    lotto,      doc, consumo_gg
      ('[DEMO] Pomodori pelati',  'Dispensa',  18,  'kg',   120, 'ambiente',  'L-1180-A', 1, 0.9),
      ('[DEMO] Cipolle dorate',   'Dispensa',  11,  'kg',    45, 'ambiente',  'L-1180-B', 1, 0.5),
      ('[DEMO] Petto di pollo',   'Carne',      7,  'kg',     3, 'frigo',     'L-1204-A', 2, 1.6),
      ('[DEMO] Macinato di manzo','Carne',      4,  'kg',     1, 'frigo',     'L-1204-B', 2, 1.1),
      ('[DEMO] Mozzarella',       'Latticini',  6,  'kg',     5, 'frigo',     'L-0447-A', 3, 1.2),
      ('[DEMO] Parmigiano 24m',   'Latticini',  3,  'kg',   180, 'frigo',     'L-0447-B', 3, 0.15),
      ('[DEMO] Burro',            'Latticini',  2,  'kg',    -2, 'frigo',     'L-0447-C', 3, 0.3),
      ('[DEMO] Farina 00',        'Dispensa',  25,  'kg',   200, 'ambiente',  'L-9001',   1, 1.4),
      ('[DEMO] Olio EVO',         'Dispensa',  12,  'l',    300, 'ambiente',  'L-9002',   1, 0.35),
      ('[DEMO] Piselli surgelati','Surgelati',  9,  'kg',   240, 'freezer',   'L-9003',   2, 0.4),
      ('[DEMO] Branzino',         'Pesce',      5,  'kg',     2, 'frigo',     'L-9004',   2, 0.8),
      ('[DEMO] Basilico fresco',  'Verdura',    1,  'kg',    -1, 'frigo',     'L-9005',   1, 0.25)
    ) as t(nome, cat, qty, unit, gg, storage, lotto, doc, consumo)
  loop
    insert into public.products (name, category, unit, data_source)
    values (r.nome, r.cat, r.unit, 'manual') returning id into v_prod;

    insert into public.inventory_items
      (product_id, restaurant_id, storage_type, quantity, unit, expiry_date, lot_number, source_document_id)
    values (v_prod, v_rest, r.storage, r.qty, r.unit, current_date + r.gg, r.lotto,
            case r.doc when 1 then v_doc1 when 2 then v_doc2 else v_doc3 end)
    returning id into v_item;

    -- Carico iniziale, datato come la bolla di provenienza
    insert into public.inventory_movements
      (restaurant_id, inventory_item_id, product_id, product_name, movement_type,
       quantity_delta, unit, lot_number, source_document_id, notes, user_id, user_name, created_at)
    values (v_rest, v_item, v_prod, r.nome, 'carico',
            r.qty + (r.consumo * 21)::numeric(10,2), r.unit, r.lotto,
            case r.doc when 1 then v_doc1 when 2 then v_doc2 else v_doc3 end,
            'Carico da bolla', v_user, 'Ristorante',
            now() - (case r.doc when 1 then 21 when 2 then 12 else 4 end || ' days')::interval);

    -- Consumi giornalieri degli ultimi 20 giorni, con variabilita'
    for d in 1..20 loop
      qty := round((r.consumo * (0.6 + random() * 0.8))::numeric, 2);
      if qty > 0 then
        insert into public.inventory_movements
          (restaurant_id, inventory_item_id, product_id, product_name, movement_type,
           quantity_delta, unit, lot_number, user_id, user_name, created_at)
        values (v_rest, v_item, v_prod, r.nome, 'consumo', -qty, r.unit, r.lotto,
                v_user, 'Ristorante', now() - (d || ' days')::interval - (random()*8 || ' hours')::interval);
      end if;
    end loop;

    -- Qualche spreco sparso, solo su alcuni prodotti
    if random() < 0.4 then
      insert into public.inventory_movements
        (restaurant_id, inventory_item_id, product_id, product_name, movement_type,
         quantity_delta, unit, lot_number, notes, user_id, user_name, created_at)
      values (v_rest, v_item, v_prod, r.nome, 'spreco',
              -round((r.consumo * 1.5)::numeric, 2), r.unit, r.lotto,
              'Scaduto in cella', v_user, 'Ristorante', now() - (random()*14 || ' days')::interval);
    end if;
  end loop;

  -- ── 3. Preparazioni interne ────────────────────────────────────────
  insert into public.preparations
    (restaurant_id, owner_user_id, name, description, prepared_at, storage_type,
     use_by_date, portions, lot_number, production_date, chef_life_hours)
  values
    (v_rest, v_user, '[DEMO] Ragu alla bolognese', 'Manzo, pomodoro, soffritto',
     now() - interval '1 day', 'frigo', current_date + 2, 12, 'P-2601', current_date - 1, 72),
    (v_rest, v_user, '[DEMO] Besciamella', 'Latte, burro, farina 00',
     now() - interval '2 days', 'frigo', current_date + 1, 8, 'P-2602', current_date - 2, 48),
    (v_rest, v_user, '[DEMO] Lasagne al forno', 'Ragu, besciamella, sfoglia',
     now(), 'frigo', current_date + 3, 16, 'P-2603', current_date, 96),
    (v_rest, v_user, '[DEMO] Brodo vegetale', 'Sedano, carota, cipolla',
     now() - interval '4 days', 'freezer', current_date - 1, 6, 'P-2604', current_date - 4, 120);
end $$;
