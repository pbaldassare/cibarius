import { useState, useEffect, useCallback } from "react";
import { ShieldCheck, Camera, Target, ChefHat } from "lucide-react";

interface Slide {
  icon: typeof ShieldCheck;
  title: string;
  text: string;
}

const DEFAULT_SLIDES: Slide[] = [
  {
    icon: ShieldCheck,
    title: "Scadenze sotto controllo",
    text: "Prodotti e preparazioni in frigo, dispensa e congelatore.",
  },
  {
    icon: Camera,
    title: "Aggiungi con foto o barcode",
    text: "L'AI legge etichetta, calorie, macro e scadenza.",
  },
  {
    icon: Target,
    title: "Pasti e obiettivi",
    text: "Registra i pasti e segui la posologia del tuo piano.",
  },
  {
    icon: ChefHat,
    title: "Ricette dai ristoranti",
    text: "Scopri ricette pubbliche e replicale a casa.",
  },
];

interface Props {
  slides?: Slide[];
  intervalMs?: number;
}

const AuthFeatureCarousel = ({ slides = DEFAULT_SLIDES, intervalMs = 4500 }: Props) => {
  const [active, setActive] = useState(0);
  const [direction, setDirection] = useState(1);

  const goTo = useCallback(
    (idx: number) => {
      setDirection(idx > active ? 1 : -1);
      setActive(idx);
    },
    [active],
  );

  useEffect(() => {
    const timer = setInterval(() => {
      setDirection(1);
      setActive((prev) => (prev + 1) % slides.length);
    }, intervalMs);
    return () => clearInterval(timer);
  }, [slides.length, intervalMs]);

  // Touch / swipe support
  const [touchStart, setTouchStart] = useState<number | null>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStart(e.touches[0].clientX);
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStart === null) return;
    const diff = e.changedTouches[0].clientX - touchStart;
    if (Math.abs(diff) > 50) {
      if (diff < 0) {
        goTo((active + 1) % slides.length);
      } else {
        goTo((active - 1 + slides.length) % slides.length);
      }
    }
    setTouchStart(null);
  };

  const Icon = slides[active].icon;

  return (
    <div
      className="w-full max-w-md mx-auto select-none"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Slide content */}
      <div className="relative h-[130px] flex items-center justify-center overflow-hidden">
        <div
          key={active}
          className="absolute inset-0 flex flex-col items-center justify-center px-6 text-center animate-fade-in"
        >
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 mb-3">
            <Icon className="h-5 w-5 text-primary" />
          </div>
          <h3 className="text-base font-semibold text-foreground leading-tight">
            {slides[active].title}
          </h3>
          <p className="mt-1 text-sm text-muted-foreground leading-snug max-w-[280px]">
            {slides[active].text}
          </p>
        </div>
      </div>

      {/* Dots */}
      <div className="flex items-center justify-center gap-1.5 mt-1">
        {slides.map((_, i) => (
          <button
            key={i}
            type="button"
            onClick={() => goTo(i)}
            className={`rounded-full transition-all duration-300 ${
              i === active
                ? "w-5 h-1.5 bg-primary"
                : "w-1.5 h-1.5 bg-muted-foreground/30 hover:bg-muted-foreground/50"
            }`}
            aria-label={`Slide ${i + 1}`}
          />
        ))}
      </div>
    </div>
  );
};

export default AuthFeatureCarousel;
