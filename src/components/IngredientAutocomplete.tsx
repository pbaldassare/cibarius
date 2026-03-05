import { useState, useRef, useEffect, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { Search } from "lucide-react";
import { useDebounce } from "@/hooks/useDebounce";

interface Template {
  id: string;
  name: string;
  calories_100g: number;
  protein_100g: number;
  carbs_100g: number;
  fats_100g: number;
  category: string | null;
}

interface IngredientAutocompleteProps {
  value: string;
  onChange: (name: string) => void;
  onSelect: (template: {
    id: string;
    name: string;
    per100: { protein: number; carbs: number; fats: number; kcal: number };
  }) => void;
  placeholder?: string;
  className?: string;
}

const IngredientAutocomplete = ({
  value,
  onChange,
  onSelect,
  placeholder = "Cerca ingrediente…",
  className = "",
}: IngredientAutocompleteProps) => {
  const [open, setOpen] = useState(false);
  const [results, setResults] = useState<Template[]>([]);
  const [loading, setLoading] = useState(false);
  const debouncedQuery = useDebounce(value, 250);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Search food_templates
  useEffect(() => {
    if (!debouncedQuery || debouncedQuery.length < 2) {
      setResults([]);
      return;
    }

    let cancelled = false;
    const search = async () => {
      setLoading(true);
      const q = debouncedQuery.toLowerCase();

      const { data } = await supabase
        .from("food_templates")
        .select("id, name, calories_100g, protein_100g, carbs_100g, fats_100g, category")
        .or(`name.ilike.%${q}%,keywords.cs.{${q}}`)
        .limit(8);

      if (!cancelled) {
        setResults((data as Template[]) ?? []);
        setLoading(false);
        if (data && data.length > 0) setOpen(true);
      }
    };

    search();
    return () => { cancelled = true; };
  }, [debouncedQuery]);

  const handleSelect = (t: Template) => {
    onSelect({
      id: t.id,
      name: t.name,
      per100: {
        protein: Number(t.protein_100g),
        carbs: Number(t.carbs_100g),
        fats: Number(t.fats_100g),
        kcal: Number(t.calories_100g),
      },
    });
    setOpen(false);
  };

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <Input
          value={value}
          onChange={(e) => {
            onChange(e.target.value);
            if (e.target.value.length >= 2) setOpen(true);
          }}
          onFocus={() => {
            if (results.length > 0) setOpen(true);
          }}
          placeholder={placeholder}
          className={`h-7 text-sm font-medium pr-7 ${className}`}
        />
        <Search className="absolute right-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
      </div>

      {open && results.length > 0 && (
        <div className="absolute z-50 mt-1 w-full max-h-48 overflow-y-auto rounded-lg border border-accent bg-popover shadow-lg">
          {results.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => handleSelect(t)}
              className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm hover:bg-accent/50 transition-colors"
            >
              <div className="min-w-0 flex-1">
                <p className="font-medium text-popover-foreground truncate">{t.name}</p>
                {t.category && (
                  <p className="text-[10px] text-muted-foreground">{t.category}</p>
                )}
              </div>
              <span className="shrink-0 text-[10px] text-muted-foreground">
                {Number(t.calories_100g)} kcal
              </span>
            </button>
          ))}
        </div>
      )}

      {open && loading && results.length === 0 && (
        <div className="absolute z-50 mt-1 w-full rounded-lg border border-accent bg-popover p-3 text-center text-xs text-muted-foreground shadow-lg">
          Ricerca…
        </div>
      )}
    </div>
  );
};

export default IngredientAutocomplete;
