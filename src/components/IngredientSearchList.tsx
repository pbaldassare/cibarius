import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useDebounce } from "@/hooks/useDebounce";
import { Loader2, Plus, Search, Trash2 } from "lucide-react";
import {
  QUICK_INGREDIENTS,
  type RecipeIngredient,
} from "@/lib/recipe-ingredients";

export type { RecipeIngredient };
export { recipeIngredientsLabel, QUICK_INGREDIENTS } from "@/lib/recipe-ingredients";

interface SearchHit {
  key: string;
  name: string;
  source: "dispensa" | "catalogo";
  product_id: string | null;
  pantry_item_id: string | null;
  lot_number?: string | null;
  expiry_date?: string | null;
  unit?: string | null;
}

interface Props {
  restaurantId: string;
  value: RecipeIngredient[];
  onChange: (next: RecipeIngredient[]) => void;
}

const toHitFromPantry = (row: any): SearchHit | null => {
  const prod = row.products;
  const name = prod?.name as string | undefined;
  if (!name) return null;
  return {
    key: `pantry-${row.id}`,
    name,
    source: "dispensa",
    product_id: row.product_id,
    pantry_item_id: row.id,
    lot_number: row.lot_number,
    expiry_date: row.expiry_date,
    unit: row.unit || "g",
  };
};

