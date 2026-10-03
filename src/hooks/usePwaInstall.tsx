import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

declare global {
  interface Window {
    /** Messo da parte dallo script in index.html, prima che React monti. */
    __cibariusInstallPrompt?: BeforeInstallPromptEvent;
    /** Presente sui vecchi Internet Explorer mobile: smentisce iOS. */
    MSStream?: unknown;
  }
}

interface PwaInstallContextType {
  canInstall: boolean;
  isInstalled: boolean;
  isIos: boolean;
  install: () => Promise<boolean>;
}

const PwaInstallContext = createContext<PwaInstallContextType>({
  canInstall: false,
  isInstalled: false,
  isIos: false,
  install: async () => false,
});

export const PwaInstallProvider = ({ children }: { children: ReactNode }) => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIos, setIsIos] = useState(false);

  useEffect(() => {
    const standalone = window.matchMedia("(display-mode: standalone)").matches;
    setIsInstalled(standalone);
    if (standalone) return;

    const ios = /iphone|ipad|ipod/i.test(navigator.userAgent) && !window.MSStream;
    setIsIos(ios);

    // Lo script in index.html intercetta l'evento prima che React monti e lo
    // lascia su window: senza questa lettura, su un caricamento veloce il
    // prompt risulterebbe non disponibile anche quando il browser lo offre.
    const messoDaParte = window.__cibariusInstallPrompt;
    if (messoDaParte) setDeferredPrompt(messoDaParte);

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };
    const daWindow = () => {
      const p = window.__cibariusInstallPrompt;
      if (p) setDeferredPrompt(p);
    };
    window.addEventListener("beforeinstallprompt", handler);
    window.addEventListener("cibarius:installprompt", daWindow);
    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
      window.removeEventListener("cibarius:installprompt", daWindow);
    };
  }, []);

  const install = useCallback(async () => {
    if (!deferredPrompt) return false;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    // L'evento si consuma: va tolto anche dalla copia su window, altrimenti
    // al prossimo montaggio il pulsante tornerebbe attivo a vuoto.
    delete window.__cibariusInstallPrompt;
    setDeferredPrompt(null);
    if (outcome === "accepted") {
      setIsInstalled(true);
      return true;
    }
    return false;
  }, [deferredPrompt]);

  return (
    <PwaInstallContext.Provider value={{ canInstall: !!deferredPrompt, isInstalled, isIos, install }}>
      {children}
    </PwaInstallContext.Provider>
  );
};

export const usePwaInstall = () => useContext(PwaInstallContext);
