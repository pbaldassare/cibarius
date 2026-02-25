import { useState } from "react";
import MobileHeader from "@/components/MobileHeader";
import AddFoodFlow from "@/components/AddFoodFlow";

const ScanPage = () => {
  const [open, setOpen] = useState(true);

  return (
    <div>
      <MobileHeader title="Aggiungi prodotto" />
      <main className="px-4 py-8 pb-28 text-center space-y-4">
        <p className="text-sm text-muted-foreground">
          Usa Foto AI, barcode o cerca per aggiungere un prodotto al magazzino.
        </p>
        <button
          onClick={() => setOpen(true)}
          className="mx-auto flex items-center gap-2 rounded-2xl bg-primary px-6 py-3 text-sm font-bold text-primary-foreground"
        >
          Aggiungi prodotto
        </button>
      </main>

      <AddFoodFlow
        open={open}
        onOpenChange={setOpen}
        context="inventory"
        onComplete={() => setOpen(false)}
      />
    </div>
  );
};

export default ScanPage;
