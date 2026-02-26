import { useState, useEffect, useCallback } from "react";
import expiryIllustration from "@/assets/illustrations/expiry.svg";
import scanIllustration from "@/assets/illustrations/scan.svg";
import nutritionIllustration from "@/assets/illustrations/nutrition.svg";

interface Slide {
  image: string;
  title: string;
  text: string;
}

const DEFAULT_SLIDES: Slide[] = [
  {
    image: expiryIllustration,
    title: "Scadenze sotto controllo",
    text: "Tieni sotto controllo prodotti e preparazioni.",
  },
  {
    image: scanIllustration,
    title: "Foto o barcode",
    text: "L'AI legge etichetta, calorie, macro e scadenza.",
  },
  {
    image: nutritionIllustration,
    title: "Piano e ricette",
    text: "Segui il piano del professionista e ricevi ricette su misura.",
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
      <div className="relative h-[260px] flex items-center justify-center overflow-hidden">
        {slides.map((slide, i) => (
          <div
            key={i}
            className="absolute inset-0 flex flex-col items-center justify-center px-6 text-center"
            style={{
              opacity: i === active ? 1 : 0,
              transform: i === active ? "translateY(0) scale(1)" : "translateY(16px) scale(0.96)",
              transition: "opacity 0.6s ease, transform 0.6s ease",
              pointerEvents: i === active ? "auto" : "none",
            }}
          >
            <img
              src={slide.image}
              alt={slide.title}
              className="h-[160px] w-auto object-contain mb-4 animate-float drop-shadow-md"
            />
            <h3 className="font-display text-lg font-semibold text-primary-foreground leading-tight">
              {slide.title}
            </h3>
            <p className="mt-1 text-sm text-primary-foreground/70 leading-snug max-w-[280px]">
              {slide.text}
            </p>
          </div>
        ))}
      </div>

      {/* Pill dots */}
      <div className="flex items-center justify-center gap-2 mt-1">
        {slides.map((_, i) => (
          <button
            key={i}
            type="button"
            onClick={() => goTo(i)}
            className={`rounded-full transition-all duration-300 ${
              i === active
                ? "w-6 h-[5px] bg-primary-foreground"
                : "w-[5px] h-[5px] bg-primary-foreground/30 hover:bg-primary-foreground/50"
            }`}
            aria-label={`Slide ${i + 1}`}
          />
        ))}
      </div>
    </div>
  );
};

export default AuthFeatureCarousel;
