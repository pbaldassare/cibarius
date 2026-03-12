import { useState, useEffect } from "react";
import { useRestaurant } from "@/hooks/useRestaurant";
import { supabase } from "@/integrations/supabase/client";
import MobileHeader from "@/components/MobileHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, Download, FileSpreadsheet, FileText, Search } from "lucide-react";
import { format, subDays } from "date-fns";
import { it } from "date-fns/locale";

interface LogRow {
  id: string;
  task_name: string;
  log_date: string;
  status: string;
  notes: string | null;
  completed_at: string;
  completed_by_name: string;
}

const STATUS_LABELS: Record<string, string> = {
  completata: "Completata",
  non_controllata: "Non controllata",
  in_ritardo: "In ritardo",
};

const STATUS_COLORS: Record<string, string> = {
  completata: "bg-emerald-500/10 text-emerald-700 border-emerald-200",
  non_controllata: "bg-muted text-muted-foreground",
  in_ritardo: "bg-amber-500/10 text-amber-700 border-amber-200",
};

const RestaurantHaccpHistoryPage = () => {
  const { restaurant } = useRestaurant();
  const [logs, setLogs] = useState<LogRow[]>([]);
  const [tasks, setTasks] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterTask, setFilterTask] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [search, setSearch] = useState("");
  const [dateRange, setDateRange] = useState<"week" | "month" | "all">("week");

  useEffect(() => {
    if (!restaurant) return;
    const fetch = async () => {
      setLoading(true);
      let dateFrom: string | undefined;
      if (dateRange === "week") dateFrom = format(subDays(new Date(), 7), "yyyy-MM-dd");
      else if (dateRange === "month") dateFrom = format(subDays(new Date(), 30), "yyyy-MM-dd");

      const [tasksRes, logsRes, profilesRes] = await Promise.all([
        supabase.from("haccp_tasks").select("id, name").eq("restaurant_id", restaurant.id),
        (() => {
          let q = supabase.from("haccp_logs").select("*").eq("restaurant_id", restaurant.id).order("completed_at", { ascending: false });
          if (dateFrom) q = q.gte("log_date", dateFrom);
          return q;
        })(),
        supabase.from("profiles").select("id, full_name, email"),
      ]);

      const taskMap: Record<string, string> = {};
      (tasksRes.data ?? []).forEach((t: any) => { taskMap[t.id] = t.name; });
      setTasks((tasksRes.data ?? []) as any);

      const profileMap: Record<string, string> = {};
      (profilesRes.data ?? []).forEach((p: any) => { profileMap[p.id] = p.full_name || p.email; });

      const mapped: LogRow[] = (logsRes.data ?? []).map((l: any) => ({
        id: l.id,
        task_name: taskMap[l.task_id] || "—",
        log_date: l.log_date,
        status: l.status,
        notes: l.notes,
        completed_at: l.completed_at,
        completed_by_name: profileMap[l.completed_by] || "—",
      }));

      setLogs(mapped);
      setLoading(false);
    };
    fetch();
  }, [restaurant, dateRange]);

  const filtered = logs.filter(l => {
    if (filterTask !== "all" && l.task_name !== filterTask) return false;
    if (filterStatus !== "all" && l.status !== filterStatus) return false;
    if (search && !l.task_name.toLowerCase().includes(search.toLowerCase()) &&
      !l.completed_by_name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const exportCSV = () => {
    const headers = ["Data", "Attività", "Stato", "Operatore", "Ora", "Note"];
    const rows = filtered.map(l => [
      format(new Date(l.log_date), "dd/MM/yyyy"),
      l.task_name,
      STATUS_LABELS[l.status] || l.status,
      l.completed_by_name,
      format(new Date(l.completed_at), "HH:mm"),
      l.notes || "",
    ]);
    const csv = [headers.join(";"), ...rows.map(r => r.join(";"))].join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `haccp-storico-${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportPDF = () => {
    const printContent = `
      <html><head><title>Storico HACCP</title>
      <style>body{font-family:sans-serif;padding:20px}table{width:100%;border-collapse:collapse;margin-top:16px}
      th,td{border:1px solid #ddd;padding:8px;text-align:left;font-size:12px}th{background:#f5f5f5;font-weight:600}
      h1{font-size:18px}h2{font-size:14px;color:#666}</style></head><body>
      <h1>Storico Controlli HACCP</h1>
      <h2>${restaurant?.name ?? ""} — Generato il ${format(new Date(), "dd/MM/yyyy HH:mm")}</h2>
      <table><thead><tr><th>Data</th><th>Attività</th><th>Stato</th><th>Operatore</th><th>Ora</th><th>Note</th></tr></thead>
      <tbody>${filtered.map(l => `<tr>
        <td>${format(new Date(l.log_date), "dd/MM/yyyy")}</td>
        <td>${l.task_name}</td>
        <td>${STATUS_LABELS[l.status] || l.status}</td>
        <td>${l.completed_by_name}</td>
        <td>${format(new Date(l.completed_at), "HH:mm")}</td>
        <td>${l.notes || ""}</td>
      </tr>`).join("")}</tbody></table></body></html>`;
    const w = window.open("", "_blank");
    if (w) {
      w.document.write(printContent);
      w.document.close();
      w.print();
    }
  };

  return (
    <div className="space-y-4 p-4">
      <MobileHeader title="Storico HACCP" backTo="/restaurant/haccp" />

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Cerca..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <Select value={dateRange} onValueChange={(v: any) => setDateRange(v)}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="week">Ultima settimana</SelectItem>
            <SelectItem value="month">Ultimo mese</SelectItem>
            <SelectItem value="all">Tutto</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterTask} onValueChange={setFilterTask}>
          <SelectTrigger className="w-44"><SelectValue placeholder="Attività" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tutte le attività</SelectItem>
            {tasks.map(t => <SelectItem key={t.id} value={t.name}>{t.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-40"><SelectValue placeholder="Stato" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tutti gli stati</SelectItem>
            <SelectItem value="completata">Completata</SelectItem>
            <SelectItem value="non_controllata">Non controllata</SelectItem>
            <SelectItem value="in_ritardo">In ritardo</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Export buttons */}
      <div className="flex gap-2">
        <Button variant="outline" size="sm" onClick={exportPDF} className="gap-1.5">
          <FileText className="h-4 w-4" /> PDF
        </Button>
        <Button variant="outline" size="sm" onClick={exportCSV} className="gap-1.5">
          <FileSpreadsheet className="h-4 w-4" /> Excel/CSV
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            Nessun controllo trovato per i filtri selezionati
          </CardContent>
        </Card>
      ) : (
        <div className="rounded-xl border border-border bg-card overflow-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Attività</TableHead>
                <TableHead>Stato</TableHead>
                <TableHead>Operatore</TableHead>
                <TableHead>Ora</TableHead>
                <TableHead>Note</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map(l => (
                <TableRow key={l.id}>
                  <TableCell className="text-sm whitespace-nowrap">
                    {format(new Date(l.log_date), "dd/MM/yyyy")}
                  </TableCell>
                  <TableCell className="text-sm font-medium">{l.task_name}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={STATUS_COLORS[l.status]}>
                      {STATUS_LABELS[l.status] || l.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm">{l.completed_by_name}</TableCell>
                  <TableCell className="text-sm whitespace-nowrap">
                    {format(new Date(l.completed_at), "HH:mm")}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">
                    {l.notes || "—"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
      <p className="text-xs text-muted-foreground">{filtered.length} risultati</p>
    </div>
  );
};

export default RestaurantHaccpHistoryPage;
