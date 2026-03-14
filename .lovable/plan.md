

## Rimuovere la modifica calorie dai piani template (default)

I piani standard gratuiti sono predefiniti e non devono essere personalizzabili. La modifica calorie/macro è una funzionalità riservata al piano personalizzato (Plus).

### Modifiche — `src/pages/UserDietPage.tsx`

**Rimuovere il blocco "Modifica calorie (opzionale)"** da entrambi i dialog di conferma template:

1. **Dialog 1** (righe 1065-1075): Rimuovere il `<div>` con label, Input e nota "I macro verranno ricalcolati in proporzione"
2. **Dialog 2** (righe 1486-1496): Stesso blocco, rimuovere

**Semplificare la logica di conferma** in entrambi i `AlertDialogAction onClick`:
- Rimuovere il controllo `overrideKcal` e la logica di ricalcolo proporzionale
- Chiamare direttamente `saveTemplateAsPlan(confirmTemplate)` senza override

Lo state `confirmKcalOverride` può restare (usato altrove) oppure essere rimosso se non serve più.

