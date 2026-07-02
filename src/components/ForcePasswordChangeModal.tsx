import { useState } from "react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { Lock, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export function ForcePasswordChangeModal() {
  const { user, mustChangePassword, refreshProfile, logout } = useAuth();
  const [form, setForm] = useState({ new_password: "", confirm_password: "" });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!mustChangePassword || !user) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (form.new_password.length < 8) {
      setError("Password baru minimal 8 karakter");
      return;
    }
    if (form.new_password !== form.confirm_password) {
      setError("Konfirmasi password tidak cocok");
      return;
    }

    setIsSubmitting(true);
    try {
      await api.post("/auth/force-change-password", {
        new_password: form.new_password,
        confirm_password: form.confirm_password,
      });
      toast.success("Password berhasil diperbarui");
      await refreshProfile();
      setForm({ new_password: "", confirm_password: "" });
    } catch (err: any) {
      setError(err.message || "Gagal memperbarui password");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div
        className="bg-card rounded-2xl w-full max-w-md shadow-luxury-lg border border-gold/20"
        role="dialog"
        aria-modal="true"
        aria-labelledby="force-password-title"
      >
        <div className="p-6 space-y-5">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-full bg-gold/10">
              <Lock className="h-5 w-5 text-gold" />
            </div>
            <div>
              <h2 id="force-password-title" className="font-display font-semibold text-lg">
                Ganti Password
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Wajib pada login pertama
              </p>
            </div>
          </div>

          <p className="text-sm text-muted-foreground leading-relaxed">
            Halo <span className="font-medium text-foreground">{user.full_name}</span>, akun Anda masih
            memakai password sementara. Buat password baru (minimal 8 karakter) sebelum melanjutkan.
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-luxury-label">Password Baru</label>
              <input
                type="password"
                autoComplete="new-password"
                value={form.new_password}
                onChange={(e) => setForm({ ...form, new_password: e.target.value })}
                className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-gold/30"
                placeholder="Minimal 8 karakter"
                disabled={isSubmitting}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-luxury-label">Konfirmasi Password Baru</label>
              <input
                type="password"
                autoComplete="new-password"
                value={form.confirm_password}
                onChange={(e) => setForm({ ...form, confirm_password: e.target.value })}
                className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-gold/30"
                placeholder="Ulangi password baru"
                disabled={isSubmitting}
              />
            </div>

            {error && (
              <p className="text-sm text-destructive font-medium">{error}</p>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className={cn(
                "w-full h-11 rounded-md bg-primary text-primary-foreground text-sm font-medium",
                "hover:bg-primary/90 disabled:opacity-50 flex items-center justify-center gap-2",
              )}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Menyimpan...
                </>
              ) : (
                "Simpan Password Baru"
              )}
            </button>
          </form>

          <button
            type="button"
            onClick={logout}
            className="w-full text-center text-xs text-muted-foreground hover:text-foreground"
          >
            Keluar dari akun
          </button>
        </div>
      </div>
    </div>
  );
}
