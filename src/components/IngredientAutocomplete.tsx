import { useState, useRef, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { Search } from "lucide-react";
import { useDebounce } from "@/hooks/useDebounce";

interface ResultItem {
  id: string;
  name: string;
  kcal: number;
  protein: number;
  carbs: number;
  fats: number;
  category: string | null;
  source: "food_templates" | "ingredients";
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
  const [results, setResults] = useState<ResultItem[]>([]);
  const [loading, setLoading] = useState(false);
  const debouncedQuery = useDebounce(value, 250);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  useEffect(() => {
    if (!debouncedQuery || debouncedQuery.length < 2) {
      setResults([]);
      return;
    }

    let cancelled = false;
    const search = async () => {
      setLoading(true);
      const q = debouncedQuery.toLowerCase();
      const combined: ResultItem[] = [];

      // Search food_templates
      const { data: ftData } = await supabase
        .from("food_templates")
        .select("id, name, calories_100g, protein_100g, carbs_100g, fats_100g, category")
        .or(`name.ilike.%${q}%,keywords.cs.{${q}}`)
        .limit(5);

      if (ftData) {
        for (const t of ftData) {
          combined.push({
            id: t.id,
            name: t.name,
            kcal: Number(t.calories_100g),
            protein: Number(t.protein_100g),
            carbs: Number(t.carbs_100g),
            fats: Number(t.fats_100g),
            category: t.category,
            source: "food_templates",
          });
        }
      }

      // Search ingredients table
      const { data: ingData } = await supabase
        .from("ingredients")
        .select("id, name, kcal_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, category")
        .ilike("name", `%${q}%`)
        .limit(5);

      if (ingData) {
        for (const i of ingData) {
          // Skip duplicates by name
          if (combined.some((c) => c.name.toLowerCase() === i.name.toLowerCase())) continue;
          combined.push({
            id: i.id,
            name: i.name,
            kcal: Number(i.kcal_per_100g),
            protein: Number(i.protein_per_100g),
            carbs: Number(i.carbs_per_100g),
            fats: Number(i.fat_per_100g),
            category: i.category,
            source: "ingredients",
          });
        }
      }

      if (!cancelled) {
        setResults(combined.slice(0, 8));
        setLoading(false);
        if (combined.length > 0) setOpen(true);
      }
    };

    search();
    return () => { cancelled = true; };
  }, [debouncedQuery]);

  const handleSelect = (r: ResultItem) => {
    onSelect({
      id: r.id,
      name: r.name,
      per100: { protein: r.protein, carbs: r.carbs, fats: r.fats, kcal: r.kcal },
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
          {results.map((r) => (
            <button
              key={`${r.source}-${r.id}`}
              type="button"
              onClick={() => handleSelect(r)}
              className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm hover:bg-accent/50 transition-colors"
            >
              <div className="min-w-0 flex-1">
                <p className="font-medium text-popover-foreground truncate">{r.name}</p>
                {r.category && (
                  <p className="text-[10px] text-muted-foreground">{r.category}</p>
                )}
              </div>
              <span className="shrink-0 text-[10px] text-muted-foreground">
                {r.kcal} kcal
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
