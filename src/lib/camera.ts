/** Progressive getUserMedia constraints — Android Chrome often rejects strict ideals. */
const VIDEO_CONSTRAINT_ATTEMPTS: MediaStreamConstraints[] = [
  { video: { facingMode: { ideal: "user" } }, audio: false },
  { video: { facingMode: "user" }, audio: false },
  { video: true, audio: false },
];

export async function requestFrontCameraStream(): Promise<MediaStream> {
  if (!navigator.mediaDevices?.getUserMedia) {
    throw new Error("Kamera tidak didukung di browser ini");
  }

  let lastError: unknown;
  for (const constraints of VIDEO_CONSTRAINT_ATTEMPTS) {
    try {
      return await navigator.mediaDevices.getUserMedia(constraints);
    } catch (err) {
      lastError = err;
      const name = err instanceof DOMException ? err.name : "";
      if (name === "NotAllowedError" || name === "PermissionDeniedError") {
        throw err;
      }
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error("Gagal membuka kamera depan");
}

export function stopMediaStream(stream: MediaStream | null | undefined): void {
  stream?.getTracks().forEach((track) => track.stop());
}

/**
 * Bind a MediaStream to a <video> and wait until frames are available.
 * Required on Android where play() before mount or before loadedmetadata shows black.
 */
export async function bindStreamToVideo(
  video: HTMLVideoElement,
  stream: MediaStream,
  timeoutMs = 8000,
): Promise<void> {
  video.setAttribute("playsinline", "true");
  video.setAttribute("webkit-playsinline", "true");
  video.muted = true;
  video.autoplay = true;
  video.playsInline = true;
  video.srcObject = stream;

  await new Promise<void>((resolve, reject) => {
    let settled = false;

    const finish = (fn: () => void) => {
      if (settled) return;
      settled = true;
      cleanup();
      fn();
    };

    const onReady = () => {
      video
        .play()
        .then(() => {
          if (video.videoWidth > 0) {
            finish(resolve);
          }
        })
        .catch((e) => finish(() => reject(e)));
    };

    const cleanup = () => {
      video.removeEventListener("loadedmetadata", onReady);
      video.removeEventListener("canplay", onReady);
      clearTimeout(timer);
    };

    video.addEventListener("loadedmetadata", onReady);
    video.addEventListener("canplay", onReady);

    const timer = window.setTimeout(() => {
      if (video.videoWidth > 0) {
        finish(resolve);
        return;
      }
      finish(() =>
        reject(new Error("Kamera tidak menampilkan gambar. Tutup tab lain yang memakai kamera, lalu coba lagi.")),
      );
    }, timeoutMs);

    if (video.readyState >= HTMLMediaElement.HAVE_METADATA) {
      onReady();
    } else {
      void video.play().catch(() => undefined);
    }
  });
}

export function mapCameraError(err: unknown): string {
  const name = err instanceof DOMException ? err.name : "";
  if (name === "NotAllowedError" || name === "PermissionDeniedError") {
    return "Izin kamera ditolak. Aktifkan kamera untuk situs ini di pengaturan browser.";
  }
  if (name === "NotFoundError" || name === "DevicesNotFoundError") {
    return "Kamera depan tidak ditemukan di perangkat ini.";
  }
  if (name === "NotReadableError" || name === "TrackStartError") {
    return "Kamera sedang dipakai aplikasi lain. Tutup aplikasi tersebut lalu coba lagi.";
  }
  if (err instanceof Error && err.message) return err.message;
  return "Gagal membuka kamera";
}
