import { useState } from "react";
import { useNavigate } from "react-router-dom";
import MobileHeader from "@/components/MobileHeader";
import AddFoodFlow from "@/components/AddFoodFlow";
import { Button } from "@/components/ui/button";
import { ShoppingCart } from "lucide-react";

const ScanPage = () => {
  const [open, setOpen] = useState(true);
  const navigate = useNavigate();

  return (
    <div>
      <MobileHeader title="Aggiungi" />
      <main className="px-4 py-8 pb-28 text-center space-y-4">
        <p className="text-sm text-muted-foreground">
          Usa Foto AI, barcode o cerca per aggiungere un prodotto al magazzino.
        </p>
        <button
          onClick={() => setOpen(true)}
          className="mx-auto flex items-center gap-2 rounded-2xl bg-primary px-6 py-3 text-sm font-bold text-primary-foreground"
        >
          Aggiungi alimento
        </button>

        <div className="pt-4 border-t border-border">
          <Button
            variant="outline"
            className="gap-2"
            onClick={() => navigate("/compare")}
          >
            <ShoppingCart className="h-4 w-4" />
            Confronta prodotti
          </Button>
          <p className="text-xs text-muted-foreground mt-1.5">
            Fotografa più prodotti e confronta i valori nutrizionali
          </p>
        </div>
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
