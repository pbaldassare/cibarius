

# Prodotti urgenti: miniature immagini + modifica diretta dalla Home

## Cosa cambia

### 1. Miniature immagini sempre presenti nella lista Urgenti

Ogni elemento urgente nella Home mostrera' una miniatura quadrata (40x40px) a sinistra. La priorita' per la scelta dell'immagine sara':

```text
1. Immagine caricata dall'utente o trovata dall'AI (image_url del prodotto)
2. Emoji/icona standard basata sulla categoria del prodotto
3. Icona generica Package come ultimo fallback
```

Per le categorie standard verra' creata una mappa di emoji (es. latticini -> "🧀", carne -> "🥩", frutta -> "🍎", verdura -> "🥬", bevande -> "🥤", pane -> "🍞", pesce -> "🐟", surgelati -> "🧊", condimenti -> "🫒", dolci -> "🍫", cereali -> "🌾", uova -> "🥚"). Questa mappa verra' usata come fallback quando non c'e' un'immagine reale.

### 2. Modifica diretta dal tap sull'elemento urgente

Toccando un elemento urgente si aprira' un dialog/sheet inline con:
- Immagine del prodotto (se presente)
- Nome, quantita', storage, scadenza
- Possibilita' di modificare quantita', storage e scadenza
- Bottoni "Salva" e "Elimina"

Questo evita di dover navigare alla pagina scadenze per modificare un singolo prodotto.

### 3. Query aggiornata per includere category

La query `fetchItems` su `inventory_items` includera' anche `category` dal prodotto per poter scegliere l'emoji corretta come fallback.

## Dettagli tecnici

### File: `src/lib/food-images.ts` (nuovo)

Utility con:
- Mappa `categoryEmoji: Record<string, string>` per le categorie principali
- Funzione `getFoodEmoji(category: string | null): string` che restituisce l'emoji o "📦" come default
- Funzione `getFoodImageUrl(imageUrl: string | null, category: string | null): { type: "image" | "emoji"; value: string }` che ritorna l'immagine URL o l'emoji di fallback

### File: `src/pages/Index.tsx`

**Query**: aggiungere `category` alla select dei prodotti: `product:products(name, image_url, category)`

**Tipo UrgentItem**: aggiungere `image_url: string | null` e `category: string | null`

**Urgent list rendering**: aggiungere miniatura 40x40 prima del testo:
- Se `image_url` presente: `<img>` con `object-cover` e bordi arrotondati
- Altrimenti: emoji dalla categoria in un cerchio colorato

**Tap handler**: al click sull'elemento urgente, aprire un dialog di modifica rapida con campi per quantita', storage e scadenza. Salvataggio diretto su `inventory_items` o `preparations`.

**Nuovo stato**: `editingUrgent` per tracciare quale elemento e' in modifica, con i campi editabili.

### File coinvolti: 2
- `src/lib/food-images.ts` (nuovo) -- mappa emoji categorie + helper
- `src/pages/Index.tsx` -- miniature + dialog modifica rapida

