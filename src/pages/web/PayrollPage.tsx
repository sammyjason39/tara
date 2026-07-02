import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { useFeatureFlags } from "@/contexts/FeatureFlagsContext";
import { Banknote, Plus, FileText, CreditCard, ChevronRight, X } from "lucide-react";
import { DatePickerInput } from "@/components/DatePickerInput";
import { formatDate, formatDateRange } from "@/lib/dates";
import { cn } from "@/lib/utils";

const allTabs = [
  { id: "periods", label: "Periode Gaji" },
  { id: "components", label: "Komponen" },
  { id: "loans", label: "Pinjaman / Kasbon", feature: "loans" as const },
];

export function PayrollPage() {
  const [activeTab, setActiveTab] = useState("periods");
  const [showCreateForm, setShowCreateForm] = useState(false);
  const { isEnabled } = useFeatureFlags();

  const tabs = useMemo(
    () => allTabs.filter((t) => !t.feature || isEnabled(t.feature)),
    [isEnabled],
  );

  const effectiveTab = tabs.some((t) => t.id === activeTab)
    ? activeTab
    : tabs[0]?.id ?? "periods";

  const handleMainAction = () => {
    setShowCreateForm(true);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-luxury-heading text-2xl">Penggajian</h1>
          <p className="text-sm text-muted-foreground mt-1">Kelola payroll, slip gaji, dan pinjaman karyawan</p>
        </div>
        {effectiveTab !== "loans" && (
          <button
            onClick={handleMainAction}
            className="flex items-center gap-2 px-4 py-2.5 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            <Plus className="h-4 w-4" />
            {effectiveTab === "periods" ? "Buat Periode" : "Tambah Komponen"}
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-lg bg-secondary/50 w-fit">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => { setActiveTab(t.id); setShowCreateForm(false); }}
            className={cn(
              "px-4 py-1.5 rounded-md text-sm font-medium transition-all",
              effectiveTab === t.id ? "bg-card shadow-luxury text-foreground" : "text-muted-foreground hover:text-foreground"
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {effectiveTab === "periods" && <PeriodsView showForm={showCreateForm} onCloseForm={() => setShowCreateForm(false)} />}
      {effectiveTab === "components" && <ComponentsView showForm={showCreateForm} onCloseForm={() => setShowCreateForm(false)} />}
      {effectiveTab === "loans" && <LoansView />}
    </div>
  );
}

function PeriodsView({ showForm, onCloseForm }: { showForm: boolean; onCloseForm: () => void }) {
  const [selectedPeriodId, setSelectedPeriodId] = useState<string | null>(null);
  const [form, setForm] = useState({ period_name: "", start_date: "", end_date: "" });

  const { data, isLoading } = useQuery({
    queryKey: ["payroll-periods"],
    queryFn: () => api.get("/payroll/periods"),
    placeholderData: { data: [] },
  });

  const periods = data?.data || [];

  const handleCreate = async () => {
    if (!form.period_name || !form.start_date || !form.end_date) {
      toast.error("Semua field wajib diisi");
      return;
    }
    try {
      await api.post("/payroll/periods", form);
      toast.success("Periode berhasil dibuat");
      onCloseForm();
      setForm({ period_name: "", start_date: "", end_date: "" });
    } catch (err: any) {
      toast.error(err.message || "Gagal membuat periode");
    }
  };

  return (
    <div className="space-y-3">
      {/* Create Form */}
      {showForm && (
        <div className="surface-elevated p-5 space-y-4 border border-gold/20 animate-fade-in">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold">Buat Periode Baru</h3>
            <button onClick={onCloseForm} className="p-1 rounded hover:bg-accent"><X className="h-4 w-4 text-muted-foreground" /></button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <input
              type="text" placeholder="Nama periode (cth: Juni 2026)" value={form.period_name}
              onChange={(e) => setForm({ ...form, period_name: e.target.value })}
              className="h-10 px-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring/20"
            />
            <DatePickerInput
              value={form.start_date}
              onChange={(start_date) => setForm({ ...form, start_date })}
              aria-label="Tanggal mulai periode gaji"
            />
            <DatePickerInput
              value={form.end_date}
              onChange={(end_date) => setForm({ ...form, end_date })}
              min={form.start_date || undefined}
              aria-label="Tanggal selesai periode gaji"
            />
          </div>
          <div className="flex justify-end gap-2">
            <button onClick={onCloseForm} className="px-4 py-2 rounded-md text-sm border border-input hover:bg-accent transition-colors">Batal</button>
            <button onClick={handleCreate} className="px-4 py-2 rounded-md text-sm bg-primary text-primary-foreground hover:bg-primary/90 font-medium">Simpan</button>
          </div>
        </div>
      )}

      {isLoading ? (
        Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="surface-elevated p-5 animate-pulse"><div className="h-5 w-40 bg-muted rounded" /></div>
        ))
      ) : periods.length === 0 ? (
        <div className="surface-elevated p-12 text-center">
          <Banknote className="h-10 w-10 mx-auto text-muted-foreground/30 mb-3" />
          <p className="text-sm text-muted-foreground">Belum ada periode penggajian</p>
          <p className="text-2xs text-muted-foreground mt-1">Buat periode baru untuk mulai memproses gaji</p>
        </div>
      ) : (
        periods.map((p: any) => (
          <div key={p.id}>
            <div
              onClick={() => setSelectedPeriodId(selectedPeriodId === p.id ? null : p.id)}
              className="surface-elevated p-5 flex items-center justify-between hover:shadow-luxury-md transition-shadow cursor-pointer"
            >
              <div className="flex items-center gap-4">
                <div className="h-10 w-10 rounded-md bg-gold/10 flex items-center justify-center">
                  <FileText className="h-5 w-5 text-gold" />
                </div>
                <div>
                  <p className="text-sm font-medium">{p.period_name}</p>
                  <p className="text-2xs text-muted-foreground">
                    {formatDateRange(p.start_date, p.end_date)}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className={cn(
                  "px-2 py-0.5 rounded-full text-2xs font-medium",
                  p.status === "paid" ? "bg-success/10 text-success" :
                  p.status === "finalized" ? "bg-info/10 text-info" :
                  "bg-warning/10 text-warning"
                )}>
                  {p.status === "paid" ? "Dibayar" : p.status === "finalized" ? "Final" : p.status === "processing" ? "Proses" : "Draft"}
                </span>
                <ChevronRight className={cn("h-4 w-4 text-muted-foreground transition-transform", selectedPeriodId === p.id && "rotate-90")} />
              </div>
            </div>
            {selectedPeriodId === p.id && (
              <div className="surface-elevated mt-1 p-5 border-t border-gold/10 animate-fade-in">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div><p className="text-luxury-label mb-1">Periode</p><p>{p.period_name}</p></div>
                  <div><p className="text-luxury-label mb-1">Status</p><p className="capitalize">{p.status}</p></div>
                  <div><p className="text-luxury-label mb-1">Mulai</p><p>{formatDate(p.start_date)}</p></div>
                  <div><p className="text-luxury-label mb-1">Selesai</p><p>{formatDate(p.end_date)}</p></div>
                </div>
                <p className="text-2xs text-muted-foreground mt-3">Klik untuk melihat slip gaji pada halaman detail (segera hadir)</p>
              </div>
            )}
          </div>
        ))
      )}
    </div>
  );
}

function ComponentsView({ showForm, onCloseForm }: { showForm: boolean; onCloseForm: () => void }) {
  const [compForm, setCompForm] = useState({ component_name: "", component_type: "addition", default_amount: "", category: "allowance" });
  const [showInlineAdd, setShowInlineAdd] = useState<"addition" | "deduction" | null>(null);

  const { data } = useQuery({
    queryKey: ["payroll-components"],
    queryFn: () => api.get("/payroll/components"),
    placeholderData: { data: [] },
  });

  const components = data?.data || [];
  const additions = components.filter((c: any) => c.component_type === "addition");
  const deductions = components.filter((c: any) => c.component_type === "deduction");

  const handleAddComponent = async (type: "addition" | "deduction") => {
    if (!compForm.component_name || !compForm.default_amount) {
      toast.error("Nama dan nominal wajib diisi");
      return;
    }
    try {
      await api.post("/payroll/components", { ...compForm, component_type: type });
      toast.success("Komponen berhasil ditambahkan");
      setShowInlineAdd(null);
      setCompForm({ component_name: "", component_type: "addition", default_amount: "", category: "allowance" });
    } catch (err: any) {
      toast.error(err.message || "Gagal menambah komponen");
    }
  };

  return (
    <div className="space-y-4">
      {/* Main form triggered by top button */}
      {showForm && (
        <div className="surface-elevated p-5 space-y-4 border border-gold/20 animate-fade-in">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold">Tambah Komponen Baru</h3>
            <button onClick={onCloseForm} className="p-1 rounded hover:bg-accent"><X className="h-4 w-4 text-muted-foreground" /></button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <input type="text" placeholder="Nama komponen" value={compForm.component_name}
              onChange={(e) => setCompForm({ ...compForm, component_name: e.target.value })}
              className="h-10 px-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring/20" />
            <input type="number" placeholder="Nominal" value={compForm.default_amount}
              onChange={(e) => setCompForm({ ...compForm, default_amount: e.target.value })}
              className="h-10 px-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring/20" />
            <select value={compForm.component_type} onChange={(e) => setCompForm({ ...compForm, component_type: e.target.value })}
              className="h-10 px-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring/20">
              <option value="addition">Penambahan</option>
              <option value="deduction">Potongan</option>
            </select>
            <select value={compForm.category} onChange={(e) => setCompForm({ ...compForm, category: e.target.value })}
              className="h-10 px-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring/20">
              <option value="allowance">Tunjangan</option>
              <option value="bonus">Bonus</option>
              <option value="tax">Pajak</option>
              <option value="insurance">Asuransi</option>
              <option value="other">Lainnya</option>
            </select>
          </div>
          <div className="flex justify-end gap-2">
            <button onClick={onCloseForm} className="px-4 py-2 rounded-md text-sm border border-input hover:bg-accent">Batal</button>
            <button onClick={() => handleAddComponent(compForm.component_type as any)} className="px-4 py-2 rounded-md text-sm bg-primary text-primary-foreground hover:bg-primary/90 font-medium">Simpan</button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Additions */}
        <div className="surface-elevated p-5 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-success">Penambahan (Addition)</p>
            <button onClick={() => setShowInlineAdd(showInlineAdd === "addition" ? null : "addition")} className="text-2xs text-gold hover:text-gold/80">+ Tambah</button>
          </div>
          {showInlineAdd === "addition" && (
            <div className="p-3 rounded-md border border-border/50 space-y-2 animate-fade-in">
              <input type="text" placeholder="Nama komponen" value={compForm.component_name}
                onChange={(e) => setCompForm({ ...compForm, component_name: e.target.value })}
                className="w-full h-9 px-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring/20" />
              <input type="number" placeholder="Nominal" value={compForm.default_amount}
                onChange={(e) => setCompForm({ ...compForm, default_amount: e.target.value })}
                className="w-full h-9 px-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring/20" />
              <div className="flex gap-2">
                <button onClick={() => setShowInlineAdd(null)} className="px-3 py-1.5 rounded text-xs border border-input hover:bg-accent">Batal</button>
                <button onClick={() => handleAddComponent("addition")} className="px-3 py-1.5 rounded text-xs bg-success/10 text-success hover:bg-success/20 font-medium">Simpan</button>
              </div>
            </div>
          )}
          {additions.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">Belum ada komponen</p>
          ) : additions.map((c: any) => (
            <div key={c.id} className="flex items-center justify-between py-2 border-b border-border/50 last:border-0">
              <div>
                <p className="text-sm">{c.component_name}</p>
                <p className="text-2xs text-muted-foreground capitalize">{c.category}</p>
              </div>
              <span className="text-sm font-mono text-success">
                +{c.is_percentage ? `${c.default_amount}%` : `Rp ${Number(c.default_amount || 0).toLocaleString("id-ID")}`}
              </span>
            </div>
          ))}
        </div>

        {/* Deductions */}
        <div className="surface-elevated p-5 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-destructive">Potongan (Deduction)</p>
            <button onClick={() => setShowInlineAdd(showInlineAdd === "deduction" ? null : "deduction")} className="text-2xs text-gold hover:text-gold/80">+ Tambah</button>
          </div>
          {showInlineAdd === "deduction" && (
            <div className="p-3 rounded-md border border-border/50 space-y-2 animate-fade-in">
              <input type="text" placeholder="Nama komponen" value={compForm.component_name}
                onChange={(e) => setCompForm({ ...compForm, component_name: e.target.value })}
                className="w-full h-9 px-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring/20" />
              <input type="number" placeholder="Nominal" value={compForm.default_amount}
                onChange={(e) => setCompForm({ ...compForm, default_amount: e.target.value })}
                className="w-full h-9 px-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring/20" />
              <div className="flex gap-2">
                <button onClick={() => setShowInlineAdd(null)} className="px-3 py-1.5 rounded text-xs border border-input hover:bg-accent">Batal</button>
                <button onClick={() => handleAddComponent("deduction")} className="px-3 py-1.5 rounded text-xs bg-destructive/10 text-destructive hover:bg-destructive/20 font-medium">Simpan</button>
              </div>
            </div>
          )}
          {deductions.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">Belum ada komponen</p>
          ) : deductions.map((c: any) => (
            <div key={c.id} className="flex items-center justify-between py-2 border-b border-border/50 last:border-0">
              <div>
                <p className="text-sm">{c.component_name}</p>
                <p className="text-2xs text-muted-foreground capitalize">{c.category}</p>
              </div>
              <span className="text-sm font-mono text-destructive">
                -{c.is_percentage ? `${c.default_amount}%` : `Rp ${Number(c.default_amount || 0).toLocaleString("id-ID")}`}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function LoansView() {
  const [selectedLoanId, setSelectedLoanId] = useState<string | null>(null);

  const { data } = useQuery({
    queryKey: ["loans"],
    queryFn: () => api.get("/payroll/loans"),
    placeholderData: { data: [] },
  });

  const loans = data?.data || [];

  return (
    <div className="space-y-3">
      {loans.length === 0 ? (
        <div className="surface-elevated p-12 text-center">
          <CreditCard className="h-10 w-10 mx-auto text-muted-foreground/30 mb-3" />
          <p className="text-sm text-muted-foreground">Belum ada pinjaman / kasbon</p>
        </div>
      ) : loans.map((l: any) => (
        <div key={l.id}>
          <div
            onClick={() => setSelectedLoanId(selectedLoanId === l.id ? null : l.id)}
            className="surface-elevated p-5 flex items-center justify-between cursor-pointer hover:shadow-luxury-md transition-shadow"
          >
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-full bg-gold/10 flex items-center justify-center">
                <span className="text-xs font-semibold text-gold">{l.employee?.full_name?.charAt(0)}</span>
              </div>
              <div>
                <p className="text-sm font-medium">{l.employee?.full_name}</p>
                <p className="text-2xs text-muted-foreground capitalize">{l.loan_type} • Rp {Number(l.amount).toLocaleString("id-ID")}</p>
              </div>
            </div>
            <span className={cn(
              "px-2 py-0.5 rounded-full text-2xs font-medium",
              l.status === "active" ? "bg-info/10 text-info" :
              l.status === "paid_off" ? "bg-success/10 text-success" :
              l.status === "pending" ? "bg-warning/10 text-warning" :
              "bg-muted text-muted-foreground"
            )}>
              {l.status === "active" ? "Aktif" : l.status === "paid_off" ? "Lunas" : l.status === "pending" ? "Menunggu" : l.status}
            </span>
          </div>
          {selectedLoanId === l.id && (
            <div className="surface-elevated mt-1 p-5 border-t border-gold/10 animate-fade-in">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div><p className="text-luxury-label mb-1">Tipe</p><p className="capitalize">{l.loan_type}</p></div>
                <div><p className="text-luxury-label mb-1">Jumlah</p><p>Rp {Number(l.amount).toLocaleString("id-ID")}</p></div>
                <div><p className="text-luxury-label mb-1">Sisa</p><p>Rp {Number(l.remaining_amount || 0).toLocaleString("id-ID")}</p></div>
                <div><p className="text-luxury-label mb-1">Cicilan/bulan</p><p>Rp {Number(l.installment_amount || 0).toLocaleString("id-ID")}</p></div>
              </div>
              {l.notes && <p className="text-xs text-muted-foreground mt-3">Catatan: {l.notes}</p>}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
