-- Token del QR in base64 url-safe.
--
-- Il valore predefinito era encode(gen_random_bytes(24), 'base64'), e
-- l'alfabeto base64 standard comprende '+' e '/'. La barra spezza
-- l'indirizzo del QR, /haccp/label/<token>, in piu' segmenti: su 32 caratteri
-- capita a circa quattro token su dieci. Qui si usa l'alfabeto url-safe, dove
-- '+' e '/' diventano '-' e '_'.
--
-- I token gia' assegnati restano come sono, cosi' le etichette gia' stampate
-- continuano a puntare a qualcosa di esistente: a raccoglierli ci pensa il
-- segmento jolly della rotta.

ALTER TABLE public.haccp_preparation_labels
  ALTER COLUMN qr_token
  SET DEFAULT translate(encode(gen_random_bytes(24), 'base64'), '+/', '-_');
