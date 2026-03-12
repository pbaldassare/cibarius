import { useState, useEffect } from "react";
import AdminLayout from "@/components/AdminLayout";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle,
} from "@/components/ui/sheet";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Search, Plus, Camera, Bot, ScanBarcode, PenLine, Package, ChevronLeft, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";

type Product = {
  id: string;
  name: string;
  brand: string | null;
  barcode: string | null;
  category: string | null;
  calories_100g: number | null;
  macros_100g: any;
  image_url: string | null;
  serving_size_g: number | null;
  unit: string | null;
  created_at: string;
  template_id: string | null;
};

const PAGE_SIZE = 25;

const sourceIcon = (p: Product) => {
  if (p.barcode) return { icon: ScanBarcode, label: "Barcode", color: "bg-blue-100 text-blue-700" };
  if (p.image_url) return { icon: Camera, label: "Foto/AI", color: "bg-purple-100 text-purple-700" };
  if (p.template_id) return { icon: Bot, label: "Template AI", color: "bg-emerald-100 text-emerald-700" };
  return { icon: PenLine, label: "Manuale", color: "bg-amber-100 text-amber-700" };
};

const AdminProductsDbPage = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [sourceFilter, setSourceFilter] = useState("all");
  const [page, setPage] = useState(0);
  const [selected, setSelected] = useState<Product | null>(null);
  const [addOpen, setAddOpen] = useState(false);

  const form = useForm({
    defaultValues: {
      name: "", brand: "", barcode: "", category: "",
      calories_100g: 0, protein: 0, carbs: 0, fats: 0, sugars: 0,
      serving_size_g: 0, unit: "g", image_url: "",
    },
  });

  const fetchProducts = async () => {
    setLoading(true);
    let query = supabase
      .from("products")
      .select("*", { count: "exact" })
      .order("created_at", { ascending: false })
      .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

    if (search) {
      query = query.or(`name.ilike.%${search}%,brand.ilike.%${search}%,barcode.ilike.%${search}%`);
    }

    if (sourceFilter === "barcode") query = query.not("barcode", "is", null);
    else if (sourceFilter === "photo") query = query.not("image_url", "is", null).is("barcode", null);
    else if (sourceFilter === "template") query = query.not("template_id", "is", null).is("barcode", null).is("image_url", null);
    else if (sourceFilter === "manual") query = query.is("barcode", null).is("image_url", null).is("template_id", null);

    const { data, count, error } = await query;
    if (!error) {
      setProducts(data ?? []);
      setTotalCount(count ?? 0);
    }
    setLoading(false);
  };

  useEffect(() => { fetchProducts(); }, [page, sourceFilter]);

  useEffect(() => {
    const t = setTimeout(() => { setPage(0); fetchProducts(); }, 400);
    return () => clearTimeout(t);
  }, [search]);

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  const handleAdd = async (values: any) => {
    const macros = { protein: values.protein, carbs: values.carbs, fats: values.fats, sugars: values.sugars };
    const { error } = await supabase.from("products").insert({
      name: values.name,
      brand: values.brand || null,
      barcode: values.barcode || null,
      category: values.category || null,
      calories_100g: values.calories_100g || null,
      macros_100g: macros,
      serving_size_g: values.serving_size_g || null,
      unit: values.unit || "g",
      image_url: values.image_url || null,
    });
    if (error) {
      toast.error("Errore nel salvataggio");
    } else {
      toast.success("Prodotto aggiunto");
      setAddOpen(false);
      form.reset();
      fetchProducts();
    }
  };

  const macros = (p: Product) => {
    const m = p.macros_100g as any;
    if (!m) return null;
    return m;
  };

  return (
    <AdminLayout>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Package className="h-6 w-6" /> Database Prodotti
          </h1>
          <p className="text-sm text-muted-foreground mt-1">{totalCount} prodotti totali</p>
        </div>
        <Button onClick={() => setAddOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" /> Aggiungi
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Cerca per nome, brand o barcode..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={sourceFilter} onValueChange={(v) => { setSourceFilter(v); setPage(0); }}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Fonte" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tutte le fonti</SelectItem>
            <SelectItem value="barcode">Barcode</SelectItem>
            <SelectItem value="photo">Foto / AI</SelectItem>
            <SelectItem value="template">Template AI</SelectItem>
            <SelectItem value="manual">Manuale</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Prodotto</TableHead>
                <TableHead>Brand</TableHead>
                <TableHead>Fonte</TableHead>
                <TableHead className="text-right">kcal/100g</TableHead>
                <TableHead className="text-right">P</TableHead>
                <TableHead className="text-right">C</TableHead>
                <TableHead className="text-right">G</TableHead>
                <TableHead>Barcode</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 8 }).map((_, j) => (
                      <TableCell key={j}><div className="h-4 bg-muted rounded animate-pulse w-16" /></TableCell>
                    ))}
                  </TableRow>
                ))
              ) : products.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-10 text-muted-foreground">
                    Nessun prodotto trovato
                  </TableCell>
                </TableRow>
              ) : (
                products.map((p) => {
                  const src = sourceIcon(p);
                  const m = macros(p);
                  return (
                    <TableRow
                      key={p.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => setSelected(p)}
                    >
                      <TableCell className="font-medium max-w-[200px] truncate">{p.name}</TableCell>
                      <TableCell className="text-muted-foreground">{p.brand || "—"}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={`gap-1 ${src.color}`}>
                          <src.icon className="h-3 w-3" />
                          {src.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right tabular-nums">{p.calories_100g ?? "—"}</TableCell>
                      <TableCell className="text-right tabular-nums">{m?.protein ?? "—"}</TableCell>
                      <TableCell className="text-right tabular-nums">{m?.carbs ?? "—"}</TableCell>
                      <TableCell className="text-right tabular-nums">{m?.fats ?? "—"}</TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground">{p.barcode || "—"}</TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4">
          <p className="text-sm text-muted-foreground">
            Pagina {page + 1} di {totalPages}
          </p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(p => p - 1)}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Detail Sheet */}
      <Sheet open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <SheetContent className="overflow-y-auto">
          {selected && (
            <>
              <SheetHeader>
                <SheetTitle className="text-lg">{selected.name}</SheetTitle>
              </SheetHeader>
              <div className="mt-6 space-y-4">
                {selected.image_url && (
                  <img src={selected.image_url} alt={selected.name} className="w-full h-48 object-contain rounded-lg bg-muted" />
                )}
                <div className="grid grid-cols-2 gap-3">
                  <Detail label="Brand" value={selected.brand} />
                  <Detail label="Categoria" value={selected.category} />
                  <Detail label="Barcode" value={selected.barcode} />
                  <Detail label="Unità" value={selected.unit} />
                  <Detail label="Porzione (g)" value={selected.serving_size_g?.toString()} />
                  <Detail label="Fonte" value={sourceIcon(selected).label} />
                </div>

                <div className="border-t pt-4">
                  <p className="text-sm font-semibold mb-2">Valori per 100g</p>
                  <div className="grid grid-cols-2 gap-3">
                    <Detail label="Calorie" value={selected.calories_100g?.toString()} />
                    <Detail label="Proteine" value={macros(selected)?.protein?.toString()} />
                    <Detail label="Carboidrati" value={macros(selected)?.carbs?.toString()} />
                    <Detail label="Grassi" value={macros(selected)?.fats?.toString()} />
                    <Detail label="Zuccheri" value={macros(selected)?.sugars?.toString()} />
                  </div>
                </div>

                <div className="border-t pt-4">
                  <Detail label="ID" value={selected.id} />
                  <Detail label="Template ID" value={selected.template_id} />
                  <Detail label="Creato il" value={new Date(selected.created_at).toLocaleString("it-IT")} />
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* Add Sheet */}
      <Sheet open={addOpen} onOpenChange={setAddOpen}>
        <SheetContent className="overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Aggiungi Prodotto</SheetTitle>
          </SheetHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleAdd)} className="mt-6 space-y-4">
              <FormField control={form.control} name="name" rules={{ required: "Nome obbligatorio" }} render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome *</FormLabel>
                  <FormControl><Input {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="brand" render={({ field }) => (
                <FormItem>
                  <FormLabel>Brand</FormLabel>
                  <FormControl><Input {...field} /></FormControl>
                </FormItem>
              )} />
              <FormField control={form.control} name="barcode" render={({ field }) => (
                <FormItem>
                  <FormLabel>Barcode</FormLabel>
                  <FormControl><Input {...field} /></FormControl>
                </FormItem>
              )} />
              <FormField control={form.control} name="category" render={({ field }) => (
                <FormItem>
                  <FormLabel>Categoria</FormLabel>
                  <FormControl><Input {...field} /></FormControl>
                </FormItem>
              )} />
              <FormField control={form.control} name="image_url" render={({ field }) => (
                <FormItem>
                  <FormLabel>URL Immagine</FormLabel>
                  <FormControl><Input {...field} /></FormControl>
                </FormItem>
              )} />

              <div className="border-t pt-4">
                <p className="text-sm font-semibold mb-3">Valori nutrizionali (per 100g)</p>
                <div className="grid grid-cols-2 gap-3">
                  <FormField control={form.control} name="calories_100g" render={({ field }) => (
                    <FormItem>
                      <FormLabel>kcal</FormLabel>
                      <FormControl><Input type="number" {...field} onChange={e => field.onChange(+e.target.value)} /></FormControl>
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="protein" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Proteine (g)</FormLabel>
                      <FormControl><Input type="number" {...field} onChange={e => field.onChange(+e.target.value)} /></FormControl>
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="carbs" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Carboidrati (g)</FormLabel>
                      <FormControl><Input type="number" {...field} onChange={e => field.onChange(+e.target.value)} /></FormControl>
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="fats" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Grassi (g)</FormLabel>
                      <FormControl><Input type="number" {...field} onChange={e => field.onChange(+e.target.value)} /></FormControl>
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="sugars" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Zuccheri (g)</FormLabel>
                      <FormControl><Input type="number" {...field} onChange={e => field.onChange(+e.target.value)} /></FormControl>
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="serving_size_g" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Porzione (g)</FormLabel>
                      <FormControl><Input type="number" {...field} onChange={e => field.onChange(+e.target.value)} /></FormControl>
                    </FormItem>
                  )} />
                </div>
              </div>

              <Button type="submit" className="w-full mt-4">Salva Prodotto</Button>
            </form>
          </Form>
        </SheetContent>
      </Sheet>
    </AdminLayout>
  );
};

const Detail = ({ label, value }: { label: string; value?: string | null }) => (
  <div>
    <p className="text-xs text-muted-foreground">{label}</p>
    <p className="text-sm font-medium text-foreground truncate">{value || "—"}</p>
  </div>
);

export default AdminProductsDbPage;
