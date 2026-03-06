

# Piano: Pulizia pagina Pasti e info sui template

## Modifiche

### 1. `src/pages/PastiPage.tsx` — Rimuovere pulsanti inutili
- **Rimuovere** il pulsante `ClipboardList` (riga 178-183) che porta a `/diet`
- **Rimuovere** il pulsante `Target` (riga 184-189) che porta a `/meals/targets`
- **Rimuovere** il "Vedi →" dalla card del piano nutrizionale (riga 218) e rendere la card non cliccabile (da `<button>` a `<div>`)

### 2. `src/pages/UserDietPage.tsx` — Aggiungere icona info su ogni template
- Aggiungere un pulsante `Info` (icona `i` cerchiata) su ogni card template (righe 544-568)
- Al click apre un `Dialog` con una descrizione completa del piano: per chi è adatto, obiettivi, benefici, controindicazioni
- Le descrizioni sono hardcoded in un oggetto `TEMPLATE_INFO` mappato per keyword nel titolo (mediterranea, keto, digiuno, massa, dimagrimento)
- Testi scritti in linguaggio semplice e accessibile, ma completi

### Esempio descrizioni template

```typescript
const TEMPLATE_INFO: Record<string, { target: string; goals: string; description: string }> = {
  mediterranea: {
    target: "Adatto a tutti, perfetto per chi vuole mangiare sano senza rinunce",
    goals: "Mantenere il peso, migliorare la salute del cuore, avere più energia",
    description: "La dieta mediterranea si basa su cereali integrali, frutta, verdura, pesce e olio d'oliva. È equilibrata e facile da seguire ogni giorno."
  },
  keto: {
    target: "Per chi vuole perdere grasso velocemente e ha disciplina",
    goals: "Bruciare grassi, ridurre la fame, migliorare la concentrazione",
    description: "La dieta keto riduce molto i carboidrati e aumenta i grassi buoni. Il corpo usa i grassi come energia principale. Richiede attenzione e costanza."
  },
  // ... etc
};
```

### File coinvolti

| File | Azione |
|---|---|
| `src/pages/PastiPage.tsx` | Rimuovere 2 pulsanti icona + "Vedi →" dalla card piano |
| `src/pages/UserDietPage.tsx` | Aggiungere icona info + dialog descrittivo per ogni template |

