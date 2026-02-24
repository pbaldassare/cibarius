import { useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Camera, Loader2, Package } from "lucide-react";

interface ImageUploadProps {
  imageUrl: string | null;
  onUploaded: (publicUrl: string, filePath: string) => void;
  storagePath: string; // e.g. "users/{uid}/products"
  className?: string;
}

const ImageUpload = ({ imageUrl, onUploaded, storagePath, className = "" }: ImageUploadProps) => {
  const { toast } = useToast();
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(imageUrl);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate
    if (!file.type.startsWith("image/")) {
      toast({ variant: "destructive", title: "Errore", description: "Seleziona un'immagine valida" });
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast({ variant: "destructive", title: "Errore", description: "Immagine troppo grande (max 5MB)" });
      return;
    }

    // Preview
    const reader = new FileReader();
    reader.onload = () => setPreview(reader.result as string);
    reader.readAsDataURL(file);

    // Upload
    setUploading(true);
    const ext = file.name.split(".").pop() ?? "jpg";
    const filePath = `${storagePath}/${Date.now()}.${ext}`;

    const { error } = await supabase.storage.from("media").upload(filePath, file, {
      cacheControl: "3600",
      upsert: false,
    });

    if (error) {
      toast({ variant: "destructive", title: "Upload fallito", description: error.message });
      setUploading(false);
      return;
    }

    const { data: urlData } = supabase.storage.from("media").getPublicUrl(filePath);
    const publicUrl = urlData.publicUrl;

    setUploading(false);
    onUploaded(publicUrl, filePath);
  };

  return (
    <div
      className={`relative flex items-center justify-center rounded-xl bg-secondary cursor-pointer overflow-hidden ${className}`}
      onClick={() => inputRef.current?.click()}
    >
      {preview ? (
        <img src={preview} alt="Foto" className="h-full w-full object-cover" />
      ) : (
        <Package className="h-8 w-8 text-muted-foreground" />
      )}

      {/* Camera overlay */}
      <div className="absolute bottom-1 right-1 flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground shadow">
        {uploading ? (
          <Loader2 className="h-3 w-3 animate-spin" />
        ) : (
          <Camera className="h-3 w-3" />
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleFileChange}
      />
    </div>
  );
};

export default ImageUpload;
