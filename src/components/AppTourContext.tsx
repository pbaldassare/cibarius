import { createContext, useContext, useState, useCallback, ReactNode } from "react";

interface TourContextType {
  isActive: boolean;
  currentStep: number;
  startTour: () => void;
  stopTour: () => void;
  nextStep: () => void;
  prevStep: () => void;
  goToStep: (step: number) => void;
  totalSteps: number;
}

const TourContext = createContext<TourContextType | null>(null);

export const useTour = () => {
  const ctx = useContext(TourContext);
  if (!ctx) throw new Error("useTour must be used within TourProvider");
  return ctx;
};

export interface TourStep {
  selector: string; // data-tour attribute value
  title: string;
  description: string;
  page?: string; // route to navigate to
  position?: "top" | "bottom" | "left" | "right";
}

export const TOUR_STEPS: TourStep[] = [
  // Homepage
  { selector: "home-greeting", title: "Benvenuto su Cibarius! 🎉", description: "Questa è la tua home. Qui trovi tutto a colpo d'occhio: scadenze, dispensa, pasti e suggerimenti.", page: "/" },
  { selector: "home-search", title: "Cerca prodotti 🔍", description: "Cerca rapidamente tra tutti i tuoi prodotti in dispensa, frigo o congelatore.", page: "/" },
  { selector: "home-expiry", title: "Attenzione oggi ⚠️", description: "Qui vedi i prodotti in scadenza o già scaduti. Non sprecare nulla!", page: "/" },
  { selector: "home-action-scan", title: "Scansiona barcode 📷", description: "Scansiona il barcode di un prodotto per aggiungerlo automaticamente con tutte le info nutrizionali.", page: "/" },
  { selector: "home-action-add", title: "Aggiungi manualmente ➕", description: "Aggiungi un prodotto manualmente, con foto AI, o cercandolo nel database.", page: "/" },
  { selector: "home-action-fridge", title: "Svuota frigo 🧊", description: "Trova ricette per consumare ciò che sta per scadere. Zero sprechi!", page: "/" },
  { selector: "home-action-suggest", title: "Cosa mangio? ✨", description: "L'intelligenza artificiale ti suggerisce cosa cucinare con quello che hai in casa.", page: "/" },
  { selector: "home-pantry", title: "La tua dispensa 🏠", description: "Panoramica completa di tutti i tuoi prodotti: quanti ne hai, quanti in scadenza, quanti quasi finiti.", page: "/" },
  { selector: "home-recipes", title: "Ricette anti-spreco 🍳", description: "Ricette suggerite automaticamente in base a ciò che hai in casa. Cucina senza sprecare!", page: "/" },
  { selector: "home-meals", title: "I tuoi pasti di oggi 🍽️", description: "Registra colazione, pranzo e cena per monitorare la tua alimentazione giornaliera.", page: "/" },
  { selector: "home-fab", title: "Aggiungi velocemente ➕", description: "Premi questo pulsante in qualsiasi momento per aggiungere un nuovo prodotto alla tua dispensa.", page: "/" },
  // Bottom nav
  { selector: "nav-expiry", title: "Scadenze 📅", description: "Vai alla lista completa delle scadenze. Filtra per stato, tipo di conservazione e gestisci tutto.", page: "/" },
  { selector: "nav-plan", title: "Piano alimentare 📋", description: "Il tuo piano alimentare personalizzato dal nutrizionista. Segui i target giornalieri.", page: "/" },
  { selector: "nav-meals", title: "Diario pasti 🍴", description: "Il diario alimentare completo: registra pasti con foto, monitora calorie e macro.", page: "/" },
  { selector: "nav-progress", title: "Progressi 📈", description: "Monitora peso, misurazioni corporee e aderenza al piano alimentare nel tempo.", page: "/" },
  { selector: "nav-profile", title: "Profilo ⚙️", description: "Impostazioni, collegamento con il nutrizionista, notifiche e supporto.", page: "/" },
];

export const TourProvider = ({ children }: { children: ReactNode }) => {
  const [isActive, setIsActive] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);

  const startTour = useCallback(() => {
    setCurrentStep(0);
    setIsActive(true);
  }, []);

  const stopTour = useCallback(() => {
    setIsActive(false);
    setCurrentStep(0);
    localStorage.setItem("cibarius_tour_done", "1");
  }, []);

  const nextStep = useCallback(() => {
    setCurrentStep(prev => {
      if (prev >= TOUR_STEPS.length - 1) {
        setIsActive(false);
        localStorage.setItem("cibarius_tour_done", "1");
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
    <TourContext.Provider value={{ isActive, currentStep, startTour, stopTour, nextStep, prevStep, goToStep, totalSteps: TOUR_STEPS.length }}>
      {children}
    </TourContext.Provider>
  );
};
