-- Re-activate the existing client link between test user and test nutritionist
UPDATE client_links SET status = 'active', activated_at = now() WHERE id = '81c56687-74dc-4804-9bca-f9779f0adce3';