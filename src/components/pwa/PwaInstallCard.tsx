import { useState } from "react";
import { CheckCircle2, ChevronRight, Download, Loader2, Smartphone } from "lucide-react";
import { toast } from "sonner";
import { usePwaInstall } from "@/hooks/usePwaInstall";
import { PwaInstallGuide } from "@/components/pwa/PwaInstallGuide";
import { isMobileDevice } from "@/lib/pwa-install";
import { cn } from "@/lib/utils";

function platformLabel(platform: "ios" | "android" | "other"): string {
  if (platform === "ios") return "iPhone / iPad";
  if (platform === "android") return "Android";
  return "HP Anda";
}

export function PwaInstallCard() {
  const { platform, installed, canDirectInstall, isInstalling, install, inAppBrowser } = usePwaInstall();
  const [showGuide, setShowGuide] = useState(false);

  if (!isMobileDevice()) return null;

  if (installed) {
    return (
      <div className="surface-elevated p-4 flex items-center gap-3 border border-success/30 bg-success/5">
        <div className="p-2 rounded-full bg-success/10">
          <CheckCircle2 className="h-5 w-5 text-success" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-success">TARA sudah terpasang</p>
          <p className="text-2xs text-muted-foreground mt-0.5">
            Anda membuka dari aplikasi di layar utama
          </p>
        </div>
      </div>
    );
  }

  const handleAction = async () => {
    if (canDirectInstall) {
      const outcome = await install();
      if (outcome === "accepted") {
        toast.success("TARA berhasil dipasang di HP Anda!");
      } else if (outcome === "dismissed") {
        setShowGuide(true);
      }
      return;
    }
    setShowGuide(true);
  };

  const actionLabel = canDirectInstall ? "Install Sekarang" : "Lihat Cara Install";

  return (
    <>
      <button
        type="button"
        onClick={handleAction}
        disabled={isInstalling}
        className={cn(
          "w-full surface-elevated p-4 flex items-center gap-3 text-left transition-colors",
          "hover:bg-accent/30 border border-gold/25 active:scale-[0.99]",
          isInstalling && "opacity-70",
        )}
      >
        <div className="p-2.5 rounded-full bg-gold/10 shrink-0">
          <Smartphone className="h-5 w-5 text-gold" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium">Install Aplikasi TARA</p>
          <p className="text-2xs text-muted-foreground mt-0.5 leading-relaxed">
            Pasang di {platformLabel(platform)} untuk absensi GPS & selfie yang lebih stabil
          </p>
          {inAppBrowser && (
            <p className="text-2xs text-warning mt-1">
              Buka di Safari/Chrome untuk install otomatis
            </p>
          )}
        </div>
        <div className="flex flex-col items-end gap-0.5 shrink-0 text-gold">
          {isInstalling ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : canDirectInstall ? (
            <Download className="h-4 w-4" />
          ) : (
            <ChevronRight className="h-4 w-4" />
          )}
          <span className="text-2xs font-semibold">{actionLabel}</span>
        </div>
      </button>

      <PwaInstallGuide
        open={showGuide}
        onClose={() => setShowGuide(false)}
        onInstalled={() => toast.success("TARA berhasil dipasang di HP Anda!")}
      />
    </>
  );
}
