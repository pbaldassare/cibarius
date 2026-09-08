-- Unifica i documenti del ristorante su haccp_documents.
--
-- Prima di questa migrazione esistevano due archivi paralleli e scollegati:
--   * restaurant_documents  -> tab "Bolle", bucket `media`, con OCR (extract-invoice)
--   * haccp_documents       -> "Documenti HACCP", bucket `haccp-documents`, senza OCR
-- Solo haccp_documents e' collegabile alle etichette
-- (haccp_preparation_documents, inventory_items.source_document_id), quindi per
-- avere il DDT in etichetta il ristoratore doveva ricaricare lo stesso file due volte.
--
-- haccp_documents diventa l'unico archivio. restaurant_documents NON viene
-- eliminata: le righe vengono copiate e la tabella resta come backup finche'
-- la migrazione non e' verificata in produzione.

-- 1) Colonne che mancavano a haccp_documents per assorbire le bolle
ALTER TABLE public.haccp_documents
  ADD COLUMN IF NOT EXISTS extracted_data jsonb,
  ADD COLUMN IF NOT EXISTS file_path text,
  ADD COLUMN IF NOT EXISTS storage_bucket text NOT NULL DEFAULT 'haccp-documents';

COMMENT ON COLUMN public.haccp_documents.extracted_data IS
  'Dati estratti dalla edge function extract-invoice (fornitore, n. documento, articoli, totali).';
COMMENT ON COLUMN public.haccp_documents.file_path IS
  'Path dentro storage_bucket, necessario per download e cancellazione del file.';
COMMENT ON COLUMN public.haccp_documents.storage_bucket IS
  'Bucket che contiene il file. Le righe migrate da restaurant_documents restano su `media`.';

-- 2) Copia delle righe esistenti, mantenendo lo stesso id.
--    Stesso id => migrazione ripetibile e riferimenti esterni preservati.
INSERT INTO public.haccp_documents (
  id, restaurant_id, document_type, document_number, document_date,
  supplier_name, file_url, file_path, storage_bucket, extracted_data, notes, created_at
)
SELECT
  rd.id,
  rd.restaurant_id,
  COALESCE(rd.doc_type, 'bolla'),
  rd.extracted_data ->> 'document_number',
  COALESCE(
    rd.doc_date,
    CASE
      WHEN rd.extracted_data ->> 'document_date' ~ '^\d{4}-\d{2}-\d{2}$'
      THEN (rd.extracted_data ->> 'document_date')::date
    END
  ),
  COALESCE(rd.supplier_name, rd.extracted_data ->> 'supplier_name'),
  rd.public_url,
  rd.file_path,
  'media',
  rd.extracted_data,
  rd.extracted_data ->> 'notes',
  rd.created_at
FROM public.restaurant_documents rd
ON CONFLICT (id) DO NOTHING;

-- 3) Indice per la lista documenti (ordinata per data di caricamento)
CREATE INDEX IF NOT EXISTS haccp_documents_restaurant_created_idx
  ON public.haccp_documents (restaurant_id, created_at DESC);
