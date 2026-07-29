-- Disconnect test nutritionist links from consumer users.
-- Pro suite remains intact; consumer app no longer uses these links.

UPDATE public.client_links
SET status = 'revoked', updated_at = now()
WHERE status = 'active';

UPDATE public.user_nutritionist_links
SET is_active = false, updated_at = now()
WHERE is_active = true;

UPDATE public.professional_link_requests
SET status = 'rejected', updated_at = now()
WHERE status = 'pending';

-- Deactivate consumer-facing diet plans (pro can recreate for clients later)
UPDATE public.diet_plans
SET is_active = false, updated_at = now()
WHERE is_active = true;
