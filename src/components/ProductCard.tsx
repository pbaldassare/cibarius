import { cn } from "@/lib/utils";
import { getScoreColor } from "./ScoreBadge";
import { Heart } from "lucide-react";

interface ProductCardProps {
  name: string;
  brand: string;
  score: number;
  emoji?: string;
  onClick?: () => void;
  isFavorite?: boolean;
  onToggleFavorite?: () => void;
}

const getLabel = (score: number) => {
  if (score >= 75) return "Eccellente";
  if (score >= 50) return "Mediocre";
  return "Scarso";
};

const ProductCard = ({ name, brand, score, emoji = "🍫", onClick, isFavorite, onToggleFavorite }: ProductCardProps) => {
  return (
    <button
      onClick={onClick}
      className="flex w-full items-center gap-4 rounded-xl bg-card p-4 text-left shadow-sm border border-border transition-shadow hover:shadow-md active:scale-[0.98]"
    >
      <div className="flex h-14 w-14 items-center justify-center rounded-lg bg-secondary text-2xl shrink-0">
        {emoji}
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-card-foreground truncate">{name}</p>
        <p className="text-sm text-muted-foreground">{brand}</p>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {onToggleFavorite && (
          <button
            onClick={(e) => { e.stopPropagation(); onToggleFavorite(); }}
            className="p-1 transition-colors"
          >
            <Heart
              className={`h-4 w-4 ${isFavorite ? "fill-destructive text-destructive" : "text-muted-foreground"}`}
            />
          </button>
        )}
        <span className={cn("h-3 w-3 rounded-full", getScoreColor(score))} />
        <span className="text-sm font-semibold text-foreground">{score}</span>
      </div>
    </button>
  );
};

export default ProductCard;
