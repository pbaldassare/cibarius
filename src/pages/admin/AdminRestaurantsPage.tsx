import { useEffect, useState } from "react";
import AdminLayout from "@/components/AdminLayout";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Loader2, Search, Store, AlertTriangle, Package } from "lucide-react";
import { format } from "date-fns";

interface RestaurantRow {
  id: string;
  name: string;
  phone: string;
  address: string | null;
  owner_id: string;
  created_at: string;
  inventoryCount?: number;
  expiringCount?: number;
}

const AdminRestaurantsPage = () => {
  const [restaurants, setRestaurants] = useState<RestaurantRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    const fetch = async () => {
      const today = format(new Date(), "yyyy-MM-dd");
      const in3days = format(new Date(Date.now() + 3 * 86400000), "yyyy-MM-dd");

      const { data: rests } = await supabase.from("restaurants").select("*").order("created_at", { ascending: false });
      if (!rests) { setLoading(false); return; }

      // Fetch inventory counts per restaurant
      const { data: invCounts } = await supabase
        .from("inventory_items")
        .select("restaurant_id")
        .not("restaurant_id", "is", null);

      const { data: expCounts } = await supabase
        .from("inventory_items")
        .select("restaurant_id")
        .not("restaurant_id", "is", null)
        .lte("expiry_date", in3days)
        .gte("expiry_date", today);

      const invMap: Record<string, number> = {};
      const expMap: Record<string, number> = {};
      invCounts?.forEach(i => { if (i.restaurant_id) invMap[i.restaurant_id] = (invMap[i.restaurant_id] || 0) + 1; });
      expCounts?.forEach(i => { if (i.restaurant_id) expMap[i.restaurant_id] = (expMap[i.restaurant_id] || 0) + 1; });

      setRestaurants(rests.map(r => ({
        ...r,
        inventoryCount: invMap[r.id] || 0,
        expiringCount: expMap[r.id] || 0,
      })));
      setLoading(false);
    };
    fetch();
  }, []);

  const filtered = restaurants.filter(r =>
    !search || r.name.toLowerCase().includes(search.toLowerCase()) ||
    (r.address ?? "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <AdminLayout>
      <div className="mb-6 flex items-center gap-3">
        <Store className="h-6 w-6 text-primary" />
        <h1 className="text-2xl font-bold text-foreground">Gestione Ristoranti</h1>
      </div>

      <div className="relative mb-4 max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input placeholder="Cerca ristorante..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
      ) : (
        <div className="rounded-xl border border-border bg-card overflow-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Indirizzo</TableHead>
                <TableHead>Telefono</TableHead>
                <TableHead className="text-center">Prodotti</TableHead>
                <TableHead className="text-center">In scadenza</TableHead>
                <TableHead>Creato il</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map(r => (
                <TableRow key={r.id}>
                  <TableCell className="font-medium">{r.name}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{r.address || "—"}</TableCell>
                  <TableCell className="text-sm">{r.phone}</TableCell>
                  <TableCell className="text-center">
                    <Badge variant="secondary" className="gap-1">
                      <Package className="h-3 w-3" /> {r.inventoryCount}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    {(r.expiringCount ?? 0) > 0 ? (
                      <Badge variant="destructive" className="gap-1">
                        <AlertTriangle className="h-3 w-3" /> {r.expiringCount}
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-muted-foreground">0</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {format(new Date(r.created_at), "dd/MM/yyyy")}
                  </TableCell>
                </TableRow>
              ))}
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                    Nessun ristorante trovato
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      )}
    </AdminLayout>
  );
};

export default AdminRestaurantsPage;
