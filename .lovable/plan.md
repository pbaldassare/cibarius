

# Modifica piano nutrizionale in-place

## Obiettivo
Permettere al nutrizionista di modificare un piano attivo esistente direttamente, senza dover creare un nuovo piano ogni volta. Attualmente il flusso "Pubblica" disattiva il piano precedente e ne crea uno nuovo.

## Cosa cambia

### 1. ProClientPlanPage.tsx -- Aggiungere modalita' "Modifica"

Quando esiste gia' un piano attivo (`existingPlanId` non e' null), il wizard si comporta diversamente:

- **Header**: mostra "Modifica piano" invece di "Nuovo piano"
- **Step 4 (Pubblica)**: il bottone diventa "Salva modifiche" invece di "Pubblica piano"
- **Logica di salvataggio**: invece di disattivare il vecchio piano e crearne uno nuovo, viene fatto un UPDATE in-place su:
  - `diet_plans` (kcal_day, protein_g_day, carbs_g_day, fats_g_day, title, notes)
  - `diet_plan_meal_targets` (delete dei vecchi + insert dei nuovi, per semplicita')
  - `nutrition_targets` (upsert come gia' avviene)

### 2. Bottone "Modifica" visibile dalla lista clienti

Nella `ProClientsPage.tsx`, il bottone "Piano" gia' naviga a `/pro/client/:id/plan` che carica il piano esistente. Non serve modificare nulla qui.

### 3. Bottone "Modifica" nel dettaglio cliente

Nel `ProClientDetailPage.tsx`, aggiungere un bottone "Modifica piano" accanto al bottone "Piano" esistente, solo se il cliente ha gia' un piano attivo.

---

## Dettaglio tecnico

### Modifiche ai file

**`src/pages/pro/ProClientPlanPage.tsx`**:
- Aggiungere stato `isEditMode` derivato da `existingPlanId !== null`
- Nuovo metodo `handleUpdate()` che fa:
  ```
  1. UPDATE diet_plans SET kcal_day, protein_g_day, carbs_g_day, fats_g_day, title, notes WHERE id = existingPlanId
  2. DELETE FROM diet_plan_meal_targets WHERE diet_plan_id = existingPlanId  
  3. INSERT nuovi meal_targets
  4. UPSERT nutrition_targets
  ```
- Step 4: condizionare il testo del bottone e chiamare `handleUpdate` o `handlePublish` in base alla modalita'
- Header: mostrare "Modifica piano -- NomeCliente" in edit mode

**`src/pages/pro/ProClientDetailPage.tsx`**:
- Caricare `diet_plans` per verificare se esiste un piano attivo
- Mostrare badge "Piano attivo" e bottone "Modifica piano" se presente

### Nessuna migrazione DB necessaria
Le RLS policies attuali gia' permettono al professionista di fare UPDATE su `diet_plans` e ALL su `diet_plan_meal_targets` tramite le policy "Pro manages".

