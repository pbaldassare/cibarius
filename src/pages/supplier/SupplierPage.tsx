import { useEffect, useState } from "react";
import MobileHeader from "@/components/MobileHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { Building2, Package, TrendingUp, Loader2, Save } from "lucide-react";

const SupplierPage = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [supplier, setSupplier] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [onboarding, setOnboarding] = useState(false);

  // Onboarding form
  const [name, setName] = useState("");
  const [vatNumber, setVatNumber] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [saving, setSaving] = useState(false);

  // Stats
  const [restaurantCount, setRestaurantCount] = useState(0);
  const [catalogCount, setCatalogCount] = useState(0);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const { data } = await supabase
        .from("suppliers")
        .select("*")
        .eq("owner_user_id", user.id)
        .single();

      if (data) {
        setSupplier(data);
        // Load stats
        const [restRes, catRes] = await Promise.all([
          supabase.from("supplier_restaurants").select("id", { count: "exact" }).eq("supplier_id", data.id).eq("status", "active"),
          supabase.from("supplier_products").select("id", { count: "exact" }).eq("supplier_id", data.id),
        ]);
        setRestaurantCount(restRes.count ?? 0);
        setCatalogCount(catRes.count ?? 0);
      } else {
        setOnboarding(true);
      }
      setLoading(false);
    };
    load();
  }, [user]);

  const handleOnboarding = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSaving(true);
    const { data, error } = await supabase
      .from("suppliers")
      .insert({
        owner_user_id: user.id,
        name,
        vat_number: vatNumber || null,
        phone: phone || null,
        email: email || null,
        address: address || null,
      })
      .select()
      .single();
    setSaving(false);
    if (error) {
      toast({ variant: "destructive", title: "Errore", description: error.message });
    } else {
      setSupplier(data);
      setOnboarding(false);
      toast({ title: "Profilo fornitore creato!" });
    }
  };

  if (loading) {
    return (
      <div>
        <MobileHeader title="Dashboard Fornitore" />
        <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
      </div>
    );
  }

  if (onboarding) {
    return (
      <div>
        <MobileHeader title="Crea profilo Fornitore" />
        <main className="px-4 py-5">
          <Card className="border-2 border-accent">
            <CardHeader>
              <CardTitle className="text-base">Dati fornitore</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleOnboarding} className="space-y-4">
                <Input placeholder="Nome azienda *" value={name} onChange={(e) => setName(e.target.value)} required />
                <Input placeholder="P.IVA" value={vatNumber} onChange={(e) => setVatNumber(e.target.value)} />
                <Input placeholder="Telefono" value={phone} onChange={(e) => setPhone(e.target.value)} />
                <Input placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} type="email" />
                <Input placeholder="Indirizzo" value={address} onChange={(e) => setAddress(e.target.value)} />
                <Button type="submit" className="w-full" disabled={saving}>
                  {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                  Crea profilo
                </Button>
              </form>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  return (
    <div>
      <MobileHeader title="Dashboard Fornitore" />
      <main className="px-4 py-5 space-y-4">
        <p className="text-sm text-muted-foreground">Benvenuto, <span className="font-semibold text-foreground">{supplier?.name}</span></p>

        <div className="grid grid-cols-2 gap-3">
          <Card className="border-2 border-accent cursor-pointer" onClick={() => navigate("/supplier/restaurants")}>
            <CardContent className="flex flex-col items-center py-5">
              <Building2 className="h-8 w-8 text-primary mb-2" />
              <span className="text-2xl font-bold text-foreground">{restaurantCount}</span>
              <span className="text-xs text-muted-foreground">Ristoranti</span>
            </CardContent>
          </Card>
          <Card className="border-2 border-accent cursor-pointer" onClick={() => navigate("/supplier/catalog")}>
            <CardContent className="flex flex-col items-center py-5">
              <Package className="h-8 w-8 text-primary mb-2" />
              <span className="text-2xl font-bold text-foreground">{catalogCount}</span>
              <span className="text-xs text-muted-foreground">Prodotti</span>
            </CardContent>
          </Card>
        </div>

        <Card className="border-2 border-accent">
          <CardContent className="flex flex-col items-center py-5">
            <TrendingUp className="h-8 w-8 text-primary mb-2" />
            <span className="text-sm text-muted-foreground">Report — prossimamente</span>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default SupplierPage;
