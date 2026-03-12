import { useState, useEffect, useMemo } from "react";
import RestaurantAdminLayout from "@/components/RestaurantAdminLayout";
import { useRestaurant } from "@/hooks/useRestaurant";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
  Loader2, Search, FileText, FileSpreadsheet, ShieldCheck,
  ClipboardCheck, CheckCircle2, AlertTriangle, Clock, XCircle,
  Calendar, Filter, Download, Eye, Ban, Camera, Thermometer, Image,
} from "lucide-react";
import { format, subDays, startOfMonth, endOfMonth } from "date-fns";
import { it } from "date-fns/locale";

interface LogRow {
  id: string;
  task_id: string;
  task_name: string;
  area: string;
  frequency: string;
  log_date: string;
  status: string;
  notes: string | null;
  completed_at: string;
  completed_by: string;
  completed_by_name: string;
  cancelled_reason: string | null;
  is_rectification: boolean;
  has_photos: boolean;
  temperature: number | null;
  temperature_anomaly: boolean;
}

const STATUS_MAP: Record<string, { label: string; icon: typeof CheckCircle2; cls: string }> = {
  completata: { label: "Completata", icon: CheckCircle2, cls: "bg-emerald-500/10 text-emerald-700 border-emerald-200" },
  da_fare: { label: "Da fare", icon: Clock, cls: "bg-blue-500/10 text-blue-700 border-blue-200" },
  non_controllata: { label: "Non controllata", cls: "bg-muted text-muted-foreground", icon: XCircle },
  in_ritardo: { label: "In ritardo", icon: AlertTriangle, cls: "bg-amber-500/10 text-amber-700 border-amber-200" },
  annullata: { label: "Annullata", icon: Ban, cls: "bg-red-500/10 text-red-700 border-red-200" },
};

