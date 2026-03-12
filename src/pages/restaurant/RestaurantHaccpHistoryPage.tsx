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
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import {
  Loader2, FileSpreadsheet, FileText, Search, Camera, Thermometer,
  AlertTriangle, User, Clock, CalendarDays, FileWarning, ChevronRight,
  ImageIcon, MessageSquare, RefreshCw,
} from "lucide-react";
import { format, subDays } from "date-fns";
import { it } from "date-fns/locale";

interface LogRow {
  id: string;
  task_id: string;
  task_name: string;
  log_date: string;
  status: string;
  notes: string | null;
  completed_at: string;
  completed_by_name: string;
  completed_by: string;
  temperature: number | null;
  temperature_anomaly: boolean;
  temperature_equipment_name: string | null;
  temperature_equipment_type: string | null;
  temperature_note: string | null;
  has_photos: boolean;
  is_rectification: boolean;
  cancelled_reason: string | null;
  frequency: string | null;
  area: string | null;
}

interface PhotoRow {
  id: string;
  photo_url: string;
  uploaded_by_name: string | null;
  created_at: string;
}

const STATUS_LABELS: Record<string, string> = {
  completata: "Completata",
  non_controllata: "Non controllata",
  in_ritardo: "In ritardo",
  annullata: "Annullata",
};

const STATUS_COLORS: Record<string, string> = {
  completata: "bg-emerald-500/10 text-emerald-700 border-emerald-200",
  non_controllata: "bg-muted text-muted-foreground",
  in_ritardo: "bg-amber-500/10 text-amber-700 border-amber-200",
  annullata: "bg-red-500/10 text-red-700 border-red-200",
};

const THRESHOLDS: Record<string, number> = { fridge: 4, cold_room: 4, freezer: -18 };

