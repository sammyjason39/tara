import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { AlertTriangle, X } from "lucide-react";

type Employee = {
  id: string;
  full_name: string;
  email?: string;
  employee_code?: string;
};

type Props = {
  employee: Employee | null;
  onClose: () => void;
  onDeleted: () => void;
};

export function EmployeeDeleteModal({ employee, onClose, onDeleted }: Props) {
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!employee) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [employee]);

  if (!employee) return null;

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await api.delete(`/employees/${employee.id}`);
      toast.success("Karyawan berhasil dihapus");
      onDeleted();
      onClose();
    } catch (err: any) {
      toast.error(err.message || "Gagal menghapus karyawan");
    } finally {
      setDeleting(false);
    }
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-[1px] p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-lg border border-border bg-card p-5 space-y-4 shadow-luxury-lg animate-fade-in"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-4 w-4" />
            <h3 className="text-sm font-semibold">Hapus Karyawan</h3>
          </div>
          <button onClick={onClose} className="p-1 rounded hover:bg-accent">
            <X className="h-4 w-4 text-muted-foreground" />
          </button>
        </div>

        <div className="text-sm space-y-2">
          <p>
            Yakin ingin menghapus <strong>{employee.full_name}</strong>
            {employee.employee_code ? ` (${employee.employee_code})` : ""}?
          </p>
          <p className="text-xs text-muted-foreground">
            Karyawan akan di-soft delete dan tidak lagi muncul di daftar aktif.
            Akun tidak bisa login lagi. Data historis (absensi, cuti) tetap tersimpan.
          </p>
        </div>

        <div className="flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-md text-sm border border-input hover:bg-accent transition-colors"
          >
            Batal
          </button>
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="px-4 py-2 rounded-md text-sm bg-destructive text-destructive-foreground hover:bg-destructive/90 transition-colors font-medium disabled:opacity-50"
          >
            {deleting ? "Menghapus..." : "Hapus Karyawan"}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
