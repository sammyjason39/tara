import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { api } from "@/lib/api";
import { Clock, Users, AlertTriangle, CheckCircle2, Calendar } from "lucide-react";
import { DatePickerInput } from "@/components/DatePickerInput";
import { todayApiDate } from "@/lib/dates";
import { cn } from "@/lib/utils";

export function AttendancePage() {
  const { t } = useTranslation();
  const [selectedDate, setSelectedDate] = useState(todayApiDate());

  const { data, isLoading } = useQuery({
    queryKey: ["attendance", selectedDate],
    queryFn: () => api.get(`/attendance/dashboard?date=${selectedDate}`),
    placeholderData: { data: { total_employees: 0, clocked_in: 0, tardy: 0, absent: 0, records: [] } },
  });

  const stats = data?.data || { total_employees: 0, clocked_in: 0, tardy: 0, absent: 0, records: [] };

  const statCards = [
    { label: t("attendance.total_present"), value: stats.clocked_in, icon: CheckCircle2, color: "text-success" },
    { label: t("attendance.late"), value: stats.tardy, icon: AlertTriangle, color: "text-warning" },
    { label: t("attendance.not_present"), value: stats.absent, icon: Users, color: "text-muted-foreground" },
    { label: t("attendance.total_employees"), value: stats.total_employees, icon: Users, color: "text-foreground" },
  ];

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

      {/* Attendance Table */}
      <div className="surface-elevated overflow-hidden">
        <div className="px-4 py-3 border-b border-border">
          <h2 className="text-sm font-semibold">{t("attendance.details")}</h2>
        </div>
        <table className="w-full">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left px-4 py-3 text-luxury-label">{t("attendance.employee")}</th>
              <th className="text-left px-4 py-3 text-luxury-label">{t("attendance.clock_in")}</th>
              <th className="text-left px-4 py-3 text-luxury-label hidden md:table-cell">{t("attendance.clock_out")}</th>
              <th className="text-left px-4 py-3 text-luxury-label hidden lg:table-cell">{t("attendance.source")}</th>
              <th className="text-left px-4 py-3 text-luxury-label">{t("attendance.status")}</th>
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
                  <td className="px-4 py-3"><div className="h-5 w-16 bg-muted rounded-full animate-pulse" /></td>
                </tr>
              ))
            ) : (stats.records || []).length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-12 text-center">
                  <Clock className="h-10 w-10 mx-auto text-muted-foreground/30 mb-3" />
                  <p className="text-sm text-muted-foreground">{t("attendance.no_data_for_date")}</p>
                </td>
              </tr>
            ) : (
              (stats.records || []).map((record: any) => (
                <tr key={record.id} className="border-b border-border/50 hover:bg-accent/30 transition-colors">
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
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
