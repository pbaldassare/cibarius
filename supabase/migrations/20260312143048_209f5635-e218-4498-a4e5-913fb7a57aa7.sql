
-- Seed HACCP templates
INSERT INTO public.haccp_templates (id, name, business_type, description) VALUES
('a0000001-0000-0000-0000-000000000001', 'Ristorante generico', 'ristorante_generico', 'Template base per ristoranti tradizionali'),
('a0000001-0000-0000-0000-000000000002', 'Pizzeria', 'pizzeria', 'Template specifico per pizzerie'),
('a0000001-0000-0000-0000-000000000003', 'Bar / Caffetteria', 'bar_caffetteria', 'Template per bar e caffetterie'),
('a0000001-0000-0000-0000-000000000004', 'Pub / Hamburgeria', 'pub_hamburgeria', 'Template per pub e hamburgerie'),
('a0000001-0000-0000-0000-000000000005', 'Gastronomia / Tavola calda', 'gastronomia', 'Template per gastronomie e tavole calde'),
('a0000001-0000-0000-0000-000000000006', 'Pasticceria', 'pasticceria', 'Template per pasticcerie e laboratori dolciari'),
('a0000001-0000-0000-0000-000000000007', 'Gelateria', 'gelateria', 'Template per gelaterie artigianali'),
('a0000001-0000-0000-0000-000000000008', 'Paninoteca', 'paninoteca', 'Template per paninotecte e street food'),
('a0000001-0000-0000-0000-000000000009', 'Ristorante pesce', 'ristorante_pesce', 'Template per ristoranti specializzati in pesce'),
('a0000001-0000-0000-0000-00000000000a', 'Ristorante carne', 'ristorante_carne', 'Template per ristoranti specializzati in carne')
ON CONFLICT (id) DO NOTHING;

-- Ristorante generico tasks
INSERT INTO public.haccp_template_tasks (template_id, task_name, category, frequency_type, default_area_type, is_required, sort_order) VALUES
('a0000001-0000-0000-0000-000000000001', 'Controllo celle frigorifere', 'celle_frigo', 'giornaliera', 'celle_frigo', true, 0),
('a0000001-0000-0000-0000-000000000001', 'Controllo frigoriferi', 'frigoriferi', 'giornaliera', 'frigoriferi', true, 1),
('a0000001-0000-0000-0000-000000000001', 'Controllo freezer', 'freezer', 'giornaliera', 'freezer', true, 2),
('a0000001-0000-0000-0000-000000000001', 'Verifica temperature', 'temperature', 'giornaliera', null, true, 3),
('a0000001-0000-0000-0000-000000000001', 'Pulizia cappe', 'pulizie', 'settimanale', 'attrezzature', false, 4),
('a0000001-0000-0000-0000-000000000001', 'Pulizia forni', 'pulizie', 'settimanale', 'attrezzature', false, 5),
('a0000001-0000-0000-0000-000000000001', 'Pulizia superfici', 'superfici', 'giornaliera', 'area_lavoro', true, 6),
('a0000001-0000-0000-0000-000000000001', 'Controllo scadenze prodotti', 'prodotti_scadenza', 'giornaliera', null, true, 7),
('a0000001-0000-0000-0000-000000000001', 'Pulizia area cucina', 'pulizie', 'giornaliera', 'area_lavoro', true, 8),
('a0000001-0000-0000-0000-000000000001', 'Pulizia magazzino alimenti', 'pulizie', 'settimanale', 'area_lavoro', false, 9);

-- Pizzeria tasks
INSERT INTO public.haccp_template_tasks (template_id, task_name, category, frequency_type, default_area_type, is_required, sort_order) VALUES
('a0000001-0000-0000-0000-000000000002', 'Pulizia forno pizza', 'pulizie', 'giornaliera', 'attrezzature_speciali', true, 0),
('a0000001-0000-0000-0000-000000000002', 'Pulizia banco preparazione', 'superfici', 'giornaliera', 'area_lavoro', true, 1),
('a0000001-0000-0000-0000-000000000002', 'Controllo frigoriferi ingredienti', 'frigoriferi', 'giornaliera', 'frigoriferi', true, 2),
('a0000001-0000-0000-0000-000000000002', 'Controllo impasti / conservazione', 'prodotti_scadenza', 'giornaliera', null, true, 3),
('a0000001-0000-0000-0000-000000000002', 'Pulizia cappe', 'pulizie', 'settimanale', 'attrezzature', false, 4),
('a0000001-0000-0000-0000-000000000002', 'Controllo scadenze latticini', 'prodotti_scadenza', 'giornaliera', null, true, 5),
('a0000001-0000-0000-0000-000000000002', 'Pulizia utensili', 'pulizie', 'giornaliera', 'attrezzature', true, 6),
('a0000001-0000-0000-0000-000000000002', 'Verifica temperature', 'temperature', 'giornaliera', null, true, 7);

