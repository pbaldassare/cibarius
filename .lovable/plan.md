

# Piano: Aggiornare la barra di navigazione utente

## Problema
"Aggiungi" nella nav è un doppione del FAB (+) già presente. Manca l'accesso rapido ai piani alimentari.

## Modifiche

### Nuovi tab utente (5 tab)
| Posizione | Attuale | Nuovo |
|-----------|---------|-------|
| 1 | Home `/` | Home `/` (invariato) |
| 2 | Aggiungi `/scan` | Scadenze `/expiry` |
| 3 | Scadenze `/expiry` | Piano `/diet` |
| 4 | Pasti `/meals` | Pasti `/meals` |
| 5 | Profilo `/profile` | Profilo `/profile` |

Icona per "Piano": `ClipboardList` (lucide)

### File coinvolti

| File | Modifica |
|------|----------|
| `src/components/UserBottomNav.tsx` | Aggiornare array `tabs`: rimuovere Aggiungi, spostare Scadenze al 2° posto, aggiungere Piano al 3° |
| `src/components/BottomNav.tsx` | Aggiornare array `tabsByRole.user` con la stessa struttura |

