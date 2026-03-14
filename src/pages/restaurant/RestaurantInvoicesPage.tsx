import { useState, useEffect } from "react";
import { useRestaurant } from "@/hooks/useRestaurant";
import MobileHeader from "@/components/MobileHeader";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Upload, FileText, Download, Trash2, Plus, ExternalLink, ChevronRight, Sparkles, RefreshCw } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";

interface ExtractedData {
  supplier_name?: string | null;
  supplier_address?: string | null;
  supplier_vat?: string | null;
  supplier_phone?: string | null;
  document_number?: string | null;
  document_date?: string | null;
  delivery_date?: string | null;
  recipient_name?: string | null;
  items?: { name: string; quantity?: number | null; unit?: string | null; unit_price?: number | null; total?: number | null }[];
  subtotal?: number | null;
  vat_amount?: number | null;
  total?: number | null;
  notes?: string | null;
  raw_text?: string;
}

interface RestaurantDocument {
  id: string;
  restaurant_id: string;
  doc_type: string;
  supplier_name: string | null;
  doc_date: string | null;
  file_path: string;
  public_url: string | null;
  created_at: string;
  extracted_data: ExtractedData | null;
}

const DOC_TYPES = [
  { value: "bolla", label: "Bolla" },
  { value: "fattura", label: "Fattura" },
  { value: "altro", label: "Altro" },
];

