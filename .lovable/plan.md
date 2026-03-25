

## Stampa multipla etichette su foglio A4

### Cosa faremo

Aggiungiamo un nuovo componente e una funzione di stampa che dispone automaticamente più copie dell'etichetta HACCP (62x40mm) in una griglia su foglio A4 (210x297mm). L'utente sceglie quante copie stampare e il sistema le organizza in righe da 3 colonne x 7 righe (max 21 etichette per foglio).

### Calcolo griglia

```text
A4 = 210mm x 297mm
Etichetta = 62mm x 40mm
Colonne: floor(210 / 62) = 3 (186mm, margine laterale ~12mm)
Righe:   floor(297 / 40) = 7 (280mm, margine verticale ~8.5mm)
Max per foglio: 21 etichette
```

### Modifiche

**1. `RestaurantLabel.tsx` — Aggiungere bottone "Stampa griglia A4"**

- Nuovo bottone accanto a "Stampa etichetta" con icona `Grid2x2` (o `LayoutGrid`)
- Al click, apre un piccolo dialog/popover per scegliere il numero di copie (default 21, min 1, max 21)
- Nuova funzione `handlePrintGrid` che:
  - Apre `window.open` con `@page { size: A4; margin: 4mm; }`
  - CSS griglia: `display: flex; flex-wrap: wrap; gap: 0;` con etichette 62x40mm
  - Ripete `buildLabelHtml()` N volte
  - Lancia `print()` dopo 500ms

**2. CSS stampa griglia**

```css
@page { size: A4 portrait; margin: 4mm 12mm; }
body { display: flex; flex-wrap: wrap; gap: 0; }
.label-box { width: 62mm; height: 40mm; page-break-inside: avoid; }
```

### File modificati

- `src/components/RestaurantLabel.tsx` — aggiunta bottone + dialog quantita + funzione stampa griglia A4

