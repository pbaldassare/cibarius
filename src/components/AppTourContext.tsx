import { createContext, useContext, useState, useCallback, useRef, ReactNode } from "react";

export type TourActionType = "navigate" | "open-add-food" | "close-add-food" | "scroll" | "wait";

export interface TourAction {
  type: TourActionType;
  target?: string;
  delay?: number;
}

export interface TourStep {
  selector: string;
  title: string;
  description: string;
  page?: string;
  position?: "top" | "bottom" | "left" | "right";
  action?: TourAction;
  duration?: number;
}

export type TourRole = "user" | "restaurant_owner" | "professional";

interface TourContextType {
  isActive: boolean;
  currentStep: number;
  steps: TourStep[];
  startTour: (role?: TourRole) => void;
  stopTour: () => void;
  nextStep: () => void;
  prevStep: () => void;
  goToStep: (step: number) => void;
  totalSteps: number;
  registerAddFoodControl: (open: () => void, close: () => void) => void;
  openAddFood: () => void;
  closeAddFood: () => void;
}

const TourContext = createContext<TourContextType | null>(null);

export const useTour = () => {
  const ctx = useContext(TourContext);
  if (!ctx) throw new Error("useTour must be used within TourProvider");
  return ctx;
};

/* ═══════════════ USER TOUR ═══════════════ */
export const USER_TOUR_STEPS: TourStep[] = [
  { selector: "home-greeting", title: "Benvenuto su Cibarius! 🎉", description: "Questa è la tua home. Qui trovi scadenze, dispensa e suggerimenti anti-spreco a colpo d'occhio.", page: "/" },
  { selector: "home-search", title: "Cerca prodotti 🔍", description: "Cerca rapidamente tra tutti i tuoi prodotti in dispensa, frigo o congelatore.", page: "/" },
  { selector: "home-expiry", title: "Attenzione oggi ⚠️", description: "Qui vedi i prodotti in scadenza o già scaduti. Non sprecare nulla! Puoi gestirli direttamente da qui.", page: "/" },
  { selector: "home-action-scan", title: "Scansiona barcode 📷", description: "Scansiona il barcode di un prodotto per aggiungerlo automaticamente con tutte le info nutrizionali.", page: "/" },
  { selector: "home-action-add", title: "Aggiungi manualmente ➕", description: "Aggiungi un prodotto manualmente, con foto AI, o cercandolo nel database.", page: "/" },
  { selector: "home-action-fridge", title: "Svuota frigo 🧊", description: "Trova ricette per consumare ciò che sta per scadere. Zero sprechi!", page: "/" },
  { selector: "home-action-suggest", title: "Cosa mangio? ✨", description: "L'intelligenza artificiale ti suggerisce cosa cucinare con quello che hai in casa.", page: "/" },
  { selector: "home-fab", title: "Aggiungi velocemente ➕", description: "Premi questo pulsante in qualsiasi momento per aggiungere un nuovo prodotto. Apriamolo insieme!", page: "/", action: { type: "wait", delay: 300 } },
  { selector: "home-fab", title: "Apriamo il modale! 📦", description: "Ora apro il modale per mostrarti tutte le opzioni disponibili per aggiungere prodotti.", page: "/", action: { type: "open-add-food", delay: 600 } },
  { selector: "add-photo-ai", title: "📸 Foto AI — Consigliato!", description: "Scatta 1-5 foto del prodotto e l'intelligenza artificiale legge automaticamente nome, barcode, valori nutrizionali e scadenza." },
  { selector: "add-receipt", title: "📋 Scontrino", description: "Fotografa lo scontrino della spesa o scansiona il QR code: tutti i prodotti vengono aggiunti in automatico con le scadenze stimate." },
  { selector: "add-scan", title: "🔍 Scansiona barcode", description: "Inquadra il barcode con la fotocamera per trovare il prodotto nel database con tutte le info nutrizionali." },
  { selector: "add-search", title: "🔎 Cerca prodotto", description: "Cerca per nome tra migliaia di prodotti nel database. Trovi prodotti italiani e internazionali." },
  { selector: "add-manual", title: "⌨️ Inserisci manualmente", description: "Se il prodotto non si trova, puoi inserirlo a mano con nome e valori nutrizionali." },
  { selector: "add-close-tour", title: "Chiudiamo il modale ✓", description: "Perfetto! Ora conosci tutti i modi per aggiungere prodotti. Chiudiamo e continuiamo il tour.", action: { type: "close-add-food", delay: 400 } },
  { selector: "home-pantry", title: "La tua dispensa 🏠", description: "Panoramica completa di tutti i tuoi prodotti: quanti ne hai, quanti in scadenza, quanti quasi finiti.", page: "/", action: { type: "scroll", target: "home-pantry" } },
  { selector: "home-recipes", title: "Ricette anti-spreco 🍳", description: "Ricette suggerite automaticamente in base a ciò che hai in casa. Cucina senza sprecare!", page: "/", action: { type: "scroll", target: "home-recipes" } },
  { selector: "nav-expiry", title: "Scadenze 📅", description: "Vai alla lista completa delle scadenze. Filtra per stato, tipo di conservazione e gestisci tutto.", page: "/" },
  { selector: "nav-recipes", title: "Ricette anti-spreco 🍳", description: "Trova cosa cucinare con gli ingredienti che hai, soprattutto quelli in scadenza.", page: "/" },
  { selector: "nav-profile", title: "Profilo ⚙️", description: "Impostazioni, notifiche scadenze e assistenza.", page: "/" },
  { selector: "expiry-page-header", title: "Pagina Scadenze 📅", description: "Qui puoi filtrare per scaduti/in scadenza, per tipo di conservazione (frigo, freezer, dispensa), cercare e gestire tutti i prodotti.", page: "/expiry", action: { type: "navigate", target: "/expiry", delay: 500 } },
  { selector: "profile-page-header", title: "Il tuo Profilo ⚙️", description: "Modifica nome, foto, gestisci le notifiche email e accedi al supporto. Qui puoi anche rivedere questo tour!", page: "/profile", action: { type: "navigate", target: "/profile", delay: 500 } },
  { selector: "nav-profile", title: "Condividi Cibarius con gli amici 🤝", description: "Ti piace Cibarius? Dal profilo puoi condividere l'app con amici e famiglia!", page: "/", action: { type: "navigate", target: "/", delay: 400 } },
  { selector: "home-greeting", title: "Grazie per la tua attenzione! 🎊", description: "Ora conosci le funzionalità di Cibarius. Inizia aggiungendo i tuoi primi prodotti e riduci gli sprechi. Buon appetito! 🍽️", page: "/", action: { type: "navigate", target: "/", delay: 400 } },
];

