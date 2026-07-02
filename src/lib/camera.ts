export type CameraPlatform = "ios" | "android" | "other";

const ANDROID_VIDEO_CONSTRAINT_ATTEMPTS: MediaStreamConstraints[] = [
  { video: { facingMode: { ideal: "user" } }, audio: false },
  { video: { facingMode: "user" }, audio: false },
  { video: true, audio: false },
];

const IOS_VIDEO_CONSTRAINT_ATTEMPTS: MediaStreamConstraints[] = [
  {
    video: {
      facingMode: "user",
      width: { ideal: 1280 },
      height: { ideal: 720 },
    },
    audio: false,
  },
  { video: { facingMode: "user" }, audio: false },
  { video: { facingMode: { ideal: "user" } }, audio: false },
];

export function getCameraPlatform(): CameraPlatform {
  if (typeof navigator === "undefined") return "other";
  const ua = navigator.userAgent || "";
  const isIOS =
    /iPad|iPhone|iPod/.test(ua) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  if (isIOS) return "ios";
  if (/Android/i.test(ua)) return "android";
  return "other";
}

export function isIOSCamera(): boolean {
  return getCameraPlatform() === "ios";
}

export function isAndroidCamera(): boolean {
  return getCameraPlatform() === "android";
}

function getConstraintAttempts(): MediaStreamConstraints[] {
  const platform = getCameraPlatform();
  if (platform === "ios") return IOS_VIDEO_CONSTRAINT_ATTEMPTS;
  if (platform === "android") return ANDROID_VIDEO_CONSTRAINT_ATTEMPTS;
  return ANDROID_VIDEO_CONSTRAINT_ATTEMPTS;
}

