import { useState, useEffect } from "react";
import MobileHeader from "@/components/MobileHeader";
import { useRestaurant } from "@/hooks/useRestaurant";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Save } from "lucide-react";

const RestaurantSettingsPage = () => {
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
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div>
      <MobileHeader title="Impostazioni" showBack />
      <main className="px-4 py-5">
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
      </main>
    </div>
  );
};

export default RestaurantSettingsPage;
