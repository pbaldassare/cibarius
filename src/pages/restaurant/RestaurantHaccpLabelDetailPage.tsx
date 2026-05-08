import { useEffect, useState, useRef } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useRestaurant } from "@/hooks/useRestaurant";
import { supabase } from "@/integrations/supabase/client";
import MobileHeader from "@/components/MobileHeader";
import HaccpLabelPrintView from "@/components/HaccpLabelPrintView";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Printer, Copy, X, Loader2, ExternalLink } from "lucide-react";
import { format } from "date-fns";
import { it } from "date-fns/locale";

const RestaurantHaccpLabelDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { restaurant } = useRestaurant();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [label, setLabel] = useState<any>(null);
  const [ingredients, setIngredients] = useState<any[]>([]);
  const [docs, setDocs] = useState<any[]>([]);
  const [audit, setAudit] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [printOpen, setPrintOpen] = useState(false);
  const [printSize, setPrintSize] = useState<"small" | "medium" | "a4">("medium");
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const printRef = useRef<HTMLDivElement>(null);

  const fetchAll = async () => {
    if (!id) return;
    setLoading(true);
    const [{ data: l }, { data: ing }, { data: pdocs }, { data: a }] = await Promise.all([
      supabase.from("haccp_preparation_labels").select("*").eq("id", id).maybeSingle(),
      supabase.from("haccp_preparation_ingredients").select("*").eq("preparation_label_id", id),
      supabase.from("haccp_preparation_documents").select("document_id, haccp_documents(*)").eq("preparation_label_id", id),
      supabase.from("haccp_label_audit_log").select("*").eq("preparation_label_id", id).order("created_at", { ascending: false }),
    ]);
    setLabel(l);
    setIngredients(ing || []);
    setDocs((pdocs || []).map((d: any) => d.haccp_documents).filter(Boolean));
    setAudit(a || []);
    setLoading(false);
  };

  useEffect(() => { fetchAll(); }, [id]);

  const logAction = async (action: string, reason?: string) => {
    if (!user || !id) return;
    const { data: profile } = await supabase.from("profiles").select("full_name, email").eq("id", user.id).maybeSingle();
    await supabase.from("haccp_label_audit_log").insert({
      preparation_label_id: id, action, user_id: user.id,
      user_name: profile?.full_name || profile?.email || "—",
      reason: reason || null,
    } as any);
  };

  const publicUrl = label
    ? `${window.location.origin}/haccp/label/${label.qr_token}`
    : "";

  const handlePrint = async (isReprint: boolean) => {
    await logAction(isReprint ? "reprinted" : "printed");
    fetchAll();
    setTimeout(() => window.print(), 200);
  };

  const handleFinalize = async () => {
    if (!label) return;
    await supabase.from("haccp_preparation_labels").update({
      status: "finalized", finalized_at: new Date().toISOString(),
    }).eq("id", label.id);
    await logAction("finalized");
    toast({ title: "Etichetta finalizzata ✓" });
    fetchAll();
  };

  const handleCancel = async () => {
    if (!label || !cancelReason.trim()) {
      toast({ variant: "destructive", title: "Inserisci un motivo" });
      return;
    }
    const { error } = await supabase.from("haccp_preparation_labels").update({
      status: "cancelled", cancel_reason: cancelReason.trim(),
    }).eq("id", label.id);
    if (error) { toast({ variant: "destructive", title: "Errore", description: error.message }); return; }
    await logAction("cancelled", cancelReason.trim());
    setCancelOpen(false);
    setCancelReason("");
    toast({ title: "Etichetta annullata" });
    fetchAll();
  };

  const handleDuplicate = async () => {
    if (!label || !restaurant) return;
    const { data: newL, error } = await supabase.from("haccp_preparation_labels").insert({
      restaurant_id: label.restaurant_id,
      preparation_name: label.preparation_name,
      quantity: label.quantity, unit: label.unit,
      production_date: new Date().toISOString().slice(0, 10),
      expiration_date: new Date(Date.now() + 86400000).toISOString().slice(0, 10),
      conservation_type: label.conservation_type,
      operator_user_id: user?.id, operator_name: label.operator_name,
      allergens: label.allergens, notes: label.notes,
      status: "draft", created_by: user?.id,
    } as any).select("id").single();
    if (error || !newL) { toast({ variant: "destructive", title: "Errore", description: error?.message }); return; }
    if (ingredients.length > 0) {
      await supabase.from("haccp_preparation_ingredients").insert(
        ingredients.map(i => ({ ...i, id: undefined, created_at: undefined, preparation_label_id: newL.id })) as any
      );
    }
    await logAction("duplicated");
    toast({ title: "Duplicata come bozza" });
    navigate(`/restaurant/haccp-labels/${newL.id}`);
  };

  if (loading) return <div className="p-8 flex justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  if (!label) return <div className="p-8 text-center">Etichetta non trovata</div>;

  const isFinalized = label.status === "finalized";
  const isCancelled = label.status === "cancelled";
  const isDraft = label.status === "draft";

  return (
    <div className="space-y-4 p-4 pb-24 print:p-0">
      <div className="print:hidden">
        <MobileHeader title={label.preparation_name} />
      </div>

      {/* Print area */}
      <div className="hidden print:block">
        <HaccpLabelPrintView
          label={label}
          restaurantName={restaurant?.name || ""}
          size={printSize}
          publicUrl={publicUrl}
        />
      </div>

      <div className="print:hidden space-y-4">
        <Card><CardContent className="p-4 space-y-2">
          <div className="flex items-center gap-2 flex-wrap">
            {isDraft && <Badge variant="secondary">Bozza</Badge>}
            {isFinalized && <Badge className="bg-emerald-500 text-white">Finalizzata</Badge>}
            {isCancelled && <Badge variant="destructive">Annullata</Badge>}
            <Badge variant="outline">Lotto {label.internal_lot_code}</Badge>
          </div>
          <div className="text-sm space-y-1">
            <div><b>Produzione:</b> {format(new Date(label.production_date), "dd MMM yyyy", { locale: it })}</div>
            <div><b>Scadenza:</b> {format(new Date(label.expiration_date), "dd MMM yyyy", { locale: it })}</div>
            <div><b>Conservazione:</b> {label.conservation_type}</div>
            {label.quantity != null && <div><b>Quantità:</b> {label.quantity} {label.unit}</div>}
            {label.operator_name && <div><b>Operatore:</b> {label.operator_name}</div>}
            {label.allergens?.length > 0 && <div><b>Allergeni:</b> {label.allergens.join(", ")}</div>}
            {label.notes && <div><b>Note:</b> {label.notes}</div>}
            {label.cancel_reason && <div className="text-destructive"><b>Motivo annullamento:</b> {label.cancel_reason}</div>}
          </div>
        </CardContent></Card>

        {/* QR preview small */}
        <Card><CardContent className="p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">Etichetta & QR</h3>
            <a href={publicUrl} target="_blank" rel="noopener noreferrer" className="text-primary text-sm flex items-center gap-1">
              Anteprima <ExternalLink className="h-3 w-3" />
            </a>
          </div>
          <div className="flex justify-center">
            <HaccpLabelPrintView
              label={label}
              restaurantName={restaurant?.name || ""}
              size="medium"
              publicUrl={publicUrl}
            />
          </div>
        </CardContent></Card>

        {/* Ingredients */}
        {ingredients.length > 0 && (
          <Card><CardContent className="p-4 space-y-2">
            <h3 className="font-semibold">Ingredienti</h3>
            {ingredients.map((i, idx) => (
              <div key={idx} className="text-sm border-b border-border last:border-0 pb-2">
                <div className="font-medium">{i.ingredient_name} {i.quantity_used && `· ${i.quantity_used} ${i.unit || ""}`}</div>
                <div className="text-xs text-muted-foreground">
                  {i.source_lot_code && `Lotto ${i.source_lot_code}`}
                  {i.supplier_name && ` · ${i.supplier_name}`}
                  {i.ingredient_expiration_date && ` · Scad. ${format(new Date(i.ingredient_expiration_date), "dd/MM/yyyy")}`}
                </div>
              </div>
            ))}
          </CardContent></Card>
        )}

        {/* Documents */}
        {docs.length > 0 && (
          <Card><CardContent className="p-4 space-y-2">
            <h3 className="font-semibold">Bolle / Documenti</h3>
            {docs.map(d => (
              <a key={d.id} href={d.file_url || d.photo_url} target="_blank" rel="noopener noreferrer" className="block text-sm border border-border rounded-lg p-2 hover:bg-muted">
                <div className="font-medium capitalize">{d.document_type} {d.document_number}</div>
                <div className="text-xs text-muted-foreground">{d.supplier_name} {d.document_date && `· ${format(new Date(d.document_date), "dd/MM/yyyy")}`}</div>
              </a>
            ))}
          </CardContent></Card>
        )}

        {/* Actions */}
        <div className="grid grid-cols-2 gap-2">
          {isDraft && (
            <Button onClick={handleFinalize} className="col-span-2">Finalizza</Button>
          )}
          {isFinalized && (
            <>
              <Button onClick={() => setPrintOpen(true)}><Printer className="h-4 w-4 mr-1" /> Stampa</Button>
              <Button variant="outline" onClick={handleDuplicate}><Copy className="h-4 w-4 mr-1" /> Duplica</Button>
              <Button variant="destructive" className="col-span-2" onClick={() => setCancelOpen(true)}>
                <X className="h-4 w-4 mr-1" /> Annulla etichetta
              </Button>
            </>
          )}
          {isCancelled && (
            <Button variant="outline" onClick={handleDuplicate} className="col-span-2"><Copy className="h-4 w-4 mr-1" /> Duplica come bozza</Button>
          )}
        </div>

        {/* Audit log */}
        {audit.length > 0 && (
          <Card><CardContent className="p-4 space-y-1">
            <h3 className="font-semibold mb-2">Storico</h3>
            {audit.map(a => (
              <div key={a.id} className="text-xs flex justify-between gap-2 border-b border-border last:border-0 pb-1">
                <span><b className="capitalize">{a.action}</b> · {a.user_name} {a.reason && `· ${a.reason}`}</span>
                <span className="text-muted-foreground shrink-0">{format(new Date(a.created_at), "dd/MM HH:mm")}</span>
              </div>
            ))}
          </CardContent></Card>
        )}
      </div>

      {/* Print dialog */}
      <Dialog open={printOpen} onOpenChange={setPrintOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Stampa etichetta</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium">Formato</label>
              <Select value={printSize} onValueChange={(v: any) => setPrintSize(v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="small">Piccola (60×40 mm)</SelectItem>
                  <SelectItem value="medium">Media (100×60 mm)</SelectItem>
                  <SelectItem value="a4">A4</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-center">
              <HaccpLabelPrintView label={label} restaurantName={restaurant?.name || ""} size={printSize} publicUrl={publicUrl} />
            </div>
            <Button onClick={() => { setPrintOpen(false); handlePrint(audit.some(a => a.action === "printed")); }} className="w-full">
              <Printer className="h-4 w-4 mr-1" /> Stampa
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Cancel dialog */}
      <Dialog open={cancelOpen} onOpenChange={setCancelOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Annulla etichetta</DialogTitle></DialogHeader>
          <Textarea placeholder="Motivo annullamento..." value={cancelReason} onChange={e => setCancelReason(e.target.value)} />
          <Button variant="destructive" onClick={handleCancel}>Conferma annullamento</Button>
        </DialogContent>
      </Dialog>

      <style>{`@media print { body * { visibility: hidden; } .print-area, .print-area * { visibility: visible; } }`}</style>
    </div>
  );
};

export default RestaurantHaccpLabelDetailPage;
