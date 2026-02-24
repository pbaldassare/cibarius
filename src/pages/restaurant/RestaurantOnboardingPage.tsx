import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import MobileHeader from "@/components/MobileHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Store } from "lucide-react";

const RestaurantOnboardingPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSubmitting(true);

    // Create restaurant
    const { data: restaurant, error } = await supabase
      .from("restaurants")
      .insert({ owner_id: user.id, name, address: address || null, phone })
      .select()
      .single();

    if (error) {
      toast({ variant: "destructive", title: "Errore", description: error.message });
      setSubmitting(false);
      return;
    }

    // Create owner membership
    const { error: memberError } = await supabase
      .from("restaurant_members")
      .insert({ restaurant_id: restaurant.id, user_id: user.id, member_role: "owner" });

    setSubmitting(false);

    if (memberError) {
      toast({ variant: "destructive", title: "Errore", description: memberError.message });
      return;
    }

    toast({ title: "Ristorante creato!" });
    navigate("/restaurant", { replace: true });
  };

  return (
    <div>
      <MobileHeader title="Benvenuto" />
      <main className="px-4 py-5">
        <Card className="border-2 border-accent">
          <CardHeader className="items-center text-center">
            <Store className="mb-2 h-10 w-10 text-primary" />
            <CardTitle className="text-xl">Crea il tuo ristorante</CardTitle>
            <CardDescription>Completa la registrazione per iniziare</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <Input
                placeholder="Nome ristorante *"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
              <Input
                placeholder="Indirizzo"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
              />
              <Input
                placeholder="Telefono *"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                required
              />
              <Button type="submit" className="w-full" disabled={submitting}>
                {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Crea ristorante
              </Button>
            </form>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default RestaurantOnboardingPage;