const RestaurantInvoicesPage = () => {
  const { restaurant, isLoading: restLoading } = useRestaurant();
  const { toast } = useToast();
  const [docs, setDocs] = useState<RestaurantDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [detailDoc, setDetailDoc] = useState<RestaurantDocument | null>(null);
  const [extracting, setExtracting] = useState(false);

  // Upload form state
  const [file, setFile] = useState<File | null>(null);
  const [docType, setDocType] = useState("bolla");
  const [supplierName, setSupplierName] = useState("");
  const [docDate, setDocDate] = useState("");

  const fetchDocs = async () => {
    if (!restaurant) return;
    const { data } = await supabase
      .from("restaurant_documents")
      .select("*")
      .eq("restaurant_id", restaurant.id)
      .order("created_at", { ascending: false });
    if (data) setDocs(data as unknown as RestaurantDocument[]);
    setLoading(false);
  };

  useEffect(() => {
    if (restaurant) fetchDocs();
  }, [restaurant]);

  const extractInvoiceData = async (doc: RestaurantDocument) => {
    setExtracting(true);
    try {
      const isImage = doc.file_path.match(/\.(jpg|jpeg|png|gif|webp)$/i);

      let body: any = { document_id: doc.id };

      if (isImage && doc.public_url) {
        // For images, send the URL directly
        body.public_url = doc.public_url;
        body.mime_type = "image/jpeg";
      } else if (isImage) {
        // Download and convert to base64
        const { data: fileData } = await supabase.storage.from("media").download(doc.file_path);
        if (!fileData) throw new Error("Impossibile scaricare il file");
        const buffer = await fileData.arrayBuffer();
        const base64 = btoa(String.fromCharCode(...new Uint8Array(buffer)));
        body.image_base64 = base64;
        body.mime_type = fileData.type;
      } else {
        // PDF - send URL
        body.public_url = doc.public_url;
        body.mime_type = "application/pdf";
      }

      const { data: response, error } = await supabase.functions.invoke("extract-invoice", { body });

      if (error) throw error;
      if (response?.error) throw new Error(response.error);

      if (response?.extracted) {
        // Update local state
        const updated = { ...doc, extracted_data: response.extracted };
        setDetailDoc(updated);
        setDocs(prev => prev.map(d => d.id === doc.id ? updated : d));
        toast({ title: "Dati estratti con successo ✓" });
      } else {
        toast({ variant: "destructive", title: "Nessun dato estratto" });
      }
    } catch (err: any) {
      toast({ variant: "destructive", title: "Errore estrazione", description: err.message });
    } finally {
      setExtracting(false);
    }
  };

  const handleUpload = async () => {
    if (!file || !restaurant) return;
    setUploading(true);

    const ts = Date.now();
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const filePath = `restaurants/${restaurant.id}/bolle/${ts}-${safeName}`;

    const { error: storageError } = await supabase.storage.from("media").upload(filePath, file);
    if (storageError) {
      toast({ variant: "destructive", title: "Errore upload", description: storageError.message });
      setUploading(false);
      return;
    }

    const { data: urlData } = supabase.storage.from("media").getPublicUrl(filePath);

    const { data: newDoc, error: dbError } = await supabase.from("restaurant_documents").insert({
      restaurant_id: restaurant.id,
      doc_type: docType,
      supplier_name: supplierName || null,
      doc_date: docDate || null,
      file_path: filePath,
      public_url: urlData.publicUrl,
    }).select("*").single();

    setUploading(false);
    if (dbError) {
      toast({ variant: "destructive", title: "Errore", description: dbError.message });
    } else {
      toast({ title: "Documento caricato! Estrazione dati in corso..." });
      setUploadOpen(false);
      setFile(null);
      setDocType("bolla");
      setSupplierName("");
      setDocDate("");
      fetchDocs();

      // Auto-extract for images
      if (newDoc && filePath.match(/\.(jpg|jpeg|png|gif|webp)$/i)) {
        const docTyped = newDoc as unknown as RestaurantDocument;
        setDetailDoc(docTyped);
        extractInvoiceData(docTyped);
      }
    }
  };

  const handleDelete = async (doc: RestaurantDocument) => {
    await supabase.storage.from("media").remove([doc.file_path]);
    await supabase.from("restaurant_documents").delete().eq("id", doc.id);
    toast({ title: "Documento eliminato" });
    fetchDocs();
  };

  if (restLoading || loading) {
    return (
      <div>
        <MobileHeader title="Bolle e Documenti" showBack />
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  const ed = detailDoc?.extracted_data;

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#F5F7FA" }} data-tour="rest-invoices-page">
      <MobileHeader title="Bolle e Documenti" showBack />
      <main className="px-4 py-4 pb-28 space-y-3">
        <Button onClick={() => setUploadOpen(true)} className="w-full">
          <Plus className="mr-2 h-4 w-4" /> Carica documento
        </Button>

        {docs.length === 0 ? (
          <div className="flex flex-col items-center gap-2 rounded-2xl bg-white p-10 shadow-sm">
            <FileText className="h-8 w-8 text-muted-foreground" />
            <p className="text-sm font-medium" style={{ color: "#111827" }}>Nessun documento</p>
            <p className="text-xs text-muted-foreground">Carica la tua prima bolla</p>
          </div>
        ) : (
          <div className="space-y-2">
            {docs.map((doc) => (
              <button key={doc.id} onClick={() => setDetailDoc(doc)} className="w-full text-left">
                <Card className="shadow-sm hover:shadow-md transition-shadow">
                  <CardContent className="flex items-center gap-3 p-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl" style={{ backgroundColor: "#22B6F215" }}>
                      <FileText className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold truncate" style={{ color: "#111827" }}>
                        {doc.doc_type.charAt(0).toUpperCase() + doc.doc_type.slice(1)}
                        {doc.supplier_name ? ` — ${doc.supplier_name}` : ""}
                      </p>
                      <div className="flex items-center gap-1.5">
                        <p className="text-xs text-muted-foreground">
                          {doc.doc_date ? new Date(doc.doc_date).toLocaleDateString("it-IT") : "Senza data"}
                        </p>
                        {doc.extracted_data && (
                          <span className="flex items-center gap-0.5 text-[10px] font-medium text-primary">
                            <Sparkles className="h-2.5 w-2.5" /> AI
                          </span>
                        )}
                      </div>
                    </div>
                    <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                  </CardContent>
                </Card>
              </button>
            ))}
          </div>
        )}
      </main>

      {/* Upload sheet */}
      <Sheet open={uploadOpen} onOpenChange={setUploadOpen}>
        <SheetContent side="bottom" className="rounded-t-2xl">
          <SheetHeader><SheetTitle>Carica documento</SheetTitle></SheetHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-1.5">
              <Label>Tipo documento</Label>
              <Select value={docType} onValueChange={setDocType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {DOC_TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Fornitore (opzionale — l'AI lo rileverà)</Label>
              <Input value={supplierName} onChange={(e) => setSupplierName(e.target.value)} placeholder="Nome fornitore" />
            </div>
            <div className="space-y-1.5">
              <Label>Data documento (opzionale — l'AI la rileverà)</Label>
              <Input type="date" value={docDate} onChange={(e) => setDocDate(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>File (PDF, JPG, PNG)</Label>
              <Input type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
            </div>
            <Button onClick={handleUpload} disabled={!file || uploading} className="w-full">
              {uploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
              Carica e analizza
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      {/* Detail sheet */}
      <Sheet open={!!detailDoc} onOpenChange={(open) => { if (!open) setDetailDoc(null); }}>
        <SheetContent side="bottom" className="h-[90vh] rounded-t-2xl overflow-y-auto">
          {detailDoc && (() => {
            const isImage = detailDoc.file_path.match(/\.(jpg|jpeg|png|gif|webp)$/i);
            const isPdf = detailDoc.file_path.match(/\.pdf$/i);
            return (
              <>
                <SheetHeader>
                  <SheetTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5 text-primary" />
                    {detailDoc.doc_type.charAt(0).toUpperCase() + detailDoc.doc_type.slice(1)}
                    {(ed?.supplier_name || detailDoc.supplier_name) ? ` — ${ed?.supplier_name || detailDoc.supplier_name}` : ""}
                  </SheetTitle>
                </SheetHeader>
                <div className="space-y-4 py-4">

                  {/* Document preview — always visible at top */}
                  {detailDoc.public_url && isImage && (
                    <div className="rounded-xl overflow-hidden border">
                      <img src={detailDoc.public_url} alt="Documento" className="w-full object-contain max-h-[50vh]" />
                    </div>
                  )}
                  {detailDoc.public_url && isPdf && (
                    <div className="rounded-xl overflow-hidden border" style={{ height: "50vh" }}>
                      <iframe src={detailDoc.public_url} className="h-full w-full" title="Preview PDF" />
                    </div>
                  )}
                  {!detailDoc.public_url && (
                    <div className="rounded-xl border border-dashed border-muted-foreground/30 bg-muted/50 flex flex-col items-center justify-center gap-2 py-10">
                      <FileText className="h-10 w-10 text-muted-foreground/40" />
                      <p className="text-xs text-muted-foreground">Nessun file allegato</p>
                      <p className="text-[10px] text-muted-foreground/60">I documenti demo non hanno un file fisico</p>
                    </div>
                  )}

                  {/* AI Extract button */}
                  {!ed && (
                    <Button variant="outline" className="w-full gap-2" onClick={() => extractInvoiceData(detailDoc)} disabled={extracting}>
                      {extracting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                      {extracting ? "Analisi AI in corso..." : "Analizza con AI"}
                    </Button>
                  )}

                  {extracting && !ed && (
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-3/4" />
                      <Skeleton className="h-4 w-1/2" />
                      <Skeleton className="h-20 w-full" />
                    </div>
                  )}

                  {/* Extracted data */}
                  {ed && (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-bold text-primary flex items-center gap-1">
                          <Sparkles className="h-3 w-3" /> Dati estratti dall'AI
                        </p>
                        <Button size="sm" variant="ghost" className="h-7 gap-1 text-xs" onClick={() => extractInvoiceData(detailDoc)} disabled={extracting}>
                          <RefreshCw className={`h-3 w-3 ${extracting ? "animate-spin" : ""}`} /> Rianalizza
                        </Button>
                      </div>

                      {/* Supplier info */}
                      <div className="rounded-xl bg-muted p-3 space-y-1">
                        <p className="text-[10px] font-medium text-muted-foreground">Fornitore</p>
                        <p className="text-sm font-semibold">{ed.supplier_name || "—"}</p>
                        {ed.supplier_address && <p className="text-xs text-muted-foreground">{ed.supplier_address}</p>}
                        {ed.supplier_vat && <p className="text-xs text-muted-foreground">P.IVA: {ed.supplier_vat}</p>}
                        {ed.supplier_phone && <p className="text-xs text-muted-foreground">Tel: {ed.supplier_phone}</p>}
                      </div>

                      {/* Document info */}
                      <div className="grid grid-cols-2 gap-2">
                        {ed.document_number && (
                          <div className="rounded-xl bg-muted p-3">
                            <p className="text-[10px] font-medium text-muted-foreground">N° Documento</p>
                            <p className="text-sm font-semibold">{ed.document_number}</p>
                          </div>
                        )}
                        {ed.document_date && (
                          <div className="rounded-xl bg-muted p-3">
                            <p className="text-[10px] font-medium text-muted-foreground">Data</p>
                            <p className="text-sm font-semibold">{new Date(ed.document_date).toLocaleDateString("it-IT")}</p>
                          </div>
                        )}
                        {ed.delivery_date && (
                          <div className="rounded-xl bg-muted p-3">
                            <p className="text-[10px] font-medium text-muted-foreground">Consegna</p>
                            <p className="text-sm font-semibold">{new Date(ed.delivery_date).toLocaleDateString("it-IT")}</p>
                          </div>
                        )}
                        {ed.recipient_name && (
                          <div className="rounded-xl bg-muted p-3">
                            <p className="text-[10px] font-medium text-muted-foreground">Destinatario</p>
                            <p className="text-sm font-semibold">{ed.recipient_name}</p>
                          </div>
                        )}
                      </div>

                      {/* Items table */}
                      {ed.items && ed.items.length > 0 && (
                        <div>
                          <p className="text-xs font-semibold text-muted-foreground mb-2">Articoli ({ed.items.length})</p>
                          <div className="rounded-xl border overflow-hidden">
                            <div className="grid grid-cols-[1fr_auto_auto] gap-x-2 bg-muted px-3 py-1.5 text-[10px] font-semibold text-muted-foreground">
                              <span>Prodotto</span>
                              <span>Qtà</span>
                              <span className="text-right">Totale</span>
                            </div>
                            {ed.items.map((item, i) => (
                              <div key={i} className="grid grid-cols-[1fr_auto_auto] gap-x-2 px-3 py-2 text-xs border-t items-center">
                                <span className="font-medium truncate">{item.name}</span>
                                <span className="text-muted-foreground whitespace-nowrap">
                                  {item.quantity != null ? `${item.quantity} ${item.unit || ""}` : "—"}
                                </span>
                                <span className="text-right font-medium">
                                  {item.total != null ? `€${item.total.toFixed(2)}` : "—"}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Totals */}
                      {(ed.subtotal != null || ed.total != null) && (
                        <div className="rounded-xl bg-primary/5 border border-primary/20 p-3 space-y-1">
                          {ed.subtotal != null && (
                            <div className="flex justify-between text-xs">
                              <span className="text-muted-foreground">Subtotale</span>
                              <span className="font-medium">€{ed.subtotal.toFixed(2)}</span>
                            </div>
                          )}
                          {ed.vat_amount != null && (
                            <div className="flex justify-between text-xs">
                              <span className="text-muted-foreground">IVA</span>
                              <span className="font-medium">€{ed.vat_amount.toFixed(2)}</span>
                            </div>
                          )}
                          {ed.total != null && (
                            <div className="flex justify-between text-sm font-bold border-t border-primary/20 pt-1 mt-1">
                              <span>Totale</span>
                              <span className="text-primary">€{ed.total.toFixed(2)}</span>
                            </div>
                          )}
                        </div>
                      )}

                      {ed.notes && (
                        <div className="rounded-xl bg-muted p-3">
                          <p className="text-[10px] font-medium text-muted-foreground">Note</p>
                          <p className="text-xs">{ed.notes}</p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Preview moved to top */}

                  {/* Actions */}
                  <div className="flex gap-2">
                    {detailDoc.public_url && (
                      <>
                        <a href={detailDoc.public_url} target="_blank" rel="noopener noreferrer" className="flex-1">
                          <Button variant="outline" className="w-full gap-2 text-xs">
                            <ExternalLink className="h-3.5 w-3.5" /> Apri
                          </Button>
                        </a>
                        <a href={detailDoc.public_url} download className="flex-1">
                          <Button className="w-full gap-2 text-xs">
                            <Download className="h-3.5 w-3.5" /> Scarica
                          </Button>
                        </a>
                      </>
                    )}
                  </div>
                  <Button variant="destructive" className="w-full gap-2" onClick={() => { handleDelete(detailDoc); setDetailDoc(null); }}>
                    <Trash2 className="h-4 w-4" /> Elimina
                  </Button>
                </div>
              </>
            );
          })()}
        </SheetContent>
      </Sheet>
    </div>
  );
};

export default RestaurantInvoicesPage;
