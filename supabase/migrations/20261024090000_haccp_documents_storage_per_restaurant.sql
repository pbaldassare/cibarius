-- Nel bucket haccp-documents (bolle, DDT) qualunque utente autenticato poteva
-- caricare, sovrascrivere e cancellare i file di ogni ristorante, e chiunque
-- poteva elencarli. Ora serve accesso al ristorante della prima cartella del
-- percorso (`<restaurant_id>/...`), come per haccp-photos.
-- Il bucket resta pubblico: gli URL diretti servono alla pagina dell'etichetta
-- aperta dal QR e all'estrazione AI delle bolle, e non passano da queste policy.
DROP POLICY IF EXISTS "haccp docs public read" ON storage.objects;
DROP POLICY IF EXISTS "haccp docs auth upload" ON storage.objects;
DROP POLICY IF EXISTS "haccp docs auth update" ON storage.objects;
DROP POLICY IF EXISTS "haccp docs auth delete" ON storage.objects;

CREATE POLICY "Restaurant manages HACCP documents" ON storage.objects
  FOR ALL TO authenticated
  USING (
    bucket_id = 'haccp-documents' AND
    CASE WHEN (storage.foldername(name))[1] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
      THEN public.is_restaurant_accessible(((storage.foldername(name))[1])::uuid)
      ELSE public.current_user_is_admin()
    END
  )
  WITH CHECK (
    bucket_id = 'haccp-documents' AND
    CASE WHEN (storage.foldername(name))[1] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
      THEN public.is_restaurant_accessible(((storage.foldername(name))[1])::uuid)
      ELSE public.current_user_is_admin()
    END
  );
