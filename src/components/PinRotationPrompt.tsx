import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { useSitePermissions } from "@/contexts/SitePermissionsContext";
import { KeyRound, Loader2, X } from "lucide-react";
import { cn } from "@/lib/utils";

const PIN_DISMISS_UNTIL_KEY = "tara-pin-rotation-dismiss-until";
const PIN_DISMISS_DAYS = 7;

function isPinRotationDismissed(): boolean {
  const until = localStorage.getItem(PIN_DISMISS_UNTIL_KEY);
  if (!until) return false;
  return Date.now() < Number(until);
}

export function PinRotationPrompt() {
  const { user, isAuthenticated, isLoading, mustChangePassword, shouldRotatePin, refreshProfile, dismissPinRotation } =
    useAuth();
  const { permissionsReady } = useSitePermissions();
  const navigate = useNavigate();
  const [open, setOpen] = useState(true);
  const [pin, setPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (
    isLoading ||
    !isAuthenticated ||
    !user ||
    mustChangePassword ||
    !permissionsReady ||
    !shouldRotatePin ||
    !open ||
    isPinRotationDismissed()
  ) {
    return null;
  }

  const handleDismiss = () => {
    localStorage.setItem(
      PIN_DISMISS_UNTIL_KEY,
      String(Date.now() + PIN_DISMISS_DAYS * 24 * 60 * 60 * 1000),
    );
    dismissPinRotation();
    setOpen(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!/^\d{6}$/.test(pin)) {
      setError("PIN harus 6 digit angka");
      return;
    }
    if (pin !== confirmPin) {
      setError("Konfirmasi PIN tidak cocok");
      return;
    }

    setIsSubmitting(true);
    try {
      await api.post("/auth/set-pin", { pin });
      toast.success("PIN absensi berhasil diperbarui");
      localStorage.removeItem(PIN_DISMISS_UNTIL_KEY);
      await refreshProfile();
      setOpen(false);
    } catch (err: any) {
      setError(err?.message || "Gagal menyimpan PIN");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[90] flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-card rounded-2xl w-full max-w-md shadow-luxury-lg border border-border/60">
        <div className="p-5 space-y-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-gold/10">
                <KeyRound className="h-5 w-5 text-gold" />
              </div>
              <div>
                <h2 className="font-display font-semibold text-base">Perbarui PIN Absensi</h2>
                <p className="text-2xs text-muted-foreground mt-0.5">Disarankan setiap 30 hari</p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleDismiss}
              className="p-1.5 rounded-md hover:bg-accent text-muted-foreground"
              aria-label="Tutup"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <p className="text-sm text-muted-foreground leading-relaxed">
            Halo <span className="font-medium text-foreground">{user.full_name}</span>, untuk keamanan absensi,
            ganti PIN 6 digit Anda secara berkala.
          </p>

          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="space-y-1.5">
              <label className="text-luxury-label">PIN Baru</label>
              <input
                type="password"
                inputMode="numeric"
                maxLength={6}
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
                className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm font-mono tracking-widest text-center"
                placeholder="••••••"
                disabled={isSubmitting}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-luxury-label">Konfirmasi PIN</label>
              <input
                type="password"
                inputMode="numeric"
                maxLength={6}
                value={confirmPin}
                onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, ""))}
                className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm font-mono tracking-widest text-center"
                placeholder="••••••"
                disabled={isSubmitting}
              />
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}

            <button
              type="submit"
              disabled={isSubmitting}
              className={cn(
                "w-full h-10 rounded-md bg-primary text-primary-foreground text-sm font-medium",
                "disabled:opacity-50 flex items-center justify-center gap-2",
              )}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Menyimpan...
                </>
              ) : (
                "Simpan PIN Baru"
              )}
            </button>
          </form>

          <div className="flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={handleDismiss}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              Nanti saja
            </button>
            <button
              type="button"
              onClick={() => {
                handleDismiss();
                navigate("/m/profile");
              }}
              className="text-xs text-gold hover:underline"
            >
              Buka pengaturan PIN
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
