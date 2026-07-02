import { useEffect, useState } from "react";

type Props = {
  docId: string;
  title: string;
  className?: string;
};

/**
 * Loads SOP PDF via fetch (bypasses PWA navigateFallback) and embeds as blob URL.
 */
export function SopPdfEmbed({ docId, title, className }: Props) {
  const [src, setSrc] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let objectUrl: string | null = null;
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError(null);
      setSrc(null);

      try {
        const token = localStorage.getItem("tara-token");
        const res = await fetch(`/api/sop/${docId}/file`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });

        if (!res.ok) {
          throw new Error(
            res.status === 404
              ? "File PDF tidak ditemukan di server. Coba upload ulang dokumen ini."
              : `Gagal memuat PDF (HTTP ${res.status})`,
          );
        }

        const blob = await res.blob();
        const contentType = blob.type || res.headers.get("content-type") || "";

        if (contentType.includes("json") || contentType.includes("html")) {
          throw new Error("File PDF tidak tersedia. Response server tidak valid.");
        }

        objectUrl = URL.createObjectURL(blob);
        if (!cancelled) setSrc(objectUrl);
      } catch (err: any) {
        if (!cancelled) setError(err.message || "Gagal memuat PDF");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [docId]);

  if (loading) {
    return (
      <div className={className ?? "flex h-full items-center justify-center text-sm text-muted-foreground"}>
        Memuat PDF...
      </div>
    );
  }

  if (error) {
    return (
      <div className={className ?? "flex h-full items-center justify-center p-6 text-center text-sm text-destructive"}>
        {error}
      </div>
    );
  }

  return (
    <iframe
      src={src!}
      className={className ?? "h-full w-full border-0"}
      title={title}
    />
  );
}

export function sopFileApiUrl(docId: string): string {
  return `/api/sop/${docId}/file`;
}

export async function downloadSopFile(docId: string, fileName: string): Promise<void> {
  const token = localStorage.getItem("tara-token");
  const res = await fetch(sopFileApiUrl(docId), {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) throw new Error("Gagal mengunduh file");

  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  a.click();
  URL.revokeObjectURL(url);
}
