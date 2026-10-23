/**
 * Riepilogo mensile dei controlli HACCP per il backoffice.
 *
 * Per ogni giorno del mese (fino a oggi) e per ogni attivita' attiva si guarda
 * se il controllo era dovuto e com'e' andato:
 *   - in tempo: registrato il giorno stesso ("completata");
 *   - in ritardo: registrato in un giorno successivo ("in_ritardo");
 *   - mancato: dovuto e mai registrato (o solo annullato).
 * Il controllo di oggi ancora aperto non e' mancato: la giornata non e' finita.
 */

import { isTaskDueOn, toLogDate, type SchedulableTask } from "./haccp-schedule";

export interface ReportLog {
  task_id: string;
  task_name: string | null;
  log_date: string;
  status: string;
  completed_by_name: string | null;
}

export interface ReportTemperature {
  recorded_at: string;
  equipment_name: string;
  equipment_type: string;
  temperature_value: number;
  recorded_by_name: string | null;
}

/** Stessi limiti della funzione `haccp_temperature_max` del database. */
export const TEMPERATURE_MAX: Record<string, number> = { fridge: 4, cold_room: 4, freezer: -18 };

export interface TaskReportRow {
  taskId: string;
  name: string;
  due: number;
  onTime: number;
  late: number;
  missed: number;
  cancelled: number;
}

export interface OperatorReportRow {
  name: string;
  onTime: number;
  late: number;
}

export interface TemperatureAnomaly extends ReportTemperature {
  max: number;
}

export interface MonthlyHaccpReport {
  totals: Omit<TaskReportRow, "taskId" | "name"> & {
    /** Quota di controlli dovuti effettivamente eseguiti (in tempo o in ritardo), 0-100. */
    compliance: number | null;
  };
  byTask: TaskReportRow[];
  byOperator: OperatorReportRow[];
  anomalies: TemperatureAnomaly[];
}

const atMidnight = (date: Date): Date => new Date(date.getFullYear(), date.getMonth(), date.getDate());

export const buildMonthlyHaccpReport = (
  tasks: SchedulableTask[],
  logs: ReportLog[],
  temperatures: ReportTemperature[],
  month: Date,
  today: Date,
): MonthlyHaccpReport => {
  const first = new Date(month.getFullYear(), month.getMonth(), 1);
  const last = new Date(month.getFullYear(), month.getMonth() + 1, 0);
  const todayStart = atMidnight(today);
  const end = last < todayStart ? last : todayStart;
  const todayStr = toLogDate(today);

  const logsByKey = new Map<string, ReportLog[]>();
  for (const log of logs) {
    const key = `${log.task_id}|${log.log_date}`;
    logsByKey.set(key, [...(logsByKey.get(key) ?? []), log]);
  }

  const rows = new Map<string, TaskReportRow>();
  const row = (taskId: string, name: string) => {
    let r = rows.get(taskId);
    if (!r) {
      r = { taskId, name, due: 0, onTime: 0, late: 0, missed: 0, cancelled: 0 };
      rows.set(taskId, r);
    }
    return r;
  };

  for (const task of tasks) {
    row(task.id, task.name);
    const created = task.created_at ? atMidnight(new Date(task.created_at)) : null;
    for (let d = new Date(first); d <= end; d.setDate(d.getDate() + 1)) {
      if (created && d < created) continue;
      if (!isTaskDueOn(task, d)) continue;
      const dateStr = toLogDate(d);
      const dayLogs = logsByKey.get(`${task.id}|${dateStr}`) ?? [];
      const r = row(task.id, task.name);
      if (dayLogs.some((l) => l.status === "completata")) {
        r.due++;
        r.onTime++;
      } else if (dayLogs.some((l) => l.status === "in_ritardo")) {
        r.due++;
        r.late++;
      } else if (dateStr !== todayStr) {
        r.due++;
        r.missed++;
      }
    }
  }

  // Attivita' non piu' attive: contano solo i controlli effettivamente registrati.
  const activeIds = new Set(tasks.map((t) => t.id));
  for (const log of logs) {
    const r = row(log.task_id, log.task_name ?? "Attività rimossa");
    if (log.status === "annullata") r.cancelled++;
    else if (!activeIds.has(log.task_id) && (log.status === "completata" || log.status === "in_ritardo")) {
      r.due++;
      if (log.status === "completata") r.onTime++;
      else r.late++;
    }
  }

  const operators = new Map<string, OperatorReportRow>();
  for (const log of logs) {
    if (log.status !== "completata" && log.status !== "in_ritardo") continue;
    const name = log.completed_by_name || "—";
    const o = operators.get(name) ?? { name, onTime: 0, late: 0 };
    if (log.status === "completata") o.onTime++;
    else o.late++;
    operators.set(name, o);
  }

  const anomalies: TemperatureAnomaly[] = temperatures
    .filter((t) => TEMPERATURE_MAX[t.equipment_type] !== undefined && t.temperature_value > TEMPERATURE_MAX[t.equipment_type])
    .map((t) => ({ ...t, max: TEMPERATURE_MAX[t.equipment_type] }))
    .sort((a, b) => a.recorded_at.localeCompare(b.recorded_at));

  const byTask = [...rows.values()].filter((r) => r.due > 0 || r.cancelled > 0);
  const sum = (key: "due" | "onTime" | "late" | "missed" | "cancelled") =>
    byTask.reduce((acc, r) => acc + r[key], 0);
  const due = sum("due");
  const onTime = sum("onTime");
  const late = sum("late");

  return {
    totals: {
      due,
      onTime,
      late,
      missed: sum("missed"),
      cancelled: sum("cancelled"),
      compliance: due > 0 ? Math.round(((onTime + late) / due) * 100) : null,
    },
    byTask: byTask.sort((a, b) => b.missed - a.missed || b.late - a.late || a.name.localeCompare(b.name)),
    byOperator: [...operators.values()].sort((a, b) => b.onTime + b.late - (a.onTime + a.late)),
    anomalies,
  };
};
