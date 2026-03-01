

# Riorganizzare il riepilogo prodotto: nutrienti visibili, storage/scadenza secondari

## Problema attuale

Nel riepilogo (summary) del flusso AddFoodFlow, i **dettagli nutrizionali** (calorie, proteine, carb, grassi) sono nascosti dietro il bottone "Dettagli" collapsibile. Invece i campi di **conservazione e scadenza** (che servono solo nel contesto inventario) sono subito visibili come chip. L'utente vuole il contrario: vedere prima i nutrienti e decidere poi dove conservare.

## Modifiche proposte

### File: `src/components/AddFoodFlow.tsx`

**1. Mostrare i nutrienti sempre visibili nel riepilogo**

Spostare la griglia nutrizionale (calorie, proteine, carb, grassi per 100g e per quantita') fuori dal collapsible "Dettagli" e posizionarla subito sotto la hero card del prodotto. I valori nutrizionali saranno sempre visibili senza bisogno di cliccare.

**2. Rendere storage/scadenza secondari**

I chip di conservazione (Frigo/Congelatore/Dispensa) e scadenza resteranno sotto i nutrienti, ma saranno meno prominenti -- mostrati solo nel contesto `inventory`/`preparation` come gia' avviene, ma dopo i nutrienti anziche' prima.

**3. Spostare i campi editabili (nome, brand, valori) nel collapsible**

Il bottone "Dettagli" conterra' solo i campi di modifica manuale (nome, brand, valori nutrizionali editabili), che servono raramente.

### Ordine finale nel riepilogo

```text
1. Hero card (immagine + nome + brand + kcal totali)
2. Compatibilita' dieta (se piano attivo)
3. NUTRIENTI VISIBILI: griglia 4 colonne (kcal, prot, carb, grassi) per 100g
4. Chip quantita'
5. Chip storage + scadenza (solo contesto inventory/preparation)
6. "Dettagli" collapsible (nome/brand/valori editabili)
7. CTA "Conferma e salva"
```

### Dettaglio tecnico

- Estrarre il blocco `computed.calories != null && computed.macros` (righe 1344-1365) dal `showDetails` e posizionarlo subito dopo la diet compatibility card (riga ~1076)
- Aggiungere anche una riga con i valori per 100g sotto la griglia (se `calories100g` disponibile)
- I chip di quantita'/storage/scadenza restano dopo i nutrienti
- Il collapsible "Dettagli" conterra' solo i campi Input editabili per nome, brand e nutrienti

### File coinvolti: 1
- `src/components/AddFoodFlow.tsx`

