import { useEffect, useState, useMemo } from "react";
import MobileHeader from "@/components/MobileHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Loader2, Share2, ShoppingCart, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ShoppingItem {
  name: string;
  quantity: number | null;
  unit: string | null;
  category: string;
}

const STORAGE_KEY = "cibarius_shopping_checked";

const ShoppingListPage = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [items, setItems] = useState<ShoppingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [checked, setChecked] = useState<Set<string>>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? new Set(JSON.parse(stored)) : new Set();
    } catch {
      return new Set();
    }
  });

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      // Get active diet plan
      const { data: plans } = await supabase
        .from("diet_plans")
        .select("id, professional_id")
        .eq("client_user_id", user.id)
        .eq("is_active", true)
        .limit(1);

      if (!plans || plans.length === 0) {
        setLoading(false);
        return;
      }

      const plan = plans[0];

      // Get generated recipes for this client
      const { data: recipes } = await supabase
        .from("generated_recipes")
        .select("ingredients")
        .eq("client_user_id", user.id)
        .eq("professional_id", plan.professional_id);

      // Extract ingredients
      const ingredientMap = new Map<string, ShoppingItem>();
      (recipes ?? []).forEach((r: any) => {
        const ings = r.ingredients as any[];
        if (!Array.isArray(ings)) return;
        ings.forEach((ing: any) => {
          const name = (ing.name || ing.ingredient || "").toLowerCase().trim();
          if (!name) return;
          const key = name;
          const existing = ingredientMap.get(key);
          if (existing) {
            existing.quantity = (existing.quantity ?? 0) + (ing.quantity ?? 0);
          } else {
            ingredientMap.set(key, {
              name: ing.name || ing.ingredient || name,
              quantity: ing.quantity ?? null,
              unit: ing.unit ?? null,
              category: ing.category || "Altro",
            });
          }
        });
      });

      setItems(Array.from(ingredientMap.values()));
      setLoading(false);
    };
    load();
  }, [user]);

  // Persist checked state
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(checked)));
  }, [checked]);

  const toggleItem = (name: string) => {
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  };

  const clearChecked = () => setChecked(new Set());

  const grouped = useMemo(() => {
    const groups: Record<string, ShoppingItem[]> = {};
    items.forEach((i) => {
      const cat = i.category || "Altro";
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(i);
    });
    return Object.entries(groups).sort(([a], [b]) => a.localeCompare(b));
  }, [items]);

  const handleShare = async () => {
    const text = items
      .map((i) => {
        const qty = i.quantity ? `${i.quantity}${i.unit ? " " + i.unit : ""}` : "";
        return `${checked.has(i.name) ? "✅" : "⬜"} ${i.name}${qty ? " - " + qty : ""}`;
      })
      .join("\n");

    if (navigator.share) {
      try {
        await navigator.share({ title: "Lista della spesa - Cibarius", text });
      } catch { /* cancelled */ }
    } else {
      await navigator.clipboard.writeText(text);
      toast({ title: "Lista copiata negli appunti!" });
    }
  };

  if (loading) {
    return (
      <div>
        <MobileHeader title="Lista della spesa" />
        <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div>
        <MobileHeader title="Lista della spesa" />
        <main className="px-4 py-10 text-center space-y-4">
          <ShoppingCart className="h-12 w-12 text-muted-foreground mx-auto" />
          <p className="text-muted-foreground">Nessuna ricetta suggerita dal tuo nutrizionista ancora.</p>
          <p className="text-xs text-muted-foreground">La lista si genera automaticamente dalle ricette del tuo piano.</p>
        </main>
      </div>
    );
  }

  return (
    <div>
      <MobileHeader title="Lista della spesa" />
      <main className="px-4 py-5 pb-28 space-y-4">
        <div className="flex gap-2">
          <Button variant="outline" className="flex-1 gap-2" onClick={handleShare}>
            <Share2 className="h-4 w-4" /> Condividi
          </Button>
          {checked.size > 0 && (
            <Button variant="ghost" className="gap-2 text-muted-foreground" onClick={clearChecked}>
              <Trash2 className="h-4 w-4" /> Reset
            </Button>
          )}
        </div>

        <p className="text-xs text-muted-foreground">
          {checked.size}/{items.length} acquistati
        </p>

        {grouped.map(([category, categoryItems]) => (
          <div key={category} className="space-y-1.5">
            <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">{category}</h3>
            {categoryItems.map((item) => {
              const isChecked = checked.has(item.name);
              return (
                <Card
                  key={item.name}
                  className={`border border-border cursor-pointer transition-opacity ${isChecked ? "opacity-50" : ""}`}
                  onClick={() => toggleItem(item.name)}
                >
                  <CardContent className="py-2.5 flex items-center gap-3">
                    <Checkbox checked={isChecked} onCheckedChange={() => toggleItem(item.name)} />
                    <span className={`text-sm flex-1 ${isChecked ? "line-through text-muted-foreground" : "text-foreground"}`}>
                      {item.name}
                    </span>
                    {item.quantity && (
                      <span className="text-xs text-muted-foreground">
                        {item.quantity}{item.unit ? ` ${item.unit}` : ""}
                      </span>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        ))}
      </main>
    </div>
  );
};

export default ShoppingListPage;
