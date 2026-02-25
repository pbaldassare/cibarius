import { useState, useEffect, useRef, useCallback } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { Button } from "@/components/ui/button";
import {
  Camera, AlertTriangle, RefreshCw, Flashlight,
} from "lucide-react";

interface BarcodeScannerProps {
  onDetected: (code: string) => void;
  active: boolean;
  onPermissionDenied?: () => void;
}

const BarcodeScanner = ({ onDetected, active, onPermissionDenied }: BarcodeScannerProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [permDenied, setPermDenied] = useState(false);
  const [running, setRunning] = useState(false);
  const [torchOn, setTorchOn] = useState(false);
  const [torchSupported, setTorchSupported] = useState(false);
  const onDetectedRef = useRef(onDetected);
  onDetectedRef.current = onDetected;

  const stopScanner = useCallback(async () => {
    if (scannerRef.current) {
      try {
        const state = scannerRef.current.getState();
        if (state === 2) await scannerRef.current.stop();
        scannerRef.current.clear();
      } catch {}
      scannerRef.current = null;
      setRunning(false);
      setTorchOn(false);
      setTorchSupported(false);
    }
  }, []);

  const startScanner = useCallback(async () => {
    if (!containerRef.current) return;
    setError(null);
    setPermDenied(false);
    await stopScanner();

    try {
      const devices = await Html5Qrcode.getCameras();
      if (!devices.length) { setError("Nessuna fotocamera trovata."); return; }

      const scanner = new Html5Qrcode("barcode-reader-flow");
      scannerRef.current = scanner;

      await scanner.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 280, height: 150 }, aspectRatio: 1.5 },
        (decodedText) => onDetectedRef.current(decodedText),
        () => {}
      );
      setRunning(true);

      try {
        const track = scanner.getRunningTrackCameraCapabilities();
        if (track && typeof (track as any).torchFeature === "function") {
          const torch = (track as any).torchFeature();
          if (torch?.isSupported()) setTorchSupported(true);
        }
      } catch {}
    } catch (err: any) {
      const msg = err?.message || String(err);
      if (msg.includes("Permission") || msg.includes("NotAllowed") || msg.includes("denied")) {
        setPermDenied(true);
        setError("Permesso fotocamera negato.");
        onPermissionDenied?.();
      } else {
        setError("Impossibile avviare la fotocamera: " + msg);
      }
    }
  }, [stopScanner, onPermissionDenied]);

  const toggleTorch = useCallback(async () => {
    if (!scannerRef.current) return;
    try {
      const track = scannerRef.current.getRunningTrackCameraCapabilities();
      if (track && typeof (track as any).torchFeature === "function") {
        const torch = (track as any).torchFeature();
        if (torch?.isSupported()) { await torch.apply(!torchOn); setTorchOn(!torchOn); }
      }
    } catch {}
  }, [torchOn]);

  useEffect(() => {
    if (active) startScanner();
    else stopScanner();
    return () => { stopScanner(); };
  }, [active, startScanner, stopScanner]);

  return (
    <div className="flex flex-col items-center gap-3">
      <div ref={containerRef} className="relative w-full overflow-hidden rounded-2xl border-2 border-accent bg-secondary">
        <div id="barcode-reader-flow" className="w-full" />
        {!running && !error && (
          <div className="flex flex-col items-center justify-center gap-2 py-16 text-muted-foreground">
            <Camera className="h-10 w-10" />
            <p className="text-sm">Avvio fotocamera…</p>
          </div>
        )}
      </div>

      {permDenied && (
        <div className="w-full rounded-xl border-2 border-destructive/30 bg-destructive/5 p-4 space-y-3">
          <div className="flex items-start gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive mt-0.5 shrink-0" />
            <div className="space-y-1">
              <p className="text-sm font-semibold text-destructive">Fotocamera non disponibile</p>
              <p className="text-xs text-muted-foreground">Abilita l'accesso alla fotocamera dalle impostazioni del browser.</p>
            </div>
          </div>
          <Button size="sm" variant="outline" className="w-full gap-1.5" onClick={startScanner}>
            <RefreshCw className="h-4 w-4" /> Riprova
          </Button>
        </div>
      )}

      {error && !permDenied && (
        <div className="flex flex-col items-center gap-2 rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-center">
          <AlertTriangle className="h-6 w-6 text-destructive" />
          <p className="text-sm text-destructive">{error}</p>
          <Button size="sm" variant="outline" onClick={startScanner}>
            <RefreshCw className="mr-1 h-4 w-4" /> Riprova
          </Button>
        </div>
      )}

      {running && (
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => { stopScanner(); setTimeout(startScanner, 300); }}>
            <RefreshCw className="mr-1 h-4 w-4" /> Ricarica
          </Button>
          {torchSupported && (
            <Button size="sm" variant={torchOn ? "default" : "outline"} onClick={toggleTorch} className="gap-1.5">
              <Flashlight className="h-4 w-4" />
              {torchOn ? "Torcia ON" : "Torcia"}
            </Button>
          )}
        </div>
      )}
    </div>
  );
};

export default BarcodeScanner;
