import MobileHeader from "@/components/MobileHeader";
import { ScanLine } from "lucide-react";

const ScanPage = () => {
  return (
    <div>
      <MobileHeader title="Scansiona" />
      <main className="flex flex-col items-center justify-center px-4 py-20">
        <div className="flex h-40 w-40 items-center justify-center rounded-full bg-primary/10">
          <ScanLine size={64} className="text-primary" />
        </div>
        <h2 className="mt-6 text-xl font-semibold text-foreground">Scansiona un codice a barre</h2>
        <p className="mt-2 text-center text-sm text-muted-foreground max-w-xs">
          Punta la fotocamera verso il codice a barre del prodotto per scoprire il suo punteggio
        </p>
        <button className="mt-8 h-12 rounded-xl bg-primary px-8 font-semibold text-primary-foreground transition-opacity active:opacity-80">
          Avvia scansione
        </button>
      </main>
    </div>
  );
};

export default ScanPage;
