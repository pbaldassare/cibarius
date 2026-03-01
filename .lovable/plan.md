
# Miglioramenti pagina Scadenze e database prodotti condiviso

## 1. Rimuovere tab "Senza data"

Dato che ora tutti i prodotti hanno sempre una scadenza di default (+3 giorni), la tab "Senza data" non serve piu'. Verra' rimossa dall'array `statusTabs` e dal conteggio.

## 2. Aggiungere barra di ricerca rapida

Sotto le tab di stato (Scaduti / In scadenza / Tutti), aggiungere un campo di ricerca testuale per filtrare velocemente i prodotti per nome. Il filtro sara' locale (lato client) sulla lista gia' caricata.

## 3. Mostrare dettagli nutrizionali nell'action sheet

Quando si seleziona un elemento, l'action sheet (bottom sheet) mostrera' anche:
- Calorie totali e per 100g
- Macronutrienti (proteine, carboidrati, grassi)
- Brand del prodotto
- Data di scadenza
- Tipo di conservazione e quantita'

Per ottenere questi dati, la query di fetch verra' ampliata per includere i campi nutrizionali da `products` (`calories_100g`, `macros_100g`, `brand`) e da `inventory_items` (`calories_total`, `macros_total`).

## 4. Prodotti sempre salvati nel database condiviso

Questo e' gia' implementato: quando un utente aggiunge un prodotto tramite barcode, ricerca o foto, il prodotto viene salvato nella tabella `products` che e' visibile a tutti gli utenti autenticati (le RLS policy lo permettono gia' in SELECT e INSERT). La ricerca locale in `search-food.ts` cerca gia' nella tabella `products`. 

Nessuna modifica al database necessaria: la tabella `products` funziona gia' come catalogo condiviso.

---

## Dettagli tecnici

### File: `src/pages/ExpiryPage.tsx`

**Modifiche all'interfaccia ExpiryItem**: aggiungere campi nutrizionali:
- `calories_100g`, `protein_100g`, `carbs_100g`, `fats_100g` (da products)
- `calories_total`, `macros_total` (da inventory_items)
- `brand` (da products)

**Rimuovere tab "Senza data"**: eliminare l'entry `nodate` da `statusTabs` (riga 58)

**Aggiungere stato `searchQuery`**: campo di ricerca locale sotto le tab. Filtrare `filtered` anche per `item.name.toLowerCase().includes(searchQuery)`

**Ampliare la query fetch**: 
- `products(name, image_url, brand, calories_100g, macros_100g)`
- Includere `calories_total, macros_total` da inventory_items

**Arricchire l'action sheet**: sotto il nome del prodotto, mostrare una sezione con le informazioni nutrizionali (calorie, proteine, carb, grassi) e le info di conservazione, prima dei pulsanti di azione.

### File coinvolti (1)
- `src/pages/ExpiryPage.tsx`
