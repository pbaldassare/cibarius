# App iOS (App Store)

Stessa app di `docs/ANDROID.md`, nel guscio Capacitor 8 per iOS: il sito
compilato sta nel pacchetto, si parte dall'accesso e ogni ruolo arriva sulla sua
home. Impaginazione e regole sono quelle di Android; qui solo le differenze.

| Voce | Valore |
|---|---|
| Bundle identifier | `online.cibarius.app` (come Android) |
| Nome visualizzato | Cibarius |
| iOS minimo | 15.0 |
| Dispositivi | solo iPhone, solo verticale (niente screenshot iPad da preparare) |
| Permessi | fotocamera e libreria foto, chiesti solo quando servono (`Info.plist`) |
| Progetto nativo | `ios/App/App.xcodeproj` |
| Dipendenze | Swift Package Manager: Capacitor arriva da GitHub, niente CocoaPods, niente Node |

---

## 1. Cosa cambia rispetto ad Android

- **Niente acquisti.** Apple (Review Guidelines 3.1.1) rifiuta le app che vendono
  servizi digitali senza In-App Purchase, e anche pulsanti, link o inviti a
  comprare altrove. Su iOS `vendeAbbonamenti()` (`src/lib/native.ts`) è falso:
  `/subscription` e `/restaurant/subscription` rimandano alla home, la voce
  "Abbonamento Premium" del profilo sparisce e il banner di prova del ristorante
  mostra solo lo stato, senza "Attiva ora". Chi ha comprato sul sito usa le
  funzioni e basta. Su Android e sul web si compra con Stripe.
- **Registrazione solo come utente.** Alla prima revisione (1.0 build 1,
  14/10/2026) Apple ha respinto l'app per la 3.1.1: registrare un account
  ristorante o professionista dall'app conta come accesso a un acquisto
  esterno. Su iOS la registrazione parte dai dati e crea solo account utente
  (casa, gratis); ristoranti, professionisti e fornitori si registrano sul
  sito e nell'app accedono e basta (3.1.3(c), servizi venduti a imprese).
- **Plugin nativi.** Stessi nomi e stesso JavaScript di Android, in Swift in
  `ios/App/App/CibariusNativo.swift`: `Stampa` (dialogo di stampa di iOS,
  AirPrint o PDF), `Salva` ("Salva in File" per CSV e PDF), `Condividi`
  (pannello di condivisione). Li registra `ViewController`, che
  `SceneDelegate.swift` mette come radice della finestra: il template di
  Capacitor 8 li' crea un `CAPBridgeViewController` e ignora `Main.storyboard`,
  e con quello i plugin risultano "not implemented on ios".
- **Zoom.** iOS ingrandisce la pagina quando si tocca un campo con il testo
  sotto i 16px. Nell'app `bloccaZoomIos()` (`src/lib/native.ts`) aggiunge
  `maximum-scale=1` al viewport; sul web e su Android resta com'e'.
- **Barre di sistema.** La WebView va da bordo a bordo (`contentInset` è
  `never`, il default) e `--sat`/`--sab` prendono i valori da
  `env(safe-area-inset-*)`, la riserva già prevista in `src/index.css`.
  `useIconeBarraScure()` funziona uguale.
- **Tasto indietro.** Su iPhone non c'è: si torna con le frecce delle
  intestazioni, come nella PWA.

---

## 2. Compilare su Xcode

Serve un Mac con Xcode 26 o successivo (lo chiede Capacitor 8) e l'account Apple Developer.

```sh
git pull
open ios/App/App.xcodeproj
```

1. Al primo avvio Xcode scarica il pacchetto Swift di Capacitor
   (`capacitor-swift-pm`): aspetta che finisca "Resolving Package Graph".
2. Target **App** › **Signing & Capabilities**: spunta *Automatically manage
   signing* e scegli il Team.
3. Prova su simulatore o iPhone collegato (▶).
4. Per App Store Connect: destinazione *Any iOS Device (arm64)*,
   **Product › Archive**, poi **Distribute App › App Store Connect**.

A ogni caricamento alza **Build** (`CURRENT_PROJECT_VERSION`) nel target; la
**Version** (`MARKETING_VERSION`) è quella che vedono gli utenti.

---

## 3. Aggiornare l'app

Come per Android, sulla macchina con Node:

```sh
npm run ios:sync      # sito compilato in ios/App/App/public
npm run ios:assets    # solo se cambiano icona o schermata di avvio
git add ios && git commit && git push
```

`App/App/public`, `capacitor.config.json`, `config.xml` e
`capacitor-cordova-ios-plugins` sono versionati apposta (vedi `ios/.gitignore`).
`CapApp-SPM/Package.swift` lo riscrive `cap sync`: non modificarlo a mano.

---

## 4. App Store Connect

- **Accesso per la revisione:** gli stessi quattro account della revisione Play
  (casa, ristorante, nutrizionista, fornitore). Casa e ristorante hanno
  l'abbonamento omaggio senza scadenza.
- **Privacy:** l'URL dell'informativa e le etichette sulla privacy (email,
  foto, dati alimentari). La cancellazione dell'account c'è nel profilo, come
  chiede Apple.
- **Crittografia:** `ITSAppUsesNonExemptEncryption` è `false` in `Info.plist`,
  quindi niente documentazione per l'esportazione.
- **Screenshot:** iPhone 6,9" (1320×2868 o 1290×2796). Quelli del Play Store
  hanno un'altra proporzione: vanno rifatti.

---

## 5. Punti aperti

- **Primo build fatto (Xcode 27, simulatore iPhone 18 Pro).** Provati accesso,
  intestazioni e barre, stampa, "Salva in File", condivisione, assenza degli
  acquisti. Restano da provare su un iPhone vero: schermata di avvio (il
  simulatore non la disegna), fotocamera, firma e archivio.
- **Stampa delle etichette.** Il formato 62×40 mm si sceglie nel dialogo di
  AirPrint, come su Android.
- **Link delle email.** Reset password e inviti aprono Safari: servono gli
  Universal Links (`apple-app-site-association` su cibarius.online).
