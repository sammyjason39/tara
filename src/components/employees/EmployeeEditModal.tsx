import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { X, Pencil, CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

type EmailCheckStatus = "unchanged" | "checking" | "available" | "unavailable" | "invalid";

type Employee = {
  id: string;
  employee_code?: string;
  full_name: string;
  email?: string;
  department?: string | null;
  role?: string;
  supervisor_id?: string | null;
  whatsapp_number?: string | null;
};

type Department = {
  id: string;
  name: string;
};

type Props = {
  employee: Employee | null;
  allEmployees: Employee[];
  departments: Department[];
  onClose: () => void;
  onSaved: () => void;
};

export function EmployeeEditModal({
  employee,
  allEmployees,
  departments,
  onClose,
  onSaved,
}: Props) {
  const { t } = useTranslation();
  const [saving, setSaving] = useState(false);
  const [emailStatus, setEmailStatus] = useState<EmailCheckStatus>("unchanged");
  const [emailMessage, setEmailMessage] = useState("");
  const [form, setForm] = useState({
    employee_code: "",
    full_name: "",
    email: "",
    department: "",
    whatsapp_number: "",
    supervisor_id: "",
  });

  useEffect(() => {
    if (!employee) return;
    setForm({
      employee_code: employee.employee_code || "",
      full_name: employee.full_name || "",
      email: employee.email || "",
      department: employee.department || "",
      whatsapp_number: employee.whatsapp_number || "",
      supervisor_id: employee.supervisor_id || "",
    });
    setEmailStatus("unchanged");
    setEmailMessage("");
  }, [employee]);

  useEffect(() => {
    if (!employee) return;

    const normalized = form.email.trim().toLowerCase();
    const original = (employee.email || "").trim().toLowerCase();

    if (!normalized || normalized === original) {
      setEmailStatus("unchanged");
      setEmailMessage("");
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) {
      setEmailStatus("invalid");
      setEmailMessage("Format email tidak valid");
      return;
    }

    setEmailStatus("checking");
    setEmailMessage("");

    const timer = window.setTimeout(async () => {
      try {
        const res = await api.get(
          `/employees/check-email?email=${encodeURIComponent(normalized)}&exclude_id=${encodeURIComponent(employee.id)}`,
        );
        if (res?.data?.available) {
          setEmailStatus("available");
          setEmailMessage("Email tersedia");
        } else {
          setEmailStatus("unavailable");
          setEmailMessage(res?.data?.message || "Email sudah dipakai");
        }
      } catch {
        setEmailStatus("unavailable");
        setEmailMessage("Gagal memeriksa email");
      }
    }, 400);

    return () => window.clearTimeout(timer);
  }, [form.email, employee]);

  useEffect(() => {
    if (!employee) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [employee]);

  if (!employee) return null;

  const handleSave = async () => {
    if (!form.full_name.trim()) {
      toast.error("Nama lengkap wajib diisi");
      return;
    }
    if (!form.employee_code.trim()) {
      toast.error("ID karyawan wajib diisi");
      return;
    }
    if (!form.email.trim()) {
      toast.error("Email wajib diisi");
      return;
    }
    if (emailStatus === "checking") {
      toast.error("Tunggu sebentar, email sedang dicek...");
      return;
    }
    if (emailStatus === "invalid" || emailStatus === "unavailable") {
      toast.error(emailMessage || "Email tidak valid atau sudah dipakai");
      return;
    }

    setSaving(true);
    try {
      await api.put(`/employees/${employee.id}`, {
        employee_code: form.employee_code.trim(),
        full_name: form.full_name.trim(),
        email: form.email.trim().toLowerCase(),
        department: form.department.trim() || null,
        whatsapp_number: form.whatsapp_number.trim() || null,
        supervisor_id: form.supervisor_id || null,
      });
      toast.success("Data karyawan berhasil diperbarui");
      onSaved();
      onClose();
    } catch (err: any) {
      toast.error(err.message || "Gagal memperbarui data karyawan");
    } finally {
      setSaving(false);
    }
  };

  const deptNames = [
    ...new Set([
      ...departments.map((d) => d.name),
      ...allEmployees.map((e) => e.department).filter(Boolean) as string[],
      form.department,
    ].filter(Boolean)),
  ].sort();

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-[1px] p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-lg border border-border bg-card p-5 space-y-4 shadow-luxury-lg animate-fade-in max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Pencil className="h-4 w-4 text-gold" />
            <h3 className="text-sm font-semibold">Edit Karyawan</h3>
          </div>
          <button onClick={onClose} className="p-1 rounded hover:bg-accent">
            <X className="h-4 w-4 text-muted-foreground" />
          </button>
        </div>

        <div className="space-y-3">
          <div className="space-y-1.5">
            <label className="text-xs text-muted-foreground">Email</label>
            <div className="relative">
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="nama@perusahaan.com"
                className={cn(
                  "w-full h-10 px-3 pr-10 rounded-md border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring/20",
                  emailStatus === "available" && "border-success/50",
                  (emailStatus === "unavailable" || emailStatus === "invalid") && "border-destructive/50",
                )}
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                {emailStatus === "checking" && (
                  <Loader2 className="h-4 w-4 text-muted-foreground animate-spin" />
                )}
                {emailStatus === "available" && (
                  <CheckCircle2 className="h-4 w-4 text-success" />
                )}
                {(emailStatus === "unavailable" || emailStatus === "invalid") && (
                  <XCircle className="h-4 w-4 text-destructive" />
                )}
              </div>
            </div>
            {emailMessage && emailStatus !== "unchanged" && emailStatus !== "checking" && (
              <p className={cn(
                "text-2xs",
                emailStatus === "available" ? "text-success" : "text-destructive",
              )}>
                {emailMessage}
              </p>
            )}
            {emailStatus === "unchanged" && (
              <p className="text-2xs text-muted-foreground">
                Ubah email jika perlu — sistem akan cek duplikasi sebelum disimpan.
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <label className="text-xs text-muted-foreground">ID Karyawan</label>
            <input
              type="text"
              value={form.employee_code}
              onChange={(e) => setForm({ ...form, employee_code: e.target.value.toUpperCase() })}
              placeholder="EMP-001"
              className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm font-mono focus:outline-none focus:ring-2 focus:ring-ring/20"
            />
            <p className="text-2xs text-muted-foreground">
              Bisa diubah manual. Huruf, angka, underscore, dan tanda hubung (2–50 karakter).
            </p>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs text-muted-foreground">Nama lengkap</label>
            <input
              type="text"
              value={form.full_name}
              onChange={(e) => setForm({ ...form, full_name: e.target.value })}
              className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring/20"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs text-muted-foreground">Departemen</label>
            <input
              type="text"
              list="employee-dept-list"
              value={form.department}
              onChange={(e) => setForm({ ...form, department: e.target.value })}
              placeholder="Pilih atau ketik departemen baru"
              className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring/20"
            />
            <datalist id="employee-dept-list">
              {deptNames.map((name) => (
                <option key={name} value={name} />
              ))}
            </datalist>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs text-muted-foreground">Nomor WhatsApp (TARA)</label>
            <input
              type="tel"
              value={form.whatsapp_number}
              onChange={(e) => setForm({ ...form, whatsapp_number: e.target.value })}
              placeholder="6281234567890"
              className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring/20"
            />
            <p className="text-2xs text-muted-foreground">
              Format internasional tanpa + (contoh: 6281234567890). Nomor ini dipakai TARA untuk chat WhatsApp.
            </p>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs text-muted-foreground">Atasan / Approver cuti</label>
            <select
              value={form.supervisor_id}
              onChange={(e) => setForm({ ...form, supervisor_id: e.target.value })}
              className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring/20"
            >
              <option value="">— Tanpa atasan —</option>
              {allEmployees
                .filter((emp) => emp.id !== employee.id)
                .map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.full_name} {emp.department ? `· ${emp.department}` : ""}
                  </option>
                ))}
            </select>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-1">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-md text-sm border border-input hover:bg-accent transition-colors"
          >
            {t("common.cancel")}
          </button>
          <button
            onClick={handleSave}
            disabled={saving || emailStatus === "checking" || emailStatus === "unavailable" || emailStatus === "invalid"}
            className="px-4 py-2 rounded-md text-sm bg-primary text-primary-foreground hover:bg-primary/90 transition-colors font-medium disabled:opacity-50"
          >
            {saving ? "Menyimpan..." : t("common.save")}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
