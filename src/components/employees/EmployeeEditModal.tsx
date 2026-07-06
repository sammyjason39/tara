import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { X, Pencil } from "lucide-react";

type Employee = {
  id: string;
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
  const [form, setForm] = useState({
    full_name: "",
    department: "",
    whatsapp_number: "",
    supervisor_id: "",
  });

  useEffect(() => {
    if (!employee) return;
    setForm({
      full_name: employee.full_name || "",
      department: employee.department || "",
      whatsapp_number: employee.whatsapp_number || "",
      supervisor_id: employee.supervisor_id || "",
    });
  }, [employee]);

  if (!employee) return null;

  const handleSave = async () => {
    if (!form.full_name.trim()) {
      toast.error("Nama lengkap wajib diisi");
      return;
    }

    setSaving(true);
    try {
      await api.put(`/employees/${employee.id}`, {
        full_name: form.full_name.trim(),
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

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
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

        <div className="text-sm border-b border-border pb-3">
          <p className="text-xs text-muted-foreground">Email (tidak bisa diubah)</p>
          <p className="font-medium">{employee.email}</p>
        </div>

        <div className="space-y-3">
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
            disabled={saving}
            className="px-4 py-2 rounded-md text-sm bg-primary text-primary-foreground hover:bg-primary/90 transition-colors font-medium disabled:opacity-50"
          >
            {saving ? "Menyimpan..." : t("common.save")}
          </button>
        </div>
      </div>
    </div>
  );
}
