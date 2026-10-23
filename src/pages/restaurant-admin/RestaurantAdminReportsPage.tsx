import { useEffect, useMemo, useState } from "react";
import RestaurantAdminLayout from "@/components/RestaurantAdminLayout";
import { useRestaurant } from "@/hooks/useRestaurant";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Loader2, Printer, Percent, CheckCircle2, Clock, XCircle, Ban, Thermometer,
} from "lucide-react";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import type { SchedulableTask } from "@/lib/haccp-schedule";
import {
  buildMonthlyHaccpReport, type ReportLog, type ReportTemperature,
} from "@/lib/haccp-report";

// Nomi di attivita' e operatori li scrive lo staff: nella stampa vanno escapati.
const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

const RestaurantAdminReportsPage = () => {
  const { restaurant, isLoading: restaurantLoading } = useRestaurant();
  const [month, setMonth] = useState(format(new Date(), "yyyy-MM"));
  const [tasks, setTasks] = useState<SchedulableTask[]>([]);
  const [logs, setLogs] = useState<ReportLog[]>([]);
  const [temperatures, setTemperatures] = useState<ReportTemperature[]>([]);
  const [loading, setLoading] = useState(true);

  const monthDate = useMemo(() => {
    const [y, m] = month.split("-").map(Number);
    return new Date(y, m - 1, 1);
  }, [month]);

  useEffect(() => {
    if (!restaurant) return;
    const load = async () => {
      setLoading(true);
      const from = format(monthDate, "yyyy-MM-dd");
      const next = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 1);
      const to = format(new Date(next.getTime() - 86400000), "yyyy-MM-dd");
      const [tasksRes, logsRes, tempsRes] = await Promise.all([
        supabase.from("haccp_tasks")
          .select("id, name, category, frequency, custom_interval_days, created_at")
          .eq("restaurant_id", restaurant.id).eq("is_active", true),
        supabase.from("haccp_logs")
          .select("task_id, task_name, log_date, status, completed_by_name")
          .eq("restaurant_id", restaurant.id).gte("log_date", from).lte("log_date", to),
        supabase.from("haccp_temperature_logs")
          .select("recorded_at, equipment_name, equipment_type, temperature_value, recorded_by_name")
          .eq("restaurant_id", restaurant.id)
          .gte("recorded_at", monthDate.toISOString()).lt("recorded_at", next.toISOString()),
      ]);
      setTasks((tasksRes.data ?? []) as SchedulableTask[]);
      setLogs((logsRes.data ?? []) as ReportLog[]);
      setTemperatures((tempsRes.data ?? []).map((t) => ({ ...t, temperature_value: Number(t.temperature_value) })) as ReportTemperature[]);
      setLoading(false);
    };
    load();
  }, [restaurant, monthDate]);

  const report = useMemo(
    () => buildMonthlyHaccpReport(tasks, logs, temperatures, monthDate, new Date()),
    [tasks, logs, temperatures, monthDate],
  );
  const monthLabel = format(monthDate, "MMMM yyyy", { locale: it });

  const printReport = () => {
    const t = report.totals;
    const html = `<html><head><title>Report HACCP ${esc(monthLabel)}</title>
<style>body{font-family:sans-serif;padding:24px;color:#1e2530}h1{font-size:20px;margin:0}h2{font-size:15px;margin:24px 0 8px}
.sub{color:#6b7280;font-size:13px;margin-top:4px}.stats{display:flex;gap:12px;flex-wrap:wrap;margin-top:16px}
.stat{border:1px solid #e5e7eb;border-radius:8px;padding:10px 14px;min-width:110px}.n{font-size:20px;font-weight:700}.l{font-size:12px;color:#6b7280}
table{width:100%;border-collapse:collapse}th,td{border:1px solid #e5e7eb;padding:6px 8px;font-size:12px;text-align:left}th{background:#f8f9fa}
.r{text-align:right}.warn{color:#b91c1c;font-weight:600}</style></head><body>
<h1>Report HACCP — ${esc(restaurant?.name ?? "")}</h1>
<div class="sub">${esc(monthLabel)} · generato il ${format(new Date(), "dd/MM/yyyy HH:mm")}</div>
<div class="stats">
<div class="stat"><div class="n">${t.compliance === null ? "—" : `${t.compliance}%`}</div><div class="l">Conformità</div></div>
<div class="stat"><div class="n">${t.onTime}</div><div class="l">In tempo</div></div>
<div class="stat"><div class="n">${t.late}</div><div class="l">Registrati in ritardo</div></div>
<div class="stat"><div class="n">${t.missed}</div><div class="l">Mancati</div></div>
<div class="stat"><div class="n">${t.cancelled}</div><div class="l">Annullati</div></div>
<div class="stat"><div class="n">${report.anomalies.length}</div><div class="l">Anomalie temperatura</div></div>
</div>
<h2>Per attività</h2>
<table><thead><tr><th>Attività</th><th class="r">Dovuti</th><th class="r">In tempo</th><th class="r">In ritardo</th><th class="r">Mancati</th><th class="r">Annullati</th></tr></thead><tbody>
${report.byTask.map((r) => `<tr><td>${esc(r.name)}</td><td class="r">${r.due}</td><td class="r">${r.onTime}</td><td class="r">${r.late}</td><td class="r${r.missed ? " warn" : ""}">${r.missed}</td><td class="r">${r.cancelled}</td></tr>`).join("")}
</tbody></table>
<h2>Per operatore</h2>
<table><thead><tr><th>Operatore</th><th class="r">In tempo</th><th class="r">In ritardo</th></tr></thead><tbody>
${report.byOperator.map((o) => `<tr><td>${esc(o.name)}</td><td class="r">${o.onTime}</td><td class="r">${o.late}</td></tr>`).join("")}
</tbody></table>
<h2>Anomalie temperatura</h2>
${report.anomalies.length === 0 ? "<p class=\"sub\">Nessuna anomalia nel mese.</p>" : `<table><thead><tr><th>Data</th><th>Attrezzatura</th><th class="r">Rilevata</th><th class="r">Massimo</th><th>Operatore</th></tr></thead><tbody>
${report.anomalies.map((a) => `<tr><td>${format(new Date(a.recorded_at), "dd/MM/yyyy HH:mm")}</td><td>${esc(a.equipment_name)}</td><td class="r warn">${a.temperature_value} °C</td><td class="r">${a.max} °C</td><td>${esc(a.recorded_by_name ?? "—")}</td></tr>`).join("")}
</tbody></table>`}
</body></html>`;
    const w = window.open("", "_blank");
    if (w) {
      w.document.write(html);
      w.document.close();
      w.print();
    }
  };

  if (restaurantLoading) {
    return (
      <RestaurantAdminLayout>
        <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
      </RestaurantAdminLayout>
    );
  }

  const t = report.totals;
  const statCards = [
    { label: "Conformità", value: t.compliance === null ? "—" : `${t.compliance}%`, icon: Percent, color: "text-primary" },
    { label: "In tempo", value: t.onTime, icon: CheckCircle2, color: "text-emerald-600" },
    { label: "Registrati in ritardo", value: t.late, icon: Clock, color: "text-amber-600" },
    { label: "Mancati", value: t.missed, icon: XCircle, color: "text-red-600" },
    { label: "Annullati", value: t.cancelled, icon: Ban, color: "text-muted-foreground" },
    { label: "Anomalie temperatura", value: report.anomalies.length, icon: Thermometer, color: "text-red-600" },
  ];

  return (
    <RestaurantAdminLayout>
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-bold text-foreground">Report HACCP</h1>
        <div className="ml-auto flex items-center gap-2">
          <Input
            type="month"
            value={month}
            max={format(new Date(), "yyyy-MM")}
            onChange={(e) => e.target.value && setMonth(e.target.value)}
            className="w-44"
            aria-label="Mese del report"
          />
          <Button variant="outline" onClick={printReport} disabled={loading}>
            <Printer className="mr-2 h-4 w-4" /> Stampa / PDF
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
      ) : (
        <>
          <p className="mb-4 text-sm text-muted-foreground first-letter:uppercase">
            {monthLabel}: controlli dovuti {t.due}. Il controllo di oggi non ancora registrato non conta come mancato.
          </p>
          <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {statCards.map(({ label, value, icon: Icon, color }) => (
              <Card key={label} className="border-border/50">
                <CardContent className="flex items-center gap-4 p-5">
                  <div className={`flex h-12 w-12 items-center justify-center rounded-xl bg-muted ${color}`}>
                    <Icon className="h-6 w-6" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-foreground">{value}</p>
                    <p className="text-sm text-muted-foreground">{label}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <Card className="mb-6 overflow-auto">
            <CardHeader className="pb-2"><CardTitle className="text-base">Per attività</CardTitle></CardHeader>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Attività</TableHead>
                  <TableHead className="text-right">Dovuti</TableHead>
                  <TableHead className="text-right">In tempo</TableHead>
                  <TableHead className="text-right">In ritardo</TableHead>
                  <TableHead className="text-right">Mancati</TableHead>
                  <TableHead className="text-right">Annullati</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {report.byTask.map((r) => (
                  <TableRow key={r.taskId}>
                    <TableCell className="text-sm font-medium">{r.name}</TableCell>
                    <TableCell className="text-right text-sm">{r.due}</TableCell>
                    <TableCell className="text-right text-sm">{r.onTime}</TableCell>
                    <TableCell className="text-right text-sm">{r.late}</TableCell>
                    <TableCell className={`text-right text-sm ${r.missed ? "font-semibold text-red-600" : ""}`}>{r.missed}</TableCell>
                    <TableCell className="text-right text-sm">{r.cancelled}</TableCell>
                  </TableRow>
                ))}
                {report.byTask.length === 0 && (
                  <TableRow><TableCell colSpan={6} className="py-8 text-center text-muted-foreground">Nessun controllo nel mese</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </Card>

          <div className="grid gap-6 lg:grid-cols-2">
            <Card className="overflow-auto">
              <CardHeader className="pb-2"><CardTitle className="text-base">Per operatore</CardTitle></CardHeader>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Operatore</TableHead>
                    <TableHead className="text-right">In tempo</TableHead>
                    <TableHead className="text-right">In ritardo</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {report.byOperator.map((o) => (
                    <TableRow key={o.name}>
                      <TableCell className="text-sm">{o.name}</TableCell>
                      <TableCell className="text-right text-sm">{o.onTime}</TableCell>
                      <TableCell className="text-right text-sm">{o.late}</TableCell>
                    </TableRow>
                  ))}
                  {report.byOperator.length === 0 && (
                    <TableRow><TableCell colSpan={3} className="py-8 text-center text-muted-foreground">Nessuna registrazione</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </Card>

            <Card className="overflow-auto">
              <CardHeader className="pb-2"><CardTitle className="text-base">Anomalie temperatura</CardTitle></CardHeader>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Attrezzatura</TableHead>
                    <TableHead className="text-right">Rilevata</TableHead>
                    <TableHead className="text-right">Max</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {report.anomalies.map((a, i) => (
                    <TableRow key={`${a.recorded_at}-${i}`}>
                      <TableCell className="whitespace-nowrap text-sm">{format(new Date(a.recorded_at), "dd/MM HH:mm")}</TableCell>
                      <TableCell className="text-sm">{a.equipment_name}</TableCell>
                      <TableCell className="text-right text-sm font-semibold text-red-600">{a.temperature_value} °C</TableCell>
                      <TableCell className="text-right text-sm">{a.max} °C</TableCell>
                    </TableRow>
                  ))}
                  {report.anomalies.length === 0 && (
                    <TableRow><TableCell colSpan={4} className="py-8 text-center text-muted-foreground">Nessuna anomalia nel mese</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </Card>
          </div>
        </>
      )}
    </RestaurantAdminLayout>
  );
};

export default RestaurantAdminReportsPage;
