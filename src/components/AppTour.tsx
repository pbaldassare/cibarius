import { useEffect, useState, useRef, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useTour, TOUR_STEPS } from "./AppTourContext";
import { X, ChevronLeft, ChevronRight } from "lucide-react";

const AppTour = () => {
  const { isActive, currentStep, nextStep, prevStep, stopTour, totalSteps } = useTour();
  const navigate = useNavigate();
  const location = useLocation();
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const [cursorPos, setCursorPos] = useState({ x: 0, y: 0 });
  const [showTooltip, setShowTooltip] = useState(false);
  const rafRef = useRef<number>(0);
  const retryRef = useRef<number>(0);

  const step = TOUR_STEPS[currentStep];

  const findAndHighlight = useCallback(() => {
    if (!step) return;

    const el = document.querySelector(`[data-tour="${step.selector}"]`);
    if (!el) {
      // Retry a few times for elements that need to render
      if (retryRef.current < 20) {
        retryRef.current++;
        rafRef.current = window.setTimeout(findAndHighlight, 150);
        return;
      }
      // Skip this step if element not found
      setShowTooltip(false);
      return;
    }

    retryRef.current = 0;
    const rect = el.getBoundingClientRect();
    setTargetRect(rect);

    // Animate cursor to target center
    setCursorPos({ x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 });

    // Scroll element into view if needed
    el.scrollIntoView({ behavior: "smooth", block: "center" });

    // Show tooltip after cursor animation
    setShowTooltip(false);
    setTimeout(() => {
      // Re-read rect after scroll
      const updatedRect = el.getBoundingClientRect();
      setTargetRect(updatedRect);
      setCursorPos({ x: updatedRect.left + updatedRect.width / 2, y: updatedRect.top + updatedRect.height / 2 });
      setShowTooltip(true);
    }, 500);
  }, [step]);

  // Navigate to required page if needed
  useEffect(() => {
    if (!isActive || !step) return;

    setShowTooltip(false);
    retryRef.current = 0;

    if (step.page && location.pathname !== step.page) {
      navigate(step.page);
      // Wait for navigation + render
      rafRef.current = window.setTimeout(findAndHighlight, 400);
    } else {
      rafRef.current = window.setTimeout(findAndHighlight, 100);
    }

    return () => {
      if (rafRef.current) clearTimeout(rafRef.current);
    };
  }, [isActive, currentStep, step, location.pathname, navigate, findAndHighlight]);

  // Handle window resize
  useEffect(() => {
    if (!isActive) return;
    const handler = () => findAndHighlight();
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, [isActive, findAndHighlight]);

  if (!isActive || !step) return null;

  // Calculate tooltip position
  const tooltipStyle: React.CSSProperties = {};
  let tooltipPosition: "top" | "bottom" = "bottom";

  if (targetRect) {
    const spaceBelow = window.innerHeight - targetRect.bottom;
    const spaceAbove = targetRect.top;

    if (spaceBelow > 200 || spaceBelow > spaceAbove) {
      tooltipPosition = "bottom";
      tooltipStyle.top = targetRect.bottom + 16;
    } else {
      tooltipPosition = "top";
      tooltipStyle.bottom = window.innerHeight - targetRect.top + 16;
    }

    // Center horizontally, clamp to viewport
    const centerX = targetRect.left + targetRect.width / 2;
    const tooltipWidth = 300;
    tooltipStyle.left = Math.max(16, Math.min(centerX - tooltipWidth / 2, window.innerWidth - tooltipWidth - 16));
    tooltipStyle.width = tooltipWidth;
  }

  return (
    <div className="fixed inset-0 z-[9999]" style={{ pointerEvents: "auto" }}>
      {/* Overlay with spotlight cutout */}
      <svg className="absolute inset-0 w-full h-full" style={{ pointerEvents: "none" }}>
        <defs>
          <mask id="tour-mask">
            <rect width="100%" height="100%" fill="white" />
            {targetRect && (
              <rect
                x={targetRect.left - 6}
                y={targetRect.top - 6}
                width={targetRect.width + 12}
                height={targetRect.height + 12}
                rx="12"
                fill="black"
              />
            )}
          </mask>
        </defs>
        <rect
          width="100%"
          height="100%"
          fill="rgba(0,0,0,0.6)"
          mask="url(#tour-mask)"
          style={{ pointerEvents: "auto" }}
          onClick={(e) => e.stopPropagation()}
        />
      </svg>

      {/* Spotlight border glow */}
      {targetRect && (
        <div
          className="absolute rounded-xl border-2 border-primary shadow-[0_0_20px_rgba(var(--primary),0.3)] transition-all duration-500 ease-out"
          style={{
            left: targetRect.left - 6,
            top: targetRect.top - 6,
            width: targetRect.width + 12,
            height: targetRect.height + 12,
            pointerEvents: "none",
          }}
        />
      )}

      {/* Animated cursor */}
      <div
        className="absolute z-[10001] transition-all duration-500 ease-out"
        style={{
          left: cursorPos.x - 12,
          top: cursorPos.y - 4,
          pointerEvents: "none",
          opacity: showTooltip ? 0 : 1,
        }}
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
          <path d="M5 3L19 12L12 13L9 20L5 3Z" fill="hsl(var(--primary))" stroke="white" strokeWidth="1.5" strokeLinejoin="round" />
        </svg>
      </div>

      {/* Tooltip */}
      {showTooltip && targetRect && (
        <div
          className="absolute z-[10002] animate-in fade-in slide-in-from-bottom-2 duration-300"
          style={{ ...tooltipStyle, pointerEvents: "auto" }}
        >
          {/* Arrow */}
          <div
            className={`absolute left-1/2 -translate-x-1/2 w-3 h-3 rotate-45 bg-card ${
              tooltipPosition === "bottom" ? "-top-1.5" : "-bottom-1.5"
            }`}
          />

          <div className="relative rounded-2xl bg-card shadow-xl border border-border overflow-hidden">
            {/* Header with step counter */}
            <div className="px-4 pt-3 pb-0 flex items-center justify-between">
              <span className="text-[10px] font-bold text-primary uppercase tracking-wider">
                {currentStep + 1} / {totalSteps}
              </span>
              <button
                onClick={stopTour}
                className="h-6 w-6 flex items-center justify-center rounded-full hover:bg-muted transition-colors"
              >
                <X className="h-3.5 w-3.5 text-muted-foreground" />
              </button>
            </div>

            {/* Content */}
            <div className="px-4 pt-1.5 pb-3">
              <h4 className="text-[15px] font-bold text-foreground leading-snug">{step.title}</h4>
              <p className="text-[12px] text-muted-foreground mt-1 leading-relaxed">{step.description}</p>
            </div>

            {/* Progress bar */}
            <div className="h-1 bg-muted">
              <div
                className="h-full bg-primary transition-all duration-300 rounded-r-full"
                style={{ width: `${((currentStep + 1) / totalSteps) * 100}%` }}
              />
            </div>

            {/* Actions */}
            <div className="px-4 py-2.5 flex items-center justify-between">
              <button
                onClick={stopTour}
                className="text-[12px] text-muted-foreground font-medium hover:text-foreground transition-colors"
              >
                Salta tour
              </button>
              <div className="flex items-center gap-2">
                {currentStep > 0 && (
                  <button
                    onClick={prevStep}
                    className="flex items-center gap-1 h-8 px-3 rounded-lg text-[12px] font-semibold border border-border text-foreground hover:bg-muted transition-colors"
                  >
                    <ChevronLeft className="h-3.5 w-3.5" />
                    Indietro
                  </button>
                )}
                <button
                  onClick={nextStep}
                  className="flex items-center gap-1 h-8 px-4 rounded-lg text-[12px] font-semibold btn-brand text-primary-foreground"
                >
                  {currentStep === totalSteps - 1 ? "Fine!" : "Avanti"}
                  {currentStep < totalSteps - 1 && <ChevronRight className="h-3.5 w-3.5" />}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AppTour;
