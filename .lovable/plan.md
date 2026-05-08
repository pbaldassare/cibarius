## Etichette HACCP Preparazioni — Piano di implementazione

Nuova funzione lato ristorante (e supervisione admin) per creare, stampare e tracciare etichette HACCP di preparazioni/semilavorati con QR code e tracciabilità ingredienti + bolle/documenti. Nessuna modifica ai flussi user/nutrizionista.

### 1. Database (migration)

Nuove tabelle in `public`:

- **haccp_preparation_labels**: `id, restaurant_id, preparation_name, quantity, unit, production_date, expiration_date, conservation_type ('ambiente'|'frigo'|'freezer'|'sottovuoto'|'altro'), internal_lot_code (unique per restaurant), operator_user_id, operator_name, notes, allergens text[], qr_token (unique, default `gen_random_uuid()::text || random hex`), status ('draft'|'finalized'|'cancelled'), cancel_reason, created_by, created_at, updated_at, finalized_at`.
- **haccp_preparation_ingredients**: `id, preparation_label_id, pantry_item_id (nullable, ref inventory_items), ingredient_name, quantity_used, unit, source_lot_code, supplier_name, origin_document_id (nullable, ref haccp_documents), ingredient_expiration_date, created_at`.
- **haccp_documents** (gestione bolle/documenti fornitori): `id, restaurant_id, document_type ('bolla'|'fattura'|'ddt'|'altro'), supplier_name, document_number, document_date, file_url, photo_url, notes, created_by, created_at`.
- **haccp_preparation_documents**: `id, preparation_label_id, document_id`.
- **haccp_label_audit_log**: `id, preparation_label_id, action ('created'|'finalized'|'printed'|'reprinted'|'cancelled'|'modified'|'duplicated'), user_id, user_name, reason, metadata jsonb, created_at`.
- Sequenza per `internal_lot_code` di default formato `L-00001` (trigger genera se NULL, scope per ristorante).

RLS:
- `is_restaurant_accessible(restaurant_id)` per SELECT/INSERT/UPDATE/DELETE delle 5 tabelle (riusa funzione esistente).
- Admin via `current_user_is_admin()` SELECT su tutto.
- Trigger `validate_*` per enum-like campi (status, conservation_type, document_type, action).
- Trigger blocco UPDATE su label se `status = 'finalized'` (consenti solo cambio status a `cancelled` con reason, e UPDATE da admin? No — solo cancel).
- Trigger audit log automatico su INSERT/UPDATE.

**Storage**: nuovo bucket pubblico `haccp-documents` per foto/PDF bolle, con policy upload limitato a membri del ristorante.

**Edge function pubblica** `get-haccp-label?token=...` (verify_jwt=false): restituisce JSON tracciabilità per il QR pubblico, identificato solo da `qr_token`. Restituisce solo dati utili (no email operatore, no costi).

### 2. Frontend ristorante

Nuove pagine in `src/pages/restaurant/`:
- **RestaurantHaccpLabelsPage.tsx** (`/restaurant/haccp-labels`): elenco etichette con filtri (status, data, ricerca), tab "Attive / Annullate / Bozze", azioni rapide (visualizza, stampa, ristampa, duplica, annulla).
- **RestaurantHaccpLabelNewPage.tsx** (`/restaurant/haccp-labels/new`): form creazione in step:
  1. Dati preparazione (nome, quantità, unità, date, conservazione, lotto auto, allergeni, note).
  2. Ingredienti: selezione da dispensa (`inventory_items` del ristorante con auto-fill di lotto/scadenza/fornitore) + aggiunta manuale.
  3. Documenti: collegamento bolle esistenti o upload nuovo (foto/PDF).
  4. Anteprima etichetta + "Genera QR" + "Salva bozza" / "Finalizza e stampa".
- **RestaurantHaccpLabelDetailPage.tsx** (`/restaurant/haccp-labels/:id`): scheda completa, audit log, azioni.
- **RestaurantHaccpDocumentsPage.tsx** (`/restaurant/haccp-documents`): gestione base bolle/documenti (lista + upload).

Pubblica:
- **PublicHaccpLabelPage.tsx** (`/haccp/label/:token`, fuori da auth): scheda QR con dati preparazione, ingredienti tracciati, allergeni, documenti scaricabili, badge stato (valido/scaduto/ritirato).

Componenti riusabili:
- `HaccpLabelPrintView.tsx` (layout stampa, formati: piccola 60×40mm, media 100×60mm, A4 con griglia 3×8 etichette). Usa `window.print()` con CSS `@page` e `@media print`. Predisposizione formato termico via classe CSS futura.
- `HaccpLabelQrCode.tsx` usando libreria `qrcode` (già nel progetto? altrimenti aggiungere `qrcode.react`).
- `HaccpIngredientPicker.tsx` (autocomplete dispensa + manuale).
- `HaccpDocumentPicker.tsx` (lista esistenti + upload veloce).

Aggiornamenti navigazione:
- `RestaurantBottomNav` o menu HACCP: aggiungere voce "Etichette".
- `RestaurantPage` (home): card "Etichette HACCP" sotto i controlli HACCP.
- `RestaurantHaccpHistoryPage`: include anche le etichette create (sezione "Etichette stampate").

Regole UX:
- Etichetta `finalized` → form solo lettura, possibili: ristampa, duplica, annulla con motivo.
- Annullamento richiede motivo testuale.
- Duplica → crea nuova bozza precompilata con nuovo lotto.
- Audit log mostrato in fondo alla scheda.

### 3. Admin

Nuova pagina `src/pages/admin/AdminHaccpLabelsPage.tsx` (`/admin/haccp-labels`): elenco read-only filtrabile per ristorante, accesso scheda, audit log. Link aggiunto a `AdminLayout` sidebar.

### 4. QR & sicurezza

- `qr_token`: 32+ caratteri random (gen_random_bytes(24) → base64url) — non indovinabile.
- URL pubblico: `https://app.cibarius.online/haccp/label/{token}`.
- Edge function valida token, restituisce solo: nome preparazione, ristorante (nome+città), date, conservazione, lotto, operatore (solo nome), ingredienti (nome/qty/lotto/fornitore/scadenza), allergeni, note, documenti (file_url firmati), stato.
- Status calcolato server-side: `cancelled` → "Ritirato"; `expiration_date < today` → "Scaduto"; altrimenti "Valido".

### 5. Dipendenze

- `qrcode` (npm) per generazione QR client-side per stampa e per visualizzazione.

### 6. Test manuali

Flusso da verificare in preview:
1. Crea bozza → finalizza → QR generato → stampa → scheda QR pubblica accessibile.
2. Ingredienti da dispensa con auto-fill lotto/scadenza.
3. Upload bolla PDF + collegamento → visibile da QR.
4. Ristampa, duplica, annulla con motivo → audit log popolato.
5. Tentativo modifica dopo finalize bloccato.
6. Scheda admin read-only.
7. Etichetta scaduta → badge "Scaduto" su scheda QR.

### Note tecniche

- Riuso `is_restaurant_accessible`, `current_user_is_admin`, `validate_*` patterns.
- Salvataggio costi/dettagli sensibili NON esposti via QR pubblico.
- Stampa: CSS `@media print` + `@page size: ...` con classi per ogni formato.
- Compatibile con la memoria progetto (HACCP, demo seeding `[DEMO]` rispettato per future seed).