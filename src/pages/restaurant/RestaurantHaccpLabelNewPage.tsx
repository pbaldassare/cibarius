import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useRestaurant } from "@/hooks/useRestaurant";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import MobileHeader from "@/components/MobileHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, Save, FileText, Loader2, X } from "lucide-react";
import { format } from "date-fns";

interface PantryItem {
  id: string;
  product_id: string | null;
  expiry_date: string | null;
  lot_number: string | null;
  product_name?: string;
}
interface Ingredient {
  pantry_item_id: string | null;
  ingredient_name: string;
  quantity_used: string;
  unit: string;
  source_lot_code: string;
  supplier_name: string;
  ingredient_expiration_date: string;
  origin_document_id: string | null;
}
interface Doc { id: string; document_type: string; supplier_name: string | null; document_number: string | null; }

const ALLERGENS_OPTS = ["glutine", "latte", "uova", "soia", "frutta a guscio", "arachidi", "pesce", "crostacei", "molluschi", "sedano", "senape", "sesamo", "lupini", "anidride solforosa"];

const RestaurantHaccpLabelNewPage = () => {
  const { restaurant } = useRestaurant();
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const today = new Date().toISOString().slice(0, 10);
  const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10);

  const [name, setName] = useState("");
  const [quantity, setQuantity] = useState("");
  const [unit, setUnit] = useState("kg");
  const [productionDate, setProductionDate] = useState(today);
  const [expirationDate, setExpirationDate] = useState(tomorrow);
  const [conservation, setConservation] = useState("frigo");
  const [lotCode, setLotCode] = useState("");
  const [notes, setNotes] = useState("");
  const [allergens, setAllergens] = useState<string[]>([]);
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [linkedDocs, setLinkedDocs] = useState<string[]>([]);
  const [pantry, setPantry] = useState<PantryItem[]>([]);
  const [docs, setDocs] = useState<Doc[]>([]);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [docPickerOpen, setDocPickerOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!restaurant) return;
    (async () => {
      const { data } = await supabase
        .from("inventory_items")
        .select("id, product_id, expiry_date, lot_number, products(name)")
        .eq("restaurant_id", restaurant.id)
        .order("created_at", { ascending: false })
        .limit(200);
      setPantry((data || []).map((d: any) => ({ ...d, product_name: d.products?.name || "Senza nome" })));

      const { data: dd } = await supabase
        .from("haccp_documents")
        .select("id, document_type, supplier_name, document_number")
        .eq("restaurant_id", restaurant.id)
        .order("created_at", { ascending: false });
      setDocs((dd as Doc[]) || []);
    })();
  }, [restaurant]);

  const addManualIngredient = () => setIngredients(prev => [...prev, {
    pantry_item_id: null, ingredient_name: "", quantity_used: "", unit: "g",
    source_lot_code: "", supplier_name: "", ingredient_expiration_date: "", origin_document_id: null,
  }]);

  const addFromPantry = (p: PantryItem) => {
    setIngredients(prev => [...prev, {
      pantry_item_id: p.id,
      ingredient_name: p.product_name || "",
      quantity_used: "",
      unit: "g",
      source_lot_code: p.lot_number || "",
      supplier_name: "",
      ingredient_expiration_date: p.expiry_date || "",
      origin_document_id: null,
    }]);
    setPickerOpen(false);
  };

  const updateIng = (i: number, key: keyof Ingredient, value: string) => {
    setIngredients(prev => prev.map((ing, idx) => idx === i ? { ...ing, [key]: value } : ing));
  };

  const removeIng = (i: number) => setIngredients(prev => prev.filter((_, idx) => idx !== i));

  const toggleAllergen = (a: string) => setAllergens(prev => prev.includes(a) ? prev.filter(x => x !== a) : [...prev, a]);

  const handleSave = async (finalize: boolean) => {
    if (!restaurant || !user) return;
    if (!name.trim()) {
      toast({ variant: "destructive", title: "Nome preparazione obbligatorio" });
      return;
    }
    setSaving(true);

    const { data: profile } = await supabase.from("profiles").select("full_name, email").eq("id", user.id).maybeSingle();
    const operatorName = profile?.full_name || profile?.email || "—";

    const { data: label, error } = await supabase
      .from("haccp_preparation_labels")
      .insert({
        restaurant_id: restaurant.id,
        preparation_name: name.trim(),
        quantity: quantity ? parseFloat(quantity) : null,
        unit: unit || null,
        production_date: productionDate,
        expiration_date: expirationDate,
        conservation_type: conservation,
        internal_lot_code: lotCode.trim() || (null as any),
        operator_user_id: user.id,
        operator_name: operatorName,
        notes: notes || null,
        allergens,
        status: finalize ? "finalized" : "draft",
        finalized_at: finalize ? new Date().toISOString() : null,
        created_by: user.id,
      } as any)
      .select("id")
      .single();

    if (error || !label) {
      setSaving(false);
      toast({ variant: "destructive", title: "Errore", description: error?.message });
      return;
    }

    if (ingredients.length > 0) {
      await supabase.from("haccp_preparation_ingredients").insert(
        ingredients.filter(i => i.ingredient_name.trim()).map(i => ({
          preparation_label_id: label.id,
          pantry_item_id: i.pantry_item_id,
          ingredient_name: i.ingredient_name.trim(),
          quantity_used: i.quantity_used ? parseFloat(i.quantity_used) : null,
          unit: i.unit || null,
          source_lot_code: i.source_lot_code || null,
          supplier_name: i.supplier_name || null,
          ingredient_expiration_date: i.ingredient_expiration_date || null,
          origin_document_id: i.origin_document_id,
        })) as any
      );
    }

    if (linkedDocs.length > 0) {
      await supabase.from("haccp_preparation_documents").insert(
        linkedDocs.map(d => ({ preparation_label_id: label.id, document_id: d })) as any
      );
    }

    await supabase.from("haccp_label_audit_log").insert({
      preparation_label_id: label.id,
      action: finalize ? "finalized" : "created",
      user_id: user.id,
      user_name: operatorName,
    } as any);

    setSaving(false);
    toast({ title: finalize ? "Etichetta finalizzata ✓" : "Bozza salvata" });
    navigate(`/restaurant/haccp-labels/${label.id}`);
  };

  return (
    <div className="space-y-4 p-4 pb-24">
      <MobileHeader title="Nuova etichetta" backTo="/restaurant/haccp-labels" />

      <Card><CardContent className="p-4 space-y-3">
        <div>
          <Label>Nome preparazione *</Label>
          <Input value={name} onChange={e => setName(e.target.value)} placeholder="es. Ragù di carne" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Quantità prodotta</Label>
            <Input type="number" step="0.01" value={quantity} onChange={e => setQuantity(e.target.value)} />
          </div>
          <div>
            <Label>Unità</Label>
            <Select value={unit} onValueChange={setUnit}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {["kg", "g", "l", "ml", "pz", "porz."].map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div><Label>Data produzione</Label><Input type="date" value={productionDate} onChange={e => setProductionDate(e.target.value)} /></div>
          <div><Label>Data scadenza</Label><Input type="date" value={expirationDate} onChange={e => setExpirationDate(e.target.value)} /></div>
        </div>
        <div>
          <Label>Conservazione</Label>
          <Select value={conservation} onValueChange={setConservation}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {["ambiente", "frigo", "freezer", "sottovuoto", "altro"].map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Lotto interno (auto se vuoto)</Label>
          <Input value={lotCode} onChange={e => setLotCode(e.target.value)} placeholder="L-00001" />
        </div>
        <div>
          <Label>Allergeni</Label>
          <div className="flex flex-wrap gap-1.5 mt-1">
            {ALLERGENS_OPTS.map(a => (
              <Badge key={a} variant={allergens.includes(a) ? "default" : "outline"} className="cursor-pointer" onClick={() => toggleAllergen(a)}>
                {a}
              </Badge>
            ))}
          </div>
        </div>
        <div>
          <Label>Note</Label>
          <Textarea rows={2} value={notes} onChange={e => setNotes(e.target.value)} />
        </div>
      </CardContent></Card>

      <Card><CardContent className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold">Ingredienti</h3>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => setPickerOpen(true)}>Da dispensa</Button>
            <Button size="sm" variant="outline" onClick={addManualIngredient}><Plus className="h-4 w-4" /></Button>
          </div>
        </div>
        {ingredients.length === 0 && <p className="text-sm text-muted-foreground">Nessun ingrediente aggiunto</p>}
        {ingredients.map((ing, i) => (
          <div key={i} className="border border-border rounded-lg p-3 space-y-2 relative">
            <button onClick={() => removeIng(i)} className="absolute top-2 right-2 text-muted-foreground"><Trash2 className="h-4 w-4" /></button>
            <Input placeholder="Nome ingrediente" value={ing.ingredient_name} onChange={e => updateIng(i, "ingredient_name", e.target.value)} />
            <div className="grid grid-cols-2 gap-2">
              <Input placeholder="Quantità" type="number" step="0.01" value={ing.quantity_used} onChange={e => updateIng(i, "quantity_used", e.target.value)} />
              <Input placeholder="Unità" value={ing.unit} onChange={e => updateIng(i, "unit", e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Input placeholder="Lotto origine" value={ing.source_lot_code} onChange={e => updateIng(i, "source_lot_code", e.target.value)} />
              <Input placeholder="Fornitore" value={ing.supplier_name} onChange={e => updateIng(i, "supplier_name", e.target.value)} />
            </div>
            <Input type="date" value={ing.ingredient_expiration_date} onChange={e => updateIng(i, "ingredient_expiration_date", e.target.value)} />
          </div>
        ))}
      </CardContent></Card>

      <Card><CardContent className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold">Documenti / Bolle</h3>
          <Button size="sm" variant="outline" onClick={() => setDocPickerOpen(true)}><FileText className="h-4 w-4 mr-1" /> Collega</Button>
        </div>
        {linkedDocs.length === 0 && <p className="text-sm text-muted-foreground">Nessun documento collegato</p>}
        {linkedDocs.map(id => {
          const d = docs.find(x => x.id === id);
          if (!d) return null;
          return (
            <div key={id} className="flex items-center justify-between bg-muted rounded-lg px-3 py-2">
              <div className="text-sm">
                <span className="font-medium">{d.document_type}</span> {d.document_number} · {d.supplier_name}
              </div>
              <button onClick={() => setLinkedDocs(prev => prev.filter(x => x !== id))}><X className="h-4 w-4" /></button>
            </div>
          );
        })}
      </CardContent></Card>

      <div className="flex gap-2 sticky bottom-4">
        <Button variant="outline" onClick={() => handleSave(false)} disabled={saving} className="flex-1">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Save className="h-4 w-4 mr-1" /> Bozza</>}
        </Button>
        <Button onClick={() => handleSave(true)} disabled={saving} className="flex-1">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Finalizza & QR"}
        </Button>
      </div>

      {/* Pantry picker */}
      <Dialog open={pickerOpen} onOpenChange={setPickerOpen}>
        <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Scegli da dispensa</DialogTitle></DialogHeader>
          <div className="space-y-2">
            {pantry.length === 0 && <p className="text-sm text-muted-foreground">Dispensa vuota</p>}
            {pantry.map(p => (
              <button key={p.id} onClick={() => addFromPantry(p)} className="w-full text-left border border-border rounded-lg p-3 hover:bg-muted">
                <p className="font-medium">{p.product_name}</p>
                <p className="text-xs text-muted-foreground">
                  {p.lot_number && `Lotto ${p.lot_number} · `}
                  {p.expiry_date && `Scad. ${format(new Date(p.expiry_date), "dd/MM/yyyy")}`}
                </p>
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* Doc picker */}
      <Dialog open={docPickerOpen} onOpenChange={setDocPickerOpen}>
        <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Collega documenti</DialogTitle></DialogHeader>
          <div className="space-y-2">
            {docs.length === 0 && <p className="text-sm text-muted-foreground">Nessun documento. Caricane uno dalla sezione Bolle.</p>}
            {docs.map(d => (
              <button
                key={d.id}
                onClick={() => { setLinkedDocs(prev => prev.includes(d.id) ? prev.filter(x => x !== d.id) : [...prev, d.id]); }}
                className={`w-full text-left border rounded-lg p-3 ${linkedDocs.includes(d.id) ? "border-primary bg-primary/5" : "border-border"}`}
              >
                <p className="font-medium capitalize">{d.document_type} {d.document_number}</p>
                <p className="text-xs text-muted-foreground">{d.supplier_name}</p>
              </button>
            ))}
          </div>
          <Button onClick={() => setDocPickerOpen(false)}>Conferma</Button>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default RestaurantHaccpLabelNewPage;
