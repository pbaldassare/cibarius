import MobileHeader from "@/components/MobileHeader";
import { Plus } from "lucide-react";

const meals = [
  { time: "Colazione", items: ["Yogurt Greco", "Muesli Bio"], score: 86, emoji: "☀️" },
  { time: "Pranzo", items: ["Pasta Barilla", "Olio Extra Vergine"], score: 78, emoji: "🌤️" },
  { time: "Cena", items: ["Riso Basmati", "Pane Integrale"], score: 84, emoji: "🌙" },
];

const PastiPage = () => {
  return (
    <div>
      <MobileHeader title="Pasti" />
      <main className="space-y-4 px-4 py-5">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-foreground">Oggi</h2>
          <button className="flex items-center gap-1 text-sm font-medium text-primary">
            <Plus size={16} />
            Aggiungi
          </button>
        </div>

        <div className="space-y-3">
          {meals.map((meal) => (
            <div
              key={meal.time}
              className="rounded-xl border border-border bg-card p-4 space-y-2"
            >
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 font-semibold text-card-foreground">
                  <span>{meal.emoji}</span>
                  {meal.time}
                </span>
                <span className="text-sm font-medium text-primary">{meal.score}/100</span>
              </div>
              <p className="text-sm text-muted-foreground">
                {meal.items.join(", ")}
              </p>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
};

export default PastiPage;
