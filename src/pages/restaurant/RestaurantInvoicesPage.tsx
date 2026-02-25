import { useState, useEffect } from "react";
import { useRestaurant } from "@/hooks/useRestaurant";
import MobileHeader from "@/components/MobileHeader";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Upload, FileText, Download, Trash2, Plus } from "lucide-react";
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
              <Card key={doc.id} className="shadow-sm">
                <CardContent className="flex items-center gap-3 p-3">
                  <FileText className="h-8 w-8 shrink-0 text-primary" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate" style={{ color: "#111827" }}>
                      {doc.doc_type.charAt(0).toUpperCase() + doc.doc_type.slice(1)}
                      {doc.supplier_name ? ` — ${doc.supplier_name}` : ""}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {doc.doc_date ? new Date(doc.doc_date).toLocaleDateString("it-IT") : "Senza data"}
                      {" · "}
                      {new Date(doc.created_at).toLocaleDateString("it-IT")}
                    </p>
                  </div>
                  <div className="flex gap-1">
                    {doc.public_url && (
                      <a href={doc.public_url} target="_blank" rel="noopener noreferrer">
                        <Button size="sm" variant="ghost"><Download className="h-4 w-4" /></Button>
                      </a>
                    )}
                    <Button size="sm" variant="ghost" className="text-destructive" onClick={() => handleDelete(doc)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
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
    </div>
  );
};

export default RestaurantInvoicesPage;