-- Bar / Caffetteria tasks
INSERT INTO public.haccp_template_tasks (template_id, task_name, category, frequency_type, default_area_type, is_required, sort_order) VALUES
('a0000001-0000-0000-0000-000000000003', 'Pulizia macchina caffè', 'pulizie', 'giornaliera', 'attrezzature_speciali', true, 0),
('a0000001-0000-0000-0000-000000000003', 'Controllo frigorifero latte', 'frigoriferi', 'giornaliera', 'frigoriferi', true, 1),
('a0000001-0000-0000-0000-000000000003', 'Controllo banco espositivo', 'temperature', 'giornaliera', 'attrezzature', true, 2),
('a0000001-0000-0000-0000-000000000003', 'Pulizia superfici', 'superfici', 'giornaliera', 'area_lavoro', true, 3),
('a0000001-0000-0000-0000-000000000003', 'Controllo scadenze prodotti freschi', 'prodotti_scadenza', 'giornaliera', null, true, 4),
('a0000001-0000-0000-0000-000000000003', 'Pulizia attrezzature', 'pulizie', 'giornaliera', 'attrezzature', true, 5),
('a0000001-0000-0000-0000-000000000003', 'Verifica temperature', 'temperature', 'giornaliera', null, true, 6);

-- Pub / Hamburgeria tasks
INSERT INTO public.haccp_template_tasks (template_id, task_name, category, frequency_type, default_area_type, is_required, sort_order) VALUES
('a0000001-0000-0000-0000-000000000004', 'Pulizia piastre e grill', 'pulizie', 'giornaliera', 'attrezzature_speciali', true, 0),
('a0000001-0000-0000-0000-000000000004', 'Controllo frigoriferi carni', 'frigoriferi', 'giornaliera', 'frigoriferi', true, 1),
('a0000001-0000-0000-0000-000000000004', 'Pulizia friggitrici', 'pulizie', 'giornaliera', 'attrezzature_speciali', true, 2),
('a0000001-0000-0000-0000-000000000004', 'Pulizia superfici', 'superfici', 'giornaliera', 'area_lavoro', true, 3),
('a0000001-0000-0000-0000-000000000004', 'Controllo scadenze salse e condimenti', 'prodotti_scadenza', 'giornaliera', null, true, 4),
('a0000001-0000-0000-0000-000000000004', 'Pulizia cappe', 'pulizie', 'settimanale', 'attrezzature', false, 5),
('a0000001-0000-0000-0000-000000000004', 'Verifica temperature', 'temperature', 'giornaliera', null, true, 6);

-- Gastronomia tasks
INSERT INTO public.haccp_template_tasks (template_id, task_name, category, frequency_type, default_area_type, is_required, sort_order) VALUES
('a0000001-0000-0000-0000-000000000005', 'Controllo banchi caldi', 'temperature', 'giornaliera', 'attrezzature', true, 0),
('a0000001-0000-0000-0000-000000000005', 'Controllo banchi freddi', 'temperature', 'giornaliera', 'attrezzature', true, 1),
('a0000001-0000-0000-0000-000000000005', 'Controllo frigoriferi', 'frigoriferi', 'giornaliera', 'frigoriferi', true, 2),
('a0000001-0000-0000-0000-000000000005', 'Pulizia superfici esposizione', 'superfici', 'giornaliera', 'area_lavoro', true, 3),
('a0000001-0000-0000-0000-000000000005', 'Controllo scadenze piatti pronti', 'prodotti_scadenza', 'giornaliera', null, true, 4),
('a0000001-0000-0000-0000-000000000005', 'Pulizia area preparazione', 'pulizie', 'giornaliera', 'area_lavoro', true, 5),
('a0000001-0000-0000-0000-000000000005', 'Verifica temperature', 'temperature', 'giornaliera', null, true, 6);

-- Pasticceria tasks
INSERT INTO public.haccp_template_tasks (template_id, task_name, category, frequency_type, default_area_type, is_required, sort_order) VALUES
('a0000001-0000-0000-0000-000000000006', 'Controllo frigoriferi', 'frigoriferi', 'giornaliera', 'frigoriferi', true, 0),
('a0000001-0000-0000-0000-000000000006', 'Controllo materie prime', 'prodotti_scadenza', 'giornaliera', null, true, 1),
('a0000001-0000-0000-0000-000000000006', 'Controllo scadenze creme e derivati', 'prodotti_scadenza', 'giornaliera', null, true, 2),
('a0000001-0000-0000-0000-000000000006', 'Pulizia forni', 'pulizie', 'giornaliera', 'attrezzature', true, 3),
('a0000001-0000-0000-0000-000000000006', 'Pulizia superfici', 'superfici', 'giornaliera', 'area_lavoro', true, 4),
('a0000001-0000-0000-0000-000000000006', 'Verifica temperature', 'temperature', 'giornaliera', null, true, 5),
('a0000001-0000-0000-0000-000000000006', 'Pulizia utensili', 'pulizie', 'giornaliera', 'attrezzature', true, 6);

