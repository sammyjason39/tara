import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { api } from "@/lib/api";
import {
  ArrowLeft, Mail, Phone, Building2, MapPin, Calendar,
  User, Shield, Briefcase, UserCheck, MessageCircle, Pencil,
} from "lucide-react";
import { formatDate } from "@/lib/dates";
import { cn } from "@/lib/utils";
import { EmployeeEditModal } from "@/components/employees/EmployeeEditModal";

export function EmployeeDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [showEdit, setShowEdit] = useState(false);

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

  const employee = data?.data || data;
  const allEmployees = employeesRes?.data || [];
  const adminDepartments = departmentsRes?.data || [];

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
          <button
            onClick={() => setShowEdit(true)}
            className="flex items-center gap-2 px-3 py-2 rounded-md border border-input text-sm hover:bg-accent transition-colors shrink-0"
          >
            <Pencil className="h-4 w-4" />
            Edit
          </button>
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
    </div>
  );
}
