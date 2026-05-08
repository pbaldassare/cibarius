import { useEffect, useRef } from "react";
import QRCode from "qrcode";
import { format } from "date-fns";

interface LabelData {
  preparation_name: string;
  production_date: string;
  expiration_date: string;
  conservation_type: string;
  internal_lot_code: string;
  quantity?: number | null;
  unit?: string | null;
  allergens?: string[] | null;
  qr_token: string;
}

interface Props {
  label: LabelData;
  restaurantName: string;
  size: "small" | "medium" | "a4";
  publicUrl: string;
}

const fmt = (d: string) => {
  try { return format(new Date(d), "dd/MM/yyyy"); } catch { return d; }
};

const HaccpLabelPrintView = ({ label, restaurantName, size, publicUrl }: Props) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (canvasRef.current) {
      QRCode.toCanvas(canvasRef.current, publicUrl, { margin: 1, width: 180 });
    }
  }, [publicUrl]);

  const sizeClass = {
    small: "w-[60mm] h-[40mm] text-[8px] p-1",
    medium: "w-[100mm] h-[60mm] text-[10px] p-2",
    a4: "w-full max-w-[200mm] text-sm p-4",
  }[size];

  const qrSize = size === "small" ? 70 : size === "medium" ? 110 : 150;

  return (
    <div className={`bg-white text-black border-2 border-black ${sizeClass} flex gap-2`}>
      <div className="flex-1 min-w-0 flex flex-col">
        <div className="font-bold uppercase truncate" style={{ fontSize: size === "small" ? 10 : size === "medium" ? 13 : 18 }}>
          {label.preparation_name}
        </div>
        <div className="text-[0.85em] opacity-70 truncate">{restaurantName}</div>
        <div className="mt-1 space-y-0.5 leading-tight">
          <div><b>Prod:</b> {fmt(label.production_date)}</div>
          <div><b>Scad:</b> {fmt(label.expiration_date)}</div>
          <div><b>Conserv:</b> {label.conservation_type}</div>
          <div><b>Lotto:</b> {label.internal_lot_code}</div>
          {label.quantity != null && <div><b>Qtà:</b> {label.quantity} {label.unit || ""}</div>}
          {label.allergens && label.allergens.length > 0 && (
            <div className="truncate"><b>Allergeni:</b> {label.allergens.join(", ")}</div>
          )}
        </div>
      </div>
      <div className="shrink-0 flex items-center justify-center">
        <canvas ref={canvasRef} width={qrSize} height={qrSize} />
      </div>
    </div>
  );
};

export default HaccpLabelPrintView;
