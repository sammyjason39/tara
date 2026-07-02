import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { api } from "@/lib/api";
import {
  Bot, Clock, CalendarDays, Bell, Server,
  Building2, Users, Shield, Key, Send,
  Trash2, TestTube, Wifi, X, Save, Activity, Pencil, Building, Plus,
  ToggleLeft, ToggleRight, Layers,
} from "lucide-react";
import { AiAgentSettingsSection } from "./AiAgentSettingsSection";
import { BrandingSettingsPanel } from "@/components/BrandingSettingsPanel";
import { CompanyLogo } from "@/components/CompanyLogo";
import { DEFAULT_BRANDING } from "@/lib/color-utils";
import { useBranding } from "@/contexts/BrandingContext";
import { useFeatureFlags } from "@/contexts/FeatureFlagsContext";
import { FEATURE_GROUP_LABELS, type FeatureKey, type FeatureModules } from "@/lib/feature-flags";
import { cn } from "@/lib/utils";

const sections = [
  { id: "company", label: "Profil Perusahaan", icon: Building },
  { id: "features", label: "Fitur Modul", icon: Layers },
  { id: "agents", label: "Agen Otonom", icon: Bot },
  { id: "organization", label: "Organisasi", icon: Building2 },
  { id: "users", label: "Akun & Akses", icon: Key },
  { id: "attendance", label: "Kehadiran", icon: Clock },
  { id: "leaves", label: "Kebijakan Cuti", icon: CalendarDays },
  { id: "channels", label: "Kanal Notifikasi", icon: Send },
  { id: "ai", label: "AI Agent", icon: Bot },
];

export function SettingsPage() {
  const [active, setActive] = useState("company");
  const { isEnabled } = useFeatureFlags();
  const visibleSections = sections.filter(
    (s) => s.id !== "ai" || isEnabled("ai_assistant"),
  );

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-luxury-heading text-2xl">Pengaturan</h1>
        <p className="text-sm text-muted-foreground mt-1">Konfigurasi lengkap sistem TARA</p>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <nav className="lg:col-span-1 space-y-0.5">
          {visibleSections.map((s) => (
            <button key={s.id} onClick={() => setActive(s.id)}
              className={cn("w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-sm transition-all text-left",
                active === s.id ? "bg-accent shadow-luxury text-foreground font-medium" : "text-muted-foreground hover:text-foreground hover:bg-accent/50")}>
              <s.icon className="h-4 w-4 shrink-0" />{s.label}
            </button>
          ))}
        </nav>
        <div className="lg:col-span-4">
          {active === "company" && <CompanySection />}
          {active === "features" && <FeaturesSection />}
          {active === "agents" && <AgentsSection />}
          {active === "organization" && <OrganizationSection />}
          {active === "users" && <UsersSection />}
          {active === "attendance" && <AttendanceSection />}
          {active === "leaves" && <LeavesSection />}
          {active === "channels" && <ChannelsSection />}
          {active === "ai" && <AiAgentSettingsSection />}
        </div>
      </div>
    </div>
  );
}

// === FEATURE MODULES ===
function FeaturesSection() {
  const queryClient = useQueryClient();
  const { refreshFeatures } = useFeatureFlags();
  const { data, isLoading } = useQuery({
    queryKey: ["feature-settings"],
    queryFn: () => api.get("/settings/features"),
  });

  const [modules, setModules] = useState<FeatureModules | null>(null);
  const [saving, setSaving] = useState(false);

  const definitions = data?.data?.definitions ?? [];
  const loadedModules: FeatureModules | null = data?.data?.modules ?? null;

  const current = modules ?? loadedModules;

  const toggle = (key: FeatureKey) => {
    if (!current) return;
    setModules({ ...current, [key]: !current[key] });
  };

  const handleSave = async () => {
    if (!current) return;
    setSaving(true);
    try {
      await api.put("/settings/features", { modules: current });
      await queryClient.invalidateQueries({ queryKey: ["feature-settings"] });
      await refreshFeatures();
      setModules(null);
      toast.success("Konfigurasi fitur disimpan");
    } catch (e: any) {
      toast.error(e.message || "Gagal menyimpan");
    } finally {
      setSaving(false);
    }
  };

  const grouped = (["core", "hr", "finance", "advanced"] as const).map((group) => ({
    group,
    label: FEATURE_GROUP_LABELS[group],
    items: definitions.filter((d: { group: string }) => d.group === group),
  }));

  if (isLoading || !current) {
    return <div className="surface-elevated p-8 text-sm text-muted-foreground text-center">Memuat konfigurasi fitur...</div>;
  }

  return (
    <div className="space-y-6">
      <SH
        title="Fitur Modul"
        sub="Aktifkan atau nonaktifkan modul sesuai kebutuhan perusahaan. Fitur yang dinonaktifkan disembunyikan dari menu dan diblokir di API."
      />

      {grouped.map(({ group, label, items }) =>
        items.length === 0 ? null : (
          <div key={group} className="surface-elevated p-5 space-y-3">
            <p className="text-luxury-label">{label}</p>
            {items.map((def: { key: FeatureKey; label: string; description: string }) => (
              <div
                key={def.key}
                className="flex items-center justify-between gap-4 py-2 border-b border-border/50 last:border-0"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium">{def.label}</p>
                  <p className="text-2xs text-muted-foreground mt-0.5">{def.description}</p>
                </div>
                <Toggle on={current[def.key]} onToggle={() => toggle(def.key)} />
              </div>
            ))}
          </div>
        ),
      )}

      <div className="flex items-center gap-3">
        <button
          onClick={handleSave}
          disabled={saving || modules === null}
          className="px-4 py-2.5 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-50"
        >
          <Save className="h-3.5 w-3.5 inline mr-1.5" />
          {saving ? "Menyimpan..." : "Simpan Konfigurasi Fitur"}
        </button>
        {modules !== null && (
          <button
            onClick={() => setModules(null)}
            className="px-3 py-2 rounded-md border border-input text-sm hover:bg-accent"
          >
            Batalkan
          </button>
        )}
      </div>
    </div>
  );
}

