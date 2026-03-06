import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown, ChevronUp, Clock, Flame } from "lucide-react";

interface Ingredient {
  name: string;
  grams: number;
  kcal: number;
  protein_g: number;
  carbs_g: number;
  fats_g: number;
}

interface MealRecipeCardProps {
  title: string;
  instructions: string | null;
  prep_time_min: number;
  ingredients: Ingredient[];
  kcal_total: number;
  protein_total: number;
  carbs_total: number;
  fats_total: number;
  portionScale?: number; // 1 for male, portion_scale_female for female
  onRegister?: (ingredients: Ingredient[], title: string) => void;
}

const MealRecipeCard = ({
  title,
  instructions,
  prep_time_min,
  ingredients,
  kcal_total,
  protein_total,
  carbs_total,
  fats_total,
  portionScale = 1,
  onRegister,
}: MealRecipeCardProps) => {
  const [open, setOpen] = useState(false);

  const scale = (v: number) => Math.round(v * portionScale);

  return (
    <Card className="border border-border/50 shadow-none bg-muted/30">
      <CardContent className="p-3 space-y-2">
        <div className="flex items-start justify-between gap-2">
          <h4 className="font-medium text-sm text-foreground leading-tight">{title}</h4>
          <div className="flex items-center gap-1.5 shrink-0">
            <Badge variant="secondary" className="text-[10px] font-normal gap-1 px-1.5 py-0.5">
              <Clock className="h-2.5 w-2.5" />
              {prep_time_min}'
            </Badge>
            <Badge variant="secondary" className="text-[10px] font-normal gap-1 px-1.5 py-0.5">
              <Flame className="h-2.5 w-2.5" />
              {scale(kcal_total)}
            </Badge>
          </div>
        </div>

        <div className="flex gap-3 text-[10px] text-muted-foreground">
          <span>P {scale(protein_total)}g</span>
          <span>C {scale(carbs_total)}g</span>
          <span>G {scale(fats_total)}g</span>
        </div>

        {instructions && (
          <p className="text-xs text-muted-foreground/80 leading-relaxed">{instructions}</p>
        )}

        <Collapsible open={open} onOpenChange={setOpen}>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="sm" className="w-full text-[11px] h-7 text-muted-foreground">
              {open ? <ChevronUp className="h-3 w-3 mr-1" /> : <ChevronDown className="h-3 w-3 mr-1" />}
              Ingredienti ({ingredients.length})
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="space-y-1 pt-1">
              {ingredients.map((ing, i) => (
                <div key={i} className="flex justify-between text-[11px] text-muted-foreground px-1">
                  <span>{ing.name}</span>
                  <span className="tabular-nums">{scale(ing.grams)}g · {scale(ing.kcal)} kcal</span>
                </div>
              ))}
            </div>
          </CollapsibleContent>
        </Collapsible>

        {onRegister && (
          <Button
            variant="outline"
            size="sm"
            className="w-full text-xs h-8 mt-1"
            onClick={() => onRegister(ingredients.map(ing => ({
              ...ing,
              grams: scale(ing.grams),
              kcal: scale(ing.kcal),
              protein_g: scale(ing.protein_g),
              carbs_g: scale(ing.carbs_g),
              fats_g: scale(ing.fats_g),
            })), title)}
          >
            Registra pasto
          </Button>
        )}
      </CardContent>
    </Card>
  );
};

export default MealRecipeCard;
