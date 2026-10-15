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
 * Falso nell'app iOS: Apple (App Store Review Guidelines 3.1.1) rifiuta le app
 * che vendono servizi digitali senza il suo In-App Purchase, e anche pulsanti,
 * link o inviti a comprare altrove. Li' l'abbonamento non si vende ne' si cita:
 * chi l'ha comprato sul sito lo usa e basta. Su Android e sul web si compra
 * con Stripe.
 *
 * Per Apple anche registrare un account ristorante o professionista e' un
 * acquisto fuori dall'App Store (revisione del 14/10/2026): su iOS ci si
 * registra solo come utente, gli altri account si creano sul sito e
 * nell'app si accede e basta.
 */
export const vendeAbbonamenti = (): boolean => Capacitor.getPlatform() !== "ios";

/**
 * Nell'app iOS la pagina non si ingrandisce piu' da sola.
 *
 * iOS ingrandisce la pagina quando si tocca un campo con il testo sotto i 16px
 * (molti dei nostri hanno text-sm) e poi la lascia ingrandita e spostata.
 * maximum-scale=1 lo evita. Solo su iOS: su Android e sul web bloccherebbe
 * anche lo zoom con due dita.
 */
export function bloccaZoomIos() {
  if (Capacitor.getPlatform() !== "ios") return;
  const viewport = document.querySelector<HTMLMetaElement>('meta[name="viewport"]');
  if (viewport && !viewport.content.includes("maximum-scale")) {
    viewport.content += ", maximum-scale=1";
  }
}

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
