import { useState, useEffect, useMemo } from "react";
import RestaurantAdminLayout from "@/components/RestaurantAdminLayout";
import { useRestaurant } from "@/hooks/useRestaurant";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Loader2, Thermometer, AlertTriangle, CheckCircle2, Search, Filter,
  FileText, FileSpreadsheet, Download,
} from "lucide-react";
import { format, subDays, startOfMonth, endOfMonth } from "date-fns";
import { it } from "date-fns/locale";

interface TempRow {
  id: string;
  equipment_type: string;
  equipment_name: string;
  temperature_value: number;
  recorded_by_name: string;
  recorded_at: string;
  note: string | null;
  task_log_id: string;
}

const THRESHOLDS: Record<string, number> = {
  fridge: 4,
  cold_room: 4,
  freezer: -18,
};

const EQ_LABELS: Record<string, string> = {
  fridge: "Frigorifero",
  cold_room: "Cella frigorifera",
  freezer: "Freezer",
};

const RestaurantTemperaturesPage = () => {
  const { restaurant } = useRestaurant();
  const [rows, setRows] = useState<TempRow[]>([]);
  const [loading, setLoading] = useState(true);

  const [dateRange, setDateRange] = useState<"today" | "week" | "month" | "custom">("week");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [filterAnomaly, setFilterAnomaly] = useState("all");
  const [search, setSearch] = useState("");

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

    let q = supabase
      .from("haccp_temperature_logs")
      .select("*")
      .eq("restaurant_id", restaurant.id)
      .order("recorded_at", { ascending: false })
      .limit(500);

    if (from) q = q.gte("recorded_at", `${from}T00:00:00`);
    if (to) q = q.lte("recorded_at", `${to}T23:59:59`);

    const { data } = await q;
    setRows((data || []) as TempRow[]);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [restaurant, dateRange, dateFrom, dateTo]);

  const isAnomaly = (row: TempRow) => {
    const threshold = THRESHOLDS[row.equipment_type];
    return threshold !== undefined && row.temperature_value > threshold;
  };

  const filtered = useMemo(() => rows.filter(r => {
    if (filterType !== "all" && r.equipment_type !== filterType) return false;
    if (filterAnomaly === "anomaly" && !isAnomaly(r)) return false;
    if (filterAnomaly === "normal" && isAnomaly(r)) return false;
    if (search) {
      const s = search.toLowerCase();
      if (!r.equipment_name.toLowerCase().includes(s) && !r.recorded_by_name?.toLowerCase().includes(s)) return false;
    }
    return true;
  }), [rows, filterType, filterAnomaly, search]);

  const stats = useMemo(() => ({
    total: rows.length,
    anomalies: rows.filter(isAnomaly).length,
    fridge: rows.filter(r => r.equipment_type === "fridge").length,
    coldRoom: rows.filter(r => r.equipment_type === "cold_room").length,
    freezer: rows.filter(r => r.equipment_type === "freezer").length,
  }), [rows]);

  const exportCSV = () => {
    const headers = ["Data", "Ora", "Attrezzatura", "Tipo", "Temperatura", "Soglia", "Stato", "Operatore", "Note"];
    const csvRows = filtered.map(r => [
      format(new Date(r.recorded_at), "dd/MM/yyyy"),
      format(new Date(r.recorded_at), "HH:mm"),
      r.equipment_name,
      EQ_LABELS[r.equipment_type] || r.equipment_type,
      `${r.temperature_value}°C`,
      `${THRESHOLDS[r.equipment_type] ?? "—"}°C`,
      isAnomaly(r) ? "ANOMALA" : "OK",
      r.recorded_by_name || "—",
      r.note || "",
    ]);
    const csv = [headers.join(";"), ...csvRows.map(r => r.join(";"))].join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `registro-temperature-${format(new Date(), "yyyy-MM-dd")}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  const exportPDF = () => {
    const html = `<html><head><title>Registro Temperature</title>
<style>
body{font-family:'Segoe UI',sans-serif;padding:24px;color:#1a1a1a}
h1{font-size:20px;margin-bottom:4px}
h2{font-size:13px;color:#666;margin-bottom:16px}
table{width:100%;border-collapse:collapse;font-size:11px}
th{background:#f8f9fa;font-weight:600;text-align:left;padding:8px;border-bottom:2px solid #e5e7eb}
td{padding:6px 8px;border-bottom:1px solid #f0f0f0}
.anomaly{color:#dc2626;font-weight:700}
.ok{color:#16a34a}
.footer{margin-top:24px;font-size:10px;color:#999;border-top:1px solid #eee;padding-top:8px}
</style></head><body>
<h1>🌡️ Registro Temperature</h1>
<h2>${restaurant?.name ?? ""} — Generato il ${format(new Date(), "dd/MM/yyyy HH:mm", { locale: it })}</h2>
<table><thead><tr><th>Data</th><th>Ora</th><th>Attrezzatura</th><th>Temp.</th><th>Soglia</th><th>Stato</th><th>Operatore</th><th>Note</th></tr></thead>
<tbody>${filtered.map(r => `<tr>
<td>${format(new Date(r.recorded_at), "dd/MM/yyyy")}</td>
<td>${format(new Date(r.recorded_at), "HH:mm")}</td>
<td>${r.equipment_name}</td>
<td class="${isAnomaly(r) ? "anomaly" : "ok"}">${r.temperature_value}°C</td>
<td>${THRESHOLDS[r.equipment_type] ?? "—"}°C</td>
<td class="${isAnomaly(r) ? "anomaly" : "ok"}">${isAnomaly(r) ? "⚠️ ANOMALA" : "✓ OK"}</td>
<td>${r.recorded_by_name || "—"}</td>
<td>${r.note || "—"}</td>
</tr>`).join("")}</tbody></table>
<div class="footer">Documento generato da Cibarius · ${filtered.length} registrazioni · ${stats.anomalies} anomalie</div></body></html>`;
    const w = window.open("", "_blank");
    if (w) { w.document.write(html); w.document.close(); setTimeout(() => w.print(), 300); }
  };

  return (
    <RestaurantAdminLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <Thermometer className="h-6 w-6 text-sky-500" />
              Registro Temperature
            </h1>
            <p className="text-sm text-muted-foreground mt-1">Storico temperature attrezzature refrigerate</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={exportPDF} className="gap-1.5">
              <FileText className="h-4 w-4" /> PDF
            </Button>
            <Button variant="outline" size="sm" onClick={exportCSV} className="gap-1.5">
              <FileSpreadsheet className="h-4 w-4" /> Excel
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid gap-3 grid-cols-2 sm:grid-cols-5">
          {[
            { label: "Registrazioni", value: stats.total, icon: Thermometer, color: "text-sky-500" },
            { label: "Anomalie", value: stats.anomalies, icon: AlertTriangle, color: "text-destructive" },
            { label: "Frigoriferi", value: stats.fridge, icon: Thermometer, color: "text-primary" },
            { label: "Celle frigo", value: stats.coldRoom, icon: Thermometer, color: "text-primary" },
            { label: "Freezer", value: stats.freezer, icon: Thermometer, color: "text-primary" },
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
                <Input placeholder="Cerca attrezzatura..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
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
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tutte le attrezzature</SelectItem>
                  <SelectItem value="fridge">Frigoriferi</SelectItem>
                  <SelectItem value="cold_room">Celle frigorifere</SelectItem>
                  <SelectItem value="freezer">Freezer</SelectItem>
                </SelectContent>
              </Select>
              <Select value={filterAnomaly} onValueChange={setFilterAnomaly}>
                <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tutti</SelectItem>
                  <SelectItem value="anomaly">Solo anomalie</SelectItem>
                  <SelectItem value="normal">Solo normali</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Table */}
        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
        ) : filtered.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              <Thermometer className="h-10 w-10 mx-auto mb-3 text-muted-foreground/40" />
              <p className="font-medium">Nessuna registrazione temperatura trovata</p>
            </CardContent>
          </Card>
        ) : (
          <div className="rounded-xl border border-border bg-card overflow-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30">
                  <TableHead className="font-semibold">Data</TableHead>
                  <TableHead className="font-semibold">Ora</TableHead>
                  <TableHead className="font-semibold">Attrezzatura</TableHead>
                  <TableHead className="font-semibold">Temp.</TableHead>
                  <TableHead className="font-semibold">Stato</TableHead>
                  <TableHead className="font-semibold">Operatore</TableHead>
                  <TableHead className="font-semibold">Note</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map(r => {
                  const anomaly = isAnomaly(r);
                  return (
                    <TableRow key={r.id} className={anomaly ? "bg-destructive/5" : ""}>
                      <TableCell className="text-sm font-medium whitespace-nowrap">
                        {format(new Date(r.recorded_at), "dd/MM/yyyy")}
                      </TableCell>
                      <TableCell className="text-sm whitespace-nowrap">
                        {format(new Date(r.recorded_at), "HH:mm")}
                      </TableCell>
                      <TableCell className="text-sm">
                        <div>
                          <p className="font-medium text-foreground">{r.equipment_name}</p>
                          <p className="text-[10px] text-muted-foreground">{EQ_LABELS[r.equipment_type] || r.equipment_type}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className={`text-lg font-bold ${anomaly ? "text-destructive" : "text-emerald-600"}`}>
                          {r.temperature_value}°C
                        </span>
                      </TableCell>
                      <TableCell>
                        {anomaly ? (
                          <Badge variant="destructive" className="gap-1">
                            <AlertTriangle className="h-3 w-3" /> Anomala
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="gap-1 bg-emerald-500/10 text-emerald-700 border-emerald-200">
                            <CheckCircle2 className="h-3 w-3" /> OK
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-sm">{r.recorded_by_name || "—"}</TableCell>
                      <TableCell className="text-sm text-muted-foreground max-w-[180px] truncate">
                        {r.note || "—"}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}

        <p className="text-xs text-muted-foreground">
          {filtered.length} registrazioni · Soglie: Frigo/Celle ≤4°C, Freezer ≤-18°C
        </p>
      </div>
    </RestaurantAdminLayout>
  );
};

export default RestaurantTemperaturesPage;
