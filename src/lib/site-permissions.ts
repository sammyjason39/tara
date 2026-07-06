import {
  hasSessionGeolocationGrant,
  queryGeolocationPermission,
  requestDeviceLocation,
} from "@/lib/geolocation";

export type SitePermissionKind = "geolocation" | "camera";

export type SitePermissionStatus = "granted" | "denied" | "prompt" | "unsupported" | "unknown";

export interface SitePermissionItem {
  kind: SitePermissionKind;
  label: string;
  description: string;
  status: SitePermissionStatus;
}

const PERMISSION_META: Record<
  SitePermissionKind,
  { label: string; description: string }
> = {
  geolocation: {
    label: "Lokasi",
    description: "Untuk verifikasi absensi di area kantor (GPS).",
  },
  camera: {
    label: "Kamera",
    description: "Untuk foto selfie saat clock-in dan clock-out.",
  },
};

export function getMobileRequiredPermissions(): SitePermissionKind[] {
  return ["geolocation", "camera"];
}

export async function checkSitePermission(
  kind: SitePermissionKind,
): Promise<SitePermissionStatus> {
  if (kind === "geolocation") {
    const state = await queryGeolocationPermission();
    if (state === "granted" || hasSessionGeolocationGrant()) {
      return "granted";
    }
    return state;
  }

  if (!navigator.mediaDevices?.getUserMedia) {
    return "unsupported";
  }

  if (navigator.permissions?.query) {
    try {
      const status = await navigator.permissions.query({
        name: "camera" as PermissionName,
      });
      return status.state as SitePermissionStatus;
    } catch {
      return "unknown";
    }
  }

  return "unknown";
}

export async function requestSitePermission(
  kind: SitePermissionKind,
): Promise<SitePermissionStatus> {
  if (kind === "geolocation") {
    if (!navigator.geolocation) return "unsupported";

    try {
      await requestDeviceLocation();
      return "granted";
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message.toLowerCase() : "";
      if (message.includes("ditolak") || message.includes("izin")) {
        return "denied";
      }
      // Permission may be granted but GPS fix failed — don't block the app gate forever.
      if (hasSessionGeolocationGrant()) {
        return "granted";
      }
      return "prompt";
    }
  }

  if (!navigator.mediaDevices?.getUserMedia) {
    return "unsupported";
  }

  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: "user" },
      audio: false,
    });
    stream.getTracks().forEach((track) => track.stop());
    return "granted";
  } catch (err: unknown) {
    const name = err instanceof DOMException ? err.name : "";
    if (name === "NotAllowedError" || name === "PermissionDeniedError") {
      return "denied";
    }
    return "denied";
  }
}

export async function getMobilePermissionSnapshot(): Promise<SitePermissionItem[]> {
  const kinds = getMobileRequiredPermissions();
  const statuses = await Promise.all(kinds.map((kind) => checkSitePermission(kind)));

  return kinds.map((kind, index) => ({
    kind,
    label: PERMISSION_META[kind].label,
    description: PERMISSION_META[kind].description,
    status: statuses[index],
  }));
}

export function isPermissionSatisfied(status: SitePermissionStatus): boolean {
  return status === "granted" || status === "unsupported";
}

export async function areMobileSitePermissionsGranted(): Promise<boolean> {
  const items = await getMobilePermissionSnapshot();
  return items.every((item) => isPermissionSatisfied(item.status));
}

export async function requestAllMobileSitePermissions(): Promise<SitePermissionItem[]> {
  for (const kind of getMobileRequiredPermissions()) {
    const current = await checkSitePermission(kind);
    if (!isPermissionSatisfied(current)) {
      await requestSitePermission(kind);
    }
  }
  return getMobilePermissionSnapshot();
}

export function getDefaultMobilePermissionItems(): SitePermissionItem[] {
  return getMobileRequiredPermissions().map((kind) => ({
    kind,
    label: PERMISSION_META[kind].label,
    description: PERMISSION_META[kind].description,
    status: "unknown" as const,
  }));
}
