import { type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

interface EmptyStateAction {
  label: string;
  onClick: () => void;
  icon?: LucideIcon;
  variant?: "default" | "outline" | "secondary" | "ghost";
}

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  actions?: EmptyStateAction[];
}

const EmptyState = ({ icon: Icon, title, description, actions }: EmptyStateProps) => (
  <Card className="border-2 border-accent">
    <CardContent className="flex flex-col items-center py-10 text-center">
      <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
        <Icon className="h-7 w-7 text-primary" />
      </div>
      <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      {description && (
        <p className="mt-1 max-w-[240px] text-xs text-muted-foreground">{description}</p>
      )}
      {actions && actions.length > 0 && (
        <div className="mt-4 flex flex-wrap justify-center gap-2">
          {actions.map((a) => (
            <Button
              key={a.label}
              size="sm"
              variant={a.variant ?? "default"}
              className="gap-1.5"
              onClick={a.onClick}
            >
              {a.icon && <a.icon className="h-4 w-4" />}
              {a.label}
            </Button>
          ))}
        </div>
      )}
    </CardContent>
  </Card>
);

export default EmptyState;
