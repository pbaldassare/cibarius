

# Piano: Semplificare la pagina Piano per utenti senza nutrizionista

## Problema
L'utente senza coach collegato vede sezioni inutili: Obiettivo di oggi, Consiglio di oggi, Genera ricette smart, Lista spesa, Chat coach, Misurazioni, Posologia per pasto, Ricette consigliate. Queste servono solo a chi ha un nutrizionista.

## Soluzione

### File: `src/pages/UserDietPage.tsx`

Nella vista con piano attivo (riga 850-1192), wrappare in `!isSelfPlan` le seguenti sezioni per mostrarle solo quando c'è un coach collegato:

| Sezione | Righe | Condizione |
|---------|-------|------------|
| Today's Progress (Obiettivo di oggi) | 897-941 | `!isSelfPlan` |
| Daily Insight (Consiglio di oggi) | 943-954 | `!isSelfPlan` |
| Smart Recipes CTA | 956-968 | `!isSelfPlan` |
| Next Appointment | 970-988 | `!isSelfPlan` |
| Quick Actions (Lista spesa, Chat, Misurazioni) | 990-1010 | `!isSelfPlan` |
| Meal Targets (Posologia per pasto) | 1012-1082 | `!isSelfPlan` |
| Suggestions (Ricette consigliate) | 1135-1189 | `!isSelfPlan` |

La sezione **"Esplora altri piani"** (1084-1133) resta sempre visibile, ed e' l'unico contenuto per chi ha un self-plan (oltre alla card "Piano personale" e il pulsante Modifica/Collega coach).

Risultato per utente senza coach: vede solo la card "Piano personale" + la galleria template per cambiare piano.

