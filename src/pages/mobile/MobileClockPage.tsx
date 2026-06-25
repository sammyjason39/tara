import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { MapPin, Fingerprint, CheckCircle2, AlertTriangle, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface GeoPosition {
  latitude: number;
  longitude: number;
  accuracy: number;
}

/**
 * Request the device's current GPS position.
 * Returns coordinates or throws with a user-friendly message.
 */
function getGeoLocation(): Promise<GeoPosition> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("Perangkat tidak mendukung GPS"));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) =>
        resolve({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
        }),
      (err) => {
        switch (err.code) {
          case err.PERMISSION_DENIED:
            reject(new Error("Izin lokasi ditolak. Aktifkan GPS dan izinkan akses lokasi."));
            break;
          case err.POSITION_UNAVAILABLE:
            reject(new Error("Lokasi tidak tersedia. Pastikan GPS aktif."));
            break;
          case err.TIMEOUT:
            reject(new Error("Timeout mendapatkan lokasi. Coba lagi."));
            break;
          default:
            reject(new Error("Gagal mendapatkan lokasi"));
        }
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  });
}

/**
 * Attempt biometric verification via WebAuthn.
 * Falls back gracefully if the device doesn't support it.
 */
async function verifyBiometric(): Promise<boolean> {
  try {
    if (!window.PublicKeyCredential) {
      // Device doesn't support WebAuthn — skip biometric
      return false;
    }

    const available = await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
    if (!available) {
      return false;
    }

    // Use a simple user verification challenge (platform authenticator = fingerprint/face)
    const challenge = crypto.getRandomValues(new Uint8Array(32));
    const credential = await navigator.credentials.get({
      publicKey: {
        challenge,
        timeout: 30000,
        userVerification: "required",
        rpId: window.location.hostname,
        allowCredentials: [],
      },
    });

    return !!credential;
  } catch {
    // User cancelled or biometric failed
    return false;
  }
}

