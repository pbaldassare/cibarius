import { useEffect, useRef, useState } from "react";
import QRCode from "qrcode";
import { Button } from "@/components/ui/button";
import { Printer, Download } from "lucide-react";

export interface LabelData {
  id: string;
  type: "product" | "preparation";
  name: string;
  ingredients?: string;
  productionDate?: string;
  expiryDate?: string;
  storageType?: string;
  lotNumber?: string;
  chefLifeHours?: number;
}

const storageLabels: Record<string, string> = {
  frigo: "❄️ Frigo",
  freezer: "🧊 Congelatore",
  ambiente: "📦 Dispensa",
};

const RestaurantLabel = ({ label, showActions = true }: { label: LabelData; showActions?: boolean }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string>("");

  const baseUrl = window.location.origin;
  const qrUrl = `${baseUrl}/restaurant/item/${label.type === "product" ? "inv" : "prep"}-${label.id}`;

  useEffect(() => {
    QRCode.toDataURL(qrUrl, { width: 80, margin: 1 }).then(setQrDataUrl);
  }, [qrUrl]);

  const fmtDate = (d?: string) => {
    if (!d) return "—";
    const dt = new Date(d);
    return dt.toLocaleDateString("it-IT", { day: "2-digit", month: "2-digit", year: "2-digit" });
  };

  const handlePrint = () => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Etichetta - ${label.name}</title>
        <style>
          @page { size: 30mm 20mm; margin: 0; }
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { width: 30mm; height: 20mm; font-family: Arial, sans-serif; padding: 1mm; display: flex; flex-direction: column; }
          .label { width: 100%; height: 100%; display: flex; gap: 1mm; }
          .info { flex: 1; min-width: 0; }
          .name { font-size: 5pt; font-weight: bold; line-height: 1.1; margin-bottom: 0.5mm; overflow: hidden; max-height: 3.5mm; }
          .row { font-size: 3.5pt; line-height: 1.2; color: #333; }
          .qr { width: 10mm; height: 10mm; flex-shrink: 0; align-self: center; }
          .qr img { width: 100%; height: 100%; }
        </style>
      </head>
      <body>
        <div class="label">
          <div class="info">
            <div class="name">${label.name}</div>
            ${label.ingredients ? `<div class="row">Ing: ${label.ingredients.slice(0, 60)}</div>` : ""}
            <div class="row">Prod: ${fmtDate(label.productionDate)} · Scad: ${fmtDate(label.expiryDate)}</div>
            ${label.lotNumber ? `<div class="row">Lotto: ${label.lotNumber}</div>` : ""}
            <div class="row">${storageLabels[label.storageType || ""] || label.storageType || ""}${label.chefLifeHours ? ` · ${label.chefLifeHours}h` : ""}</div>
          </div>
          <div class="qr"><img src="${qrDataUrl}" /></div>
        </div>
      </body>
      </html>
    `);
    printWindow.document.close();
    setTimeout(() => { printWindow.print(); printWindow.close(); }, 500);
  };

  return (
    <div className="space-y-3">
      {/* Preview */}
      <div className="border border-border rounded-lg p-3 bg-white" style={{ maxWidth: "300px" }}>
        <div className="flex gap-2">
          <div className="flex-1 min-w-0">
            <p className="text-[11px] font-bold text-foreground truncate">{label.name}</p>
            {label.ingredients && (
              <p className="text-[8px] text-muted-foreground truncate">Ing: {label.ingredients}</p>
            )}
            <div className="text-[8px] text-muted-foreground mt-0.5">
              Prod: {fmtDate(label.productionDate)} · Scad: {fmtDate(label.expiryDate)}
            </div>
            {label.lotNumber && (
              <p className="text-[8px] text-muted-foreground">Lotto: {label.lotNumber}</p>
            )}
            <p className="text-[8px] text-muted-foreground">
              {storageLabels[label.storageType || ""] || ""}
              {label.chefLifeHours ? ` · Chef life: ${label.chefLifeHours}h` : ""}
            </p>
          </div>
          {qrDataUrl && (
            <img src={qrDataUrl} alt="QR" className="w-16 h-16 shrink-0" />
          )}
        </div>
      </div>

      {showActions && (
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={handlePrint} className="gap-1.5">
            <Printer className="h-3.5 w-3.5" />
            Stampa etichetta
          </Button>
        </div>
      )}
    </div>
  );
};

export default RestaurantLabel;