const IngredientSearchList = ({ restaurantId, value, onChange }: Props) => {
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<SearchHit[]>([]);
  const [pantry, setPantry] = useState<SearchHit[]>([]);
  const [searching, setSearching] = useState(false);
  const debounced = useDebounce(query.trim(), 250);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("inventory_items")
        .select("id, lot_number, expiry_date, unit, product_id, products(id, name)")
        .eq("restaurant_id", restaurantId)
        .order("created_at", { ascending: false })
        .limit(40);
      if (cancelled) return;
      setPantry((data || []).map(toHitFromPantry).filter(Boolean) as SearchHit[]);
    })();
    return () => {
      cancelled = true;
    };
  }, [restaurantId]);

  useEffect(() => {
    if (debounced.length < 1) {
      setHits([]);
      return;
    }
    let cancelled = false;
    setSearching(true);
    const term = `%${debounced}%`;
    (async () => {
      const q = debounced.toLowerCase();
      const [productsRes, catalogRes] = await Promise.all([
        supabase.from("products").select("id, name, brand").ilike("name", term).limit(8),
        supabase.from("ingredients").select("id, name").ilike("name", term).limit(8),
      ]);
      if (cancelled) return;

      const seen = new Set<string>();
      const next: SearchHit[] = [];
      for (const hit of pantry) {
        if (!hit.name.toLowerCase().includes(q)) continue;
        seen.add((hit.product_id || hit.name).toLowerCase());
        next.push(hit);
      }
      for (const p of productsRes.data || []) {
        const id = p.id.toLowerCase();
        if (seen.has(id) || seen.has(p.name.toLowerCase())) continue;
        seen.add(id);
        next.push({
          key: `product-${p.id}`,
          name: p.brand ? `${p.name} (${p.brand})` : p.name,
          source: "catalogo",
          product_id: p.id,
          pantry_item_id: null,
          unit: "g",
        });
      }
      for (const ing of catalogRes.data || []) {
        if (seen.has(ing.name.toLowerCase())) continue;
        seen.add(ing.name.toLowerCase());
        next.push({
          key: `ing-${ing.id}`,
          name: ing.name,
          source: "catalogo",
          product_id: null,
          pantry_item_id: null,
          unit: "g",
        });
      }
      setHits(next.slice(0, 12));
      setSearching(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [debounced, pantry]);

  const alreadyAdded = (name: string, pantryItemId: string | null) =>
    value.some(
      (v) => v.name.toLowerCase() === name.toLowerCase() && v.pantry_item_id === pantryItemId,
    );

  const addHit = (hit: SearchHit) => {
    if (alreadyAdded(hit.name, hit.pantry_item_id)) {
      setQuery("");
      setHits([]);
      return;
    }
    onChange([
      ...value,
      {
        key: `${hit.key}-${Date.now()}`,
        product_id: hit.product_id,
        pantry_item_id: hit.pantry_item_id,
        name: hit.name,
        quantity: "",
        unit: hit.unit || "g",
        lot_number: hit.lot_number || null,
        expiry_date: hit.expiry_date || null,
      },
    ]);
    setQuery("");
    setHits([]);
  };

  const addQuick = (name: string) => {
    if (alreadyAdded(name, null)) return;
    onChange([
      ...value,
      {
        key: `quick-${name}-${Date.now()}`,
        product_id: null,
        pantry_item_id: null,
        name,
        quantity: "",
        unit: "g",
      },
    ]);
  };

  const updateRow = (key: string, field: keyof RecipeIngredient, val: string) => {
    onChange(value.map((row) => (row.key === key ? { ...row, [field]: val } : row)));
  };

  const pantryAvailable = pantry.filter((hit) => !alreadyAdded(hit.name, hit.pantry_item_id));
  const showQuick = debounced.length < 1;

  return (
    <div className="space-y-2">
      <label className="text-xs font-medium text-muted-foreground">Ingredienti</label>
      <p className="text-[11px] text-muted-foreground -mt-1">
        Scegli dall&apos;elenco o cerca in dispensa/catalogo: non serve scriverli a mano.
      </p>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Cerca ingrediente…"
          className="pl-9"
        />
        {searching && (
          <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />
        )}
      </div>

      {showQuick && pantryAvailable.length > 0 && (
        <div className="rounded-xl border border-border bg-card max-h-40 overflow-y-auto">
          <p className="px-3 pt-2 pb-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            Dalla dispensa
          </p>
          {pantryAvailable.map((hit) => (
            <button
              key={hit.key}
              type="button"
              onClick={() => addHit(hit)}
              className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm hover:bg-secondary/60 border-t border-border"
            >
              <span className="truncate font-medium">{hit.name}</span>
              <Plus className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            </button>
          ))}
        </div>
      )}

      {showQuick && (
        <div className="flex flex-wrap gap-1.5">
          {QUICK_INGREDIENTS.filter((name) => !alreadyAdded(name, null)).map((name) => (
            <button
              key={name}
              type="button"
              onClick={() => addQuick(name)}
              className="rounded-full border border-border bg-card px-2.5 py-1 text-[11px] font-medium text-foreground hover:bg-secondary/60"
            >
              + {name}
            </button>
          ))}
        </div>
      )}

      {hits.length > 0 && (
        <div className="rounded-xl border border-border bg-card max-h-48 overflow-y-auto">
          {hits.map((hit) => (
            <button
              key={hit.key}
              type="button"
              onClick={() => addHit(hit)}
              className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm hover:bg-secondary/60 border-b border-border last:border-0"
            >
              <span className="truncate font-medium">{hit.name}</span>
              <span className="flex items-center gap-1 shrink-0 text-[10px] text-muted-foreground">
                {hit.source === "dispensa" ? "Dispensa" : "Catalogo"}
                <Plus className="h-3.5 w-3.5" />
              </span>
            </button>
          ))}
        </div>
      )}
      {query.trim().length >= 1 && !searching && hits.length === 0 && (
        <p className="text-[11px] text-muted-foreground">Nessun risultato per “{query.trim()}”.</p>
      )}

      {value.length === 0 ? (
        <p className="text-[11px] text-muted-foreground">Nessun ingrediente in elenco.</p>
      ) : (
        <div className="space-y-2">
          {value.map((row) => (
            <div key={row.key} className="rounded-xl border border-border bg-card p-2 space-y-1.5">
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm font-medium leading-tight">{row.name}</p>
                <button
                  type="button"
                  onClick={() => onChange(value.filter((r) => r.key !== row.key))}
                  className="text-muted-foreground"
                  aria-label={`Rimuovi ${row.name}`}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Input
                  type="number"
                  step="0.01"
                  placeholder="Quantità"
                  value={row.quantity}
                  onChange={(e) => updateRow(row.key, "quantity", e.target.value)}
                />
                <Input
                  placeholder="Unità"
                  value={row.unit}
                  onChange={(e) => updateRow(row.key, "unit", e.target.value)}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default IngredientSearchList;
