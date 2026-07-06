import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { api } from "@/lib/api";
import {
  ArrowLeft, Mail, Phone, Building2, MapPin, Calendar,
  User, Shield, Briefcase, UserCheck, MessageCircle, Pencil, Trash2, Hash,
  CalendarDays, Clock, CheckCircle2, XCircle,
} from "lucide-react";
import { formatDate, formatDateRange } from "@/lib/dates";
import { formatLeaveDays, toLeaveDays } from "@/lib/leave-days";
import { cn } from "@/lib/utils";
import { EmployeeEditModal } from "@/components/employees/EmployeeEditModal";
import { EmployeeDeleteModal } from "@/components/employees/EmployeeDeleteModal";

export function EmployeeDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [showEdit, setShowEdit] = useState(false);
  const [showDelete, setShowDelete] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["employee", id],
    queryFn: () => api.get(`/employees/${id}`),
    enabled: !!id,
  });

  const { data: employeesRes } = useQuery({
    queryKey: ["employees"],
    queryFn: () => api.get("/employees"),
    placeholderData: { data: [] },
  });

  const { data: departmentsRes } = useQuery({
    queryKey: ["admin-departments"],
    queryFn: () => api.get("/admin/departments"),
    placeholderData: { data: [] },
  });

  const { data: leaveBalanceRes } = useQuery({
    queryKey: ["employee-leave-balance", id],
    queryFn: () => api.get(`/employees/${id}/leave-balance`),
    enabled: !!id,
    placeholderData: { data: { remaining_days: 0, total_entitlement: 0, used_days: 0, year: new Date().getFullYear() } },
  });

  const { data: leaveRequestsRes } = useQuery({
    queryKey: ["employee-leave-requests", id],
    queryFn: () => api.get(`/employees/${id}/leave-requests?limit=5`),
    enabled: !!id,
    placeholderData: { data: [] },
  });

  const employee = data?.data || data;
  const allEmployees = employeesRes?.data || [];
  const adminDepartments = departmentsRes?.data || [];
  const leaveBalance = leaveBalanceRes?.data || { remaining_days: 0, total_entitlement: 0, used_days: 0 };
  const leaveRequests = leaveRequestsRes?.data || [];

  const leaveTypeLabel: Record<string, string> = {
    annual: "Tahunan",
    sick: "Sakit",
    emergency: "Darurat",
    unpaid: "Tanpa Bayaran",
  };

  const leaveStatusLabel: Record<string, { label: string; className: string; icon: typeof Clock }> = {
    approved: { label: "Disetujui", className: "bg-success/10 text-success", icon: CheckCircle2 },
    rejected: { label: "Ditolak", className: "bg-destructive/10 text-destructive", icon: XCircle },
    pending: { label: "Menunggu", className: "bg-warning/10 text-warning", icon: Clock },
  };

  if (isLoading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 bg-muted rounded animate-pulse" />
          <div className="h-5 w-48 bg-muted rounded animate-pulse" />
        </div>
        <div className="surface-elevated p-8">
          <div className="flex items-start gap-6">
            <div className="h-20 w-20 rounded-full bg-muted animate-pulse" />
            <div className="flex-1 space-y-3">
              <div className="h-6 w-64 bg-muted rounded animate-pulse" />
              <div className="h-4 w-48 bg-muted rounded animate-pulse" />
              <div className="h-4 w-32 bg-muted rounded animate-pulse" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!employee) {
    return (
      <div className="space-y-6 animate-fade-in">
        <button
          onClick={() => navigate("/web/employees")}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          {t("common.back")}
        </button>
        <div className="surface-elevated p-12 text-center">
          <User className="h-12 w-12 mx-auto text-muted-foreground/30 mb-4" />
          <p className="text-sm text-muted-foreground">Karyawan tidak ditemukan</p>
        </div>
      </div>
    );
  }

  const infoItems = [
    { icon: Hash, label: "ID Karyawan", value: employee.employee_code || "—" },
    { icon: Mail, label: "Email", value: employee.email },
    { icon: Phone, label: "Telepon", value: employee.phone || "—" },
    {
      icon: MessageCircle,
      label: "WhatsApp (TARA)",
      value: employee.whatsapp_number
        ? `+${employee.whatsapp_number}${employee.whatsapp_verified ? "" : " (belum terverifikasi)"}`
        : "—",
    },
    { icon: Building2, label: "Departemen", value: employee.department || "—" },
    { icon: Shield, label: "Role", value: employee.role || "Employee" },
    { icon: UserCheck, label: "Atasan / Approver Cuti", value: employee.supervisor_name || "—" },
    { icon: MapPin, label: "Lokasi Kantor", value: employee.office || "—" },
    { icon: Calendar, label: "Tanggal Bergabung", value: formatDate(employee.hire_date) },
    { icon: Briefcase, label: "Status", value: employee.employment_status || "active" },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Back button */}
      <button
        onClick={() => navigate("/web/employees")}
        className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Kembali ke Daftar Karyawan
      </button>

      {/* Header Card */}
      <div className="surface-elevated p-6">
        <div className="flex items-start gap-5">
          <div className="h-16 w-16 rounded-full bg-gold/10 border border-gold/20 flex items-center justify-center shrink-0">
            <span className="text-xl font-semibold text-gold">
              {employee.full_name?.charAt(0) || "?"}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-semibold truncate">{employee.full_name}</h1>
              <span className={cn(
                "inline-flex items-center px-2 py-0.5 rounded-full text-2xs font-medium shrink-0",
                employee.employment_status === "active"
                  ? "bg-success/10 text-success"
                  : "bg-muted text-muted-foreground"
              )}>
                {employee.employment_status === "active" ? "Aktif" : employee.employment_status}
              </span>
            </div>
            <p className="text-sm text-muted-foreground mt-1">{employee.employee_code}</p>
            <p className="text-sm text-muted-foreground">{employee.email}</p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => setShowEdit(true)}
              className="flex items-center gap-2 px-3 py-2 rounded-md border border-input text-sm hover:bg-accent transition-colors"
            >
              <Pencil className="h-4 w-4" />
              Edit
            </button>
            <button
              onClick={() => setShowDelete(true)}
              className="flex items-center gap-2 px-3 py-2 rounded-md border border-destructive/30 text-sm text-destructive hover:bg-destructive/10 transition-colors"
            >
              <Trash2 className="h-4 w-4" />
              Hapus
            </button>
          </div>
        </div>
      </div>

      {/* Details Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {infoItems.map((item) => (
          <div key={item.label} className="surface-elevated p-4 flex items-center gap-3">
            <div className="h-9 w-9 rounded-md bg-accent flex items-center justify-center shrink-0">
              <item.icon className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="min-w-0">
              <p className="text-2xs text-muted-foreground">{item.label}</p>
              <p className="text-sm font-medium truncate">{item.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Leave Balance & History */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="surface-elevated p-5 space-y-3">
          <div className="flex items-center gap-2">
            <CalendarDays className="h-4 w-4 text-gold" />
            <h2 className="text-sm font-semibold">Saldo Cuti {leaveBalance.year || new Date().getFullYear()}</h2>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-display font-semibold">
              {formatLeaveDays(toLeaveDays(leaveBalance.remaining_days))}
            </span>
            <span className="text-sm text-muted-foreground">
              / {formatLeaveDays(toLeaveDays(leaveBalance.total_entitlement))} hari
            </span>
          </div>
          <div className="h-2 rounded-full bg-secondary overflow-hidden">
            <div
              className="h-full rounded-full bg-gold transition-all"
              style={{
                width: `${leaveBalance.total_entitlement > 0
                  ? Math.min(100, (toLeaveDays(leaveBalance.remaining_days) / toLeaveDays(leaveBalance.total_entitlement)) * 100)
                  : 0}%`,
              }}
            />
          </div>
          <p className="text-2xs text-muted-foreground">
            {formatLeaveDays(toLeaveDays(leaveBalance.used_days))} hari terpakai
            {(leaveBalance.carryover_days ?? 0) > 0 && (
              <> · {formatLeaveDays(leaveBalance.carryover_days)} hari carryover</>
            )}
          </p>
        </div>

        <div className="surface-elevated p-5 space-y-3">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <h2 className="text-sm font-semibold">Riwayat Cuti Terakhir</h2>
          </div>
          {leaveRequests.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">Belum ada pengajuan cuti</p>
          ) : (
            <div className="space-y-2">
              {leaveRequests.map((req: any) => {
                const status = leaveStatusLabel[req.status] || leaveStatusLabel.pending;
                const StatusIcon = status.icon;
                return (
                  <div key={req.id} className="rounded-md border border-border/60 p-3 space-y-1">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-sm font-medium">
                          Cuti {leaveTypeLabel[req.leave_type] || req.leave_type}
                        </p>
                        <p className="text-2xs text-muted-foreground">
                          {formatLeaveDays(req.total_days)} hari · {formatDateRange(req.start_date, req.end_date)}
                        </p>
                      </div>
                      <span className={cn(
                        "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-2xs font-medium shrink-0",
                        status.className,
                      )}>
                        <StatusIcon className="h-3 w-3" />
                        {status.label}
                      </span>
                    </div>
                    {req.reason && (
                      <p className="text-2xs text-muted-foreground italic truncate">"{req.reason}"</p>
                    )}
                    <p className="text-2xs text-muted-foreground">
                      Diajukan {formatDate(req.submitted_at)}
                      {req.approver_name && req.status === "approved" && ` · Disetujui ${req.approver_name}`}
                    </p>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <EmployeeEditModal
        employee={showEdit ? employee : null}
        allEmployees={allEmployees}
        departments={adminDepartments}
        onClose={() => setShowEdit(false)}
        onSaved={() => {
          queryClient.invalidateQueries({ queryKey: ["employee", id] });
          queryClient.invalidateQueries({ queryKey: ["employees"] });
        }}
      />

      <EmployeeDeleteModal
        employee={showDelete ? employee : null}
        onClose={() => setShowDelete(false)}
        onDeleted={() => navigate("/web/employees")}
      />
    </div>
  );
}