// === COMPANY PROFILE ===
function CompanySection() {
  const queryClient = useQueryClient();
  const { refreshBranding } = useBranding();
  const { data, isLoading } = useQuery({
    queryKey: ["company-settings"],
    queryFn: () => api.get("/settings/company"),
    placeholderData: { data: {} },
  });

  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    company_name: "",
    legal_name: "",
    industry: "",
    tax_id: "",
    email: "",
    phone: "",
    website: "",
    address: "",
    founded_year: "",
  });

  // Sync form when data loads
  const company = data?.data || {};
  const formReady = form.company_name || !company.company_name;

  const startEdit = () => {
    setForm({
      company_name: company.company_name || "",
      legal_name: company.legal_name || "",
      industry: company.industry || "",
      tax_id: company.tax_id || "",
      email: company.email || "",
      phone: company.phone || "",
      website: company.website || "",
      address: company.address || "",
      founded_year: company.founded_year || "",
    });
    setEditing(true);
  };

  const saveCompany = async () => {
    if (!form.company_name) { toast.error("Nama perusahaan wajib diisi"); return; }
    try {
      await api.put("/settings/company", form);
      toast.success("Profil perusahaan berhasil disimpan");
      queryClient.invalidateQueries({ queryKey: ["company-settings"] });
      await refreshBranding();
      setEditing(false);
    } catch (err: any) {
      toast.error(err.message || "Gagal menyimpan");
    }
  };

  return (
    <div className="space-y-6">
      <SH title="Profil Perusahaan" sub="Kelola informasi dasar perusahaan" />
      <div className="surface-elevated p-6 space-y-5">
        {!editing ? (
          <>
            <div className="flex items-center justify-between">
              <CompanyLogo size="lg" subtitle={company.legal_name || ""} />
              <button onClick={startEdit} className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-gold/10 text-gold text-xs font-medium hover:bg-gold/20">
                <Pencil className="h-3 w-3" /> Edit
              </button>
            </div>
            <div className="divider-luxury" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <InfoRow label="Industri" value={company.industry} />
              <InfoRow label="NPWP" value={company.tax_id} />
              <InfoRow label="Email" value={company.email} />
              <InfoRow label="Telepon" value={company.phone} />
              <InfoRow label="Website" value={company.website} />
              <InfoRow label="Tahun Berdiri" value={company.founded_year} />
              <div className="md:col-span-2">
                <InfoRow label="Alamat" value={company.address} />
              </div>
            </div>
          </>
        ) : (
          <>
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium">Edit Profil Perusahaan</p>
              <button onClick={() => setEditing(false)} className="p-1.5 rounded hover:bg-accent">
                <X className="h-4 w-4 text-muted-foreground" />
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Inp label="Nama Perusahaan *" value={form.company_name} onChange={v => setForm({...form, company_name: v})} placeholder="Nama perusahaan Anda" />
              <Inp label="Nama Legal" value={form.legal_name} onChange={v => setForm({...form, legal_name: v})} placeholder="Nama legal perusahaan" />
              <Inp label="Industri" value={form.industry} onChange={v => setForm({...form, industry: v})} placeholder="Teknologi Informasi" />
              <Inp label="NPWP" value={form.tax_id} onChange={v => setForm({...form, tax_id: v})} placeholder="01.234.567.8-901.000" />
              <Inp label="Email" value={form.email} onChange={v => setForm({...form, email: v})} placeholder="info@company.com" />
              <Inp label="Telepon" value={form.phone} onChange={v => setForm({...form, phone: v})} placeholder="021-7654321" />
              <Inp label="Website" value={form.website} onChange={v => setForm({...form, website: v})} placeholder="https://company.com" />
              <Inp label="Tahun Berdiri" value={form.founded_year} onChange={v => setForm({...form, founded_year: v})} placeholder="2015" />
              <div className="md:col-span-2">
                <Inp label="Alamat Lengkap" value={form.address} onChange={v => setForm({...form, address: v})} placeholder="Jl. Sudirman No. 123, Jakarta Selatan" />
              </div>
            </div>
            <div className="flex gap-2 pt-2">
              <button onClick={() => setEditing(false)} className="px-4 py-2 rounded-md text-sm border border-input hover:bg-accent">Batal</button>
              <button onClick={saveCompany} className="px-4 py-2 rounded-md text-sm bg-primary text-primary-foreground font-medium hover:bg-primary/90">
                <Save className="h-3.5 w-3.5 inline mr-1.5" />Simpan
              </button>
            </div>
          </>
        )}
      </div>

      <SH title="Branding & Tampilan" sub="Logo, warna aplikasi, dan pengaturan mode gelap" />
      <BrandingSettingsPanel
        initialBranding={company.branding || DEFAULT_BRANDING}
        logoUrl={company.logo_url}
      />
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value?: string }) {
  return (
    <div>
      <p className="text-2xs text-muted-foreground">{label}</p>
      <p className="text-sm font-medium mt-0.5">{value || "—"}</p>
    </div>
  );
}

