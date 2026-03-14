

## Cerca nutrizionista: popup con contatto diretto

### Problema
1. La ricerca nutrizionisti è inline nella pagina — sarebbe meglio in un popup/dialog
2. "Contatta" naviga a `/invite` che richiede Plus — l'utente non deve andare alla pagina di pagamento
3. Il contatto deve semplicemente inviare una notifica al nutrizionista

### Modifiche — `src/pages/UserDietPage.tsx`

**1. Sostituire la sezione inline con un bottone che apre un Dialog**
- Rimuovere la sezione inline "Cerca un nutrizionista" (righe 636-710) con search bar e coach cards
- Al suo posto, un bottone/card "Cerca un nutrizionista" che fa `setCoachDialogOpen(true)`

**2. Aggiungere un Dialog modale per la ricerca**
- Nuovo state: `coachDialogOpen`, `sendingRequest` (string|null), `requestMap` (Record<string, status>)
- Il dialog contiene: input di ricerca + lista coach filtrata (stessa UI attuale ma dentro il dialog)
- Al mount del dialog: caricare anche `professional_link_requests` e `client_links` dell'utente per sapere lo stato di ogni coach

**3. Bottone "Contatta" → invio diretto della richiesta**
- Invece di `navigate("/invite?pro=...")`, il bottone "Contatta" chiama direttamente la logica `sendRequest` già presente in `InvitePage`:
  1. `INSERT INTO professional_link_requests` (user_id, professional_id)
  2. `INSERT INTO in_app_notifications` per il professionista con tipo `link_request`
  3. Toast "Richiesta inviata!"
- Mostrare lo stato del bottone: "Contatta" (none) → "In attesa" (pending) → "Collegato" (approved)
- Nessun redirect a pagine di pagamento

**4. Rimuovere il gate Plus**
- La ricerca e il contatto sono gratuiti (come da memoria: "gli utenti gratuiti possono collegarsi e chattare liberamente, ma necessitano del Plus per piani e monitoraggio")

### Flusso risultante
- Utente clicca "Cerca un nutrizionista" → si apre il dialog
- Cerca per nome/città/specializzazione → vede i risultati filtrati
- Clicca "Contatta" → insert richiesta + notifica in-app al professionista → bottone diventa "In attesa"
- Il nutrizionista riceve la notifica e approva → collegamento attivo

