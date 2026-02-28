

# Default scadenza a 3 giorni

Problema: quando si salva un prodotto (barcode, ricerca, foto), la scadenza puo' rimanere vuota. L'utente vuole che ci sia sempre una scadenza, con default a +3 giorni.

---

## Modifica

### File: `src/components/AddFoodFlow.tsx`

1. **Importare `addDays` e `format` da `date-fns`** (gia' installato nel progetto)

2. **Creare helper per il default**: `format(addDays(new Date(), 3), "yyyy-MM-dd")` 

3. **Cambiare il valore iniziale di `expiryDate`**: da `""` a `format(addDays(new Date(), 3), "yyyy-MM-dd")` (riga 116)

4. **Aggiornare il reset** (riga 167): stesso valore default invece di `""`

5. **Rimuovere il fallback a `null`** nelle righe di salvataggio (righe 583 e 644): usare sempre `expiryDate` direttamente, dato che sara' sempre valorizzato

L'utente potra' comunque modificare la data tramite il chip "Scadenza" nello step summary, ma partira' sempre con un valore precompilato.

---

## File coinvolti

### Modificato (1)
- `src/components/AddFoodFlow.tsx` -- default expiryDate a +3 giorni, aggiornamento reset e salvataggio

