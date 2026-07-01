import { useState, useEffect, useRef, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { api } from "@/lib/api";
import {
  requestDeviceLocation,
  getLocationEnvironment,
  type GeoPosition,
  type LocationEnvironment,
} from "@/lib/geolocation";
import { MapPin, Lock, CheckCircle2, AlertTriangle, Loader2, X, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";

type LocationPermissionState = "unknown" | "prompt" | "granted" | "denied" | "unsupported";

async function queryLocationPermission(): Promise<LocationPermissionState> {
  if (!navigator.geolocation) return "unsupported";
  if (!navigator.permissions?.query) return "unknown";

  try {
    const status = await navigator.permissions.query({ name: "geolocation" });
    return status.state as LocationPermissionState;
  } catch {
    return "unknown";
  }
}

function PinDialog({
  open,
  onSubmit,
  onCancel,
  isVerifying,
  error,
}: {
  open: boolean;
  onSubmit: (pin: string) => void;
  onCancel: () => void;
  isVerifying: boolean;
  error: string | null;
}) {
  const [pin, setPin] = useState(["", "", "", "", "", ""]);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (open) {
      setPin(["", "", "", "", "", ""]);
      setTimeout(() => inputRefs.current[0]?.focus(), 100);
    }
  }, [open]);

  if (!open) return null;

  const handleChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;

    const newPin = [...pin];
    newPin[index] = value.slice(-1);
    setPin(newPin);

    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    if (value && index === 5) {
      const fullPin = newPin.join("");
      if (fullPin.length === 6) {
        onSubmit(fullPin);
      }
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !pin[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (pasted.length === 6) {
      setPin(pasted.split(""));
      onSubmit(pasted);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-card rounded-2xl p-6 mx-4 w-full max-w-sm shadow-luxury-lg space-y-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Lock className="h-5 w-5 text-gold" />
            <h3 className="font-display font-semibold text-lg">Masukkan PIN</h3>
          </div>
          <button onClick={onCancel} className="p-1.5 rounded-md hover:bg-accent">
            <X className="h-4 w-4 text-muted-foreground" />
          </button>
        </div>

        <p className="text-sm text-muted-foreground">
          Masukkan PIN 6 digit untuk verifikasi kehadiran Anda.
        </p>

        <div className="flex justify-center gap-2" onPaste={handlePaste}>
          {pin.map((digit, i) => (
            <input
              key={i}
              ref={(el) => { inputRefs.current[i] = el; }}
              type="password"
              inputMode="numeric"
              maxLength={1}
              value={digit}
              onChange={(e) => handleChange(i, e.target.value)}
              onKeyDown={(e) => handleKeyDown(i, e)}
              disabled={isVerifying}
              className={cn(
                "w-11 h-12 text-center text-lg font-mono font-semibold rounded-lg border-2 bg-background transition-all",
                "focus:outline-none focus:ring-2 focus:ring-gold/30 focus:border-gold",
                error ? "border-destructive" : "border-input",
                isVerifying && "opacity-50",
              )}
            />
          ))}
        </div>

        {error && (
          <p className="text-center text-sm text-destructive font-medium animate-fade-in">
            {error}
          </p>
        )}

        {isVerifying && (
          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Memverifikasi...</span>
          </div>
        )}
      </div>
    </div>
  );
}

function EnvironmentBanner({ env }: { env: LocationEnvironment }) {
  if (!env.issue) return null;

  const isHint = env.issue === "ios_chrome";

  return (
    <div
      className={cn(
        "rounded-lg border p-4 space-y-2",
        isHint ? "border-gold/30 bg-gold/5" : "border-warning/40 bg-warning/10",
      )}
    >
      <div className="flex items-start gap-2">
        <AlertTriangle className={cn("h-4 w-4 shrink-0 mt-0.5", isHint ? "text-gold" : "text-warning")} />
        <div className="space-y-1">
          <p className={cn("text-sm font-medium", isHint ? "text-gold" : "text-warning")}>{env.label}</p>
          <p className="text-2xs text-muted-foreground leading-relaxed whitespace-pre-line">{env.detail}</p>
        </div>
      </div>
      {env.issue === "in_app_browser" && (
        <a
          href={window.location.href}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-gold"
        >
          <ExternalLink className="h-3.5 w-3.5" />
          Buka di browser eksternal
        </a>
      )}
      {env.issue === "ios_chrome" && (
        <p className="text-2xs text-muted-foreground pl-6">
          Alternatif cepat: buka <span className="font-mono text-foreground">tara.ralali.io/m/clock</span> di{" "}
          <strong className="text-foreground">Safari</strong>.
        </p>
      )}
    </div>
  );
}

export function MobileClockPage() {
  const { user } = useAuth();
  const [status, setStatus] = useState<"idle" | "locating" | "pin" | "submitting" | "success" | "error">("idle");
  const [clockedIn, setClockedIn] = useState(false);
  const [clockInTime, setClockInTime] = useState<string | null>(null);
  const [clockOutTime, setClockOutTime] = useState<string | null>(null);
  const [locationEnv] = useState<LocationEnvironment>(() => getLocationEnvironment());
  const [permissionState, setPermissionState] = useState<LocationPermissionState>("unknown");
  const [geoError, setGeoError] = useState<string | null>(
    locationEnv.issue === "in_app_browser" || locationEnv.issue === "insecure"
      ? locationEnv.detail
      : null,
  );
  const [lastPosition, setLastPosition] = useState<GeoPosition | null>(null);
  const [isLocatingPreview, setIsLocatingPreview] = useState(false);
  const [showPinDialog, setShowPinDialog] = useState(false);
  const [pinError, setPinError] = useState<string | null>(null);
  const [isPinVerifying, setIsPinVerifying] = useState(false);
  const [pendingPosition, setPendingPosition] = useState<GeoPosition | null>(null);

  const locationBlocked = locationEnv.issue === "in_app_browser" || locationEnv.issue === "insecure" || locationEnv.issue === "unsupported";

  useEffect(() => {
    let mounted = true;
    let permissionStatus: PermissionStatus | null = null;

    const syncPermission = async () => {
      const state = await queryLocationPermission();
      if (mounted) setPermissionState(state);
    };

    syncPermission();

    if (navigator.permissions?.query) {
      navigator.permissions
        .query({ name: "geolocation" })
        .then((status) => {
          permissionStatus = status;
          if (mounted) setPermissionState(status.state as LocationPermissionState);
          status.onchange = () => {
            if (mounted) {
              setPermissionState(status.state as LocationPermissionState);
              if (status.state === "granted") setGeoError(null);
            }
          };
        })
        .catch(() => undefined);
    }

    return () => {
      mounted = false;
      if (permissionStatus) permissionStatus.onchange = null;
    };
  }, []);

  const requestLocation = useCallback(async (): Promise<GeoPosition> => {
    if (locationBlocked) {
      throw new Error(locationEnv.detail);
    }

    setIsLocatingPreview(true);
    setGeoError(null);
    try {
      const position = await requestDeviceLocation();
      setLastPosition(position);
      setPermissionState("granted");
      setGeoError(null);
      return position;
    } catch (err: any) {
      const message = err?.message || "Gagal mendapatkan lokasi";
      setGeoError(message);
      if (message.toLowerCase().includes("ditolak") || message.toLowerCase().includes("izin")) {
        setPermissionState("denied");
      }
      throw err;
    } finally {
      setIsLocatingPreview(false);
    }
  }, [locationBlocked, locationEnv.detail]);

  const handleEnableLocation = async () => {
    try {
      await requestLocation();
      toast.success("Lokasi berhasil diaktifkan");
    } catch (err: any) {
      toast.error(err?.message || "Gagal mengaktifkan lokasi");
    }
  };

  const handleClock = async () => {
    if (!user?.id) {
      toast.error("Sesi tidak valid. Silakan login ulang.");
      return;
    }

    setStatus("locating");
    try {
      const position = await requestLocation();
      setPendingPosition(position);
    } catch (err: any) {
      setStatus("error");
      toast.error(err?.message || "Gagal mendapatkan lokasi");
      setTimeout(() => setStatus("idle"), 2000);
      return;
    }

    setStatus("pin");
    setPinError(null);
    setShowPinDialog(true);
  };

  const handlePinSubmit = async (pin: string) => {
    setIsPinVerifying(true);
    setPinError(null);

    try {
      const result = await api.post<{ success: boolean; data: { verified: boolean } }>("/auth/verify-pin", { pin });

      if (!result.data?.verified) {
        setPinError("PIN salah. Coba lagi.");
        setIsPinVerifying(false);
        return;
      }

      setShowPinDialog(false);
      setIsPinVerifying(false);
      await submitClock(pendingPosition!);
    } catch (err: any) {
      setPinError(err.message || "Gagal verifikasi PIN");
      setIsPinVerifying(false);
    }
  };

  const handlePinCancel = () => {
    setShowPinDialog(false);
    setStatus("idle");
    setPinError(null);
    setIsPinVerifying(false);
  };

  const submitClock = async (position: GeoPosition) => {
    setStatus("submitting");
    const now = new Date();
    const timeStr = now.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });

    try {
      if (!clockedIn) {
        await api.post("/absensi-agent/clock-in", {
          employee_id: user!.id,
          timestamp: now.toISOString(),
          gps_latitude: position.latitude,
          gps_longitude: position.longitude,
          biometric_verified: true,
          attendance_source: "phone",
        });
        setClockInTime(timeStr);
        setClockedIn(true);
        setStatus("success");
        toast.success(`Clock-in berhasil pukul ${timeStr} WIB`);
      } else {
        await api.post("/absensi-agent/clock-out", {
          employee_id: user!.id,
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
      toast.error(err.message || "Gagal mengirim data kehadiran");
      setTimeout(() => setStatus("idle"), 3000);
    }
  };

  const isProcessing = status === "locating" || status === "submitting" || isLocatingPreview;
  const locationReady = !!lastPosition && !geoError;

  const locationTitle = () => {
    if (locationBlocked) return locationEnv.label;
    if (permissionState === "unsupported") return "GPS tidak didukung";
    if (geoError) return "Lokasi tidak tersedia";
    if (locationReady) return "Lokasi terdeteksi";
    if (isLocatingPreview || status === "locating") return "Mendapatkan lokasi...";
    if (permissionState === "denied") return "Izin lokasi diblokir";
    if (locationEnv.issue === "ios_standalone") return "Mode aplikasi iOS";
    return "Lokasi diperlukan untuk absen";
  };

  const locationDetail = () => {
    if (geoError) return geoError;
    if (locationBlocked) return locationEnv.detail;
    if (locationReady) {
      return `Akurasi: ~${Math.round(lastPosition!.accuracy)}m • ${lastPosition!.latitude.toFixed(5)}, ${lastPosition!.longitude.toFixed(5)}`;
    }
    if (permissionState === "denied") {
      return "Reset izin lokasi untuk tara.ralali.io di pengaturan browser/HP, lalu tap tombol di bawah.";
    }
    if (locationEnv.issue === "ios_standalone") return locationEnv.detail;
    return "Tap Izinkan Akses Lokasi — browser akan meminta izin. Pastikan GPS/Layanan Lokasi HP aktif.";
  };

  const statusLabel = () => {
    switch (status) {
      case "locating": return "Mendapatkan lokasi...";
      case "pin": return "Masukkan PIN...";
      case "submitting": return "Mengirim data...";
      case "success": return "Berhasil!";
      case "error": return "Gagal. Coba lagi.";
      default: return clockedIn ? "Ketuk untuk Clock Out" : "Ketuk untuk Clock In";
    }
  };

  return (
    <div className="px-5 py-6 space-y-6 animate-fade-in">
      <EnvironmentBanner env={locationEnv} />

      <div className="text-center space-y-1">
        <p className="text-luxury-label">Kehadiran</p>
        <p className="text-3xl font-display font-semibold">
          {new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}
        </p>
        <p className="text-xs text-muted-foreground">
          {new Date().toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
        </p>
      </div>

      <div className="flex flex-col items-center space-y-4">
        <button
          onClick={handleClock}
          disabled={isProcessing || status === "pin" || locationBlocked}
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
            locationBlocked && "opacity-50",
            "active:scale-95",
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
              <Lock className={cn("h-10 w-10", clockedIn ? "text-destructive" : "text-gold")} />
              <span className={cn("text-2xs font-medium", clockedIn ? "text-destructive" : "text-gold")}>
                {clockedIn ? "CLOCK OUT" : "CLOCK IN"}
              </span>
            </>
          )}
        </button>
        <p className="text-sm text-muted-foreground">{statusLabel()}</p>
      </div>

      <div className="surface-elevated p-4 space-y-3">
        <div className="flex items-center gap-2">
          {geoError || permissionState === "denied" || locationBlocked ? (
            <AlertTriangle className="h-4 w-4 text-warning" />
          ) : locationReady ? (
            <MapPin className="h-4 w-4 text-success" />
          ) : (
            <MapPin className="h-4 w-4 text-muted-foreground" />
          )}
          <span className="text-sm font-medium">{locationTitle()}</span>
        </div>
        <p className="text-2xs text-muted-foreground pl-6 leading-relaxed">{locationDetail()}</p>
        {!locationReady && !locationBlocked && permissionState !== "unsupported" && (
          <button
            type="button"
            onClick={handleEnableLocation}
            disabled={isLocatingPreview}
            className="ml-6 flex items-center gap-2 px-3 py-2 rounded-md bg-gold/10 text-gold text-xs font-medium hover:bg-gold/20 disabled:opacity-50"
          >
            {isLocatingPreview ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <MapPin className="h-3.5 w-3.5" />
            )}
            Izinkan Akses Lokasi
          </button>
        )}
      </div>

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

      <PinDialog
        open={showPinDialog}
        onSubmit={handlePinSubmit}
        onCancel={handlePinCancel}
        isVerifying={isPinVerifying}
        error={pinError}
      />
    </div>
  );
}
