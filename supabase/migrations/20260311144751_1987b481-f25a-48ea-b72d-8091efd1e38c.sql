
-- Backfill coupon for existing professionals who don't have one
INSERT INTO public.nutritionist_coupons (nutritionist_user_id, coupon_code)
SELECT p.id, 
  UPPER(LEFT(REGEXP_REPLACE(COALESCE(NULLIF(SPLIT_PART(p.full_name, ' ', 1), ''), 'PRO'), '[^A-Za-z0-9]', '', 'g'), 8)) 
  || UPPER(SUBSTR(MD5(random()::text), 1, 3))
FROM profiles p
LEFT JOIN nutritionist_coupons nc ON nc.nutritionist_user_id = p.id
WHERE p.role = 'professional' AND nc.id IS NULL;
