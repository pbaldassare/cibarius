import { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useRestaurant } from "@/hooks/useRestaurant";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import MobileHeader from "@/components/MobileHeader";
import RestaurantLabel, { type LabelData } from "@/components/RestaurantLabel";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft, Package, ChefHat, Clock, Thermometer, Archive,
  Snowflake, Hash, ImagePlus, Loader2, ChevronLeft, ChevronRight, Trash2,
  FileText, Upload, ExternalLink,
} from "lucide-react";
import { Link } from "react-router-dom";

const storageIcons: Record<string, any> = { frigo: Thermometer, freezer: Snowflake, ambiente: Archive };
const storageLabels: Record<string, string> = { frigo: "Frigo", freezer: "Congelatore", ambiente: "Dispensa" };

const RestaurantItemPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { restaurant, isLoading: rl } = useRestaurant();
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [item, setItem] = useState<any>(null);
  const [type, setType] = useState<"inv" | "prep">("inv");
  const [allergens, setAllergens] = useState<string[]>([]);
  const [photos, setPhotos] = useState<{ id: string; photo_url: string }[]>([]);
  const [photoIdx, setPhotoIdx] = useState(0);
  const [uploading, setUploading] = useState(false);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const ddtInputRef = useRef<HTMLInputElement>(null);
  const [sourceDoc, setSourceDoc] = useState<any>(null);
  const [prepIngredients, setPrepIngredients] = useState<any[]>([]);
  const [prepDocs, setPrepDocs] = useState<any[]>([]);
  const [usedInPreps, setUsedInPreps] = useState<any[]>([]);
  const [labelId, setLabelId] = useState<string | null>(null);
  const [uploadingDdt, setUploadingDdt] = useState(false);

  useEffect(() => {
    if (!id || !restaurant) return;

    const fetchItem = async () => {
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
        if (data) {
          setItem(data);
          // Fetch allergens for inventory items
          const { data: ia } = await supabase
            .from("inventory_item_allergens")
            .select("allergen:allergens(name)")
            .eq("inventory_item_id", realId);
          if (ia) setAllergens(ia.map((a: any) => a.allergen?.name).filter(Boolean));
        }
      }

      // Fetch photos
      const { data: photoData } = await supabase
        .from("inventory_item_photos")
        .select("id, photo_url")
        .eq("item_id", realId)
        .eq("item_type", isPrep ? "preparation" : "inventory")
        .order("uploaded_at", { ascending: true });
      if (photoData) setPhotos(photoData);

      // Traceability sections
      if (isPrep) {
        const { data: lbl } = await supabase
          .from("haccp_preparation_labels")
          .select("id")
          .eq("source_preparation_id", realId)
          .maybeSingle();
        if (lbl) {
          setLabelId(lbl.id);
          const [{ data: ings }, { data: pdocs }] = await Promise.all([
            supabase
              .from("haccp_preparation_ingredients")
              .select("id, ingredient_name, quantity_used, unit, source_lot_code, supplier_name, ingredient_expiration_date")
              .eq("preparation_label_id", lbl.id),
            supabase
              .from("haccp_preparation_documents")
              .select("document:haccp_documents(id, document_type, supplier_name, document_number, document_date, file_url, photo_url)")
              .eq("preparation_label_id", lbl.id),
          ]);
          if (ings && ings.length > 0) setPrepIngredients(ings);
          else {
            const { data: legacyIngs } = await supabase
              .from("preparation_ingredients")
              .select("id, custom_name, quantity, unit, product:products(name)")
              .eq("preparation_id", realId);
            if (legacyIngs) setPrepIngredients(
              legacyIngs.map((i: any) => ({
                id: i.id,
                ingredient_name: i.product?.name || i.custom_name,
                quantity_used: i.quantity,
                unit: i.unit,
              }))
            );
          }
          setPrepDocs((pdocs || []).map((d: any) => d.document).filter(Boolean));
        } else {
          const { data: legacyIngs } = await supabase
            .from("preparation_ingredients")
            .select("id, custom_name, quantity, unit, product:products(name)")
            .eq("preparation_id", realId);
          if (legacyIngs) setPrepIngredients(
            legacyIngs.map((i: any) => ({
              id: i.id,
              ingredient_name: i.product?.name || i.custom_name,
              quantity_used: i.quantity,
              unit: i.unit,
            }))
          );
        }
      } else {
        const { data: inv } = await supabase
          .from("inventory_items")
          .select("source_document_id")
          .eq("id", realId)
          .maybeSingle();
        if (inv?.source_document_id) {
          const { data: doc } = await supabase
            .from("haccp_documents")
            .select("id, document_type, supplier_name, document_number, document_date, file_url, photo_url")
            .eq("id", inv.source_document_id)
            .maybeSingle();
          if (doc) setSourceDoc(doc);
        }
        const { data: usedIn } = await supabase
          .from("haccp_preparation_ingredients")
          .select("preparation_label_id, label:haccp_preparation_labels(id, preparation_name, source_preparation_id, production_date)")
          .eq("pantry_item_id", realId);
        if (usedIn) {
          const seen = new Set<string>();
          const list: any[] = [];
          for (const u of usedIn as any[]) {
            if (u.label && !seen.has(u.label.id)) {
              seen.add(u.label.id);
              list.push(u.label);
            }
          }
          setUsedInPreps(list);
        }
      }

      setLoading(false);
    };
    fetchItem();
  }, [id, restaurant]);

  const handleUploadDdt = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user || !restaurant) return;
    const realId = id!.replace(/^(inv|prep)-/, "");
    setUploadingDdt(true);
    try {
      const ext = file.name.split(".").pop() ?? "jpg";
      const filePath = `${restaurant.id}/ddt/${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("haccp-documents").upload(filePath, file, { cacheControl: "3600" });
      if (upErr) throw upErr;
      const { data: urlData } = supabase.storage.from("haccp-documents").getPublicUrl(filePath);
      const { data: doc, error: docErr } = await supabase
        .from("haccp_documents")
        .insert({
          restaurant_id: restaurant.id,
          document_type: "ddt",
          photo_url: urlData.publicUrl,
          document_date: new Date().toISOString().slice(0, 10),
          created_by: user.id,
        })
        .select("id, document_type, supplier_name, document_number, document_date, file_url, photo_url")
        .single();
      if (docErr) throw docErr;
      await supabase.from("inventory_items").update({ source_document_id: doc.id }).eq("id", realId);
      setSourceDoc(doc);
      toast({ title: "DDT collegato ✓" });
    } catch (err: any) {
      toast({ variant: "destructive", title: "Errore upload DDT", description: err?.message });
    } finally {
      setUploadingDdt(false);
      e.target.value = "";
    }
  };

  const handleUploadPhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user || !item) return;
    setUploading(true);
    try {
      const realId = id!.replace(/^(inv|prep)-/, "");
      const ext = file.name.split(".").pop() ?? "jpg";
      const filePath = `${restaurant!.id}/${realId}/${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("item-photos").upload(filePath, file, { cacheControl: "3600" });
      if (upErr) throw upErr;
      const { data: urlData } = supabase.storage.from("item-photos").getPublicUrl(filePath);
      const photoUrl = urlData.publicUrl;
      const { data: row, error: dbErr } = await supabase
        .from("inventory_item_photos")
        .insert({
          item_id: realId,
          item_type: type === "prep" ? "preparation" : "inventory",
          photo_url: photoUrl,
          uploaded_by: user.id,
        })
        .select("id, photo_url")
        .single();
      if (dbErr) throw dbErr;
      if (row) setPhotos((p) => [...p, row]);
      toast({ title: "Foto aggiunta ✓" });
    } catch (err: any) {
      toast({ variant: "destructive", title: "Errore upload", description: err?.message });
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const handleDeletePhoto = async (photoId: string) => {
    await supabase.from("inventory_item_photos").delete().eq("id", photoId);
    setPhotos((p) => p.filter((ph) => ph.id !== photoId));
    setPhotoIdx((i) => Math.max(0, Math.min(i, photos.length - 2)));
  };

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
    ingredients: isPrep ? item.description : item.ingredients,
    allergens,
    restaurantName: restaurant?.name,
    productionDate: item.production_date,
    expiryDate,
    storageType: storage,
    lotNumber: item.lot_number,
    chefLifeHours: item.chef_life_hours,
    netWeightG: !isPrep ? item.net_weight_g : undefined,
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

        {/* Photo Gallery */}
        {(photos.length > 0 || true) && (
          <div className="rounded-xl bg-card shadow-card p-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold">Foto</h3>
              <Button
                size="sm"
                variant="ghost"
                className="gap-1 text-xs"
                disabled={uploading}
                onClick={() => photoInputRef.current?.click()}
              >
                {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ImagePlus className="h-3.5 w-3.5" />}
                Aggiungi
              </Button>
              <input ref={photoInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleUploadPhoto} />
            </div>
            {photos.length > 0 ? (
              <div className="relative">
                <img
                  src={photos[photoIdx]?.photo_url}
                  alt={`Foto ${photoIdx + 1}`}
                  className="w-full h-48 object-cover rounded-lg"
                />
                {photos.length > 1 && (
                  <>
                    <button
                      onClick={() => setPhotoIdx((i) => (i - 1 + photos.length) % photos.length)}
                      className="absolute left-1 top-1/2 -translate-y-1/2 bg-black/50 rounded-full p-1"
                    >
                      <ChevronLeft className="h-4 w-4 text-white" />
                    </button>
                    <button
                      onClick={() => setPhotoIdx((i) => (i + 1) % photos.length)}
                      className="absolute right-1 top-1/2 -translate-y-1/2 bg-black/50 rounded-full p-1"
                    >
                      <ChevronRight className="h-4 w-4 text-white" />
                    </button>
                  </>
                )}
                <div className="absolute bottom-2 right-2 flex gap-1">
                  <button
                    onClick={() => handleDeletePhoto(photos[photoIdx].id)}
                    className="bg-black/50 rounded-full p-1.5"
                  >
                    <Trash2 className="h-3 w-3 text-white" />
                  </button>
                </div>
                {photos.length > 1 && (
                  <div className="flex justify-center gap-1 mt-2">
                    {photos.map((_, i) => (
                      <div key={i} className={`h-1.5 w-1.5 rounded-full ${i === photoIdx ? "bg-primary" : "bg-muted"}`} />
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="h-24 flex items-center justify-center text-muted-foreground text-sm">
                Nessuna foto caricata
              </div>
            )}
          </div>
        )}

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
