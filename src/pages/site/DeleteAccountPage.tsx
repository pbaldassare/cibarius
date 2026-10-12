import { Link } from "react-router-dom";
import Seo from "@/components/site/Seo";

const DeleteAccountPage = () => (
  <>
    <Seo title="Eliminazione account e dati Cibarius" description="Come richiedere l’eliminazione dell’account Cibarius e dei dati personali: dall’app o via email, entro 30 giorni." path="/elimina-account" />
    <article className="mx-auto max-w-3xl px-4 py-12 text-[16px] leading-relaxed text-foreground sm:py-16">
      <h1 className="font-display text-[28px] font-bold leading-tight sm:text-[32px]">Eliminazione account e dati Cibarius</h1>
      <p className="mt-6">Puoi richiedere l’eliminazione del tuo account Cibarius e dei dati associati in uno dei seguenti modi.</p>
      <div className="mt-8 space-y-8 [&_h2]:mb-3 [&_h2]:text-xl [&_h2]:font-semibold [&_a]:text-primary [&_a]:underline [&_a]:break-words">
        <section>
          <h2>Dall’app</h2>
          <p>Apri Cibarius, accedi al tuo account e vai in <strong>Profilo → Elimina account</strong>. Conferma la richiesta nella finestra di conferma. L’eliminazione è irreversibile.</p>
        </section>
        <section>
          <h2>Via email, anche senza accedere all’app</h2>
          <p>Scrivi a <a href="mailto:info@cibarius.online?subject=Elimina%20account">info@cibarius.online</a> dall’indirizzo email associato al tuo account, con oggetto <strong>“Elimina account”</strong>, chiedendo la cancellazione dell’account e dei dati.</p>
        </section>
        <section>
          <h2>Dati eliminati</h2>
          <p>Vengono eliminati l’account, il profilo e i dati associati: dispensa, ricette, dati sulla salute, foto e registri.</p>
        </section>
        <section>
          <h2>Dati conservati per obbligo di legge</h2>
          <p>I dati di fatturazione sono conservati per 10 anni per adempiere agli obblighi di legge.</p>
        </section>
        <section>
          <h2>Tempi di eliminazione</h2>
          <p>L’account e i dati vengono eliminati entro 30 giorni dalla richiesta, salvo i dati soggetti agli obblighi di conservazione indicati sopra.</p>
        </section>
        <p>Per ulteriori informazioni sul trattamento dei dati, consulta l’<Link to="/privacy">Informativa sulla privacy di Cibarius</Link>.</p>
      </div>
    </article>
  </>
);

export default DeleteAccountPage;