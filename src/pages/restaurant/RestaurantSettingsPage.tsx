import { useState, useEffect } from "react";
import MobileHeader from "@/components/MobileHeader";
import { useRestaurant } from "@/hooks/useRestaurant";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { Loader2, Save, Truck, UserX, Plus } from "lucide-react";

const RestaurantSettingsPage = () => {
  const { restaurant, isLoading, refetch } = useRestaurant();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [saving, setSaving] = useState(false);

  // Supplier links
  const [supplierLinks, setSupplierLinks] = useState<any[]>([]);
  const [loadingSuppliers, setLoadingSuppliers] = useState(true);

  useEffect(() => {
    if (restaurant) {
      setName(restaurant.name);
      setAddress(restaurant.address ?? "");
      setPhone(restaurant.phone);
      loadSuppliers();
    }
  }, [restaurant]);

  const loadSuppliers = async () => {
    if (!restaurant) return;
    setLoadingSuppliers(true);
    const { data } = await supabase
      .from("supplier_restaurants")
      .select("*, suppliers(name, email, phone)")
      .eq("restaurant_id", restaurant.id)
      .order("created_at", { ascending: false });
    setSupplierLinks(data ?? []);
    setLoadingSuppliers(false);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!restaurant) return;
    setSaving(true);
    const { error } = await supabase
      .from("restaurants")
      .update({ name, address: address || null, phone })
      .eq("id", restaurant.id);
    setSaving(false);
    if (error) {
      toast({ variant: "destructive", title: "Errore", description: error.message });
    } else {
      toast({ title: "Dati aggiornati" });
      refetch();
    }
  };

  const revokeSupplier = async (linkId: string) => {
    const { error } = await supabase.from("supplier_restaurants").update({ status: "revoked" }).eq("id", linkId);
    if (!error) { toast({ title: "Fornitore revocato" }); loadSuppliers(); }
  };

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const activeSuppliers = supplierLinks.filter((l) => l.status === "active");
  const otherSuppliers = supplierLinks.filter((l) => l.status !== "active");

  return (
    <div>
      <MobileHeader title="Impostazioni" showBack />
      <main className="px-4 py-5 space-y-6">
        <Card className="border-2 border-accent">
          <CardHeader>
            <CardTitle className="text-base">Dati ristorante</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSave} className="space-y-4">
              <Input placeholder="Nome ristorante" value={name} onChange={(e) => setName(e.target.value)} required />
              <Input placeholder="Indirizzo" value={address} onChange={(e) => setAddress(e.target.value)} />
              <Input placeholder="Telefono" value={phone} onChange={(e) => setPhone(e.target.value)} required />
              <Button type="submit" className="w-full" disabled={saving}>
                {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                Salva
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Fornitori section */}
        <Card className="border-2 border-accent">
          <CardHeader className="flex flex-row items-center gap-3 pb-2">
            <Truck className="h-5 w-5 text-primary" />
            <CardTitle className="text-base flex-1">Fornitori</CardTitle>
            <Button size="sm" variant="outline" className="gap-1" onClick={() => navigate("/supplier-invite")}>
              <Plus className="h-3.5 w-3.5" /> Collega
            </Button>
          </CardHeader>
          <CardContent className="space-y-2">
            {loadingSuppliers ? (
              <p className="text-sm text-muted-foreground">Caricamento…</p>
            ) : activeSuppliers.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nessun fornitore collegato.</p>
            ) : (
              activeSuppliers.map((l) => (
                <div key={l.id} className="flex items-center gap-3 rounded-lg bg-secondary p-3">
                  <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-sm">📦</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{l.suppliers?.name}</p>
                    <p className="text-xs text-muted-foreground truncate">{l.suppliers?.email || l.suppliers?.phone || ""}</p>
                  </div>
                  <Button size="icon" variant="ghost" className="text-destructive" onClick={() => revokeSupplier(l.id)}>
                    <UserX className="h-4 w-4" />
                  </Button>
                </div>
              ))
            )}
            {otherSuppliers.length > 0 && (
              <div className="pt-2 space-y-1">
                {otherSuppliers.map((l) => (
                  <div key={l.id} className="flex items-center gap-3 opacity-50 text-sm">
                    <span>{l.suppliers?.name}</span>
                    <Badge variant="secondary">{l.status === "revoked" ? "Revocato" : l.status}</Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default RestaurantSettingsPage;
