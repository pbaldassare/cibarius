/**
 * Lettura completa di una tabella oltre il tetto di PostgREST.
 *
 * Supabase risponde al massimo con mille righe per richiesta e non segnala in
 * alcun modo di aver troncato. Le liste del magazzino leggevano l'inventario
 * senza `range()`, quindi oltre i mille lotti sparivano righe in silenzio e i
 * totali risultavano sbagliati senza nessun errore visibile.
 */

const PAGE_SIZE = 1000;

/** Numero massimo di pagine, per non ciclare all'infinito su un bug del server. */
const MAX_PAGES = 20;

export interface PagedResult<T> {
  data: T[];
  error: { message: string } | null;
  /** Vero se si e' raggiunto il tetto di pagine e altre righe potrebbero mancare. */
  truncated: boolean;
}

/**
 * Richiama `build` una pagina alla volta finche' il server non restituisce
 * meno righe della dimensione di pagina.
 *
 * `build` riceve gli estremi da passare a `.range()` e deve restituire la
 * query gia' costruita.
 */
export const fetchAllRows = async <T>(
  build: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>,
): Promise<PagedResult<T>> => {
  const all: T[] = [];

  for (let page = 0; page < MAX_PAGES; page++) {
    const from = page * PAGE_SIZE;
    const { data, error } = await build(from, from + PAGE_SIZE - 1);
    if (error) return { data: all, error, truncated: false };

    const rows = data ?? [];
    all.push(...rows);
    if (rows.length < PAGE_SIZE) return { data: all, error: null, truncated: false };
  }

  return { data: all, error: null, truncated: true };
};
