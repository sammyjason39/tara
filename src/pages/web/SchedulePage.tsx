import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { DatePickerInput } from "@/components/DatePickerInput";
import { api } from "@/lib/api";
import { formatDate } from "@/lib/dates";
import {
  CalendarClock,
  Plus,
  AlertTriangle,
  X,
  Users,
  Clock,
  Building2,
  Search,
  Trash2,
  Eye,
  UserPlus,
} from "lucide-react";
import { cn } from "@/lib/utils";

const dayNames = ["", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min"];

type Tab = "schedules" | "assignments" | "absences" | "holidays";

export function SchedulePage() {
  const [tab, setTab] = useState<Tab>("schedules");
  const [showForm, setShowForm] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-luxury-heading text-2xl">Manajemen Jadwal</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Buat dan kelola jadwal kerja untuk semua departemen dan karyawan
          </p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
        >
          <Plus className="h-4 w-4" />
          {tab === "schedules" ? "Buat Jadwal" : tab === "assignments" ? "Tugaskan Karyawan" : tab === "absences" ? "Catat Absensi" : "Tambah Libur"}
        </button>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <input
          type="text"
          placeholder="Cari jadwal atau karyawan..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full h-10 pl-10 pr-4 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring/20"
        />
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-lg bg-secondary/50 w-fit">
        {([
          { id: "schedules" as Tab, label: "Jadwal Kerja", icon: CalendarClock },
          { id: "assignments" as Tab, label: "Penugasan", icon: Users },
          { id: "absences" as Tab, label: "Ketidakhadiran", icon: AlertTriangle },
          { id: "holidays" as Tab, label: "Hari Libur", icon: Clock },
        ]).map((t) => (
          <button
            key={t.id}
            onClick={() => { setTab(t.id); setShowForm(false); }}
            className={cn(
              "flex items-center gap-2 px-4 py-1.5 rounded-md text-sm font-medium transition-all",
              tab === t.id ? "bg-card shadow-luxury text-foreground" : "text-muted-foreground hover:text-foreground"
            )}
          >
            <t.icon className="h-3.5 w-3.5" />
            {t.label}
          </button>
        ))}
      </div>

      {tab === "schedules" && <SchedulesView showForm={showForm} onCloseForm={() => setShowForm(false)} search={searchQuery} />}
      {tab === "assignments" && <AssignmentsView showForm={showForm} onCloseForm={() => setShowForm(false)} search={searchQuery} />}
      {tab === "absences" && <AbsencesView showForm={showForm} onCloseForm={() => setShowForm(false)} />}
      {tab === "holidays" && <HolidaysView showForm={showForm} onCloseForm={() => setShowForm(false)} />}
    </div>
  );
}

// ─── Schedules View ───────────────────────────────────────────────────────────