// === AGENTS ===
function AgentsSection() {
  const agents = [
    { name: "Leave Request Agent", key: "leave_request", desc: "Proses otomatis permohonan cuti" },
    { name: "Absensi Agent", key: "absensi", desc: "Monitoring kehadiran real-time" },
    { name: "Clock Confirmation Agent", key: "clock_confirmation", desc: "Konfirmasi clock-in/out otomatis" },
    { name: "Weekly Checkin Agent", key: "weekly_checkin", desc: "Distribusi form check-in mingguan" },
    { name: "Late Report Agent", key: "late_report", desc: "Laporan keterlambatan harian" },
    { name: "Onboarding Agent", key: "onboarding", desc: "Alur onboarding 7 langkah" },
    { name: "Saldo Cuti Agent", key: "saldo_cuti", desc: "Informasi saldo cuti real-time" },
  ];
  const [toggles, setToggles] = useState<Record<string, boolean>>(() => Object.fromEntries(agents.map(a => [a.key, true])));
  const toggle = (key: string) => {
    setToggles((p) => ({ ...p, [key]: !p[key] }));
    toast.info("Toggle agen hanya tampilan UI — gunakan tab AI Agent untuk konfigurasi produksi");
  };
  return (
    <div className="space-y-4">
      <SH title="Agen Otonom" sub="Kelola status dan konfigurasi 7 agen HR" />
      {agents.map(a => (
        <div key={a.key} className="surface-elevated p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={cn("h-2.5 w-2.5 rounded-full", toggles[a.key] ? "bg-success animate-pulse" : "bg-muted-foreground/30")} />
            <div><p className="text-sm font-medium">{a.name}</p><p className="text-2xs text-muted-foreground">{a.desc}</p></div>
          </div>
          <Toggle on={toggles[a.key]} onToggle={() => toggle(a.key)} />
        </div>
      ))}
      <p className="text-2xs text-muted-foreground">HR tetap dapat melakukan semua tugas secara manual meskipun agen aktif.</p>
    </div>
  );
}

// === ORGANIZATION ===
function asList<T>(value: unknown): T[] {
  return Array.isArray(value) ? value : [];
}

