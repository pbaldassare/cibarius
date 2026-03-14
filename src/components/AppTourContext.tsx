import { createContext, useContext, useState, useCallback, useRef, ReactNode } from "react";

export type TourActionType = "navigate" | "open-add-food" | "close-add-food" | "scroll" | "wait";

export interface TourAction {
  type: TourActionType;
  target?: string; // route for navigate, selector for scroll
  delay?: number;  // ms to wait after action
}

export interface TourStep {
  selector: string;
  title: string;
  description: string;
  page?: string;
  position?: "top" | "bottom" | "left" | "right";
  action?: TourAction;
  duration?: number; // ms override for auto-advance
}

interface TourContextType {
  isActive: boolean;
  currentStep: number;
  startTour: () => void;
  stopTour: () => void;
  nextStep: () => void;
  prevStep: () => void;
  goToStep: (step: number) => void;
  totalSteps: number;
  // Modal control
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

export const TOUR_STEPS: TourStep[] = [
  // ── Phase 1: Homepage ──
  {
    selector: "home-greeting",
    title: "Benvenuto su Cibarius! 🎉",
    description: "Questa è la tua home. Qui trovi tutto a colpo d'occhio: scadenze, dispensa, pasti e suggerimenti personalizzati.",
    page: "/",
  },
  {
    selector: "home-search",
    title: "Cerca prodotti 🔍",
    description: "Cerca rapidamente tra tutti i tuoi prodotti in dispensa, frigo o congelatore.",
    page: "/",
  },
  {
    selector: "home-expiry",
    title: "Attenzione oggi ⚠️",
    description: "Qui vedi i prodotti in scadenza o già scaduti. Non sprecare nulla! Puoi gestirli direttamente da qui.",
    page: "/",
  },
  {
    selector: "home-action-scan",
    title: "Scansiona barcode 📷",
    description: "Scansiona il barcode di un prodotto per aggiungerlo automaticamente con tutte le info nutrizionali.",
    page: "/",
  },
  {
    selector: "home-action-add",
    title: "Aggiungi manualmente ➕",
    description: "Aggiungi un prodotto manualmente, con foto AI, o cercandolo nel database.",
    page: "/",
  },
  {
    selector: "home-action-fridge",
    title: "Svuota frigo 🧊",
    description: "Trova ricette per consumare ciò che sta per scadere. Zero sprechi!",
    page: "/",
  },
  {
    selector: "home-action-suggest",
    title: "Cosa mangio? ✨",
    description: "L'intelligenza artificiale ti suggerisce cosa cucinare con quello che hai in casa.",
    page: "/",
  },

  // ── Phase 2: FAB & AddFood modal ──
  {
    selector: "home-fab",
    title: "Aggiungi velocemente ➕",
    description: "Premi questo pulsante in qualsiasi momento per aggiungere un nuovo prodotto. Apriamolo insieme!",
    page: "/",
    action: { type: "wait", delay: 300 },
  },
  {
    selector: "home-fab",
    title: "Apriamo il modale! 📦",
    description: "Ora apro il modale per mostrarti tutte le opzioni disponibili per aggiungere prodotti.",
    page: "/",
    action: { type: "open-add-food", delay: 600 },
  },
  {
    selector: "add-photo-ai",
    title: "📸 Foto AI — Consigliato!",
    description: "Scatta 1-5 foto del prodotto e l'intelligenza artificiale legge automaticamente nome, barcode, valori nutrizionali e scadenza.",
  },
  {
    selector: "add-receipt",
    title: "📋 Scontrino",
    description: "Fotografa lo scontrino della spesa o scansiona il QR code: tutti i prodotti vengono aggiunti in automatico con le scadenze stimate.",
  },
  {
    selector: "add-scan",
    title: "🔍 Scansiona barcode",
    description: "Inquadra il barcode con la fotocamera per trovare il prodotto nel database con tutte le info nutrizionali.",
  },
  {
    selector: "add-search",
    title: "🔎 Cerca prodotto",
    description: "Cerca per nome tra migliaia di prodotti nel database. Trovi prodotti italiani e internazionali.",
  },
  {
    selector: "add-manual",
    title: "⌨️ Inserisci manualmente",
    description: "Se il prodotto non si trova, puoi inserirlo a mano con nome e valori nutrizionali.",
  },
  {
    selector: "add-close-tour",
    title: "Chiudiamo il modale ✓",
    description: "Perfetto! Ora conosci tutti i modi per aggiungere prodotti. Chiudiamo e continuiamo il tour.",
    action: { type: "close-add-food", delay: 400 },
  },

  // ── Phase 3: Dispensa & Ricette ──
  {
    selector: "home-pantry",
    title: "La tua dispensa 🏠",
    description: "Panoramica completa di tutti i tuoi prodotti: quanti ne hai, quanti in scadenza, quanti quasi finiti.",
    page: "/",
    action: { type: "scroll", target: "home-pantry" },
  },
  {
    selector: "home-recipes",
    title: "Ricette anti-spreco 🍳",
    description: "Ricette suggerite automaticamente in base a ciò che hai in casa. Cucina senza sprecare!",
    page: "/",
    action: { type: "scroll", target: "home-recipes" },
  },
  {
    selector: "home-meals",
    title: "I tuoi pasti di oggi 🍽️",
    description: "Registra colazione, pranzo e cena per monitorare la tua alimentazione giornaliera.",
    page: "/",
    action: { type: "scroll", target: "home-meals" },
  },

  // ── Phase 4: Bottom Navigation ──
  {
    selector: "nav-expiry",
    title: "Scadenze 📅",
    description: "Vai alla lista completa delle scadenze. Filtra per stato, tipo di conservazione e gestisci tutto.",
    page: "/",
  },
  {
    selector: "nav-plan",
    title: "Piano alimentare 📋",
    description: "Il tuo piano alimentare personalizzato dal nutrizionista. Segui i target giornalieri di calorie e macronutrienti.",
    page: "/",
  },
  {
    selector: "nav-meals",
    title: "Diario pasti 🍴",
    description: "Il diario alimentare completo: registra pasti con foto, monitora calorie e macro giornalieri.",
    page: "/",
  },
  {
    selector: "nav-progress",
    title: "Progressi 📈",
    description: "Monitora peso, misurazioni corporee e aderenza al piano alimentare nel tempo.",
    page: "/",
  },
  {
    selector: "nav-profile",
    title: "Profilo ⚙️",
    description: "Impostazioni, collegamento con il nutrizionista, notifiche e supporto.",
    page: "/",
  },

  // ── Phase 5: Navigate pages ──
  {
    selector: "expiry-page-header",
    title: "Pagina Scadenze 📅",
    description: "Qui puoi filtrare per scaduti/in scadenza, per tipo di conservazione (frigo, freezer, dispensa), cercare e gestire tutti i prodotti.",
    page: "/expiry",
    action: { type: "navigate", target: "/expiry", delay: 500 },
  },
  {
    selector: "meals-page-header",
    title: "Diario Pasti 🍴",
    description: "Registra tutti i pasti della giornata. Vedi le calorie consumate, i macro e il confronto con gli obiettivi del piano alimentare.",
    page: "/meals",
    action: { type: "navigate", target: "/meals", delay: 500 },
  },
  {
    selector: "profile-page-header",
    title: "Il tuo Profilo ⚙️",
    description: "Modifica nome, foto, gestisci le notifiche email, collega il nutrizionista e accedi al supporto. Qui puoi anche rivedere questo tour!",
    page: "/profile",
    action: { type: "navigate", target: "/profile", delay: 500 },
  },

  // ── Phase 6: Finale ──
  {
    selector: "home-greeting",
    title: "Tour completato! 🎊",
    description: "Ora conosci tutte le funzionalità di Cibarius. Inizia aggiungendo i tuoi primi prodotti. Buon appetito! 🍽️",
    page: "/",
    action: { type: "navigate", target: "/", delay: 400 },
  },
];

export const TourProvider = ({ children }: { children: ReactNode }) => {
  const [isActive, setIsActive] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const addFoodOpenRef = useRef<(() => void) | null>(null);
  const addFoodCloseRef = useRef<(() => void) | null>(null);

  const registerAddFoodControl = useCallback((open: () => void, close: () => void) => {
    addFoodOpenRef.current = open;
    addFoodCloseRef.current = close;
  }, []);

  const openAddFood = useCallback(() => {
    addFoodOpenRef.current?.();
  }, []);

  const closeAddFood = useCallback(() => {
    addFoodCloseRef.current?.();
  }, []);

  const startTour = useCallback(() => {
    setCurrentStep(0);
    setIsActive(true);
  }, []);

  const stopTour = useCallback(() => {
    setIsActive(false);
    setCurrentStep(0);
    localStorage.setItem("cibarius_tour_done", "1");
    // Close any open modals
    addFoodCloseRef.current?.();
  }, []);

  const nextStep = useCallback(() => {
    setCurrentStep(prev => {
      if (prev >= TOUR_STEPS.length - 1) {
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
    setCurrentStep(Math.max(0, Math.min(step, TOUR_STEPS.length - 1)));
  }, []);

  return (
    <TourContext.Provider value={{
      isActive, currentStep, startTour, stopTour, nextStep, prevStep, goToStep,
      totalSteps: TOUR_STEPS.length,
      registerAddFoodControl, openAddFood, closeAddFood,
    }}>
      {children}
    </TourContext.Provider>
  );
};
