import { useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { api } from "@/lib/api";
import {
  ArrowLeft, Mail, Phone, Building2, MapPin, Calendar,
  User, Shield, Briefcase, UserCheck, MessageCircle, Pencil, Trash2, Hash,
  CalendarDays, Clock, CheckCircle2, XCircle, KeyRound, Plus, Minus,
} from "lucide-react";
import { formatDate, formatDateRange } from "@/lib/dates";
import { formatLeaveDays, toLeaveDays } from "@/lib/leave-days";
import { cn } from "@/lib/utils";
import { EmployeeEditModal } from "@/components/employees/EmployeeEditModal";
import { EmployeeDeleteModal } from "@/components/employees/EmployeeDeleteModal";

const ADJUSTMENT_REASON_PRESETS = [
  "Adjustment sistem",
  "Bonus cuti",
  "Koreksi saldo",
  "Carryover manual",
];

export function EmployeeDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [showEdit, setShowEdit] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [showAdjustForm, setShowAdjustForm] = useState(false);
  const [adjustDays, setAdjustDays] = useState("1");
  const [adjustSign, setAdjustSign] = useState<"+" | "-">("+");
  const [adjustReason, setAdjustReason] = useState("");
  const [adjusting, setAdjusting] = useState(false);
  const [resettingPassword, setResettingPassword] = useState(false);

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

  const { data: officesRes } = useQuery({
    queryKey: ["admin-offices"],
    queryFn: () => api.get("/admin/offices"),
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
    queryFn: () => api.get(`/employees/${id}/leave-requests?limit=10`),
    enabled: !!id,
    placeholderData: { data: [] },
  });

  const { data: leaveAdjustmentsRes } = useQuery({
    queryKey: ["employee-leave-adjustments", id],
    queryFn: () => api.get(`/employees/${id}/leave-adjustments?limit=10`),
    enabled: !!id,
    placeholderData: { data: [] },
  });

  const employee = data?.success === false ? null : (data?.data ?? null);
  const allEmployees = employeesRes?.data || [];
  const adminDepartments = departmentsRes?.data || [];
  const offices = officesRes?.data || [];
  const leaveBalance = leaveBalanceRes?.data || { remaining_days: 0, total_entitlement: 0, used_days: 0 };
  const leaveRequests = leaveRequestsRes?.data || [];
  const leaveAdjustments = leaveAdjustmentsRes?.data || [];

  const leaveLog = useMemo(() => {
    const entries = [
      ...leaveRequests.map((req: any) => ({
        kind: "request" as const,
        id: req.id,
        date: req.submitted_at,
        data: req,
      })),
      ...leaveAdjustments.map((adj: any) => ({
        kind: "adjustment" as const,
        id: adj.id,
        date: adj.created_at,
        data: adj,
      })),
    ];
    return entries
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 10);
  }, [leaveRequests, leaveAdjustments]);

  const handleAdjustLeave = async () => {
    const days = Number(adjustDays);
    if (!Number.isFinite(days) || days <= 0) {
      toast.error("Masukkan jumlah hari yang valid");
      return;
    }
    if (!adjustReason.trim()) {
      toast.error("Alasan penyesuaian wajib diisi");
      return;
    }

    const daysDelta = adjustSign === "+" ? days : -days;
    setAdjusting(true);
    try {
      await api.post(`/employees/${id}/leave-balance/adjust`, {
        days_delta: daysDelta,
        reason: adjustReason.trim(),
      });
      toast.success("Saldo cuti berhasil disesuaikan");
      setAdjustReason("");
      setAdjustDays("1");
      setShowAdjustForm(false);
      queryClient.invalidateQueries({ queryKey: ["employee-leave-balance", id] });
      queryClient.invalidateQueries({ queryKey: ["employee-leave-adjustments", id] });
    } catch (err: any) {
      toast.error(err?.message || "Gagal menyesuaikan saldo cuti");
    } finally {
      setAdjusting(false);
    }
  };

  const handleResetPassword = async () => {
    const waNote = employee?.whatsapp_number
      ? " Password default akan dikirim otomatis ke WhatsApp karyawan."
      : " Karyawan belum punya WhatsApp — password akan ditampilkan di sini.";
    if (!window.confirm(`Reset password ${employee?.full_name}?${waNote}`)) return;

    setResettingPassword(true);
    try {
      const res = await api.post(`/employees/${id}/reset-password`);
      const { password, whatsapp_sent, whatsapp_error } = res.data || {};
      if (whatsapp_sent) {
        toast.success("Password direset dan dikirim ke WhatsApp karyawan");
      } else if (password) {
        toast.success(`Password direset: ${password}`, { duration: 12000 });
        if (whatsapp_error) toast.warning(whatsapp_error);
      } else {
        toast.success("Password berhasil direset");
      }
    } catch (err: any) {
      toast.error(err?.message || "Gagal reset password");
    } finally {
      setResettingPassword(false);
    }
  };

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
          <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">
            <button
              onClick={handleResetPassword}
              disabled={resettingPassword}
              className="flex items-center gap-2 px-3 py-2 rounded-md border border-input text-sm hover:bg-accent transition-colors disabled:opacity-50"
            >
              <KeyRound className="h-4 w-4" />
              {resettingPassword ? "Mereset..." : "Reset Password"}
            </button>
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

          <div className="pt-2 border-t border-border/60">
            <button
              type="button"
              onClick={() => setShowAdjustForm((v) => !v)}
              className="text-xs text-gold hover:text-gold/80 font-medium"
            >
              {showAdjustForm ? "Tutup penyesuaian" : "+ Sesuaikan saldo cuti"}
            </button>

            {showAdjustForm && (
              <div className="mt-3 space-y-3 rounded-md border border-border/60 p-3 bg-accent/30">
                <p className="text-2xs text-muted-foreground">
                  Tambah atau kurangi saldo cuti. Perubahan tercatat di log cuti.
                </p>
                <div className="flex items-center gap-2">
                  <div className="flex rounded-md border border-input overflow-hidden">
                    <button
                      type="button"
                      onClick={() => setAdjustSign("+")}
                      className={cn(
                        "px-3 py-2 text-sm flex items-center gap-1",
                        adjustSign === "+" ? "bg-gold/15 text-gold" : "hover:bg-accent",
                      )}
                    >
                      <Plus className="h-3.5 w-3.5" />
                      Tambah
                    </button>
                    <button
                      type="button"
                      onClick={() => setAdjustSign("-")}
                      className={cn(
                        "px-3 py-2 text-sm flex items-center gap-1 border-l border-input",
                        adjustSign === "-" ? "bg-destructive/10 text-destructive" : "hover:bg-accent",
                      )}
                    >
                      <Minus className="h-3.5 w-3.5" />
                      Kurang
                    </button>
                  </div>
                  <input
                    type="number"
                    min="0.5"
                    step="0.5"
                    value={adjustDays}
                    onChange={(e) => setAdjustDays(e.target.value)}
                    className="w-20 h-9 px-2 rounded-md border border-input bg-background text-sm text-center"
                  />
                  <span className="text-sm text-muted-foreground">hari</span>
                </div>

                <div className="space-y-1.5">
                  <label className="text-2xs text-muted-foreground">Alasan penyesuaian</label>
                  <input
                    type="text"
                    value={adjustReason}
                    onChange={(e) => setAdjustReason(e.target.value)}
                    placeholder="Misal: bonus cuti, koreksi sistem..."
                    className="w-full h-9 px-3 rounded-md border border-input bg-background text-sm"
                  />
                  <div className="flex flex-wrap gap-1.5">
                    {ADJUSTMENT_REASON_PRESETS.map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => setAdjustReason(preset)}
                        className="px-2 py-0.5 rounded-full text-2xs border border-border hover:bg-accent transition-colors"
                      >
                        {preset}
                      </button>
                    ))}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleAdjustLeave}
                  disabled={adjusting}
                  className="w-full h-9 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-50"
                >
                  {adjusting ? "Menyimpan..." : "Simpan penyesuaian"}
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="surface-elevated p-5 space-y-3">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <h2 className="text-sm font-semibold">Log Cuti</h2>
          </div>
          {leaveLog.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">Belum ada aktivitas cuti</p>
          ) : (
            <div className="space-y-2">
              {leaveLog.map((entry) => {
                if (entry.kind === "adjustment") {
                  const adj = entry.data;
                  const delta = Number(adj.days_delta);
                  const sign = delta > 0 ? "+" : "";
                  return (
                    <div key={entry.id} className="rounded-md border border-border/60 p-3 space-y-1">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-sm font-medium">
                            Penyesuaian saldo{" "}
                            <span className={cn(
                              "font-semibold",
                              delta > 0 ? "text-success" : "text-destructive",
                            )}>
                              {sign}{formatLeaveDays(delta)} hari
                            </span>
                          </p>
                          <p className="text-2xs text-muted-foreground italic">"{adj.reason}"</p>
                        </div>
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-2xs font-medium shrink-0 bg-gold/10 text-gold">
                          Adjustment
                        </span>
                      </div>
                      <p className="text-2xs text-muted-foreground">
                        {formatDate(adj.created_at)}
                        {adj.adjuster_name && ` · oleh ${adj.adjuster_name}`}
                      </p>
                    </div>
                  );
                }

                const req = entry.data;
                const status = leaveStatusLabel[req.status] || leaveStatusLabel.pending;
                const StatusIcon = status.icon;
                return (
                  <div key={entry.id} className="rounded-md border border-border/60 p-3 space-y-1">
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
        offices={offices}
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
