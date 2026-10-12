import { useEffect } from "react";
import { Capacitor, SystemBars, SystemBarsStyle, SystemBarType } from "@capacitor/core";

/**
 * Vero dentro l'app Android (e domani iOS) costruita con Capacitor.
 *
 * Li' il sito viaggia dentro il pacchetto: il sito pubblico non serve, il
 * service worker nemmeno, e non ha senso proporre di installare l'app.
 */
export const isNativeApp = (): boolean => Capacitor.isNativePlatform();

/**
 * Icone scure nella barra di stato finche' il componente e' montato.
 *
 * Di base sono chiare (capacitor.config.ts), per l'intestazione blu. Le
 * schermate che in alto hanno il fondo chiaro (onboarding, Preferiti) le
 * scuriscono, altrimenti ora e batteria non si leggono.
 */
export function useIconeBarraScure() {
  useEffect(() => {
    if (!isNativeApp()) return;
    const stile = (style: SystemBarsStyle) => void SystemBars.setStyle({ style, bar: SystemBarType.StatusBar });
    stile(SystemBarsStyle.Light);
    return () => stile(SystemBarsStyle.Dark);
  }, []);
}
