export interface GeoPosition {
  latitude: number;
  longitude: number;
  accuracy: number;
}

export type LocationEnvironmentIssue =
  | "insecure"
  | "in_app_browser"
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

export function isIosDevice(): boolean {
  return (
    /iPhone|iPad|iPod/i.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
  );
}

export function isAndroidDevice(): boolean {
  return /Android/i.test(navigator.userAgent);
}

export function isIosChrome(): boolean {
  return isIosDevice() && /CriOS/i.test(navigator.userAgent);
}

export function isIosSafari(): boolean {
  const ua = navigator.userAgent;
  return isIosDevice() && /Safari/i.test(ua) && !/CriOS|FxiOS|EdgiOS|OPiOS/i.test(ua);
}

export function isMobileDevice(): boolean {
  return isIosDevice() || /Android/i.test(navigator.userAgent);
}

export function isStandalonePwa(): boolean {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

const GEO_SESSION_KEY = "tara_geo_granted_v1";

/** iOS Safari often keeps Permissions API at "prompt" after the user allows — session flag backs that up. */
export function markGeolocationGrantedInSession(): void {
  try {
    sessionStorage.setItem(GEO_SESSION_KEY, "1");
  } catch {
    /* ignore */
  }
}

export function hasSessionGeolocationGrant(): boolean {
  try {
    return sessionStorage.getItem(GEO_SESSION_KEY) === "1";
  } catch {
    return false;
  }
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
      detail: `Browser dalam aplikasi ${inApp} biasanya memblokir GPS. Tap menu (⋯) → "Buka di Safari" atau "Buka di Chrome".`,
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
      return "Izin lokasi ditolak. Aktifkan di pengaturan browser atau HP, lalu coba lagi.";
    case err.POSITION_UNAVAILABLE:
      if (isIosDevice()) {
        return "Sinyal GPS tidak tersedia. Pastikan Lokasi HP aktif, izinkan Lokasi Presisi untuk browser/TARA, lalu coba di area terbuka.";
      }
      return "Sinyal GPS lemah. Nyalakan Lokasi/GPS di pengaturan HP, lalu coba lagi.";
    case err.TIMEOUT:
      if (isIosDevice()) {
        return "Timeout mendapatkan lokasi. Pastikan izin Lokasi Presisi aktif, tunggu beberapa detik, lalu coba lagi.";
      }
      return "Timeout mendapatkan lokasi. Pastikan GPS aktif dan coba lagi.";
    default:
      return `Gagal mendapatkan lokasi (kode ${err.code}).`;
  }
}

function withHardTimeout<T>(promise: Promise<T>, ms: number, message: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = window.setTimeout(() => {
      reject(Object.assign(new Error(message), { code: 3 }));
    }, ms);

    promise.then(
      (value) => {
        window.clearTimeout(timer);
        resolve(value);
      },
      (err) => {
        window.clearTimeout(timer);
        reject(err);
      },
    );
  });
}

export async function queryGeolocationPermission(): Promise<PermissionState | "unsupported" | "unknown"> {
  if (!navigator.geolocation) return "unsupported";
  if (!navigator.permissions?.query) return "unknown";
  try {
    const status = await navigator.permissions.query({ name: "geolocation" });
    return status.state;
  } catch {
    return "unknown";
  }
}

export async function requestDeviceLocation(): Promise<GeoPosition> {
  const env = getLocationEnvironment();
  if (env.issue === "insecure" || env.issue === "unsupported") {
    throw new Error(env.detail);
  }
  if (env.issue === "in_app_browser") {
    throw new Error(env.detail);
  }

  // iOS Permissions API is unreliable — always attempt getCurrentPosition and use its error.
  if (!isIosDevice()) {
    const permission = await queryGeolocationPermission();
    if (permission === "denied") {
      throw new Error(formatGeoError({ code: 1 } as GeolocationPositionError));
    }
  }

  const hardTimeoutMs = isIosDevice() ? 55000 : isAndroidDevice() ? 35000 : 45000;
  const hardTimeoutMessage = isIosDevice()
    ? "Tidak ada respons dari GPS. Pastikan izin Lokasi Presisi aktif untuk Safari/TARA, lalu coba lagi."
    : "Tidak ada respons dari GPS. Pastikan izin lokasi sudah diizinkan dan GPS aktif.";

  const position = await withHardTimeout(
    requestDeviceLocationInternal(),
    hardTimeoutMs,
    hardTimeoutMessage,
  );
  markGeolocationGrantedInSession();
  return position;
}

async function requestDeviceLocationInternal(): Promise<GeoPosition> {
  const ios = isIosDevice();
  const android = isAndroidDevice();
  let lastError: GeolocationPositionError | null = null;

  // iOS Safari: getCurrentPosition is more reliable than watchPosition (especially after Precise Location prompt).
  if (ios) {
    const iosStrategies: PositionOptions[] = [
      { enableHighAccuracy: true, timeout: 28000, maximumAge: 0 },
      { enableHighAccuracy: true, timeout: 22000, maximumAge: 30000 },
      { enableHighAccuracy: false, timeout: 20000, maximumAge: 120000 },
    ];

    for (const options of iosStrategies) {
      try {
        return await tryGetCurrentPosition(options);
      } catch (err) {
        lastError = err as GeolocationPositionError;
        if (lastError?.code === 1) break;
      }
    }

    if (lastError?.code !== 1) {
      try {
        return await tryWatchPosition(
          { enableHighAccuracy: true, timeout: 25000, maximumAge: 0 },
          30000,
        );
      } catch (err) {
        lastError = err as GeolocationPositionError;
      }
    }

    throw new Error(formatGeoError(lastError));
  }

  if (android) {
    try {
      return await tryWatchPosition(
        {
          enableHighAccuracy: false,
          timeout: 15000,
          maximumAge: 60000,
        },
        18000,
      );
    } catch (err) {
      lastError = err as GeolocationPositionError;
      if (lastError?.code === 1) {
        throw new Error(formatGeoError(lastError));
      }
    }
  }

  const strategies: PositionOptions[] = android
    ? [
        { enableHighAccuracy: false, timeout: 12000, maximumAge: 300000 },
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 },
      ]
    : [
        { enableHighAccuracy: true, timeout: 20000, maximumAge: 60000 },
        { enableHighAccuracy: false, timeout: 20000, maximumAge: 120000 },
      ];

  for (const options of strategies) {
    try {
      return await tryGetCurrentPosition(options);
    } catch (err) {
      lastError = err as GeolocationPositionError;
      if (lastError?.code === 1) break;
    }
  }

  if (lastError?.code !== 1) {
    try {
      return await tryWatchPosition(
        { enableHighAccuracy: false, timeout: android ? 12000 : 30000, maximumAge: 0 },
        android ? 15000 : 28000,
      );
    } catch (err) {
      lastError = err as GeolocationPositionError;
    }
  }

  throw new Error(formatGeoError(lastError));
}
