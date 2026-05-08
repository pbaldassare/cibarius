import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Loader2, QrCode } from "lucide-react";
import { format } from "date-fns";

const AdminHaccpLabelsPage = () => {
  const [labels, setLabels] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("haccp_preparation_labels")
        .select("id, preparation_name, internal_lot_code, production_date, expiration_date, status, restaurant_id, restaurants(name)")
        .order("created_at", { ascending: false })
        .limit(500);
      setLabels(data || []);
      setLoading(false);
    })();
  }, []);

  const filtered = labels.filter(l =>
    !search || l.preparation_name.toLowerCase().includes(search.toLowerCase())
    || l.internal_lot_code.toLowerCase().includes(search.toLowerCase())
    || (l as any).restaurants?.name?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-4">
      <h1 className="text-2xl font-bold">Etichette HACCP — Tutti i ristoranti</h1>
      <Input placeholder="Cerca..." value={search} onChange={e => setSearch(e.target.value)} />
      {loading ? <Loader2 className="h-6 w-6 animate-spin" /> :
        <div className="space-y-2">
          {filtered.map(l => (
            <Link key={l.id} to={`/restaurant/haccp-labels/${l.id}`}>
              <Card className="hover:shadow-md transition-shadow"><CardContent className="p-3 flex items-center gap-3">
                <QrCode className="h-5 w-5 text-primary" />
                <div className="flex-1">
                  <div className="font-semibold">{l.preparation_name}</div>
                  <div className="text-xs text-muted-foreground">
                    {(l as any).restaurants?.name} · Lotto {l.internal_lot_code} · Scad. {format(new Date(l.expiration_date), "dd/MM/yyyy")}
                  </div>
                </div>
                <Badge variant={l.status === "cancelled" ? "destructive" : l.status === "draft" ? "secondary" : "default"}>{l.status}</Badge>
              </CardContent></Card>
            </Link>
          ))}
        </div>
      }
    </div>
  );
};

export default AdminHaccpLabelsPage;
