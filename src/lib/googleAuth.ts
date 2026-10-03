import { supabase } from "@/integrations/supabase/client";

/**
 * Accesso e registrazione con Google.
 *
 * Google restituisce soltanto nome, email e foto: il tipo di account scelto
 * nel primo passo della registrazione non puo' viaggiare con il redirect, e
 * il trigger `handle_new_user` crea sempre un profilo 'user'. La scelta viene
 * quindi messa da parte qui prima di partire e riapplicata al ritorno dalla
 * funzione `complete_oauth_signup`, che e' l'unica a poter scrivere il ruolo
 * (la policy "Users update own profile no role change" lo vieta al client).
 */

export type SignupIntentRole = "user" | "restaurant_owner" | "professional";

export interface SignupIntent {
  role: SignupIntentRole;
  full_name?: string;
  phone?: string;
  ref_coupon_code?: string;
  restaurant_name?: string;
  restaurant_address?: string;
  restaurant_phone?: string;
  display_name?: string;
  specialization?: string;
  city?: string;
  bio?: string;
}

const INTENT_KEY = "cibarius.signup-intent";

/** Oltre questo tempo il giro su Google e' stato abbandonato, non ripreso. */
const INTENT_TTL_MS = 60 * 60 * 1000;

interface StoredIntent {
  savedAt: number;
  intent: SignupIntent;
}

export const saveSignupIntent = (intent: SignupIntent) => {
  try {
    const stored: StoredIntent = { savedAt: Date.now(), intent };
    localStorage.setItem(INTENT_KEY, JSON.stringify(stored));
  } catch {
    // Navigazione privata o storage pieno: si perde solo il tipo di account,
    // l'utente viene comunque registrato come consumer.
  }
};

export const clearSignupIntent = () => {
  try {
    localStorage.removeItem(INTENT_KEY);
  } catch {
    // vedi saveSignupIntent
  }
};

export const readSignupIntent = (): SignupIntent | null => {
  try {
    const raw = localStorage.getItem(INTENT_KEY);
    if (!raw) return null;
    const stored = JSON.parse(raw) as StoredIntent;
    if (!stored?.intent?.role) return null;
    if (Date.now() - stored.savedAt > INTENT_TTL_MS) return null;
    return stored.intent;
  } catch {
    return null;
  }
};

/**
 * Traduce gli errori di Supabase in qualcosa di leggibile.
 *
 * Il caso piu' probabile e' il provider non ancora abilitato sul progetto:
 * il messaggio originale ("Unsupported provider") non direbbe niente a chi
 * sta solo provando ad accedere.
 */
export const describeOAuthError = (message: string): string => {
  const normalized = message.toLowerCase();
  if (normalized.includes("provider is not enabled") || normalized.includes("unsupported provider")) {
    return "L'accesso con Google non e' ancora attivo. Nel frattempo puoi usare email e password.";
  }
  if (normalized.includes("redirect")) {
    return "Indirizzo di ritorno non autorizzato. Segnalacelo e usa intanto email e password.";
  }
  return message;
};

/**
 * Manda l'utente su Google. Se tutto va bene questa chiamata non ritorna:
 * la pagina viene sostituita dal consenso Google. Un messaggio di ritorno
 * significa sempre che qualcosa e' andato storto.
 */
export const startGoogleAuth = async (intent?: SignupIntent): Promise<string | null> => {
  if (intent) {
    saveSignupIntent(intent);
  } else {
    clearSignupIntent();
  }

  const { error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${window.location.origin}/auth/callback`,
      // Senza questo Google rientra in silenzio con l'ultimo account usato,
      // e chi ne ha piu' di uno non puo' scegliere.
      queryParams: { prompt: "select_account" },
    },
  });

  if (error) {
    clearSignupIntent();
    return describeOAuthError(error.message);
  }

  return null;
};

/** I campi lasciati in bianco non vanno spediti: la funzione SQL ha gia' i suoi valori di ripiego. */
const toPayload = (intent: SignupIntent): Record<string, string> =>
  Object.fromEntries(
    Object.entries(intent).filter(
      (entry): entry is [string, string] => typeof entry[1] === "string" && entry[1].trim() !== "",
    ),
  );

/**
 * Da chiamare una volta sola, appena aperta la sessione di ritorno dal
 * redirect. Senza intenzione salvata non fa nulla: e' il caso di chi sta
 * semplicemente accedendo a un account che esiste gia'.
 */
export const applyPendingSignupIntent = async (): Promise<void> => {
  const intent = readSignupIntent();
  if (!intent) return;

  try {
    const { error } = await supabase.rpc("complete_oauth_signup", { p_payload: toPayload(intent) });
    if (error) console.error("complete_oauth_signup:", error.message);
  } catch (err) {
    console.error("complete_oauth_signup:", err);
  } finally {
    clearSignupIntent();
  }
};
