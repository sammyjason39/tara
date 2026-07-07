import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Play, X } from "lucide-react";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";

type EmployeeOption = {
  id: string;
  full_name: string;
  email: string;
  role?: string;
  whatsapp_number?: string | null;
};

type Props = {
  open: boolean;
  onClose: () => void;
  workflowId: string;
  triggerEvent: string | null;
  hasUnsavedDraft: boolean;
  onRun: (params: {
    employee_id: string;
    employee_name: string;
    actor_employee_id?: string;
    phone?: string;
  }) => void;
  isRunning: boolean;
};

function buildDefaultPayload(triggerEvent: string | null, employeeId: string, employeeName: string) {
  const type = triggerEvent ?? "test.event";
  const samples: Record<string, Record<string, unknown>> = {
    "leave.request.submitted": {
      employee_id: employeeId,
      employee_name: employeeName,
      leave_type: "annual",
      total_days: 2,
      start_date: "2026-07-10",
      end_date: "2026-07-11",
      reason: "Test pengajuan cuti dari workflow builder",
    },
    "whatsapp.message.inbound": {
      employee_id: employeeId,
      employee_name: employeeName,
      content: "Halo, saya mau resign bulan depan",
    },
    "attendance.clock_in": {
      employee_id: employeeId,
      clock_in_time: "08:05",
      office_name: "HQ",
    },
    "attendance.tardiness_detected": {
      employee_id: employeeId,
      minutes_late: 15,
    },
  };
  return {
    event_type: type,
    payload: samples[type] ?? { employee_id: employeeId, employee_name: employeeName, message: "test" },
  };
}

export function WorkflowTestDialog({
  open,
  onClose,
  workflowId,
  triggerEvent,
  hasUnsavedDraft,
  onRun,
  isRunning,
}: Props) {
  const [employeeId, setEmployeeId] = useState("");
  const [actorId, setActorId] = useState("");
  const [phone, setPhone] = useState("");
  const [useCustomPhone, setUseCustomPhone] = useState(false);

  const { data: employeesRes, isLoading } = useQuery({
    queryKey: ["employees-for-workflow-test"],
    queryFn: () => api.get("/employees"),
    enabled: open,
  });

  const employees: EmployeeOption[] = useMemo(() => {
    const rows = employeesRes?.data ?? [];
    return rows
      .filter((e: EmployeeOption) => e.id)
      .sort((a: EmployeeOption, b: EmployeeOption) => a.full_name.localeCompare(b.full_name));
  }, [employeesRes]);

  const selectedEmployee = employees.find((e) => e.id === employeeId);

  if (!open) return null;

  const handleSubmit = () => {
    if (!employeeId || !selectedEmployee) return;
    onRun({
      employee_id: employeeId,
      employee_name: selectedEmployee.full_name,
      actor_employee_id: actorId || undefined,
      phone: useCustomPhone && phone.trim() ? phone.trim() : undefined,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-md rounded-lg border border-border bg-card shadow-lg animate-fade-in">
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div>
            <h2 className="text-sm font-semibold">Test Workflow</h2>
            <p className="text-2xs text-muted-foreground mt-0.5">
              Pilih akun karyawan untuk simulasi event
            </p>
          </div>
          <button type="button" onClick={onClose} className="p-1 rounded hover:bg-accent">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          {hasUnsavedDraft && (
            <div className="rounded-md border border-warning/30 bg-warning/10 px-3 py-2 text-2xs text-warning">
              Ada perubahan belum disimpan. Test akan memakai versi terakhir yang disimpan di server.
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-luxury-label">Karyawan (subjek event)</label>
            <select
              value={employeeId}
              onChange={(e) => {
                setEmployeeId(e.target.value);
                const emp = employees.find((x) => x.id === e.target.value);
                if (emp?.whatsapp_number && !useCustomPhone) {
                  setPhone(emp.whatsapp_number);
                }
              }}
              disabled={isLoading}
              className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
            >
              <option value="">— Pilih karyawan —</option>
              {employees.map((emp) => (
                <option key={emp.id} value={emp.id}>
                  {emp.full_name} ({emp.role ?? "Employee"})
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-luxury-label">Actor (opsional)</label>
            <select
              value={actorId}
              onChange={(e) => setActorId(e.target.value)}
              className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
            >
              <option value="">Sama dengan subjek / sistem</option>
              {employees.map((emp) => (
                <option key={emp.id} value={emp.id}>
                  {emp.full_name}
                </option>
              ))}
            </select>
            <p className="text-2xs text-muted-foreground">
              Siapa yang memicu aksi — berguna untuk rule `actor_employee.role`
            </p>
          </div>

          {(triggerEvent === "whatsapp.message.inbound" || useCustomPhone) && (
            <div className="space-y-1.5">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={useCustomPhone}
                  onChange={(e) => {
                    setUseCustomPhone(e.target.checked);
                    if (!e.target.checked && selectedEmployee?.whatsapp_number) {
                      setPhone(selectedEmployee.whatsapp_number);
                    }
                  }}
                  className="h-4 w-4 rounded border-input"
                />
                <span className="text-sm">Gunakan nomor kustom</span>
              </label>
              {useCustomPhone && (
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="6281234567890"
                  className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
                />
              )}
              {!useCustomPhone && selectedEmployee?.whatsapp_number && (
                <p className="text-2xs text-muted-foreground">
                  WA: {selectedEmployee.whatsapp_number}
                </p>
              )}
            </div>
          )}

          <p className="text-2xs text-muted-foreground rounded-md bg-muted/30 p-2">
            Test menjalankan workflow dengan aksi nyata (notifikasi/WA). Pastikan memilih akun yang tepat.
            {triggerEvent && (
              <> Trigger: <code className="text-2xs">{triggerEvent}</code></>
            )}
          </p>
        </div>

        <div className="flex items-center justify-end gap-2 p-4 border-t border-border">
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-2 rounded-md border text-sm hover:bg-accent"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!employeeId || isRunning}
            className={cn(
              "flex items-center gap-1.5 px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium",
              "disabled:opacity-50",
            )}
          >
            <Play className="h-4 w-4" />
            {isRunning ? "Menjalankan..." : "Jalankan Test"}
          </button>
        </div>
      </div>
    </div>
  );
}

export { buildDefaultPayload };
