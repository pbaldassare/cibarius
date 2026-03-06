

# Piano: Sostituire la card "Piano personale (senza coach)" con un titolo semplice

## Modifica

### File: `src/pages/UserDietPage.tsx` (righe 882-897)

Sostituire il blocco `{isSelfPlan && (<Card>...</Card>)}` con un semplice titolo/heading:

```tsx
{isSelfPlan && (
  <div className="text-center py-2">
    <h2 className="text-lg font-bold text-foreground">Scegli il tuo piano nutrizionale</h2>
  </div>
)}
```

Rimuove completamente la card con "Piano personale (senza coach)", i bottoni "Modifica" e "Collega un coach", e li sostituisce con una frase pulita.

