

# Filtri inline e cambio conservazione

## 1. Aggiungere cambio conservazione nell'action sheet

Quando si seleziona un elemento, l'action sheet mostrera' un selettore per cambiare il tipo di conservazione (Frigo / Congelatore / Dispensa). Tre bottoni inline sotto i dettagli nutrizionali, prima delle azioni. Al tap, aggiorna `storage_type` su `inventory_items` o `preparations` e ricarica la lista.

### File: `src/pages/ExpiryPage.tsx`
- Nell'action sheet (riga ~584), aggiungere una riga con 3 bottoni per Frigo/Congelatore/Dispensa
- Il bottone corrispondente allo storage attuale sara' evidenziato (bg-primary)
- Al click: `supabase.from("inventory_items").update({ storage_type }).eq("id", item.id)` (o `preparations`), poi toast + fetchItems
- Aggiungere `handleChangeStorage(item, newStorage)` come handler

## 2. Sostituire il popup filtri con dropdown inline

Rimuovere il bottone filtro con icona e il bottom Sheet dei filtri. Al suo posto, sotto la barra di ricerca, mostrare due righe di bottoni (chip) sempre visibili:

**Riga 1 - Tipo**: Tutto | Prodotti | Preparazioni
**Riga 2 - Conservazione**: Tutti | Dispensa | Frigo | Congelatore

Stile: chip piccoli simili ai tab di stato gia' esistenti, con il chip attivo in primary.

### File: `src/pages/ExpiryPage.tsx`
- Rimuovere stato `filterSheetOpen` e il componente `Sheet` dei filtri (righe 505-576)
- Rimuovere il bottone con icona `SlidersHorizontal` (righe 356-364)
- Rimuovere `activeFilterCount`
- Aggiungere sotto SearchBar due righe di chip per tipo e conservazione
- Ogni chip funziona come i tab di stato: click per attivare, evidenziato se selezionato

### Dettaglio tecnico UI dei filtri inline

```
{/* Filtri inline */}
<div className="flex gap-1.5 overflow-x-auto no-scrollbar">
  {[{key:"all",label:"Tutto"},{key:"product",label:"Prodotti"},{key:"preparation",label:"Prep"}].map(...)}
</div>
<div className="flex gap-1.5 overflow-x-auto no-scrollbar">
  {[{key:"all",label:"Tutti"},{key:"ambiente",label:"Dispensa"},{key:"frigo",label:"Frigo"},{key:"freezer",label:"Congelatore"}].map(...)}
</div>
```

Stile chip: `rounded-full px-3 py-1 text-[12px] font-medium`, attivo `bg-primary/10 text-primary border-primary`, inattivo `bg-card border-border text-muted-foreground`.

## Riepilogo

- 1 file modificato: `src/pages/ExpiryPage.tsx`
- Rimozione: Sheet filtri popup + bottone SlidersHorizontal
- Aggiunta: chip filtri inline sotto search + selettore storage nell'action sheet

