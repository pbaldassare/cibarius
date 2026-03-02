
-- RLS policies for system templates (professional_id = '00000000-0000-0000-0000-000000000000')
CREATE POLICY "Read system templates"
  ON diet_plan_templates FOR SELECT
  USING (professional_id = '00000000-0000-0000-0000-000000000000' AND auth.uid() IS NOT NULL);

CREATE POLICY "Read system template meals"
  ON diet_plan_template_meals FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM diet_plan_templates t
    WHERE t.id = diet_plan_template_meals.template_id
    AND t.professional_id = '00000000-0000-0000-0000-000000000000'
  ) AND auth.uid() IS NOT NULL);

-- Also allow any authenticated user to create/manage their own templates (for user self-plan)
CREATE POLICY "User manages own templates"
  ON diet_plan_templates FOR ALL
  USING (professional_id = auth.uid())
  WITH CHECK (professional_id = auth.uid());

CREATE POLICY "User template meals follow template"
  ON diet_plan_template_meals FOR ALL
  USING (EXISTS (
    SELECT 1 FROM diet_plan_templates t
    WHERE t.id = diet_plan_template_meals.template_id
    AND t.professional_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM diet_plan_templates t
    WHERE t.id = diet_plan_template_meals.template_id
    AND t.professional_id = auth.uid()
  ));

-- Seed system templates
INSERT INTO diet_plan_templates (id, professional_id, title, kcal_day, protein_g_day, carbs_g_day, fats_g_day, notes) VALUES
  ('a0000001-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000000', 'Ketogenica - Uomo', 2000, 125, 30, 155, 'Rapporto grassi/carbo 5:1'),
  ('a0000001-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000000', 'Ketogenica - Donna', 1600, 100, 25, 120, 'Rapporto grassi/carbo 5:1'),
  ('a0000001-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000000', 'Digiuno intermittente 16:8 - Uomo', 2200, 130, 260, 75, 'Solo pranzo+cena+spuntino, no colazione'),
  ('a0000001-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000000', 'Digiuno intermittente 16:8 - Donna', 1700, 100, 200, 60, 'Solo pranzo+cena+spuntino, no colazione'),
  ('a0000001-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000000', 'Mediterranea equilibrata - Uomo', 2200, 110, 275, 75, NULL),
  ('a0000001-0000-0000-0000-000000000006', '00000000-0000-0000-0000-000000000000', 'Mediterranea equilibrata - Donna', 1800, 90, 220, 65, NULL),
  ('a0000001-0000-0000-0000-000000000007', '00000000-0000-0000-0000-000000000000', 'Massa muscolare - Uomo', 2800, 180, 340, 90, NULL),
  ('a0000001-0000-0000-0000-000000000008', '00000000-0000-0000-0000-000000000000', 'Massa muscolare - Donna', 2200, 140, 260, 70, NULL),
  ('a0000001-0000-0000-0000-000000000009', '00000000-0000-0000-0000-000000000000', 'Dimagrimento moderato - Uomo', 1800, 120, 180, 65, NULL),
  ('a0000001-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-000000000000', 'Dimagrimento moderato - Donna', 1500, 100, 150, 55, NULL);

-- Seed meal breakdowns for each template
-- Ketogenica Uomo (2000 kcal)
INSERT INTO diet_plan_template_meals (template_id, meal_type, kcal_target, protein_g, carbs_g, fats_g) VALUES
  ('a0000001-0000-0000-0000-000000000001', 'colazione', 500, 30, 8, 40),
  ('a0000001-0000-0000-0000-000000000001', 'pranzo', 700, 45, 10, 55),
  ('a0000001-0000-0000-0000-000000000001', 'spuntino', 200, 10, 4, 15),
  ('a0000001-0000-0000-0000-000000000001', 'cena', 600, 40, 8, 45);

-- Ketogenica Donna (1600 kcal)
INSERT INTO diet_plan_template_meals (template_id, meal_type, kcal_target, protein_g, carbs_g, fats_g) VALUES
  ('a0000001-0000-0000-0000-000000000002', 'colazione', 400, 25, 6, 30),
  ('a0000001-0000-0000-0000-000000000002', 'pranzo', 550, 35, 8, 42),
  ('a0000001-0000-0000-0000-000000000002', 'spuntino', 150, 10, 3, 12),
  ('a0000001-0000-0000-0000-000000000002', 'cena', 500, 30, 8, 36);

