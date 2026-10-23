import { describe, it, expect } from "vitest";
import { buildMonthlyHaccpReport, type ReportLog, type ReportTemperature } from "@/lib/haccp-report";
import type { SchedulableTask } from "@/lib/haccp-schedule";

const task = (over: Partial<SchedulableTask> = {}): SchedulableTask => ({
  id: "t1",
  name: "Pulizia piani",
  category: "pulizia",
  frequency: "giornaliera",
  custom_interval_days: null,
  created_at: null,
  ...over,
});

const log = (over: Partial<ReportLog>): ReportLog => ({
  task_id: "t1",
  task_name: "Pulizia piani",
  log_date: "2026-10-01",
  status: "completata",
  completed_by_name: "Anna",
  ...over,
});

const ottobre = new Date(2026, 9, 1);

describe("buildMonthlyHaccpReport", () => {
  it("distingue in tempo, in ritardo e mancati fino a ieri", () => {
    const oggi = new Date(2026, 9, 5, 10, 0);
    const report = buildMonthlyHaccpReport(
      [task()],
      [
        log({ log_date: "2026-10-01" }),
        log({ log_date: "2026-10-02", status: "in_ritardo", completed_by_name: "Marco" }),
        log({ log_date: "2026-10-03", status: "annullata" }),
      ],
      [],
      ottobre,
      oggi,
    );
    // 1-4 ottobre dovuti; il 5 (oggi) e' ancora aperto e non conta.
    expect(report.totals).toMatchObject({ due: 4, onTime: 1, late: 1, missed: 2, cancelled: 1, compliance: 50 });
    expect(report.byOperator).toEqual([
      { name: "Anna", onTime: 1, late: 0 },
      { name: "Marco", onTime: 0, late: 1 },
    ]);
  });

  it("conta oggi solo se gia' registrato", () => {
    const oggi = new Date(2026, 9, 2, 10, 0);
    const report = buildMonthlyHaccpReport(
      [task()],
      [log({ log_date: "2026-10-01" }), log({ log_date: "2026-10-02" })],
      [],
      ottobre,
      oggi,
    );
    expect(report.totals).toMatchObject({ due: 2, onTime: 2, missed: 0, compliance: 100 });
  });

  it("ignora i giorni prima della creazione dell'attivita'", () => {
    const report = buildMonthlyHaccpReport(
      [task({ created_at: new Date(2026, 9, 29).toISOString() })],
      [],
      [],
      ottobre,
      new Date(2026, 10, 15),
    );
    expect(report.totals).toMatchObject({ due: 3, missed: 3 });
  });

  it("include i controlli di attivita' non piu' attive senza segnarle mancate", () => {
    const report = buildMonthlyHaccpReport(
      [],
      [log({ task_id: "vecchia", task_name: "Vecchio controllo", status: "in_ritardo" })],
      [],
      ottobre,
      new Date(2026, 10, 15),
    );
    expect(report.byTask).toEqual([
      { taskId: "vecchia", name: "Vecchio controllo", due: 1, onTime: 0, late: 1, missed: 0, cancelled: 0 },
    ]);
  });

  it("elenca solo le temperature oltre il limite", () => {
    const temp = (over: Partial<ReportTemperature>): ReportTemperature => ({
      recorded_at: "2026-10-03T08:00:00Z",
      equipment_name: "Frigo",
      equipment_type: "fridge",
      temperature_value: 3,
      recorded_by_name: "Anna",
      ...over,
    });
    const report = buildMonthlyHaccpReport(
      [],
      [],
      [temp({}), temp({ temperature_value: 7.5 }), temp({ equipment_type: "freezer", temperature_value: -20 })],
      ottobre,
      new Date(2026, 10, 15),
    );
    expect(report.anomalies).toHaveLength(1);
    expect(report.anomalies[0]).toMatchObject({ temperature_value: 7.5, max: 4 });
    expect(report.totals.compliance).toBeNull();
  });
});
