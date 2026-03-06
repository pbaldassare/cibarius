

# Piano: Rendere visibili le icone Info su ogni template

## Problema
Le icone Info (i) esistono nel codice ma sono troppo piccole (16px) e poco visibili nelle card dei template. L'utente non riesce a vederle.

## Modifiche su `src/pages/UserDietPage.tsx`

### Rendere l'icona Info prominente su ogni card template

1. **Spostare l'icona Info** fuori dalla riga del titolo e metterla come pulsante dedicato ben visibile, ad esempio in basso a destra della card o come pulsante con testo "Info" accanto al badge kcal
2. **Ingrandire l'icona** da `h-4 w-4` a `h-5 w-5` e aggiungere uno sfondo colorato (`bg-primary/10 text-primary rounded-full p-1`) per renderla immediatamente riconoscibile
3. **Rimuovere il controllo condizionale** `getTemplateInfo(tmpl.title) &&` — ogni template deve avere l'icona. Aggiungere una descrizione generica di fallback per i template che non matchano le keyword
4. **Fallback nel `getTemplateInfo`**: restituire un testo generico se nessuna keyword matcha, così tutti i piani hanno la (i)

### Risultato visivo atteso
Ogni card avrà un cerchio azzurro con la "i" ben visibile accanto al badge kcal, cliccabile per aprire il dialog con le informazioni dettagliate del piano.

