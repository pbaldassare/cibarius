import { useState, useEffect } from "react";
import AdminLayout from "@/components/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Check, X, Loader2, Package, ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";

interface Submission {
  id: string;
  user_id: string;
  name: string;
  brand: string | null;
  image_url: string | null;
  calories_100g: number | null;
  macros_100g: any;
  barcode: string | null;
  serving_size_g: number | null;
  status: string;
  created_at: string;
}

const AdminProductReviewPage = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState<string | null>(null);

  const fetchSubmissions = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("product_submissions" as any)
      .select("*")
      .eq("status", "pending")
      .order("created_at", { ascending: false });
    if (!error && data) setSubmissions(data as any);
    setLoading(false);
  };

  useEffect(() => { fetchSubmissions(); }, []);

  const handleApprove = async (sub: Submission) => {
    if (!user) return;
    setActing(sub.id);
    try {
      // Create product in shared catalog
      const { error: pErr } = await supabase.from("products").insert({
        name: sub.name,
        brand: sub.brand,
        barcode: sub.barcode,
        image_url: sub.image_url,
        calories_100g: sub.calories_100g,
        macros_100g: sub.macros_100g,
        serving_size_g: sub.serving_size_g,
      });
      if (pErr) throw pErr;

      // Update submission status
      const { error: uErr } = await supabase
        .from("product_submissions" as any)
        .update({ status: "approved", reviewed_by: user.id, reviewed_at: new Date().toISOString() } as any)
        .eq("id", sub.id);
      if (uErr) throw uErr;

      toast({ title: `"${sub.name}" approvato e aggiunto al catalogo ✓` });
      setSubmissions((prev) => prev.filter((s) => s.id !== sub.id));
    } catch (err: any) {
      toast({ variant: "destructive", title: "Errore", description: err.message });
    } finally {
      setActing(null);
    }
  };

  const handleReject = async (sub: Submission) => {
    if (!user) return;
    setActing(sub.id);
    try {
      const { error } = await supabase
        .from("product_submissions" as any)
        .update({ status: "rejected", reviewed_by: user.id, reviewed_at: new Date().toISOString() } as any)
        .eq("id", sub.id);
      if (error) throw error;
      toast({ title: `"${sub.name}" rifiutato` });
      setSubmissions((prev) => prev.filter((s) => s.id !== sub.id));
    } catch (err: any) {
      toast({ variant: "destructive", title: "Errore", description: err.message });
    } finally {
      setActing(null);
    }
  };

  return (
    <AdminLayout>
      <div className="mb-4 flex items-center gap-3">
        <Link to="/admin">
          <Button variant="ghost" size="icon"><ArrowLeft className="h-5 w-5" /></Button>
        </Link>
        <h1 className="text-2xl font-bold text-foreground">Prodotti in attesa di revisione</h1>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : submissions.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-16 text-muted-foreground">
          <Package className="h-12 w-12" />
          <p className="text-lg">Nessun prodotto in attesa</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {submissions.map((sub) => {
            const macros = sub.macros_100g as { protein?: number; carbs?: number; fats?: number } | null;
            return (
              <Card key={sub.id} className="overflow-hidden">
                {sub.image_url && (
                  <div className="h-40 w-full overflow-hidden bg-muted">
                    <img src={sub.image_url} alt={sub.name} className="h-full w-full object-contain" />
                  </div>
                )}
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">{sub.name}</CardTitle>
                  {sub.brand && <p className="text-sm text-muted-foreground">{sub.brand}</p>}
                </CardHeader>
                <CardContent className="space-y-2">
                  {sub.barcode && <Badge variant="outline" className="text-xs">EAN: {sub.barcode}</Badge>}
                  {sub.calories_100g != null && (
                    <p className="text-sm">{sub.calories_100g} kcal / 100g</p>
                  )}
                  {macros && (
                    <div className="flex gap-2 text-xs text-muted-foreground">
                      {macros.protein != null && <span>P {macros.protein}g</span>}
                      {macros.carbs != null && <span>C {macros.carbs}g</span>}
                      {macros.fats != null && <span>G {macros.fats}g</span>}
                    </div>
                  )}
                  <p className="text-xs text-muted-foreground">
                    {new Date(sub.created_at).toLocaleDateString("it-IT")}
                  </p>
                  <div className="flex gap-2 pt-2">
                    <Button
                      size="sm"
                      className="flex-1"
                      disabled={acting === sub.id}
                      onClick={() => handleApprove(sub)}
                    >
                      {acting === sub.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="mr-1 h-4 w-4" />}
                      Approva
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      className="flex-1"
                      disabled={acting === sub.id}
                      onClick={() => handleReject(sub)}
                    >
                      <X className="mr-1 h-4 w-4" />
                      Rifiuta
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </AdminLayout>
  );
};

export default AdminProductReviewPage;
