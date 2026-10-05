import { supabase } from "@/integrations/supabase/client";

/*
 * Indirizzi dei servizi Supabase, letti dal client gia' configurato.
 *
 * Il codice li ricavava da `import.meta.env.VITE_SUPABASE_URL`, una variabile
 * che nel progetto non e' definita da nessuna parte: non esiste un file .env e
 * vite.config.ts non la dichiara. In fase di build diventava quindi
 * `undefined`, e le chiamate finivano su indirizzi come
 * "undefined/functions/v1/...". Essendo relativi, il server rispondeva con
 * l'HTML dell'app, che il chiamante provava poi a leggere come JSON.
 *
 * L'indirizzo vero esiste in un solo punto, il client in
 * integrations/supabase: leggerlo da li' evita di averlo scritto in due posti
 * che possono divergere. Le proprieta' sotto non sono nei tipi pubblici
 * dell'SDK, ma sono assegnate dal costruttore di SupabaseClient.
 */
const client = supabase as unknown as {
  supabaseUrl: string;
  supabaseKey: string;
  functionsUrl: string | URL;
  authUrl: string | URL;
};

const senzaBarraFinale = (valore: string | URL): string => String(valore).replace(/\/$/, "");

/** Radice del progetto, es. `https://xxx.supabase.co`. */
export const supabaseUrl = (): string => senzaBarraFinale(client.supabaseUrl);

/** Radice delle edge function, es. `https://xxx.supabase.co/functions/v1`. */
export const functionsUrl = (): string => senzaBarraFinale(client.functionsUrl);

/** Radice dell'autenticazione, es. `https://xxx.supabase.co/auth/v1`. */
export const authUrl = (): string => senzaBarraFinale(client.authUrl);

/** Chiave pubblica, l'unica che puo' stare nel frontend. */
export const anonKey = (): string => client.supabaseKey;
