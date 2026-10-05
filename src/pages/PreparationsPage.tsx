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
import { searchFoodProgressive, type FoodSearchResult } from "@/lib/search-food";
import { compareByExpiry, getCoarseExpiryStatus } from "@/lib/expiry-status";
import { formatDisplayDate, formatExpiryDate } from "@/lib/format-date";
import { DateInputWithHint } from "@/components/DateInputWithHint";
import { matchesSearch } from "@/lib/text-match";
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
  product_id: string | null;
  quantity: number | null;
  unit: string | null;
  product: { name: string } | null;
}

interface PrepAllergen {
  id: string;
  allergen: { name: string; code: string } | null;
}

interface Allergen {
  id: string;
  name: string;
  code: string;
}

type ExpiryStatus = "expired" | "expiring" | "ok";

const getStatus = (d: string): ExpiryStatus => {
  const status = getCoarseExpiryStatus(d);
  return status === "nodate" ? "ok" : status;
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
  const [ingredients, setIngredients] = useState<{ name: string; quantity: string; unit: string; product_id?: string | null }[]>([]);
  const [ingredientName, setIngredientName] = useState("");
  const [ingredientQty, setIngredientQty] = useState("");
  const [ingredientUnit, setIngredientUnit] = useState("g");
  const [pendingProductId, setPendingProductId] = useState<string | null>(null);
  const [catalogQuery, setCatalogQuery] = useState("");
  const debouncedCatalogQuery = useDebounce(catalogQuery, 300);
  const [catalogResults, setCatalogResults] = useState<FoodSearchResult[]>([]);
  const [catalogSearching, setCatalogSearching] = useState(false);

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

  useEffect(() => {
    if (debouncedCatalogQuery.trim().length < 2) {
      setCatalogResults([]);
      setCatalogSearching(false);
      return;
    }
    setCatalogSearching(true);
    const abort = searchFoodProgressive(debouncedCatalogQuery.trim(), (results, _phase, done) => {
      setCatalogResults(results.slice(0, 8));
      if (done) setCatalogSearching(false);
    });
    return abort;
  }, [debouncedCatalogQuery]);

  const HACCP_LABEL_SELECT_WITH_PORTIONS =
    "id,preparation_name,expiration_date,production_date,conservation_type,quantity,unit,portions,internal_lot_code,notes,status,source_preparation_id";
  const HACCP_LABEL_SELECT_LEGACY =
    "id,preparation_name,expiration_date,production_date,conservation_type,quantity,unit,internal_lot_code,notes,status,source_preparation_id";

  const fetchItems = async () => {
    if (!user) {
      setLoading(false);
      return;
    }
    // useRestaurant può essere ancora null: restiamo sullo skeleton finché non arriva il ristorante
    if (isRestaurant && !restaurant) {
      return;
    }
    try {
      let query = supabase.from("preparations").select("*").order("use_by_date", { ascending: true });
      if (isRestaurant && restaurant) {
        query = query.eq("restaurant_id", restaurant.id);
      } else {
        query = query.eq("owner_user_id", user.id);
      }
      const { data, error: prepError } = await query;
      if (prepError) {
        console.error("preparations fetch:", prepError.message);
        toast({ variant: "destructive", title: "Errore caricamento preparazioni", description: prepError.message });
        setItems([]);
        return;
      }
      let merged: Preparation[] = (data as unknown as Preparation[]) ?? [];

      // Include HACCP preparation labels (restaurant only). Labels linked to a preparation REPLACE
      // the legacy entry so the user opens the editable HACCP label (ingredients + documents).
      if (isRestaurant && restaurant) {
        let labelsRes = await supabase
          .from("haccp_preparation_labels")
          .select(HACCP_LABEL_SELECT_WITH_PORTIONS)
          .eq("restaurant_id", restaurant.id)
          .neq("status", "cancelled")
          .order("expiration_date", { ascending: true });
        if (labelsRes.error?.message?.includes("portions")) {
          labelsRes = await supabase
            .from("haccp_preparation_labels")
            .select(HACCP_LABEL_SELECT_LEGACY)
            .eq("restaurant_id", restaurant.id)
            .neq("status", "cancelled")
            .order("expiration_date", { ascending: true });
        }
        const labels = labelsRes.data;
        if (labelsRes.error) {
          console.error("haccp_preparation_labels fetch:", labelsRes.error.message);
        } else if (labels) {
          const mapStorage = (c: string | null): string =>
            c === "frigo" || c === "freezer" || c === "ambiente" ? c : "ambiente";
          const linkedPrepIds = new Set(
            labels.map((l: { source_preparation_id: string | null }) => l.source_preparation_id).filter(Boolean)
          );
          merged = merged.filter((p) => !linkedPrepIds.has(p.id));
          const haccpItems: Preparation[] = labels.map((l: Record<string, unknown>) => ({
            id: `haccp:${l.id}`,
            name: String(l.preparation_name ?? "Etichetta HACCP"),
            description: (l.notes as string | null) ?? null,
            prepared_at: (l.production_date as string) ?? new Date().toISOString(),
            storage_type: mapStorage(l.conservation_type as string | null),
            use_by_date: (l.expiration_date as string) ?? "",
            portions: (l.portions as number | null | undefined) ?? null,
            notes: (l.notes as string | null) ?? null,
            image_url: null,
            label_code: (l.internal_lot_code as string | null) ?? null,
          }));
          merged = [...merged, ...haccpItems].sort(
            (a, b) => compareByExpiry(a.use_by_date, b.use_by_date)
          );
        }
      }

      setItems(merged);
    } catch (err) {
      console.error("fetchItems:", err);
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchItems(); }, [user, restaurant, isRestaurant]);

  const filtered = useMemo(() => {
    let list = items;
    if (storageTab !== "all") list = list.filter((i) => i.storage_type === storageTab);
    if (debouncedSearch) {
      list = list.filter((i) => matchesSearch(i.name, debouncedSearch));
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

  const pickCatalogResult = (result: FoodSearchResult) => {
    setIngredientName(result.name);
    setPendingProductId(result.local_product_id ?? null);
    setCatalogQuery("");
    setCatalogResults([]);
  };

  const addIngredient = () => {
    if (!ingredientName.trim()) return;
    setIngredients([...ingredients, {
      name: ingredientName.trim(),
      quantity: ingredientQty,
      unit: ingredientUnit,
      product_id: pendingProductId,
    }]);
    setIngredientName("");
    setIngredientQty("");
    setIngredientUnit("g");
    setPendingProductId(null);
    setCatalogQuery("");
    setCatalogResults([]);
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

      if (isRestaurant && prepId) {
        await supabase
          .from("haccp_preparation_labels")
          .update({ portions: parseInt(formPortions) || 1 })
          .eq("source_preparation_id", prepId);
      }

      // Save ingredients
      if (ingredients.length > 0) {
        await supabase.from("preparation_ingredients").insert(
          ingredients.map((ing) => ({
            preparation_id: prepId!,
            product_id: ing.product_id ?? null,
            custom_name: ing.product_id ? null : ing.name,
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
    setPendingProductId(null); setCatalogQuery(""); setCatalogResults([]);
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
      product_id: ing.product_id ?? null,
    })));
    setSelectedAllergens(detailAllergens.map(a => {
      const allergenName = a.allergen?.name;
      if (!allergenName) return "";
      const match = allergens.find(al => al.name === allergenName);
      return match?.id ?? "";
    }).filter(Boolean));
    setDetailOpen(false);
    setCreateOpen(true);
  };

  const createHaccpLabelFromPreparation = () => {
    if (!detailPrep || !isRestaurant) return;
    const params = new URLSearchParams();
    params.set("name", detailPrep.name);
    params.set("notes", detailPrep.notes ?? detailPrep.description ?? "");
    params.set("conservation", detailPrep.storage_type);
    params.set("expiration", detailPrep.use_by_date);
    if (detailPrep.portions) params.set("portions", String(detailPrep.portions));
    navigate(`/restaurant/haccp-labels/new?${params.toString()}`);
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
      supabase.from("preparation_ingredients").select("id, custom_name, product_id, quantity, unit, product:products(name)").eq("preparation_id", prep.id),
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
            <Input placeholder="Cerca..." aria-label="Cerca preparazione" className="h-9 rounded-xl border-0 bg-white pl-8 text-[13px] shadow-sm"
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
              const cfg = statusCfg[status] ?? statusCfg.ok;
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
                        {formatExpiryDate(item.use_by_date)}
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
                <Label>Porzioni fatte</Label>
                <Input type="number" min="1" step={1} value={formPortions} onChange={(e) => setFormPortions(e.target.value)} />
                <p className="text-[11px] text-muted-foreground">Quante porzioni ottieni da questa preparazione (non è un peso; serve per lo scarico in magazzino).</p>
              </div>
            </div>

            {/* Use-by date with smart suggestion */}
            <div className="space-y-1.5">
              <Label>Usare/Servire entro *</Label>
              <DateInputWithHint value={formUseBy} onChange={(e) => {
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
              <p className="text-[11px] text-muted-foreground">
                Cerca nel catalogo Cibarius: non devi digitare tutto a mano. La quantità è quella usata per l&apos;intera preparazione.
              </p>
              {ingredients.map((ing, i) => (
                <div key={i} className="flex items-center gap-2 rounded-lg bg-muted p-2 text-sm">
                  <span className="flex-1">{ing.name} {ing.quantity ? `— ${ing.quantity} ${ing.unit}` : ""}</span>
                  <button onClick={() => setIngredients(ingredients.filter((_, j) => j !== i))}>
                    <X className="h-3.5 w-3.5 text-muted-foreground" />
                  </button>
                </div>
              ))}
              <Input
                className="w-full"
                placeholder="Cerca nel catalogo (min. 2 lettere)…"
                aria-label="Cerca ingrediente nel catalogo"
                value={catalogQuery}
                onChange={(e) => {
                  setCatalogQuery(e.target.value);
                  if (!e.target.value.trim()) {
                    setPendingProductId(null);
                  }
                }}
              />
              {catalogSearching && catalogQuery.trim().length >= 2 && (
                <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                  <Loader2 className="h-3 w-3 animate-spin" /> Ricerca nel catalogo…
                </p>
              )}
              {catalogResults.length > 0 && (
                <div className="max-h-36 overflow-y-auto space-y-1 rounded-lg border border-border p-2">
                  {catalogResults.map((r, idx) => (
                    <button
                      key={`${r.name}-${idx}`}
                      type="button"
                      className="w-full text-left px-3 py-1.5 rounded hover:bg-secondary text-sm"
                      onClick={() => pickCatalogResult(r)}
                    >
                      {r.name}{r.brand ? ` (${r.brand})` : ""}
                      {r.local_product_id && <span className="text-[10px] text-muted-foreground ml-1">· catalogo</span>}
                    </button>
                  ))}
                </div>
              )}
              <div className="flex gap-2">
                <Input
                  className="flex-1"
                  placeholder={pendingProductId ? "Prodotto selezionato" : "Oppure nome libero"}
                  value={ingredientName}
                  onChange={(e) => {
                    setIngredientName(e.target.value);
                    setPendingProductId(null);
                  }}
                />
                <Input
                  className="w-20"
                  placeholder="Qtà"
                  aria-label="Quantità ingrediente per tutta la preparazione"
                  value={ingredientQty}
                  onChange={(e) => setIngredientQty(e.target.value)}
                />
                <Select value={ingredientUnit} onValueChange={setIngredientUnit}>
                  <SelectTrigger className="w-20"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["g", "kg", "ml", "l", "pz"].map((u) => <SelectItem key={u} value={u}>{u}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Button size="sm" variant="outline" onClick={addIngredient} aria-label="Aggiungi ingrediente">
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
            const cfg = statusCfg[status] ?? statusCfg.ok;
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
                      <p className="text-sm font-semibold">{formatDisplayDate(detailPrep.prepared_at)}</p>
                    </div>
                    <div className="rounded-xl bg-muted p-3">
                      <p className="text-[10px] font-medium text-muted-foreground">Usare entro</p>
                      <p className="text-sm font-semibold">{formatExpiryDate(detailPrep.use_by_date)}</p>
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
                            {a.allergen?.name ?? "Allergene"}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex flex-col gap-2">
                    {isRestaurant && (
                      <Button className="w-full gap-2" onClick={createHaccpLabelFromPreparation}>
                        <Tag className="h-4 w-4" /> Crea etichetta HACCP
                      </Button>
                    )}
                    <div className="flex gap-2">
                      <Button variant="outline" className="flex-1 gap-2" onClick={openEditForm}>
                        <ChefHat className="h-4 w-4" /> Modifica
                      </Button>
                      <Button variant="destructive" className="flex-1 gap-2" onClick={() => handleDelete(detailPrep.id)}>
                        <Trash2 className="h-4 w-4" /> Elimina
                      </Button>
                    </div>
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