/* ═══════════════ RESTAURANT TOUR ═══════════════ */
export const RESTAURANT_TOUR_STEPS: TourStep[] = [
  // Dashboard (/restaurant) — 7 step
  { selector: "rest-greeting", title: "Benvenuto nella tua cucina digitale! 🍳", description: "Questa è la dashboard del tuo ristorante. Qui monitori scadenze, controlli HACCP, preparazioni e bolle in un colpo d'occhio. Ogni dato è in tempo reale.", page: "/restaurant" },
  { selector: "rest-topbar", title: "Profilo e Backoffice 🔧", description: "Da qui accedi al profilo del ristorante (nome, indirizzo, social) e al Backoffice per gestire staff, impostazioni e la Modalità Controllo HACCP per le ispezioni.", page: "/restaurant", action: { type: "scroll", target: "rest-topbar" } },
  { selector: "rest-haccp-card", title: "Controlli HACCP oggi ✅", description: "Il pannello HACCP mostra i controlli da completare oggi con barra di progresso. Se ci sono temperature da registrare vedrai un alert dedicato. Ogni controllo è tracciato con operatore, data e note.", page: "/restaurant", action: { type: "scroll", target: "rest-haccp-card" } },
  { selector: "rest-quick-actions", title: "Azioni rapide ⚡", description: "Accesso diretto ai controlli più frequenti: celle frigo, forni, cappe, scadenze. Un tap ti porta alla sezione giusta senza passare dal menu.", page: "/restaurant", action: { type: "scroll", target: "rest-quick-actions" } },
  { selector: "rest-expiry-card", title: "Scadenze prodotti ⚠️", description: "Monitora in tempo reale quanti prodotti sono scaduti, in scadenza o senza data. Il pulsante 'Gestisci scadenze' ti permette di smaltire, consumare o donare in blocco.", page: "/restaurant", action: { type: "scroll", target: "rest-expiry-card" } },
  { selector: "rest-production-card", title: "Preparazioni e produzione 👨‍🍳", description: "Crea preparazioni interne (ragù, impasti, salse). Ogni preparazione ha lotto, scadenza, allergeni tracciati e un'etichetta stampabile 2x3cm con QR code per la tracciabilità.", page: "/restaurant", action: { type: "scroll", target: "rest-production-card" } },
  { selector: "rest-invoices-card", title: "Bolle e documenti fornitori 📄", description: "Carica foto di bolle e fatture. L'AI estrae automaticamente fornitore, data, articoli, quantità e totali. Tutto archiviato e consultabile.", page: "/restaurant", action: { type: "scroll", target: "rest-invoices-card" } },

  // HACCP (/restaurant/haccp) — 4 step
  { selector: "rest-haccp-page", title: "Checklist HACCP giornaliera 📋", description: "Ecco la pagina HACCP con il calendario settimanale. Ogni riga è un'attività, ogni colonna un giorno. ✅ = completata, ⚠️ = in ritardo, ○ = da fare.", page: "/restaurant/haccp", action: { type: "navigate", target: "/restaurant/haccp", delay: 600 } },
  { selector: "rest-haccp-page", title: "Completare un controllo 📝", description: "Tocca una cella 'Da fare' per registrare il controllo. Si apre un dialog dove inserisci note, alleghi foto e — per le temperature — il valore in °C con verifica automatica delle soglie.", page: "/restaurant/haccp" },
  { selector: "rest-haccp-page", title: "Temperature con soglie 🌡️", description: "Per celle frigo (max 4°C), freezer (max -18°C) e frigoriferi il sistema verifica automaticamente se la temperatura è nella norma. Se fuori soglia, ricevi un alert immediato.", page: "/restaurant/haccp" },
  { selector: "rest-haccp-page", title: "Storico e configurazione ⚙️", description: "Usa le frecce per navigare tra le settimane e vedere lo storico. Il pulsante 'Configura' ti porta alla pagina di setup dove personalizzare attività e attrezzature.", page: "/restaurant/haccp" },

  // Setup HACCP (/restaurant/haccp/setup) — 3 step
  { selector: "rest-haccp-setup-page", title: "Configurazione HACCP ⚙️", description: "Qui configuri le attività HACCP del tuo ristorante. Puoi scegliere un template preconfigurato (pizzeria, ristorante, bar) oppure creare attività personalizzate.", page: "/restaurant/haccp/setup", action: { type: "navigate", target: "/restaurant/haccp/setup", delay: 600 } },
  { selector: "rest-haccp-setup-page", title: "Attività personalizzate 📝", description: "Aggiungi attività con nome, categoria (pulizia, temperature, superfici...) e frequenza (giornaliera, settimanale, mensile). Ogni attività può essere attivata/disattivata con un toggle.", page: "/restaurant/haccp/setup" },
  { selector: "rest-haccp-setup-page", title: "Attrezzature da controllare 🧊", description: "Indica quante celle, frigoriferi, freezer, forni e cappe hai. Il sistema genera automaticamente i controlli temperatura per ogni attrezzatura.", page: "/restaurant/haccp/setup" },

  // Scadenze (/restaurant/products) — 4 step
  { selector: "rest-products-page", title: "Gestione Scadenze 📅", description: "La lista completa dei prodotti con scadenze. Filtra per stato (scaduti, in scadenza, OK), tipo di conservazione (frigo, freezer, dispensa) e cerca per nome.", page: "/restaurant/products", action: { type: "navigate", target: "/restaurant/products", delay: 600 } },
  { selector: "rest-products-page", title: "Aggiungere prodotti 📦", description: "Premi il + per aggiungere. Puoi usare: 📸 Foto AI (scatta e l'AI legge tutto), 🔍 Barcode, 📋 Scontrino, o inserire manualmente. L'AI rileva nome, scadenza, lotto e valori nutrizionali.", page: "/restaurant/products" },
  { selector: "rest-products-page", title: "Tracciabilità completa 🔖", description: "Ogni prodotto ha lotto, data di produzione, 'chef life' (scadenza interna in ore) e tipo di conservazione. Le etichette QR permettono la verifica istantanea da smartphone.", page: "/restaurant/products" },
  { selector: "rest-products-page", title: "Gestione scadenze 🔄", description: "Per i prodotti scaduti o in scadenza: smaltisci, segna come consumato, dona o scarta. Tutto tracciato per la reportistica anti-spreco.", page: "/restaurant/products" },

  // Preparazioni (/restaurant/preparations) — 3 step
  { selector: "rest-preparations-page", title: "Preparazioni 🧑‍🍳", description: "Le preparazioni interne: ragù, impasti, salse, semilavorati. Ogni elemento ha scadenza, tipo di conservazione, lotto e numero di porzioni.", page: "/restaurant/preparations", action: { type: "navigate", target: "/restaurant/preparations", delay: 600 } },
  { selector: "rest-preparations-page", title: "Creare una preparazione ✏️", description: "Premi + per creare. Inserisci nome, ingredienti (con quantità e unità), allergeni, tipo di conservazione e scadenza. Il sistema suggerisce la data di scadenza in base alla conservazione.", page: "/restaurant/preparations" },
  { selector: "rest-preparations-page", title: "Etichette stampabili 🏷️", description: "Ogni preparazione genera un codice etichetta con QR code. Stampa etichette 2x3cm per applicarle ai contenitori. Il QR porta alla scheda dettaglio con ingredienti e allergeni.", page: "/restaurant/preparations" },

  // Bolle (/restaurant/invoices) — 3 step
  { selector: "rest-invoices-page", title: "Bolle e Documenti 📑", description: "Qui carichi e archivi bolle, fatture e DDT dei fornitori. Ogni documento è consultabile con anteprima immagine o PDF.", page: "/restaurant/invoices", action: { type: "navigate", target: "/restaurant/invoices", delay: 600 } },
  { selector: "rest-invoices-page", title: "Upload e analisi AI 🤖", description: "Carica una foto della bolla e l'AI estrae automaticamente: fornitore, P.IVA, numero documento, data, lista articoli con quantità e prezzi, totale e IVA.", page: "/restaurant/invoices" },
  { selector: "rest-invoices-page", title: "Archivio consultabile 📂", description: "Tutti i documenti sono archiviati con i dati estratti. Puoi rieseguire l'analisi AI, scaricare il file originale o eliminare documenti obsoleti.", page: "/restaurant/invoices" },

  // Bottom Nav — 1 step
  { selector: "rest-nav-home", title: "Navigazione 🧭", description: "Usa la barra in basso per navigare: Home (dashboard), HACCP (checklist), Scadenze (prodotti), Preparaz. (semilavorati), Bolle (documenti fornitori).", page: "/restaurant/invoices" },

  // Finale
  { selector: "rest-greeting", title: "Grazie per la tua attenzione! 🎊", description: "Ora conosci tutte le funzionalità del tuo ristorante su Cibarius: HACCP digitale, scadenze AI, preparazioni con etichette QR e gestione bolle automatizzata. Inizia completando i controlli HACCP di oggi! 💪", page: "/restaurant", action: { type: "navigate", target: "/restaurant", delay: 400 } },
];

