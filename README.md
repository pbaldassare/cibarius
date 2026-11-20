# Cibarius

Cibarius gestisce scadenze, magazzino e tracciabilità HACCP. Il sito pubblico è [cibarius.online](https://cibarius.online/).

## Sviluppo locale

```sh
npm ci
npm run dev
```

Il frontend usa React, TypeScript e Vite. Supabase gestisce autenticazione, PostgreSQL e le Edge Functions. Le app iOS e Android usano Capacitor.

## Verifica e pubblicazione

```sh
npm test
npm run build
```

La build genera `dist/`, da distribuire sul progetto Cloudflare di Cibarius. Quando un aggiornamento del frontend dipende da nuove RPC o Edge Functions, distribuisci e verifica prima le modifiche su Supabase.