function OrganizationSection() {
  const queryClient = useQueryClient();
  const { data: officesRes, isError: officesError } = useQuery({
    queryKey: ["admin-offices"],
    queryFn: () => api.get("/admin/offices"),
    placeholderData: { data: [] },
  });
  const { data: departmentsRes, isError: departmentsError } = useQuery({
    queryKey: ["admin-departments"],
    queryFn: () => api.get("/admin/departments"),
    placeholderData: { data: [] },
  });
  const { data: rolesRes, isError: rolesError } = useQuery({
    queryKey: ["admin-roles"],
    queryFn: () => api.get("/admin/roles"),
    placeholderData: { data: [] },
  });

  const offices = asList<any>(officesRes?.data);
  const departments = asList<any>(departmentsRes?.data);
  const roles = asList<any>(rolesRes?.data);
  const loadError = officesError || departmentsError || rolesError;
  const [showOfficeForm, setShowOfficeForm] = useState(false);
  const [showDeptForm, setShowDeptForm] = useState(false);
  const [showRoleForm, setShowRoleForm] = useState(false);
  const [editingOffice, setEditingOffice] = useState<any>(null);
  const [editingDept, setEditingDept] = useState<any>(null);
  const [officeForm, setOfficeForm] = useState({ location_name: "", address: "", latitude: "", longitude: "", geofence_radius_meters: "200" });
  const [deptForm, setDeptForm] = useState({ name: "", description: "" });
  const [roleForm, setRoleForm] = useState({ role_name: "", permissions: "" });

  const addOffice = async () => {
    if (!officeForm.location_name) { toast.error("Nama lokasi wajib diisi"); return; }
    try {
      await api.post("/admin/offices", { ...officeForm, latitude: Number(officeForm.latitude), longitude: Number(officeForm.longitude), geofence_radius_meters: Number(officeForm.geofence_radius_meters) });
      toast.success("Kantor berhasil ditambahkan");
      queryClient.invalidateQueries({ queryKey: ["admin-offices"] });
      setShowOfficeForm(false); setOfficeForm({ location_name: "", address: "", latitude: "", longitude: "", geofence_radius_meters: "200" });
    } catch (err: any) { toast.error(err.message || "Gagal menambah kantor"); }
  };

  const updateOffice = async () => {
    if (!officeForm.location_name) { toast.error("Nama lokasi wajib diisi"); return; }
    try {
      await api.put(`/admin/offices/${editingOffice.id}`, { ...officeForm, latitude: Number(officeForm.latitude), longitude: Number(officeForm.longitude), geofence_radius_meters: Number(officeForm.geofence_radius_meters) });
      toast.success("Kantor berhasil diperbarui");
      queryClient.invalidateQueries({ queryKey: ["admin-offices"] });
      setEditingOffice(null); setOfficeForm({ location_name: "", address: "", latitude: "", longitude: "", geofence_radius_meters: "200" });
    } catch (err: any) { toast.error(err.message || "Gagal memperbarui kantor"); }
  };

  const startEditOffice = (o: any) => {
    setEditingOffice(o);
    setOfficeForm({
      location_name: o.location_name || "",
      address: o.address || "",
      latitude: String(o.latitude || ""),
      longitude: String(o.longitude || ""),
      geofence_radius_meters: String(o.geofence_radius_meters || "200"),
    });
    setShowOfficeForm(false);
  };

  const deleteOffice = async (id: string) => {
    try {
      await api.delete(`/admin/offices/${id}`);
      toast.success("Kantor berhasil dihapus");
      queryClient.invalidateQueries({ queryKey: ["admin-offices"] });
    } catch (err: any) { toast.error(err.message || "Gagal menghapus kantor"); }
  };

  const addDept = async () => {
    if (!deptForm.name) { toast.error("Nama departemen wajib diisi"); return; }
    try {
      await api.post("/admin/departments", deptForm);
      toast.success("Departemen berhasil ditambahkan");
      queryClient.invalidateQueries({ queryKey: ["admin-departments"] });
      setShowDeptForm(false); setDeptForm({ name: "", description: "" });
    } catch (err: any) { toast.error(err.message || "Gagal menambah departemen"); }
  };

  const updateDept = async () => {
    if (!deptForm.name) { toast.error("Nama departemen wajib diisi"); return; }
    try {
      await api.put(`/admin/departments/${editingDept.id}`, deptForm);
      toast.success("Departemen berhasil diperbarui");
      queryClient.invalidateQueries({ queryKey: ["admin-departments"] });
      setEditingDept(null); setDeptForm({ name: "", description: "" });
    } catch (err: any) { toast.error(err.message || "Gagal memperbarui departemen"); }
  };

  const startEditDept = (d: any) => {
    setEditingDept(d);
    setDeptForm({ name: d.name || "", description: d.description || "" });
    setShowDeptForm(false);
  };

  const deleteDept = async (id: string) => {
    try {
      await api.delete(`/admin/departments/${id}`);
      toast.success("Departemen berhasil dihapus");
      queryClient.invalidateQueries({ queryKey: ["admin-departments"] });
    } catch (err: any) { toast.error(err.message || "Gagal menghapus departemen"); }
  };

  const addRole = async () => {
    if (!roleForm.role_name) { toast.error("Nama role wajib diisi"); return; }
    try {
      await api.post("/admin/roles", { role_name: roleForm.role_name, permissions: {} });
      toast.success("Role berhasil ditambahkan");
      queryClient.invalidateQueries({ queryKey: ["admin-roles"] });
      setShowRoleForm(false); setRoleForm({ role_name: "", permissions: "" });
    } catch (err: any) { toast.error(err.message || "Gagal menambah role"); }
  };

  return (
    <div className="space-y-6">
      <SH title="Organisasi" sub="Kelola kantor (lokasi & geo-fence), departemen, dan jabatan" />
      {loadError && (
        <div className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          Gagal memuat data organisasi. Silakan refresh halaman atau login ulang.
        </div>
      )}
      {/* Offices */}
      <div className="surface-elevated p-5 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2"><Building2 className="h-4 w-4 text-muted-foreground" /><p className="text-sm font-medium">Kantor / Cabang & Geo-Fence</p></div>
          <button onClick={() => { setShowOfficeForm(!showOfficeForm); setEditingOffice(null); setOfficeForm({ location_name: "", address: "", latitude: "", longitude: "", geofence_radius_meters: "200" }); }} className="flex items-center gap-1 px-2.5 py-1.5 rounded-md bg-gold/10 text-gold text-xs font-medium hover:bg-gold/20"><Plus className="h-3 w-3" /> Tambah Kantor</button>
        </div>
        {(showOfficeForm || editingOffice) && (
          <div className="p-4 rounded-md border border-gold/20 space-y-3 animate-fade-in">
            <p className="text-xs font-medium text-muted-foreground">{editingOffice ? "Edit Kantor" : "Tambah Kantor Baru"}</p>
            <div className="grid grid-cols-2 gap-3">
              <Inp label="Nama Lokasi" value={officeForm.location_name} onChange={v => setOfficeForm({...officeForm, location_name: v})} placeholder="Kantor Pusat Jakarta" />
              <Inp label="Alamat" value={officeForm.address} onChange={v => setOfficeForm({...officeForm, address: v})} placeholder="Jl. Sudirman No. 123" />
              <Inp label="Latitude" value={officeForm.latitude} onChange={v => setOfficeForm({...officeForm, latitude: v})} placeholder="-6.2088" />
              <Inp label="Longitude" value={officeForm.longitude} onChange={v => setOfficeForm({...officeForm, longitude: v})} placeholder="106.8456" />
              <Inp label="Radius (meter)" value={officeForm.geofence_radius_meters} onChange={v => setOfficeForm({...officeForm, geofence_radius_meters: v})} placeholder="200" />
            </div>
            <div className="flex gap-2">
              <button onClick={() => { setShowOfficeForm(false); setEditingOffice(null); setOfficeForm({ location_name: "", address: "", latitude: "", longitude: "", geofence_radius_meters: "200" }); }} className="px-3 py-1.5 rounded text-xs border border-input hover:bg-accent">Batal</button>
              <button onClick={editingOffice ? updateOffice : addOffice} className="px-3 py-1.5 rounded text-xs bg-primary text-primary-foreground font-medium">{editingOffice ? "Perbarui" : "Simpan"}</button>
            </div>
          </div>
        )}
        {offices.map((o: any) => (
          <div key={o.id} className="flex items-center justify-between py-2 border-b border-border/50 last:border-0">
            <div><p className="text-sm font-medium">{o.location_name}</p><p className="text-2xs text-muted-foreground">{o.address || "—"} • {o.latitude}, {o.longitude} • Radius {o.geofence_radius_meters}m</p></div>
            <div className="flex items-center gap-1">
              <button onClick={() => startEditOffice(o)} className="p-1.5 hover:bg-accent rounded-md" title="Edit"><Pencil className="h-3.5 w-3.5 text-muted-foreground hover:text-gold" /></button>
              <button onClick={() => deleteOffice(o.id)} className="p-1.5 hover:bg-accent rounded-md" title="Hapus"><Trash2 className="h-3.5 w-3.5 text-muted-foreground hover:text-destructive" /></button>
            </div>
          </div>
        ))}
      </div>
      {/* Departments */}
      <div className="surface-elevated p-5 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2"><Users className="h-4 w-4 text-muted-foreground" /><p className="text-sm font-medium">Departemen</p></div>
          <button onClick={() => { setShowDeptForm(!showDeptForm); setEditingDept(null); setDeptForm({ name: "", description: "" }); }} className="flex items-center gap-1 px-2.5 py-1.5 rounded-md bg-gold/10 text-gold text-xs font-medium hover:bg-gold/20"><Plus className="h-3 w-3" /> Tambah Departemen</button>
        </div>
        {(showDeptForm || editingDept) && (
          <div className="p-4 rounded-md border border-gold/20 space-y-3 animate-fade-in">
            <p className="text-xs font-medium text-muted-foreground">{editingDept ? "Edit Departemen" : "Tambah Departemen Baru"}</p>
            <div className="grid grid-cols-2 gap-3">
              <Inp label="Nama Departemen" value={deptForm.name} onChange={v => setDeptForm({...deptForm, name: v})} placeholder="Engineering" />
              <Inp label="Deskripsi" value={deptForm.description} onChange={v => setDeptForm({...deptForm, description: v})} placeholder="Software Development" />
            </div>
            <div className="flex gap-2">
              <button onClick={() => { setShowDeptForm(false); setEditingDept(null); setDeptForm({ name: "", description: "" }); }} className="px-3 py-1.5 rounded text-xs border border-input hover:bg-accent">Batal</button>
              <button onClick={editingDept ? updateDept : addDept} className="px-3 py-1.5 rounded text-xs bg-primary text-primary-foreground font-medium">{editingDept ? "Perbarui" : "Simpan"}</button>
            </div>
          </div>
        )}
        {departments.map((d: any) => (
          <div key={d.id} className="flex items-center justify-between py-2 border-b border-border/50 last:border-0">
            <div><p className="text-sm font-medium">{d.name}</p><p className="text-2xs text-muted-foreground">{d.description || "—"} • {d.employees?.length || 0} karyawan</p></div>
            <div className="flex items-center gap-1">
              <button onClick={() => startEditDept(d)} className="p-1.5 hover:bg-accent rounded-md" title="Edit"><Pencil className="h-3.5 w-3.5 text-muted-foreground hover:text-gold" /></button>
              <button onClick={() => deleteDept(d.id)} className="p-1.5 hover:bg-accent rounded-md" title="Hapus"><Trash2 className="h-3.5 w-3.5 text-muted-foreground hover:text-destructive" /></button>
            </div>
          </div>
        ))}
      </div>
      {/* Roles */}
      <div className="surface-elevated p-5 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2"><Shield className="h-4 w-4 text-muted-foreground" /><p className="text-sm font-medium">Jabatan / Role</p></div>
          <button onClick={() => setShowRoleForm(!showRoleForm)} className="flex items-center gap-1 px-2.5 py-1.5 rounded-md bg-gold/10 text-gold text-xs font-medium hover:bg-gold/20"><Plus className="h-3 w-3" /> Tambah Role</button>
        </div>
        {showRoleForm && (
          <div className="p-4 rounded-md border border-gold/20 space-y-3 animate-fade-in">
            <Inp label="Nama Role" value={roleForm.role_name} onChange={v => setRoleForm({...roleForm, role_name: v})} placeholder="Manager" />
            <div className="flex gap-2"><button onClick={() => setShowRoleForm(false)} className="px-3 py-1.5 rounded text-xs border border-input hover:bg-accent">Batal</button><button onClick={addRole} className="px-3 py-1.5 rounded text-xs bg-primary text-primary-foreground font-medium">Simpan</button></div>
          </div>
        )}
        {roles.map((r: any) => (
          <div key={r.id} className="flex items-center justify-between py-2 border-b border-border/50 last:border-0">
            <div><p className="text-sm font-medium">{r.role_name}</p><p className="text-2xs text-muted-foreground">{r.employees?.length || 0} pengguna</p></div>
            <button onClick={() => toast.info("Edit izin segera hadir")} className="text-2xs text-gold hover:text-gold/80">Edit Izin</button>
          </div>
        ))}
      </div>
    </div>
  );
}

