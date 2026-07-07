import { Download, Loader2, Smartphone, X } from "lucide-react";
import { usePwaInstall } from "@/hooks/usePwaInstall";
import { AndroidInstallSteps, IosInstallSteps } from "@/components/pwa/PwaInstallSteps";
import { cn } from "@/lib/utils";

interface PwaInstallGuideProps {
  open: boolean;
  onClose: () => void;
  onInstalled?: () => void;
}

export function PwaInstallGuide({ open, onClose, onInstalled }: PwaInstallGuideProps) {
  const { platform, inAppBrowser, canDirectInstall, isInstalling, install } = usePwaInstall();

  if (!open) return null;

  const handleInstall = async () => {
    const outcome = await install();
    if (outcome === "accepted") {
      onInstalled?.();
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-[90] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-4 animate-fade-in">
      <div
        className="bg-card rounded-t-2xl sm:rounded-2xl w-full max-w-md shadow-luxury-lg border border-gold/20 max-h-[90vh] overflow-y-auto"
        role="dialog"
        aria-modal="true"
        aria-labelledby="pwa-guide-title"
      >
        <div className="p-6 space-y-5">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-full bg-gold/10">
                <Smartphone className="h-5 w-5 text-gold" />
              </div>
              <div>
                <h2 id="pwa-guide-title" className="font-display font-semibold text-lg">
                  Install TARA di HP
                </h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {platform === "ios" ? "Panduan iPhone / iPad" : "Panduan Android"}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-md hover:bg-accent shrink-0"
              aria-label="Tutup"
            >
              <X className="h-4 w-4 text-muted-foreground" />
            </button>
          </div>

          {inAppBrowser && (
            <div className="rounded-lg border border-warning/40 bg-warning/10 p-3 text-sm text-warning">
              Anda membuka TARA dari <strong>{inAppBrowser}</strong>. Untuk install, buka dulu di{" "}
              <strong>Safari</strong> atau <strong>Chrome</strong> eksternal.
            </div>
          )}

          <div className="rounded-xl border border-border bg-secondary/30 p-4">
            {platform === "ios" ? <IosInstallSteps /> : <AndroidInstallSteps />}
          </div>

          {canDirectInstall && (
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
        </div>
      </div>
    </div>
  );
}
