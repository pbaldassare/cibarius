import { useState, useEffect, useRef } from "react";
import MobileHeader from "@/components/MobileHeader";
import { useRestaurant } from "@/hooks/useRestaurant";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import {
  Loader2, Save, Truck, UserX, Plus, Camera, MapPin, Search,
  Globe, Instagram, Facebook,
} from "lucide-react";

const GOOGLE_MAPS_KEY = "AIzaSyA76iVcQpSnl76_G6bJVnEeOUmWVd7278I";

const RestaurantSettingsPage = () => {
  const { restaurant, isLoading, refetch } = useRestaurant();
  const { toast } = useToast();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [description, setDescription] = useState("");
  const [website, setWebsite] = useState("");
  const [instagram, setInstagram] = useState("");
  const [facebook, setFacebook] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [searchingLocation, setSearchingLocation] = useState(false);
  const [manualCoords, setManualCoords] = useState(false);

  // Supplier links
  const [supplierLinks, setSupplierLinks] = useState<any[]>([]);
  const [loadingSuppliers, setLoadingSuppliers] = useState(true);

  useEffect(() => {
    if (restaurant) {
      setName(restaurant.name);
      setAddress(restaurant.address ?? "");
      setPhone(restaurant.phone);
      setDescription(restaurant.description ?? "");
      setWebsite(restaurant.website ?? "");
      setInstagram(restaurant.instagram ?? "");
      setFacebook(restaurant.facebook ?? "");
      setImageUrl(restaurant.image_url ?? "");
      setLatitude(restaurant.latitude);
      setLongitude(restaurant.longitude);
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

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !restaurant) return;
    setUploading(true);
    const ext = file.name.split(".").pop();
    const path = `restaurants/${restaurant.id}/cover.${ext}`;
    const { error: uploadErr } = await supabase.storage
      .from("media")
      .upload(path, file, { upsert: true });
    if (uploadErr) {
      toast({ variant: "destructive", title: "Errore upload", description: uploadErr.message });
      setUploading(false);
      return;
    }
    const { data: urlData } = supabase.storage.from("media").getPublicUrl(path);
    const url = urlData.publicUrl + "?t=" + Date.now();
    setImageUrl(url);
    await supabase.from("restaurants").update({ image_url: url }).eq("id", restaurant.id);
    toast({ title: "Immagine caricata" });
    setUploading(false);
  };

  const searchLocation = async () => {
    if (!address.trim()) return;
    setSearchingLocation(true);
    try {
      const res = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&language=it&key=${GOOGLE_MAPS_KEY}`
      );
      const data = await res.json();
      if (data.results?.length > 0) {
        const loc = data.results[0].geometry.location;
        setLatitude(loc.lat);
        setLongitude(loc.lng);
        // Use the formatted address from Google
        setAddress(data.results[0].formatted_address);
        toast({ title: "Ubicazione trovata" });
      } else {
        toast({ variant: "destructive", title: "Nessun risultato", description: "Prova un indirizzo più preciso" });
      }
    } catch {
      toast({ variant: "destructive", title: "Errore di rete" });
    }
    setSearchingLocation(false);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!restaurant) return;
    setSaving(true);
    const { error } = await supabase
      .from("restaurants")
      .update({
        name,
        address: address || null,
        phone,
        description: description || null,
        website: website || null,
        instagram: instagram || null,
        facebook: facebook || null,
        latitude,
        longitude,
      })
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

  const mapSrc =
    latitude && longitude
      ? `https://www.google.com/maps/embed/v1/place?key=${GOOGLE_MAPS_KEY}&q=${latitude},${longitude}&zoom=16`
      : null;

  // Google Maps Static image for the restaurant (place photo or street view)
  const mapStaticImg =
    latitude && longitude
      ? `https://maps.googleapis.com/maps/api/staticmap?center=${latitude},${longitude}&zoom=16&size=600x300&markers=color:red%7C${latitude},${longitude}&key=${GOOGLE_MAPS_KEY}`
      : null;

  return (
    <div>
      <MobileHeader title="Impostazioni" showBack />
      <main className="px-4 py-5 space-y-6 pb-28">
        {/* Immagine attività */}
        <Card className="border-2 border-accent overflow-hidden">
          <CardHeader>
            <CardTitle className="text-base">Immagine attività</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {imageUrl ? (
              <img
                src={imageUrl}
                alt="Foto ristorante"
                className="w-full h-44 object-cover rounded-lg"
              />
            ) : (
              <div className="w-full h-44 bg-muted rounded-lg flex items-center justify-center text-muted-foreground">
                <Camera className="h-10 w-10" />
              </div>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={handleImageUpload}
            />
            <Button
              variant="outline"
              className="w-full gap-2"
              disabled={uploading}
              onClick={() => fileInputRef.current?.click()}
            >
              {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
              {imageUrl ? "Cambia foto" : "Carica foto"}
            </Button>
          </CardContent>
        </Card>

        {/* Dati base */}
        <Card className="border-2 border-accent">
          <CardHeader>
            <CardTitle className="text-base">Dati ristorante</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSave} className="space-y-4">
              <div className="space-y-1.5">
                <Label>Nome ristorante *</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} required />
              </div>
              <div className="space-y-1.5">
                <Label>Telefono *</Label>
                <Input value={phone} onChange={(e) => setPhone(e.target.value)} required />
              </div>
              <div className="space-y-1.5">
                <Label>Descrizione attività</Label>
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Descrivi la tua attività…"
                  rows={3}
                />
              </div>

              {/* Ubicazione */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <MapPin className="h-4 w-4 text-primary" />
                  Ubicazione
                </div>
                <div className="space-y-1.5">
                  <Label>Indirizzo</Label>
                  <div className="flex gap-2">
                    <Input
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      placeholder="Via Roma 1, Milano"
                      className="flex-1"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      disabled={searchingLocation || !address.trim()}
                      onClick={searchLocation}
                    >
                      {searchingLocation ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Search className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>

                {mapStaticImg && (
                  <img
                    src={mapStaticImg}
                    alt="Mappa"
                    className="w-full h-48 object-cover rounded-lg border border-border"
                  />
                )}
                {mapSrc && (
                  <iframe
                    src={mapSrc}
                    className="w-full h-48 rounded-lg border border-border"
                    style={{ border: 0 }}
                    allowFullScreen
                  />
                )}

                <button
                  type="button"
                  className="text-xs text-muted-foreground underline"
                  onClick={() => setManualCoords(!manualCoords)}
                >
                  {manualCoords ? "Nascondi coordinate" : "Inserisci coordinate manualmente"}
                </button>

                {manualCoords && (
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <Label className="text-xs">Latitudine</Label>
                      <Input
                        type="number"
                        step="any"
                        value={latitude ?? ""}
                        onChange={(e) => setLatitude(e.target.value ? parseFloat(e.target.value) : null)}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Longitudine</Label>
                      <Input
                        type="number"
                        step="any"
                        value={longitude ?? ""}
                        onChange={(e) => setLongitude(e.target.value ? parseFloat(e.target.value) : null)}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Web e Social */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <Globe className="h-4 w-4 text-primary" />
                  Web e Social
                </div>
                <div className="space-y-1.5">
                  <Label>Sito web</Label>
                  <Input
                    value={website}
                    onChange={(e) => setWebsite(e.target.value)}
                    placeholder="https://www.mioristorante.it"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="flex items-center gap-1.5">
                    <Instagram className="h-3.5 w-3.5" /> Instagram
                  </Label>
                  <Input
                    value={instagram}
                    onChange={(e) => setInstagram(e.target.value)}
                    placeholder="@mioristorante"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="flex items-center gap-1.5">
                    <Facebook className="h-3.5 w-3.5" /> Facebook
                  </Label>
                  <Input
                    value={facebook}
                    onChange={(e) => setFacebook(e.target.value)}
                    placeholder="https://facebook.com/mioristorante"
                  />
                </div>
              </div>

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
