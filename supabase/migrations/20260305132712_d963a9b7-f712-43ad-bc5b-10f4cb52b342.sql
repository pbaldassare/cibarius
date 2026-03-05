
-- 1a. Add source/external_ref to food_templates
ALTER TABLE food_templates ADD COLUMN IF NOT EXISTS source text DEFAULT 'manual';
ALTER TABLE food_templates ADD COLUMN IF NOT EXISTS external_ref text;

-- 1b. Create dishes table
CREATE TABLE IF NOT EXISTS dishes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  canonical_name text,
  photo_example_url text,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE dishes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone reads dishes" ON dishes FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated inserts dishes" ON dishes FOR INSERT TO authenticated WITH CHECK (true);

-- 1c. Create dish_ingredients table
CREATE TABLE IF NOT EXISTS dish_ingredients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dish_id uuid REFERENCES dishes(id) ON DELETE CASCADE NOT NULL,
  ingredient_id uuid REFERENCES food_templates(id) ON DELETE CASCADE NOT NULL,
  grams_in_standard_portion numeric NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE dish_ingredients ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone reads dish_ingredients" ON dish_ingredients FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated inserts dish_ingredients" ON dish_ingredients FOR INSERT TO authenticated WITH CHECK (true);

-- 1d. Add photo_url and dish_name to meal_items
ALTER TABLE meal_items ADD COLUMN IF NOT EXISTS photo_url text;
ALTER TABLE meal_items ADD COLUMN IF NOT EXISTS dish_name text;
