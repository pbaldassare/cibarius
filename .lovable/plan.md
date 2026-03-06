

# Piano: Nascondere sezione nutrizionista per ristoratori

## Problema
La pagina Profilo (`ProfiloPage.tsx`) è condivisa tra più ruoli. La sezione "Il tuo nutrizionista" / "Collega un nutrizionista" è visibile a tutti tranne i `professional`, ma non ha senso nemmeno per i `restaurant_owner`.

## Soluzione
Modificare la condizione a riga 469 di `src/pages/ProfiloPage.tsx`:

**Da:** `role !== "professional"`
**A:** `role !== "professional" && role !== "restaurant_owner" && role !== "supplier"`

Questo nasconde il blocco nutrizionista per ristoratori e fornitori, lasciandolo visibile solo per gli utenti consumer (`user`).

## File coinvolti
| File | Modifica |
|------|----------|
| `src/pages/ProfiloPage.tsx` | Aggiornare condizione di visibilità sezione nutrizionista (riga 469) |

