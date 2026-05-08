import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, FileText, AlertTriangle, CheckCircle2, XCircle } from "lucide-react";
import { format } from "date-fns";
import { it } from "date-fns/locale";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

const PublicHaccpLabelPage = () => {
  const { token } = useParams<{ token: string }>();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    (async () => {
      try {
        const res = await fetch(`${SUPABASE_URL}/functions/v1/get-haccp-label?token=${encodeURIComponent(token)}`);
        const json = await res.json();
        if (!res.ok) { setError(json.error || "Errore"); }
        else { setData(json); }
      } catch (e: any) { setError(e?.message || "Errore"); }
      finally { setLoading(false); }
    })();
  }, [token]);

  if (loading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  if (error) return <div className="min-h-screen flex items-center justify-center p-4"><Card><CardContent className="p-8 text-center">{error}</CardContent></Card></div>;
  if (!data) return null;

  const { label, restaurant, ingredients, documents } = data;

  const statusBadge = () => {
    if (label.computed_status === "ritirato") return <Badge variant="destructive" className="gap-1"><XCircle className="h-3 w-3" /> Ritirato</Badge>;
    if (label.computed_status === "scaduto") return <Badge className="bg-amber-500 text-white gap-1"><AlertTriangle className="h-3 w-3" /> Scaduto</Badge>;
    if (label.computed_status === "bozza") return <Badge variant="secondary">Bozza</Badge>;
    return <Badge className="bg-emerald-500 text-white gap-1"><CheckCircle2 className="h-3 w-3" /> Valido</Badge>;
  };

  return (
    <div className="min-h-screen bg-muted/30 p-4 max-w-2xl mx-auto space-y-4">
      <Card>
        <CardContent className="p-6 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <h1 className="text-xl font-bold">{label.preparation_name}</h1>
            {statusBadge()}
          </div>
          {restaurant && (
            <p className="text-sm text-muted-foreground">{restaurant.name} {restaurant.address && `· ${restaurant.address}`}</p>
          )}
          <div className="grid grid-cols-2 gap-2 text-sm pt-2">
            <div><span className="text-muted-foreground">Lotto:</span> <b>{label.internal_lot_code}</b></div>
            <div><span className="text-muted-foreground">Conserv:</span> <b className="capitalize">{label.conservation_type}</b></div>
            <div><span className="text-muted-foreground">Produzione:</span> <b>{format(new Date(label.production_date), "dd MMM yyyy", { locale: it })}</b></div>
            <div><span className="text-muted-foreground">Scadenza:</span> <b>{format(new Date(label.expiration_date), "dd MMM yyyy", { locale: it })}</b></div>
            {label.quantity != null && <div><span className="text-muted-foreground">Qtà:</span> <b>{label.quantity} {label.unit}</b></div>}
            {label.operator_name && <div><span className="text-muted-foreground">Operatore:</span> <b>{label.operator_name}</b></div>}
          </div>
          {label.allergens?.length > 0 && (
            <div className="pt-2 text-sm"><b>Allergeni:</b> {label.allergens.join(", ")}</div>
          )}
          {label.notes && <div className="text-sm text-muted-foreground">{label.notes}</div>}
          {label.cancel_reason && (
            <div className="text-sm text-destructive bg-destructive/10 rounded p-2">
              <b>Motivo annullamento:</b> {label.cancel_reason}
            </div>
          )}
        </CardContent>
      </Card>

      {ingredients.length > 0 && (
        <Card><CardContent className="p-4 space-y-2">
          <h2 className="font-semibold">Tracciabilità ingredienti</h2>
          {ingredients.map((i: any, idx: number) => (
            <div key={idx} className="border-b border-border last:border-0 pb-2 text-sm">
              <div className="font-medium">{i.ingredient_name} {i.quantity_used && `· ${i.quantity_used} ${i.unit || ""}`}</div>
              <div className="text-xs text-muted-foreground">
                {i.source_lot_code && `Lotto ${i.source_lot_code}`}
                {i.supplier_name && ` · Fornitore ${i.supplier_name}`}
                {i.ingredient_expiration_date && ` · Scad. ${format(new Date(i.ingredient_expiration_date), "dd/MM/yyyy")}`}
              </div>
            </div>
          ))}
        </CardContent></Card>
      )}

      {documents.length > 0 && (
        <Card><CardContent className="p-4 space-y-2">
          <h2 className="font-semibold">Bolle / Documenti</h2>
          {documents.map((d: any) => (
            <a key={d.id} href={d.file_url || d.photo_url} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-2 border border-border rounded-lg p-2 hover:bg-muted">
              <FileText className="h-4 w-4 text-primary" />
              <div className="flex-1 min-w-0">
                <div className="font-medium capitalize text-sm">{d.document_type} {d.document_number}</div>
                <div className="text-xs text-muted-foreground">{d.supplier_name} {d.document_date && `· ${format(new Date(d.document_date), "dd/MM/yyyy")}`}</div>
              </div>
            </a>
          ))}
        </CardContent></Card>
      )}

      <p className="text-center text-xs text-muted-foreground py-4">Tracciabilità HACCP — Cibarius</p>
    </div>
  );
};

export default PublicHaccpLabelPage;
