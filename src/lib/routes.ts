/**
 * Percorsi che non possono vivere sparsi nel codice.
 *
 * La radice "/" ospitava l'app consumer dietro login. Da quando il sito
 * pubblico prende la radice, l'app dell'utente si sposta su `/app`: il
 * percorso compare in decine di punti (barre di navigazione, redirect post
 * login, tour guidato, rotte legacy) e tenerlo scritto a mano in ognuno
 * significherebbe dimenticarne qualcuno al prossimo spostamento.
 */

/** Home dell'app consumer, dopo il login. */
export const USER_HOME = "/app";

/** Home delle altre app, per ruolo. */
export const RESTAURANT_HOME = "/restaurant";
export const PRO_HOME = "/pro";
export const SUPPLIER_HOME = "/supplier";
export const ADMIN_HOME = "/admin";

/** Pagina di accesso all'area riservata, linkata dal sito pubblico. */
export const LOGIN_PATH = "/auth/login";
export const SIGNUP_PATH = "/auth/signup";
