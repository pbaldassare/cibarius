import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useRestaurant } from "@/hooks/useRestaurant";
import { supabase } from "@/integrations/supabase/client";
import MobileHeader from "@/components/MobileHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, QrCode, Loader2, Search, FileText } from "lucide-react";
import { format } from "date-fns";
import { it } from "date-fns/locale";

interface Label {
  id: string;
  preparation_name: string;
  internal_lot_code: string;
  production_date: string;
  expiration_date: string;
  conservation_type: string;
  status: string;
  created_at: string;
}

const RestaurantHaccpLabelsPage = () => {
  const { restaurant } = useRestaurant();
  const [labels, setLabels] = useState<Label[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"finalized" | "draft" | "cancelled">("finalized");
  const [search, setSearch] = useState("");

  const fetchLabels = async () => {
    if (!restaurant) return;
    setLoading(true);
    const { data } = await supabase
      .from("haccp_preparation_labels")
      .select("id, preparation_name, internal_lot_code, production_date, expiration_date, conservation_type, status, created_at")
      .eq("restaurant_id", restaurant.id)
      .order("created_at", { ascending: false });
    setLabels((data as Label[]) || []);
    setLoading(false);
  };

  useEffect(() => { fetchLabels(); }, [restaurant]);

  const filtered = labels.filter(l =>
    l.status === tab &&
    (!search || l.preparation_name.toLowerCase().includes(search.toLowerCase()) || l.internal_lot_code.toLowerCase().includes(search.toLowerCase()))
  );

  const today = new Date().toISOString().slice(0, 10);

  const statusBadge = (l: Label) => {
    if (l.status === "cancelled") return <Badge variant="destructive">Ritirato</Badge>;
    if (l.status === "draft") return <Badge variant="secondary">Bozza</Badge>;
    if (l.expiration_date < today) return <Badge className="bg-amber-500 text-white">Scaduto</Badge>;
    return <Badge className="bg-emerald-500 text-white">Valido</Badge>;
  };

  return (
    <div className="space-y-4 p-4">
      <MobileHeader title="Etichette HACCP" />

      <div className="flex gap-2">
        <Link to="/restaurant/haccp-labels/new" className="flex-1">
          <Button className="w-full gap-2"><Plus className="h-4 w-4" /> Nuova etichetta</Button>
        </Link>
        <Link to="/restaurant/haccp-documents">
          <Button variant="outline" className="gap-2"><FileText className="h-4 w-4" /> Bolle</Button>
        </Link>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Cerca per nome o lotto..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
      </div>

      <Tabs value={tab} onValueChange={(v: any) => setTab(v)}>
        <TabsList className="grid grid-cols-3 w-full">
          <TabsTrigger value="finalized">Attive</TabsTrigger>
          <TabsTrigger value="draft">Bozze</TabsTrigger>
          <TabsTrigger value="cancelled">Annullate</TabsTrigger>
        </TabsList>
      </Tabs>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
      ) : filtered.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground">Nessuna etichetta</CardContent></Card>
      ) : (
        <div className="space-y-2">
          {filtered.map(l => (
            <Link key={l.id} to={`/restaurant/haccp-labels/${l.id}`}>
              <Card className="hover:shadow-md transition-shadow">
                <CardContent className="p-3 flex items-center gap-3">
                  <div className="rounded-lg bg-primary/10 p-2"><QrCode className="h-5 w-5 text-primary" /></div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold truncate">{l.preparation_name}</p>
                      {statusBadge(l)}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Lotto {l.internal_lot_code} · Scad. {format(new Date(l.expiration_date), "dd MMM yyyy", { locale: it })} · {l.conservation_type}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
};

export default RestaurantHaccpLabelsPage;