const RestaurantHaccpControlPage = () => {
  const { restaurant } = useRestaurant();
  const { user } = useAuth();
  const [logs, setLogs] = useState<LogRow[]>([]);
  const [tasks, setTasks] = useState<{ id: string; name: string; category: string; frequency: string }[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState("");
  const [dateRange, setDateRange] = useState<"today" | "week" | "month" | "custom">("week");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [filterTask, setFilterTask] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterOperator, setFilterOperator] = useState("all");

  // Cancel dialog
  const [cancelDialog, setCancelDialog] = useState<{ log: LogRow } | null>(null);
  const [cancelReason, setCancelReason] = useState("");
  const [cancelling, setCancelling] = useState(false);

  // Stats
  const [monthStats, setMonthStats] = useState({ total: 0, completed: 0, pending: 0, overdue: 0, cancelled: 0 });

  const fetchData = async () => {
    if (!restaurant) return;
    setLoading(true);

    let from: string | undefined;
    let to: string | undefined;
    const now = new Date();

    if (dateRange === "today") {
      from = to = format(now, "yyyy-MM-dd");
    } else if (dateRange === "week") {
      from = format(subDays(now, 7), "yyyy-MM-dd");
    } else if (dateRange === "month") {
      from = format(startOfMonth(now), "yyyy-MM-dd");
      to = format(endOfMonth(now), "yyyy-MM-dd");
    } else if (dateRange === "custom" && dateFrom) {
      from = dateFrom;
      to = dateTo || undefined;
    }

    const [tasksRes, logsRes, profilesRes, photosRes, tempsRes] = await Promise.all([
      supabase.from("haccp_tasks").select("id, name, category, frequency").eq("restaurant_id", restaurant.id),
      (() => {
        let q = supabase.from("haccp_logs").select("*").eq("restaurant_id", restaurant.id).order("completed_at", { ascending: false }).limit(500);
        if (from) q = q.gte("log_date", from);
        if (to) q = q.lte("log_date", to);
        return q;
      })(),
      supabase.from("profiles").select("id, full_name, email"),
      supabase.from("haccp_task_photos").select("task_log_id").eq("restaurant_id", restaurant.id),
      supabase.from("haccp_temperature_logs").select("task_log_id, temperature_value, equipment_type").eq("restaurant_id", restaurant.id),
    ]);

    const taskMap: Record<string, { name: string; category: string; frequency: string }> = {};
    (tasksRes.data ?? []).forEach((t: any) => { taskMap[t.id] = { name: t.name, category: t.category, frequency: t.frequency }; });
    setTasks((tasksRes.data ?? []) as any);

    const profileMap: Record<string, string> = {};
    (profilesRes.data ?? []).forEach((p: any) => { profileMap[p.id] = p.full_name || p.email; });

    // Photo and temp lookups
    const photoLogIds = new Set((photosRes.data ?? []).map((p: any) => p.task_log_id));
    const tempMap = new Map<string, { value: number; type: string }>();
    (tempsRes.data ?? []).forEach((t: any) => {
      tempMap.set(t.task_log_id, { value: t.temperature_value, type: t.equipment_type });
    });

    const THRESHOLDS: Record<string, number> = { fridge: 4, cold_room: 4, freezer: -18 };

    const mapped: LogRow[] = (logsRes.data ?? []).map((l: any) => {
      const temp = tempMap.get(l.id);
      const threshold = temp ? THRESHOLDS[temp.type] : undefined;
      return {
        id: l.id,
        task_id: l.task_id,
        task_name: l.task_name || taskMap[l.task_id]?.name || "—",
        area: l.area || taskMap[l.task_id]?.category || "—",
        frequency: l.frequency || taskMap[l.task_id]?.frequency || "—",
        log_date: l.log_date,
        status: l.status,
        notes: l.notes,
        completed_at: l.completed_at,
        completed_by: l.completed_by,
        completed_by_name: l.completed_by_name || profileMap[l.completed_by] || "—",
        cancelled_reason: l.cancelled_reason,
        is_rectification: l.is_rectification || false,
        has_photos: photoLogIds.has(l.id),
        temperature: temp?.value ?? null,
        temperature_anomaly: temp && threshold !== undefined ? temp.value > threshold : false,
      };
    });

    setLogs(mapped);

    // Month stats
    const monthStart = format(startOfMonth(now), "yyyy-MM-dd");
    const monthEnd = format(endOfMonth(now), "yyyy-MM-dd");
    const monthLogs = mapped.filter(l => l.log_date >= monthStart && l.log_date <= monthEnd);
    setMonthStats({
      total: monthLogs.length,
      completed: monthLogs.filter(l => l.status === "completata").length,
      pending: monthLogs.filter(l => l.status === "da_fare").length,
      overdue: monthLogs.filter(l => l.status === "in_ritardo").length,
      cancelled: monthLogs.filter(l => l.status === "annullata").length,
    });

    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [restaurant, dateRange, dateFrom, dateTo]);

  // Unique operators
  const operators = useMemo(() => {
    const map = new Map<string, string>();
    logs.forEach(l => { if (l.completed_by) map.set(l.completed_by, l.completed_by_name); });
    return Array.from(map, ([id, name]) => ({ id, name }));
  }, [logs]);

  const filtered = useMemo(() => logs.filter(l => {
    if (filterTask !== "all" && l.task_id !== filterTask) return false;
    if (filterStatus !== "all" && l.status !== filterStatus) return false;
    if (filterOperator !== "all" && l.completed_by !== filterOperator) return false;
    if (search) {
      const s = search.toLowerCase();
      if (!l.task_name.toLowerCase().includes(s) && !l.completed_by_name.toLowerCase().includes(s) && !l.area.toLowerCase().includes(s)) return false;
    }
    return true;
  }), [logs, filterTask, filterStatus, filterOperator, search]);

  // Cancel (annul) a log
  const handleCancel = async () => {
    if (!cancelDialog || !cancelReason.trim() || !user) return;
    setCancelling(true);
    const log = cancelDialog.log;

    // Update status
    const { error } = await supabase.from("haccp_logs").update({
      status: "annullata",
      cancelled_reason: cancelReason.trim(),
    }).eq("id", log.id);

    if (!error) {
      // Write audit log
      await supabase.from("haccp_audit_log" as any).insert({
        record_id: log.id,
        action: "annullata",
        changed_by: user.id,
        previous_value: { status: log.status },
        new_value: { status: "annullata", cancelled_reason: cancelReason.trim() },
        reason: cancelReason.trim(),
      });
      toast.success("Controllo annullato con tracciatura");
      setCancelDialog(null);
      setCancelReason("");
      fetchData();
    } else {
      toast.error("Errore durante l'annullamento");
    }
    setCancelling(false);
  };

  // Export functions
  const exportCSV = () => {
    const headers = ["Data", "Attività", "Area", "Stato", "Temperatura", "Foto", "Operatore", "Ora", "Note", "Motivo annullamento"];
    const rows = filtered.map(l => [
      format(new Date(l.log_date), "dd/MM/yyyy"),
      l.task_name, l.area,
      STATUS_MAP[l.status]?.label || l.status,
      l.temperature !== null ? `${l.temperature}°C${l.temperature_anomaly ? " ANOMALA" : ""}` : "",
      l.has_photos ? "Sì" : "",
      l.completed_by_name,
      format(new Date(l.completed_at), "HH:mm"),
      l.notes || "", l.cancelled_reason || "",
    ]);
    const csv = [headers.join(";"), ...rows.map(r => r.join(";"))].join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `registro-haccp-${format(new Date(), "yyyy-MM-dd")}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  const exportPDF = () => {
    const html = `<html><head><title>Registro HACCP</title>
<style>
body{font-family:'Segoe UI',sans-serif;padding:24px;color:#1a1a1a}
h1{font-size:20px;margin-bottom:4px}
h2{font-size:13px;color:#666;margin-bottom:16px;font-weight:normal}
.badge{display:inline-block;padding:2px 8px;border-radius:4px;font-size:10px;font-weight:600}
.completata{background:#dcfce7;color:#166534}
.in_ritardo{background:#fef3c7;color:#92400e}
.non_controllata{background:#f3f4f6;color:#6b7280}
.annullata{background:#fee2e2;color:#991b1b}
.da_fare{background:#dbeafe;color:#1e40af}
table{width:100%;border-collapse:collapse;margin-top:8px;font-size:11px}
th{background:#f8f9fa;font-weight:600;text-align:left;padding:8px;border-bottom:2px solid #e5e7eb}
td{padding:6px 8px;border-bottom:1px solid #f0f0f0}
tr:nth-child(even){background:#fafafa}
.footer{margin-top:24px;font-size:10px;color:#999;border-top:1px solid #eee;padding-top:8px}
</style></head><body>
<h1>📋 Registro Controlli HACCP</h1>
<h2>${restaurant?.name ?? ""} — Generato il ${format(new Date(), "dd/MM/yyyy 'alle' HH:mm", { locale: it })}</h2>
<table><thead><tr><th>Data</th><th>Attività</th><th>Area</th><th>Freq.</th><th>Stato</th><th>Operatore</th><th>Ora</th><th>Note</th></tr></thead>
<tbody>${filtered.map(l => `<tr>
<td>${format(new Date(l.log_date), "dd/MM/yyyy")}</td>
<td><strong>${l.task_name}</strong></td>
<td>${l.area}</td>
<td>${l.frequency}</td>
<td><span class="badge ${l.status}">${STATUS_MAP[l.status]?.label || l.status}</span>${l.cancelled_reason ? `<br/><small>Motivo: ${l.cancelled_reason}</small>` : ""}</td>
<td>${l.completed_by_name}</td>
<td>${format(new Date(l.completed_at), "HH:mm")}</td>
<td>${l.notes || "—"}</td>
</tr>`).join("")}</tbody></table>
<div class="footer">
Documento generato automaticamente da Cibarius · ${filtered.length} registrazioni · Non modificabile
</div></body></html>`;
    const w = window.open("", "_blank");
    if (w) { w.document.write(html); w.document.close(); setTimeout(() => w.print(), 300); }
  };

  const exportMonthlyReport = () => {
    const now = new Date();
    const monthStart = format(startOfMonth(now), "yyyy-MM-dd");
    const monthEnd = format(endOfMonth(now), "yyyy-MM-dd");
    const monthLogs = logs.filter(l => l.log_date >= monthStart && l.log_date <= monthEnd);

    const html = `<html><head><title>Report Mensile HACCP</title>
<style>
body{font-family:'Segoe UI',sans-serif;padding:24px;color:#1a1a1a}
h1{font-size:20px;margin-bottom:4px}
h2{font-size:13px;color:#666;margin-bottom:16px;font-weight:normal}
.summary{display:flex;gap:16px;margin-bottom:20px}
.stat{background:#f8f9fa;border-radius:8px;padding:12px 16px;text-align:center;flex:1}
.stat-num{font-size:24px;font-weight:700}
.stat-label{font-size:10px;color:#666;text-transform:uppercase}
.badge{display:inline-block;padding:2px 8px;border-radius:4px;font-size:10px;font-weight:600}
.completata{background:#dcfce7;color:#166534}
.in_ritardo{background:#fef3c7;color:#92400e}
.non_controllata{background:#f3f4f6;color:#6b7280}
.annullata{background:#fee2e2;color:#991b1b}
table{width:100%;border-collapse:collapse;margin-top:8px;font-size:11px}
th{background:#f8f9fa;font-weight:600;text-align:left;padding:8px;border-bottom:2px solid #e5e7eb}
td{padding:6px 8px;border-bottom:1px solid #f0f0f0}
.footer{margin-top:24px;font-size:10px;color:#999;border-top:1px solid #eee;padding-top:8px}
</style></head><body>
<h1>📋 Report Mensile HACCP — ${format(now, "MMMM yyyy", { locale: it })}</h1>
<h2>${restaurant?.name ?? ""}</h2>
<div class="summary">
<div class="stat"><div class="stat-num">${monthLogs.length}</div><div class="stat-label">Totale</div></div>
<div class="stat"><div class="stat-num" style="color:#166534">${monthLogs.filter(l => l.status === "completata").length}</div><div class="stat-label">Completati</div></div>
<div class="stat"><div class="stat-num" style="color:#92400e">${monthLogs.filter(l => l.status === "in_ritardo").length}</div><div class="stat-label">In ritardo</div></div>
<div class="stat"><div class="stat-num" style="color:#991b1b">${monthLogs.filter(l => l.status === "annullata").length}</div><div class="stat-label">Annullati</div></div>
</div>
<table><thead><tr><th>Data</th><th>Attività</th><th>Area</th><th>Stato</th><th>Operatore</th><th>Ora</th><th>Note</th></tr></thead>
<tbody>${monthLogs.map(l => `<tr>
<td>${format(new Date(l.log_date), "dd/MM/yyyy")}</td>
<td><strong>${l.task_name}</strong></td>
<td>${l.area}</td>
<td><span class="badge ${l.status}">${STATUS_MAP[l.status]?.label || l.status}</span></td>
<td>${l.completed_by_name}</td>
<td>${format(new Date(l.completed_at), "HH:mm")}</td>
<td>${l.notes || "—"}</td>
</tr>`).join("")}</tbody></table>
<div class="footer">Report generato da Cibarius il ${format(now, "dd/MM/yyyy HH:mm")} · Documento ufficiale HACCP</div>
</body></html>`;
    const w = window.open("", "_blank");
    if (w) { w.document.write(html); w.document.close(); setTimeout(() => w.print(), 300); }
  };

  const freqLabel: Record<string, string> = { giornaliera: "Giornaliera", settimanale: "Settimanale", mensile: "Mensile" };

  return (
    <RestaurantAdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <ShieldCheck className="h-6 w-6 text-primary" />
              Modalità Controllo HACCP
            </h1>
            <p className="text-sm text-muted-foreground mt-1">Registro verificabile pronto per ispezioni</p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Button variant="outline" size="sm" onClick={exportPDF} className="gap-1.5">
              <FileText className="h-4 w-4" /> PDF
            </Button>
            <Button variant="outline" size="sm" onClick={exportCSV} className="gap-1.5">
              <FileSpreadsheet className="h-4 w-4" /> Excel
            </Button>
            <Button size="sm" onClick={exportMonthlyReport} className="gap-1.5">
              <Download className="h-4 w-4" /> Report Mensile
            </Button>
          </div>
        </div>

        {/* Stats cards */}
        <div className="grid gap-3 grid-cols-2 sm:grid-cols-5">
          {[
            { label: "Totale mese", value: monthStats.total, icon: ClipboardCheck, color: "text-primary" },
            { label: "Completati", value: monthStats.completed, icon: CheckCircle2, color: "text-emerald-600" },
            { label: "Da completare", value: monthStats.pending, icon: Clock, color: "text-blue-600" },
            { label: "In ritardo", value: monthStats.overdue, icon: AlertTriangle, color: "text-amber-600" },
            { label: "Annullati", value: monthStats.cancelled, icon: XCircle, color: "text-red-600" },
          ].map(({ label, value, icon: Icon, color }) => (
            <Card key={label} className="border-border/50">
              <CardContent className="flex items-center gap-3 p-4">
                <Icon className={`h-5 w-5 ${color} shrink-0`} />
                <div>
                  <p className="text-xl font-bold text-foreground">{loading ? "—" : value}</p>
                  <p className="text-xs text-muted-foreground">{label}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium text-foreground">Filtri</span>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              <div className="relative flex-1 min-w-[180px]">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input placeholder="Cerca attività, operatore..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
              </div>
              <Select value={dateRange} onValueChange={(v: any) => setDateRange(v)}>
                <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="today">Oggi</SelectItem>
                  <SelectItem value="week">Ultimi 7 giorni</SelectItem>
                  <SelectItem value="month">Mese corrente</SelectItem>
                  <SelectItem value="custom">Personalizzato</SelectItem>
                </SelectContent>
              </Select>
              {dateRange === "custom" && (
                <>
                  <Input type="date" className="w-40" value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
                  <Input type="date" className="w-40" value={dateTo} onChange={e => setDateTo(e.target.value)} />
                </>
              )}
              <Select value={filterTask} onValueChange={setFilterTask}>
                <SelectTrigger className="w-44"><SelectValue placeholder="Attività" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tutte le attività</SelectItem>
                  {tasks.map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-40"><SelectValue placeholder="Stato" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tutti gli stati</SelectItem>
                  {Object.entries(STATUS_MAP).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={filterOperator} onValueChange={setFilterOperator}>
                <SelectTrigger className="w-44"><SelectValue placeholder="Operatore" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tutti gli operatori</SelectItem>
                  {operators.map(o => <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Registry table */}
        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
        ) : filtered.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              <ShieldCheck className="h-10 w-10 mx-auto mb-3 text-muted-foreground/40" />
              <p className="font-medium">Nessun controllo trovato</p>
              <p className="text-sm">Prova a modificare i filtri</p>
            </CardContent>
          </Card>
        ) : (
          <div className="rounded-xl border border-border bg-card overflow-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30">
                  <TableHead className="font-semibold">Data</TableHead>
                  <TableHead className="font-semibold">Attività</TableHead>
                  <TableHead className="font-semibold">Area</TableHead>
                  <TableHead className="font-semibold">Stato</TableHead>
                  <TableHead className="font-semibold">Temp.</TableHead>
                  <TableHead className="font-semibold">Foto</TableHead>
                  <TableHead className="font-semibold">Operatore</TableHead>
                  <TableHead className="font-semibold">Ora</TableHead>
                  <TableHead className="font-semibold">Note</TableHead>
                  <TableHead className="font-semibold w-[80px]">Azioni</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map(l => {
                  const st = STATUS_MAP[l.status] || STATUS_MAP.completata;
                  return (
                    <TableRow key={l.id} className={l.temperature_anomaly ? "bg-destructive/5" : l.is_rectification ? "bg-yellow-50/50" : ""}>
                      <TableCell className="text-sm whitespace-nowrap font-medium">
                        {format(new Date(l.log_date), "dd/MM/yyyy")}
                      </TableCell>
                      <TableCell className="text-sm font-medium">
                        {l.task_name}
                        {l.is_rectification && (
                          <Badge variant="outline" className="ml-1 text-[9px] border-yellow-300 text-yellow-700">Rettifica</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{l.area}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={st.cls}>
                          {st.label}
                        </Badge>
                        {l.cancelled_reason && (
                          <p className="text-[10px] text-destructive mt-0.5">Motivo: {l.cancelled_reason}</p>
                        )}
                      </TableCell>
                      <TableCell className="text-sm">
                        {l.temperature !== null ? (
                          <span className={`font-bold ${l.temperature_anomaly ? "text-destructive" : "text-emerald-600"}`}>
                            {l.temperature}°C
                            {l.temperature_anomaly && <AlertTriangle className="inline h-3 w-3 ml-1" />}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {l.has_photos ? (
                          <Camera className="h-4 w-4 text-primary" />
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-sm">{l.completed_by_name}</TableCell>
                      <TableCell className="text-sm whitespace-nowrap">
                        {format(new Date(l.completed_at), "HH:mm")}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground max-w-[180px] truncate">
                        {l.notes || "—"}
                      </TableCell>
                      <TableCell>
                        {l.status === "completata" && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0 text-muted-foreground hover:text-red-600"
                            onClick={() => { setCancelDialog({ log: l }); setCancelReason(""); }}
                            title="Annulla con motivazione"
                          >
                            <Ban className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}

        <p className="text-xs text-muted-foreground">
          {filtered.length} registrazioni · I record completati non sono modificabili. È possibile solo annullarli con motivazione tracciata.
        </p>
      </div>

      {/* Cancel dialog */}
      <Dialog open={!!cancelDialog} onOpenChange={v => { if (!v) setCancelDialog(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Annulla controllo HACCP</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Stai annullando: <strong>{cancelDialog?.log.task_name}</strong> del {cancelDialog && format(new Date(cancelDialog.log.log_date), "dd/MM/yyyy")}.
          </p>
          <p className="text-sm text-muted-foreground">
            Questa azione verrà registrata nell'audit log e non potrà essere annullata.
          </p>
          <Textarea
            placeholder="Motivo dell'annullamento (obbligatorio)..."
            value={cancelReason}
            onChange={e => setCancelReason(e.target.value)}
            className="min-h-[80px]"
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setCancelDialog(null)}>Indietro</Button>
            <Button
              variant="destructive"
              disabled={!cancelReason.trim() || cancelling}
              onClick={handleCancel}
            >
              {cancelling ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
              Conferma annullamento
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </RestaurantAdminLayout>
  );
};

export default RestaurantHaccpControlPage;
