import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { ArrowRight, X, ScanLine, Clock, UtensilsCrossed, ShoppingCart, Users, ClipboardList, BarChart3, Sparkles, Refrigerator, BookOpen, MessageSquare, Package } from "lucide-react";
import cibariusLogo from "@/assets/cibarius-logo.png";
import type { AppRole } from "@/hooks/useRole";

interface Slide {
  icon: React.ReactNode;
  title: string;
  text: string;
}

const SLIDES_BY_ROLE: Record<string, Slide[]> = {
  user: [
    {
      icon: <Sparkles className="h-10 w-10" />,
      title: "Benvenuto in Cibarius!",
      text: "La tua app per gestire alimentazione, dispensa e scadenze in modo intelligente.",
    },
    {
      icon: <ScanLine className="h-10 w-10" />,
      title: "Scansiona i prodotti",
      text: "Fotografa l'etichetta o scansiona il barcode: l'AI riconosce calorie, macro e scadenza automaticamente.",
    },
    {
      icon: <Clock className="h-10 w-10" />,
      title: "Scadenze sotto controllo",
      text: "Ricevi notifiche prima che i tuoi prodotti scadano. Niente più sprechi!",
    },
    {
      icon: <UtensilsCrossed className="h-10 w-10" />,
      title: "Traccia i pasti",
      text: "Le calorie sui prodotti sono solo informative: scansiona e organizza la dispensa.",
    },
    {
      icon: <BookOpen className="h-10 w-10" />,
      title: "Ricette su misura",
      text: "Ricevi suggerimenti di ricette basate su cosa hai in dispensa e cosa sta per scadere.",
    },
  ],
  restaurant_owner: [
    {
      icon: <Sparkles className="h-10 w-10" />,
      title: "Benvenuto in Cibarius!",
      text: "Gestisci il tuo ristorante: magazzino, scadenze, HACCP e molto altro in un'unica app.",
    },
    {
      icon: <Package className="h-10 w-10" />,
      title: "Magazzino intelligente",
      text: "Scansiona prodotti in entrata con foto o barcode. Traccia lotti, quantità e scadenze.",
    },
    {
      icon: <Clock className="h-10 w-10" />,
      title: "Scadenze e HACCP",
      text: "Alert automatici per scadenze, checklist HACCP digitali e registro temperature integrato.",
    },
    {
      icon: <ClipboardList className="h-10 w-10" />,
      title: "Preparazioni e etichette",
      text: "Crea preparazioni con tracciabilità completa, stampa etichette con allergeni e lotto.",
    },
    {
      icon: <Users className="h-10 w-10" />,
      title: "Gestisci il team",
      text: "Aggiungi collaboratori con ruoli diversi. Tutto tracciato e sotto controllo.",
    },
  ],
  professional: [
    {
      icon: <Sparkles className="h-10 w-10" />,
      title: "Benvenuto in Cibarius!",
      text: "La piattaforma per nutrizionisti: segui i tuoi clienti, crea piani alimentari e monitora i progressi.",
    },
    {
      icon: <Users className="h-10 w-10" />,
      title: "Gestisci i clienti",
      text: "Invita i tuoi clienti con un codice, visualizza la loro dispensa e i pasti registrati.",
    },
    {
      icon: <ClipboardList className="h-10 w-10" />,
      title: "Piani alimentari",
      text: "Crea piani personalizzati con macro target per pasto. I clienti li vedono in tempo reale.",
    },
    {
      icon: <BarChart3 className="h-10 w-10" />,
      title: "Monitora i progressi",
      text: "Controlla aderenza al piano, misurazioni corporee e report settimanali automatici.",
    },
    {
      icon: <MessageSquare className="h-10 w-10" />,
      title: "Comunica con i clienti",
      text: "Messaggi diretti, suggerimenti e ricette personalizzate, tutto dentro l'app.",
    },
  ],
};

const STORAGE_KEY = "cibarius_onboarding_done";

export const shouldShowOnboarding = (): boolean => {
  return !localStorage.getItem(STORAGE_KEY);
};

export const markOnboardingDone = () => {
  localStorage.setItem(STORAGE_KEY, "1");
};

interface Props {
  role: AppRole | null;
  onComplete: () => void;
}

const OnboardingWalkthrough = ({ role, onComplete }: Props) => {
  const slides = SLIDES_BY_ROLE[role || "user"] || SLIDES_BY_ROLE.user;
  const [current, setCurrent] = useState(0);

  const handleSkip = useCallback(() => {
    markOnboardingDone();
    onComplete();
  }, [onComplete]);

  const handleNext = useCallback(() => {
    if (current < slides.length - 1) {
      setCurrent(current + 1);
    } else {
      markOnboardingDone();
      onComplete();
    }
  }, [current, slides.length, onComplete]);

  const slide = slides[current];
  const isLast = current === slides.length - 1;

  return (
    <div className="fixed inset-0 z-[100] flex flex-col bg-background">
      {/* Top bar with skip */}
      <div className="flex items-center justify-between px-4 pt-4">
        <img src={cibariusLogo} alt="Cibarius" className="h-7" />
        <Button
          variant="ghost"
          size="sm"
          onClick={handleSkip}
          className="text-muted-foreground hover:text-foreground"
        >
          <X className="h-4 w-4 mr-1" />
          Salta
        </Button>
      </div>

      {/* Progress bar */}
      <div className="flex gap-1.5 px-6 mt-4">
        {slides.map((_, i) => (
          <div
            key={i}
            className={`h-1 flex-1 rounded-full transition-all duration-300 ${
              i <= current ? "bg-primary" : "bg-muted"
            }`}
          />
        ))}
      </div>

      {/* Slide content */}
      <div className="flex-1 flex flex-col items-center justify-center px-8 text-center">
        <div className="mb-8 flex h-24 w-24 items-center justify-center rounded-3xl bg-primary/10 text-primary">
          {slide.icon}
        </div>
        <h2 className="text-2xl font-display font-bold text-foreground mb-3 leading-tight">
          {slide.title}
        </h2>
        <p className="text-base text-muted-foreground leading-relaxed max-w-sm">
          {slide.text}
        </p>
      </div>

      {/* Bottom navigation */}
      <div className="px-6 pb-8 space-y-3">
        <Button className="w-full h-12 text-base" onClick={handleNext}>
          {isLast ? "Inizia ad usare Cibarius" : "Avanti"}
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
        {!isLast && (
          <p className="text-center text-xs text-muted-foreground">
            {current + 1} di {slides.length}
          </p>
        )}
      </div>
    </div>
  );
};

export default OnboardingWalkthrough;
