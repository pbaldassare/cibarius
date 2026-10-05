import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useDebounce } from "@/hooks/useDebounce";
import { Loader2, Plus, Search, Trash2 } from "lucide-react";

export interface RecipeIngredient {
  key: string;
  product_id: string | null;
  pantry_item_id: string | null;
  name: string;
  quantity: string;
  unit: string;
  lot_number?: string | null;
  expiry_date?: string | null;
}

export const recipeIngredientsLabel = (items: RecipeIngredient[]): string =>
  items
    .map((i) => {
      const qty = i.quantity ? `${i.quantity} ${i.unit}`.trim() : "";
      return qty ? `${i.name} (${qty})` : i.name;
    })
    .join(", ");

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

const IngredientSearchList = ({ restaurantId, value, onChange }: Props) => {
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<SearchHit[]>([]);
  const [searching, setSearching] = useState(false);
  const debounced = useDebounce(query.trim(), 250);

  useEffect(() => {
    if (debounced.length < 2) {
      setHits([]);
      return;
    }
    let cancelled = false;
    setSearching(true);
    const term = `%${debounced}%`;
    (async () => {
      const [pantryRes, productsRes, catalogRes] = await Promise.all([
        supabase
          .from("inventory_items")
          .select("id, lot_number, expiry_date, unit, product_id, products(id, name)")
          .eq("restaurant_id", restaurantId)
          .order("created_at", { ascending: false })
          .limit(40),
        supabase.from("products").select("id, name, brand").ilike("name", term).limit(6),
        supabase.from("ingredients").select("id, name").ilike("name", term).limit(6),
      ]);
      if (cancelled) return;

      const q = debounced.toLowerCase();
      const seen = new Set<string>();
      const next: SearchHit[] = [];
      for (const row of pantryRes.data || []) {
        const prod = (row as any).products;
        const name = prod?.name as string | undefined;
        if (!name || !name.toLowerCase().includes(q)) continue;
        const key = `pantry-${row.id}`;
        seen.add((prod.id || name).toLowerCase());
        next.push({
          key,
          name,
          source: "dispensa",
          product_id: row.product_id,
          pantry_item_id: row.id,
          lot_number: row.lot_number,
          expiry_date: row.expiry_date,
          unit: row.unit || "g",
        });
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
      setHits(next.slice(0, 10));
      setSearching(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [debounced, restaurantId]);

  const addHit = (hit: SearchHit) => {
    if (value.some((v) => v.name.toLowerCase() === hit.name.toLowerCase() && v.pantry_item_id === hit.pantry_item_id)) {
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

  const updateRow = (key: string, field: keyof RecipeIngredient, val: string) => {
    onChange(value.map((row) => (row.key === key ? { ...row, [field]: val } : row)));
  };

  return (
    <div className="space-y-2">
      <label className="text-xs font-medium text-muted-foreground">Ingredienti</label>
      <p className="text-[11px] text-muted-foreground -mt-1">
        Cerca in dispensa o in catalogo: non serve scriverli a mano.
      </p>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Cerca ingrediente…"
          className="pl-9"
        />
        {searching && <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />}
      </div>
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
      {debounced.length >= 2 && !searching && hits.length === 0 && (
        <p className="text-[11px] text-muted-foreground">Nessun risultato per “{debounced}”.</p>
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
