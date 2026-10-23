/**
 * Invito nello staff di un ristorante.
 *
 * Chi apre il link senza sessione deve passare da login o registrazione, che
 * di norma portano alla home del ruolo: il token resta qui finche' l'invito
 * non e' accettato, cosi' login, registrazione e conferma email riportano
 * sulla pagina dell'invito.
 */

const PENDING_INVITE_KEY = "cibarius_pending_staff_invite";

export const invitePath = (token: string) => `/invito/${token}`;

export const savePendingInvite = (token: string) => {
  try {
    localStorage.setItem(PENDING_INVITE_KEY, token);
  } catch {
    // Storage non disponibile: l'utente riaprira' il link dopo il login.
  }
};

export const clearPendingInvite = () => {
  try {
    localStorage.removeItem(PENDING_INVITE_KEY);
  } catch {
    // niente da pulire
  }
};

/** Percorso dell'invito in sospeso, se c'e'. */
export const pendingInvitePath = (): string | null => {
  try {
    const token = localStorage.getItem(PENDING_INVITE_KEY);
    return token ? invitePath(token) : null;
  } catch {
    return null;
  }
};
