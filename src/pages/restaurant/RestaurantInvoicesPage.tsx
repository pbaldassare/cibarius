import { useState, useEffect } from "react";
import { useRestaurant } from "@/hooks/useRestaurant";
import MobileHeader from "@/components/MobileHeader";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Upload, FileText, Download, Trash2, Plus, Eye, ExternalLink, ChevronRight } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Label } from "@/components/ui/label";

interface RestaurantDocument {
  id: string;
  restaurant_id: string;
  doc_type: string;
  supplier_name: string | null;
  doc_date: string | null;
  file_path: string;
  public_url: string | null;
  created_at: string;
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
    if (data) setDocs(data as RestaurantDocument[]);
    setLoading(false);
  };

  useEffect(() => {
    if (restaurant) fetchDocs();
  }, [restaurant]);

  const handleUpload = async () => {
    if (!file || !restaurant) return;
    setUploading(true);

    const ts = Date.now();
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const filePath = `restaurants/${restaurant.id}/bolle/${ts}-${safeName}`;

    const { error: storageError } = await supabase.storage
      .from("media")
      .upload(filePath, file);

    if (storageError) {
      toast({ variant: "destructive", title: "Errore upload", description: storageError.message });
      setUploading(false);
      return;
    }

    const { data: urlData } = supabase.storage.from("media").getPublicUrl(filePath);

    const { error: dbError } = await supabase.from("restaurant_documents").insert({
      restaurant_id: restaurant.id,
      doc_type: docType,
      supplier_name: supplierName || null,
      doc_date: docDate || null,
      file_path: filePath,
      public_url: urlData.publicUrl,
    });

    setUploading(false);
    if (dbError) {
      toast({ variant: "destructive", title: "Errore", description: dbError.message });
    } else {
      toast({ title: "Documento caricato" });
      setUploadOpen(false);
      setFile(null);
      setDocType("bolla");
      setSupplierName("");
      setDocDate("");
      fetchDocs();
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

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#F5F7FA" }}>
      <MobileHeader title="Bolle e Documenti" showBack />
      <main className="px-4 py-4 pb-28 space-y-3">
        {/* Upload button */}
        <Button onClick={() => setUploadOpen(true)} className="w-full">
          <Plus className="mr-2 h-4 w-4" /> Carica documento
        </Button>

        {/* Documents list */}
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
                      <p className="text-xs text-muted-foreground">
                        {doc.doc_date ? new Date(doc.doc_date).toLocaleDateString("it-IT") : "Senza data"}
                        {" · Caricato "}
                        {new Date(doc.created_at).toLocaleDateString("it-IT")}
                      </p>
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
          <SheetHeader>
            <SheetTitle>Carica documento</SheetTitle>
          </SheetHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-1.5">
              <Label>Tipo documento</Label>
              <Select value={docType} onValueChange={setDocType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {DOC_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Fornitore (opzionale)</Label>
              <Input value={supplierName} onChange={(e) => setSupplierName(e.target.value)} placeholder="Nome fornitore" />
            </div>
            <div className="space-y-1.5">
              <Label>Data documento (opzionale)</Label>
              <Input type="date" value={docDate} onChange={(e) => setDocDate(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>File (PDF, JPG, PNG)</Label>
              <Input
                type="file"
                accept=".pdf,.jpg,.jpeg,.png"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              />
            </div>
            <Button onClick={handleUpload} disabled={!file || uploading} className="w-full">
              {uploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
              Carica
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      {/* Detail sheet */}
      <Sheet open={!!detailDoc} onOpenChange={(open) => { if (!open) setDetailDoc(null); }}>
        <SheetContent side="bottom" className="h-[85vh] rounded-t-2xl overflow-y-auto">
          {detailDoc && (() => {
            const isImage = detailDoc.file_path.match(/\.(jpg|jpeg|png|gif|webp)$/i);
            const isPdf = detailDoc.file_path.match(/\.pdf$/i);
            return (
              <>
                <SheetHeader>
                  <SheetTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5 text-primary" />
                    {detailDoc.doc_type.charAt(0).toUpperCase() + detailDoc.doc_type.slice(1)}
                    {detailDoc.supplier_name ? ` — ${detailDoc.supplier_name}` : ""}
                  </SheetTitle>
                </SheetHeader>
                <div className="space-y-4 py-4">
                  {/* Info */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-xl bg-muted p-3">
                      <p className="text-[10px] font-medium text-muted-foreground">Tipo</p>
                      <p className="text-sm font-semibold capitalize">{detailDoc.doc_type}</p>
                    </div>
                    <div className="rounded-xl bg-muted p-3">
                      <p className="text-[10px] font-medium text-muted-foreground">Data documento</p>
                      <p className="text-sm font-semibold">{detailDoc.doc_date ? new Date(detailDoc.doc_date).toLocaleDateString("it-IT") : "—"}</p>
                    </div>
                    {detailDoc.supplier_name && (
                      <div className="rounded-xl bg-muted p-3 col-span-2">
                        <p className="text-[10px] font-medium text-muted-foreground">Fornitore</p>
                        <p className="text-sm font-semibold">{detailDoc.supplier_name}</p>
                      </div>
                    )}
                  </div>

                  {/* Preview */}
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
                  {detailDoc.public_url && !isImage && !isPdf && (
                    <div className="rounded-xl bg-muted p-6 text-center">
                      <FileText className="mx-auto h-10 w-10 text-muted-foreground mb-2" />
                      <p className="text-sm text-muted-foreground">Anteprima non disponibile per questo formato</p>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex gap-2">
                    {detailDoc.public_url && (
                      <>
                        <a href={detailDoc.public_url} target="_blank" rel="noopener noreferrer" className="flex-1">
                          <Button variant="outline" className="w-full gap-2">
                            <ExternalLink className="h-4 w-4" /> Apri in nuova tab
                          </Button>
                        </a>
                        <a href={detailDoc.public_url} download className="flex-1">
                          <Button className="w-full gap-2">
                            <Download className="h-4 w-4" /> Scarica
                          </Button>
                        </a>
                      </>
                    )}
                  </div>
                  <Button variant="destructive" className="w-full gap-2" onClick={() => { handleDelete(detailDoc); setDetailDoc(null); }}>
                    <Trash2 className="h-4 w-4" /> Elimina documento
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
