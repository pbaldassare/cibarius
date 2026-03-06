

# Piano: Riordinare e ottimizzare la bottom nav a 6 tab

## Problema
- Manca il tab "Scadenze" (rimosso per errore)
- L'ordine attuale è sbagliato
- 6 tab non entrano con la spaziatura attuale
- "Pasti" e "Progressi" devono essere disabilitati se non c'è un piano attivo

## Modifiche

### `src/components/UserBottomNav.tsx`

1. **Ordine tab**: Home → Scadenze → Piano → Pasti → Progressi → Profilo
2. **6 tab in una riga**: ridurre icone a `size={18}`, testo a `text-[9px]`, padding `px-1`, rimuovere il wrapper `rounded-xl px-3` attorno all'icona, ridurre altezza nav a `h-[64px]`
3. **Controllo piano attivo**: aggiungere un `useEffect` che fa una query a `diet_plans` per verificare se l'utente ha un piano attivo (`status = 'active'`). Se non c'è, i tab "Pasti" e "Progressi" vengono renderizzati come `<div>` disabilitati (opacità ridotta, no click) invece di `<NavLink>`
4. **Icone**: `Home`, `AlertTriangle` (Scadenze), `ClipboardList` (Piano), `UtensilsCrossed` (Pasti), `TrendingUp` (Progressi), `User` (Profilo)

