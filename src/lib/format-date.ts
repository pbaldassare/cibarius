import { format } from "date-fns";
import { it } from "date-fns/locale";

import { parseExpiryDate } from "@/lib/expiry-status";

/** Formato data italiano standard per testo in UI (gg/mm/aaaa). */
export const DISPLAY_DATE_PATTERN = "dd/MM/yyyy";

/**
 * Data di calendario (YYYY-MM-DD o ISO) mostrata come gg/mm/aaaa.
 * Usa il parsing locale di {@link parseExpiryDate} per evitare shift UTC.
 */
export function formatDisplayDate(
  value: string | null | undefined,
  pattern: string = DISPLAY_DATE_PATTERN,
): string {
  const date = parseExpiryDate(value);
  if (!date) return "";
  return format(date, pattern, { locale: it });
}

/**
 * Etichetta di scadenza con supporto al formato breve (anno a 2 cifre).
 * Mantenuta per compatibilità con le chiamate che passavano `Intl` options.
 */
export function formatExpiryDate(
  value: string | null | undefined,
  options: Intl.DateTimeFormatOptions = {},
): string {
  const pattern =
    options.year === "2-digit" ? "dd/MM/yy" : DISPLAY_DATE_PATTERN;
  return formatDisplayDate(value, pattern);
}