/* ═══════════════ PROFESSIONAL TOUR ═══════════════ */
export const PRO_TOUR_STEPS: TourStep[] = [
  // Dashboard (/pro) — 5 step
  { selector: "pro-greeting", title: "Benvenuto nella piattaforma Pro! 🩺", description: "Questa è la tua dashboard professionale. Da qui gestisci clienti, piani alimentari, template, appuntamenti, report e comunicazioni in tempo reale.", page: "/pro" },
  { selector: "pro-clients-card", title: "I tuoi clienti 👥", description: "Visualizza il numero di clienti attivi collegati. Un tap ti porta alla lista completa dove puoi gestire piani, monitorare progressi e chattare.", page: "/pro", action: { type: "scroll", target: "pro-clients-card" } },
  { selector: "pro-report-card", title: "Report settimanale 📊", description: "Monitora l'andamento globale dei tuoi clienti: aderenza ai piani, calorie medie, macro rispettati. Report automatici ogni settimana.", page: "/pro", action: { type: "scroll", target: "pro-report-card" } },
  { selector: "pro-quick-actions", title: "Azioni rapide ⚡", description: "Gestisci clienti, accedi ai template di piani alimentari, calendario appuntamenti e traccia i guadagni dai coupon — tutto con un tap.", page: "/pro", action: { type: "scroll", target: "pro-quick-actions" } },
  { selector: "pro-notes-card", title: "Note recenti 📝", description: "Le ultime note sui tuoi clienti: osservazioni cliniche, appunti sulle visite, progressi rilevanti. Tutto organizzato per data e cliente.", page: "/pro", action: { type: "scroll", target: "pro-notes-card" } },

  // Clienti (/pro/clients) — 5 step
  { selector: "pro-clients-page", title: "Lista Clienti 👥", description: "Ecco la lista dei tuoi clienti. Ogni scheda mostra nome, email e badge 'Piano attivo' o 'No piano'. Da qui gestisci tutto il rapporto professionale.", page: "/pro/clients", action: { type: "navigate", target: "/pro/clients", delay: 600 } },
  { selector: "pro-generate-invite", title: "Invitare nuovi clienti 📨", description: "Premi 'Genera invito' per creare un codice univoco. Condividilo con il cliente: potrà usarlo nell'app per collegarsi al tuo profilo professionale.", page: "/pro/clients" },
  { selector: "pro-link-requests", title: "Richieste di collegamento 🔗", description: "I clienti possono anche cercarti nella directory e inviarti una richiesta. Qui le approvi o le rifiuti. All'approvazione, il sistema invia automaticamente il tuo coupon sconto al cliente.", page: "/pro/clients" },
  { selector: "pro-clients-page", title: "Azioni per cliente 🎯", description: "Per ogni cliente hai 5 azioni rapide: 📋 Piano (obiettivi e piano settimanale), 📈 Monitor (aderenza giornaliera), 💡 Suggerisci (AI consiglia pasti), 🧑‍🍳 Dispensa e 🥗 Ricette del cliente.", page: "/pro/clients" },
  { selector: "pro-clients-page", title: "Dettaglio cliente (badge) 🏷️", description: "Il badge colorato indica se il cliente ha un piano attivo. Clicca sull'occhio per il dettaglio completo: misurazioni, storico piani, chat e export PDF.", page: "/pro/clients" },

  // Funzionalità dettaglio cliente (spiegate su /pro/clients) — 8 step
  { selector: "pro-clients-page", title: "Piano obiettivi — Step 1 🎯", description: "Dal bottone 'Piano' crei gli obiettivi del cliente in 3 step: 1) Dati base (peso attuale, target, altezza, attività), 2) Calcolo kcal e macro giornalieri, 3) Distribuzione per pasto (colazione, pranzo, cena, spuntini).", page: "/pro/clients" },
  { selector: "pro-clients-page", title: "Piano settimanale — 7 giorni 📅", description: "Il piano settimanale copre 7 giorni × 6 pasti. Per ogni pasto scrivi gli alimenti con l'autocomplete intelligente che suggerisce ingredienti con macro pre-calcolati. Puoi duplicare giorni e copiare tra settimane.", page: "/pro/clients" },
  { selector: "pro-clients-page", title: "Monitor — Aderenza in tempo reale 📈", description: "La pagina Monitor mostra l'aderenza giornaliera del cliente: calorie consumate vs target, macro (proteine, carboidrati, grassi) con barre di confronto. Alert automatici se il cliente è sotto o sopra soglia.", page: "/pro/clients" },
  { selector: "pro-clients-page", title: "Chat in tempo reale 💬", description: "Messaggistica Realtime integrata. Scrivi al cliente e ricevi risposte istantanee. I messaggi sono organizzati per conversazione e puoi inviare consigli rapidi durante la giornata.", page: "/pro/clients" },
  { selector: "pro-clients-page", title: "Misurazioni corporee 📐", description: "Registra peso, misure (vita, fianchi, braccia, petto, coscia), percentuale di grasso corporeo e note. Visualizza i trend nel tempo con grafici di progresso.", page: "/pro/clients" },
  { selector: "pro-clients-page", title: "Suggerisci pasto con AI 🤖", description: "L'AI analizza la dispensa del cliente e suggerisce ricette che rispettano il piano alimentare. Tieni conto degli ingredienti disponibili e delle preferenze.", page: "/pro/clients" },
  { selector: "pro-clients-page", title: "Dispensa e ricette del cliente 🏠", description: "Vedi cosa ha il cliente in casa: prodotti in frigo, freezer e dispensa con scadenze. Suggerisci ricette anti-spreco basate sugli ingredienti reali.", page: "/pro/clients" },
  { selector: "pro-clients-page", title: "Storico piani e PDF 📄", description: "Consulta tutti i piani precedenti del cliente. Ogni piano può essere esportato in PDF professionale con logo, macro e indicazioni per pasto.", page: "/pro/clients" },

  // Template (/pro/templates) — 4 step
  { selector: "pro-templates-page", title: "Libreria Template 📋", description: "I template sono piani alimentari riutilizzabili. Creali una volta, applicali a più clienti. Ogni template ha kcal, macro e distribuzione per pasto.", page: "/pro/templates", action: { type: "navigate", target: "/pro/templates", delay: 600 } },
  { selector: "pro-templates-page", title: "Creare un template ✏️", description: "Premi 'Crea template' per definire kcal giornaliere, proteine, carboidrati e grassi. Poi nell'editor aggiungi la distribuzione per pasto con alimenti specifici.", page: "/pro/templates" },
  { selector: "pro-templates-page", title: "Importa e duplica 📥", description: "Importa template da file PDF o CSV: l'AI estrae automaticamente macro e pasti. Oppure duplica template di base pre-configurati e personalizzali.", page: "/pro/templates" },
  { selector: "pro-templates-page", title: "Applicare ai clienti 🎯", description: "Dalla scheda cliente, applica un template al piano alimentare. I macro vengono copiati e puoi personalizzare gli alimenti per ogni giorno della settimana.", page: "/pro/templates" },

  // Appuntamenti (/pro/appointments) — 2 step
  { selector: "pro-appointments-page", title: "Calendario appuntamenti 📅", description: "Gestisci le visite con i clienti. Vedi i prossimi appuntamenti e lo storico completo. Ogni appuntamento ha data, ora, cliente e note.", page: "/pro/appointments", action: { type: "navigate", target: "/pro/appointments", delay: 600 } },
  { selector: "pro-appointments-page", title: "Nuovo appuntamento ➕", description: "Premi il + per creare: seleziona il cliente dalla lista, scegli data e ora con il calendario, aggiungi titolo (visita, controllo, follow-up) e note.", page: "/pro/appointments" },

  // Report e Coupon — 2 step
  { selector: "pro-nav-reports", title: "Report settimanale 📊", description: "Il tab Report mostra l'aderenza globale dei clienti ai piani alimentari: chi è in target, chi è sotto, chi non ha registrato pasti. Utile per le sessioni di follow-up.", page: "/pro/appointments" },
  { selector: "pro-nav-dashboard", title: "Guadagni Coupon 💰", description: "Dalla dashboard accedi ai 'Guadagni Coupon': traccia quanti clienti hanno usato il tuo codice sconto, lo sconto applicato, la tua commissione e lo stato dei pagamenti.", page: "/pro/appointments" },

  // Bottom Nav — 1 step
  { selector: "pro-nav-clients", title: "Navigazione 🧭", description: "Usa la barra in basso per navigare: Dashboard (panoramica), Clienti (gestione completa), Report (aderenza), Note (appunti professionali) e Profilo (impostazioni e visibilità).", page: "/pro/appointments" },

  // Finale
  { selector: "pro-greeting", title: "Grazie per la tua attenzione! 🎊", description: "Ora conosci tutte le funzionalità della piattaforma Pro: gestione clienti, piani alimentari con autocomplete, monitoraggio in tempo reale, chat, template e appuntamenti. Inizia invitando i tuoi primi clienti! 💪", page: "/pro", action: { type: "navigate", target: "/pro", delay: 400 } },
];

