import { Link } from "react-router-dom";
import Seo from "@/components/site/Seo";

const PrivacyPage = () => (
  <>
    <Seo title="Informativa sulla privacy di Cibarius" description="Informativa GDPR di Cibarius: dati trattati, finalità, sicurezza, conservazione e diritti degli interessati." path="/privacy" />
    <article className="mx-auto max-w-3xl px-4 py-12 text-[16px] leading-relaxed text-foreground sm:py-16">
      <h1 className="font-display text-[28px] font-bold leading-tight sm:text-[32px]">Informativa sulla privacy di Cibarius</h1>
      <p className="mt-3 text-sm text-muted-foreground">Ultimo aggiornamento: 12 ottobre 2026</p>
      <p className="mt-6">Questa informativa descrive il trattamento dei dati personali nell’utilizzo di Cibarius, ai sensi del Regolamento UE 2016/679 (GDPR).</p>
      <div className="mt-8 space-y-8 [&_h2]:mb-3 [&_h2]:text-xl [&_h2]:font-semibold [&_ul]:list-disc [&_ul]:space-y-2 [&_ul]:pl-5 [&_a]:text-primary [&_a]:underline [&_a]:break-words">
        <section>
          <h2>1. Titolare del trattamento</h2>
          <p>Paolo Baldassare, Viale Michelangelo 71, 25015 Desenzano del Garda (BS), Italia.</p>
          <p>Contatto privacy: <a href="mailto:info@cibarius.online">info@cibarius.online</a>.</p>
        </section>
        <section>
          <h2>2. Dati trattati</h2>
          <ul>
            <li>Dati dell’account: nome, email, password cifrata e ruolo (utente, ristoratore, nutrizionista, fornitore).</li>
            <li>Dati inseriti nell’app: prodotti, dispensa, scadenze, ricette, liste della spesa, registri HACCP, temperature, preparazioni, documenti e bolle caricate.</li>
            <li>Foto scattate con la fotocamera: codici a barre, prodotti, etichette, scontrini e bolle.</li>
            <li>Dati sulla salute e sull’alimentazione forniti volontariamente: preferenze alimentari, allergie e intolleranze, misure corporee, piani alimentari, diario e messaggi con il nutrizionista.</li>
            <li>Posizione approssimativa: indirizzo o città del locale inseriti dall’utente.</li>
            <li>Dati di abbonamento e pagamento, gestiti da Stripe: Cibarius non memorizza i dati della carta.</li>
            <li>Dati tecnici e log necessari al funzionamento e alla sicurezza.</li>
          </ul>
        </section>
        <section>
          <h2>3. Finalità e basi giuridiche</h2>
          <ul>
            <li>Erogazione del servizio: esecuzione del contratto (art. 6, par. 1, lett. b GDPR).</li>
            <li>Trattamento dei dati sulla salute: solo con consenso esplicito (art. 9, par. 2, lett. a GDPR), revocabile in ogni momento scrivendo al contatto privacy.</li>
            <li>Adempimenti fiscali: obbligo legale.</li>
            <li>Sicurezza e prevenzione degli abusi: legittimo interesse.</li>
          </ul>
          <p className="mt-3">Nessuna pubblicità, nessuna vendita dei dati e nessuna profilazione a fini di marketing.</p>
        </section>
        <section>
          <h2>4. Condivisione e responsabili del trattamento</h2>
          <p>I dati sanitari del cliente sono visibili solo al nutrizionista che l’utente collega volontariamente. I dati del ristorante sono accessibili solo allo staff autorizzato.</p>
          <p className="mt-3">I responsabili del trattamento comprendono Supabase (database, autenticazione e archiviazione), Stripe (pagamenti), Resend (email transazionali) e i fornitori di servizi di intelligenza artificiale utilizzati per riconoscere testo e prodotti dalle foto.</p>
          <p className="mt-3">Eventuali trasferimenti di dati al di fuori dell’Unione Europea avvengono con Clausole Contrattuali Standard.</p>
        </section>
        <section>
          <h2>5. Sicurezza</h2>
          <p>Adottiamo connessioni cifrate (HTTPS/TLS), cifratura dei dati a riposo e accesso limitato in base al ruolo.</p>
        </section>
        <section>
          <h2>6. Conservazione e cancellazione</h2>
          <p>I dati sono conservati finché l’account è attivo. Alla richiesta di cancellazione vengono eliminati entro 30 giorni, salvo i dati che la legge impone di conservare, come quelli di fatturazione per 10 anni.</p>
          <p className="mt-3">Per le modalità di richiesta consulta <Link to="/elimina-account">Eliminazione account e dati Cibarius</Link>.</p>
        </section>
        <section>
          <h2>7. Diritti degli interessati</h2>
          <p>Puoi esercitare i diritti di accesso, rettifica, cancellazione, limitazione del trattamento, portabilità, opposizione e revoca del consenso scrivendo a <a href="mailto:info@cibarius.online">info@cibarius.online</a>.</p>
          <p className="mt-3">Hai inoltre diritto di presentare un reclamo al Garante per la protezione dei dati personali: <a href="https://www.garanteprivacy.it" target="_blank" rel="noopener noreferrer">garanteprivacy.it</a>.</p>
        </section>
        <section>
          <h2>8. Minori</h2>
          <p>Il servizio è destinato esclusivamente a persone maggiori di 18 anni.</p>
        </section>
        <section>
          <h2>9. Permessi dell’app Android</h2>
          <p>L’app richiede l’accesso alla fotocamera solo quando utilizzi lo scanner o scatti una foto.</p>
        </section>
        <section>
          <h2>10. Modifiche all’informativa</h2>
          <p>Eventuali modifiche a questa informativa saranno pubblicate su questa pagina, aggiornando la data riportata in alto.</p>
        </section>
      </div>
    </article>
  </>
);

export default PrivacyPage;