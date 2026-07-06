import { useState, useEffect, useRef, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { api } from "@/lib/api";
import {
  requestDeviceLocation,
  getLocationEnvironment,
  queryGeolocationPermission,
  isIosDevice,
  type GeoPosition,
  type LocationEnvironment,
} from "@/lib/geolocation";
import { MapPin, Lock, CheckCircle2, AlertTriangle, Loader2, X } from "lucide-react";
import { formatDateWithWeekday } from "@/lib/dates";
import { cn } from "@/lib/utils";
import { AttendanceSelfieCapture } from "@/components/AttendanceSelfieCapture";

type LocationPermissionState = "unknown" | "prompt" | "granted" | "denied" | "unsupported";

type MyTodayAttendanceData = {
  clock_in_time: string | null;
  clock_out_time: string | null;
  is_tardy: boolean;
  tardiness_minutes: number;
  can_clock_in: boolean;
  can_clock_out: boolean;
};

function formatWibTime(iso: string | null | undefined): string | null {
  if (!iso) return null;
  return new Date(iso).toLocaleTimeString("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Jakarta",
  });
}

async function queryLocationPermission(): Promise<LocationPermissionState> {
  const state = await queryGeolocationPermission();
  if (state === "unsupported") return "unsupported";
  if (state === "unknown") return "unknown";
  return state as LocationPermissionState;
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

export function MobileClockPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<"idle" | "locating" | "pin" | "photo" | "submitting" | "success" | "error">("idle");
  const [clockedIn, setClockedIn] = useState(false);
  const [clockInTime, setClockInTime] = useState<string | null>(null);
  const [clockOutTime, setClockOutTime] = useState<string | null>(null);
  const [todayTardy, setTodayTardy] = useState<{ minutes: number } | null>(null);
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
  const [showSelfieCapture, setShowSelfieCapture] = useState(false);
  const [geofenceInfo, setGeofenceInfo] = useState<{
    within_fence: boolean;
    distance_meters: number;
    office_name: string;
    geofence_radius_meters: number;
  } | null>(null);

  const { data: monthlyTardinessRes } = useQuery({
    queryKey: ["my-monthly-tardiness"],
    queryFn: () => api.get("/attendance/my-monthly-tardiness"),
    placeholderData: { data: { total_tardiness_minutes: 0, tardy_days: 0, is_over_threshold: false } },
  });
  const monthlyTardiness = monthlyTardinessRes?.data;

  const { data: todayAttendanceRes, refetch: refetchTodayAttendance } = useQuery({
    queryKey: ["my-today-attendance", user?.id],
    queryFn: () => api.get<{ data: MyTodayAttendanceData }>("/attendance/my-today"),
    enabled: !!user?.id,
    refetchOnWindowFocus: true,
  });
  const todayAttendance = todayAttendanceRes?.data;
  const isDayComplete = !!(todayAttendance?.clock_in_time && todayAttendance?.clock_out_time);

  const applyTodayAttendance = useCallback((data: MyTodayAttendanceData | undefined) => {
    if (!data) return;
    setClockInTime(formatWibTime(data.clock_in_time));
    setClockOutTime(formatWibTime(data.clock_out_time));
    setClockedIn(data.can_clock_out);
    if (data.is_tardy && data.tardiness_minutes > 0) {
      setTodayTardy({ minutes: data.tardiness_minutes });
    } else if (data.clock_in_time) {
      setTodayTardy(null);
    }
  }, []);

  useEffect(() => {
    applyTodayAttendance(todayAttendance);
  }, [todayAttendance, applyTodayAttendance]);

  useEffect(() => {
    const syncOnVisible = () => {
      if (document.visibilityState === "visible") {
        refetchTodayAttendance();
      }
    };
    document.addEventListener("visibilitychange", syncOnVisible);
    window.addEventListener("focus", syncOnVisible);
    return () => {
      document.removeEventListener("visibilitychange", syncOnVisible);
      window.removeEventListener("focus", syncOnVisible);
    };
  }, [refetchTodayAttendance]);

  const locationBlocked = locationEnv.issue === "in_app_browser" || locationEnv.issue === "insecure" || locationEnv.issue === "unsupported";

  useEffect(() => {
    if (status !== "locating" && !isLocatingPreview) return;

    const safetyTimer = window.setTimeout(() => {
      setIsLocatingPreview(false);
      if (status === "locating") {
        setStatus("error");
        setGeoError((prev) =>
          prev ||
          "Mendapatkan lokasi terlalu lama. Periksa izin lokasi di pengaturan HP, lalu coba lagi.",
        );
        window.setTimeout(() => setStatus("idle"), 3000);
      }
    }, isIosDevice() ? 60000 : 40000);

    return () => window.clearTimeout(safetyTimer);
  }, [status, isLocatingPreview]);

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

      const geo = await api.post<{
        success: boolean;
        data: {
          within_fence: boolean;
          distance_meters: number;
          office_name: string;
          geofence_radius_meters: number;
        };
      }>("/absensi-agent/validate-geofence", {
        employee_id: user.id,
        gps_latitude: position.latitude,
        gps_longitude: position.longitude,
      });

      setGeofenceInfo(geo.data);

      if (!geo.data.within_fence) {
        setStatus("error");
        toast.error(
          `Anda berada ${geo.data.distance_meters}m dari ${geo.data.office_name}. ` +
            `Harus dalam radius ${geo.data.geofence_radius_meters}m untuk absen.`,
        );
        setTimeout(() => setStatus("idle"), 3000);
        return;
      }

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
      setStatus("photo");
      setShowSelfieCapture(true);
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

  const handleSelfieCancel = () => {
    setShowSelfieCapture(false);
    setStatus("idle");
  };

  const handleSelfieCapture = async (photoDataUrl: string) => {
    if (!photoDataUrl?.trim()) {
      toast.error("Foto selfie belum diambil. Silakan ambil foto terlebih dahulu.");
      setShowSelfieCapture(true);
      setStatus("photo");
      return;
    }

    if (!pendingPosition) {
      toast.error("Data lokasi hilang. Silakan ulangi proses absen dari awal.");
      setStatus("idle");
      return;
    }

    setShowSelfieCapture(false);
    await submitClock(pendingPosition, photoDataUrl);
  };

  const submitClock = async (position: GeoPosition, selfiePhoto: string) => {
    if (!selfiePhoto?.trim()) {
      toast.error("Foto selfie wajib untuk absensi via HP.");
      setStatus("photo");
      setShowSelfieCapture(true);
      return;
    }

    setStatus("submitting");
    const now = new Date();
    const timeStr = now.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });

    try {
      if (!clockedIn) {
        const res = await api.post("/absensi-agent/clock-in", {
          employee_id: user!.id,
          timestamp: now.toISOString(),
          gps_latitude: position.latitude,
          gps_longitude: position.longitude,
          biometric_verified: true,
          attendance_source: "phone",
          selfie_photo: selfiePhoto,
        });
        const record = res.data;
        setClockInTime(timeStr);
        setClockedIn(true);
        setStatus("success");
        if (record?.is_tardy) {
          setTodayTardy({ minutes: record.tardiness_minutes });
          toast.warning(`Anda terlambat ${record.tardiness_minutes} menit`);
        } else {
          setTodayTardy(null);
          toast.success(`Clock-in berhasil pukul ${timeStr} WIB`);
        }
        queryClient.invalidateQueries({ queryKey: ["my-monthly-tardiness"] });
        queryClient.invalidateQueries({ queryKey: ["my-today-attendance"] });
      } else {
        await api.post("/absensi-agent/clock-out", {
          employee_id: user!.id,
          timestamp: now.toISOString(),
          gps_latitude: position.latitude,
          gps_longitude: position.longitude,
          attendance_source: "phone",
          selfie_photo: selfiePhoto,
        });
        setClockOutTime(timeStr);
        setClockedIn(false);
        setStatus("success");
        toast.success(`Clock-out berhasil pukul ${timeStr} WIB`);
        queryClient.invalidateQueries({ queryKey: ["my-today-attendance"] });
      }
      setTimeout(() => setStatus("idle"), 2000);
    } catch (err: any) {
      setStatus("error");
      toast.error(err.message || "Gagal mengirim data kehadiran");
      setTimeout(() => setStatus("idle"), 3000);
    }
  };

  const isProcessing = status === "locating" || status === "submitting" || status === "photo" || isLocatingPreview;
  const locationReady = !!lastPosition && !geoError && (geofenceInfo?.within_fence ?? true);

  const locationTitle = () => {
    if (locationBlocked) return locationEnv.label;
    if (permissionState === "unsupported") return "GPS tidak didukung";
    if (geoError) return "Lokasi tidak tersedia";
    if (locationReady) return "Lokasi terdeteksi";
    if (isLocatingPreview || status === "locating") return "Mendapatkan lokasi...";
    if (permissionState === "denied") return "Izin lokasi diblokir";
    return "Lokasi siap untuk absen";
  };

  const locationDetail = () => {
    if (geoError) return geoError;
    if (locationBlocked) return locationEnv.detail;
    if (locationReady) {
      const geoLine = geofenceInfo?.within_fence
        ? `Dalam area ${geofenceInfo.office_name} (~${geofenceInfo.distance_meters}m)`
        : null;
      return [
        geoLine,
        `Akurasi: ~${Math.round(lastPosition!.accuracy)}m • ${lastPosition!.latitude.toFixed(5)}, ${lastPosition!.longitude.toFixed(5)}`,
      ]
        .filter(Boolean)
        .join(" • ");
    }
    if (permissionState === "denied") {
      return isIosDevice()
        ? "Aktifkan lokasi di Pengaturan → Privasi → Layanan Lokasi → Safari (atau TARA), pilih «Saat Menggunakan» dan nyalakan Lokasi Presisi."
        : "Aktifkan izin lokasi di pengaturan HP atau browser, lalu tap Coba Lagi.";
    }
    return "Lokasi akan diambil saat Anda tap Clock In/Out.";
  };

  const statusLabel = () => {
    switch (status) {
      case "locating": return "Mendapatkan lokasi...";
      case "pin": return "Masukkan PIN...";
      case "photo": return "Ambil foto selfie...";
      case "submitting": return "Mengirim data...";
      case "success": return "Berhasil!";
      case "error": return "Gagal. Coba lagi.";
      default:
        if (isDayComplete) return "Absensi hari ini selesai";
        return clockedIn ? "Ketuk untuk Clock Out" : "Ketuk untuk Clock In";
    }
  };

  return (
    <div className="px-5 py-6 space-y-6 animate-fade-in">
      {locationBlocked && (
        <div className="rounded-lg border border-warning/40 bg-warning/10 p-4">
          <div className="flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 text-warning shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-warning">{locationEnv.label}</p>
              <p className="text-2xs text-muted-foreground mt-1">{locationEnv.detail}</p>
            </div>
          </div>
        </div>
      )}

      {monthlyTardiness?.is_over_threshold && (
        <div className="rounded-lg border border-warning/50 bg-warning/15 p-4">
          <div className="flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 text-warning shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-warning">Peringatan Keterlambatan</p>
              <p className="text-2xs text-muted-foreground mt-1">
                Total keterlambatan bulan ini: <strong>{monthlyTardiness.total_tardiness_minutes} menit</strong>
                {" "}({monthlyTardiness.tardy_days} hari terlambat). Batas peringatan: 10 menit/bulan.
              </p>
            </div>
          </div>
        </div>
      )}

      {todayTardy && (
        <div className="rounded-lg border border-warning/40 bg-warning/10 p-3 text-center">
          <p className="text-sm font-medium text-warning">Anda terlambat hari ini</p>
          <p className="text-2xs text-muted-foreground mt-0.5">{todayTardy.minutes} menit setelah batas toleransi</p>
        </div>
      )}

      <div className="text-center space-y-1">
        <p className="text-luxury-label">Kehadiran</p>
        <p className="text-3xl font-display font-semibold">
          {new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}
        </p>
        <p className="text-xs text-muted-foreground">
          {formatDateWithWeekday(new Date())}
        </p>
      </div>

      <div className="flex flex-col items-center space-y-4">
        <button
          onClick={handleClock}
          disabled={isProcessing || status === "pin" || status === "photo" || locationBlocked || isDayComplete}
          className={cn(
            "h-32 w-32 rounded-full flex flex-col items-center justify-center gap-1 transition-all duration-300",
            status === "success"
              ? "bg-success/10 border-2 border-success"
              : status === "error"
              ? "bg-destructive/10 border-2 border-destructive"
              : isDayComplete
              ? "bg-success/5 border-2 border-success/40"
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
          ) : isDayComplete ? (
            <CheckCircle2 className="h-10 w-10 text-success" />
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
            Coba Lagi
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
        <div className="text-center p-3 rounded-md bg-secondary/30 border border-border/50">
          <p className="text-xs text-muted-foreground">Total telat bulan ini</p>
          <p className={cn(
            "text-sm font-semibold mt-1",
            monthlyTardiness?.is_over_threshold ? "text-warning" : "text-foreground",
          )}>
            {monthlyTardiness?.total_tardiness_minutes ?? 0} menit
          </p>
        </div>
      </div>

      <PinDialog
        open={showPinDialog}
        onSubmit={handlePinSubmit}
        onCancel={handlePinCancel}
        isVerifying={isPinVerifying}
        error={pinError}
      />

      <AttendanceSelfieCapture
        open={showSelfieCapture}
        mode={clockedIn ? "out" : "in"}
        officeName={geofenceInfo?.office_name}
        stampMeta={
          user && pendingPosition
            ? {
                employeeName: user.full_name,
                latitude: pendingPosition.latitude,
                longitude: pendingPosition.longitude,
                officeName: geofenceInfo?.office_name,
              }
            : user
              ? { employeeName: user.full_name, officeName: geofenceInfo?.office_name }
              : undefined
        }
        onCapture={handleSelfieCapture}
        onCancel={handleSelfieCancel}
      />
    </div>
  );
}
