
ALTER TABLE inventory_items ADD COLUMN IF NOT EXISTS lot_number text;
ALTER TABLE inventory_items ADD COLUMN IF NOT EXISTS chef_life_hours integer;
ALTER TABLE inventory_items ADD COLUMN IF NOT EXISTS production_date date;

ALTER TABLE preparations ADD COLUMN IF NOT EXISTS lot_number text;
ALTER TABLE preparations ADD COLUMN IF NOT EXISTS chef_life_hours integer;
ALTER TABLE preparations ADD COLUMN IF NOT EXISTS production_date date;
