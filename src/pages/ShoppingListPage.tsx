import { useEffect, useState } from "react";
import MobileHeader from "@/components/MobileHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Loader2, Plus, Refrigerator, Share2, ShoppingCart, Trash2, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { addToShoppingList } from "@/lib/shopping-list";

interface ShoppingItem {
  id: string;
  name: string;
  quantity: number | null;
  unit: string | null;
  checked: boolean;
}

interface PantryItem {
  id: string;
  name: string;
}

const table = () => supabase.from("shopping_list_items");

/**
 * Lista della spesa del cliente: la compila lui, a mano o dai prodotti della
 * dispensa/frigo (che arrivano anche dalle scansioni). Le scadenze e i
 * promemoria restano sui prodotti in dispensa, qui non cambia nulla.
 */
const ShoppingListPage = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [items, setItems] = useState<ShoppingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [adding, setAdding] = useState(false);
  const [pantryOpen, setPantryOpen] = useState(false);
  const [pantry, setPantry] = useState<PantryItem[] | null>(null);

  const load = async () => {
    const { data, error } = await table().select("id, name, quantity, unit, checked").order("created_at");
    if (error) toast({ variant: "destructive", title: "Lista non caricata", description: error.message });
    setItems(data ?? []);
    setLoading(false);
  };

  useEffect(() => {
    if (user) load();
  }, [user]);

  const fail = (error: { message: string }) =>
    toast({ variant: "destructive", title: "Modifica non salvata", description: error.message });

  const add = async (value: string) => {
    if (!value.trim()) return;
    setAdding(true);
    const error = await addToShoppingList(value);
    setAdding(false);
    if (error) return fail(error);
    setName("");
    load();
  };

  const toggle = async (item: ShoppingItem) => {
    setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, checked: !i.checked } : i)));
    const { error } = await table().update({ checked: !item.checked }).eq("id", item.id);
    if (error) { fail(error); load(); }
  };

  const remove = async (id: string) => {
    setItems((prev) => prev.filter((i) => i.id !== id));
    const { error } = await table().delete().eq("id", id);
    if (error) { fail(error); load(); }
  };

  const clearChecked = async () => {
    const ids = items.filter((i) => i.checked).map((i) => i.id);
    setItems((prev) => prev.filter((i) => !i.checked));
    const { error } = await table().delete().in("id", ids);
    if (error) { fail(error); load(); }
  };

  const openPantry = async () => {
    setPantryOpen(true);
    if (pantry || !user) return;
    const { data } = await supabase
      .from("inventory_items")
      .select("id, product:products(name)")
      .eq("owner_user_id", user.id);
    setPantry(
      (data ?? [])
        .map((i) => ({ id: i.id, name: i.product?.name ?? "" }))
        .filter((i) => i.name)
        .sort((a, b) => a.name.localeCompare(b.name)),
    );
  };

  const handleShare = async () => {
    const text = items
      .map((i) => {
        const qty = i.quantity ? ` - ${i.quantity}${i.unit ? " " + i.unit : ""}` : "";
        return `${i.checked ? "✅" : "⬜"} ${i.name}${qty}`;
      })
      .join("\n");
    if (navigator.share) {
      try {
        await navigator.share({ title: "Lista della spesa - Cibarius", text });
      } catch { /* annullato */ }
    } else {
      await navigator.clipboard.writeText(text);
      toast({ title: "Lista copiata negli appunti!" });
    }
  };

  const inList = new Set(items.map((i) => i.name.toLowerCase()));
  const checkedCount = items.filter((i) => i.checked).length;

  return (
    <div>
      <MobileHeader title="Lista della spesa" />
      <main className="px-4 py-5 pb-28 space-y-4">
        <form onSubmit={(e) => { e.preventDefault(); add(name); }} className="flex gap-2">
          <Input
            placeholder="Aggiungi un prodotto…"
            aria-label="Prodotto da aggiungere"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="flex-1"
          />
          <Button type="submit" disabled={adding || !name.trim()} aria-label="Aggiungi">
            {adding ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
          </Button>
        </form>

        <div className="flex gap-2">
          <Button variant="outline" className="flex-1 gap-2" onClick={openPantry}>
            <Refrigerator className="h-4 w-4" /> Dalla dispensa
          </Button>
          {items.length > 0 && (
            <Button variant="outline" className="flex-1 gap-2" onClick={handleShare}>
              <Share2 className="h-4 w-4" /> Condividi
            </Button>
          )}
        </div>

        {loading ? (
          <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
        ) : items.length === 0 ? (
          <div className="py-10 text-center space-y-3">
            <ShoppingCart className="h-12 w-12 text-muted-foreground mx-auto" />
            <p className="text-muted-foreground">La lista è vuota.</p>
            <p className="text-xs text-muted-foreground">
              Scrivi un prodotto qui sopra, sceglilo dalla dispensa oppure usa "Aggiungi alla lista della spesa" su un prodotto in scadenza.
            </p>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">{checkedCount}/{items.length} acquistati</p>
              {checkedCount > 0 && (
                <Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground" onClick={clearChecked}>
                  <Trash2 className="h-4 w-4" /> Togli acquistati
                </Button>
              )}
            </div>
            <div className="space-y-1.5">
              {items.map((item) => (
                <Card
                  key={item.id}
                  className={`border border-border cursor-pointer transition-opacity ${item.checked ? "opacity-50" : ""}`}
                  onClick={() => toggle(item)}
                >
                  <CardContent className="py-2.5 flex items-center gap-3">
                    {/* Il tocco sulla casella non deve risalire alla Card: verrebbe contato due volte */}
                    <Checkbox checked={item.checked} onCheckedChange={() => toggle(item)} onClick={(e) => e.stopPropagation()} />
                    <span className={`text-sm flex-1 ${item.checked ? "line-through text-muted-foreground" : "text-foreground"}`}>
                      {item.name}
                    </span>
                    {item.quantity && (
                      <span className="text-xs text-muted-foreground">{item.quantity}{item.unit ? ` ${item.unit}` : ""}</span>
                    )}
                    <button
                      aria-label={`Togli ${item.name}`}
                      className="p-1.5 -mr-1.5 text-muted-foreground"
                      onClick={(e) => { e.stopPropagation(); remove(item.id); }}
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </>
        )}
      </main>

      <Sheet open={pantryOpen} onOpenChange={setPantryOpen}>
        <SheetContent side="bottom" className="rounded-t-3xl max-h-[80vh] overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="text-foreground">Dalla dispensa</SheetTitle>
          </SheetHeader>
          <div className="mt-4 space-y-1.5 pb-6">
            {pantry === null ? (
              <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
            ) : pantry.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">Nessun prodotto in dispensa.</p>
            ) : (
              pantry.map((p) => {
                const already = inList.has(p.name.toLowerCase());
                return (
                  <button
                    key={p.id}
                    disabled={already}
                    onClick={() => add(p.name)}
                    className="flex w-full items-center justify-between rounded-xl border border-border px-3 py-2.5 text-left text-sm disabled:opacity-50"
                  >
                    <span className="truncate">{p.name}</span>
                    {already ? <span className="text-xs text-muted-foreground">In lista</span> : <Plus className="h-4 w-4 text-primary" />}
                  </button>
                );
              })
            )}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
};

export default ShoppingListPage;
