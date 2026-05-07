## Diagnosi

I dati nel DB sono corretti: gli ultimi inserimenti hanno `storage_type` = `frigo` / `freezer` / `ambiente` come scelto, e `owner_user_id` valorizzato. Le pagine `/pantry` (Dispensa), `/freezer` (Congelatore) e `/products` (Tutti) usano `InventoryList` con il filtro corretto.

**Il vero problema è che dalla Home non c'è un entry point chiaro alle tre sezioni.** La sezione "🏠 La tua dispensa" ha un solo link "Apri dispensa" che porta a `/products` (tutti i prodotti), senza scorciatoie per Frigo / Congelatore / Dispensa. L'utente salva un prodotto in "Frigo" e poi non sa dove cliccare per vedere "il frigo".

Inoltre nemmeno la `BottomNav` utente espone Frigo/Congelatore/Dispensa.

## Modifiche

**File: `src/pages/Index.tsx` — sezione "La tua dispensa" (riga 632-662)**

Sostituire la singola CTA "Apri dispensa" con una griglia di 3 card cliccabili che mostrano il conteggio per conservazione:

```text
┌──────────┬──────────┬──────────┐
│  Frigo   │ Congel.  │ Dispensa │
│   12     │    3     │    8     │
└──────────┴──────────┴──────────┘
       (vedi tutti i prodotti →)
```

- Tap su "Frigo" → `/products?storage=frigo`
- Tap su "Congelatore" → `/freezer`
- Tap su "Dispensa" → `/pantry`
- Footer "Vedi tutti" → `/products`

I conteggi vengono calcolati da `items` già caricato in Home (filter per `storage_type`).

**File: `src/components/InventoryList.tsx`**

Leggere `?storage=` da `useSearchParams` per pre-impostare `storageFilter` quando si arriva da Home con query param.

**File: `src/components/AddFoodFlow.tsx` — toast post-salvataggio (riga 1027)**

Mostrare la conservazione effettiva nel toast con CTA "Apri":
- Da: `"Prodotto aggiunto al magazzino! ✓"`
- A: `` `Aggiunto in ${storageLabel}! ✓` `` con action button che naviga alla rispettiva pagina (`/pantry` / `/freezer` / `/products?storage=frigo`).

Sostituire anche "Magazzino" → "Prodotti" in:
- `ctaLabels.inventory` (riga 75)
- toggle "Salva anche in Magazzino" (riga ~2277)

### Cosa NON cambia

- Nessuna modifica DB, RLS o logica di salvataggio.
- Filtri `InventoryList` invariati, solo aggiunto supporto query param.

### Risultato

Dopo aver salvato un prodotto in "Frigo", l'utente vede subito un toast "Aggiunto in Frigo!" con bottone "Apri", e dalla Home ha tre card dirette per Frigo / Congelatore / Dispensa con i numeri reali.