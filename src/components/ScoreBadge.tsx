import { cn } from "@/lib/utils";

interface ScoreBadgeProps {
  score: number;
  size?: "sm" | "md" | "lg";
}

const getScoreColor = (score: number) => {
  if (score >= 75) return "bg-success";
  if (score >= 50) return "bg-warning";
  return "bg-destructive";
};

const getScoreLabel = (score: number) => {
  if (score >= 75) return "Eccellente";
  if (score >= 50) return "Mediocre";
  return "Scarso";
};

const ScoreBadge = ({ score, size = "md" }: ScoreBadgeProps) => {
  const sizeClasses = {
    sm: "h-5 w-5 text-[10px]",
    md: "h-6 w-6 text-xs",
    lg: "h-8 w-8 text-sm",
  };

  return (
    <div className="flex items-center gap-2">
      <span className={cn("rounded-full inline-flex items-center justify-center", getScoreColor(score), sizeClasses[size])} />
      <div>
        <span className="text-lg font-bold text-foreground">{score}/100</span>
        <p className="text-xs text-muted-foreground">{getScoreLabel(score)}</p>
      </div>
    </div>
  );
};

export { ScoreBadge, getScoreColor, getScoreLabel };
