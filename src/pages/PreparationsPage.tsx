import { useState, useEffect, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import MobileHeader from "@/components/MobileHeader";
import { useAuth } from "@/hooks/useAuth";
import { useRole } from "@/hooks/useRole";
import { useRestaurant } from "@/hooks/useRestaurant";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { useDebounce } from "@/hooks/useDebounce";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle,
} from "@/components/ui/sheet";
import {
  Clock, Plus, Search, Filter, Package, ChevronRight, ChevronDown,
  Archive, Thermometer, Snowflake, Trash2, Loader2, X, ChefHat, Tag, Lightbulb,
} from "lucide-react";

/* ─── Types ─── */
interface Preparation {
  id: string;
  name: string;
  description: string | null;
  prepared_at: string;
  storage_type: string;
  use_by_date: string;
  portions: number | null;
  notes: string | null;
  image_url: string | null;
  label_code: string | null;
}

interface PrepIngredient {
  id: string;
  custom_name: string | null;
  quantity: number | null;
  unit: string | null;
  product: { name: string } | null;
}

interface PrepAllergen {
  id: string;
  allergen: { name: string; code: string };
}

interface Allergen {
  id: string;
  name: string;
  code: string;
}

type ExpiryStatus = "expired" | "expiring" | "ok";

const getStatus = (d: string): ExpiryStatus => {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const diff = (new Date(d).getTime() - today.getTime()) / 864e5;
  if (diff < 0) return "expired";
  if (diff <= 3) return "expiring";
  return "ok";
};

const statusCfg: Record<ExpiryStatus, { label: string; badgeBg: string; barColor: string }> = {
  expired:  { label: "SCADUTO",     badgeBg: "bg-[#E53935]", barColor: "bg-[#E53935]" },
  expiring: { label: "IN SCADENZA", badgeBg: "bg-[#F59E0B]", barColor: "bg-[#F59E0B]" },
  ok:       { label: "OK",          badgeBg: "bg-success",    barColor: "bg-success" },
};

const storageLabel: Record<string, string> = {
  frigo: "Frigo", freezer: "Congelatore", ambiente: "Dispensa",
};

const storageTabs = [
  { key: "all", label: "Tutto", icon: Package },
  { key: "ambiente", label: "Dispensa", icon: Archive },
  { key: "frigo", label: "Frigo", icon: Thermometer },
  { key: "freezer", label: "Congelatore", icon: Snowflake },
] as const;

/* ─── Smart defaults ─── */
const STORAGE_DAYS: Record<string, number> = {
  frigo: 3,
  freezer: 30,
  ambiente: 2,
};

const suggestUseByDate = (storage: string): string => {
  const days = STORAGE_DAYS[storage] ?? 3;
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().split("T")[0];
};

