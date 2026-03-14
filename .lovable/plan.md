

## Semplificare la sezione "Condividi Cibarius"

Mantenere solo il bottone "Condividi" (Web Share API) e rimuovere tutto il resto: link copiabile, WhatsApp, Telegram, X, Email.

### Modifiche — `src/pages/ProfiloPage.tsx`

**Righe 552-627**: Sostituire l'intera sezione con una versione minimale:
- Mantenere il contenitore con gradient e titolo
- Rimuovere il blocco link + copia (righe 562-575)
- Rimuovere i bottoni WhatsApp, Telegram, X, Email (righe 593-624)
- Tenere solo il bottone "Condividi" con `navigator.share` (righe 577-591)
- Se `navigator.share` non è disponibile, mostrare un fallback con copia link

