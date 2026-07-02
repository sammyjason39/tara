import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { toast } from "sonner";
import { api } from "@/lib/api";
import {
  User, Mail, Phone, Building2, Shield, Calendar,
  Globe, Moon, Sun, Lock, Save, Eye, EyeOff, MapPin,
} from "lucide-react";
import { formatDate } from "@/lib/dates";
import { cn } from "@/lib/utils";

export function ProfilePage() {
  const { user, refreshProfile } = useAuth();
  const { theme, toggleTheme } = useTheme();

  // Profile edit state
  const [editing, setEditing] = useState(false);
  const [profile, setProfile] = useState({
    full_name: user?.full_name || "",
    phone: (user as any)?.phone || "",
    language_preference: user?.language_preference || "id",
  });

  // Password change state
  const [showPasswordSection, setShowPasswordSection] = useState(false);
  const [passwords, setPasswords] = useState({ current: "", new_password: "", confirm: "" });
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);

  const handleSaveProfile = async () => {
    try {
      await api.put("/employees/me", profile);
      await refreshProfile();
      toast.success("Profil berhasil diperbarui");
      setEditing(false);
    } catch (err: any) {
      toast.error(err?.message || "Gagal memperbarui profil");
    }
  };

  const handleChangePassword = async () => {
    if (!passwords.current || !passwords.new_password) {
      toast.error("Password lama dan baru wajib diisi");
      return;
    }
    if (passwords.new_password.length < 8) {
      toast.error("Password baru minimal 8 karakter");
      return;
    }
    if (passwords.new_password !== passwords.confirm) {
      toast.error("Konfirmasi password tidak cocok");
      return;
    }
    try {
      await api.post("/auth/change-password", {
        current_password: passwords.current,
        new_password: passwords.new_password,
      });
      toast.success("Password berhasil diubah");
      await refreshProfile();
      setPasswords({ current: "", new_password: "", confirm: "" });
      setShowPasswordSection(false);
    } catch (err: any) {
      toast.error(err?.message || "Gagal mengubah password");
    }
  };

  return (
    <div className="max-w-3xl space-y-6 animate-fade-in">
      <div>
        <h1 className="text-luxury-heading text-2xl">Profil Saya</h1>
        <p className="text-sm text-muted-foreground mt-1">Kelola informasi pribadi dan keamanan akun</p>
      </div>

      {/* Profile Card */}
      <div className="surface-elevated p-6">
        <div className="flex items-start gap-5">
          <div className="h-16 w-16 rounded-full bg-gold/10 border-2 border-gold/30 flex items-center justify-center">
            <span className="text-2xl font-display font-semibold text-gold">
              {user?.full_name?.charAt(0) || "?"}
            </span>
          </div>
          <div className="flex-1">
            <h2 className="text-lg font-semibold">{user?.full_name || "—"}</h2>
            <p className="text-sm text-muted-foreground">{user?.email}</p>
            <div className="flex items-center gap-3 mt-2">
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-2xs font-medium bg-gold/10 text-gold">
                <Shield className="h-3 w-3" /> {user?.role}
              </span>
              <span className="text-2xs text-muted-foreground">{user?.department || "—"}</span>
            </div>
          </div>
          {!editing && (
            <button onClick={() => setEditing(true)}
              className="px-3 py-1.5 rounded-md border border-input text-sm hover:bg-accent transition-colors">
              Edit
            </button>
          )}
        </div>
      </div>

      {/* Personal Information */}
      <div className="surface-elevated p-6 space-y-5">
        <h3 className="text-sm font-semibold flex items-center gap-2"><User className="h-4 w-4 text-muted-foreground" /> Informasi Pribadi</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field icon={User} label="Nama Lengkap" value={profile.full_name}
            editing={editing} onChange={v => setProfile({...profile, full_name: v})} />
          <Field icon={Mail} label="Email" value={user?.email || ""} editing={false} />
          <Field icon={Phone} label="Telepon" value={profile.phone}
            editing={editing} onChange={v => setProfile({...profile, phone: v})} placeholder="081234567890" />
          <Field icon={Building2} label="Departemen" value={user?.department || "—"} editing={false} />
          <Field icon={Shield} label="Jabatan" value={user?.role || "—"} editing={false} />
          <Field icon={MapPin} label="Lokasi Kantor" value={(user as any)?.office || "—"} editing={false} />
          <Field icon={Calendar} label="Tanggal Bergabung" value={formatDate((user as any)?.hire_date)} editing={false} />
          <div className="space-y-1.5">
            <label className="text-luxury-label flex items-center gap-1.5"><Globe className="h-3 w-3" /> Bahasa</label>
            {editing ? (
              <select value={profile.language_preference} onChange={e => setProfile({...profile, language_preference: e.target.value})}
                className="w-full h-9 px-3 rounded-md border border-input bg-background text-sm">
                <option value="id">Bahasa Indonesia</option>
                <option value="en">English</option>
              </select>
            ) : (
              <p className="text-sm h-9 flex items-center">{profile.language_preference === "id" ? "Bahasa Indonesia" : "English"}</p>
            )}
          </div>
        </div>
        {editing && (
          <div className="flex gap-2 pt-2">
            <button onClick={() => setEditing(false)} className="px-4 py-2 rounded-md text-sm border border-input hover:bg-accent">Batal</button>
            <button onClick={handleSaveProfile} className="px-4 py-2 rounded-md text-sm bg-primary text-primary-foreground font-medium hover:bg-primary/90">
              <Save className="h-3.5 w-3.5 inline mr-1.5" />Simpan Perubahan
            </button>
          </div>
        )}
      </div>

      {/* Security */}
      <div className="surface-elevated p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold flex items-center gap-2"><Lock className="h-4 w-4 text-muted-foreground" /> Keamanan</h3>
          <button onClick={() => setShowPasswordSection(!showPasswordSection)}
            className="text-xs text-gold hover:text-gold/80">
            {showPasswordSection ? "Tutup" : "Ubah Password"}
          </button>
        </div>
        {showPasswordSection && (
          <div className="space-y-4 pt-2 animate-fade-in">
            <div className="space-y-1.5">
              <label className="text-luxury-label">Password Saat Ini</label>
              <div className="relative">
                <input type={showCurrent ? "text" : "password"} value={passwords.current}
                  onChange={e => setPasswords({...passwords, current: e.target.value})}
                  placeholder="Masukkan password saat ini"
                  className="w-full h-9 px-3 pr-9 rounded-md border border-input bg-background text-sm placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-ring/20" />
                <button onClick={() => setShowCurrent(!showCurrent)} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground">
                  {showCurrent ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                </button>
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-luxury-label">Password Baru</label>
              <div className="relative">
                <input type={showNew ? "text" : "password"} value={passwords.new_password}
                  onChange={e => setPasswords({...passwords, new_password: e.target.value})}
                  placeholder="Minimal 6 karakter"
                  className="w-full h-9 px-3 pr-9 rounded-md border border-input bg-background text-sm placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-ring/20" />
                <button onClick={() => setShowNew(!showNew)} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground">
                  {showNew ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                </button>
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-luxury-label">Konfirmasi Password Baru</label>
              <input type="password" value={passwords.confirm}
                onChange={e => setPasswords({...passwords, confirm: e.target.value})}
                placeholder="Ketik ulang password baru"
                className="w-full h-9 px-3 rounded-md border border-input bg-background text-sm placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-ring/20" />
            </div>
            <button onClick={handleChangePassword}
              className="px-4 py-2 rounded-md text-sm bg-primary text-primary-foreground font-medium hover:bg-primary/90">
              <Lock className="h-3.5 w-3.5 inline mr-1.5" />Ubah Password
            </button>
          </div>
        )}
      </div>

      {/* Preferences */}
      <div className="surface-elevated p-6 space-y-4">
        <h3 className="text-sm font-semibold">Preferensi Tampilan</h3>
        <div className="flex items-center justify-between p-3 rounded-md bg-secondary/50">
          <div className="flex items-center gap-3">
            {theme === "dark" ? <Moon className="h-4 w-4 text-muted-foreground" /> : <Sun className="h-4 w-4 text-warning" />}
            <div>
              <p className="text-sm">Tema {theme === "dark" ? "Gelap" : "Terang"}</p>
              <p className="text-2xs text-muted-foreground">Ubah tampilan aplikasi</p>
            </div>
          </div>
          <button onClick={() => { toggleTheme(); toast.success(`Tema diubah ke mode ${theme === "dark" ? "terang" : "gelap"}`); }}
            className={cn("relative inline-flex h-5 w-9 items-center rounded-full transition-colors", theme === "dark" ? "bg-gold" : "bg-muted")}>
            <span className={cn("inline-block h-3.5 w-3.5 rounded-full bg-white shadow transition-transform", theme === "dark" ? "translate-x-[18px]" : "translate-x-[3px]")} />
          </button>
        </div>
      </div>

      {/* Account Info (read-only) */}
      <div className="surface-elevated p-6 space-y-3">
        <h3 className="text-sm font-semibold">Informasi Akun</h3>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div><p className="text-luxury-label mb-1">Kode Karyawan</p><p className="font-mono">{(user as any)?.employee_code || "—"}</p></div>
          <div><p className="text-luxury-label mb-1">Status</p><p className="text-success">{(user as any)?.employment_status === "active" ? "Aktif" : "—"}</p></div>
          <div><p className="text-luxury-label mb-1">ID Akun</p><p className="font-mono text-xs text-muted-foreground">{(user as any)?.id || "—"}</p></div>
        </div>
      </div>
    </div>
  );
}

// Field helper
function Field({ icon: Icon, label, value, editing, onChange, placeholder }: {
  icon: any; label: string; value: string; editing: boolean; onChange?: (v: string) => void; placeholder?: string;
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-luxury-label flex items-center gap-1.5"><Icon className="h-3 w-3" /> {label}</label>
      {editing && onChange ? (
        <input value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
          className="w-full h-9 px-3 rounded-md border border-input bg-background text-sm placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-ring/20" />
      ) : (
        <p className="text-sm h-9 flex items-center">{value || "—"}</p>
      )}
    </div>
  );
}
