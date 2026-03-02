

# Profilo professionale completo per nutrizionisti/coach

## Cosa cambia

Attualmente la tabella `professional_profiles` ha solo 5 campi (display_name, specialization, city, bio, photo_url). Il professionista non ha modo di modificare questi campi dall'app. Questa implementazione:

1. **Espande il database** con nuovi campi per un profilo professionale completo
2. **Aggiunge una sezione dedicata** nella pagina Profilo del professionista per visualizzare e modificare tutti i dati
3. **Aggiorna la ricerca coach** nella UserDietPage per mostrare le nuove informazioni
4. **Aggiorna il dialog coach** nella ProfiloPage utente per mostrare il profilo completo

## Modifiche al database

### Nuove colonne su `professional_profiles`

| Colonna | Tipo | Descrizione |
|---------|------|-------------|
| `experience_years` | integer | Anni di esperienza |
| `additional_roles` | text[] | Ruoli aggiuntivi (mental coach, personal trainer, ecc.) |
| `workplace` | text | Luogo di lavoro (studio, palestra, clinica) |
| `website` | text | Sito web personale |
| `instagram` | text | Profilo Instagram |
| `facebook` | text | Profilo Facebook |
| `linkedin` | text | Profilo LinkedIn |
| `works_online` | boolean | Disponibile per consulenze online |
| `works_in_person` | boolean | Disponibile per consulenze in presenza |
| `is_visible` | boolean | Visibile nella ricerca coach (default true) |

### RLS

Nessuna modifica: le policy esistenti gia' coprono lettura per clienti collegati e gestione per il professionista stesso. Si aggiunge una policy SELECT per permettere a tutti gli utenti autenticati di leggere i profili con `is_visible = true` (per la ricerca coach).

## Modifiche frontend

### 1. `src/pages/ProfiloPage.tsx` -- Sezione profilo professionale

Quando `role === "professional"`, mostrare una card dedicata "Il tuo profilo professionale" con:
- Foto profilo (con upload, riutilizzando la logica avatar esistente)
- Tutti i campi del profilo in formato read-only
- Bottone "Modifica profilo" che apre un dialog con form completo
- Campi nel form: display_name, specialization, experience_years, additional_roles (multi-select/chip), city, workplace, bio, website, instagram, facebook, linkedin, works_online (switch), works_in_person (switch), is_visible (switch)

### 2. `src/pages/ProfiloPage.tsx` -- Dialog coach arricchito (lato utente)

Il dialog che l'utente vede quando tocca la card del proprio nutrizionista mostrera' anche:
- Anni di esperienza
- Ruoli aggiuntivi (badge)
- Luogo di lavoro
- Link al sito web e ai social (icone cliccabili)
- Indicazione se lavora online e/o in presenza

### 3. `src/pages/UserDietPage.tsx` -- Ricerca coach arricchita

Aggiornare la query di ricerca coach per includere i nuovi campi e mostrare nelle card:
- Anni di esperienza
- Se lavora online/in presenza (badge)
- Ruoli aggiuntivi

## Dettagli tecnici

### File coinvolti: 3 + migration

| File | Modifica |
|------|----------|
| Migration SQL | Nuove colonne su `professional_profiles` + policy `is_visible` |
| `src/pages/ProfiloPage.tsx` | Card profilo pro + form modifica + dialog coach arricchito |
| `src/pages/UserDietPage.tsx` | Query e card ricerca coach con nuovi campi |
| `src/integrations/supabase/types.ts` | Aggiornamento automatico tipi |

### Upload foto profilo professionale

Riutilizzare la stessa logica dell'avatar utente (bucket `avatars`, path `{userId}/pro-photo.{ext}`), salvando l'URL nel campo `photo_url` di `professional_profiles`.

### Ruoli aggiuntivi

Salvati come array di testo (`text[]`). UI con chip/tag selezionabili tra opzioni predefinite:
- Nutrizionista
- Dietologo
- Personal Trainer
- Mental Coach
- Biologo nutrizionista
- Altro (campo libero)

### Policy per ricerca pubblica

Nuova policy RLS su `professional_profiles`:
```sql
CREATE POLICY "Authenticated reads visible profiles"
  ON professional_profiles FOR SELECT
  USING (auth.uid() IS NOT NULL AND is_visible = true);
```

Questo permette a qualsiasi utente autenticato di trovare i professionisti che hanno scelto di essere visibili nella ricerca.
