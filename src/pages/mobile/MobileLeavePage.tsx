import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { CalendarDays, Plus, Clock, CheckCircle2, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { DatePickerInput } from "@/components/DatePickerInput";
import { formatDateRange } from "@/lib/dates";
import { formatLeaveDays, toLeaveDays } from "@/lib/leave-days";

export function MobileLeavePage() {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    leave_type: "annual",
    start_date: "",
    end_date: "",
    reason: "",
    half_day: false,
  });
  const [submitting, setSubmitting] = useState(false);
  const queryClient = useQueryClient();

  const { data: balance } = useQuery({
    queryKey: ["my-balance"],
    queryFn: () => api.get("/leaves/my-balance"),
    placeholderData: { data: { remaining_days: 0, total_entitlement: 12, used_days: 0 } },
  });
  const { data: requests } = useQuery({
    queryKey: ["my-leave-requests"],
    queryFn: () => api.get("/leaves/my-requests"),
    placeholderData: { data: [] },
  });

  const bal = balance?.data || { remaining_days: 0, total_entitlement: 12, used_days: 0 };
  const remaining = toLeaveDays(bal.remaining_days);
  const entitlement = toLeaveDays(bal.total_entitlement);
  const used = toLeaveDays(bal.used_days);
  const isSingleDay =
    form.start_date && form.end_date && form.start_date === form.end_date;

  const handleSubmit = async () => {
    if (!form.start_date || !form.end_date) { toast.error("Tanggal mulai dan selesai wajib diisi"); return; }
    if (form.half_day && !isSingleDay) {
      toast.error("Cuti setengah hari hanya untuk satu tanggal (dari = sampai)");
      return;
    }
    setSubmitting(true);
    try {
      await api.post("/leaves/request", {
        leave_type: form.leave_type,
        start_date: form.start_date,
        end_date: form.end_date,
        reason: form.reason,
        half_day: form.half_day,
      });
      toast.success("Pengajuan cuti berhasil dikirim");
      setShowForm(false);
      setForm({ leave_type: "annual", start_date: "", end_date: "", reason: "", half_day: false });
      queryClient.invalidateQueries({ queryKey: ["my-leave-requests"] });
      queryClient.invalidateQueries({ queryKey: ["my-balance"] });
    } catch (err: any) {
      toast.error(err?.message || "Gagal mengirim pengajuan cuti");
    } finally { setSubmitting(false); }
  };

  const leaves = requests?.data || [];

  return (
    <div className="px-5 py-6 space-y-6 animate-fade-in">
      {/* Balance */}
      <div className="surface-elevated p-5 space-y-3">
        <p className="text-luxury-label">Saldo Cuti Anda</p>
        <div className="flex items-baseline gap-2">
          <span className="text-4xl font-display font-semibold">{formatLeaveDays(remaining)}</span>
          <span className="text-sm text-muted-foreground">/ {formatLeaveDays(entitlement)} hari</span>
        </div>
        <div className="h-2 rounded-full bg-secondary overflow-hidden">
          <div
            className="h-full rounded-full bg-gold transition-all"
            style={{ width: `${entitlement > 0 ? Math.min(100, (remaining / entitlement) * 100) : 0}%` }}
          />
        </div>
        <p className="text-2xs text-muted-foreground">{formatLeaveDays(used)} hari terpakai tahun ini</p>
      </div>

      {/* Action */}
      <button onClick={() => setShowForm(!showForm)}
        className="w-full flex items-center justify-center gap-2 h-12 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90">
        <Plus className="h-4 w-4" />{showForm ? "Tutup Formulir" : "Ajukan Cuti Baru"}
      </button>

      {/* Form */}
      {showForm && (
        <div className="surface-elevated p-5 space-y-4 animate-fade-in">
          <p className="text-sm font-medium">Formulir Pengajuan Cuti</p>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <label className="text-luxury-label">Jenis Cuti</label>
              <select value={form.leave_type} onChange={e => setForm({...form, leave_type: e.target.value})}
                className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm">
                <option value="annual">Tahunan (Berbayar)</option>
                <option value="sick">Sakit (Berbayar)</option>
                <option value="emergency">Darurat (Berbayar)</option>
                <option value="unpaid">Tanpa Bayaran</option>
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-luxury-label">Dari</label>
                <DatePickerInput
                  value={form.start_date}
                  onChange={(start_date) => setForm({ ...form, start_date })}
                  aria-label="Tanggal mulai cuti"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-luxury-label">Sampai</label>
                <DatePickerInput
                  value={form.end_date}
                  onChange={(end_date) => setForm({ ...form, end_date })}
                  min={form.start_date || undefined}
                  aria-label="Tanggal selesai cuti"
                />
              </div>
            </div>
            {isSingleDay && (
              <label className="flex items-center gap-2.5 cursor-pointer rounded-md border border-input px-3 py-2.5">
                <input
                  type="checkbox"
                  checked={form.half_day}
                  onChange={(e) => setForm({ ...form, half_day: e.target.checked })}
                  className="h-4 w-4 rounded border-input"
                />
                <div>
                  <p className="text-sm font-medium">Cuti setengah hari</p>
                  <p className="text-2xs text-muted-foreground">Memotong 0.5 jatah cuti untuk tanggal ini</p>
                </div>
              </label>
            )}
            <div className="space-y-1.5">
              <label className="text-luxury-label">Alasan</label>
              <textarea rows={3} value={form.reason} onChange={e => setForm({...form, reason: e.target.value})}
                placeholder="Alasan pengajuan cuti..."
                className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm resize-none placeholder:text-muted-foreground/50" />
            </div>
            <button onClick={handleSubmit} disabled={submitting}
              className="w-full h-10 rounded-md bg-gold text-gold-foreground text-sm font-medium hover:bg-gold/90 disabled:opacity-50">
              {submitting ? "Mengirim..." : "Kirim Pengajuan"}
            </button>
          </div>
        </div>
      )}

      {/* History */}
      <div className="space-y-3">
        <p className="text-luxury-label">Riwayat Pengajuan</p>
        {leaves.length === 0 ? (
          <div className="surface-inset p-6 text-center">
            <CalendarDays className="h-8 w-8 mx-auto text-muted-foreground/30 mb-2" />
            <p className="text-sm text-muted-foreground">Belum ada pengajuan cuti</p>
          </div>
        ) : leaves.map((l: any) => (
          <div key={l.id} className="surface-elevated p-4">
            <div className="flex items-start justify-between">
              <div className="space-y-0.5">
                <p className="text-sm font-medium capitalize">Cuti {l.leave_type}</p>
                <p className="text-2xs text-muted-foreground">
                  {formatLeaveDays(l.total_days)} hari • {formatDateRange(l.start_date, l.end_date)}
                </p>
                {l.reason && <p className="text-2xs text-muted-foreground italic mt-1">"{l.reason}"</p>}
              </div>
              <span className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-2xs font-medium",
                l.status === "approved" ? "bg-success/10 text-success" :
                l.status === "rejected" ? "bg-destructive/10 text-destructive" : "bg-warning/10 text-warning")}>
                {l.status === "approved" ? <CheckCircle2 className="h-3 w-3" /> :
                 l.status === "rejected" ? <XCircle className="h-3 w-3" /> : <Clock className="h-3 w-3" />}
                {l.status === "approved" ? "Disetujui" : l.status === "rejected" ? "Ditolak" : "Menunggu"}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
