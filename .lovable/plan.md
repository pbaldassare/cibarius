

## Aggiunta step finali al tour + chiusura automatica

### Modifiche

**`src/components/AppTourContext.tsx`** — Aggiungere 2 nuovi step prima del finale e migliorare lo step finale:

1. **"Condividi con gli amici 🤝"** — step che punta al profilo (selector `nav-profile`), invita a condividere Cibarius con amici dal profilo
2. **"Fatti seguire da un nutrizionista 👨‍⚕️"** — step che spiega che possono collegarsi a un professionista per avere piani personalizzati
3. **Step finale aggiornato** — messaggio di ringraziamento: "Grazie per la tua attenzione! Ora sei pronto per usare Cibarius al meglio." con navigazione a `/` 

**`src/components/AppTour.tsx`** — Quando il tour finisce (ultimo step completato), chiamare `stopTour()` e navigare a `/` automaticamente, assicurandosi che overlay e tooltip vengano rimossi.

### Step aggiunti (prima del finale attuale)

```
// Dopo "Il tuo Profilo ⚙️" e prima del finale:

{
  selector: "nav-profile",
  title: "Condividi Cibarius con gli amici 🤝",
  description: "Ti piace Cibarius? Dal profilo puoi condividere l'app con amici e famiglia via WhatsApp, Telegram e altri canali!",
  page: "/",
  action: { type: "navigate", target: "/", delay: 400 },
},
{
  selector: "nav-plan",
  title: "Fatti seguire da un nutrizionista 👨‍⚕️",
  description: "Collega il tuo account a un nutrizionista professionista per ricevere piani alimentari personalizzati e monitoraggio dedicato.",
  page: "/",
},

// Finale aggiornato:
{
  selector: "home-greeting",
  title: "Grazie per la tua attenzione! 🎊",
  description: "Ora conosci tutte le funzionalità di Cibarius. Inizia aggiungendo i tuoi primi prodotti e scopri quanto è facile mangiare meglio. Buon appetito! 🍽️",
  page: "/",
  action: { type: "navigate", target: "/", delay: 400 },
}
```

### File modificati
| File | Modifica |
|------|----------|
| `src/components/AppTourContext.tsx` | Aggiungere 2 step (condivisione + nutrizionista), aggiornare testo finale |
| `src/components/AppTour.tsx` | Assicurare che a fine tour si chiuda e torni a `/` |