// === USERS ===
function UsersSection() {
  const [selectedRole, setSelectedRole] = useState("all");
  const { data: usersData } = useQuery({ queryKey: ["admin-users"], queryFn: () => api.get("/admin/users"), placeholderData: { data: [] } });
  const { data: rolesData } = useQuery({ queryKey: ["admin-roles"], queryFn: () => api.get("/admin/roles"), placeholderData: { data: [] } });
  
  const allUsers = usersData?.data || [];
  const roles = rolesData?.data || [];

  const filteredUsers = selectedRole === "all" 
    ? allUsers 
    : allUsers.filter((u: any) => u.role === selectedRole);

  return (
    <div className="space-y-6">
      <SH title="Akun & Akses Pengguna" sub="Kelola akun karyawan — lihat nama, departemen, dan role" />
      <div className="surface-elevated p-6 space-y-4">
        <div className="space-y-2">
          <label className="text-luxury-label">Filter Role</label>
          <select value={selectedRole} onChange={e => setSelectedRole(e.target.value)} className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm">
            <option value="all">Semua Role</option>
            {roles.map((r: any) => <option key={r.id} value={r.role_name}>{r.role_name}</option>)}
          </select>
        </div>
        <div className="divider-luxury" />
        <p className="text-sm font-medium">{filteredUsers.length} pengguna {selectedRole !== "all" ? `dengan role: ${selectedRole}` : "terdaftar"}</p>
        <div className="space-y-1">
          {filteredUsers.length === 0 
            ? <p className="text-sm text-muted-foreground py-4 text-center">Tidak ada pengguna</p>
            : filteredUsers.map((e: any) => (
              <div key={e.id} className="flex items-center justify-between py-3 px-3 border-b border-border/50 last:border-0 rounded-md hover:bg-accent/30 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-full bg-gold/10 border border-gold/20 flex items-center justify-center shrink-0">
                    <span className="text-xs font-semibold text-gold">{e.full_name?.charAt(0) || "?"}</span>
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium">{e.full_name}</p>
                    <div className="flex items-center gap-2 text-2xs text-muted-foreground">
                      <span>{e.department || "—"}</span>
                      <span className="text-border">•</span>
                      <span className="px-1.5 py-0.5 rounded bg-accent text-foreground/70 font-medium">{e.role || "Employee"}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={cn(
                    "inline-flex items-center px-2 py-0.5 rounded-full text-2xs font-medium",
                    e.employment_status === "active" ? "bg-success/10 text-success" : "bg-muted text-muted-foreground"
                  )}>
                    {e.employment_status === "active" ? "Aktif" : e.employment_status}
                  </span>
                  <button
                    onClick={async () => {
                      const tempPassword = `Tara@${Math.random().toString(36).slice(2, 8)}`;
                      if (!window.confirm(`Reset password ${e.full_name}? Password sementara akan dibuat.`)) return;
                      try {
                        await api.post("/auth/reset-password", {
                          employee_id: e.id,
                          new_password: tempPassword,
                        });
                        toast.success(`Password direset. Sementara: ${tempPassword}`);
                      } catch (err: any) {
                        toast.error(err?.message || "Gagal reset password");
                      }
                    }}
                    className="text-xs text-gold hover:text-gold/80 ml-2"
                  >
                    Reset Password
                  </button>
                </div>
              </div>
            ))}
        </div>
      </div>
    </div>
  );
}