const generateLabelCode = (): string => {
  const chars = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  let code = "PREP-";
  for (let i = 0; i < 4; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
};

interface Props {
  isRestaurant?: boolean;
}

const PreparationsPage = ({ isRestaurant = false }: Props) => {
  const { user } = useAuth();
  const { role } = useRole();
  const { restaurant } = useRestaurant();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [items, setItems] = useState<Preparation[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 250);
  const [storageTab, setStorageTab] = useState("all");
  const [storageSheet, setStorageSheet] = useState(false);
  const [filterSheet, setFilterSheet] = useState(false);
  const [statusFilter, setStatusFilter] = useState(isRestaurant ? "all" : "relevant");

  // Detail view
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailPrep, setDetailPrep] = useState<Preparation | null>(null);
  const [detailIngredients, setDetailIngredients] = useState<PrepIngredient[]>([]);
  const [detailAllergens, setDetailAllergens] = useState<PrepAllergen[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);

  // Create/Edit form
  const [createOpen, setCreateOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [formName, setFormName] = useState("");
  const [formDesc, setFormDesc] = useState("");
  const [formStorage, setFormStorage] = useState("frigo");
  const [formUseBy, setFormUseBy] = useState("");
  const [formPortions, setFormPortions] = useState("1");
  const [formNotes, setFormNotes] = useState("");
  const [useByManuallySet, setUseByManuallySet] = useState(false);

  // Ingredients
  const [ingredients, setIngredients] = useState<{ name: string; quantity: string; unit: string }[]>([]);
  const [ingredientName, setIngredientName] = useState("");
  const [ingredientQty, setIngredientQty] = useState("");
  const [ingredientUnit, setIngredientUnit] = useState("g");

  // Allergens
  const [allergens, setAllergens] = useState<Allergen[]>([]);
  const [selectedAllergens, setSelectedAllergens] = useState<string[]>([]);

  useEffect(() => {
    supabase.from("allergens").select("*").then(({ data }) => {
      if (data) setAllergens(data as Allergen[]);
    });
  }, []);

  // Auto-suggest use_by_date when storage changes (only if not manually set)
  useEffect(() => {
    if (!useByManuallySet && !editingId) {
      setFormUseBy(suggestUseByDate(formStorage));
    }
  }, [formStorage, useByManuallySet, editingId]);

  const fetchItems = async () => {
    if (!user) return;
    let query = supabase.from("preparations").select("*").order("use_by_date", { ascending: true });
    if (isRestaurant && restaurant) {
      query = query.eq("restaurant_id", restaurant.id);
    } else {
      query = query.eq("owner_user_id", user.id);
    }
    const { data } = await query;
    let merged: Preparation[] = (data as unknown as Preparation[]) ?? [];

    // Include HACCP preparation labels (restaurant only) as virtual entries
    if (isRestaurant && restaurant) {
      const { data: labels } = await supabase
        .from("haccp_preparation_labels")
        .select("id,preparation_name,expiration_date,production_date,conservation_type,quantity,unit,internal_lot_code,notes,status")
        .eq("restaurant_id", restaurant.id)
        .neq("status", "cancelled")
        .order("expiration_date", { ascending: true });
      if (labels) {
        const mapStorage = (c: string): string =>
          c === "frigo" || c === "freezer" || c === "ambiente" ? c : "ambiente";
        const haccpItems: Preparation[] = labels.map((l: any) => ({
          id: `haccp:${l.id}`,
          name: l.preparation_name,
          description: l.notes ?? null,
          prepared_at: l.production_date,
          storage_type: mapStorage(l.conservation_type),
          use_by_date: l.expiration_date,
          portions: null,
          notes: l.notes ?? null,
          image_url: null,
          label_code: l.internal_lot_code ?? null,
        }));
        merged = [...merged, ...haccpItems].sort(
          (a, b) => new Date(a.use_by_date).getTime() - new Date(b.use_by_date).getTime()
        );
      }
    }

    setItems(merged);
    setLoading(false);
  };

  useEffect(() => { fetchItems(); }, [user, restaurant]);

  const filtered = useMemo(() => {
    let list = items;
    if (storageTab !== "all") list = list.filter((i) => i.storage_type === storageTab);
    if (debouncedSearch) {
      const q = debouncedSearch.toLowerCase();
      list = list.filter((i) => i.name.toLowerCase().includes(q));
    }
    if (statusFilter === "relevant") {
      list = list.filter((i) => { const s = getStatus(i.use_by_date); return s === "expired" || s === "expiring"; });
    } else if (statusFilter !== "all") {
      list = list.filter((i) => getStatus(i.use_by_date) === statusFilter);
    }
    const order: Record<ExpiryStatus, number> = { expired: 0, expiring: 1, ok: 2 };
    return [...list].sort((a, b) => order[getStatus(a.use_by_date)] - order[getStatus(b.use_by_date)]);
  }, [items, storageTab, debouncedSearch, statusFilter]);

  const activeFilterCount = useMemo(() => {
    let c = 0;
    if (statusFilter !== "relevant") c++;
    if (storageTab !== "all") c++;
    return c;
  }, [statusFilter, storageTab]);

  const addIngredient = () => {
    if (!ingredientName.trim()) return;
    setIngredients([...ingredients, { name: ingredientName.trim(), quantity: ingredientQty, unit: ingredientUnit }]);
    setIngredientName(""); setIngredientQty(""); setIngredientUnit("g");
  };

  const handleSave = async () => {
    if (!formName.trim() || !formUseBy) {
      toast({ variant: "destructive", title: "Nome e data scadenza obbligatori" });
      return;
    }
    setSaving(true);
    try {
      const payload: any = {
        name: formName.trim(),
        description: formDesc || null,
        storage_type: formStorage,
        use_by_date: formUseBy,
        portions: parseInt(formPortions) || 1,
        notes: formNotes || null,
      };

      let prepId = editingId;

      if (editingId) {
        const { error } = await supabase.from("preparations").update(payload).eq("id", editingId);
        if (error) throw error;
        await supabase.from("preparation_ingredients").delete().eq("preparation_id", editingId);
        await supabase.from("preparation_allergens").delete().eq("preparation_id", editingId);
      } else {
        // Generate label_code for new preparations
        payload.label_code = generateLabelCode();
        if (isRestaurant && restaurant) {
          payload.restaurant_id = restaurant.id;
        } else {
          payload.owner_user_id = user!.id;
        }
        const { data: prep, error } = await supabase.from("preparations").insert(payload).select("id").single();
        if (error) throw error;
        prepId = prep.id;
      }

      // Save ingredients
      if (ingredients.length > 0) {
        await supabase.from("preparation_ingredients").insert(
          ingredients.map((ing) => ({
            preparation_id: prepId!,
            custom_name: ing.name,
            quantity: parseFloat(ing.quantity) || null,
            unit: ing.unit || null,
          }))
        );
      }

      // Save allergens
      if (selectedAllergens.length > 0) {
        await supabase.from("preparation_allergens").insert(
          selectedAllergens.map((aid) => ({
            preparation_id: prepId!,
            allergen_id: aid,
          }))
        );
      }

      toast({ title: editingId ? "Preparazione aggiornata ✓" : "Preparazione creata ✓" });
      setCreateOpen(false);
      setDetailOpen(false);
      resetForm();
      fetchItems();
    } catch (err: any) {
      toast({ variant: "destructive", title: "Errore", description: err.message });
    } finally {
      setSaving(false);
    }
  };

  const resetForm = () => {
    setFormName(""); setFormDesc(""); setFormStorage("frigo"); setFormUseBy("");
    setFormPortions("1"); setFormNotes(""); setIngredients([]);
    setIngredientName(""); setIngredientQty(""); setIngredientUnit("g");
    setSelectedAllergens([]); setEditingId(null);
    setUseByManuallySet(false);
  };

  const openEditForm = () => {
    if (!detailPrep) return;
    setEditingId(detailPrep.id);
    setFormName(detailPrep.name);
    setFormDesc(detailPrep.description ?? "");
    setFormStorage(detailPrep.storage_type);
    setFormUseBy(detailPrep.use_by_date);
    setFormPortions(String(detailPrep.portions ?? 1));
    setFormNotes(detailPrep.notes ?? "");
    setUseByManuallySet(true); // Don't auto-suggest when editing
    setIngredients(detailIngredients.map(ing => ({
      name: ing.product?.name ?? ing.custom_name ?? "",
      quantity: ing.quantity ? String(ing.quantity) : "",
      unit: ing.unit ?? "g",
    })));
    setSelectedAllergens(detailAllergens.map(a => {
      const match = allergens.find(al => al.name === a.allergen.name);
      return match?.id ?? "";
    }).filter(Boolean));
    setDetailOpen(false);
    setCreateOpen(true);
  };

  const handleDelete = async (id: string) => {
    await supabase.from("preparations").delete().eq("id", id);
    toast({ title: "Preparazione eliminata" });
    setDetailOpen(false);
    fetchItems();
  };

  const openDetail = async (prep: Preparation) => {
    setDetailPrep(prep);
    setDetailOpen(true);
    setDetailLoading(true);
    const [ingRes, allRes] = await Promise.all([
      supabase.from("preparation_ingredients").select("id, custom_name, quantity, unit, product:products(name)").eq("preparation_id", prep.id),
      supabase.from("preparation_allergens").select("id, allergen:allergens(name, code)").eq("preparation_id", prep.id),
    ]);
    setDetailIngredients((ingRes.data ?? []) as unknown as PrepIngredient[]);
    setDetailAllergens((allRes.data ?? []) as unknown as PrepAllergen[]);
    setDetailLoading(false);
  };

  const storageChipLabel = storageTab === "all" ? "Tutto" : storageLabel[storageTab] ?? storageTab;

  if (loading) {
    return (
      <div style={{ backgroundColor: "#F5F7FA" }}>
        <MobileHeader title="Preparazioni" showBack={isRestaurant} />
        <main className="space-y-3 px-4 py-3 pb-32">
          <Skeleton className="h-9 w-full rounded-xl" />
          <Skeleton className="h-64 w-full rounded-2xl" />
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#F5F7FA" }}>
      <MobileHeader title="Preparazioni" showBack={isRestaurant} />
      <main className="space-y-3 px-4 pt-1 pb-28">

        {isRestaurant && (
          <div className="grid grid-cols-2 gap-2">
            <Link to="/restaurant/haccp-labels/new" className="block">
              <Button className="w-full gap-2">
                <Tag className="h-4 w-4" />
                Nuova etichetta
              </Button>
            </Link>
            <Link to="/restaurant/haccp-labels" className="block">
              <Button variant="outline" className="w-full gap-2">
                <ChevronRight className="h-4 w-4" />
                Etichette stampa
              </Button>
            </Link>
          </div>
        )}

        {/* Storage chip + Search + Filter */}
        <div className="flex gap-2 items-center">
          <button onClick={() => setStorageSheet(true)}
            className="flex items-center gap-1 rounded-xl bg-white px-3 py-2 text-[12px] font-semibold shadow-sm shrink-0"
            style={{ color: "#111827" }}>
            {storageChipLabel}
            <ChevronDown className="h-3 w-3" style={{ color: "#9CA3AF" }} />
          </button>
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2" style={{ color: "#9CA3AF" }} />
            <Input placeholder="Cerca..." className="h-9 rounded-xl border-0 bg-white pl-8 text-[13px] shadow-sm"
              value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <button onClick={() => setFilterSheet(true)}
            className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white shadow-sm">
            <Filter className="h-3.5 w-3.5" style={{ color: "#4B5563" }} />
            {activeFilterCount > 0 && (
              <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[8px] font-bold text-white">
                {activeFilterCount}
              </span>
            )}
          </button>
        </div>

        {/* List */}
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center gap-1.5 rounded-2xl bg-white p-8 shadow-sm">
            <ChefHat className="h-7 w-7" style={{ color: "#9CA3AF" }} />
            <p className="text-[13px] font-medium" style={{ color: "#111827" }}>Nessuna preparazione</p>
            <p className="text-[11px]" style={{ color: "#6B7280" }}>
              {isRestaurant ? "Usa + per una preparazione semplice oppure crea un'etichetta HACCP" : "Premi + per aggiungere"}
            </p>
          </div>
        ) : (
          <div className="space-y-1.5">
            {filtered.map((item) => {
              const status = getStatus(item.use_by_date);
              const cfg = statusCfg[status];
              return (
              <button key={item.id} onClick={() => {
                  if (item.id.startsWith("haccp:")) {
                    navigate(`/restaurant/haccp-labels/${item.id.slice(6)}`);
                  } else {
                    openDetail(item);
                  }
                }} className="flex w-full items-center gap-2.5 rounded-xl bg-white px-2.5 py-2 shadow-sm overflow-hidden text-left"
                  style={{ minHeight: 64 }}>
                  <div className={`w-1 self-stretch rounded-full ${cfg.barColor}`} />
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#F5F7FA]">
                    {item.id.startsWith("haccp:")
                      ? <Tag className="h-4 w-4" style={{ color: "#9CA3AF" }} />
                      : <ChefHat className="h-4 w-4" style={{ color: "#9CA3AF" }} />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-semibold truncate" style={{ color: "#111827" }}>{item.name}</p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="text-[11px] flex items-center gap-0.5" style={{ color: "#6B7280" }}>
                        <Clock className="h-2.5 w-2.5" />
                        {new Date(item.use_by_date).toLocaleDateString("it-IT")}
                      </span>
                      <span className="text-[10px]" style={{ color: "#9CA3AF" }}>
                        {storageLabel[item.storage_type]}
                        {item.portions && item.portions > 1 ? ` · ${item.portions} porz.` : ""}
                      </span>
                      {item.label_code && (
                        <span className="text-[9px] font-mono px-1 py-0.5 rounded bg-[#F3F4F6]" style={{ color: "#6B7280" }}>
                          {item.label_code}
                        </span>
                      )}
                      {item.id.startsWith("haccp:") && (
                        <span className="text-[9px] font-bold px-1 py-0.5 rounded bg-primary/10 text-primary">
                          HACCP
                        </span>
                      )}
                    </div>
                  </div>
                  <span className={`shrink-0 rounded-md px-1.5 py-0.5 text-[9px] font-bold text-white ${cfg.badgeBg}`}>
                    {cfg.label}
                  </span>
                  <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                </button>
              );
            })}
          </div>
        )}
      </main>

      {/* FAB */}
      <div className="fixed bottom-[calc(68px+env(safe-area-inset-bottom,0px)+0.75rem)] right-3.5 z-40">
        <button onClick={() => {
            if (isRestaurant) {
              navigate("/restaurant/haccp-labels/new");
              return;
            }
            resetForm();
            setCreateOpen(true);
          }}
          className="flex h-11 w-11 items-center justify-center rounded-full shadow-lg active:scale-95 transition-transform bg-primary"
          aria-label={isRestaurant ? "Crea etichetta HACCP" : "Aggiungi preparazione"}>
          <Plus className="h-5 w-5 text-white" />
        </button>
      </div>

      {/* ─── Create sheet ─── */}
      <Sheet open={createOpen} onOpenChange={setCreateOpen}>
        <SheetContent side="bottom" className="h-[85vh] rounded-t-2xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{editingId ? "Modifica Preparazione" : "Nuova Preparazione"}</SheetTitle>
          </SheetHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-1.5">
              <Label>Nome *</Label>
              <Input value={formName} onChange={(e) => setFormName(e.target.value)} placeholder="Es. Lasagne, Ragù..." />
            </div>
            <div className="space-y-1.5">
              <Label>Descrizione</Label>
              <Input value={formDesc} onChange={(e) => setFormDesc(e.target.value)} placeholder="Descrizione opzionale" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Conservazione *</Label>
                <Select value={formStorage} onValueChange={(v) => {
                  setFormStorage(v);
                  if (!useByManuallySet) setFormUseBy(suggestUseByDate(v));
                }}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ambiente">Dispensa</SelectItem>
                    <SelectItem value="frigo">Frigo</SelectItem>
                    <SelectItem value="freezer">Congelatore</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Porzioni</Label>
                <Input type="number" min="1" value={formPortions} onChange={(e) => setFormPortions(e.target.value)} />
              </div>
            </div>

            {/* Use-by date with smart suggestion */}
            <div className="space-y-1.5">
              <Label>Usare/Servire entro *</Label>
              <Input type="date" value={formUseBy} onChange={(e) => {
                setFormUseBy(e.target.value);
                setUseByManuallySet(true);
              }} />
              {!useByManuallySet && formUseBy && (
                <div className="flex items-center gap-1.5 mt-1">
                  <Lightbulb className="h-3 w-3" style={{ color: "#F59E0B" }} />
                  <span className="text-[11px]" style={{ color: "#92400E" }}>
                    Suggerito: +{STORAGE_DAYS[formStorage] ?? 3} giorni ({storageLabel[formStorage]})
                  </span>
                </div>
              )}
            </div>

            <div className="space-y-1.5">
              <Label>Note</Label>
              <Input value={formNotes} onChange={(e) => setFormNotes(e.target.value)} placeholder="Note opzionali" />
            </div>

            {/* Ingredients */}
            <div className="space-y-2">
              <Label>Ingredienti</Label>
              {ingredients.map((ing, i) => (
                <div key={i} className="flex items-center gap-2 rounded-lg bg-muted p-2 text-sm">
                  <span className="flex-1">{ing.name} {ing.quantity ? `— ${ing.quantity} ${ing.unit}` : ""}</span>
                  <button onClick={() => setIngredients(ingredients.filter((_, j) => j !== i))}>
                    <X className="h-3.5 w-3.5 text-muted-foreground" />
                  </button>
                </div>
              ))}
              <div className="flex gap-2">
                <Input className="flex-1" placeholder="Ingrediente" value={ingredientName} onChange={(e) => setIngredientName(e.target.value)} />
                <Input className="w-16" placeholder="Qtà" value={ingredientQty} onChange={(e) => setIngredientQty(e.target.value)} />
                <Select value={ingredientUnit} onValueChange={setIngredientUnit}>
                  <SelectTrigger className="w-20"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["g", "kg", "ml", "l", "pz"].map((u) => <SelectItem key={u} value={u}>{u}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Button size="sm" variant="outline" onClick={addIngredient}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Allergens */}
            <div className="space-y-2">
              <Label>Allergeni</Label>
              <div className="flex flex-wrap gap-2">
                {allergens.map((a) => {
                  const selected = selectedAllergens.includes(a.id);
                  return (
                    <button key={a.id}
                      onClick={() => setSelectedAllergens(selected
                        ? selectedAllergens.filter((id) => id !== a.id)
                        : [...selectedAllergens, a.id]
                      )}
                      className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                        selected ? "bg-primary text-white" : "bg-muted text-foreground"
                      }`}>
                      {a.name}
                    </button>
                  );
                })}
              </div>
            </div>

            <Button onClick={handleSave} disabled={saving} className="w-full">
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ChefHat className="mr-2 h-4 w-4" />}
              {editingId ? "Salva modifiche" : "Crea preparazione"}
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      {/* Storage sheet */}
      <Sheet open={storageSheet} onOpenChange={setStorageSheet}>
        <SheetContent side="bottom" className="rounded-t-2xl">
          <SheetHeader><SheetTitle>Conservazione</SheetTitle></SheetHeader>
          <div className="flex flex-col gap-1 py-3">
            {storageTabs.map(({ key, label, icon: Icon }) => (
              <button key={key} onClick={() => { setStorageTab(key); setStorageSheet(false); }}
                className={`flex items-center gap-3 rounded-xl px-4 py-3 text-[14px] font-medium transition-colors ${
                  storageTab === key ? "bg-primary/10 text-primary" : "text-foreground"
                }`}>
                <Icon className="h-4 w-4" />
                {key === "all" ? "Tutto" : label}
              </button>
            ))}
          </div>
        </SheetContent>
      </Sheet>

      {/* Filter sheet */}
      <Sheet open={filterSheet} onOpenChange={setFilterSheet}>
        <SheetContent side="bottom" className="rounded-t-2xl">
          <SheetHeader><SheetTitle>Filtri</SheetTitle></SheetHeader>
          <div className="space-y-4 py-4">
            <div>
              <p className="text-sm font-semibold mb-2" style={{ color: "#111827" }}>Stato</p>
              <div className="flex gap-2 flex-wrap">
                {[
                  { key: "relevant", label: "Da controllare" },
                  { key: "expired", label: "Scadute" },
                  { key: "expiring", label: "In scadenza" },
                  { key: "all", label: "Tutte" },
                ].map(({ key, label }) => (
                  <button key={key} onClick={() => setStatusFilter(key)}
                    className={`rounded-xl px-4 py-2 text-[13px] font-semibold transition-colors ${
                      statusFilter === key ? "bg-primary text-white" : "bg-[#F5F7FA] text-foreground"
                    }`}>
                    {label}
                  </button>
                ))}
              </div>
            </div>
            <Button className="w-full" onClick={() => setFilterSheet(false)}>Applica</Button>
          </div>
        </SheetContent>
      </Sheet>

      {/* Detail sheet */}
      <Sheet open={detailOpen} onOpenChange={setDetailOpen}>
        <SheetContent side="bottom" className="h-[80vh] rounded-t-2xl overflow-y-auto">
          {detailPrep && (() => {
            const status = getStatus(detailPrep.use_by_date);
            const cfg = statusCfg[status];
            return (
              <>
                <SheetHeader>
                  <SheetTitle className="flex items-center gap-2">
                    <ChefHat className="h-5 w-5 text-primary" />
                    {detailPrep.name}
                  </SheetTitle>
                </SheetHeader>
                <div className="space-y-4 py-4">
                  {/* Status + info */}
                  <div className="flex flex-wrap gap-2">
                    <span className={`rounded-md px-2 py-1 text-xs font-bold text-white ${cfg.badgeBg}`}>{cfg.label}</span>
                    <span className="rounded-md bg-muted px-2 py-1 text-xs font-medium">{storageLabel[detailPrep.storage_type]}</span>
                    {detailPrep.portions && <span className="rounded-md bg-muted px-2 py-1 text-xs font-medium">{detailPrep.portions} porzioni</span>}
                    {detailPrep.label_code && (
                      <span className="rounded-md bg-muted px-2 py-1 text-xs font-mono font-medium flex items-center gap-1">
                        <Tag className="h-3 w-3" />
                        {detailPrep.label_code}
                      </span>
                    )}
                  </div>

                  {/* Dates */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-xl bg-muted p-3">
                      <p className="text-[10px] font-medium text-muted-foreground">Preparato il</p>
                      <p className="text-sm font-semibold">{new Date(detailPrep.prepared_at).toLocaleDateString("it-IT")}</p>
                    </div>
                    <div className="rounded-xl bg-muted p-3">
                      <p className="text-[10px] font-medium text-muted-foreground">Usare entro</p>
                      <p className="text-sm font-semibold">{new Date(detailPrep.use_by_date).toLocaleDateString("it-IT")}</p>
                    </div>
                  </div>

                  {detailPrep.description && (
                    <div>
                      <p className="text-xs font-semibold text-muted-foreground mb-1">Descrizione</p>
                      <p className="text-sm">{detailPrep.description}</p>
                    </div>
                  )}

                  {detailPrep.notes && (
                    <div>
                      <p className="text-xs font-semibold text-muted-foreground mb-1">Note</p>
                      <p className="text-sm">{detailPrep.notes}</p>
                    </div>
                  )}

                  {/* Ingredients */}
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground mb-2">Ingredienti</p>
                    {detailLoading ? (
                      <Skeleton className="h-16 w-full rounded-xl" />
                    ) : detailIngredients.length === 0 ? (
                      <p className="text-sm text-muted-foreground">Nessun ingrediente registrato</p>
                    ) : (
                      <div className="space-y-1">
                        {detailIngredients.map((ing) => (
                          <div key={ing.id} className="flex items-center justify-between rounded-lg bg-muted px-3 py-2">
                            <span className="text-sm font-medium">{ing.product?.name ?? ing.custom_name ?? "—"}</span>
                            {ing.quantity && (
                              <span className="text-xs text-muted-foreground">{ing.quantity} {ing.unit}</span>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Allergens */}
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground mb-2">Allergeni</p>
                    {detailLoading ? (
                      <Skeleton className="h-8 w-full rounded-xl" />
                    ) : detailAllergens.length === 0 ? (
                      <p className="text-sm text-muted-foreground">Nessun allergene</p>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        {detailAllergens.map((a) => (
                          <span key={a.id} className="rounded-lg bg-[#FEF3C7] px-3 py-1.5 text-xs font-semibold" style={{ color: "#92400E" }}>
                            {a.allergen.name}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2">
                    <Button variant="outline" className="flex-1 gap-2" onClick={openEditForm}>
                      <ChefHat className="h-4 w-4" /> Modifica
                    </Button>
                    <Button variant="destructive" className="flex-1 gap-2" onClick={() => handleDelete(detailPrep.id)}>
                      <Trash2 className="h-4 w-4" /> Elimina
                    </Button>
                  </div>
                </div>
              </>
            );
          })()}
        </SheetContent>
      </Sheet>
    </div>
  );
};

export default PreparationsPage;