export function MobileClockPage() {
  const { user } = useAuth();
  const [status, setStatus] = useState<"idle" | "locating" | "biometric" | "submitting" | "success" | "error">("idle");
  const [clockedIn, setClockedIn] = useState(false);
  const [clockInTime, setClockInTime] = useState<string | null>(null);
  const [clockOutTime, setClockOutTime] = useState<string | null>(null);
  const [geoStatus, setGeoStatus] = useState<"unknown" | "inside" | "outside">("unknown");
  const [geoError, setGeoError] = useState<string | null>(null);
  const [lastPosition, setLastPosition] = useState<GeoPosition | null>(null);

  // Try to get location on page load for status display
  useEffect(() => {
    getGeoLocation()
      .then((pos) => {
        setLastPosition(pos);
        setGeoStatus("inside"); // Backend will validate actual geofence
        setGeoError(null);
      })
      .catch((err) => {
        setGeoError(err.message);
        setGeoStatus("unknown");
      });
  }, []);

  const handleClock = async () => {
    if (!user?.id) {
      toast.error("Sesi tidak valid. Silakan login ulang.");
      return;
    }

    // Step 1: Get GPS location
    setStatus("locating");
    let position: GeoPosition;
    try {
      position = await getGeoLocation();
      setLastPosition(position);
      setGeoStatus("inside");
      setGeoError(null);
    } catch (err: any) {
      setGeoError(err.message);
      setGeoStatus("unknown");
      setStatus("error");
      toast.error(err.message);
      setTimeout(() => setStatus("idle"), 2000);
      return;
    }

    // Step 2: Biometric verification
    setStatus("biometric");
    const biometricVerified = await verifyBiometric();

    // Step 3: Submit to backend
    setStatus("submitting");
    const now = new Date();
    const timeStr = now.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });

    try {
      if (!clockedIn) {
        await api.post("/absensi-agent/clock-in", {
          employee_id: user.id,
          timestamp: now.toISOString(),
          gps_latitude: position.latitude,
          gps_longitude: position.longitude,
          biometric_verified: biometricVerified,
          attendance_source: "phone",
        });
        setClockInTime(timeStr);
        setClockedIn(true);
        setStatus("success");
        toast.success(`Clock-in berhasil pukul ${timeStr} WIB`);
      } else {
        await api.post("/absensi-agent/clock-out", {
          employee_id: user.id,
          timestamp: now.toISOString(),
          gps_latitude: position.latitude,
          gps_longitude: position.longitude,
          attendance_source: "phone",
        });
        setClockOutTime(timeStr);
        setClockedIn(false);
        setStatus("success");
        toast.success(`Clock-out berhasil pukul ${timeStr} WIB`);
      }
      setTimeout(() => setStatus("idle"), 2000);
    } catch (err: any) {
      setStatus("error");
      const msg = err.message || "Gagal mengirim data kehadiran";
      toast.error(msg);
      setTimeout(() => setStatus("idle"), 3000);
    }
  };

  const isProcessing = status === "locating" || status === "biometric" || status === "submitting";

  const statusLabel = () => {
    switch (status) {
      case "locating": return "Mendapatkan lokasi...";
      case "biometric": return "Verifikasi biometrik...";
      case "submitting": return "Mengirim data...";
      case "success": return "Berhasil!";
      case "error": return "Gagal. Coba lagi.";
      default: return clockedIn ? "Ketuk untuk Clock Out" : "Ketuk untuk Clock In";
    }
  };

  return (
    <div className="px-5 py-6 space-y-8 animate-fade-in">
      <div className="text-center space-y-1">
        <p className="text-luxury-label">Kehadiran</p>
        <p className="text-3xl font-display font-semibold">
          {new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}
        </p>
        <p className="text-xs text-muted-foreground">
          {new Date().toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
        </p>
      </div>

      {/* Clock Button */}
      <div className="flex flex-col items-center space-y-4">
        <button
          onClick={handleClock}
          disabled={isProcessing}
          className={cn(
            "h-32 w-32 rounded-full flex flex-col items-center justify-center gap-1 transition-all duration-300",
            status === "success"
              ? "bg-success/10 border-2 border-success"
              : status === "error"
              ? "bg-destructive/10 border-2 border-destructive"
              : clockedIn
              ? "bg-destructive/5 border-2 border-destructive/40 hover:border-destructive"
              : "bg-gradient-to-br from-gold/20 to-gold/5 border-2 border-gold/40 hover:border-gold hover:shadow-luxury-glow",
            isProcessing && "animate-pulse",
            "active:scale-95"
          )}
        >
          {status === "success" ? (
            <CheckCircle2 className="h-10 w-10 text-success" />
          ) : status === "error" ? (
            <AlertTriangle className="h-10 w-10 text-destructive" />
          ) : isProcessing ? (
            <Loader2 className="h-10 w-10 text-gold animate-spin" />
          ) : (
            <>
              <Fingerprint className={cn("h-10 w-10", clockedIn ? "text-destructive" : "text-gold")} />
              <span className={cn("text-2xs font-medium", clockedIn ? "text-destructive" : "text-gold")}>
                {clockedIn ? "CLOCK OUT" : "CLOCK IN"}
              </span>
            </>
          )}
        </button>
        <p className="text-sm text-muted-foreground">{statusLabel()}</p>
      </div>

      {/* Location Status */}
      <div className="surface-elevated p-4 space-y-2">
        <div className="flex items-center gap-2">
          {geoError ? (
            <>
              <AlertTriangle className="h-4 w-4 text-warning" />
              <span className="text-sm font-medium text-warning">Lokasi tidak tersedia</span>
            </>
          ) : geoStatus === "inside" ? (
            <>
              <MapPin className="h-4 w-4 text-success" />
              <span className="text-sm font-medium">Lokasi terdeteksi</span>
            </>
          ) : (
            <>
              <MapPin className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Mendeteksi lokasi...</span>
            </>
          )}
        </div>
        <p className="text-2xs text-muted-foreground pl-6">
          {geoError
            ? geoError
            : lastPosition
            ? `Akurasi: ~${Math.round(lastPosition.accuracy)}m • ${lastPosition.latitude.toFixed(5)}, ${lastPosition.longitude.toFixed(5)}`
            : "Menunggu data GPS..."}
        </p>
      </div>

      {/* Today's Record */}
      <div className="surface-elevated p-4 space-y-3">
        <p className="text-luxury-label">Rekap Hari Ini</p>
        <div className="grid grid-cols-2 gap-3">
          <div className="text-center p-3 rounded-md bg-secondary/50">
            <p className="text-xs text-muted-foreground">Clock In</p>
            <p className="text-sm font-mono font-medium mt-1">{clockInTime || "—"}</p>
          </div>
          <div className="text-center p-3 rounded-md bg-secondary/50">
            <p className="text-xs text-muted-foreground">Clock Out</p>
            <p className="text-sm font-mono font-medium mt-1">{clockOutTime || "—"}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
