import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Search, Camera, Heart, Utensils, Zap, X } from "lucide-react";

interface Props {
  onSearchOpen: () => void;
  onQuickDayOpen: () => void;
}

const actions = [
  { key: "search", label: "Cerca alimento", icon: Search, color: "bg-primary" },
  { key: "photo", label: "Scatta foto", icon: Camera, color: "bg-accent" },
  { key: "eat-out", label: "Mangio fuori", icon: Utensils, color: "bg-secondary-foreground" },
  { key: "favorites", label: "Pasti preferiti", icon: Heart, color: "bg-destructive" },
  { key: "quick-day", label: "Giorno veloce", icon: Zap, color: "bg-success" },
];

const MealFAB = ({ onSearchOpen, onQuickDayOpen }: Props) => {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  const handleAction = (key: string) => {
    setOpen(false);
    switch (key) {
      case "search":
        onSearchOpen();
        break;
      case "photo":
        navigate("/meals/photo");
        break;
      case "eat-out":
        navigate("/meals/photo");
        break;
      case "favorites":
        // Scroll to favorites section
        document.getElementById("favorite-combos")?.scrollIntoView({ behavior: "smooth" });
        break;
      case "quick-day":
        onQuickDayOpen();
        break;
    }
  };

  return (
    <>
      {/* Backdrop */}
      {open && (
        <div
          className="fixed inset-0 bg-foreground/20 backdrop-blur-sm z-40"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Action items */}
      <div className="fixed bottom-[calc(var(--nav-height)+env(safe-area-inset-bottom,0px)+24px)] right-4 z-50 flex flex-col-reverse items-end gap-2">
        {open && actions.map((action, idx) => {
          const Icon = action.icon;
          return (
            <button
              key={action.key}
              onClick={() => handleAction(action.key)}
              className="flex items-center gap-2.5 rounded-2xl bg-card border border-border shadow-lg pl-4 pr-3 py-2.5 animate-in slide-in-from-bottom-2 fade-in"
              style={{ animationDelay: `${idx * 40}ms`, animationFillMode: "both" }}
            >
              <span className="text-sm font-medium text-foreground whitespace-nowrap">{action.label}</span>
              <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${action.color} text-primary-foreground`}>
                <Icon className="h-4 w-4" />
              </div>
            </button>
          );
        })}

        {/* Main FAB button */}
        <button
          onClick={() => setOpen(!open)}
          className={`flex h-14 w-14 items-center justify-center rounded-2xl shadow-xl transition-all duration-200 ${
            open
              ? "bg-muted rotate-45"
              : "bg-primary"
          }`}
        >
          {open ? (
            <X className="h-6 w-6 text-foreground" />
          ) : (
            <Plus className="h-6 w-6 text-primary-foreground" />
          )}
        </button>
      </div>
    </>
  );
};

export default MealFAB;
