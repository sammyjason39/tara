import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { format } from "date-fns";
import { api, downloadAuthenticatedFile } from "@/lib/api";
import { Clock, Users, AlertTriangle, CheckCircle2, Calendar, ChevronRight, Camera, FileSpreadsheet, Loader2 } from "lucide-react";
import { AttendanceDetailDialog } from "@/components/AttendanceDetailDialog";
import { DatePickerInput } from "@/components/DatePickerInput";
import { todayApiDate } from "@/lib/dates";
import { cn } from "@/lib/utils";

function monthStartApiDate(): string {
  const now = new Date();
  return format(new Date(now.getFullYear(), now.getMonth(), 1), "yyyy-MM-dd");
}

export function AttendancePage() {
  const { t } = useTranslation();
  const [selectedDate, setSelectedDate] = useState(todayApiDate());
  const [reportStart, setReportStart] = useState(monthStartApiDate());
  const [reportEnd, setReportEnd] = useState(todayApiDate());
  const [exporting, setExporting] = useState(false);
  const [selectedAttendanceId, setSelectedAttendanceId] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["attendance", selectedDate],
    queryFn: () => api.get(`/attendance/dashboard?date=${selectedDate}`),
    placeholderData: { data: { total_employees: 0, clocked_in: 0, tardy: 0, absent: 0, records: [] } },
  });

  const { data: monthlyRes } = useQuery({
    queryKey: ["monthly-tardiness"],
    queryFn: () => api.get("/attendance/monthly-tardiness"),
    placeholderData: { data: [] },
  });

  const monthlyTardiness = monthlyRes?.data || [];

  const stats = data?.data || { total_employees: 0, clocked_in: 0, tardy: 0, absent: 0, records: [] };

  const statCards = [
    { label: t("attendance.total_present"), value: stats.clocked_in, icon: CheckCircle2, color: "text-success" },
    { label: t("attendance.late"), value: stats.tardy, icon: AlertTriangle, color: "text-warning" },
    { label: t("attendance.not_present"), value: stats.absent, icon: Users, color: "text-muted-foreground" },
    { label: t("attendance.total_employees"), value: stats.total_employees, icon: Users, color: "text-foreground" },
  ];

  const handleExportReport = async () => {
    setExporting(true);
    try {
      await downloadAuthenticatedFile(
        `/attendance/report/export?start=${reportStart}&end=${reportEnd}`,
        `tara-absensi-${reportStart}_${reportEnd}.xlsx`,
      );
    } catch (err) {
      window.alert(err instanceof Error ? err.message : "Gagal mengunduh laporan absensi");
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-luxury-heading text-2xl">{t("attendance.title")}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {t("attendance.monitor_desc")}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          <DatePickerInput
            value={selectedDate}
            onChange={setSelectedDate}
            className="w-40"
            aria-label="Pilih tanggal absensi"
          />
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat) => (
          <div key={stat.label} className="surface-elevated p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-luxury-label">{stat.label}</span>
              <stat.icon className={cn("h-4 w-4", stat.color)} />
            </div>
            <p className="text-2xl font-semibold tracking-tight">{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Export laporan */}
      <div className="surface-elevated p-4 space-y-3">
        <div>
          <h2 className="text-sm font-semibold">Export Laporan Absensi</h2>
          <p className="text-2xs text-muted-foreground mt-0.5">
            Baris = karyawan, kolom = tanggal. Maksimal 62 hari per unduhan.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row sm:items-end gap-3">
          <div className="space-y-1">
            <label className="text-luxury-label">Dari tanggal</label>
            <DatePickerInput
              value={reportStart}
              onChange={setReportStart}
              className="w-40"
              aria-label="Tanggal mulai laporan"
            />
          </div>
          <div className="space-y-1">
            <label className="text-luxury-label">Sampai tanggal</label>
            <DatePickerInput
              value={reportEnd}
              onChange={setReportEnd}
              className="w-40"
              aria-label="Tanggal akhir laporan"
            />
          </div>
          <button
            type="button"
            onClick={handleExportReport}
            disabled={exporting}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
          >
            {exporting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <FileSpreadsheet className="h-4 w-4" />
            )}
            Unduh Excel
          </button>
        </div>
      </div>

      {/* Monthly Tardiness Summary */}
      <div className="surface-elevated overflow-hidden">
        <div className="px-4 py-3 border-b border-border">
          <h2 className="text-sm font-semibold">Keterlambatan Bulan Ini</h2>
          <p className="text-2xs text-muted-foreground mt-0.5">Total menit terlambat per karyawan (setelah toleransi jadwal)</p>
        </div>
        <table className="w-full">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left px-4 py-3 text-luxury-label">Karyawan</th>
              <th className="text-left px-4 py-3 text-luxury-label hidden md:table-cell">Departemen</th>
              <th className="text-left px-4 py-3 text-luxury-label">Hari Telat</th>
              <th className="text-left px-4 py-3 text-luxury-label">Total Menit</th>
            </tr>
          </thead>
          <tbody>
            {monthlyTardiness.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-sm text-muted-foreground">
                  Belum ada keterlambatan tercatat bulan ini
                </td>
              </tr>
            ) : (
              monthlyTardiness.map((row: any) => (
                <tr
                  key={row.employee_id}
                  className={cn(
                    "border-b border-border/50",
                    row.is_over_threshold && "bg-warning/5",
                  )}
                >
                  <td className="px-4 py-3 text-sm font-medium">
                    <div className="flex items-center gap-2">
                      {row.is_over_threshold && (
                        <AlertTriangle className="h-3.5 w-3.5 text-warning shrink-0" />
                      )}
                      {row.employee_name}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-muted-foreground hidden md:table-cell">
                    {row.department || "—"}
                  </td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">{row.tardy_days}</td>
                  <td className="px-4 py-3">
                    <span className={cn(
                      "text-sm font-semibold",
                      row.is_over_threshold ? "text-warning" : "text-foreground",
                    )}>
                      {row.total_tardiness_minutes} mnt
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Attendance Table */}
      <div className="surface-elevated overflow-hidden">
        <div className="px-4 py-3 border-b border-border flex items-center justify-between gap-2">
          <h2 className="text-sm font-semibold">{t("attendance.details")}</h2>
          <p className="text-2xs text-muted-foreground hidden sm:block">{t("attendance.click_row_hint")}</p>
        </div>
        <table className="w-full">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left px-4 py-3 text-luxury-label">{t("attendance.employee")}</th>
              <th className="text-left px-4 py-3 text-luxury-label">{t("attendance.clock_in")}</th>
              <th className="text-left px-4 py-3 text-luxury-label hidden md:table-cell">{t("attendance.clock_out")}</th>
              <th className="text-left px-4 py-3 text-luxury-label hidden lg:table-cell">{t("attendance.source")}</th>
              <th className="text-left px-4 py-3 text-luxury-label hidden sm:table-cell">{t("attendance.photo")}</th>
              <th className="text-left px-4 py-3 text-luxury-label">{t("attendance.status")}</th>
              <th className="w-10 px-2 py-3" aria-hidden />
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              Array.from({ length: 6 }).map((_, i) => (
                <tr key={i} className="border-b border-border/50">
                  <td className="px-4 py-3"><div className="h-4 w-28 bg-muted rounded animate-pulse" /></td>
                  <td className="px-4 py-3"><div className="h-4 w-14 bg-muted rounded animate-pulse" /></td>
                  <td className="px-4 py-3 hidden md:table-cell"><div className="h-4 w-14 bg-muted rounded animate-pulse" /></td>
                  <td className="px-4 py-3 hidden lg:table-cell"><div className="h-4 w-14 bg-muted rounded animate-pulse" /></td>
                  <td className="px-4 py-3 hidden sm:table-cell"><div className="h-4 w-10 bg-muted rounded animate-pulse" /></td>
                  <td className="px-4 py-3"><div className="h-5 w-16 bg-muted rounded-full animate-pulse" /></td>
                  <td className="px-2 py-3" />
                </tr>
              ))
            ) : (stats.records || []).length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-12 text-center">
                  <Clock className="h-10 w-10 mx-auto text-muted-foreground/30 mb-3" />
                  <p className="text-sm text-muted-foreground">{t("attendance.no_data_for_date")}</p>
                </td>
              </tr>
            ) : (
              (stats.records || []).map((record: any) => {
                const hasPhoto = record.has_clock_in_photo || record.has_clock_out_photo;
                return (
                  <tr
                    key={record.id}
                    onClick={() => setSelectedAttendanceId(record.id)}
                    className="border-b border-border/50 hover:bg-accent/30 transition-colors cursor-pointer"
                  >
                    <td className="px-4 py-3 text-sm font-medium">{record.employee_name || "—"}</td>
                    <td className="px-4 py-3 text-sm font-mono text-muted-foreground">
                      {record.clock_in_time ? new Date(record.clock_in_time).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }) : "—"}
                    </td>
                    <td className="px-4 py-3 text-sm font-mono text-muted-foreground hidden md:table-cell">
                      {record.clock_out_time ? new Date(record.clock_out_time).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }) : "—"}
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground hidden lg:table-cell capitalize">
                      {record.clock_in_source || "phone"}
                    </td>
                    <td className="px-4 py-3 hidden sm:table-cell">
                      {hasPhoto ? (
                        <span className="inline-flex items-center gap-1 text-2xs text-muted-foreground">
                          <Camera className="h-3.5 w-3.5" />
                          {(record.has_clock_in_photo ? 1 : 0) + (record.has_clock_out_photo ? 1 : 0)}
                        </span>
                      ) : (
                        <span className="text-2xs text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className={cn(
                        "inline-flex items-center px-2 py-0.5 rounded-full text-2xs font-medium",
                        record.is_tardy
                          ? "bg-warning/10 text-warning"
                          : "bg-success/10 text-success"
                      )}>
                        {record.is_tardy ? t("attendance.late_minutes", { minutes: record.tardiness_minutes }) : t("attendance.on_time")}
                      </span>
                    </td>
                    <td className="px-2 py-3 text-muted-foreground">
                      <ChevronRight className="h-4 w-4" />
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <AttendanceDetailDialog
        attendanceId={selectedAttendanceId}
        onClose={() => setSelectedAttendanceId(null)}
      />
    </div>
  );
}
