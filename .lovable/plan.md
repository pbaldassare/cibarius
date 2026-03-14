

## Tour più veloce

### Situazione attuale
- `AUTO_ADVANCE_MIN = 4000` ms (minimo 4 secondi per step)
- `MS_PER_CHAR = 40` ms per carattere
- 27 step totali → durata attuale stimata: **~2 minuti**

### Modifica
Riduco i tempi a:
- `AUTO_ADVANCE_MIN = 2500` ms (2.5 secondi minimo)
- `MS_PER_CHAR = 25` ms per carattere

**Nuova durata stimata: ~1 minuto e 10 secondi** per tutto il tour.

### File modificato
`src/components/AppTour.tsx` — solo le due costanti alla riga 6-7.

