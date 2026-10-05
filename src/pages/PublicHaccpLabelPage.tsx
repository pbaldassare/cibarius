import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Loader2, FileText, AlertTriangle, CheckCircle2, XCircle, Printer, Clock, Plus, Pencil, Ban, Copy, FileCheck, FileSignature, Download, Eye } from "lucide-react";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import type { jsPDF } from "jspdf";
import { toast } from "sonner";
import QRCode from "qrcode";
import HaccpPublicPdfDocument, { CONSERVATION_LABELS, formatHaccpDate } from "@/components/HaccpPublicPdfDocument";
import { publicShareUrl } from "@/lib/site";

const SUPABASE_URL =
  import.meta.env.VITE_SUPABASE_URL || "https://dqhzopbjhxyhgcpedskl.supabase.co";

const PublicHaccpLabelPage = () => {
  const { token } = useParams<{ token: string }>();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState("");
  const pdfDocRef = useRef<jsPDF | null>(null);
  const pdfRef = useRef<HTMLDivElement>(null);

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

  useEffect(() => {
    const qrToken = data?.label?.qr_token || token;
    if (!qrToken) return;
    QRCode.toDataURL(publicShareUrl(`/haccp/label/${qrToken}`), {
      width: 220,
      margin: 1,
      color: { dark: "#111827", light: "#ffffff" },
    }).then(setQrDataUrl).catch(() => setQrDataUrl(""));
  }, [data, token]);

  if (loading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  if (error) return <div className="min-h-screen flex items-center justify-center p-4"><Card><CardContent className="p-8 text-center">{error}</CardContent></Card></div>;
  if (!data) return null;

  const { label, restaurant, ingredients = [], documents = [], events = [] } = data;
  const allergens = (label.allergens || []).filter(Boolean);

  const eventMeta = (action: string) => {
    switch (action) {
      case "created": return { icon: Plus, label: "Etichetta creata", color: "text-blue-600 bg-blue-100" };
      case "finalized": return { icon: FileCheck, label: "Etichetta finalizzata", color: "text-emerald-600 bg-emerald-100" };
      case "printed": return { icon: Printer, label: "Stampata", color: "text-slate-600 bg-slate-100" };
      case "reprinted": return { icon: Printer, label: "Ristampata", color: "text-slate-600 bg-slate-100" };
      case "modified": return { icon: Pencil, label: "Modificata", color: "text-amber-600 bg-amber-100" };
      case "cancelled": return { icon: Ban, label: "Annullata / ritirata", color: "text-destructive bg-destructive/10" };
      case "duplicated": return { icon: Copy, label: "Duplicata", color: "text-purple-600 bg-purple-100" };
      default: return { icon: FileSignature, label: action, color: "text-muted-foreground bg-muted" };
    }
  };

  const statusBadge = () => {
    if (label.computed_status === "ritirato") return <Badge variant="destructive" className="gap-1"><XCircle className="h-3 w-3" /> Ritirato</Badge>;
    if (label.computed_status === "scaduto") return <Badge className="bg-amber-500 text-white gap-1"><AlertTriangle className="h-3 w-3" /> Scaduto</Badge>;
    if (label.computed_status === "bozza") return <Badge variant="secondary">Bozza</Badge>;
    return <Badge className="bg-emerald-500 text-white gap-1"><CheckCircle2 className="h-3 w-3" /> Valido</Badge>;
  };

  const buildPdf = async (): Promise<jsPDF | null> => {
    if (!pdfRef.current) return null;
    const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
      import("html2canvas"),
      import("jspdf"),
    ]);
    const canvas = await html2canvas(pdfRef.current, {
      scale: 2,
      backgroundColor: "#ffffff",
      useCORS: true,
      logging: false,
      width: 794,
      windowWidth: 794,
    });
    const imgData = canvas.toDataURL("image/jpeg", 0.95);
    const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    const pageW = pdf.internal.pageSize.getWidth();
    const pageH = pdf.internal.pageSize.getHeight();
    const margin = 8;
    const usableW = pageW - margin * 2;
    const imgH = (canvas.height * usableW) / canvas.width;
    let heightLeft = imgH;
    let position = margin;
    pdf.addImage(imgData, "JPEG", margin, position, usableW, imgH);
    heightLeft -= pageH - margin * 2;
    while (heightLeft > 0) {
      position = heightLeft - imgH + margin;
      pdf.addPage();
      pdf.addImage(imgData, "JPEG", margin, position, usableW, imgH);
      heightLeft -= pageH - margin * 2;
    }
    return pdf;
  };

  const pdfFilename = () =>
    `HACCP_${label.internal_lot_code || "etichetta"}_${label.preparation_name?.replace(/\s+/g, "_") || ""}.pdf`;

  const previewPdf = async () => {
    setGenerating(true);
    try {
      const pdf = await buildPdf();
      if (!pdf) return;
      pdfDocRef.current = pdf;
      const blobUrl = URL.createObjectURL(pdf.output("blob"));
      setPreviewUrl(blobUrl);
    } catch (e: any) {
      toast.error("Errore anteprima PDF: " + (e?.message || ""));
    } finally {
      setGenerating(false);
    }
  };

  const closePreview = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    pdfDocRef.current = null;
  };

  const saveFromPreview = () => {
    pdfDocRef.current?.save(pdfFilename());
    toast.success("PDF scaricato");
    closePreview();
  };

  return (
    <div className="haccp-public-page min-h-screen bg-muted/30 p-4 max-w-2xl mx-auto space-y-4 print:bg-white print:p-0 print:max-w-full">
      <div className="flex justify-end gap-2 print:hidden">
        <Button size="sm" variant="outline" onClick={() => window.print()} className="gap-2">
          <Printer className="h-4 w-4" /> Stampa
        </Button>
        <Button size="sm" onClick={previewPdf} disabled={generating || !qrDataUrl} className="gap-2">
          {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Eye className="h-4 w-4" />}
          Anteprima PDF
        </Button>
      </div>

      <Dialog open={!!previewUrl} onOpenChange={(o) => { if (!o) closePreview(); }}>
        <DialogContent className="max-w-5xl w-[95vw] h-[90vh] flex flex-col p-0 gap-0">
          <DialogHeader className="p-4 border-b">
            <DialogTitle className="flex items-center gap-2"><Eye className="h-4 w-4" /> Anteprima PDF — {label.preparation_name}</DialogTitle>
          </DialogHeader>
          <div className="flex-1 bg-muted overflow-hidden">
            {previewUrl && <iframe src={previewUrl} title="Anteprima PDF" className="w-full h-full border-0" />}
          </div>
          <DialogFooter className="p-4 border-t flex-row justify-end gap-2">
            <Button variant="outline" onClick={closePreview}>Annulla</Button>
            <Button onClick={saveFromPreview} className="gap-2"><Download className="h-4 w-4" /> Scarica PDF</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div
        ref={pdfRef}
        className="print:block"
        style={{ position: "absolute", left: -10000, top: 0, width: 794, background: "#ffffff" }}
        aria-hidden
      >
        <HaccpPublicPdfDocument
          label={label}
          restaurant={restaurant}
          ingredients={ingredients}
          documents={documents}
          events={events}
          qrDataUrl={qrDataUrl}
        />
      </div>

      <Card className="haccp-section print:shadow-none print:border-0">
        <CardContent className="p-6 space-y-3 print:p-2">
          <div className="flex items-center justify-between gap-2">
            <h1 className="text-xl font-bold">{label.preparation_name}</h1>
            {statusBadge()}
          </div>
          {restaurant && (
            <p className="text-sm text-muted-foreground">{restaurant.name} {restaurant.address && `· ${restaurant.address}`}</p>
          )}
          <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm pt-2">
            <div className="flex justify-between gap-3 border-b border-border/70 pb-1">
              <span className="text-muted-foreground">Lotto</span>
              <b>{label.internal_lot_code || "—"}</b>
            </div>
            <div className="flex justify-between gap-3 border-b border-border/70 pb-1">
              <span className="text-muted-foreground">Conservazione</span>
              <b>{CONSERVATION_LABELS[label.conservation_type] || label.conservation_type || "—"}</b>
            </div>
            <div className="flex justify-between gap-3 border-b border-border/70 pb-1">
              <span className="text-muted-foreground">Produzione</span>
              <b>{formatHaccpDate(label.production_date)}</b>
            </div>
            <div className="flex justify-between gap-3 border-b border-border/70 pb-1">
              <span className="text-muted-foreground">Scadenza</span>
              <b>{formatHaccpDate(label.expiration_date)}</b>
            </div>
            <div className="flex justify-between gap-3 border-b border-border/70 pb-1">
              <span className="text-muted-foreground">Quantità</span>
              <b>{label.quantity != null ? `${label.quantity} ${label.unit || ""}`.trim() : "—"}</b>
            </div>
            <div className="flex justify-between gap-3 border-b border-border/70 pb-1">
              <span className="text-muted-foreground">Operatore</span>
              <b>{label.operator_name || restaurant?.name || "—"}</b>
            </div>
          </div>
          <div className="pt-2 text-sm">
            <b>Allergeni:</b>{" "}
            {allergens.length > 0 ? allergens.join(", ") : "nessuno dichiarato"}
          </div>
          {label.notes && <div className="text-sm text-muted-foreground">{label.notes}</div>}
          {label.cancel_reason && (
            <div className="text-sm text-destructive bg-destructive/10 rounded p-2">
              <b>Motivo annullamento:</b> {label.cancel_reason}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="print:shadow-none print:border-0">
        <CardContent className="p-4 space-y-2 print:p-2">
          <h2 className="haccp-section-header font-semibold">Ingredienti</h2>
          {ingredients.length === 0 && (
            <p className="text-sm text-muted-foreground">Nessun ingrediente registrato su questa etichetta.</p>
          )}
          {ingredients.map((i: any, idx: number) => (
            <div key={idx} className="haccp-row border-b border-border last:border-0 pb-2 text-sm">
              <div className="font-medium">{i.ingredient_name} {i.quantity_used && `· ${i.quantity_used} ${i.unit || ""}`}</div>
              <div className="text-xs text-muted-foreground">
                {i.source_lot_code && `Lotto ${i.source_lot_code}`}
                {i.supplier_name && ` · Fornitore ${i.supplier_name}`}
                {i.ingredient_expiration_date && ` · Scad. ${format(new Date(i.ingredient_expiration_date), "dd/MM/yyyy")}`}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card className="print:shadow-none print:border-0">
        <CardContent className="p-4 space-y-2 print:p-2">
          <h2 className="haccp-section-header font-semibold">Bolle / Documenti</h2>
          {documents.length === 0 && (
            <p className="text-sm text-muted-foreground">Nessun DDT / bolla collegato.</p>
          )}
          {documents.map((d: any) => (
            <a key={d.id} href={d.file_url || d.photo_url} target="_blank" rel="noopener noreferrer"
              className="haccp-row flex items-center gap-2 border border-border rounded-lg p-2 hover:bg-muted">
              <FileText className="h-4 w-4 text-primary" />
              <div className="flex-1 min-w-0">
                <div className="font-medium capitalize text-sm">{d.document_type} {d.document_number}</div>
                <div className="text-xs text-muted-foreground">{d.supplier_name} {d.document_date && `· ${format(new Date(d.document_date), "dd/MM/yyyy")}`}</div>
              </div>
            </a>
          ))}
        </CardContent>
      </Card>

      {events.length > 0 && (
        <Card className="print:shadow-none print:border-0">
          <CardContent className="p-4 space-y-3 print:p-2">
            <h2 className="haccp-section-header font-semibold flex items-center gap-2"><Clock className="h-4 w-4 text-primary" /> Cronologia tracciabilità</h2>
            <ol className="relative border-l border-border ml-3 space-y-3 pl-4">
              {events.map((ev: any, idx: number) => {
                const meta = eventMeta(ev.action);
                const Icon = meta.icon;
                return (
                  <li key={idx} className="haccp-row relative">
                    <span className={`absolute -left-[27px] flex items-center justify-center w-6 h-6 rounded-full ${meta.color}`}>
                      <Icon className="h-3 w-3" />
                    </span>
                    <div className="text-sm font-medium">{meta.label}</div>
                    <div className="text-xs text-muted-foreground">
                      {format(new Date(ev.created_at), "dd MMM yyyy · HH:mm", { locale: it })}
                      {ev.user_name && ` · ${ev.user_name}`}
                    </div>
                    {ev.reason && <div className="text-xs text-foreground/80 mt-1 italic">"{ev.reason}"</div>}
                  </li>
                );
              })}
            </ol>
          </CardContent>
        </Card>
      )}

      <p className="text-center text-xs text-muted-foreground py-4">Tracciabilità HACCP — Cibarius</p>
    </div>
  );
};

export default PublicHaccpLabelPage;
