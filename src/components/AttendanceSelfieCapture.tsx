import { useCallback, useEffect, useRef, useState } from "react";
import { Camera, Loader2, RefreshCw, X } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  open: boolean;
  mode: "in" | "out";
  onCapture: (dataUrl: string) => void;
  onCancel: () => void;
};

export function AttendanceSelfieCapture({ open, mode, onCapture, onCancel }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isStarting, setIsStarting] = useState(false);

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
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
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
    } catch (err: any) {
      const name = err?.name || "";
      if (name === "NotAllowedError" || name === "PermissionDeniedError") {
        setError("Izin kamera ditolak. Aktifkan kamera untuk tara.ralali.io di pengaturan browser.");
      } else if (name === "NotFoundError") {
        setError("Kamera depan tidak ditemukan di perangkat ini.");
      } else {
        setError(err?.message || "Gagal membuka kamera");
      }
    } finally {
      setIsStarting(false);
    }
  }, [stopCamera]);

  useEffect(() => {
    if (open) {
      startCamera();
    } else {
      stopCamera();
      setPreview(null);
      setError(null);
    }
    return () => stopCamera();
  }, [open, startCamera, stopCamera]);

  const handleCapture = () => {
    const video = videoRef.current;
    if (!video || !video.videoWidth) return;

    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.drawImage(video, 0, 0);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
    setPreview(dataUrl);
    stopCamera();
  };

  const handleRetake = () => {
    setPreview(null);
    startCamera();
  };

  const handleConfirm = () => {
    if (preview) onCapture(preview);
  };

  if (!open) return null;

  const title = mode === "in" ? "Foto Clock In" : "Foto Clock Out";

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm animate-fade-in">
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

        <p className="text-sm text-muted-foreground">
          Ambil foto wajah Anda untuk verifikasi kehadiran. Pastikan wajah terlihat jelas.
        </p>

        <div
          className={cn(
            "relative aspect-[3/4] w-full overflow-hidden rounded-xl bg-black/90 border border-border",
            isStarting && "animate-pulse",
          )}
        >
          {preview ? (
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
          {preview ? (
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

        {error && (
          <button
            type="button"
            onClick={startCamera}
            className="w-full py-2 text-sm text-gold font-medium"
          >
            Coba buka kamera lagi
          </button>
        )}
      </div>
    </div>
  );
}
