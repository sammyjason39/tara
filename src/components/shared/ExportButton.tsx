import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Download, Loader2, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { useSession } from "@/core/security/session";
import { WatermarkConfigDialog } from "./WatermarkConfigDialog";
import { apiUrl } from "@/lib/api-config";

interface ExportButtonProps {
  endpoint: string;
  filename?: string;
  label?: string;
  variant?: "outline" | "default" | "ghost" | "secondary";
  className?: string;
}

export function ExportButton({
  endpoint,
  filename = "export.xlsx",
  label = "Export to Excel",
  variant = "outline",
  className,
}: ExportButtonProps) {
  const [loading, setLoading] = useState(false);
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const session = useSession();

  const handleExport = async (watermark?: {
    text: string;
    x: number;
    y: number;
  }) => {
    setIsConfigOpen(false);
    setLoading(true);

    try {
      let url = apiUrl(endpoint);
      if (watermark) {
        const params = new URLSearchParams({
          watermarkText: watermark.text,
          wmX: watermark.x.toString(),
          wmY: watermark.y.toString(),
        });
        url += (url.includes("?") ? "&" : "?") + params.toString();
      }

      const response = await fetch(url, {
        method: "GET",
        headers: {
          "x-tenant-id": session.tenantId,
          "x-location-id": session.locationId || "",
          Authorization: `Bearer ${session.token}`,
        },
      });

      if (!response.ok) throw new Error("Export failed");

      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = downloadUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(downloadUrl);
      a.remove();

      toast.success("Secure export completed with forensic tracking.");
    } catch (err) {
      console.error(err);
      toast.error("Failed to export file");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Button
        variant={variant}
        size="sm"
        onClick={() => setIsConfigOpen(true)}
        disabled={loading}
        className={className}
      >
        {loading ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <ShieldCheck className="mr-2 h-4 w-4" />
        )}
        {label}
      </Button>

      <WatermarkConfigDialog
        open={isConfigOpen}
        onOpenChange={setIsConfigOpen}
        onConfirm={(config) => handleExport(config)}
      />
    </>
  );
}
