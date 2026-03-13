import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Package, Check, Plus, Flame } from "lucide-react";
import { type SimilarProduct } from "@/lib/product-dedup";
import { getFoodEmoji } from "@/lib/food-images";

interface DuplicateProductDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  newName: string;
  similarProducts: SimilarProduct[];
  /** Called when user picks an existing product */
  onSelectExisting: (product: SimilarProduct) => void;
  /** Called when user wants to create a new product anyway */
  onCreateNew: () => void;
}

const DuplicateProductDialog = ({
  open,
  onOpenChange,
  newName,
  similarProducts,
  onSelectExisting,
  onCreateNew,
}: DuplicateProductDialogProps) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md mx-4">
        <DialogHeader>
          <DialogTitle className="text-base">Prodotti simili trovati</DialogTitle>
          <DialogDescription className="text-xs">
            Esistono già prodotti simili a "<span className="font-semibold">{newName}</span>". Vuoi usarne uno esistente?
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-1.5 max-h-64 overflow-y-auto">
          {similarProducts.map((p) => (
            <button
              key={p.id}
              onClick={() => onSelectExisting(p)}
              className="flex w-full items-center gap-3 rounded-xl border border-border bg-card p-3 text-left hover:border-primary transition-colors active:scale-[0.98]"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-secondary overflow-hidden">
                {p.image_url ? (
                  <img src={p.image_url} alt="" className="h-full w-full object-cover" />
                ) : (
                  <span className="text-lg">{getFoodEmoji(null, p.name)}</span>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">{p.name}</p>
                <div className="flex items-center gap-2">
                  {p.brand && <span className="text-[10px] text-muted-foreground">{p.brand}</span>}
                  {p.calories_100g != null && (
                    <span className="flex items-center gap-0.5 text-[10px] font-medium text-primary">
                      <Flame className="h-2.5 w-2.5" /> {p.calories_100g} kcal
                    </span>
                  )}
                  {!p.nutrition_available && (
                    <Badge variant="outline" className="text-[8px] px-1 py-0 border-muted-foreground text-muted-foreground">
                      No macro
                    </Badge>
                  )}
                </div>
              </div>
              <div className="shrink-0 flex items-center gap-1 text-primary">
                <Check className="h-4 w-4" />
                <span className="text-[10px] font-medium">Usa</span>
              </div>
            </button>
          ))}
        </div>

        <Button
          variant="outline"
          onClick={onCreateNew}
          className="w-full gap-2 mt-1"
        >
          <Plus className="h-4 w-4" />
          Crea nuovo "{newName}"
        </Button>
      </DialogContent>
    </Dialog>
  );
};

export default DuplicateProductDialog;
