import { useEffect, useState } from "react";
import { Download, Loader2, Share, Smartphone, X } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { detectInAppBrowser } from "@/lib/geolocation";
import {
  type BeforeInstallPromptEvent,
  clearPwaPromptSession,
  dismissPwaInstallPrompt,
  getPwaInstallPlatform,
  isStandalonePwa,
  shouldShowPwaInstallPrompt,
} from "@/lib/pwa-install";
import { cn } from "@/lib/utils";

function IosSteps() {
  return (
    <ol className="space-y-3 text-sm text-muted-foreground">
      <li className="flex gap-3">
        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gold/15 text-xs font-semibold text-gold">
          1
        </span>
        <span>
          Buka <strong className="text-foreground">Safari</strong> (bukan Chrome) di halaman TARA ini.
        </span>
      </li>
      <li className="flex gap-3">
        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gold/15 text-xs font-semibold text-gold">
          2
        </span>
        <span className="flex items-start gap-1.5">
          Tap ikon <Share className="h-4 w-4 text-gold shrink-0 mt-0.5" /> <strong className="text-foreground">Bagikan</strong> di bawah layar.
        </span>
      </li>
      <li className="flex gap-3">
        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gold/15 text-xs font-semibold text-gold">
          3
        </span>
        <span>
          Pilih <strong className="text-foreground">Add to Home Screen</strong> /{" "}
          <strong className="text-foreground">Tambahkan ke Layar Utama</strong>.
        </span>
      </li>
      <li className="flex gap-3">
        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gold/15 text-xs font-semibold text-gold">
          4
        </span>
        <span>
          Tap <strong className="text-foreground">Add</strong> — ikon TARA akan muncul di home screen HP Anda.
        </span>
      </li>
    </ol>
  );
}

function AndroidSteps() {
  return (
    <ol className="space-y-3 text-sm text-muted-foreground">
      <li className="flex gap-3">
        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gold/15 text-xs font-semibold text-gold">
          1
        </span>
        <span>
          Tap tombol <strong className="text-foreground">Install Aplikasi</strong> di bawah jika tersedia.
        </span>
      </li>
      <li className="flex gap-3">
        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gold/15 text-xs font-semibold text-gold">
          2
        </span>
        <span>
          Atau buka menu <strong className="text-foreground">⋮</strong> di Chrome →{" "}
          <strong className="text-foreground">Install app</strong> /{" "}
          <strong className="text-foreground">Tambahkan ke Layar Utama</strong>.
        </span>
      </li>
      <li className="flex gap-3">
        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gold/15 text-xs font-semibold text-gold">
          3
        </span>
        <span>
          Buka TARA dari ikon di home screen untuk absensi GPS & kamera yang lebih stabil.
        </span>
      </li>
    </ol>
  );
}

export function PwaInstallPromptModal() {
  const { user, isAuthenticated, isLoading, mustChangePassword } = useAuth();
  const [visible, setVisible] = useState(false);
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalling, setIsInstalling] = useState(false);

  const platform = getPwaInstallPlatform();
  const inAppBrowser = detectInAppBrowser();

  useEffect(() => {
    const handler = (e: BeforeInstallPromptEvent) => {
      e.preventDefault();
      setInstallPrompt(e);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  useEffect(() => {
    if (isLoading || !isAuthenticated || !user || mustChangePassword) {
      setVisible(false);
      return;
    }

    const show = shouldShowPwaInstallPrompt(user.id);
    setVisible(show);
  }, [isLoading, isAuthenticated, user, mustChangePassword]);

  useEffect(() => {
    if (isStandalonePwa() && user) {
      dismissPwaInstallPrompt(user.id);
      setVisible(false);
    }
  }, [user]);

  if (!visible || !user) return null;

  const handleDismiss = () => {
    dismissPwaInstallPrompt(user.id);
    setVisible(false);
  };

  const handleInstall = async () => {
    if (!installPrompt) return;
    setIsInstalling(true);
    try {
      await installPrompt.prompt();
      const { outcome } = await installPrompt.userChoice;
      if (outcome === "accepted") {
        dismissPwaInstallPrompt(user.id);
        clearPwaPromptSession();
        setVisible(false);
      }
    } finally {
      setIsInstalling(false);
      setInstallPrompt(null);
    }
  };

  return (
    <div className="fixed inset-0 z-[90] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-4 animate-fade-in">
      <div
        className="bg-card rounded-t-2xl sm:rounded-2xl w-full max-w-md shadow-luxury-lg border border-gold/20 max-h-[90vh] overflow-y-auto"
        role="dialog"
        aria-modal="true"
        aria-labelledby="pwa-install-title"
      >
        <div className="p-6 space-y-5">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-full bg-gold/10">
                <Smartphone className="h-5 w-5 text-gold" />
              </div>
              <div>
                <h2 id="pwa-install-title" className="font-display font-semibold text-lg">
                  Install TARA di HP
                </h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Disarankan untuk absensi harian
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleDismiss}
              className="p-1.5 rounded-md hover:bg-accent shrink-0"
              aria-label="Tutup"
            >
              <X className="h-4 w-4 text-muted-foreground" />
            </button>
          </div>

          <p className="text-sm text-muted-foreground leading-relaxed">
            Halo <span className="font-medium text-foreground">{user.full_name}</span>, pasang TARA sebagai
            aplikasi di layar utama HP Anda. GPS, kamera selfie, dan notifikasi absensi lebih stabil dari
            ikon aplikasi dibanding membuka lewat browser biasa.
          </p>

          {inAppBrowser && (
            <div className="rounded-lg border border-warning/40 bg-warning/10 p-3 text-sm text-warning">
              Anda membuka TARA dari <strong>{inAppBrowser}</strong>. Untuk install, buka dulu di{" "}
              <strong>Safari</strong> atau <strong>Chrome</strong> eksternal.
            </div>
          )}

          <div className="rounded-xl border border-border bg-secondary/30 p-4">
            {platform === "ios" ? <IosSteps /> : <AndroidSteps />}
          </div>

          {platform === "android" && installPrompt && !inAppBrowser && (
            <button
              type="button"
              onClick={handleInstall}
              disabled={isInstalling}
              className={cn(
                "w-full h-11 rounded-md bg-gold text-primary-foreground text-sm font-semibold",
                "hover:bg-gold/90 disabled:opacity-50 flex items-center justify-center gap-2",
              )}
            >
              {isInstalling ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Memproses...
                </>
              ) : (
                <>
                  <Download className="h-4 w-4" />
                  Install Aplikasi
                </>
              )}
            </button>
          )}

          <button
            type="button"
            onClick={handleDismiss}
            className="w-full h-10 text-sm text-muted-foreground hover:text-foreground"
          >
            Nanti saja
          </button>
        </div>
      </div>
    </div>
  );
}
