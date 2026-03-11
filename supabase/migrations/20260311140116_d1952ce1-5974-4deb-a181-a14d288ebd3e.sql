
-- Meal reminder preferences table
CREATE TABLE public.meal_reminder_settings (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  enabled boolean NOT NULL DEFAULT true,
  colazione_time time NOT NULL DEFAULT '08:00',
  pranzo_time time NOT NULL DEFAULT '13:00',
  cena_time time NOT NULL DEFAULT '20:00',
  colazione_enabled boolean NOT NULL DEFAULT true,
  pranzo_enabled boolean NOT NULL DEFAULT true,
  cena_enabled boolean NOT NULL DEFAULT true,
  push_subscription jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.meal_reminder_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own reminder settings"
  ON public.meal_reminder_settings
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
