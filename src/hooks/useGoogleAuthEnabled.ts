import { useEffect, useState } from "react";
import { isGoogleAuthEnabled } from "@/lib/googleAuth";

/**
 * Dice se il provider Google e' acceso sul progetto Supabase.
 *
 * Il pulsante resta nascosto finche' non lo e': cliccarlo manderebbe l'utente
 * su una pagina di errore JSON di Supabase, senza modo di tornare indietro.
 * Appena il provider viene abilitato dalla dashboard il pulsante compare da
 * solo, senza bisogno di ripubblicare l'app.
 */
export const useGoogleAuthEnabled = (): boolean => {
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    let cancelled = false;
    isGoogleAuthEnabled().then((available) => {
      if (!cancelled) setEnabled(available);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return enabled;
};
