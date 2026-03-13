INSERT INTO public.manual_subscription_overrides (user_id, role_type, override_type, reason, start_date, end_date)
VALUES 
  ('ba300bba-a56b-4cc0-9e48-24aed9bd4189', 'user_plus', 'free_access', 'Test user - auto Plus', now(), null),
  ('718a977f-1742-40bc-9960-c61a876e1d93', 'user_plus', 'free_access', 'Test user - auto Plus', now(), null)
ON CONFLICT DO NOTHING;