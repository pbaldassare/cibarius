import { Capacitor } from "@capacitor/core";

/**
 * Vero dentro l'app Android (e domani iOS) costruita con Capacitor.
 *
 * Li' il sito viaggia dentro il pacchetto: il sito pubblico non serve, il
 * service worker nemmeno, e non ha senso proporre di installare l'app.
 */
export const isNativeApp = (): boolean => Capacitor.isNativePlatform();
