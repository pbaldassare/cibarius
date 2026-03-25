import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Printer, LayoutGrid, Minus, Plus } from "lucide-react";

export interface LabelData {
  id: string;
  type: "product" | "preparation";
  name: string;
  ingredients?: string;
  allergens?: string[];
  restaurantName?: string;
  productionDate?: string;
  expiryDate?: string;
  storageType?: string;
  lotNumber?: string;
  chefLifeHours?: number;
  netWeightG?: number;
}

const storageLabels: Record<string, string> = {
  frigo: "FRIGO (0-4 °C)",
  freezer: "CONGELATORE (-18 °C)",
  ambiente: "AMBIENTE",
};

const fmtDate = (d?: string) => {
  if (!d) return "—";
  const dt = new Date(d);
  return dt.toLocaleDateString("it-IT", { day: "2-digit", month: "2-digit", year: "numeric" });
};

/** Highlight allergens in bold within ingredient text (EU 1169/2011) */
const highlightAllergens = (ingredients: string, allergens: string[]): string => {
  if (!allergens.length) return ingredients;
  let result = ingredients;
  for (const a of allergens) {
    const regex = new RegExp(`(${a.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "gi");
    result = result.replace(regex, `<b>$1</b>`);
  }
  return result;
};

const buildLabelHtml = (label: LabelData, qrDataUrl: string) => {
  const ingredientsHtml = label.ingredients
    ? highlightAllergens(label.ingredients, label.allergens || [])
    : "";
  const allergensLine = label.allergens?.length
    ? `<div class="allergens"><b>ALLERGENI: ${label.allergens.join(", ")}</b></div>`
    : "";

  return `
    <div class="label-box">
      <div class="header-row">
        <div class="product-name">${label.name}</div>
        ${label.restaurantName ? `<div class="restaurant-name">${label.restaurantName}</div>` : ""}
      </div>
      ${ingredientsHtml ? `<div class="ingredients"><span class="label-title">INGREDIENTI:</span> ${ingredientsHtml}</div>` : ""}
      ${allergensLine}
      <div class="dates-row">
        <div><span class="label-title">DATA PRODUZIONE:</span> ${fmtDate(label.productionDate)}</div>
        <div><span class="label-title">DATA SCADENZA:</span> ${fmtDate(label.expiryDate)}</div>
      </div>
      <div class="footer-row">
        <div class="footer-left">
          <div><span class="label-title">CONSERVAZIONE:</span> ${storageLabels[label.storageType || ""] || label.storageType || ""}</div>
          ${label.chefLifeHours ? `<div><span class="label-title">CHEF LIFE:</span> ${label.chefLifeHours}h</div>` : ""}
          ${label.lotNumber ? `<div><span class="label-title">LOTTO:</span> ${label.lotNumber}</div>` : ""}
        </div>
        <div class="qr"><img src="${qrDataUrl}" /></div>
      </div>
    </div>
  `;
};

const labelCss = `
  * { margin: 0; padding: 0; box-sizing: border-box; }
  .label-box {
    width: 62mm; min-height: 40mm; font-family: Arial, Helvetica, sans-serif;
    border: 0.5pt solid #000; padding: 2mm; display: flex; flex-direction: column; gap: 1mm;
    font-size: 6pt; line-height: 1.3; color: #000;
  }
  .header-row { display: flex; justify-content: space-between; align-items: flex-start; gap: 2mm; }
  .product-name { font-size: 8pt; font-weight: bold; text-transform: uppercase; flex: 1; }
  .restaurant-name { font-size: 5pt; text-align: right; max-width: 30%; color: #333; }
  .ingredients { font-size: 5.5pt; line-height: 1.2; }
  .allergens { font-size: 5.5pt; color: #c00; }
  .label-title { font-weight: bold; font-size: 5pt; text-transform: uppercase; }
  .dates-row { display: flex; gap: 4mm; font-size: 5.5pt; }
  .footer-row { display: flex; justify-content: space-between; align-items: flex-end; margin-top: auto; }
  .footer-left { font-size: 5.5pt; display: flex; flex-direction: column; gap: 0.5mm; }
  .qr { width: 14mm; height: 14mm; flex-shrink: 0; }
  .qr img { width: 100%; height: 100%; }
`;

const RestaurantLabel = ({ label, showActions = true }: { label: LabelData; showActions?: boolean }) => {
  const [qrDataUrl, setQrDataUrl] = useState<string>("");

  const baseUrl = window.location.origin;
  const qrUrl = `${baseUrl}/restaurant/item/${label.type === "product" ? "inv" : "prep"}-${label.id}`;

  useEffect(() => {
    QRCode.toDataURL(qrUrl, { width: 120, margin: 1 }).then(setQrDataUrl);
  }, [qrUrl]);

  const ingredientsHtml = label.ingredients
    ? highlightAllergens(label.ingredients, label.allergens || [])
    : "";

  const [gridCount, setGridCount] = useState(21);

  const handlePrint = () => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Etichetta - ${label.name}</title>
        <style>
          @page { size: 62mm 40mm; margin: 0; }
          body { margin: 0; padding: 0; }
          ${labelCss}
        </style>
      </head>
      <body>${buildLabelHtml(label, qrDataUrl)}</body>
      </html>
    `);
    printWindow.document.close();
    setTimeout(() => { printWindow.print(); printWindow.close(); }, 500);
  };

  const handlePrintGrid = () => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    const labels = Array.from({ length: gridCount }, () => buildLabelHtml(label, qrDataUrl)).join("");

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Griglia etichette - ${label.name}</title>
        <style>
          @page { size: A4 portrait; margin: 4mm 12mm; }
          body { margin: 0; padding: 0; display: flex; flex-wrap: wrap; gap: 0; align-content: flex-start; }
          ${labelCss}
          .label-box { height: 40mm; page-break-inside: avoid; }
        </style>
      </head>
      <body>${labels}</body>
      </html>
    `);
    printWindow.document.close();
    setTimeout(() => { printWindow.print(); printWindow.close(); }, 500);
  };

  return (
    <div className="space-y-3">
      {/* Preview — scaled down from 62mm real size */}
      <div className="border border-border rounded-lg p-3 bg-white overflow-hidden" style={{ maxWidth: "340px" }}>
        <div className="flex justify-between items-start gap-2">
          <p className="text-xs font-bold text-black uppercase leading-tight flex-1">{label.name}</p>
          {label.restaurantName && (
            <p className="text-[7px] text-gray-500 text-right max-w-[30%]">{label.restaurantName}</p>
          )}
        </div>

        {label.ingredients && (
          <p
            className="text-[8px] text-black mt-1 leading-tight"
            dangerouslySetInnerHTML={{
              __html: `<span class="font-bold uppercase text-[7px]">Ingredienti:</span> ${ingredientsHtml}`,
            }}
          />
        )}

        {label.allergens && label.allergens.length > 0 && (
          <p className="text-[8px] font-bold text-red-600 mt-0.5">
            ALLERGENI: {label.allergens.join(", ")}
          </p>
        )}

        <div className="flex gap-3 mt-1 text-[8px] text-black">
          <span><span className="font-bold text-[7px] uppercase">Prod:</span> {fmtDate(label.productionDate)}</span>
          <span><span className="font-bold text-[7px] uppercase">Scad:</span> {fmtDate(label.expiryDate)}</span>
        </div>

        <div className="flex justify-between items-end mt-1">
          <div className="text-[8px] text-black space-y-0.5">
            <p><span className="font-bold text-[7px] uppercase">Conservazione:</span> {storageLabels[label.storageType || ""] || ""}</p>
            {label.chefLifeHours && (
              <p><span className="font-bold text-[7px] uppercase">Chef life:</span> {label.chefLifeHours}h</p>
            )}
            {label.lotNumber && (
              <p><span className="font-bold text-[7px] uppercase">Lotto:</span> {label.lotNumber}</p>
            )}
          </div>
          {qrDataUrl && (
            <img src={qrDataUrl} alt="QR" className="w-14 h-14 shrink-0" />
          )}
        </div>
      </div>

      {showActions && (
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={handlePrint} className="gap-1.5">
            <Printer className="h-3.5 w-3.5" />
            Stampa etichetta
          </Button>
          <Popover>
            <PopoverTrigger asChild>
              <Button size="sm" variant="outline" className="gap-1.5">
                <LayoutGrid className="h-3.5 w-3.5" />
                Griglia A4
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-56 p-3" align="start">
              <p className="text-xs font-medium mb-2">Copie per foglio A4 (max 21)</p>
              <div className="flex items-center gap-2 mb-3">
                <Button size="icon" variant="outline" className="h-7 w-7" onClick={() => setGridCount(c => Math.max(1, c - 1))} disabled={gridCount <= 1}>
                  <Minus className="h-3 w-3" />
                </Button>
                <span className="text-sm font-semibold w-8 text-center">{gridCount}</span>
                <Button size="icon" variant="outline" className="h-7 w-7" onClick={() => setGridCount(c => Math.min(21, c + 1))} disabled={gridCount >= 21}>
                  <Plus className="h-3 w-3" />
                </Button>
              </div>
              <Button size="sm" className="w-full gap-1.5" onClick={handlePrintGrid}>
                <Printer className="h-3.5 w-3.5" />
                Stampa {gridCount} etichette
              </Button>
            </PopoverContent>
          </Popover>
        </div>
      )}
    </div>
  );
};

export default RestaurantLabel;
