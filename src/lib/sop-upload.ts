export const SOP_MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024;

export function isPdfFile(file: File): boolean {
  if (/\.pdf$/i.test(file.name)) return true;
  return file.type === "application/pdf" || file.type === "application/x-pdf";
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function validateSopFiles(files: File[]): string | null {
  if (files.length === 0) return "Pilih minimal satu file PDF";

  for (const file of files) {
    if (!isPdfFile(file)) {
      return `"${file.name}" bukan file PDF yang valid`;
    }
    if (file.size > SOP_MAX_FILE_SIZE_BYTES) {
      return `"${file.name}" terlalu besar (${formatFileSize(file.size)}). Maks ${formatFileSize(SOP_MAX_FILE_SIZE_BYTES)} per file.`;
    }
    if (file.size === 0) {
      return `"${file.name}" kosong (0 byte)`;
    }
  }

  return null;
}

export async function parseUploadError(res: Response): Promise<string> {
  if (res.status === 413) {
    return "Ukuran upload melebihi batas server. Coba upload per file atau kurangi ukuran file.";
  }
  if (res.status === 502 || res.status === 504) {
    return "Server timeout saat upload. Coba lagi dengan koneksi lebih stabil.";
  }

  const contentType = res.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    const err = await res.json().catch(() => ({} as Record<string, unknown>));
    const message = err.message;
    if (Array.isArray(message)) return message.join(", ");
    if (typeof message === "string" && message.trim()) return message;
    if (typeof err.error === "string" && err.error.trim()) return err.error;
  }

  const text = await res.text().catch(() => "");
  if (/entity too large|too large/i.test(text)) {
    return "Ukuran upload melebihi batas server.";
  }

  return `Upload gagal (HTTP ${res.status})`;
}

export async function uploadSopFile(
  file: File,
  meta: { title?: string; description?: string; category?: string },
  token: string | null,
): Promise<void> {
  const formData = new FormData();
  formData.append("file", file);
  if (meta.title) formData.append("title", meta.title);
  if (meta.description) formData.append("description", meta.description);
  if (meta.category) formData.append("category", meta.category);

  const res = await fetch("/api/sop/upload", {
    method: "POST",
    headers: { ...(token && { Authorization: `Bearer ${token}` }) },
    body: formData,
  });

  if (!res.ok) {
    throw new Error(await parseUploadError(res));
  }
}
