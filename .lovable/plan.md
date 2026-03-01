

# Info Coach + Modifica quantita' prodotti e pasti

## Cosa cambia

### 1. Dettagli coach nel profilo

Attualmente la sezione "Il tuo nutrizionista" mostra solo nome ed email. Aggiungere un tap sulla card del professionista che apre un dialog con le informazioni complete dal `professional_profiles`:
- Foto profilo (`photo_url`)
- Nome (`display_name`)
- Specializzazione (`specialization`)
- Citta' (`city`)
- Bio (`bio`)

La query gia' fa il join su `profiles`, ma manca il join su `professional_profiles`. Aggiungere la query e mostrare i dati in un dialog dedicato.

### 2. Modifica quantita' prodotti in inventario (`InventoryList.tsx`)

Ogni card prodotto nella lista inventario diventera' tappabile. Al tap si apre un dialog di modifica rapida con:
- Quantita' (input numerico)
- Unita' (select)
- Storage (select frigo/freezer/dispensa)
- Scadenza (input date)
- Bottoni "Salva" e "Elimina"

Update diretto su `inventory_items` e refresh della lista.

### 3. Modifica quantita' pasti (`PastiPage.tsx`)

Ogni meal_item nella lista pasti, al tap (non sul bottone cestino), aprira' un dialog per modificare:
- Quantita' (input numerico)
- Unita' (select)
- Ricalcolo automatico calorie e macros in base alla quantita' modificata

Update su `meal_items` con nuovi valori calcolati.

## Dettagli tecnici

### File: `src/pages/ProfiloPage.tsx`

- Aggiungere query su `professional_profiles` usando `proLink.professional_id`
- Nuovo stato `coachDialogOpen`
- Rendere la card coach tappabile (il box verde con nome e badge "Attivo")
- Dialog con: foto (Avatar), display_name, specialization, city, bio
- Fallback se `professional_profiles` non esiste (mostrare solo nome/email)

### File: `src/components/InventoryList.tsx`

- Nuovo stato `editingItem: InventoryItemWithProduct | null`
- Nuovo stato per i campi editabili: `editQty`, `editUnit`, `editStorage`, `editExpiry`
- Al click sulla card prodotto: popola gli stati e apre il dialog
- Dialog con form di modifica + bottone Elimina (con conferma)
- `handleSaveEdit`: update su `inventory_items` con ricalcolo calorie/macros
- `handleDeleteItem`: delete su `inventory_items`
- Refresh lista dopo salvataggio/eliminazione

### File: `src/pages/PastiPage.tsx`

- Nuovo stato `editingMealItem: MealItem | null` + `editingMealType: string`
- Al tap sul meal_item (non sul cestino): apre dialog modifica
- Dialog con: nome (readonly), quantita' (editabile), unita' (editabile)
- Ricalcolo calorie e macros proporzionale alla nuova quantita'
- `handleUpdateItem`: update su `meal_items` con nuovi valori
- Il bottone cestino resta separato per l'eliminazione

### File coinvolti: 3
- `src/pages/ProfiloPage.tsx` -- dialog info coach
- `src/components/InventoryList.tsx` -- dialog modifica prodotto
- `src/pages/PastiPage.tsx` -- dialog modifica alimento pasto

