import { useCallback, useEffect, useRef, useState } from "react";
import { Camera, Loader2, MapPin, RefreshCw, Sun, X } from "lucide-react";
import { cn } from "@/lib/utils";

type Step = "intro" | "camera" | "preview";

type Props = {
  open: boolean;
  mode: "in" | "out";
  officeName?: string | null;
  onCapture: (dataUrl: string) => void;
  onCancel: () => void;
};

export function AttendanceSelfieCapture({ open, mode, officeName, onCapture, onCancel }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [step, setStep] = useState<Step>("intro");
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isStarting, setIsStarting] = useState(false);

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
  }, []);

  const attachStream = useCallback(async (stream: MediaStream) => {
    streamRef.current = stream;
    if (videoRef.current) {
      videoRef.current.srcObject = stream;
      await videoRef.current.play();
    }
  }, []);

  const startCamera = useCallback(async () => {
    setIsStarting(true);
    setError(null);
    setPreview(null);
    stopCamera();

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "user",
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });
      await attachStream(stream);
      setStep("camera");
    } catch (err: any) {
      const name = err?.name || "";
      if (name === "NotAllowedError" || name === "PermissionDeniedError") {
        setError("Izin kamera ditolak. Aktifkan kamera untuk tara.ralali.io di pengaturan browser.");
      } else if (name === "NotFoundError") {
        setError("Kamera depan tidak ditemukan di perangkat ini.");
      } else {
        setError(err?.message || "Gagal membuka kamera");
      }
      setStep("intro");
    } finally {
      setIsStarting(false);
    }
  }, [attachStream, stopCamera]);

  useEffect(() => {
    if (open) {
      setStep("intro");
      setPreview(null);
      setError(null);
      setIsStarting(false);
    } else {
      stopCamera();
      setPreview(null);
      setError(null);
      setStep("intro");
    }
    return () => stopCamera();
  }, [open, stopCamera]);

  const handleCapture = () => {
    const video = videoRef.current;
    if (!video || !video.videoWidth) {
      setError("Kamera belum siap. Tunggu sebentar lalu coba lagi.");
      return;
    }

    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.drawImage(video, 0, 0);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
    if (!dataUrl || dataUrl.length < 200) {
      setError("Gagal mengambil foto. Coba lagi.");
      return;
    }

    setPreview(dataUrl);
    setStep("preview");
    stopCamera();
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
              </ul>
            </div>

            {error && (
              <p className="text-sm text-destructive text-center">{error}</p>
            )}

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

        {(step === "camera" || step === "preview") && (
          <>
            <p className="text-sm text-muted-foreground">
              {step === "preview"
                ? "Periksa foto Anda. Pastikan wajah terlihat jelas sebelum mengirim."
                : "Arahkan wajah ke kamera depan, lalu tap tombol di bawah."}
            </p>

            <div
              className={cn(
                "relative aspect-[3/4] w-full overflow-hidden rounded-xl bg-black/90 border border-border",
                isStarting && "animate-pulse",
              )}
            >
              {step === "preview" && preview ? (
                <img src={preview} alt="Pratinjau selfie" className="h-full w-full object-cover" />
              ) : (
                <video
                  ref={videoRef}
                  playsInline
                  muted
                  autoPlay
                  className="h-full w-full object-cover scale-x-[-1]"
                />
              )}

              {isStarting && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                  <Loader2 className="h-8 w-8 text-gold animate-spin" />
                </div>
              )}
            </div>

            {error && (
              <p className="text-sm text-destructive text-center">{error}</p>
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
                  onClick={handleCapture}
                  disabled={isStarting || !!error}
                  className="w-full py-3 rounded-lg bg-gold text-primary-foreground text-sm font-semibold disabled:opacity-50"
                >
                  Ambil Foto
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
