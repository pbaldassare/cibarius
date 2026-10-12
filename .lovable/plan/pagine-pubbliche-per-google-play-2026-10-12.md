# Pagine pubbliche per Google Play

- Creare `/privacy` e `/elimina-account` con i testi e le condizioni forniti, nello stile del sito.
- Aggiungere i link nel footer e il link Privacy in login, registrazione e Profilo.
- Verificare il pulsante con conferma di eliminazione già esistente, senza cancellare account reali.
- Verificare accesso senza login e leggibilità su desktop e telefono.

## Dettagli tecnici

- Rotte pubbliche autonome accanto alla pagina HACCP, fuori da `SITE_ROUTES`, accessibili anche nell’app nativa.
- Riutilizzare `SiteLayout` e includere le nuove pagine nel render statico, metadati e sitemap.
- Nessuna modifica alle altre funzionalità o ai dati esistenti.
