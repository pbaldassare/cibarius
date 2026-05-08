import { useEffect, useState } from "react";
import { useRestaurant } from "@/hooks/useRestaurant";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import MobileHeader from "@/components/MobileHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Plus, FileText, Loader2, Trash2 } from "lucide-react";
import { format } from "date-fns";

const RestaurantHaccpDocumentsPage = () => {
  const { restaurant } = useRestaurant();
  const { user } = useAuth();
  const { toast } = useToast();
  const [docs, setDocs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const [type, setType] = useState("bolla");
  const [supplier, setSupplier] = useState("");
  const [num, setNum] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState("");
  const [file, setFile] = useState<File | null>(null);

  const fetch = async () => {
    if (!restaurant) return;
    setLoading(true);
    const { data } = await supabase
      .from("haccp_documents")
      .select("*")
      .eq("restaurant_id", restaurant.id)
      .order("created_at", { ascending: false });
    setDocs(data || []);
    setLoading(false);
  };

  useEffect(() => { fetch(); }, [restaurant]);

  const handleSave = async () => {
    if (!restaurant || !user) return;
    setSaving(true);
    let fileUrl: string | null = null;
    let photoUrl: string | null = null;
    if (file) {
      const ext = file.name.split(".").pop() || "bin";
      const path = `${restaurant.id}/${Date.now()}.${ext}`;
      const { data: up, error: upErr } = await supabase.storage.from("haccp-documents").upload(path, file);
      if (upErr) {
        setSaving(false);
        toast({ variant: "destructive", title: "Errore upload", description: upErr.message });
        return;
      }
      const { data: urlD } = supabase.storage.from("haccp-documents").getPublicUrl(up!.path);
      if (file.type.startsWith("image/")) photoUrl = urlD.publicUrl;
      else fileUrl = urlD.publicUrl;
    }
    const { error } = await supabase.from("haccp_documents").insert({
      restaurant_id: restaurant.id,
      document_type: type,
      supplier_name: supplier || null,
      document_number: num || null,
      document_date: date || null,
      file_url: fileUrl,
      photo_url: photoUrl,
      notes: notes || null,
      created_by: user.id,
    } as any);
    setSaving(false);
    if (error) { toast({ variant: "destructive", title: "Errore", description: error.message }); return; }
    setOpen(false);
    setSupplier(""); setNum(""); setNotes(""); setFile(null);
    toast({ title: "Documento salvato ✓" });
    fetch();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Eliminare il documento?")) return;
    await supabase.from("haccp_documents").delete().eq("id", id);
    fetch();
  };

  return (
    <div className="space-y-4 p-4">
      <MobileHeader title="Bolle & Documenti" />
      <Button onClick={() => setOpen(true)} className="w-full"><Plus className="h-4 w-4 mr-1" /> Nuovo documento</Button>

      {loading ? <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div> :
        docs.length === 0 ? <Card><CardContent className="py-12 text-center text-muted-foreground">Nessun documento</CardContent></Card> :
        <div className="space-y-2">
          {docs.map(d => (
            <Card key={d.id}><CardContent className="p-3 flex items-center gap-3">
              <FileText className="h-5 w-5 text-primary shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="font-medium capitalize truncate">{d.document_type} {d.document_number}</p>
                <p className="text-xs text-muted-foreground truncate">
                  {d.supplier_name} {d.document_date && `· ${format(new Date(d.document_date), "dd/MM/yyyy")}`}
                </p>
              </div>
              {(d.file_url || d.photo_url) && (
                <a href={d.file_url || d.photo_url} target="_blank" rel="noopener noreferrer" className="text-primary text-sm">Apri</a>
              )}
              <button onClick={() => handleDelete(d.id)} className="text-muted-foreground"><Trash2 className="h-4 w-4" /></button>
            </CardContent></Card>
          ))}
        </div>
      }

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Nuovo documento</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Tipo</Label>
              <Select value={type} onValueChange={setType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["bolla", "fattura", "ddt", "altro"].map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div><Label>Fornitore</Label><Input value={supplier} onChange={e => setSupplier(e.target.value)} /></div>
            <div><Label>Numero documento</Label><Input value={num} onChange={e => setNum(e.target.value)} /></div>
            <div><Label>Data</Label><Input type="date" value={date} onChange={e => setDate(e.target.value)} /></div>
            <div><Label>Note</Label><Input value={notes} onChange={e => setNotes(e.target.value)} /></div>
            <div><Label>File (PDF o foto)</Label><Input type="file" accept="image/*,.pdf" onChange={e => setFile(e.target.files?.[0] || null)} /></div>
            <Button onClick={handleSave} disabled={saving} className="w-full">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Salva"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default RestaurantHaccpDocumentsPage;
