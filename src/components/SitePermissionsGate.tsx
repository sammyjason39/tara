import { useState } from "react";
import { Camera, CheckCircle2, Loader2, MapPin, Shield } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useSitePermissions } from "@/contexts/SitePermissionsContext";
import { useIsMobile } from "@/lib/useIsMobile";
import {
  areMobileSitePermissionsGranted,
  getDefaultMobilePermissionItems,
  isPermissionSatisfied,
  requestAllMobileSitePermissions,
  type SitePermissionItem,
} from "@/lib/site-permissions";
import { cn } from "@/lib/utils";

function PermissionIcon({ kind }: { kind: SitePermissionItem["kind"] }) {
  if (kind === "camera") return <Camera className="h-4 w-4" />;
  return <MapPin className="h-4 w-4" />;
}

function statusLabel(status: SitePermissionItem["status"]): string {
  switch (status) {
    case "granted":
      return "Diizinkan";
    case "denied":
      return "Ditolak";
    case "prompt":
    case "unknown":
      return "Belum diizinkan";
    default:
      return "Tidak didukung";
  }
}

export function SitePermissionsGate() {
  const { user, isAuthenticated, isLoading, mustChangePassword } = useAuth();
  const isMobile = useIsMobile();
  const { items, permissionsReady, isChecking, refreshPermissions } = useSitePermissions();
  const [isRequesting, setIsRequesting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (
    isLoading ||
    !isAuthenticated ||
    !user ||
    !isMobile ||
    mustChangePassword ||
    permissionsReady
  ) {
    return null;
  }

  const handleAllowAll = async () => {
    setError(null);
    setIsRequesting(true);
    try {
      await requestAllMobileSitePermissions();
      await refreshPermissions();
      if (!(await areMobileSitePermissionsGranted())) {
        setError(
          "Masih ada izin yang belum diaktifkan. Izinkan semua permintaan browser, atau aktifkan di Pengaturan HP → Aplikasi → TARA / Chrome.",
        );
      }
    } catch {
      setError("Gagal meminta izin. Coba lagi.");
    } finally {
      setIsRequesting(false);
    }
  };

  const displayItems = items.length > 0 ? items : getDefaultMobilePermissionItems();
  const allGranted = displayItems.every((item) => isPermissionSatisfied(item.status));

  return (
    <div className="fixed inset-0 z-[95] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-card rounded-2xl w-full max-w-md shadow-luxury-lg border border-gold/20">
        <div className="p-6 space-y-5">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-full bg-gold/10">
              <Shield className="h-5 w-5 text-gold" />
            </div>
            <div>
              <h2 className="font-display font-semibold text-lg">Izin Aplikasi</h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Diperlukan sebelum menggunakan TARA
              </p>
            </div>
          </div>

          <p className="text-sm text-muted-foreground leading-relaxed">
            Halo <span className="font-medium text-foreground">{user.full_name}</span>, izinkan
            akses berikut agar absensi GPS dan selfie berjalan lancar.
          </p>

          <ul className="space-y-2">
            {(displayItems).map((item) => {
              const ok = isPermissionSatisfied(item.status);
              return (
                <li
                  key={item.kind}
                  className={cn(
                    "flex items-start gap-3 rounded-lg border px-3 py-3",
                    ok ? "border-success/30 bg-success/5" : "border-border/60 bg-secondary/30",
                  )}
                >
                  <div
                    className={cn(
                      "mt-0.5 p-1.5 rounded-md",
                      ok ? "bg-success/15 text-success" : "bg-muted text-muted-foreground",
                    )}
                  >
                    {ok ? <CheckCircle2 className="h-4 w-4" /> : <PermissionIcon kind={item.kind} />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-medium">{item.label}</p>
                      <span
                        className={cn(
                          "text-2xs font-medium shrink-0",
                          ok ? "text-success" : item.status === "denied" ? "text-destructive" : "text-warning",
                        )}
                      >
                        {isChecking ? "Memeriksa..." : statusLabel(item.status)}
                      </span>
                    </div>
                    <p className="text-2xs text-muted-foreground mt-0.5">{item.description}</p>
                  </div>
                </li>
              );
            })}
          </ul>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <button
            type="button"
            onClick={handleAllowAll}
            disabled={isRequesting || isChecking}
            className={cn(
              "w-full h-11 rounded-md bg-primary text-primary-foreground text-sm font-medium",
              "disabled:opacity-50 flex items-center justify-center gap-2",
            )}
          >
            {isRequesting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Meminta izin...
              </>
            ) : allGranted ? (
              "Periksa ulang izin"
            ) : (
              "Izinkan Semua"
            )}
          </button>

          <p className="text-2xs text-center text-muted-foreground">
            Anda tidak bisa melanjutkan sebelum lokasi dan kamera diizinkan.
          </p>
        </div>
      </div>
    </div>
  );
}