// === ATTENDANCE ===
function AttendanceSection() {
  const [source, setSource] = useState<string>("hybrid");
  const [interval, setInterval] = useState("15");
  const [manualOverride, setManualOverride] = useState(true);

  useQuery({
    queryKey: ["attendance-config"],
    queryFn: async () => {
      const res = await api.get("/admin/attendance-config");
      const cfg = res.data || {};
      if (cfg.source) setSource(cfg.source);
      if (cfg.sync_interval_minutes) setInterval(String(cfg.sync_interval_minutes));
      if (cfg.manual_override !== undefined) setManualOverride(!!cfg.manual_override);
      return res;
    },
  });

  const save = async () => {
    try {
      await api.put("/admin/attendance-config", {
        source,
        sync_interval_minutes: Number(interval),
        manual_override: manualOverride,
      });
      toast.success("Pengaturan kehadiran disimpan");
    } catch (err: any) {
      toast.error(err?.message || "Gagal menyimpan pengaturan kehadiran");
    }
  };
  return (
    <div className="space-y-6">
      <SH title="Pengaturan Kehadiran" sub="Konfigurasi sumber absensi dan jadwal sinkronisasi" />
      <div className="surface-elevated p-6 space-y-5">
        <div className="space-y-2">
          <label className="text-luxury-label">Sumber Kehadiran</label>
          <div className="grid grid-cols-3 gap-2">
            {[{ v: "phone", l: "📱 Ponsel" }, { v: "aws_device", l: "🖐 AWS Fingerprint" }, { v: "hybrid", l: "🔄 Hybrid" }].map(s => (
              <button key={s.v} onClick={() => setSource(s.v)} className={cn("px-3 py-2.5 rounded-md border text-sm transition-colors", source === s.v ? "border-gold bg-gold/10 text-gold font-medium" : "border-input hover:border-gold/50")}>{s.l}</button>
            ))}
          </div>
        </div>
        <div className="divider-luxury" />
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-luxury-label">Interval Sinkronisasi AWS</label>
            <select value={interval} onChange={e => setInterval(e.target.value)} className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm">
              <option value="15">Setiap 15 menit</option><option value="30">Setiap 30 menit</option><option value="60">Setiap 1 jam</option><option value="360">Setiap 6 jam</option>
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-luxury-label">Status Sinkronisasi</label>
            <div className="h-10 px-3 rounded-md border border-input bg-background flex items-center text-sm text-success"><Activity className="h-3.5 w-3.5 mr-2" /> Aktif</div>
          </div>
        </div>
        <div className="flex items-center justify-between p-3 rounded-md bg-secondary/50">
          <span className="text-sm">Izinkan Override Manual oleh HR</span>
          <Toggle on={manualOverride} onToggle={() => setManualOverride(!manualOverride)} />
        </div>
        <button onClick={save} className="px-4 py-2.5 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90"><Save className="h-3.5 w-3.5 inline mr-1.5" />Simpan Pengaturan</button>
      </div>
    </div>
  );
}

