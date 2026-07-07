import { useCallback, useEffect, useState } from "react";
import { detectInAppBrowser } from "@/lib/geolocation";
import {
  type BeforeInstallPromptEvent,
  getPwaInstallPlatform,
  isStandalonePwa,
  type PwaInstallPlatform,
} from "@/lib/pwa-install";

let globalInstallPrompt: BeforeInstallPromptEvent | null = null;
let listenerRegistered = false;
const subscribers = new Set<() => void>();

function notifyPwaInstallSubscribers() {
  subscribers.forEach((fn) => fn());
}

function ensurePwaInstallListener() {
  if (listenerRegistered || typeof window === "undefined") return;
  listenerRegistered = true;
  window.addEventListener("beforeinstallprompt", (e: BeforeInstallPromptEvent) => {
    e.preventDefault();
    globalInstallPrompt = e;
    notifyPwaInstallSubscribers();
  });
  window.addEventListener("appinstalled", () => {
    globalInstallPrompt = null;
    notifyPwaInstallSubscribers();
  });
}

export function usePwaInstall() {
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(globalInstallPrompt);
  const [isInstalling, setIsInstalling] = useState(false);

  const platform: PwaInstallPlatform = getPwaInstallPlatform();
  const installed = isStandalonePwa();
  const inAppBrowser = detectInAppBrowser();
  const canDirectInstall = platform === "android" && !!installPrompt && !inAppBrowser;

  useEffect(() => {
    ensurePwaInstallListener();
    const sync = () => setInstallPrompt(globalInstallPrompt);
    subscribers.add(sync);
    sync();
    return () => {
      subscribers.delete(sync);
    };
  }, []);

  const install = useCallback(async (): Promise<"accepted" | "dismissed" | "unavailable"> => {
    if (!globalInstallPrompt) return "unavailable";
    setIsInstalling(true);
    try {
      await globalInstallPrompt.prompt();
      const { outcome } = await globalInstallPrompt.userChoice;
      globalInstallPrompt = null;
      notifyPwaInstallSubscribers();
      return outcome;
    } finally {
      setIsInstalling(false);
    }
  }, []);

  return {
    platform,
    installed,
    inAppBrowser,
    canDirectInstall,
    isInstalling,
    install,
  };
}
