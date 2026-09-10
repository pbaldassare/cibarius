/**
 * Quando e' dovuto un controllo HACCP.
 *
 * La regola viveva duplicata in due punti (`RestaurantPage` e
 * `RestaurantHaccpPage`) con due implementazioni diverse dello stesso
 * concetto, quindi home e griglia settimanale potevano non essere d'accordo.
 * Qui c'e' una sola definizione, usata da entrambe.
 *
 * Due comportamenti sono cambiati rispetto a prima:
 *   - la frequenza "personalizzata" veniva trattata come giornaliera perche'
 *     `custom_interval_days` non era letto da nessuna parte;
 *   - la home mostrava solo i controlli di oggi, quindi un controllo
 *     settimanale saltato spariva dal cruscotto il giorno dopo. Ora resta
 *     visibile come arretrato finche' non viene registrato.
 */

export interface SchedulableTask {
  id: string;
  name: string;
  category: string;
  frequency: string;
  custom_interval_days?: number | null;
  created_at?: string | null;
}

export interface TaskLog {
  task_id: string;
  log_date: string;
  status: string;
}

/** Giorno della settimana con lunedi' a zero (`getDay` parte da domenica). */
export const mondayIndex = (date: Date): number => (date.getDay() + 6) % 7;

const atMidnight = (date: Date): Date => {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  return copy;
};

const daysBetween = (from: Date, to: Date): number =>
  Math.round((atMidnight(to).getTime() - atMidnight(from).getTime()) / 86400000);

/** Formato usato da `haccp_logs.log_date`. */
export const toLogDate = (date: Date): string => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
};

/**
 * Dice se il controllo cade in quel giorno.
 *
 * Settimanale resta ancorato al lunedi' e mensile al primo del mese: sono le
 * convenzioni gia' in uso e cambiarle sposterebbe i controlli storici. Un
 * ristorante chiuso di lunedi' non li perde piu' comunque, perche' il giorno
 * dopo compaiono fra gli arretrati.
 */
export const isTaskDueOn = (task: SchedulableTask, date: Date): boolean => {
  switch (task.frequency) {
    case "giornaliera":
      return true;
    case "settimanale":
      return mondayIndex(date) === 0;
    case "mensile":
      return date.getDate() === 1;
    case "personalizzata": {
      const interval = Math.round(task.custom_interval_days ?? 0);
      // Intervallo non configurato: si comporta come prima, cioe' ogni giorno.
      if (interval < 1 || !task.created_at) return true;
      const elapsed = daysBetween(new Date(task.created_at), date);
      return elapsed >= 0 && elapsed % interval === 0;
    }
    default:
      return true;
  }
};

/** Etichetta leggibile della ricorrenza, intervallo personalizzato incluso. */
export const frequencyLabel = (task: SchedulableTask): string => {
  if (task.frequency !== "personalizzata") return task.frequency;
  const interval = Math.round(task.custom_interval_days ?? 0);
  if (interval < 1) return "personalizzata";
  return interval === 1 ? "ogni giorno" : `ogni ${interval} giorni`;
};

const isCompletedOn = (logs: TaskLog[], taskId: string, date: Date): boolean => {
  const dateStr = toLogDate(date);
  return logs.some((l) => l.task_id === taskId && l.log_date === dateStr && l.status === "completata");
};

export interface DueTask {
  task: SchedulableTask;
  date: Date;
  /** Giorni di ritardo: zero se e' il controllo di oggi. */
  daysLate: number;
  /** Quante occorrenze di questo controllo sono state saltate nella finestra. */
  missedCount: number;
}

export interface HaccpAgenda {
  /** Controlli previsti per oggi. */
  todayTotal: number;
  todayDone: number;
  todayPending: DueTask[];
  /** Controlli dei giorni precedenti mai registrati, dal piu' recente. */
  overdue: DueTask[];
}

/**
 * Cosa resta da fare oggi e cosa e' rimasto indietro.
 *
 * `lookbackDays` limita la finestra degli arretrati: senza un tetto un
 * ristorante nuovo si troverebbe l'intero storico da recuperare.
 *
 * Ogni controllo arretrato compare una volta sola, sull'occorrenza saltata
 * piu' recente. Elencare tutte le occorrenze riempirebbe il cruscotto di
 * quattordici righe identiche per ogni controllo giornaliero.
 *
 * Le date precedenti alla creazione dell'attivita' non contano: un controllo
 * configurato oggi non e' in ritardo di due settimane.
 */
export const buildAgenda = (
  tasks: SchedulableTask[],
  logs: TaskLog[],
  today: Date,
  lookbackDays = 14,
): HaccpAgenda => {
  const todayDue = tasks.filter((t) => isTaskDueOn(t, today));
  const todayPending: DueTask[] = todayDue
    .filter((t) => !isCompletedOn(logs, t.id, today))
    .map((task) => ({ task, date: today, daysLate: 0, missedCount: 1 }));

  const byTask = new Map<string, DueTask>();
  for (let back = 1; back <= lookbackDays; back++) {
    const date = new Date(atMidnight(today).getTime() - back * 86400000);
    for (const task of tasks) {
      if (task.created_at && daysBetween(new Date(task.created_at), date) < 0) continue;
      if (!isTaskDueOn(task, date)) continue;
      if (isCompletedOn(logs, task.id, date)) continue;
      const seen = byTask.get(task.id);
      if (seen) seen.missedCount++;
      else byTask.set(task.id, { task, date, daysLate: back, missedCount: 1 });
    }
  }

  return {
    todayTotal: todayDue.length,
    todayDone: todayDue.length - todayPending.length,
    todayPending,
    overdue: [...byTask.values()].sort((a, b) => a.daysLate - b.daysLate),
  };
};

/**
 * Raggruppamenti di categorie usati dalle scorciatoie del cruscotto.
 *
 * Le scorciatoie "Cappe" e "Forni" puntavano a categorie che non esistono in
 * nessun template, e tutte e tre finivano comunque sulla lista completa dei
 * controlli. Qui i gruppi corrispondono alle categorie realmente usate.
 */
export const CATEGORY_GROUPS: Record<string, { label: string; categories: string[] }> = {
  temperature: {
    label: "Temperature",
    categories: ["celle_frigo", "frigoriferi", "freezer", "temperature", "controllo_temperatura"],
  },
  pulizie: {
    label: "Pulizie",
    categories: ["pulizia", "pulizie", "superfici", "area_lavoro"],
  },
  attrezzature: {
    label: "Attrezzature",
    categories: ["attrezzature", "attrezzature_speciali", "verifica_attrezzature"],
  },
  scadenze: {
    label: "Scadenze prodotti",
    categories: ["prodotti_scadenza"],
  },
};

/** Categorie del gruppo, vuoto se il gruppo non esiste. */
export const groupCategories = (group?: string | null): string[] =>
  (group && CATEGORY_GROUPS[group]?.categories) || [];
