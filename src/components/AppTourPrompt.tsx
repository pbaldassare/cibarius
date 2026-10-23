import { useState, useEffect } from "react";
import { useTour, TourRole } from "./AppTourContext";
import { useRole } from "@/hooks/useRole";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Sparkles, Map } from "lucide-react";

const AppTourPrompt = () => {
  const { startTour } = useTour();
  const { role } = useRole();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const done = localStorage.getItem("cibarius_tour_done");
    if (!done) {
      const t = setTimeout(() => setOpen(true), 1200);
      return () => clearTimeout(t);
    }
  }, []);

  // Si chiede una volta sola: qualunque risposta chiude per sempre, il tour
  // resta disponibile dal profilo ("Rivedi il tour dell'app").
  const close = () => {
    setOpen(false);
    localStorage.setItem("cibarius_tour_done", "1");
  };

  const handleStart = () => {
    close();
    startTour((role as TourRole) ?? "user");
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) close(); }}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <div className="flex justify-center mb-2">
            <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center">
              <Map className="h-7 w-7 text-primary" />
            </div>
          </div>
          <DialogTitle className="text-center text-lg">Benvenuto su Cibarius! 🎉</DialogTitle>
          <DialogDescription className="text-center text-[13px] leading-relaxed">
            Vuoi fare un tour guidato dell'app? Ti mostreremo tutte le funzionalità in pochi minuti.
          </DialogDescription>
        </DialogHeader>

        <DialogFooter className="flex gap-2 sm:gap-2">
          <Button variant="outline" onClick={close} className="flex-1">
            Salta
          </Button>
          <Button onClick={handleStart} className="flex-1 gap-1.5">
            <Sparkles className="h-4 w-4" />
            Fai il tour
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default AppTourPrompt;
