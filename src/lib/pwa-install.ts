import { isIosDevice, isMobileDevice, isStandalonePwa } from "@/lib/geolocation";

const DISMISS_KEY_PREFIX = "tara-pwa-install-dismissed:";
const SESSION_PROMPT_KEY = "tara-show-pwa-prompt";

export function isAndroidDevice(): boolean {
  return /Android/i.test(navigator.userAgent);
}

export function getPwaDismissKey(userId: string): string {
  return `${DISMISS_KEY_PREFIX}${userId}`;
}

export function isPwaInstallDismissed(userId: string): boolean {
  return localStorage.getItem(getPwaDismissKey(userId)) === "1";
}

export function dismissPwaInstallPrompt(userId: string): void {
  localStorage.setItem(getPwaDismissKey(userId), "1");
  sessionStorage.removeItem(SESSION_PROMPT_KEY);
}

export function markPwaPromptForSession(): void {
  sessionStorage.setItem(SESSION_PROMPT_KEY, "1");
}

export function clearPwaPromptSession(): void {
  sessionStorage.removeItem(SESSION_PROMPT_KEY);
}

export function shouldShowPwaInstallPrompt(userId: string | undefined): boolean {
  if (!userId) return false;
  if (!isMobileDevice()) return false;
  if (isStandalonePwa()) return false;
  if (isPwaInstallDismissed(userId)) return false;
  return sessionStorage.getItem(SESSION_PROMPT_KEY) === "1";
}

export type PwaInstallPlatform = "ios" | "android" | "other";

export function getPwaInstallPlatform(): PwaInstallPlatform {
  if (isIosDevice()) return "ios";
  if (isAndroidDevice()) return "android";
  return "other";
}

export interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

declare global {
  interface WindowEventMap {
    beforeinstallprompt: BeforeInstallPromptEvent;
  }
}

export { isIosDevice, isMobileDevice, isStandalonePwa };
