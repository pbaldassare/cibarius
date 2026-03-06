import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useRestaurant } from "@/hooks/useRestaurant";
import MobileHeader from "@/components/MobileHeader";
import RestaurantLabel, { type LabelData } from "@/components/RestaurantLabel";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Package, ChefHat, Clock, Thermometer, Archive, Snowflake, Hash } from "lucide-react";
import { Button } from "@/components/ui/button";

const storageIcons: Record<string, any> = { frigo: Thermometer, freezer: Snowflake, ambiente: Archive };
const storageLabels: Record<string, string> = { frigo: "Frigo", freezer: "Congelatore", ambiente: "Dispensa" };

const RestaurantItemPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { restaurant, isLoading: rl } = useRestaurant();
  const [loading, setLoading] = useState(true);
  const [item, setItem] = useState<any>(null);
  const [type, setType] = useState<"inv" | "prep">("inv");
  const [allergens, setAllergens] = useState<string[]>([]);

  useEffect(() => {
    if (!id || !restaurant) return;

    const fetchItem = async () => {
      // Parse id format: inv-{uuid} or prep-{uuid}
      const isPrep = id.startsWith("prep-");
      const realId = id.replace(/^(inv|prep)-/, "");
      setType(isPrep ? "prep" : "inv");

      if (isPrep) {
        const { data } = await supabase
          .from("preparations")
          .select("*")
          .eq("id", realId)
          .eq("restaurant_id", restaurant.id)
          .maybeSingle();
        if (data) {
          setItem(data);
          // Fetch allergens
          const { data: pa } = await supabase
            .from("preparation_allergens")
            .select("allergen:allergens(name)")
            .eq("preparation_id", realId);
          if (pa) setAllergens(pa.map((a: any) => a.allergen?.name).filter(Boolean));
        }
      } else {
        const { data } = await supabase
          .from("inventory_items")
          .select("*, product:products(name, brand, image_url)")
          .eq("id", realId)
          .eq("restaurant_id", restaurant.id)
          .maybeSingle();
        if (data) setItem(data);
      }
      setLoading(false);
    };
    fetchItem();
  }, [id, restaurant]);

  if (rl || loading) {
    return (
      <div className="min-h-screen bg-background">
        <MobileHeader title="Dettaglio" />
        <div className="p-4 space-y-3">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-40 w-full rounded-xl" />
        </div>
      </div>
    );
  }

  if (!item) {
    return (
      <div className="min-h-screen bg-background">
        <MobileHeader title="Non trovato" />
        <div className="p-4 text-center">
          <p className="text-muted-foreground">Elemento non trovato</p>
          <Button variant="outline" className="mt-4" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4 mr-1" /> Indietro
          </Button>
        </div>
      </div>
    );
  }

  const isPrep = type === "prep";
  const name = isPrep ? item.name : item.product?.name || "Prodotto";
  const storage = item.storage_type;
  const StorageIcon = storageIcons[storage] || Package;
  const expiryDate = isPrep ? item.use_by_date : item.expiry_date;
  const fmtDate = (d?: string) => d ? new Date(d).toLocaleDateString("it-IT") : "—";

  const labelData: LabelData = {
    id: item.id,
    type: isPrep ? "preparation" : "product",
    name,
    ingredients: isPrep ? item.description : undefined,
    productionDate: item.production_date,
    expiryDate,
    storageType: storage,
    lotNumber: item.lot_number,
    chefLifeHours: item.chef_life_hours,
  };

  return (
    <div className="min-h-screen bg-background">
      <MobileHeader title="Dettaglio" />
      <main className="p-4 space-y-4 pb-28">
        {/* Header */}
        <div className="flex items-start gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-secondary">
            {isPrep ? <ChefHat className="h-6 w-6 text-accent" /> : <Package className="h-6 w-6 text-primary" />}
          </div>
          <div>
            <h1 className="text-lg font-bold text-foreground">{name}</h1>
            <Badge variant="outline" className="text-[10px]">
              {isPrep ? "Preparazione" : "Prodotto"}
            </Badge>
          </div>
        </div>

        {/* Details card */}
        <div className="rounded-xl bg-card shadow-card p-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="flex items-center gap-2">
              <StorageIcon className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-[10px] text-muted-foreground">Conservazione</p>
                <p className="text-sm font-medium">{storageLabels[storage] || storage}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-[10px] text-muted-foreground">Scadenza</p>
                <p className="text-sm font-medium">{fmtDate(expiryDate)}</p>
              </div>
            </div>
            {item.production_date && (
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-[10px] text-muted-foreground">Produzione</p>
                  <p className="text-sm font-medium">{fmtDate(item.production_date)}</p>
                </div>
              </div>
            )}
            {item.chef_life_hours && (
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-[10px] text-muted-foreground">Chef Life</p>
                  <p className="text-sm font-medium">{item.chef_life_hours}h</p>
                </div>
              </div>
            )}
            {item.lot_number && (
              <div className="flex items-center gap-2">
                <Hash className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-[10px] text-muted-foreground">Lotto</p>
                  <p className="text-sm font-medium">{item.lot_number}</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Allergens */}
        {allergens.length > 0 && (
          <div className="rounded-xl bg-card shadow-card p-4">
            <h3 className="text-sm font-semibold mb-2">Allergeni</h3>
            <div className="flex flex-wrap gap-1.5">
              {allergens.map((a) => (
                <Badge key={a} variant="destructive" className="text-[10px]">{a}</Badge>
              ))}
            </div>
          </div>
        )}

        {/* Label */}
        <div className="rounded-xl bg-card shadow-card p-4">
          <h3 className="text-sm font-semibold mb-3">Etichetta</h3>
          <RestaurantLabel label={labelData} />
        </div>
      </main>
    </div>
  );
};

export default RestaurantItemPage;