function SchedulesView({ showForm, onCloseForm, search }: { showForm: boolean; onCloseForm: () => void; search: string }) {
  const queryClient = useQueryClient();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [form, setForm] = useState({
    schedule_name: "",
    start_time: "08:00",
    end_time: "17:00",
    break_start: "12:00",
    break_end: "13:00",
    work_days: [1, 2, 3, 4, 5] as number[],
    use_daily_breaks: false,
    daily_breaks: {} as Record<number, { break_start: string; break_end: string }>,
  });

  const { data, refetch } = useQuery({
    queryKey: ["schedules"],
    queryFn: () => api.get("/schedules"),
    placeholderData: { data: [] },
  });

  const schedules = (data?.data || []).filter((s: any) =>
    !search || s.schedule_name?.toLowerCase().includes(search.toLowerCase())
  );

  const toggleDay = (day: number) => {
    setForm((f) => ({
      ...f,
      work_days: f.work_days.includes(day) ? f.work_days.filter((d) => d !== day) : [...f.work_days, day],
    }));
  };

  const handleCreate = async () => {
    if (!form.schedule_name) { toast.error("Nama jadwal wajib diisi"); return; }
    try {
      const payload = {
        ...form,
        daily_breaks: form.use_daily_breaks ? form.daily_breaks : null,
      };
      await api.post("/schedules", payload);
      toast.success("Jadwal berhasil dibuat");
      onCloseForm();
      setForm({
        schedule_name: "",
        start_time: "08:00",
        end_time: "17:00",
        break_start: "12:00",
        break_end: "13:00",
        work_days: [1, 2, 3, 4, 5],
        use_daily_breaks: false,
        daily_breaks: {},
      });
      refetch();
    } catch (err: any) {
      toast.error(err.message || "Gagal membuat jadwal");
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await api.delete(`/schedules/${id}`);
      toast.success("Jadwal berhasil dihapus");
      refetch();
    } catch (err: any) {
      toast.error(err.message || "Gagal menghapus jadwal");
    }
  };

  return (
    <div className="space-y-4">
      {showForm && (
        <div className="surface-elevated p-5 space-y-4 border border-gold/20 animate-fade-in">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold">Buat Jadwal Baru</h3>
            <button onClick={onCloseForm} className="p-1 rounded hover:bg-accent"><X className="h-4 w-4 text-muted-foreground" /></button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            <input type="text" placeholder="Nama jadwal (e.g. Shift Pagi)" value={form.schedule_name}
              onChange={(e) => setForm({ ...form, schedule_name: e.target.value })}
              className="h-10 px-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring/20 lg:col-span-2" />
            <div className="flex items-center gap-2">
              <label className="text-xs text-muted-foreground whitespace-nowrap">Masuk:</label>
              <input type="time" value={form.start_time}
                onChange={(e) => setForm({ ...form, start_time: e.target.value })}
                className="h-10 px-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring/20 flex-1" />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-xs text-muted-foreground whitespace-nowrap">Pulang:</label>
              <input type="time" value={form.end_time}
                onChange={(e) => setForm({ ...form, end_time: e.target.value })}
                className="h-10 px-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring/20 flex-1" />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <label className="text-xs text-muted-foreground whitespace-nowrap">Istirahat Default:</label>
                <input type="time" value={form.break_start}
                  disabled={form.use_daily_breaks}
                  onChange={(e) => setForm({ ...form, break_start: e.target.value })}
                  className="h-10 px-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring/20 flex-1 disabled:opacity-50" />
                <span className="text-xs text-muted-foreground">-</span>
                <input type="time" value={form.break_end}
                  disabled={form.use_daily_breaks}
                  onChange={(e) => setForm({ ...form, break_end: e.target.value })}
                  className="h-10 px-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring/20 flex-1 disabled:opacity-50" />
              </div>
              <label className="flex items-center gap-2 cursor-pointer mt-1">
                <input type="checkbox" checked={form.use_daily_breaks}
                  onChange={(e) => setForm({ ...form, use_daily_breaks: e.target.checked })}
                  className="rounded border-input text-primary focus:ring-ring" />
                <span className="text-xs text-muted-foreground">Atur Istirahat Berbeda per Hari</span>
              </label>
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1.5 block">Hari Kerja:</label>
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5, 6, 7].map((d) => (
                  <button key={d} onClick={() => toggleDay(d)} className={cn(
                    "h-8 w-8 rounded-full flex items-center justify-center text-2xs font-medium transition-colors",
                    form.work_days.includes(d) ? "bg-gold/20 text-gold border border-gold/40" : "bg-muted/50 text-muted-foreground hover:bg-muted"
                  )}>{dayNames[d]}</button>
                ))}
              </div>
            </div>
          </div>

          {form.use_daily_breaks && (
            <div className="space-y-2 border-t border-border/50 pt-3">
              <p className="text-xs font-semibold text-gold">Kustomisasi Jam Istirahat per Hari:</p>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {form.work_days.map((d) => {
                  const dayBreak = form.daily_breaks[d] || { break_start: form.break_start || "12:00", break_end: form.break_end || "13:00" };
                  return (
                    <div key={d} className="flex items-center gap-2 bg-accent/20 p-2 rounded-md border border-border/30">
                      <span className="text-xs font-medium w-12">{dayNames[d]}:</span>
                      <input type="time" value={dayBreak.break_start}
                        onChange={(e) => setForm({
                          ...form,
                          daily_breaks: {
                            ...form.daily_breaks,
                            [d]: { ...dayBreak, break_start: e.target.value }
                          }
                        })}
                        className="h-8 px-2 rounded-md border border-input bg-background text-xs focus:outline-none focus:ring-1 focus:ring-ring/20 flex-1" />
                      <span className="text-xs text-muted-foreground">-</span>
                      <input type="time" value={dayBreak.break_end}
                        onChange={(e) => setForm({
                          ...form,
                          daily_breaks: {
                            ...form.daily_breaks,
                            [d]: { ...dayBreak, break_end: e.target.value }
                          }
                        })}
                        className="h-8 px-2 rounded-md border border-input bg-background text-xs focus:outline-none focus:ring-1 focus:ring-ring/20 flex-1" />
                    </div>
                  );
                })}
              </div>
            </div>
          )}
          <div className="flex justify-end gap-2">
            <button onClick={onCloseForm} className="px-4 py-2 rounded-md text-sm border border-input hover:bg-accent">Batal</button>
            <button onClick={handleCreate} className="px-4 py-2 rounded-md text-sm bg-primary text-primary-foreground hover:bg-primary/90 font-medium">Simpan Jadwal</button>
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="surface-elevated p-4 flex items-center gap-3">
          <div className="p-2 rounded-md bg-gold/10"><CalendarClock className="h-4 w-4 text-gold" /></div>
          <div><p className="text-lg font-semibold">{schedules.length}</p><p className="text-2xs text-muted-foreground">Total Jadwal</p></div>
        </div>
        <div className="surface-elevated p-4 flex items-center gap-3">
          <div className="p-2 rounded-md bg-success/10"><Users className="h-4 w-4 text-success" /></div>
          <div><p className="text-lg font-semibold">{schedules.reduce((a: number, s: any) => a + (s.assignments?.length || 0), 0)}</p><p className="text-2xs text-muted-foreground">Karyawan Ditugaskan</p></div>
        </div>
        <div className="surface-elevated p-4 flex items-center gap-3">
          <div className="p-2 rounded-md bg-primary/10"><Clock className="h-4 w-4 text-primary" /></div>
          <div><p className="text-lg font-semibold">{schedules.filter((s: any) => s.is_default).length}</p><p className="text-2xs text-muted-foreground">Jadwal Default</p></div>
        </div>
        <div className="surface-elevated p-4 flex items-center gap-3">
          <div className="p-2 rounded-md bg-muted"><Building2 className="h-4 w-4 text-muted-foreground" /></div>
          <div><p className="text-lg font-semibold">{schedules.filter((s: any) => s.is_active).length}</p><p className="text-2xs text-muted-foreground">Jadwal Aktif</p></div>
        </div>
      </div>

      {/* Schedule Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {schedules.length === 0 ? (
          <div className="lg:col-span-2 surface-elevated p-12 text-center">
            <CalendarClock className="h-10 w-10 mx-auto text-muted-foreground/30 mb-3" />
            <p className="text-sm text-muted-foreground">Belum ada jadwal kerja dibuat</p>
            <p className="text-2xs text-muted-foreground mt-1">Klik "Buat Jadwal" untuk memulai</p>
          </div>
        ) : schedules.map((s: any) => (
          <div
            key={s.id}
            onClick={() => setSelectedId(selectedId === s.id ? null : s.id)}
            className="surface-elevated p-5 space-y-3 cursor-pointer hover:shadow-luxury-md transition-shadow"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <p className="text-sm font-medium">{s.schedule_name}</p>
                {s.is_default && <span className="px-2 py-0.5 rounded-full text-2xs bg-gold/10 text-gold font-medium">Default</span>}
              </div>
              <button onClick={(e) => { e.stopPropagation(); handleDelete(s.id); }} className="p-1.5 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors">
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <span className="font-mono">{s.start_time} - {s.end_time}</span>
              {s.daily_breaks && Object.keys(s.daily_breaks).length > 0 ? (
                <span className="text-2xs text-gold font-medium">Istirahat Kustom per Hari</span>
              ) : (
                s.break_start && <span className="text-2xs">Istirahat {s.break_start}-{s.break_end}</span>
              )}
            </div>
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5, 6, 7].map((d) => (
                <span key={d} className={cn(
                  "h-7 w-7 rounded-full flex items-center justify-center text-2xs font-medium",
                  (s.work_days || []).includes(d) ? "bg-gold/10 text-gold" : "bg-muted/50 text-muted-foreground"
                )}>{dayNames[d]}</span>
              ))}
            </div>
            <p className="text-2xs text-muted-foreground flex items-center gap-1">
              <Users className="h-3 w-3" /> {s.assignments?.length || 0} karyawan ditugaskan
            </p>
            {selectedId === s.id && (
              <div className="pt-3 border-t border-border/50 animate-fade-in space-y-3">
                {s.daily_breaks && Object.keys(s.daily_breaks).length > 0 && (
                  <div>
                    <p className="text-luxury-label text-xs mb-1.5 font-medium text-gold">Jam Istirahat per Hari:</p>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                      {Object.entries(s.daily_breaks).map(([day, b]: [string, any]) => (
                        <div key={day} className="text-2xs bg-accent/20 p-1.5 rounded border border-border/30 flex justify-between">
                          <span className="font-medium text-foreground/80">{dayNames[parseInt(day)]}</span>
                          <span className="font-mono text-muted-foreground">{b.break_start} - {b.break_end}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                <div>
                  <p className="text-luxury-label text-xs mb-2">Karyawan yang Ditugaskan</p>
                  {(s.assignments || []).length > 0 ? (
                    <div className="space-y-1.5">
                      {s.assignments.map((a: any, i: number) => (
                        <div key={i} className="flex items-center justify-between py-1">
                          <div className="flex items-center gap-2">
                            <div className="h-6 w-6 rounded-full bg-gold/10 flex items-center justify-center text-2xs font-medium text-gold">
                              {a.employee?.full_name?.charAt(0) || "?"}
                            </div>
                            <span className="text-sm">{a.employee?.full_name || `Karyawan #${i+1}`}</span>
                          </div>
                          <span className="text-2xs text-muted-foreground">
                            Sejak {formatDate(a.effective_from)}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : <p className="text-xs text-muted-foreground">Belum ada karyawan ditugaskan</p>}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Assignments View ─────────────────────────────────────────────────────────

function AssignmentsView({ showForm, onCloseForm, search }: { showForm: boolean; onCloseForm: () => void; search: string }) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    employee_id: "",
    schedule_id: "",
    effective_from: "",
    effective_to: "",
    apply_to_all: false,
  });

  const { data: schedulesData } = useQuery({
    queryKey: ["schedules"],
    queryFn: () => api.get("/schedules"),
    placeholderData: { data: [] },
  });

  const { data: assignmentsData, refetch } = useQuery({
    queryKey: ["schedule-assignments"],
    queryFn: () => api.get("/schedules/assignments/all"),
    placeholderData: { data: [] },
  });

  const { data: employeesData } = useQuery({
    queryKey: ["employees-list"],
    queryFn: () => api.get("/employees"),
    placeholderData: { data: [] },
  });

  const schedules = schedulesData?.data || [];
  const employees = employeesData?.data || [];
  const assignments = (assignmentsData?.data || []).filter((a: any) =>
    !search || a.employee?.full_name?.toLowerCase().includes(search.toLowerCase()) ||
    a.schedule?.schedule_name?.toLowerCase().includes(search.toLowerCase())
  );

  const handleAssign = async () => {
    if ((!form.apply_to_all && !form.employee_id) || !form.schedule_id || !form.effective_from) {
      toast.error("Semua field wajib diisi"); return;
    }
    try {
      if (form.apply_to_all) {
        await api.post("/schedules/assign/bulk", {
          schedule_id: form.schedule_id,
          apply_to_all: true,
          effective_from: form.effective_from,
          effective_to: form.effective_to || undefined,
        });
        toast.success("Jadwal berhasil ditugaskan ke semua karyawan");
      } else {
        await api.post("/schedules/assign", {
          employee_id: form.employee_id,
          schedule_id: form.schedule_id,
          effective_from: form.effective_from,
          effective_to: form.effective_to || undefined,
        });
        toast.success("Karyawan berhasil ditugaskan ke jadwal");
      }
      onCloseForm();
      setForm({ employee_id: "", schedule_id: "", effective_from: "", effective_to: "", apply_to_all: false });
      refetch();
    } catch (err: any) {
      toast.error(err.message || "Gagal menugaskan karyawan");
    }
  };

  const handleRemove = async (id: string) => {
    try {
      await api.delete(`/schedules/assignments/${id}`);
      toast.success("Penugasan berhasil dihapus");
      refetch();
    } catch (err: any) {
      toast.error(err.message || "Gagal menghapus penugasan");
    }
  };

  return (
    <div className="space-y-4">
      {showForm && (
        <div className="surface-elevated p-5 space-y-4 border border-gold/20 animate-fade-in">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold flex items-center gap-2"><UserPlus className="h-4 w-4" /> Tugaskan Karyawan ke Jadwal</h3>
            <button onClick={onCloseForm} className="p-1 rounded hover:bg-accent"><X className="h-4 w-4 text-muted-foreground" /></button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="flex flex-col gap-2">
              <select value={form.employee_id} disabled={form.apply_to_all} onChange={(e) => setForm({ ...form, employee_id: e.target.value })}
                className="h-10 px-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring/20 disabled:opacity-50">
                <option value="">Pilih Karyawan</option>
                {employees.map((e: any) => <option key={e.id} value={e.id}>{e.full_name}</option>)}
              </select>
              <label className="flex items-center gap-2 cursor-pointer mt-1">
                <input type="checkbox" checked={form.apply_to_all}
                  onChange={(e) => setForm({ ...form, apply_to_all: e.target.checked, employee_id: e.target.checked ? "" : form.employee_id })}
                  className="rounded border-input text-primary focus:ring-ring" />
                <span className="text-xs text-muted-foreground">Tugaskan ke Semua Karyawan</span>
              </label>
            </div>
            <div className="flex flex-col">
              <select value={form.schedule_id} onChange={(e) => setForm({ ...form, schedule_id: e.target.value })}
                className="h-10 px-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring/20">
                <option value="">Pilih Jadwal</option>
                {schedules.map((s: any) => <option key={s.id} value={s.id}>{s.schedule_name} ({s.start_time}-{s.end_time})</option>)}
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-2xs text-muted-foreground">Tanggal Mulai:</label>
              <DatePickerInput
                value={form.effective_from}
                onChange={(effective_from) => setForm({ ...form, effective_from })}
                aria-label="Tanggal mulai penugasan"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-2xs text-muted-foreground">Tanggal Selesai (Opsional):</label>
              <DatePickerInput
                value={form.effective_to}
                onChange={(effective_to) => setForm({ ...form, effective_to })}
                min={form.effective_from || undefined}
                aria-label="Tanggal selesai penugasan"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <button onClick={onCloseForm} className="px-4 py-2 rounded-md text-sm border border-input hover:bg-accent">Batal</button>
            <button onClick={handleAssign} className="px-4 py-2 rounded-md text-sm bg-primary text-primary-foreground hover:bg-primary/90 font-medium">Tugaskan</button>
          </div>
        </div>
      )}

      {/* Assignments Table */}
      {assignments.length === 0 ? (
        <div className="surface-elevated p-12 text-center">
          <Users className="h-10 w-10 mx-auto text-muted-foreground/30 mb-3" />
          <p className="text-sm text-muted-foreground">Belum ada penugasan jadwal</p>
          <p className="text-2xs text-muted-foreground mt-1">Klik "Tugaskan Karyawan" untuk memulai</p>
        </div>
      ) : (
        <div className="surface-elevated overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b text-left">
                <th className="px-4 py-3 text-xs font-medium text-muted-foreground">Karyawan</th>
                <th className="px-4 py-3 text-xs font-medium text-muted-foreground">Jadwal</th>
                <th className="px-4 py-3 text-xs font-medium text-muted-foreground">Jam Kerja</th>
                <th className="px-4 py-3 text-xs font-medium text-muted-foreground">Masa Berlaku</th>
                <th className="px-4 py-3 text-xs font-medium text-muted-foreground">Departemen</th>
                <th className="px-4 py-3 text-xs font-medium text-muted-foreground text-right">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {assignments.map((a: any) => (
                <tr key={a.id} className="border-b last:border-0 hover:bg-accent/50 transition-colors">
                  <td className="px-4 py-3 text-sm font-medium">{a.employee?.full_name || "—"}</td>
                  <td className="px-4 py-3 text-sm">{a.schedule?.schedule_name || "—"}</td>
                  <td className="px-4 py-3 text-sm font-mono text-muted-foreground">{a.schedule?.start_time} - {a.schedule?.end_time}</td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">
                    {formatDate(a.effective_from)}
                    {a.effective_to ? ` s/d ${formatDate(a.effective_to)}` : " (Seterusnya)"}
                  </td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">{a.employee?.department?.name || "—"}</td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => handleRemove(a.id)} className="p-1.5 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ─── Absences View ────────────────────────────────────────────────────────────

function AbsencesView({ showForm, onCloseForm }: { showForm: boolean; onCloseForm: () => void }) {
  const [resolvingId, setResolvingId] = useState<string | null>(null);
  const [resolution, setResolution] = useState("");
  const queryClient = useQueryClient();
  const [absForm, setAbsForm] = useState({ employee_id: "", absence_date: "", absence_type: "no_info" });

  const { data, refetch } = useQuery({
    queryKey: ["absences"],
    queryFn: () => api.get("/schedules/absences"),
    placeholderData: { data: [] },
  });

  const absences = data?.data || [];

  const handleRecordAbsence = async () => {
    if (!absForm.absence_date) { toast.error("Tanggal wajib diisi"); return; }
    try {
      await api.post("/schedules/absences", absForm);
      toast.success("Ketidakhadiran berhasil dicatat");
      onCloseForm();
      setAbsForm({ employee_id: "", absence_date: "", absence_type: "no_info" });
      refetch();
    } catch (err: any) {
      toast.error(err.message || "Gagal mencatat ketidakhadiran");
    }
  };

  const handleResolve = async (id: string) => {
    try {
      await api.put(`/schedules/absences/${id}/resolve`, { resolution_note: resolution });
      toast.success("Ketidakhadiran berhasil diresolusi");
      setResolvingId(null);
      setResolution("");
      refetch();
    } catch (err: any) {
      toast.error(err.message || "Gagal melakukan resolusi");
    }
  };

  return (
    <div className="space-y-3">
      {showForm && (
        <div className="surface-elevated p-5 space-y-4 border border-gold/20 animate-fade-in">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold">Catat Ketidakhadiran</h3>
            <button onClick={onCloseForm} className="p-1 rounded hover:bg-accent"><X className="h-4 w-4 text-muted-foreground" /></button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <input type="text" placeholder="ID Karyawan" value={absForm.employee_id}
              onChange={(e) => setAbsForm({ ...absForm, employee_id: e.target.value })}
              className="h-10 px-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring/20" />
            <DatePickerInput
              value={absForm.absence_date}
              onChange={(absence_date) => setAbsForm({ ...absForm, absence_date })}
              aria-label="Tanggal ketidakhadiran"
            />
            <select value={absForm.absence_type} onChange={(e) => setAbsForm({ ...absForm, absence_type: e.target.value })}
              className="h-10 px-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring/20">
              <option value="no_info">Tanpa Keterangan</option>
              <option value="unexcused">Tidak Berizin</option>
              <option value="sick">Sakit</option>
            </select>
          </div>
          <div className="flex justify-end gap-2">
            <button onClick={onCloseForm} className="px-4 py-2 rounded-md text-sm border border-input hover:bg-accent">Batal</button>
            <button onClick={handleRecordAbsence} className="px-4 py-2 rounded-md text-sm bg-primary text-primary-foreground hover:bg-primary/90 font-medium">Simpan</button>
          </div>
        </div>
      )}

      {absences.length === 0 ? (
        <div className="surface-elevated p-12 text-center">
          <AlertTriangle className="h-10 w-10 mx-auto text-muted-foreground/30 mb-3" />
          <p className="text-sm text-muted-foreground">Tidak ada ketidakhadiran tercatat</p>
        </div>
      ) : absences.map((a: any) => (
        <div key={a.id} className="surface-elevated p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={cn("h-2.5 w-2.5 rounded-full", a.resolved ? "bg-success" : "bg-destructive")} />
              <div>
                <p className="text-sm font-medium">{a.employee?.full_name}</p>
                <p className="text-2xs text-muted-foreground">
                  {formatDate(a.absence_date)} • {
                    a.absence_type === "no_info" ? "Tanpa Keterangan" :
                    a.absence_type === "unexcused" ? "Tidak Berizin" : a.absence_type
                  }
                </p>
              </div>
            </div>
            {!a.resolved && (
              <button onClick={() => setResolvingId(resolvingId === a.id ? null : a.id)}
                className="px-3 py-1.5 rounded-md bg-success/10 text-success text-xs font-medium hover:bg-success/20 transition-colors">
                Resolusi
              </button>
            )}
          </div>
          {resolvingId === a.id && (
            <div className="mt-3 pt-3 border-t border-border/50 animate-fade-in space-y-2">
              <textarea placeholder="Catatan resolusi..." value={resolution} onChange={(e) => setResolution(e.target.value)}
                className="w-full h-20 px-3 py-2 rounded-md border border-input bg-background text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring/20" />
              <div className="flex gap-2">
                <button onClick={() => setResolvingId(null)} className="px-3 py-1.5 rounded text-xs border border-input hover:bg-accent">Batal</button>
                <button onClick={() => handleResolve(a.id)} className="px-3 py-1.5 rounded text-xs bg-success/10 text-success hover:bg-success/20 font-medium">Konfirmasi</button>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// ─── Holidays View ────────────────────────────────────────────────────────────

function HolidaysView({ showForm, onCloseForm }: { showForm: boolean; onCloseForm: () => void }) {
  const [holidayForm, setHolidayForm] = useState({ holiday_name: "", holiday_date: "", type: "public" });
  const [showInlineAdd, setShowInlineAdd] = useState<"public" | "company" | null>(null);
  const queryClient = useQueryClient();

  const { data: publicH, refetch: refetchPublic } = useQuery({ queryKey: ["public-holidays"], queryFn: () => api.get("/settings/public-holidays"), placeholderData: { data: [] } });
  const { data: companyH, refetch: refetchCompany } = useQuery({ queryKey: ["company-holidays"], queryFn: () => api.get("/schedules/company-holidays"), placeholderData: { data: [] } });

  const handleAddHoliday = async (type: "public" | "company") => {
    if (!holidayForm.holiday_name || !holidayForm.holiday_date) { toast.error("Nama dan tanggal wajib diisi"); return; }
    const endpoint = type === "public" ? "/settings/public-holidays" : "/schedules/company-holidays";
    try {
      await api.post(endpoint, { holiday_name: holidayForm.holiday_name, holiday_date: holidayForm.holiday_date });
      toast.success("Hari libur berhasil ditambahkan");
      setShowInlineAdd(null);
      setHolidayForm({ holiday_name: "", holiday_date: "", type: "public" });
      type === "public" ? refetchPublic() : refetchCompany();
    } catch (err: any) {
      toast.error(err.message || "Gagal menambah hari libur");
    }
  };

  return (
    <div className="space-y-4">
      {showForm && (
        <div className="surface-elevated p-5 space-y-4 border border-gold/20 animate-fade-in">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold">Tambah Hari Libur</h3>
            <button onClick={onCloseForm} className="p-1 rounded hover:bg-accent"><X className="h-4 w-4 text-muted-foreground" /></button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <input type="text" placeholder="Nama hari libur" value={holidayForm.holiday_name}
              onChange={(e) => setHolidayForm({ ...holidayForm, holiday_name: e.target.value })}
              className="h-10 px-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring/20" />
            <DatePickerInput
              value={holidayForm.holiday_date}
              onChange={(holiday_date) => setHolidayForm({ ...holidayForm, holiday_date })}
              aria-label="Tanggal libur"
            />
            <select value={holidayForm.type} onChange={(e) => setHolidayForm({ ...holidayForm, type: e.target.value })}
              className="h-10 px-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring/20">
              <option value="public">Nasional</option>
              <option value="company">Perusahaan</option>
            </select>
          </div>
          <div className="flex justify-end gap-2">
            <button onClick={onCloseForm} className="px-4 py-2 rounded-md text-sm border border-input hover:bg-accent">Batal</button>
            <button onClick={() => handleAddHoliday(holidayForm.type as any)} className="px-4 py-2 rounded-md text-sm bg-primary text-primary-foreground hover:bg-primary/90 font-medium">Simpan</button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="surface-elevated p-5 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold">Hari Libur Nasional</p>
            <button onClick={() => setShowInlineAdd(showInlineAdd === "public" ? null : "public")} className="text-2xs text-gold">+ Tambah</button>
          </div>
          {showInlineAdd === "public" && (
            <div className="p-3 rounded-md border border-border/50 space-y-2 animate-fade-in">
              <input type="text" placeholder="Nama hari libur" value={holidayForm.holiday_name}
                onChange={(e) => setHolidayForm({ ...holidayForm, holiday_name: e.target.value })}
                className="w-full h-9 px-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring/20" />
              <DatePickerInput
                value={holidayForm.holiday_date}
                onChange={(holiday_date) => setHolidayForm({ ...holidayForm, holiday_date })}
                aria-label="Tanggal libur perusahaan"
              />
              <div className="flex gap-2">
                <button onClick={() => setShowInlineAdd(null)} className="px-3 py-1.5 rounded text-xs border border-input hover:bg-accent">Batal</button>
                <button onClick={() => handleAddHoliday("public")} className="px-3 py-1.5 rounded text-xs bg-gold/10 text-gold hover:bg-gold/20 font-medium">Simpan</button>
              </div>
            </div>
          )}
          {(publicH?.data || []).length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">Belum ada</p>
          ) : (publicH?.data || []).map((h: any) => (
            <div key={h.id} className="flex justify-between py-2 border-b border-border/50 last:border-0">
              <span className="text-sm">{h.holiday_name}</span>
              <span className="text-2xs text-muted-foreground font-mono">{formatDate(h.holiday_date)}</span>
            </div>
          ))}
        </div>

        <div className="surface-elevated p-5 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold">Hari Libur Perusahaan</p>
            <button onClick={() => setShowInlineAdd(showInlineAdd === "company" ? null : "company")} className="text-2xs text-gold">+ Tambah</button>
          </div>
          {showInlineAdd === "company" && (
            <div className="p-3 rounded-md border border-border/50 space-y-2 animate-fade-in">
              <input type="text" placeholder="Nama hari libur" value={holidayForm.holiday_name}
                onChange={(e) => setHolidayForm({ ...holidayForm, holiday_name: e.target.value })}
                className="w-full h-9 px-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring/20" />
              <DatePickerInput
                value={holidayForm.holiday_date}
                onChange={(holiday_date) => setHolidayForm({ ...holidayForm, holiday_date })}
                aria-label="Tanggal libur perusahaan"
              />
              <div className="flex gap-2">
                <button onClick={() => setShowInlineAdd(null)} className="px-3 py-1.5 rounded text-xs border border-input hover:bg-accent">Batal</button>
                <button onClick={() => handleAddHoliday("company")} className="px-3 py-1.5 rounded text-xs bg-gold/10 text-gold hover:bg-gold/20 font-medium">Simpan</button>
              </div>
            </div>
          )}
          {(companyH?.data || []).length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">Belum ada</p>
          ) : (companyH?.data || []).map((h: any) => (
            <div key={h.id} className="flex justify-between py-2 border-b border-border/50 last:border-0">
              <span className="text-sm">{h.holiday_name}</span>
              <span className="text-2xs text-muted-foreground font-mono">{formatDate(h.holiday_date)}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