-- Gelateria tasks
INSERT INTO public.haccp_template_tasks (template_id, task_name, category, frequency_type, default_area_type, is_required, sort_order) VALUES
('a0000001-0000-0000-0000-000000000007', 'Controllo freezer', 'freezer', 'giornaliera', 'freezer', true, 0),
('a0000001-0000-0000-0000-000000000007', 'Controllo banco esposizione', 'temperature', 'giornaliera', 'attrezzature', true, 1),
('a0000001-0000-0000-0000-000000000007', 'Pulizia macchine gelato', 'pulizie', 'giornaliera', 'attrezzature_speciali', true, 2),
('a0000001-0000-0000-0000-000000000007', 'Controllo temperature', 'temperature', 'giornaliera', null, true, 3),
('a0000001-0000-0000-0000-000000000007', 'Pulizia superfici', 'superfici', 'giornaliera', 'area_lavoro', true, 4),
('a0000001-0000-0000-0000-000000000007', 'Controllo scadenze latte e derivati', 'prodotti_scadenza', 'giornaliera', null, true, 5);

-- Paninoteca tasks
INSERT INTO public.haccp_template_tasks (template_id, task_name, category, frequency_type, default_area_type, is_required, sort_order) VALUES
('a0000001-0000-0000-0000-000000000008', 'Pulizia piastre / tostapane', 'pulizie', 'giornaliera', 'attrezzature_speciali', true, 0),
('a0000001-0000-0000-0000-000000000008', 'Controllo frigoriferi affettati', 'frigoriferi', 'giornaliera', 'frigoriferi', true, 1),
('a0000001-0000-0000-0000-000000000008', 'Pulizia banco preparazione', 'superfici', 'giornaliera', 'area_lavoro', true, 2),
('a0000001-0000-0000-0000-000000000008', 'Controllo scadenze ingredienti freschi', 'prodotti_scadenza', 'giornaliera', null, true, 3),
('a0000001-0000-0000-0000-000000000008', 'Pulizia affettatrice', 'pulizie', 'giornaliera', 'attrezzature_speciali', true, 4),
('a0000001-0000-0000-0000-000000000008', 'Verifica temperature', 'temperature', 'giornaliera', null, true, 5);

-- Ristorante pesce tasks
INSERT INTO public.haccp_template_tasks (template_id, task_name, category, frequency_type, default_area_type, is_required, sort_order) VALUES
('a0000001-0000-0000-0000-000000000009', 'Controllo celle frigorifere pesce', 'celle_frigo', 'giornaliera', 'celle_frigo', true, 0),
('a0000001-0000-0000-0000-000000000009', 'Controllo abbattitore', 'temperature', 'giornaliera', 'attrezzature_speciali', true, 1),
('a0000001-0000-0000-0000-000000000009', 'Verifica catena del freddo', 'temperature', 'giornaliera', null, true, 2),
('a0000001-0000-0000-0000-000000000009', 'Pulizia banco pesce', 'superfici', 'giornaliera', 'area_lavoro', true, 3),
('a0000001-0000-0000-0000-000000000009', 'Controllo scadenze prodotti ittici', 'prodotti_scadenza', 'giornaliera', null, true, 4),
('a0000001-0000-0000-0000-000000000009', 'Pulizia cappe', 'pulizie', 'settimanale', 'attrezzature', false, 5),
('a0000001-0000-0000-0000-000000000009', 'Pulizia superfici cucina', 'superfici', 'giornaliera', 'area_lavoro', true, 6),
('a0000001-0000-0000-0000-000000000009', 'Controllo frigoriferi', 'frigoriferi', 'giornaliera', 'frigoriferi', true, 7);

-- Ristorante carne tasks
INSERT INTO public.haccp_template_tasks (template_id, task_name, category, frequency_type, default_area_type, is_required, sort_order) VALUES
('a0000001-0000-0000-0000-00000000000a', 'Controllo celle frigorifere carni', 'celle_frigo', 'giornaliera', 'celle_frigo', true, 0),
('a0000001-0000-0000-0000-00000000000a', 'Controllo temperatura conservazione carni', 'temperature', 'giornaliera', null, true, 1),
('a0000001-0000-0000-0000-00000000000a', 'Pulizia grill e piastre', 'pulizie', 'giornaliera', 'attrezzature_speciali', true, 2),
('a0000001-0000-0000-0000-00000000000a', 'Controllo scadenze carni fresche', 'prodotti_scadenza', 'giornaliera', null, true, 3),
('a0000001-0000-0000-0000-00000000000a', 'Pulizia banco macellazione', 'superfici', 'giornaliera', 'area_lavoro', true, 4),
('a0000001-0000-0000-0000-00000000000a', 'Pulizia cappe', 'pulizie', 'settimanale', 'attrezzature', false, 5),
('a0000001-0000-0000-0000-00000000000a', 'Controllo frigoriferi', 'frigoriferi', 'giornaliera', 'frigoriferi', true, 6),
('a0000001-0000-0000-0000-00000000000a', 'Verifica temperature generali', 'temperature', 'giornaliera', null, true, 7);
