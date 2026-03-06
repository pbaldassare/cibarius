

# Fix: isSelfPlan non funziona perché ci sono due piani attivi

## Problema
L'utente `cibarius@utente.it` ha **due piani attivi**:
1. `Piano nutrizionale` — creato da un nutrizionista (`professional_id = 1475bf7c...`) 
2. `Digiuno intermittente 16:8` — self-plan creato dal template

Quando `saveTemplateAsPlan` ha provato a disattivare il vecchio piano, la RLS ha bloccato l'update silenziosamente (l'utente non è il `professional_id` del vecchio piano). Il codice fa `.limit(1)` e Supabase restituisce il piano più vecchio (del nutrizionista), quindi `isSelfPlan = false` e vengono mostrate tutte le sezioni coach.

## Soluzione

### 1. Disattivare il vecchio piano via SQL (una tantum)
Eseguire una migration che disattiva i piani orfani (dove il professionista non ha più un link attivo con il cliente):

```sql
UPDATE diet_plans SET is_active = false 
WHERE id = '9b968dd0-75ca-4cb3-b4f5-348213c1046e';
```

### 2. Fix nel codice — `src/pages/UserDietPage.tsx`

**a) Query dei piani: preferire il self-plan**
Nella query iniziale (riga 124-129), aggiungere `.order("created_at", { ascending: false })` così il piano più recente (il template) viene preso per primo.

**b) Logica isSelfPlan più robusta**
Cambiare la logica `isSelfPlan` (riga 334) per controllare anche se c'è un link attivo con un coach:

```typescript
const isSelfPlan = plan 
  ? (plan.professional_id === plan.client_user_id) || !proProfile
  : false;
```

**c) Fix deactivation nella funzione `saveTemplateAsPlan`**
Filtrare la deactivation solo sui self-plan (che l'utente può modificare via RLS):

```typescript
await supabase.from("diet_plans").update({ is_active: false })
  .eq("client_user_id", user.id)
  .eq("professional_id", user.id)  // solo self-plan
  .eq("is_active", true);
```

Questo evita il fallimento silenzioso con i piani del nutrizionista.