// === LEAVES ===
function LeavesSection() {
  const [annual, setAnnual] = useState("12");
  const [carryover, setCarryover] = useState("5");
  const save = () => {
    toast.info("Kebijakan cuti global dikelola via seed data / HR Admin — hubungi HR untuk perubahan jatah tahunan");
  };
  return (
    <div className="space-y-6">
      <SH title="Kebijakan Cuti" sub="Atur jatah cuti tahunan dan aturan carry-over" />
      <div className="surface-elevated p-6 space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <Inp label="Jatah Cuti Tahunan (hari)" value={annual} onChange={setAnnual} placeholder="12" />
          <Inp label="Maks Carry-Over (hari)" value={carryover} onChange={setCarryover} placeholder="5" />
        </div>
        <button onClick={save} className="px-4 py-2.5 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90"><Save className="h-3.5 w-3.5 inline mr-1.5" />Simpan Kebijakan</button>
      </div>
    </div>
  );
}

// === NOTIFICATION CHANNELS ===
function ChannelsSection() {
  const [wa, setWa] = useState({ enabled: false, api_url: "", api_key: "", phone_id: "" });
  const [tg, setTg] = useState({ enabled: false, bot_token: "", chat_id: "" });
  const [email, setEmail] = useState({ enabled: false, host: "", port: "587", user: "", pass: "" });

  const testChannel = async (ch: "whatsapp" | "telegram" | "email") => {
    try {
      const res = await api.post(`/admin/notification-channels/${ch}/test`);
      toast.success(res.data?.message || `Tes koneksi ${ch} berhasil`);
    } catch (err: any) {
      toast.error(err?.message || `Tes koneksi ${ch} gagal`);
    }
  };

  const saveChannels = async () => {
    try {
      if (wa.enabled) {
        await api.put("/admin/notification-channels/whatsapp", wa);
      }
      if (tg.enabled) {
        await api.put("/admin/notification-channels/telegram", tg);
      }
      if (email.enabled) {
        await api.put("/admin/notification-channels/email", email);
      }
      toast.success("Konfigurasi kanal notifikasi disimpan");
    } catch (err: any) {
      toast.error(err?.message || "Gagal menyimpan konfigurasi kanal");
    }
  };

  return (
    <div className="space-y-6">
      <SH title="Kanal Notifikasi" sub="Pilih cara mengirim alert: WhatsApp, Telegram, atau Email" />
      {/* WhatsApp */}
      <div className="surface-elevated p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3"><Send className="h-4 w-4 text-gold" /><div><p className="text-sm font-medium">WhatsApp Business</p><p className="text-2xs text-muted-foreground">Konfigurasi koneksi WhatsApp Business API</p></div></div>
          <Toggle on={wa.enabled} onToggle={() => setWa({...wa, enabled: !wa.enabled})} />
        </div>
        {wa.enabled && (
          <div className="space-y-3 animate-fade-in">
            <div className="grid grid-cols-2 gap-3">
              <Inp label="API URL" value={wa.api_url} onChange={v => setWa({...wa, api_url: v})} placeholder="https://graph.facebook.com/v17.0/" />
              <Inp label="API Key" value={wa.api_key} onChange={v => setWa({...wa, api_key: v})} placeholder="Bearer token..." />
              <Inp label="Phone Number ID" value={wa.phone_id} onChange={v => setWa({...wa, phone_id: v})} placeholder="1234567890" />
            </div>
            <button onClick={() => testChannel("whatsapp")} className="flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-input text-xs hover:bg-accent"><TestTube className="h-3 w-3" /> Tes Koneksi</button>
          </div>
        )}
      </div>
      {/* Telegram */}
      <div className="surface-elevated p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3"><Send className="h-4 w-4 text-info" /><div><p className="text-sm font-medium">Telegram Bot</p><p className="text-2xs text-muted-foreground">Konfigurasi koneksi Telegram Bot API</p></div></div>
          <Toggle on={tg.enabled} onToggle={() => setTg({...tg, enabled: !tg.enabled})} />
        </div>
        {tg.enabled && (
          <div className="space-y-3 animate-fade-in">
            <div className="grid grid-cols-2 gap-3">
              <Inp label="Bot Token" value={tg.bot_token} onChange={v => setTg({...tg, bot_token: v})} placeholder="123456:ABC-DEF..." />
              <Inp label="Chat ID / Group ID" value={tg.chat_id} onChange={v => setTg({...tg, chat_id: v})} placeholder="-1001234567890" />
            </div>
            <button onClick={() => testChannel("telegram")} className="flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-input text-xs hover:bg-accent"><TestTube className="h-3 w-3" /> Tes Koneksi</button>
          </div>
        )}
      </div>
      {/* Email */}
      <div className="surface-elevated p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3"><Bell className="h-4 w-4 text-warning" /><div><p className="text-sm font-medium">Email (SMTP)</p><p className="text-2xs text-muted-foreground">Konfigurasi server SMTP untuk email</p></div></div>
          <Toggle on={email.enabled} onToggle={() => setEmail({...email, enabled: !email.enabled})} />
        </div>
        {email.enabled && (
          <div className="space-y-3 animate-fade-in">
            <div className="grid grid-cols-2 gap-3">
              <Inp label="SMTP Host" value={email.host} onChange={v => setEmail({...email, host: v})} placeholder="smtp.gmail.com" />
              <Inp label="Port" value={email.port} onChange={v => setEmail({...email, port: v})} placeholder="587" />
              <Inp label="Username" value={email.user} onChange={v => setEmail({...email, user: v})} placeholder="user@company.com" />
              <Inp label="Password" value={email.pass} onChange={v => setEmail({...email, pass: v})} placeholder="••••••••" />
            </div>
            <button onClick={() => testChannel("email")} className="flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-input text-xs hover:bg-accent"><TestTube className="h-3 w-3" /> Tes Koneksi</button>
          </div>
        )}
      </div>
      <button onClick={saveChannels} className="px-4 py-2.5 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90"><Save className="h-3.5 w-3.5 inline mr-1.5" />Simpan Semua Konfigurasi</button>
    </div>
  );
}

// === SHARED COMPONENTS ===
function SH({ title, sub }: { title: string; sub: string }) {
  return <div className="pb-2"><h2 className="text-sm font-semibold">{title}</h2><p className="text-2xs text-muted-foreground mt-0.5">{sub}</p></div>;
}

function Toggle({ on, onToggle }: { on: boolean; onToggle: () => void }) {
  return (
    <button onClick={onToggle} className={cn("relative inline-flex h-5 w-9 items-center rounded-full transition-colors", on ? "bg-gold" : "bg-muted")}>
      <span className={cn("inline-block h-3.5 w-3.5 rounded-full bg-white shadow transition-transform", on ? "translate-x-[18px]" : "translate-x-[3px]")} />
    </button>
  );
}

function Inp({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <div className="space-y-1.5">
      <label className="text-luxury-label">{label}</label>
      <input value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
        className="w-full h-9 px-3 rounded-md border border-input bg-background text-sm placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-ring/20 transition-colors" />
    </div>
  );
}
