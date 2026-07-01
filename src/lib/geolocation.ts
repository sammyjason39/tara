export interface GeoPosition {
  latitude: number;
  longitude: number;
  accuracy: number;
}

export type LocationEnvironmentIssue =
  | "insecure"
  | "in_app_browser"
  | "ios_standalone"
  | "unsupported";

export interface LocationEnvironment {
  issue: LocationEnvironmentIssue | null;
  label: string;
  detail: string;
}

const IN_APP_UA: Array<{ pattern: RegExp; label: string }> = [
  { pattern: /WhatsApp/i, label: "WhatsApp" },
  { pattern: /Instagram|FBAN|FBAV/i, label: "Instagram/Facebook" },
  { pattern: /Line\//i, label: "LINE" },
  { pattern: /MicroMessenger/i, label: "WeChat" },
  { pattern: /Telegram/i, label: "Telegram" },
  { pattern: /Twitter/i, label: "Twitter/X" },
];

export function isMobileDevice(): boolean {
  return /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
}

export function isStandalonePwa(): boolean {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

export function detectInAppBrowser(): string | null {
  const ua = navigator.userAgent || "";
  for (const { pattern, label } of IN_APP_UA) {
    if (pattern.test(ua)) return label;
  }
  if (/Android/i.test(ua) && /;\s*wv\)/.test(ua)) return "in-app browser";
  return null;
}

export function getLocationEnvironment(): LocationEnvironment {
  if (!window.isSecureContext) {
    return {
      issue: "insecure",
      label: "Koneksi tidak aman (HTTP)",
      detail: "GPS hanya berfungsi via HTTPS. Buka https://tara.ralali.io di browser, jangan lewat IP atau HTTP.",
    };
  }

  if (!navigator.geolocation) {
    return {
      issue: "unsupported",
      label: "GPS tidak didukung",
      detail: "Browser ini tidak mendukung geolocation. Gunakan Safari (iOS) atau Chrome (Android).",
    };
  }

  const inApp = detectInAppBrowser();
  if (inApp) {
    return {
      issue: "in_app_browser",
      label: `Dibuka dari ${inApp}`,
      detail: `Browser dalam aplikasi ${inApp} biasanya memblokir GPS. Tap menu (⋯) → "Buka di Safari" atau "Buka di Chrome", lalu izinkan lokasi.`,
    };
  }

  if (isStandalonePwa() && /iPhone|iPad|iPod/i.test(navigator.userAgent)) {
    return {
      issue: "ios_standalone",
      label: "Mode aplikasi (ikon Home Screen)",
      detail:
        "Di iPhone, izin lokasi untuk PWA kadang gagal. Buka dulu halaman ini di Safari (bukan dari ikon), izinkan lokasi, lalu baru pakai ikon Home Screen.",
    };
  }

  return {
    issue: null,
    label: "",
    detail: "",
  };
}

function tryGetCurrentPosition(options: PositionOptions): Promise<GeoPosition> {
  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(
      (pos) =>
        resolve({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
        }),
      reject,
      options,
    );
  });
}

function tryWatchPosition(options: PositionOptions, timeoutMs: number): Promise<GeoPosition> {
  return new Promise((resolve, reject) => {
    let watchId = -1;
    const timer = window.setTimeout(() => {
      if (watchId >= 0) navigator.geolocation.clearWatch(watchId);
      reject(Object.assign(new Error("Timeout watchPosition"), { code: 3 }));
    }, timeoutMs);

    watchId = navigator.geolocation.watchPosition(
      (pos) => {
        window.clearTimeout(timer);
        navigator.geolocation.clearWatch(watchId);
        resolve({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
        });
      },
      (err) => {
        window.clearTimeout(timer);
        if (watchId >= 0) navigator.geolocation.clearWatch(watchId);
        reject(err);
      },
      options,
    );
  });
}

function formatGeoError(err: GeolocationPositionError | null): string {
  if (!err) return "Gagal mendapatkan lokasi. Coba lagi.";

  switch (err.code) {
    case err.PERMISSION_DENIED:
      return (
        "Izin lokasi ditolak. " +
        (isMobileDevice()
          ? "iOS: Pengaturan → Privasi → Layanan Lokasi → Safari → Saat Menggunakan. " +
            "Android: ikon gembok di address bar → Izin → Lokasi. " +
            "Lalu refresh halaman dan tap Izinkan Akses Lokasi."
          : "Izinkan lokasi untuk situs ini di pengaturan browser.")
      );
    case err.POSITION_UNAVAILABLE:
      return "Sinyal GPS lemah. Nyalakan Lokasi/GPS di pengaturan HP, buka area terbuka, lalu coba lagi.";
    case err.TIMEOUT:
      return "Timeout mendapatkan lokasi. Pastikan GPS aktif dan coba di area dengan sinyal lebih baik.";
    default:
      return `Gagal mendapatkan lokasi (kode ${err.code}).`;
  }
}

/**
 * Mobile-friendly geolocation: low accuracy first, then high accuracy, then watchPosition.
 */
export async function requestDeviceLocation(): Promise<GeoPosition> {
  const env = getLocationEnvironment();
  if (env.issue === "insecure" || env.issue === "unsupported") {
    throw new Error(env.detail);
  }
  if (env.issue === "in_app_browser") {
    throw new Error(env.detail);
  }

  const mobile = isMobileDevice();
  const strategies: PositionOptions[] = mobile
    ? [
        { enableHighAccuracy: false, timeout: 30000, maximumAge: 300000 },
        { enableHighAccuracy: true, timeout: 25000, maximumAge: 0 },
      ]
    : [
        { enableHighAccuracy: true, timeout: 20000, maximumAge: 60000 },
        { enableHighAccuracy: false, timeout: 20000, maximumAge: 120000 },
      ];

  let lastError: GeolocationPositionError | null = null;

  for (const options of strategies) {
    try {
      return await tryGetCurrentPosition(options);
    } catch (err) {
      lastError = err as GeolocationPositionError;
      if (lastError?.code === 1) break; // PERMISSION_DENIED
    }
  }

  if (lastError?.code !== 1) {
    try {
      return await tryWatchPosition(
        { enableHighAccuracy: false, timeout: 30000, maximumAge: 0 },
        28000,
      );
    } catch (err) {
      lastError = err as GeolocationPositionError;
    }
  }

  if (env.issue === "ios_standalone") {
    throw new Error(`${formatGeoError(lastError)} ${env.detail}`);
  }

  throw new Error(formatGeoError(lastError));
}