-- Digiuno intermittente Uomo (2200 kcal - no colazione)
INSERT INTO diet_plan_template_meals (template_id, meal_type, kcal_target, protein_g, carbs_g, fats_g) VALUES
  ('a0000001-0000-0000-0000-000000000003', 'pranzo', 900, 55, 110, 30),
  ('a0000001-0000-0000-0000-000000000003', 'spuntino', 300, 15, 40, 10),
  ('a0000001-0000-0000-0000-000000000003', 'cena', 1000, 60, 110, 35);

-- Digiuno intermittente Donna (1700 kcal - no colazione)
INSERT INTO diet_plan_template_meals (template_id, meal_type, kcal_target, protein_g, carbs_g, fats_g) VALUES
  ('a0000001-0000-0000-0000-000000000004', 'pranzo', 700, 42, 85, 24),
  ('a0000001-0000-0000-0000-000000000004', 'spuntino', 200, 10, 30, 6),
  ('a0000001-0000-0000-0000-000000000004', 'cena', 800, 48, 85, 30);

-- Mediterranea Uomo (2200 kcal)
INSERT INTO diet_plan_template_meals (template_id, meal_type, kcal_target, protein_g, carbs_g, fats_g) VALUES
  ('a0000001-0000-0000-0000-000000000005', 'colazione', 450, 18, 60, 16),
  ('a0000001-0000-0000-0000-000000000005', 'pranzo', 750, 38, 95, 25),
  ('a0000001-0000-0000-0000-000000000005', 'spuntino', 250, 10, 35, 8),
  ('a0000001-0000-0000-0000-000000000005', 'cena', 750, 44, 85, 26);

-- Mediterranea Donna (1800 kcal)
INSERT INTO diet_plan_template_meals (template_id, meal_type, kcal_target, protein_g, carbs_g, fats_g) VALUES
  ('a0000001-0000-0000-0000-000000000006', 'colazione', 380, 15, 50, 14),
  ('a0000001-0000-0000-0000-000000000006', 'pranzo', 600, 30, 75, 22),
  ('a0000001-0000-0000-0000-000000000006', 'spuntino', 200, 8, 28, 7),
  ('a0000001-0000-0000-0000-000000000006', 'cena', 620, 37, 67, 22);

-- Massa muscolare Uomo (2800 kcal)
INSERT INTO diet_plan_template_meals (template_id, meal_type, kcal_target, protein_g, carbs_g, fats_g) VALUES
  ('a0000001-0000-0000-0000-000000000007', 'colazione', 600, 40, 75, 20),
  ('a0000001-0000-0000-0000-000000000007', 'pranzo', 900, 55, 110, 28),
  ('a0000001-0000-0000-0000-000000000007', 'spuntino', 400, 25, 50, 14),
  ('a0000001-0000-0000-0000-000000000007', 'cena', 900, 60, 105, 28);

-- Massa muscolare Donna (2200 kcal)
INSERT INTO diet_plan_template_meals (template_id, meal_type, kcal_target, protein_g, carbs_g, fats_g) VALUES
  ('a0000001-0000-0000-0000-000000000008', 'colazione', 480, 32, 58, 16),
  ('a0000001-0000-0000-0000-000000000008', 'pranzo', 720, 44, 85, 22),
  ('a0000001-0000-0000-0000-000000000008', 'spuntino', 300, 20, 38, 10),
  ('a0000001-0000-0000-0000-000000000008', 'cena', 700, 44, 79, 22);

-- Dimagrimento Uomo (1800 kcal)
INSERT INTO diet_plan_template_meals (template_id, meal_type, kcal_target, protein_g, carbs_g, fats_g) VALUES
  ('a0000001-0000-0000-0000-000000000009', 'colazione', 380, 25, 40, 14),
  ('a0000001-0000-0000-0000-000000000009', 'pranzo', 600, 40, 60, 22),
  ('a0000001-0000-0000-0000-000000000009', 'spuntino', 200, 15, 20, 7),
  ('a0000001-0000-0000-0000-000000000009', 'cena', 620, 40, 60, 22);

-- Dimagrimento Donna (1500 kcal)
INSERT INTO diet_plan_template_meals (template_id, meal_type, kcal_target, protein_g, carbs_g, fats_g) VALUES
  ('a0000001-0000-0000-0000-00000000000a', 'colazione', 320, 22, 32, 12),
  ('a0000001-0000-0000-0000-00000000000a', 'pranzo', 500, 32, 50, 18),
  ('a0000001-0000-0000-0000-00000000000a', 'spuntino', 180, 12, 18, 7),
  ('a0000001-0000-0000-0000-00000000000a', 'cena', 500, 34, 50, 18);
