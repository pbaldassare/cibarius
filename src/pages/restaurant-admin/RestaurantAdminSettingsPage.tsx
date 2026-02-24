import { useState, useEffect } from "react";
import RestaurantAdminLayout from "@/components/RestaurantAdminLayout";
import { useRestaurant } from "@/hooks/useRestaurant";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Save, Phone } from "lucide-react";

const RestaurantAdminSettingsPage = () => {
  const { restaurant, isLoading, refetch } = useRestaurant();
  const { toast } = useToast();
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (restaurant) {
      setName(restaurant.name);
      setAddress(restaurant.address ?? "");
      setPhone(restaurant.phone);
    }
  }, [restaurant]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!restaurant) return;
    if (!phone.trim()) {
      toast({ variant: "destructive", title: "Telefono obbligatorio", description: "Il numero di telefono è necessario per pubblicare ricette." });
      return;
    }
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

  if (isLoading) {
    return (
      <RestaurantAdminLayout>
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </RestaurantAdminLayout>
    );
  }

  return (
    <RestaurantAdminLayout>
      <h1 className="mb-6 text-2xl font-bold text-foreground">Dati Ristorante</h1>
      <Card className="max-w-lg border-2 border-accent">
        <CardHeader>
          <CardTitle className="text-base">Modifica dati</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSave} className="space-y-4">
            <Input placeholder="Nome ristorante" value={name} onChange={(e) => setName(e.target.value)} required />
            <Input placeholder="Indirizzo" value={address} onChange={(e) => setAddress(e.target.value)} />
            <div className="space-y-1">
              <Input placeholder="Telefono *" value={phone} onChange={(e) => setPhone(e.target.value)} required type="tel" />
              <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                <Phone className="h-3 w-3" /> Obbligatorio per pubblicare ricette
              </p>
            </div>
            <Button type="submit" disabled={saving}>
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
              Salva modifiche
            </Button>
          </form>
        </CardContent>
      </Card>
    </RestaurantAdminLayout>
  );
};

export default RestaurantAdminSettingsPage;