/** Legacy alias */
export const TOUR_STEPS = USER_TOUR_STEPS;

export function getTourSteps(role: TourRole): TourStep[] {
  switch (role) {
    case "restaurant_owner": return RESTAURANT_TOUR_STEPS;
    case "professional": return PRO_TOUR_STEPS;
    default: return USER_TOUR_STEPS;
  }
}

export const TourProvider = ({ children }: { children: ReactNode }) => {
  const [isActive, setIsActive] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [steps, setSteps] = useState<TourStep[]>(USER_TOUR_STEPS);
  const stepsRef = useRef(steps);
  stepsRef.current = steps;
  const addFoodOpenRef = useRef<(() => void) | null>(null);
  const addFoodCloseRef = useRef<(() => void) | null>(null);

  const registerAddFoodControl = useCallback((open: () => void, close: () => void) => {
    addFoodOpenRef.current = open;
    addFoodCloseRef.current = close;
  }, []);

  const openAddFood = useCallback(() => { addFoodOpenRef.current?.(); }, []);
  const closeAddFood = useCallback(() => { addFoodCloseRef.current?.(); }, []);

  const startTour = useCallback((role?: TourRole) => {
    const tourSteps = getTourSteps(role ?? "user");
    setSteps(tourSteps);
    stepsRef.current = tourSteps;
    setCurrentStep(0);
    setIsActive(true);
  }, []);

  const stopTour = useCallback(() => {
    setIsActive(false);
    setCurrentStep(0);
    localStorage.setItem("cibarius_tour_done", "1");
    addFoodCloseRef.current?.();
  }, []);

  const nextStep = useCallback(() => {
    setCurrentStep(prev => {
      if (prev >= stepsRef.current.length - 1) {
        setIsActive(false);
        localStorage.setItem("cibarius_tour_done", "1");
        addFoodCloseRef.current?.();
        return 0;
      }
      return prev + 1;
    });
  }, []);

  const prevStep = useCallback(() => {
    setCurrentStep(prev => Math.max(0, prev - 1));
  }, []);

  const goToStep = useCallback((step: number) => {
    setCurrentStep(step);
  }, []);

  return (
    <TourContext.Provider value={{
      isActive, currentStep, steps, startTour, stopTour, nextStep, prevStep, goToStep,
      totalSteps: steps.length,
      registerAddFoodControl, openAddFood, closeAddFood,
    }}>
      {children}
    </TourContext.Provider>
  );
};
