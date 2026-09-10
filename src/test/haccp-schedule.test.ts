import { describe, it, expect } from "vitest";
import {
  isTaskDueOn, frequencyLabel, buildAgenda, groupCategories, toLogDate,
  type SchedulableTask, type TaskLog,
} from "@/lib/haccp-schedule";

const task = (over: Partial<SchedulableTask> = {}): SchedulableTask => ({
  id: "t1",
  name: "Controllo",
  category: "pulizia",
  frequency: "giornaliera",
  custom_interval_days: null,
  created_at: null,
  ...over,
});

// 2026-09-07 e' un lunedi', 2026-09-09 un mercoledi'
const lunedi = new Date(2026, 8, 7);
const mercoledi = new Date(2026, 8, 9);
const primoDelMese = new Date(2026, 8, 1);

describe("isTaskDueOn", () => {
  it("la giornaliera cade tutti i giorni", () => {
    expect(isTaskDueOn(task(), lunedi)).toBe(true);
    expect(isTaskDueOn(task(), mercoledi)).toBe(true);
  });

  it("la settimanale cade solo di lunedi'", () => {
    const t = task({ frequency: "settimanale" });
    expect(isTaskDueOn(t, lunedi)).toBe(true);
    expect(isTaskDueOn(t, mercoledi)).toBe(false);
  });

  it("la mensile cade solo il primo del mese", () => {
    const t = task({ frequency: "mensile" });
    expect(isTaskDueOn(t, primoDelMese)).toBe(true);
    expect(isTaskDueOn(t, mercoledi)).toBe(false);
  });

  it("la personalizzata rispetta l'intervallo in giorni", () => {
    // Creata il 7, ogni 3 giorni: 7, 10, 13...
    const t = task({
      frequency: "personalizzata",
      custom_interval_days: 3,
      created_at: new Date(2026, 8, 7).toISOString(),
    });
    expect(isTaskDueOn(t, new Date(2026, 8, 7))).toBe(true);
    expect(isTaskDueOn(t, new Date(2026, 8, 8))).toBe(false);
    expect(isTaskDueOn(t, new Date(2026, 8, 10))).toBe(true);
  });

  it("la personalizzata senza intervallo resta giornaliera", () => {
    // Comportamento precedente: prima del fix custom_interval_days non era
    // letto da nessuna parte, quindi queste attivita' comparivano ogni giorno.
    const t = task({ frequency: "personalizzata", custom_interval_days: null });
    expect(isTaskDueOn(t, mercoledi)).toBe(true);
  });

  it("non anticipa una personalizzata prima della creazione", () => {
    const t = task({
      frequency: "personalizzata",
      custom_interval_days: 2,
      created_at: new Date(2026, 8, 10).toISOString(),
    });
    expect(isTaskDueOn(t, new Date(2026, 8, 8))).toBe(false);
  });
});

describe("frequencyLabel", () => {
  it("lascia invariate le frequenze standard", () => {
    expect(frequencyLabel(task({ frequency: "settimanale" }))).toBe("settimanale");
  });

  it("esplicita l'intervallo di quelle personalizzate", () => {
    expect(frequencyLabel(task({ frequency: "personalizzata", custom_interval_days: 5 })))
      .toBe("ogni 5 giorni");
    expect(frequencyLabel(task({ frequency: "personalizzata", custom_interval_days: 1 })))
      .toBe("ogni giorno");
  });
});

describe("buildAgenda", () => {
  const done = (taskId: string, date: Date): TaskLog => ({
    task_id: taskId,
    log_date: toLogDate(date),
    status: "completata",
  });

  it("conta i controlli di oggi e quelli gia' registrati", () => {
    const tasks = [task({ id: "a" }), task({ id: "b" })];
    const agenda = buildAgenda(tasks, [done("a", mercoledi)], mercoledi, 0);
    expect(agenda.todayTotal).toBe(2);
    expect(agenda.todayDone).toBe(1);
    expect(agenda.todayPending.map((p) => p.task.id)).toEqual(["b"]);
  });

  it("tiene visibile la settimanale saltata il lunedi'", () => {
    // Il difetto che il modulo risolve: guardando solo la giornata corrente,
    // il martedi' il controllo del lunedi' spariva dal cruscotto.
    const settimanale = task({ id: "w", frequency: "settimanale" });
    const martedi = new Date(2026, 8, 8);
    const agenda = buildAgenda([settimanale], [], martedi, 14);
    expect(agenda.todayTotal).toBe(0);
    expect(agenda.overdue).toHaveLength(1);
    expect(agenda.overdue[0].daysLate).toBe(1);
  });

  it("non segnala arretrata una settimanale gia' registrata", () => {
    const settimanale = task({
      id: "w",
      frequency: "settimanale",
      created_at: lunedi.toISOString(),
    });
    const martedi = new Date(2026, 8, 8);
    const agenda = buildAgenda([settimanale], [done("w", lunedi)], martedi, 14);
    expect(agenda.overdue).toHaveLength(0);
  });

  it("non considera in ritardo le date precedenti alla creazione", () => {
    // Un controllo configurato oggi non ha due settimane di arretrato.
    const nuovo = task({ id: "n", created_at: mercoledi.toISOString() });
    const agenda = buildAgenda([nuovo], [], mercoledi, 14);
    expect(agenda.overdue).toHaveLength(0);
  });

  it("elenca un controllo arretrato una volta sola", () => {
    // Una giornaliera saltata per una settimana deve produrre una riga, non
    // sette righe identiche sul cruscotto.
    const agenda = buildAgenda([task({ id: "d" })], [], mercoledi, 7);
    expect(agenda.overdue).toHaveLength(1);
    expect(agenda.overdue[0].missedCount).toBe(7);
    expect(agenda.overdue[0].daysLate).toBe(1);
  });

  it("ordina gli arretrati dal piu' recente", () => {
    const tasks = [
      task({ id: "vecchio", frequency: "settimanale" }),
      task({ id: "recente" }),
    ];
    const agenda = buildAgenda(tasks, [], mercoledi, 14);
    expect(agenda.overdue[0].task.id).toBe("recente");
  });
});

describe("groupCategories", () => {
  it("espande i gruppi delle scorciatoie", () => {
    expect(groupCategories("temperature")).toContain("celle_frigo");
    expect(groupCategories("pulizie")).toContain("superfici");
  });

  it("restituisce vuoto per un gruppo sconosciuto", () => {
    expect(groupCategories("cappe")).toEqual([]);
    expect(groupCategories(null)).toEqual([]);
  });
});
