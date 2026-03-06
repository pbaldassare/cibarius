

# Piano: Profilo ristorante completo con ubicazione, immagine e social

## Stato attuale
- Tabella `restaurants`: solo `name`, `address`, `phone`, `owner_id`
- `RestaurantSettingsPage`: form basilare con 3 campi

## Cosa fare

### 1. Migrazione DB: aggiungere colonne a `restaurants`

```sql
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS description text;
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS website text;
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS instagram text;
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS facebook text;
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS image_url text;
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS latitude double precision;
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS longitude double precision;
```

### 2. Geocoding con Nominatim (OpenStreetMap, gratuito, no API key)

Quando il ristoratore inserisce/modifica l'indirizzo, un pulsante "Cerca ubicazione" chiama `https://nominatim.openstreetmap.org/search?q=...&format=json` per ottenere lat/lng. Nessuna API key necessaria.

L'immagine mappa viene generata con OpenStreetMap Static Map (tile URL) tramite un tag `<img>` che punta a un servizio tile gratuito, oppure un iframe embed di OpenStreetMap.

### 3. Upload immagine ristorante

Riuso del bucket `media` esistente. Upload file da telefono con `<input type="file" accept="image/*" capture="environment">`, salvataggio su Supabase Storage e URL in `restaurants.image_url`.

### 4. UI del `RestaurantSettingsPage`

Ricostruire la pagina con sezioni:

- **Immagine**: foto attività con upload da telefono + anteprima
- **Dati base**: nome, telefono, descrizione attività (textarea)
- **Ubicazione**: indirizzo (input) + pulsante "Cerca su mappa" + anteprima mappa (iframe OSM) + opzione inserimento manuale coordinate
- **Web e Social**: sito web, Instagram, Facebook (tutti opzionali)
- **Fornitori**: sezione esistente invariata

### 5. Aggiornare `useRestaurant` hook

Aggiungere i nuovi campi all'interfaccia `Restaurant`.

## File coinvolti

| File | Azione |
|------|----------|
| Migrazione SQL | ALTER TABLE restaurants + 7 colonne |
| `src/hooks/useRestaurant.ts` | Aggiornare interfaccia Restaurant |
| `src/pages/restaurant/RestaurantSettingsPage.tsx` | Ricostruire UI completa |

