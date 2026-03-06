

# Piano: Blocco salvataggio senza macronutrienti (solo utente)

## Problema
Quando l'AI o il barcode non trovano i dati nutrizionali, l'utente può salvare un prodotto senza calorie/macro. Questo rende inutili il tracking pasti e il monitoraggio dietetico.

## Soluzione
Nel step `summary`, se `calories100g` e' null e il contesto NON e' ristorante (`!defaultRestaurantId`), mostrare un banner con 3 alternative al posto del pulsante "Conferma e salva":

1. **Rifai la foto** - torna allo step `photo_ai` con le foto resettate, suggerendo di inquadrare la tabella nutrizionale
2. **Cerca prodotti simili** - passa allo step `search` pre-compilando la query col nome del prodotto gia' rilevato
3. **Inserisci a mano** - espande direttamente la sezione "Dettagli" con focus sui campi nutrizionali

Una volta che l'utente compila i macro (anche manualmente), il banner sparisce e il pulsante "Conferma e salva" riappare.

## File coinvolti

| File | Modifica |
|------|----------|
| `src/components/AddFoodFlow.tsx` | Aggiungere banner "Dati nutrizionali mancanti" con 3 CTA nel summary step; disabilitare il bottone salva se mancano macro e non e' ristorante |

## Dettaglio tecnico

Nel summary step (~linea 1108), subito dopo il product hero card, aggiungere:

```tsx
{/* Missing nutrition banner - only for regular users */}
{calories100g == null && !defaultRestaurantId && (
  <div className="rounded-2xl border-2 border-amber-300 bg-amber-50 p-4 space-y-3">
    <div className="flex items-center gap-2">
      <AlertTriangle className="h-5 w-5 text-amber-600" />
      <p className="text-sm font-semibold text-amber-800">
        Dati nutrizionali mancanti
      </p>
    </div>
    <p className="text-xs text-amber-700">
      Per salvare questo prodotto servono almeno le calorie. Scegli come procedere:
    </p>
    {/* 3 buttons: retake photo, search similar, enter manually */}
  </div>
)}
```

Il pulsante "Conferma e salva" in fondo: aggiungere `disabled` se `calories100g == null && !defaultRestaurantId`.

Quando l'utente sceglie "Cerca prodotti simili", pre-popola `query` con il `name` corrente e torna a step `search`.
Quando sceglie "Inserisci a mano", imposta `showDetails = true` e fa scroll ai campi nutrizionali.
Quando sceglie "Rifai la foto", resetta `aiPhotos` e torna a step `photo_ai`.

