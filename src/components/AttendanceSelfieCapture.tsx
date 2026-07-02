import { useCallback, useEffect, useRef, useState } from "react";
import { Camera, Loader2, MapPin, RefreshCw, Sun, X } from "lucide-react";
import {
  bindStreamToVideo,
  isIOSCamera,
  isVideoFrameReady,
  mapCameraError,
  requestFrontCameraStream,
  stopMediaStream,
} from "@/lib/camera";
import {
  captureStampedSelfie,
  fetchClientIp,
  type AttendancePhotoStamp,
} from "@/lib/attendance-photo-stamp";
import { cn } from "@/lib/utils";

type Step = "intro" | "camera" | "preview";

export type AttendanceSelfieStampMeta = Omit<AttendancePhotoStamp, "capturedAt" | "clientIp" | "mode">;

type Props = {
  open: boolean;
  mode: "in" | "out";
  officeName?: string | null;
  stampMeta?: AttendanceSelfieStampMeta;
  onCapture: (dataUrl: string) => void;
  onCancel: () => void;
};

export function AttendanceSelfieCapture({ open, mode, officeName, stampMeta, onCapture, onCancel }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [step, setStep] = useState<Step>("intro");
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isStarting, setIsStarting] = useState(false);
  const [isVideoLive, setIsVideoLive] = useState(false);
  const [clientIp, setClientIp] = useState<string | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const isIos = isIOSCamera();

  const syncVideoReady = useCallback(() => {
    const video = videoRef.current;
    const stream = streamRef.current;
    if (!video || !stream) return false;
    const ready = isVideoFrameReady(video, stream);
    setIsVideoLive(ready);
    return ready;
  }, []);

  const stopCamera = useCallback(() => {
    stopMediaStream(streamRef.current);
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setIsVideoLive(false);
  }, []);

  const bindActiveStream = useCallback(async () => {
    const video = videoRef.current;
    const stream = streamRef.current;
    if (!video || !stream) return false;

    try {
      await bindStreamToVideo(video, stream);
      const ready = syncVideoReady();
      if (ready) setError(null);
      return ready;
    } catch (err: unknown) {
      // iOS may show preview before dimensions are reported — don't hard-fail if track is live.
      if (isIOSCamera() && syncVideoReady()) {
        setError(null);
        return true;
      }
      setIsVideoLive(false);
      setError(mapCameraError(err));
      return false;
    }
  }, [syncVideoReady]);

  const startCamera = useCallback(async () => {
    setIsStarting(true);
    setError(null);
    setPreview(null);
    setIsVideoLive(false);
    stopCamera();

    try {
      const stream = await requestFrontCameraStream();
      streamRef.current = stream;
      setStep("camera");
    } catch (err: unknown) {
      setError(mapCameraError(err));
      setStep("intro");
    } finally {
      setIsStarting(false);
    }
  }, [stopCamera]);

  // Attach stream after <video> mounts (Android needs post-mount bind; iOS uses playing events).
  useEffect(() => {
    if (step !== "camera" || !streamRef.current) return;

    let cancelled = false;
    const run = async () => {
      const delayFrames = isIOSCamera() ? 1 : 2;
      for (let i = 0; i < delayFrames; i++) {
        await new Promise((r) => requestAnimationFrame(r));
        if (cancelled) return;
      }
      const ok = await bindActiveStream();
      if (!cancelled && !ok && !syncVideoReady()) {
        setError(
          isIOSCamera()
            ? "Menunggu kamera iPhone... tap Muat Ulang jika tidak muncul."
            : "Kamera tidak menampilkan gambar. Tap Muat Ulang Kamera.",
        );
      }
    };

    void run();
    return () => {
      cancelled = true;
    };
  }, [step, bindActiveStream, syncVideoReady]);

  // iOS Safari: keep polling + listen for playing until readiness is detected.
  useEffect(() => {
    if (step !== "camera" || !isIos) return;

    const video = videoRef.current;
    if (!video) return;

    const recheck = () => syncVideoReady();

    video.addEventListener("playing", recheck);
    video.addEventListener("loadeddata", recheck);
    video.addEventListener("loadedmetadata", recheck);
    video.addEventListener("resize", recheck);
    video.addEventListener("canplay", recheck);

    const poll = window.setInterval(recheck, 200);
    recheck();

    return () => {
      video.removeEventListener("playing", recheck);
      video.removeEventListener("loadeddata", recheck);
      video.removeEventListener("loadedmetadata", recheck);
      video.removeEventListener("resize", recheck);
      video.removeEventListener("canplay", recheck);
      clearInterval(poll);
    };
  }, [step, isIos, syncVideoReady]);

  useEffect(() => {
    if (open) {
      setStep("intro");
      setPreview(null);
      setError(null);
      setIsStarting(false);
      setIsVideoLive(false);
      setIsCapturing(false);
      void fetchClientIp().then(setClientIp);
    } else {
      stopCamera();
      setPreview(null);
      setError(null);
      setStep("intro");
      setClientIp(null);
      setIsCapturing(false);
    }
    return () => stopCamera();
  }, [open, stopCamera]);

  const handleCapture = async () => {
    const video = videoRef.current;
    const stream = streamRef.current;
    if (!video || !stream) {
      setError("Kamera belum siap. Tunggu preview muncul atau tap Muat Ulang Kamera.");
      return;
    }

    if (!isVideoFrameReady(video, stream) && !isIOSCamera()) {
      setError("Kamera belum siap. Tunggu preview muncul atau tap Muat Ulang Kamera.");
      return;
    }

    setIsCapturing(true);
    setError(null);

    try {
      let ip = clientIp;
      if (!ip) {
        ip = await fetchClientIp();
        setClientIp(ip);
      }

      const dataUrl = captureStampedSelfie(
        video,
        {
          employeeName: stampMeta?.employeeName || "Karyawan",
          capturedAt: new Date(),
          latitude: stampMeta?.latitude,
          longitude: stampMeta?.longitude,
          officeName: stampMeta?.officeName ?? officeName,
          clientIp: ip,
          mode,
        },
        stream,
      );

      setPreview(dataUrl);
      setStep("preview");
      stopCamera();
    } catch {
      setError("Gagal mengambil foto. Coba lagi.");
    } finally {
      setIsCapturing(false);
    }
  };

  const handleRetake = () => {
    setPreview(null);
    setError(null);
    void startCamera();
  };

  const handleConfirm = () => {
    if (preview?.trim()) onCapture(preview);
  };

  if (!open) return null;

  const title = mode === "in" ? "Foto Clock In" : "Foto Clock Out";
  const showCameraUi = step === "camera" || step === "preview";
  // iOS: preview may render before videoWidth is reported.
  const showLiveVideo = step === "camera" && (isVideoLive || (isIos && !!streamRef.current));
  const showConnectingOverlay = step === "camera" && !showLiveVideo && !isStarting;
  const canCapture =
    isVideoLive ||
    (isIos && step === "camera" && !!streamRef.current && showLiveVideo && !isStarting);

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm animate-fade-in">
      <div className="bg-card rounded-t-2xl sm:rounded-2xl p-5 mx-0 sm:mx-4 w-full max-w-md shadow-luxury-lg space-y-4 max-h-[92vh] overflow-y-auto">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Camera className="h-5 w-5 text-gold" />
            <h3 className="font-display font-semibold text-lg">{title}</h3>
          </div>
          <button type="button" onClick={onCancel} className="p-1.5 rounded-md hover:bg-accent">
            <X className="h-4 w-4 text-muted-foreground" />
          </button>
        </div>

        {step === "intro" && (
          <div className="space-y-4">
            <div className="rounded-xl border border-gold/30 bg-gold/5 p-4 space-y-3">
              <p className="text-sm font-semibold text-foreground">
                Foto selfie wajib untuk verifikasi absensi
              </p>
              <ul className="space-y-2.5 text-sm text-muted-foreground">
                <li className="flex items-start gap-2.5">
                  <MapPin className="h-4 w-4 shrink-0 mt-0.5 text-gold" />
                  <span>
                    Pastikan Anda berada di dalam lingkungan kantor
                    {officeName ? ` (${officeName})` : ""}.
                  </span>
                </li>
                <li className="flex items-start gap-2.5">
                  <Sun className="h-4 w-4 shrink-0 mt-0.5 text-gold" />
                  <span>Gunakan pencahayaan yang terang agar wajah terlihat jelas.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <Camera className="h-4 w-4 shrink-0 mt-0.5 text-gold" />
                  <span>Posisikan wajah di tengah kamera tanpa masker atau topi.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <MapPin className="h-4 w-4 shrink-0 mt-0.5 text-gold" />
                  <span>Foto akan otomatis berisi cap waktu, lokasi GPS, IP, dan nama Anda.</span>
                </li>
              </ul>
            </div>

            {error && <p className="text-sm text-destructive text-center">{error}</p>}

            <button
              type="button"
              onClick={() => void startCamera()}
              disabled={isStarting}
              className="w-full flex items-center justify-center gap-2 py-3.5 rounded-lg bg-gold text-primary-foreground text-sm font-semibold disabled:opacity-50"
            >
              {isStarting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Membuka kamera...
                </>
              ) : (
                <>
                  <Camera className="h-4 w-4" />
                  Ambil Foto
                </>
              )}
            </button>
          </div>
        )}

        {showCameraUi && (
          <>
            <p className="text-sm text-muted-foreground">
              {step === "preview"
                ? "Periksa foto Anda. Pastikan wajah terlihat jelas sebelum mengirim."
                : isIos
                  ? "Arahkan wajah ke kamera depan. Di iPhone, tunggu preview muncul lalu tap Ambil Foto."
                  : "Arahkan wajah ke kamera depan, lalu tap tombol di bawah."}
            </p>

            <div
              className={cn(
                "relative aspect-[3/4] w-full overflow-hidden rounded-xl bg-black border border-border",
                isStarting && "animate-pulse",
              )}
            >
              {step === "preview" && preview ? (
                <img src={preview} alt="Pratinjau selfie" className="h-full w-full object-cover" />
              ) : (
                <>
                  <video
                    ref={videoRef}
                    playsInline
                    muted
                    autoPlay
                    className={cn(
                      "h-full w-full object-cover scale-x-[-1]",
                      !showLiveVideo && "opacity-0",
                    )}
                  />
                  {showConnectingOverlay && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/80 text-center px-4">
                      <Loader2 className="h-8 w-8 text-gold animate-spin" />
                      <p className="text-xs text-muted-foreground">
                        {isIos ? "Menghubungkan kamera iPhone..." : "Menghubungkan kamera..."}
                      </p>
                    </div>
                  )}
                </>
              )}

              {isStarting && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                  <Loader2 className="h-8 w-8 text-gold animate-spin" />
                </div>
              )}
            </div>

            {error && <p className="text-sm text-destructive text-center">{error}</p>}

            {step === "camera" && showConnectingOverlay && (
              <button
                type="button"
                onClick={() => void startCamera()}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg border border-input text-sm font-medium"
              >
                <RefreshCw className="h-4 w-4" />
                Muat Ulang Kamera
              </button>
            )}

            <div className="flex gap-2">
              {step === "preview" ? (
                <>
                  <button
                    type="button"
                    onClick={handleRetake}
                    className="flex-1 flex items-center justify-center gap-2 py-3 rounded-lg border border-input text-sm font-medium"
                  >
                    <RefreshCw className="h-4 w-4" />
                    Ulangi
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirm}
                    className="flex-1 py-3 rounded-lg bg-gold text-primary-foreground text-sm font-semibold"
                  >
                    Kirim Absensi
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={() => void handleCapture()}
                  disabled={isStarting || !canCapture || isCapturing}
                  className="w-full py-3 rounded-lg bg-gold text-primary-foreground text-sm font-semibold disabled:opacity-50"
                >
                  {isCapturing ? "Memproses foto..." : "Ambil Foto"}
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
