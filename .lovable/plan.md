
# Inserimenti manuali separati + timeout ricerca

## Problema attuale

Quando un utente inserisce manualmente un prodotto (nome, valori, foto), questo viene salvato direttamente nella tabella condivisa `products`, inquinando il catalogo globale con dati non verificati. Inoltre la ricerca prodotti non ha un limite di tempo.

## Modifiche previste

### 1. Nuova tabella `product_submissions` (Supabase migration)

Creare una tabella per i prodotti inseriti manualmente, in attesa di approvazione admin:

```text
product_submissions
- id (uuid, PK)
- user_id (uuid, FK profiles)
- name (text)
- brand (text, nullable)
- image_url (text, nullable)
- calories_100g (numeric, nullable)
- macros_100g (jsonb, nullable)
- barcode (text, nullable)
- serving_size_g (numeric, nullable)
- status (text, default 'pending') -- pending | approved | rejected
- reviewed_by (uuid, nullable)
- reviewed_at (timestamptz, nullable)
- created_at (timestamptz, default now())
```

RLS: utenti possono inserire le proprie, admin possono leggere e aggiornare tutto.

### 2. Modificare il salvataggio manuale (`src/components/AddFoodFlow.tsx`)

Nel `handleSave`, quando `method === "manual"` e non esiste un `productId`:
- Invece di inserire in `products`, inserire in `product_submissions` con `status: 'pending'`
- Per l'inventory item, salvare con `product_id: null` e `custom_name` nel campo nome (o creare un product temporaneo con flag `pending_review: true`)
- In alternativa piu' semplice: inserire comunque in `products` ma con un campo `status: 'pending'` e filtrare i pending dalla ricerca globale

**Approccio scelto**: Usare la tabella `product_submissions` separata. Per l'inventory/meal, salvare con `custom_name` senza `product_id`, cosi' il prodotto e' nell'inventario dell'utente ma non nel catalogo condiviso.

### 3. Pagina admin per review (`src/pages/admin/AdminProductReviewPage.tsx`)

Nuova pagina admin accessibile da `/admin/product-review`:
- Lista dei `product_submissions` con status `pending`
- Per ogni submission: nome, brand, valori nutrizionali, immagine, utente che l'ha inserita
- Due azioni: "Approva" (crea il prodotto in `products` e aggiorna status) oppure "Rifiuta" (aggiorna status a rejected)
- Card nella dashboard admin con link a questa pagina + contatore pending

### 4. Timeout 60 secondi sulla ricerca (`src/components/AddFoodFlow.tsx`)

Nell'`useEffect` della ricerca (riga 188-222):
- Aggiungere un timer di 60 secondi con `setTimeout`
- Mostrare un countdown visivo (es. "Ricerca in corso... 45s")
- A 60 secondi: fermare la ricerca, mostrare un messaggio "La ricerca sta impiegando troppo. Vuoi interromperla?" con bottone "Interrompi ricerca"
- Se l'utente interrompe, mostrare i risultati parziali gia' trovati

### 5. Aggiornare il routing (`src/App.tsx`)

Aggiungere la rotta `/admin/product-review` con la nuova pagina.

---

## Riepilogo file coinvolti

- **Migration SQL**: nuova tabella `product_submissions` con RLS
- `src/components/AddFoodFlow.tsx`: salvataggio manuale separato + countdown 60s
- `src/pages/admin/AdminProductReviewPage.tsx`: nuova pagina review
- `src/pages/admin/AdminPage.tsx`: card con link alla review
- `src/App.tsx`: nuova rotta
- `src/integrations/supabase/types.ts`: aggiornamento tipi (dopo migration)
