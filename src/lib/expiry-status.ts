/**
 * Calcolo unico dello stato di scadenza di un prodotto.
 *
 * Prima che questo modulo esistesse ogni vista rifaceva il conto per conto
 * proprio e lo stesso prodotto poteva risultare "Scade domani" in home,
 * "In scadenza" nell'elenco e "Scaduto" nelle ricette. La causa era doppia:
 * `new Date("2026-10-03")` è mezzanotte UTC, che confrontata con la mezzanotte
 * locale sposta il risultato di un giorno; e gli arrotondamenti erano diversi
 * da una vista all'altra.
 */

/** Finestra entro cui un prodotto è considerato "in scadenza". */
export const EXPIRING_SOON_DAYS = 3;

export type ExpiryStatus = "expired" | "today" | "tomorrow" | "soon" | "ok" | "nodate";

/**
 * Interpreta una data di scadenza come mezzanotte **locale**.
 *
 * Le date arrivano da Postgres come `YYYY-MM-DD`, che il costruttore `Date`
 * tratterebbe come UTC: a est di Greenwich il prodotto risulterebbe scadere il
 * giorno dopo, a ovest il giorno prima.
 */
export function parseExpiryDate(value: string | null | undefined): Date | null {
  if (!value) return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  if (match) {
    return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  parsed.setHours(0, 0, 0, 0);
  return parsed;
}

function startOfToday(now: Date = new Date()): Date {
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  return today;
}

/**
 * Giorni interi che mancano alla scadenza: 0 se scade oggi, numeri negativi
 * per i prodotti già scaduti, `null` se la data non c'è.
 */
export function daysUntilExpiry(value: string | null | undefined, now?: Date): number | null {
  const expiry = parseExpiryDate(value);
  if (!expiry) return null;
  const diffMs = expiry.getTime() - startOfToday(now).getTime();
  return Math.round(diffMs / 86_400_000);
}

export function getExpiryStatus(value: string | null | undefined, now?: Date): ExpiryStatus {
  const days = daysUntilExpiry(value, now);
  if (days === null) return "nodate";
  if (days < 0) return "expired";
  if (days === 0) return "today";
  if (days === 1) return "tomorrow";
  if (days <= EXPIRING_SOON_DAYS) return "soon";
  return "ok";
}

/** Vero per i prodotti che richiedono attenzione ora: scaduti esclusi. */
export function isExpiringSoon(value: string | null | undefined, withinDays = EXPIRING_SOON_DAYS, now?: Date): boolean {
  const days = daysUntilExpiry(value, now);
  return days !== null && days >= 0 && days <= withinDays;
}

export function isExpired(value: string | null | undefined, now?: Date): boolean {
  const days = daysUntilExpiry(value, now);
  return days !== null && days < 0;
}

/**
 * Riduce i cinque stati ai tre usati dagli elenchi filtrabili, dove "scade
 * oggi", "scade domani" e "scade fra poco" finiscono tutti sotto "in scadenza".
 */
export type CoarseExpiryStatus = "expired" | "expiring" | "ok" | "nodate";

export function getCoarseExpiryStatus(value: string | null | undefined, now?: Date): CoarseExpiryStatus {
  const status = getExpiryStatus(value, now);
  if (status === "today" || status === "tomorrow" || status === "soon") return "expiring";
  return status;
}

/** Vero per scaduti e in scadenza: quello che va messo fra gli urgenti. */
export function needsAttention(value: string | null | undefined, now?: Date): boolean {
  const status = getCoarseExpiryStatus(value, now);
  return status === "expired" || status === "expiring";
}

/** Etichetta puntuale, per le schermate che mostrano un prodotto alla volta. */
export function getExpiryLabel(value: string | null | undefined, now?: Date): string {
  const days = daysUntilExpiry(value, now);
  if (days === null) return "Senza data";
  if (days < -1) return `Scaduto da ${Math.abs(days)} giorni`;
  if (days < 0) return "Scaduto da ieri";
  if (days === 0) return "Scade oggi";
  if (days === 1) return "Scade domani";
  if (days <= EXPIRING_SOON_DAYS) return `Scade tra ${days} giorni`;
  return "OK";
}

/**
 * Conto alla rovescia compatto per i badge: "oggi", "domani", "3 gg". A
 * differenza di `getExpiryLabel` non si ferma alla finestra di tre giorni, così
 * resta leggibile anche dove si guarda più lontano.
 */
export function getExpiryCountdown(value: string | null | undefined, now?: Date): string {
  const days = daysUntilExpiry(value, now);
  if (days === null) return "senza data";
  if (days < 0) return "scaduto";
  if (days === 0) return "oggi";
  if (days === 1) return "domani";
  return `${days} gg`;
}

/** Etichetta breve in maiuscolo, per i badge degli elenchi fitti. */
export function getExpiryBadgeLabel(value: string | null | undefined, now?: Date): string {
  const status = getCoarseExpiryStatus(value, now);
  if (status === "expired") return "SCADUTO";
  if (status === "expiring") return "IN SCADENZA";
  if (status === "nodate") return "SENZA DATA";
  return "OK";
}

/** Ordinamento per urgenza: prima gli scaduti, in fondo chi non ha data. */
export function compareByExpiry(a: string | null | undefined, b: string | null | undefined): number {
  const da = daysUntilExpiry(a);
  const db = daysUntilExpiry(b);
  if (da === null && db === null) return 0;
  if (da === null) return 1;
  if (db === null) return -1;
  return da - db;
}
