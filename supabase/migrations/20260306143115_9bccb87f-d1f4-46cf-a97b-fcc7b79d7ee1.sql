
ALTER TABLE public.restaurants ADD COLUMN IF NOT EXISTS description text;
ALTER TABLE public.restaurants ADD COLUMN IF NOT EXISTS website text;
ALTER TABLE public.restaurants ADD COLUMN IF NOT EXISTS instagram text;
ALTER TABLE public.restaurants ADD COLUMN IF NOT EXISTS facebook text;
ALTER TABLE public.restaurants ADD COLUMN IF NOT EXISTS image_url text;
ALTER TABLE public.restaurants ADD COLUMN IF NOT EXISTS latitude double precision;
ALTER TABLE public.restaurants ADD COLUMN IF NOT EXISTS longitude double precision;