export async function requestFrontCameraStream(): Promise<MediaStream> {
  if (!navigator.mediaDevices?.getUserMedia) {
    throw new Error("Kamera tidak didukung di browser ini");
  }

  let lastError: unknown;
  for (const constraints of getConstraintAttempts()) {
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

function applyInlineVideoAttrs(video: HTMLVideoElement): void {
  video.setAttribute("playsinline", "true");
  video.setAttribute("webkit-playsinline", "true");
  video.muted = true;
  video.autoplay = true;
  video.playsInline = true;
}

function isStreamTrackLive(stream: MediaStream): boolean {
  const track = stream.getVideoTracks()[0];
  return !!track && track.readyState === "live" && track.enabled;
}

/**
 * Android Chrome: wait until decoded frame dimensions are available.
 */
export function isAndroidVideoReady(
  video: HTMLVideoElement,
  stream: MediaStream,
): boolean {
  return isStreamTrackLive(stream) && video.videoWidth > 0 && video.videoHeight > 0;
}

/**
 * iOS Safari: videoWidth may stay 0 briefly while preview is already visible.
 * Accept live track + playing state as ready.
 */
export function isIOSVideoReady(
  video: HTMLVideoElement,
  stream: MediaStream,
): boolean {
  if (!isStreamTrackLive(stream)) return false;
  if (video.videoWidth > 0 && video.videoHeight > 0) return true;

  const playing = !video.paused && !video.ended && video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA;
  return playing;
}

export function isVideoFrameReady(
  video: HTMLVideoElement,
  stream: MediaStream,
): boolean {
  const platform = getCameraPlatform();
  if (platform === "ios") return isIOSVideoReady(video, stream);
  if (platform === "android") return isAndroidVideoReady(video, stream);
  return isStreamTrackLive(stream) && video.videoWidth > 0;
}

export function getVideoCaptureSize(
  video: HTMLVideoElement,
  stream?: MediaStream | null,
): { width: number; height: number } | null {
  if (video.videoWidth > 0 && video.videoHeight > 0) {
    return { width: video.videoWidth, height: video.videoHeight };
  }

  const settings = stream?.getVideoTracks()[0]?.getSettings();
  if (settings?.width && settings?.height) {
    return { width: settings.width, height: settings.height };
  }

  if (video.clientWidth > 0 && video.clientHeight > 0) {
    const ratio = window.devicePixelRatio || 1;
    return {
      width: Math.round(video.clientWidth * ratio),
      height: Math.round(video.clientHeight * ratio),
    };
  }

  return null;
}

async function bindStreamToVideoAndroid(
  video: HTMLVideoElement,
  stream: MediaStream,
  timeoutMs: number,
): Promise<void> {
  applyInlineVideoAttrs(video);
  video.srcObject = stream;

  await new Promise<void>((resolve, reject) => {
    let settled = false;

    const finish = (fn: () => void) => {
      if (settled) return;
      settled = true;
      cleanup();
      fn();
    };

    const check = () => {
      if (isAndroidVideoReady(video, stream)) {
        finish(resolve);
      }
    };

    const onReady = () => {
      void video.play().then(check).catch((e) => finish(() => reject(e)));
    };

    const cleanup = () => {
      video.removeEventListener("loadedmetadata", onReady);
      video.removeEventListener("canplay", onReady);
      video.removeEventListener("playing", check);
      clearTimeout(timer);
      clearInterval(poll);
    };

    video.addEventListener("loadedmetadata", onReady);
    video.addEventListener("canplay", onReady);
    video.addEventListener("playing", check);

    const poll = window.setInterval(check, 150);
    const timer = window.setTimeout(() => {
      if (isAndroidVideoReady(video, stream)) {
        finish(resolve);
        return;
      }
      finish(() =>
        reject(
          new Error(
            "Kamera tidak menampilkan gambar. Tutup tab lain yang memakai kamera, lalu coba lagi.",
          ),
        ),
      );
    }, timeoutMs);

    if (video.readyState >= HTMLMediaElement.HAVE_METADATA) {
      onReady();
    } else {
      void video.play().catch(() => undefined);
    }
  });
}

async function bindStreamToVideoIOS(
  video: HTMLVideoElement,
  stream: MediaStream,
  timeoutMs: number,
): Promise<void> {
  applyInlineVideoAttrs(video);
  video.srcObject = stream;

  await new Promise<void>((resolve, reject) => {
    let settled = false;

    const finish = (fn: () => void) => {
      if (settled) return;
      settled = true;
      cleanup();
      fn();
    };

    const check = () => {
      if (isIOSVideoReady(video, stream)) {
        finish(resolve);
      }
    };

    const tryPlay = () => {
      void video.play().then(check).catch(() => {
        // iOS may require another user gesture; still resolve if track is live.
        if (isStreamTrackLive(stream)) {
          finish(resolve);
        }
      });
    };

    const cleanup = () => {
      video.removeEventListener("loadedmetadata", tryPlay);
      video.removeEventListener("loadeddata", check);
      video.removeEventListener("canplay", check);
      video.removeEventListener("playing", check);
      video.removeEventListener("resize", check);
      clearTimeout(timer);
      clearInterval(poll);
    };

    video.addEventListener("loadedmetadata", tryPlay);
    video.addEventListener("loadeddata", check);
    video.addEventListener("canplay", check);
    video.addEventListener("playing", check);
    video.addEventListener("resize", check);

    const poll = window.setInterval(check, 120);
    const timer = window.setTimeout(() => {
      if (isIOSVideoReady(video, stream) || isStreamTrackLive(stream)) {
        finish(resolve);
        return;
      }
      finish(() =>
        reject(new Error("Kamera iPhone belum siap. Tutup lalu buka lagi, atau tap Muat Ulang Kamera.")),
      );
    }, timeoutMs);

    tryPlay();
  });
}

/**
 * Bind stream after <video> mount — platform-specific readiness checks.
 */
export async function bindStreamToVideo(
  video: HTMLVideoElement,
  stream: MediaStream,
  timeoutMs?: number,
): Promise<void> {
  const platform = getCameraPlatform();
  const timeout = timeoutMs ?? (platform === "ios" ? 15000 : 8000);

  if (platform === "ios") {
    await bindStreamToVideoIOS(video, stream, timeout);
    return;
  }

  await bindStreamToVideoAndroid(video, stream, timeout);
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
