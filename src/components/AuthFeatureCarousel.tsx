import { useState, useEffect, useCallback } from "react";
import Lottie from "lottie-react";
import calendarAnim from "@/assets/lottie/calendar.json";
import scanAnim from "@/assets/lottie/scan.json";
import nutritionAnim from "@/assets/lottie/nutrition.json";

interface Slide {
  animation: object;
  title: string;
  text: string;
}

const DEFAULT_SLIDES: Slide[] = [
  {
    animation: calendarAnim,
    title: "Scadenze sotto controllo",
    text: "Prodotti e preparazioni in frigo, dispensa e congelatore.",
  },
  {
    animation: scanAnim,
    title: "Foto o barcode",
    text: "L'AI legge etichetta, calorie, macro e scadenza.",
  },
  {
    animation: nutritionAnim,
    title: "Piano e ricette",
    text: "Segui la posologia e ricevi ricette bilanciate dal professionista.",
  },
];

interface Props {
  slides?: Slide[];
  intervalMs?: number;
}

const AuthFeatureCarousel = ({ slides = DEFAULT_SLIDES, intervalMs = 5000 }: Props) => {
  const [active, setActive] = useState(0);

  const goTo = useCallback((idx: number) => {
    setActive(idx);
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      setActive((prev) => (prev + 1) % slides.length);
    }, intervalMs);
    return () => clearInterval(timer);
  }, [slides.length, intervalMs]);

  const [touchStart, setTouchStart] = useState<number | null>(null);
  const handleTouchStart = (e: React.TouchEvent) => setTouchStart(e.touches[0].clientX);
  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStart === null) return;
    const diff = e.changedTouches[0].clientX - touchStart;
    if (Math.abs(diff) > 50) {
      if (diff < 0) goTo((active + 1) % slides.length);
      else goTo((active - 1 + slides.length) % slides.length);
    }
    setTouchStart(null);
  };

  return (
    <div
      className="w-full select-none"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      <div className="relative h-[240px] flex items-center justify-center overflow-hidden">
        {slides.map((slide, i) => (
          <div
            key={i}
            className="absolute inset-0 flex flex-col items-center justify-center px-6 text-center transition-all duration-600 ease-in-out"
            style={{
              opacity: i === active ? 1 : 0,
              transform: i === active ? "translateY(0) scale(1)" : "translateY(12px) scale(0.97)",
              pointerEvents: i === active ? "auto" : "none",
            }}
          >
            <div className="h-[140px] w-[140px] mb-3 drop-shadow-lg">
              <Lottie
                animationData={slide.animation}
                loop
                autoplay
                style={{ width: 140, height: 140 }}
              />
            </div>
            <h3 className="font-display text-lg font-semibold text-primary-foreground leading-tight">
              {slide.title}
            </h3>
            <p className="mt-1 text-sm text-primary-foreground/75 leading-snug max-w-[280px]">
              {slide.text}
            </p>
          </div>
        ))}
      </div>

      {/* Pill dots */}
      <div className="flex items-center justify-center gap-2 mt-2">
        {slides.map((_, i) => (
          <button
            key={i}
            type="button"
            onClick={() => goTo(i)}
            className={`rounded-full transition-all duration-300 ${
              i === active
                ? "w-6 h-[5px] bg-primary-foreground"
                : "w-[5px] h-[5px] bg-primary-foreground/35 hover:bg-primary-foreground/55"
            }`}
            aria-label={`Slide ${i + 1}`}
          />
        ))}
      </div>
    </div>
  );
};

export default AuthFeatureCarousel;
