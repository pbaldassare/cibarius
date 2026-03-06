

# Piano: Descrizione inline nelle card dei template

## Cosa cambiare

### `src/pages/UserDietPage.tsx`

Nelle card dei template (righe ~596-626), rimuovere il pulsante Info separato e il Dialog associato. Invece, mostrare la descrizione **direttamente dentro ogni card**, sotto i macro (P/C/G).

**Struttura card aggiornata:**
```
[Titolo]                    [badge kcal]
P 120g  C 180g  G 65g
─────────────────────────────
👤 Per chi: [target]
🎯 Obiettivi: [goals]
📋 [description]
```

Modifiche specifiche:
1. **Righe 601-625** — Dentro `CardContent`, dopo la riga dei macro, aggiungere un blocco con `getTemplateInfo(tmpl.title)` che mostra target, goals e description in testo piccolo (`text-[11px]`)
2. **Rimuovere il pulsante Info** (righe 605-611) — non serve più, l'info è già visibile
3. **Rimuovere il Dialog** per `infoTemplate` (righe ~1275-1310) — non più necessario
4. **Rimuovere lo state** `infoTemplate` (riga 159) — non più usato

Le descrizioni usano il mapping `TEMPLATE_INFO` già esistente con il fallback generico già implementato, quindi tutti i template avranno una descrizione.

