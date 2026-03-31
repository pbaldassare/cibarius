import { useState, useEffect } from "react";
import { useProductFavorites } from "@/hooks/useProductFavorites";
import { Star, X } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Shows a banner suggesting to save a frequently-used product as favorite.
 * Triggers after 3+ uses of the same product.
 */
const AutoSuggestFavBanner = () => {
  const { checkAutoSuggest, toggleFavorite } = useProductFavorites();
  const [suggestion, setSuggestion] = useState<{ product_id: string; name: string; count: number } | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    checkAutoSuggest().then((s) => {
      if (s) setSuggestion(s);
    });
  }, [checkAutoSuggest]);

  if (!suggestion || dismissed) return null;

  return (
    <div className="rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 p-3 flex items-start gap-3">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-100 dark:bg-amber-900/50">
        <Star className="h-4 w-4 text-amber-600 dark:text-amber-400" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold text-foreground">
          Inserisci spesso "{suggestion.name}"
        </p>
        <p className="text-[11px] text-muted-foreground mt-0.5">
          Usato {suggestion.count} volte. Salvalo nei preferiti per ritrovarlo subito!
        </p>
        <Button
          size="sm"
          variant="default"
          className="mt-2 gap-1.5 text-xs h-7"
          onClick={async () => {
            await toggleFavorite(suggestion.product_id);
            setDismissed(true);
          }}
        >
          <Star className="h-3 w-3" /> Salva nei preferiti
        </Button>
      </div>
      <button onClick={() => setDismissed(true)} className="p-1 text-muted-foreground hover:text-foreground">
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
};

export default AutoSuggestFavBanner;
