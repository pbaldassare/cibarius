import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Loader2, Plus, Trash2, Flame, Send, Pencil } from "lucide-react";

export interface RecipeIngredient {
  name: string;
  grams: number;
  kcal: number;
  protein_g: number;
  carbs_g: number;
  fats_g: number;
}

export interface RecipeData {
  title: string;
  instructions: string;
  ingredients: RecipeIngredient[];
  kcal_total: number;
  protein_total: number;
  carbs_total: number;
  fats_total: number;
}

interface ProRecipeEditorProps {
  initialRecipe?: RecipeData | null;
  onSend: (recipe: RecipeData) => Promise<void>;
  sending?: boolean;
  sendLabel?: string;
}

const emptyIngredient = (): RecipeIngredient => ({
  name: "", grams: 100, kcal: 0, protein_g: 0, carbs_g: 0, fats_g: 0,
});

const emptyRecipe = (): RecipeData => ({
  title: "", instructions: "", ingredients: [emptyIngredient()],
  kcal_total: 0, protein_total: 0, carbs_total: 0, fats_total: 0,
});

export default function ProRecipeEditor({ initialRecipe, onSend, sending, sendLabel = "Invia al cliente" }: ProRecipeEditorProps) {
  const [recipe, setRecipe] = useState<RecipeData>(initialRecipe ?? emptyRecipe());
  const [editing, setEditing] = useState(!initialRecipe);

  const recalcTotals = (ingredients: RecipeIngredient[]): Partial<RecipeData> => ({
    kcal_total: Math.round(ingredients.reduce((s, i) => s + i.kcal, 0)),
    protein_total: Math.round(ingredients.reduce((s, i) => s + i.protein_g, 0) * 10) / 10,
    carbs_total: Math.round(ingredients.reduce((s, i) => s + i.carbs_g, 0) * 10) / 10,
    fats_total: Math.round(ingredients.reduce((s, i) => s + i.fats_g, 0) * 10) / 10,
  });

  const updateIngredient = (idx: number, field: keyof RecipeIngredient, value: string | number) => {
    const next = [...recipe.ingredients];
    next[idx] = { ...next[idx], [field]: typeof value === "string" && field !== "name" ? parseFloat(value) || 0 : value };
    setRecipe({ ...recipe, ingredients: next, ...recalcTotals(next) });
  };

  const addIngredient = () => {
    const next = [...recipe.ingredients, emptyIngredient()];
    setRecipe({ ...recipe, ingredients: next });
  };

  const removeIngredient = (idx: number) => {
    const next = recipe.ingredients.filter((_, i) => i !== idx);
    setRecipe({ ...recipe, ingredients: next, ...recalcTotals(next) });
  };

  const handleSend = async () => {
    await onSend(recipe);
  };

  // Read-only preview mode (when initialRecipe was provided and not editing)
  if (!editing && initialRecipe) {
    return (
      <Card className="border-2 border-primary/30">
        <CardHeader className="pb-1 pt-3 px-4">
          <CardTitle className="text-sm flex items-center justify-between">
            <span>{recipe.title}</span>
            <Button size="sm" variant="ghost" onClick={() => setEditing(true)} className="gap-1 text-xs">
              <Pencil className="h-3 w-3" /> Modifica
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-3 space-y-2">
          <div className="flex gap-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-0.5"><Flame className="h-3 w-3" /> {recipe.kcal_total} kcal</span>
            <span>P: {recipe.protein_total}g</span>
            <span>C: {recipe.carbs_total}g</span>
            <span>G: {recipe.fats_total}g</span>
          </div>
          <div className="text-xs space-y-0.5">
            {recipe.ingredients.map((ing, i) => (
              <p key={i}>• {ing.grams}g {ing.name} <span className="text-muted-foreground">({ing.kcal} kcal)</span></p>
            ))}
          </div>
          <p className="text-xs text-muted-foreground whitespace-pre-line">{recipe.instructions}</p>
          <Button size="sm" className="w-full gap-2" onClick={handleSend} disabled={sending}>
            {sending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
            {sendLabel}
          </Button>
        </CardContent>
      </Card>
    );
  }

  // Editor mode
  return (
    <Card className="border-2 border-primary/20">
      <CardContent className="py-3 space-y-3">
        <Input
          placeholder="Titolo ricetta (es. Insalata proteica)"
          value={recipe.title}
          onChange={(e) => setRecipe({ ...recipe, title: e.target.value })}
        />

        <div className="space-y-2">
          <p className="text-xs font-semibold text-muted-foreground">Ingredienti</p>
          {recipe.ingredients.map((ing, idx) => (
            <div key={idx} className="grid grid-cols-[1fr_60px_55px_55px_55px_55px_28px] gap-1 items-center">
              <Input
                placeholder="Nome"
                value={ing.name}
                onChange={(e) => updateIngredient(idx, "name", e.target.value)}
                className="text-xs h-8"
              />
              <Input
                type="number"
                placeholder="g"
                value={ing.grams || ""}
                onChange={(e) => updateIngredient(idx, "grams", e.target.value)}
                className="text-xs h-8"
              />
              <Input
                type="number"
                placeholder="kcal"
                value={ing.kcal || ""}
                onChange={(e) => updateIngredient(idx, "kcal", e.target.value)}
                className="text-xs h-8"
              />
              <Input
                type="number"
                placeholder="P"
                value={ing.protein_g || ""}
                onChange={(e) => updateIngredient(idx, "protein_g", e.target.value)}
                className="text-xs h-8"
              />
              <Input
                type="number"
                placeholder="C"
                value={ing.carbs_g || ""}
                onChange={(e) => updateIngredient(idx, "carbs_g", e.target.value)}
                className="text-xs h-8"
              />
              <Input
                type="number"
                placeholder="G"
                value={ing.fats_g || ""}
                onChange={(e) => updateIngredient(idx, "fats_g", e.target.value)}
                className="text-xs h-8"
              />
              <button
                onClick={() => removeIngredient(idx)}
                className="text-muted-foreground hover:text-destructive h-8 flex items-center justify-center"
                disabled={recipe.ingredients.length <= 1}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
          <div className="flex items-center gap-2 text-[10px] text-muted-foreground px-1">
            <span className="flex-1" />
            <span>g</span>
            <span className="w-[55px] text-center">kcal</span>
            <span className="w-[55px] text-center">Prot</span>
            <span className="w-[55px] text-center">Carb</span>
            <span className="w-[55px] text-center">Grassi</span>
            <span className="w-7" />
          </div>
          <Button size="sm" variant="outline" className="w-full gap-1 text-xs" onClick={addIngredient}>
            <Plus className="h-3 w-3" /> Aggiungi ingrediente
          </Button>
        </div>

        {/* Totals */}
        <div className="flex gap-3 text-xs font-medium rounded-lg bg-secondary/50 p-2">
          <Badge variant="secondary" className="gap-1">
            <Flame className="h-3 w-3" /> {recipe.kcal_total} kcal
          </Badge>
          <span>P: {recipe.protein_total}g</span>
          <span>C: {recipe.carbs_total}g</span>
          <span>G: {recipe.fats_total}g</span>
        </div>

        <Textarea
          placeholder="Istruzioni di preparazione..."
          value={recipe.instructions}
          onChange={(e) => setRecipe({ ...recipe, instructions: e.target.value })}
          rows={3}
        />

        <div className="flex gap-2">
          {initialRecipe && (
            <Button size="sm" variant="outline" className="flex-1" onClick={() => { setRecipe(initialRecipe); setEditing(false); }}>
              Annulla
            </Button>
          )}
          <Button
            size="sm"
            className="flex-1 gap-2"
            onClick={handleSend}
            disabled={sending || !recipe.title.trim() || recipe.ingredients.every(i => !i.name.trim())}
          >
            {sending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
            {sendLabel}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
