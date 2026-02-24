UPDATE auth.users SET email_confirmed_at = now() WHERE email = 'cibarius@admin.it' AND email_confirmed_at IS NULL;
UPDATE public.profiles SET role = 'admin' WHERE email = 'cibarius@admin.it';