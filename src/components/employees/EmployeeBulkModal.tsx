import { useRef, useState, Fragment } from "react";
import { createPortal } from "react-dom";
import { toast } from "sonner";
import { api, downloadAuthenticatedFile, uploadFile } from "@/lib/api";
import { cn } from "@/lib/utils";
import {
  X,
  Download,
  Upload,
  FileSpreadsheet,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  MinusCircle,
  Loader2,
} from "lucide-react";

type PreviewRow = {
  row_number: number;
  employee_code: string;
  full_name: string;
  status: "ok" | "warning" | "error" | "unchanged";
  errors: string[];
  warnings: string[];
  changes: Array<{ field: string; label: string; old_value: string; new_value: string }>;
};

type PreviewData = {
  batch_id: string;
  summary: {
    total: number;
    ready: number;
    unchanged: number;
    errors: number;
    warnings: number;
  };
  rows: PreviewRow[];
};

type Props = {
  open: boolean;
  onClose: () => void;
  onApplied: () => void;
};

export function EmployeeBulkModal({ open, onClose, onApplied }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [downloading, setDownloading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [applying, setApplying] = useState(false);
  const [preview, setPreview] = useState<PreviewData | null>(null);
  const [expandedRow, setExpandedRow] = useState<number | null>(null);

  if (!open) return null;

  const handleDownload = async () => {
    setDownloading(true);
    try {
      const date = new Date().toISOString().slice(0, 10);
      await downloadAuthenticatedFile(
        "/employees/bulk/export",
        `tara-karyawan-${date}.xlsx`,
      );
      toast.success("File Excel berhasil didownload");
    } catch (err: any) {
      toast.error(err.message || "Gagal download file");
    } finally {
      setDownloading(false);
    }
  };

  const handleFileSelect = async (file: File | null) => {
    if (!file) return;
    setUploading(true);
    setPreview(null);
    try {
      const res = await uploadFile<{ data: PreviewData }>("/employees/bulk/preview", file);
      setPreview(res.data);
      toast.success("File berhasil dianalisis — review perubahan sebelum approve");
    } catch (err: any) {
      toast.error(err.message || "Gagal memproses file");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const handleApply = async () => {
    if (!preview?.batch_id) return;
    const toApply = preview.summary.ready + preview.summary.warnings;
    if (toApply === 0) {
      toast.error("Tidak ada baris yang siap diupdate");
      return;
    }
    setApplying(true);
    try {
      const res = await api.post("/employees/bulk/apply", { batch_id: preview.batch_id });
      const { updated, failed } = res.data || {};
      if (failed?.length) {
        toast.warning(`${updated} karyawan diupdate, ${failed.length} baris gagal`);
      } else {
        toast.success(`${updated} karyawan berhasil diupdate`);
      }
      onApplied();
      onClose();
    } catch (err: any) {
      toast.error(err.message || "Gagal menerapkan perubahan");
    } finally {
      setApplying(false);
    }
  };

  const statusIcon = (status: PreviewRow["status"]) => {
    switch (status) {
      case "ok":
        return <CheckCircle2 className="h-4 w-4 text-success shrink-0" />;
      case "warning":
        return <AlertTriangle className="h-4 w-4 text-warning shrink-0" />;
      case "error":
        return <XCircle className="h-4 w-4 text-destructive shrink-0" />;
      default:
        return <MinusCircle className="h-4 w-4 text-muted-foreground shrink-0" />;
    }
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-[1px] p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-4xl rounded-lg border border-border bg-card shadow-luxury-lg animate-fade-in max-h-[92vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-5 border-b border-border">
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5 text-gold" />
            <div>
              <h3 className="text-sm font-semibold">Import / Update Karyawan Massal</h3>
              <p className="text-2xs text-muted-foreground">Download → edit di Excel → upload → approve</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded hover:bg-accent">
            <X className="h-4 w-4 text-muted-foreground" />
          </button>
        </div>

        <div className="p-5 space-y-4 overflow-y-auto flex-1">
          <div className="rounded-md border border-gold/30 bg-gold/5 p-3 text-xs text-foreground/90 space-y-1">
            <p className="font-medium text-gold">Catatan penting</p>
            <p>
              Jangan ubah <strong>Nomor Pegawai</strong>, <strong>Nama Pegawai</strong>, dan{" "}
              <strong>Nomor WhatsApp</strong> secara bersamaan dalam satu baris.
            </p>
            <p>
              Minimal satu dari ketiga kolom tersebut harus tetap sama dengan data asli — itu dipakai
              sebagai anchor pencocokan. Kolom <strong>ID Sistem</strong> wajib ada dan tidak boleh dihapus.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={handleDownload}
              disabled={downloading}
              className="flex items-center gap-2 px-4 py-2 rounded-md text-sm border border-input hover:bg-accent transition-colors disabled:opacity-50"
            >
              {downloading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
              Download Data (.xlsx)
            </button>
            <button
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              className="flex items-center gap-2 px-4 py-2 rounded-md text-sm bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
              Upload File yang Sudah Diedit
            </button>
            <input
              ref={fileRef}
              type="file"
              accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              className="hidden"
              onChange={(e) => handleFileSelect(e.target.files?.[0] ?? null)}
            />
          </div>

          {preview && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                {[
                  { label: "Total", value: preview.summary.total },
                  { label: "Siap update", value: preview.summary.ready, className: "text-success" },
                  { label: "Peringatan", value: preview.summary.warnings, className: "text-warning" },
                  { label: "Error", value: preview.summary.errors, className: "text-destructive" },
                  { label: "Tidak berubah", value: preview.summary.unchanged },
                ].map((s) => (
                  <div key={s.label} className="surface-elevated p-3 text-center">
                    <p className={cn("text-lg font-semibold", s.className)}>{s.value}</p>
                    <p className="text-2xs text-muted-foreground">{s.label}</p>
                  </div>
                ))}
              </div>

              <div className="surface-elevated overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left">
                      <th className="px-3 py-2 text-xs text-muted-foreground w-10">#</th>
                      <th className="px-3 py-2 text-xs text-muted-foreground">Karyawan</th>
                      <th className="px-3 py-2 text-xs text-muted-foreground">Status</th>
                      <th className="px-3 py-2 text-xs text-muted-foreground">Perubahan</th>
                    </tr>
                  </thead>
                  <tbody>
                    {preview.rows.map((row) => (
                      <Fragment key={row.row_number}>
                        <tr
                          className="border-b last:border-0 hover:bg-accent/40 cursor-pointer"
                          onClick={() =>
                            setExpandedRow(expandedRow === row.row_number ? null : row.row_number)
                          }
                        >
                          <td className="px-3 py-2 text-2xs text-muted-foreground">{row.row_number}</td>
                          <td className="px-3 py-2">
                            <p className="font-medium">{row.full_name}</p>
                            <p className="text-2xs text-muted-foreground font-mono">{row.employee_code}</p>
                          </td>
                          <td className="px-3 py-2">
                            <div className="flex items-center gap-1.5">
                              {statusIcon(row.status)}
                              <span className="text-xs capitalize">
                                {row.status === "ok"
                                  ? "Siap"
                                  : row.status === "unchanged"
                                    ? "Tidak berubah"
                                    : row.status === "warning"
                                      ? "Peringatan"
                                      : "Error"}
                              </span>
                            </div>
                          </td>
                          <td className="px-3 py-2 text-xs text-muted-foreground">
                            {row.changes.length > 0
                              ? `${row.changes.length} field`
                              : row.errors[0] || "—"}
                          </td>
                        </tr>
                        {expandedRow === row.row_number && (
                          <tr className="bg-accent/20">
                            <td colSpan={4} className="px-4 py-3 space-y-2">
                              {row.changes.length > 0 && (
                                <div className="space-y-1">
                                  <p className="text-2xs font-medium text-muted-foreground">Perubahan:</p>
                                  {row.changes.map((c) => (
                                    <p key={c.field} className="text-xs">
                                      <span className="text-muted-foreground">{c.label}:</span>{" "}
                                      <span className="line-through">{c.old_value || "—"}</span>
                                      {" → "}
                                      <span className="font-medium">{c.new_value || "—"}</span>
                                    </p>
                                  ))}
                                </div>
                              )}
                              {row.warnings.map((w) => (
                                <p key={w} className="text-xs text-warning flex items-center gap-1">
                                  <AlertTriangle className="h-3 w-3" /> {w}
                                </p>
                              ))}
                              {row.errors.map((e) => (
                                <p key={e} className="text-xs text-destructive flex items-center gap-1">
                                  <XCircle className="h-3 w-3" /> {e}
                                </p>
                              ))}
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {preview && (
          <div className="flex justify-end gap-2 p-5 border-t border-border">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-md text-sm border border-input hover:bg-accent"
            >
              Batal
            </button>
            <button
              onClick={handleApply}
              disabled={
                applying ||
                preview.summary.ready + preview.summary.warnings === 0
              }
              className="px-4 py-2 rounded-md text-sm bg-primary text-primary-foreground hover:bg-primary/90 font-medium disabled:opacity-50"
            >
              {applying
                ? "Menyimpan..."
                : `Approve & Update (${preview.summary.ready + preview.summary.warnings} baris)`}
            </button>
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}