const RestaurantHaccpHistoryPage = () => {
  const { restaurant } = useRestaurant();
  const [logs, setLogs] = useState<LogRow[]>([]);
  const [tasks, setTasks] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterTask, setFilterTask] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [search, setSearch] = useState("");
  const [dateRange, setDateRange] = useState<"week" | "month" | "all">("week");

  // Detail sheet
  const [selectedLog, setSelectedLog] = useState<LogRow | null>(null);
  const [detailPhotos, setDetailPhotos] = useState<PhotoRow[]>([]);
  const [loadingDetail, setLoadingDetail] = useState(false);

  useEffect(() => {
    if (!restaurant) return;
    const fetch = async () => {
      setLoading(true);
      let dateFrom: string | undefined;
      if (dateRange === "week") dateFrom = format(subDays(new Date(), 7), "yyyy-MM-dd");
      else if (dateRange === "month") dateFrom = format(subDays(new Date(), 30), "yyyy-MM-dd");

      const [tasksRes, logsRes, photosRes, tempsRes] = await Promise.all([
        supabase.from("haccp_tasks").select("id, name").eq("restaurant_id", restaurant.id),
        (() => {
          let q = supabase.from("haccp_logs").select("*").eq("restaurant_id", restaurant.id).order("completed_at", { ascending: false });
          if (dateFrom) q = q.gte("log_date", dateFrom);
          return q;
        })(),
        supabase.from("haccp_task_photos").select("task_log_id").eq("restaurant_id", restaurant.id),
        supabase.from("haccp_temperature_logs").select("task_log_id, temperature_value, equipment_type, equipment_name, note").eq("restaurant_id", restaurant.id),
      ]);

      const taskMap: Record<string, string> = {};
      (tasksRes.data ?? []).forEach((t: any) => { taskMap[t.id] = t.name; });
      setTasks((tasksRes.data ?? []) as any);

      const photoLogIds = new Set((photosRes.data ?? []).map((p: any) => p.task_log_id));
      const tempMap = new Map<string, { value: number; type: string; name: string; note: string | null }>();
      (tempsRes.data ?? []).forEach((t: any) => {
        tempMap.set(t.task_log_id, { value: t.temperature_value, type: t.equipment_type, name: t.equipment_name, note: t.note });
      });

      const mapped: LogRow[] = (logsRes.data ?? []).map((l: any) => {
        const temp = tempMap.get(l.id);
        const threshold = temp ? THRESHOLDS[temp.type] : undefined;
        return {
          id: l.id,
          task_id: l.task_id,
          task_name: l.task_name || taskMap[l.task_id] || "—",
          log_date: l.log_date,
          status: l.status,
          notes: l.notes,
          completed_at: l.completed_at,
          completed_by_name: l.completed_by_name || "—",
          completed_by: l.completed_by,
          temperature: temp?.value ?? null,
          temperature_anomaly: temp && threshold !== undefined ? temp.value > threshold : false,
          temperature_equipment_name: temp?.name ?? null,
          temperature_equipment_type: temp?.type ?? null,
          temperature_note: temp?.note ?? null,
          has_photos: photoLogIds.has(l.id),
          is_rectification: l.is_rectification ?? false,
          cancelled_reason: l.cancelled_reason ?? null,
          frequency: l.frequency ?? null,
          area: l.area ?? null,
        };
      });

      setLogs(mapped);
      setLoading(false);
    };
    fetch();
  }, [restaurant, dateRange]);

  // Open detail
  const openDetail = async (log: LogRow) => {
    setSelectedLog(log);
    setDetailPhotos([]);
    if (log.has_photos && restaurant) {
      setLoadingDetail(true);
      const { data } = await supabase
        .from("haccp_task_photos")
        .select("id, photo_url, uploaded_by_name, created_at")
        .eq("task_log_id", log.id)
        .eq("restaurant_id", restaurant.id)
        .order("created_at", { ascending: true });
      setDetailPhotos((data ?? []) as PhotoRow[]);
      setLoadingDetail(false);
    }
  };

  const filtered = logs.filter(l => {
    if (filterTask !== "all" && l.task_name !== filterTask) return false;
    if (filterStatus !== "all" && l.status !== filterStatus) return false;
    if (search && !l.task_name.toLowerCase().includes(search.toLowerCase()) &&
      !l.completed_by_name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const exportCSV = () => {
    const headers = ["Data", "Attività", "Stato", "Temperatura", "Foto", "Operatore", "Ora", "Note"];
    const rows = filtered.map(l => [
      format(new Date(l.log_date), "dd/MM/yyyy"),
      l.task_name,
      STATUS_LABELS[l.status] || l.status,
      l.temperature !== null ? `${l.temperature}°C${l.temperature_anomaly ? " ANOMALA" : ""}` : "",
      l.has_photos ? "Sì" : "",
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
      h1{font-size:18px}h2{font-size:14px;color:#666}
      .anomaly{color:#dc2626;font-weight:700}.ok{color:#16a34a}</style></head><body>
      <h1>Storico Controlli HACCP</h1>
      <h2>${restaurant?.name ?? ""} — Generato il ${format(new Date(), "dd/MM/yyyy HH:mm")}</h2>
      <table><thead><tr><th>Data</th><th>Attività</th><th>Stato</th><th>Temp.</th><th>Foto</th><th>Operatore</th><th>Ora</th><th>Note</th></tr></thead>
      <tbody>${filtered.map(l => `<tr>
        <td>${format(new Date(l.log_date), "dd/MM/yyyy")}</td>
        <td>${l.task_name}</td>
        <td>${STATUS_LABELS[l.status] || l.status}</td>
        <td class="${l.temperature_anomaly ? "anomaly" : "ok"}">${l.temperature !== null ? `${l.temperature}°C${l.temperature_anomaly ? " ⚠️" : ""}` : "—"}</td>
        <td>${l.has_photos ? "📷 Sì" : "—"}</td>
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
      <MobileHeader title="Storico HACCP" />

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
            <SelectItem value="annullata">Annullata</SelectItem>
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
                <TableHead>Temp.</TableHead>
                <TableHead>Foto</TableHead>
                <TableHead>Operatore</TableHead>
                <TableHead>Ora</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map(l => (
                <TableRow
                  key={l.id}
                  className={`cursor-pointer hover:bg-accent/50 transition-colors ${l.temperature_anomaly ? "bg-destructive/5" : ""}`}
                  onClick={() => openDetail(l)}
                >
                  <TableCell className="text-sm whitespace-nowrap">
                    {format(new Date(l.log_date), "dd/MM/yyyy")}
                  </TableCell>
                  <TableCell className="text-sm font-medium">
                    {l.task_name}
                    {l.is_rectification && (
                      <RefreshCw className="inline h-3 w-3 ml-1 text-primary" />
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={STATUS_COLORS[l.status]}>
                      {STATUS_LABELS[l.status] || l.status}
                    </Badge>
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
                  <TableCell>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
      <p className="text-xs text-muted-foreground">{filtered.length} risultati</p>

      {/* ═══ DETAIL SHEET ═══ */}
      <Sheet open={!!selectedLog} onOpenChange={(o) => { if (!o) setSelectedLog(null); }}>
        <SheetContent side="bottom" className="rounded-t-[28px] max-h-[85vh] overflow-y-auto">
          {selectedLog && (
            <>
              <SheetHeader className="pb-2">
                <SheetTitle className="text-foreground text-lg">{selectedLog.task_name}</SheetTitle>
              </SheetHeader>

              <div className="space-y-4 pb-6">
                {/* Status badge */}
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className={`text-sm px-3 py-1 ${STATUS_COLORS[selectedLog.status]}`}>
                    {STATUS_LABELS[selectedLog.status] || selectedLog.status}
                  </Badge>
                  {selectedLog.is_rectification && (
                    <Badge variant="outline" className="text-sm px-3 py-1 bg-primary/10 text-primary border-primary/20">
                      <RefreshCw className="h-3 w-3 mr-1" /> Rettifica
                    </Badge>
                  )}
                </div>

                {/* Info grid */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-[14px] bg-secondary/50 p-3">
                    <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground mb-1">
                      <CalendarDays className="h-3 w-3" /> Data controllo
                    </div>
                    <p className="text-[14px] font-semibold text-foreground">
                      {format(new Date(selectedLog.log_date), "dd MMMM yyyy", { locale: it })}
                    </p>
                  </div>
                  <div className="rounded-[14px] bg-secondary/50 p-3">
                    <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground mb-1">
                      <Clock className="h-3 w-3" /> Ora completamento
                    </div>
                    <p className="text-[14px] font-semibold text-foreground">
                      {format(new Date(selectedLog.completed_at), "HH:mm")}
                    </p>
                  </div>
                  <div className="rounded-[14px] bg-secondary/50 p-3">
                    <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground mb-1">
                      <User className="h-3 w-3" /> Operatore
                    </div>
                    <p className="text-[14px] font-semibold text-foreground">
                      {selectedLog.completed_by_name}
                    </p>
                  </div>
                  {selectedLog.frequency && (
                    <div className="rounded-[14px] bg-secondary/50 p-3">
                      <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground mb-1">
                        <RefreshCw className="h-3 w-3" /> Frequenza
                      </div>
                      <p className="text-[14px] font-semibold text-foreground capitalize">
                        {selectedLog.frequency}
                      </p>
                    </div>
                  )}
                  {selectedLog.area && (
                    <div className="rounded-[14px] bg-secondary/50 p-3 col-span-2">
                      <div className="text-[11px] text-muted-foreground mb-1">Area</div>
                      <p className="text-[14px] font-semibold text-foreground">{selectedLog.area}</p>
                    </div>
                  )}
                </div>

                {/* Temperature */}
                {selectedLog.temperature !== null && (
                  <div className={`rounded-[14px] p-4 ${selectedLog.temperature_anomaly ? "bg-destructive/10 border border-destructive/20" : "bg-emerald-500/10 border border-emerald-200"}`}>
                    <div className="flex items-center gap-2 mb-2">
                      <Thermometer className={`h-5 w-5 ${selectedLog.temperature_anomaly ? "text-destructive" : "text-emerald-600"}`} />
                      <span className="text-[13px] font-semibold text-foreground">Temperatura registrata</span>
                    </div>
                    <p className={`text-[28px] font-bold ${selectedLog.temperature_anomaly ? "text-destructive" : "text-emerald-600"}`}>
                      {selectedLog.temperature}°C
                      {selectedLog.temperature_anomaly && (
                        <span className="text-[13px] font-medium ml-2">
                          <AlertTriangle className="inline h-4 w-4 mr-1" />
                          ANOMALA
                        </span>
                      )}
                    </p>
                    {selectedLog.temperature_equipment_name && (
                      <p className="text-[12px] text-muted-foreground mt-1">
                        {selectedLog.temperature_equipment_name}
                        {selectedLog.temperature_equipment_type && ` (${selectedLog.temperature_equipment_type})`}
                      </p>
                    )}
                    {selectedLog.temperature_note && (
                      <p className="text-[12px] text-muted-foreground mt-1 italic">"{selectedLog.temperature_note}"</p>
                    )}
                  </div>
                )}

                {/* Notes */}
                {selectedLog.notes && (
                  <div className="rounded-[14px] bg-secondary/50 p-4">
                    <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground mb-2">
                      <MessageSquare className="h-3 w-3" /> Note
                    </div>
                    <p className="text-[13px] text-foreground whitespace-pre-wrap">{selectedLog.notes}</p>
                  </div>
                )}

                {/* Cancelled reason */}
                {selectedLog.status === "annullata" && selectedLog.cancelled_reason && (
                  <div className="rounded-[14px] bg-destructive/10 border border-destructive/20 p-4">
                    <div className="flex items-center gap-1.5 text-[11px] text-destructive mb-2">
                      <FileWarning className="h-3 w-3" /> Motivo annullamento
                    </div>
                    <p className="text-[13px] text-foreground">{selectedLog.cancelled_reason}</p>
                  </div>
                )}

                {/* Photos */}
                {selectedLog.has_photos && (
                  <div>
                    <div className="flex items-center gap-1.5 text-[13px] font-semibold text-foreground mb-3">
                      <ImageIcon className="h-4 w-4 text-primary" /> Foto prova
                    </div>
                    {loadingDetail ? (
                      <div className="flex justify-center py-6">
                        <Loader2 className="h-5 w-5 animate-spin text-primary" />
                      </div>
                    ) : detailPhotos.length === 0 ? (
                      <p className="text-[12px] text-muted-foreground">Nessuna foto trovata</p>
                    ) : (
                      <div className="grid grid-cols-2 gap-2">
                        {detailPhotos.map((photo) => (
                          <div key={photo.id} className="relative rounded-[12px] overflow-hidden bg-secondary aspect-square">
                            <img
                              src={photo.photo_url}
                              alt="Foto prova HACCP"
                              className="h-full w-full object-cover"
                              onClick={() => window.open(photo.photo_url, "_blank")}
                            />
                            <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/60 to-transparent p-2">
                              <p className="text-[10px] text-white font-medium truncate">
                                {photo.uploaded_by_name ?? "Operatore"}
                              </p>
                              <p className="text-[9px] text-white/70">
                                {format(new Date(photo.created_at), "dd/MM HH:mm")}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* No photos indicator */}
                {!selectedLog.has_photos && (
                  <div className="rounded-[14px] bg-secondary/30 p-4 text-center">
                    <Camera className="h-6 w-6 text-muted-foreground mx-auto mb-1" />
                    <p className="text-[12px] text-muted-foreground">Nessuna foto allegata</p>
                  </div>
                )}
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
};

export default RestaurantHaccpHistoryPage;
