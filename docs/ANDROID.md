# App Android (Play Store)

L'app Android è il sito compilato dentro un guscio [Capacitor](https://capacitorjs.com) 8.
Non è un browser che apre cibarius.online: i file stanno nel pacchetto, e
all'avvio si parte dalla pagina di accesso invece che dal sito pubblico. Chi ha
già la sessione finisce sulla home del suo ruolo (casa, ristorante,
nutrizionista, fornitore). L'area admin resta solo da browser.

| Voce | Valore |
|---|---|
| applicationId | `online.cibarius.app` (non si cambia dopo la prima pubblicazione) |
| Nome visualizzato | Cibarius |
| minSdk / targetSdk | 24 / 36 |
| Permessi | `INTERNET`, `CAMERA` (scanner e foto, chiesta solo quando serve) |
| Progetto nativo | `android/` |
| Configurazione | `capacitor.config.ts` |

---

## 1. Cosa cambia nel codice quando gira nell'app

Tutto passa da `isNativeApp()` in `src/lib/native.ts`:

- **Rotte**: le pagine del sito pubblico rimandano a `/auth/login` (`src/App.tsx`).
- **Service worker**: non viene registrato (`index.html`), i file sono già locali.
- **Installa l'app**: banner e pulsanti spariscono (`usePwaInstall`).
- **Admin**: bloccato come nella PWA (`AdminPwaGuard`).
- **Stampa**: nella WebView `window.print()` non fa niente. `src/lib/native-print.ts`
  la sostituisce con il plugin nativo `StampaPlugin.java`, che apre il dialogo di
  stampa di Android (stampante, servizio di stampa dell'etichettatrice o PDF).
  Copre sia le pagine che stampano se stesse sia le finestre di etichette e
  registri HACCP, senza toccarle.
- **Download**: la WebView ignora i link con `download`, quindi gli export CSV e
  i PDF di jsPDF non partirebbero. `src/lib/native-download.ts` intercetta il
  click e passa il file a `SalvaPlugin.java`, che apre il "Salva come" di Android.
- **Tasto indietro**: `MainActivity.java` chiede alla pagina
  (`src/lib/native-back.ts`): chiude sheet e dialog aperti, poi torna alla pagina
  prima. Dalle home dei ruoli e dall'accesso l'app va in secondo piano.
- **Fotocamera**: gli input con `capture` aprono l'app Fotocamera solo grazie a
  `<queries>` nel manifest; senza, da Android 11 Capacitor ripiega sulla galleria.
  Un input senza `capture` apre solo il selettore di file.

**Barre di sistema.** Da Android 15 l'app disegna sotto barra di stato e barra
dei gesti. Capacitor inietta le misure in `--safe-area-inset-*`, e
`src/index.css` le espone come `--sat` (alto) e `--sab` (basso). Regola per chi
scrive UI nuova:

- un'intestazione che tocca il bordo alto aggiunge `var(--sat)` al suo padding
  (`MobileHeader` lo fa già: usalo);
- un elemento fisso in basso aggiunge `var(--sab)` (`safe-bottom`, o
  `bottom-[calc(72px+var(--sab))]` come i FAB esistenti);
- le sheet di `ui/sheet.tsx` lo fanno da sole;
- non usare `env(safe-area-inset-*)` da solo: su Android prima di Chrome 140 vale 0;
- le icone della barra di stato sono chiare, per l'intestazione blu: una schermata
  con il fondo chiaro in alto chiama `useIconeBarraScure()` (`src/lib/native.ts`),
  come onboarding e Preferiti.

Sul web `--sat` e `--sab` valgono 0 (o il notch dell'iPhone), quindi non cambia niente.

---

## 2. Cosa serve sul PC

- **Android Studio** recente, con Android SDK 36.
- **JDK 21**: Capacitor 8 compila a livello 21, con un JDK più vecchio Gradle si
  ferma su `invalid source release`. Attenzione: le versioni recenti di Android
  Studio includono il JDK 25, su cui Gradle 8.14 non parte. In Android Studio
  scegli un JDK 21 in *Settings › Build Tools › Gradle › Gradle JDK*; da riga di
  comando passa `JAVA_HOME` (per esempio `~/.jdks/jbr-21.*`).

Node non serve sul PC dove costruisci: il sito compilato e la libreria di
Capacitor sono versionati in `android/`. Serve solo dove si rigenera (punto 6).

---

## 3. Aprire il progetto

```sh
git pull
```

In Android Studio **Open** sulla cartella `android/`, non sulla radice del
repository, e aspetta il Gradle sync.

Questi file sono generati, non scritti a mano, e sono versionati apposta:

- `android/app/src/main/assets/public/`: il sito compilato
- `android/app/src/main/assets/capacitor.config.json` e `capacitor.plugins.json`
- `android/capacitor-cordova-android-plugins/`
- `android/capacitor-libs/`: la libreria Android di Capacitor, copiata da
  `node_modules` da `scripts/vendor-capacitor-android.mjs`
- `android/app/src/main/res/xml/config.xml`

---

## 4. Chiave di firma e App Bundle

Serve una sola volta. Se perdi la chiave non puoi più aggiornare l'app pubblicata.

**Build › Generate Signed App Bundle / APK › Android App Bundle › Create new…**

Conserva il `.jks` e le password in un gestore di password. Il repository
ignora `*.jks`, `*.keystore` e `android/keystore.properties`: non committarli.
Attiva **Play App Signing** al primo caricamento: Google custodisce la chiave di
distribuzione e quella di upload, se la perdi, si può sostituire.

Variante **release**, il file esce in `android/app/release/app-release.aab`.

A ogni caricamento il `versionCode` deve crescere, in `android/app/build.gradle`:

```gradle
versionCode 1      // intero, +1 a ogni upload
versionName "1.0"  // stringa mostrata agli utenti
```

---

## 5. Provare senza Android Studio

Sulla VPS si costruisce anche l'APK di debug, da installare a mano sul telefono:

```sh
cd android
JAVA_HOME=/usr/lib/jvm/java-21-openjdk-amd64 ANDROID_HOME=/opt/android-sdk ./gradlew assembleDebug
# → android/app/build/outputs/apk/debug/app-debug.apk
```

Va bene per provare, non per Play Store (è firmato con la chiave di debug).

---

## 6. Aggiornare l'app

Ogni modifica al sito arriva sull'app solo con una nuova pubblicazione. Sulla
macchina con Node:

```sh
git pull
npm run android:sync
git add android && git commit && git push
```

`android:sync` compila **senza** pre-rendering: nell'app la home del sito non
si vede, e il suo HTML lampeggerebbe prima del passaggio all'accesso.

Poi sul PC con Android Studio: `git pull`, alza il `versionCode`, rigenera il
bundle firmato e caricalo.

---

## 7. Icona e avvio

I sorgenti stanno in `assets/` e sono ricavati da `public/icons/icon-512.png`:
il simbolo bianco (frigorifero e scritta) è estratto dall'azzurro `#35B5DC` e
rimesso alla misura giusta per l'icona adattiva, cioè dentro il cerchio che
Android non taglia mai.

```sh
npm run android:assets -- --iconBackgroundColor '#35B5DC' --iconBackgroundColorDark '#35B5DC' --splashBackgroundColor '#35B5DC' --splashBackgroundColorDark '#35B5DC'
```

Il comando riscrive `mipmap-anydpi-v26/ic_launcher*.xml` e **toglie il blocco
`<monochrome>`** (l'icona a tema di Android 13+): rimettilo a mano, è lo stesso
`inset` del foreground.

Su Android 12+ l'avvio lo disegna il sistema: l'icona dell'app su
`@color/cibarius_azzurro` (`values/styles.xml`).

---

## 8. Materiale per la scheda Play Store

Pronto da caricare in `design/play-store/finali/`:

| File | Uso in Play Console |
|---|---|
| `icona-512.png` | Icona dell'app, 512×512, quadrata piena (gli angoli li arrotonda Play) |
| `feature-graphic-1024x500.png` | Immagine in evidenza |
| `01-ristorante.png` … `06-ricette.png` | Screenshot telefono 1080×1920, da caricare in ordine |

Le sei tavole sono un'unica scena: una fascia blu a onda le attraversa e
continua da una all'altra nel carosello, per questo vanno caricate in ordine e
senza saltarne. Dentro i telefoni ci sono catture vere dell'app, non
ricostruzioni.

Per rifarle (serve Node con le dipendenze, non Android Studio):

```sh
npx vite build && npx vite preview --port 5174    # in un altro terminale
CIBARIUS_RISTORANTE='email:password' CIBARIUS_UTENTE='email:password' \
  node scripts/cattura-play-store.mjs              # → design/play-store/schermate/
node scripts/render-play-store.mjs                 # → design/play-store/finali/
```

La cattura usa gli account di prova e passa le risposte di Supabase da un
filtro che toglie i prefissi `[DEMO]`, rinomina utente e ristorante
("Giulia", "Trattoria Il Glicine") e sposta le scadenze vecchie su date
vicine. Per la settimana HACCP inserisce un registro di esempio completo,
con due controlli saltati. Il database non viene toccato. Titoli e testi delle
tavole stanno in `design/play-store.html`.

Se la UI cambia in modo visibile, rifai le tavole: Google confronta gli
screenshot con l'app.

---

## 9. Punti aperti

- **Abbonamenti e Google Play Billing.** Play chiede di vendere i servizi
  digitali usati nell'app (Plus, Ristorante Pro) con il suo sistema di
  pagamento, non con Stripe. Oggi `SubscriptionPage` apre il checkout Stripe nel
  browser. Prima di pubblicare va deciso: Play Billing, oppure togliere
  l'acquisto dall'app (si compra dal sito) senza link o inviti a pagare altrove.
- **Stampa etichette.** Il formato `@page 62mm 40mm` non è sempre rispettato dal
  dialogo di Android: il formato carta si sceglie nel dialogo. Da provare con
  l'etichettatrice vera.
- **Link delle email.** Reimpostazione password e inviti aprono il browser, non
  l'app. Servono gli App Links (`assetlinks.json` su cibarius.online più un
  `intent-filter` nel manifest).
- **Notifiche push native.** Non ci sono, restano email e notifiche in app.
- **Font.** Fredoka e Inter arrivano da Google Fonts: senza rete al primo avvio
  si vede il font di sistema. L'app senza rete comunque non lavora (Supabase).
- **Carica documento (Bolle).** L'input accetta PDF e immagini senza `capture`:
  apre solo il selettore di file, non la fotocamera. Con `capture` si perderebbe
  il PDF; servirebbe un secondo pulsante "Scatta foto".
