

# Filtri inline a chip nella versione ristorante (InventoryList)

## Situazione attuale

- **ExpiryPage (utente)**: usa filtri inline a chip/pill sempre visibili — status tabs (Scaduti, In scadenza, Tutti), tipo (Prodotti, Prep), conservazione (Dispensa, Frigo, Congelatore) con icone
- **InventoryList (usato da ristorante e utente per prodotti)**: usa un bottone SlidersHorizontal che togla due Select dropdown nascosti

## Intervento

Sostituire nel componente `InventoryList.tsx` il sistema filtri attuale (bottone toggle + dropdown Select) con lo stesso pattern a chip inline usato in `ExpiryPage.tsx`:

1. **Status filter** — riga di pill buttons: `Scaduti | In scadenza | OK | Tutti` con conteggio e icone (`AlertCircle`, `Clock`, `Package`)
2. **Storage filter** — riga di pill buttons: `Tutti | Dispensa | Frigo | Congelatore` con icone (`Home`, `Refrigerator`, `Snowflake`)
3. Rimuovere il bottone `SlidersHorizontal` e lo state `showFilters`
4. I filtri saranno sempre visibili sopra la lista, sotto la barra di ricerca
5. Stile identico a ExpiryPage: `rounded-full`, colori `bg-primary/10 text-primary border-primary` quando attivo

## File coinvolti

| File | Modifica |
|------|----------|
| `src/components/InventoryList.tsx` | Sostituire filtri dropdown con chip inline |

Nessuna modifica al database o ad altri file.

