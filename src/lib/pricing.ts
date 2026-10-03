/**
 * Listino mostrato al pubblico.
 *
 * Gli importi sono quelli della tabella `subscription_plans`, che è ciò che
 * Stripe addebita davvero: se cambiano a database vanno cambiati anche qui.
 * Finché il sito li teneva scritti in ogni pagina, la pagina dei prezzi
 * annunciava l'uso domestico come gratuito e basta, mentre dentro l'app
 * compariva un piano a pagamento di cui il sito non diceva nulla.
 *
 * Dentro l'app i prezzi si leggono da `subscription_plans`, non da qui: quella
 * resta la sola fonte usata per incassare.
 */

export interface PublicPlan {
  /** Chiave corrispondente a `subscription_plans.role_type`. */
  roleType: "user" | "user_plus" | "restaurant" | "professional";
  monthly: number | null;
  yearly: number | null;
  trialDays: number;
}

export const PLAN_HOME: PublicPlan = { roleType: "user", monthly: 0, yearly: 0, trialDays: 0 };
/** In app si chiama "Premium"; `user_plus` e' il nome interno a database. */
/** All'utente si presenta come "Premium"; `user_plus` è il nome a database. */
export const PLAN_PLUS: PublicPlan = { roleType: "user_plus", monthly: 2.99, yearly: 29.9, trialDays: 7 };
export const PLAN_RESTAURANT: PublicPlan = { roleType: "restaurant", monthly: 19.9, yearly: 199, trialDays: 30 };

/** "2,99 €" — virgola decimale e simbolo dopo la cifra, come si scrive in italiano. */
export function formatPrice(amount: number): string {
  const formatted = Number.isInteger(amount)
    ? String(amount)
    : amount.toFixed(2).replace(".", ",");
  return `${formatted} €`;
}
