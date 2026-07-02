import { useState, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { api } from "@/lib/api";
import {
  formatFileSize,
  isPdfFile,
  uploadSopFile,
  validateSopFiles,
} from "@/lib/sop-upload";
import {
  FileText, Upload, Plus, Trash2, Search, X, Eye,
  FolderOpen, Download,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { SopPdfEmbed, downloadSopFile } from "@/components/SopPdfEmbed";

export function SopPage() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [showUploadPanel, setShowUploadPanel] = useState(false);
  const [viewingDoc, setViewingDoc] = useState<any>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["sop-documents"],
    queryFn: () => api.get("/sop"),
    placeholderData: { data: [] },
  });

  const allDocs = data?.data || [];
  const categories = [...new Set(allDocs.map((d: any) => d.category).filter(Boolean))] as string[];

  const filteredDocs = allDocs.filter((doc: any) => {
    const matchesSearch = search.trim() === "" || [doc.title, doc.description, doc.file_name]
      .some((f) => f?.toLowerCase().includes(search.toLowerCase()));
    const matchesCat = categoryFilter === "all" || doc.category === categoryFilter;
    return matchesSearch && matchesCat;
  });

  const deleteDoc = async (id: string) => {
    try {
      await api.delete(`/sop/${id}`);
      toast.success("Dokumen SOP berhasil dihapus");
      queryClient.invalidateQueries({ queryKey: ["sop-documents"] });
    } catch (err: any) {
      toast.error(err.message || "Gagal menghapus dokumen");
    }
  };

  const formatSize = (bytes: number) => formatFileSize(bytes);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-luxury-heading text-2xl">Dokumen SOP</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Standard Operating Procedure — panduan operasional perusahaan
          </p>
        </div>
        <button
          onClick={() => setShowUploadPanel(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
        >
          <Upload className="h-4 w-4" />
          Upload SOP
        </button>
      </div>

      {/* Upload Panel */}
      {showUploadPanel && (
        <UploadPanel
          onClose={() => setShowUploadPanel(false)}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ["sop-documents"] });
            setShowUploadPanel(false);
          }}
        />
      )}

      {/* Filters */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari dokumen SOP..."
            className="w-full h-10 pl-9 pr-4 rounded-md border border-input bg-background text-sm placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-ring/20 transition-colors"
          />
        </div>
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="h-10 px-3 rounded-md border border-input bg-background text-sm"
        >
          <option value="all">Semua Kategori</option>
          {categories.map((cat) => (
            <option key={cat} value={cat}>{cat}</option>
          ))}
        </select>
      </div>

      {/* Document List */}
      <div className="space-y-2">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="surface-elevated p-4 flex items-center gap-4">
              <div className="h-10 w-10 rounded-md bg-muted animate-pulse" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-48 bg-muted rounded animate-pulse" />
                <div className="h-3 w-32 bg-muted/60 rounded animate-pulse" />
              </div>
            </div>
          ))
        ) : filteredDocs.length === 0 ? (
          <div className="surface-elevated p-12 text-center">
            <FolderOpen className="h-12 w-12 mx-auto text-muted-foreground/30 mb-3" />
            <p className="text-sm text-muted-foreground">Belum ada dokumen SOP</p>
          </div>
        ) : (
          filteredDocs.map((doc: any) => (
            <div
              key={doc.id}
              className="surface-elevated p-4 flex items-center gap-4 hover:bg-accent/30 transition-colors cursor-pointer group"
              onClick={() => setViewingDoc(doc)}
            >
              <div className="h-10 w-10 rounded-md bg-red-500/10 flex items-center justify-center shrink-0">
                <FileText className="h-5 w-5 text-red-500" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{doc.title}</p>
                <div className="flex items-center gap-2 text-2xs text-muted-foreground mt-0.5">
                  {doc.category && (
                    <span className="px-1.5 py-0.5 rounded bg-accent text-foreground/70 font-medium">{doc.category}</span>
                  )}
                  <span>{formatSize(doc.file_size)}</span>
                  <span>•</span>
                  <span>{new Date(doc.created_at).toLocaleDateString("id-ID")}</span>
                </div>
                {doc.description && (
                  <p className="text-2xs text-muted-foreground mt-1 truncate">{doc.description}</p>
                )}
              </div>
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={(e) => { e.stopPropagation(); setViewingDoc(doc); }}
                  className="p-2 rounded-md hover:bg-accent"
                  title="Lihat"
                >
                  <Eye className="h-4 w-4 text-muted-foreground" />
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); deleteDoc(doc.id); }}
                  className="p-2 rounded-md hover:bg-accent"
                  title="Hapus"
                >
                  <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* PDF Viewer Modal */}
      {viewingDoc && (
        <PdfViewer doc={viewingDoc} onClose={() => setViewingDoc(null)} />
      )}
    </div>
  );
}

// === Upload Panel ===
function UploadPanel({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [category, setCategory] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<string | null>(null);

  const handleFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(e.target.files || []).filter(isPdfFile);
    if (selected.length === 0) {
      toast.error("Hanya file PDF yang diperbolehkan (.pdf)");
      return;
    }

    const validationError = validateSopFiles(selected);
    if (validationError) {
      toast.error(validationError);
      return;
    }

    setFiles(selected);
    if (selected.length === 1 && !title) {
      setTitle(selected[0].name.replace(/\.pdf$/i, ""));
    }
  };

  const handleUpload = async () => {
    const validationError = validateSopFiles(files);
    if (validationError) {
      toast.error(validationError);
      return;
    }

    setUploading(true);
    setUploadProgress(null);
    const token = localStorage.getItem("tara-token");

    try {
      let successCount = 0;

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        setUploadProgress(`Mengupload ${i + 1}/${files.length}: ${file.name}`);

        await uploadSopFile(
          file,
          {
            title:
              files.length === 1 && title
                ? title
                : file.name.replace(/\.pdf$/i, ""),
            description: files.length === 1 ? description : undefined,
            category: category || undefined,
          },
          token,
        );
        successCount++;
      }

      toast.success(`${successCount} dokumen berhasil diupload`);
      onSuccess();
    } catch (err: any) {
      toast.error(err.message || "Gagal mengupload dokumen");
    } finally {
      setUploading(false);
      setUploadProgress(null);
    }
  };

  return (
    <div className="surface-elevated p-5 space-y-4 border border-gold/20 animate-fade-in">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Upload Dokumen SOP</h3>
        <button onClick={onClose} className="p-1 rounded hover:bg-accent">
          <X className="h-4 w-4 text-muted-foreground" />
        </button>
      </div>

      {/* File picker */}
      <div
        onClick={() => fileInputRef.current?.click()}
        className="border-2 border-dashed border-border rounded-lg p-8 text-center cursor-pointer hover:border-gold/50 transition-colors"
      >
        <Upload className="h-8 w-8 mx-auto text-muted-foreground/50 mb-2" />
        <p className="text-sm text-muted-foreground">
          {files.length > 0
            ? `${files.length} file dipilih`
            : "Klik atau drag file PDF di sini"}
        </p>
        <p className="text-2xs text-muted-foreground/60 mt-1">
          Maks 50MB per file • Upload banyak file dilakukan satu per satu
        </p>
        <input
          ref={fileInputRef}
          type="file"
          accept="application/pdf"
          multiple
          onChange={handleFiles}
          className="hidden"
        />
      </div>

      {/* Selected files list */}
      {files.length > 0 && (
        <div className="space-y-1 max-h-32 overflow-y-auto">
          {files.map((f, i) => (
            <div key={i} className="flex items-center gap-2 text-sm py-1">
              <FileText className="h-3.5 w-3.5 text-red-500 shrink-0" />
              <span className="truncate flex-1">{f.name}</span>
              <span className="text-2xs text-muted-foreground shrink-0">
                {formatFileSize(f.size)}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Metadata (only for single upload) */}
      {files.length === 1 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className="text-luxury-label">Judul</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Nama dokumen SOP"
              className="w-full h-9 px-3 rounded-md border border-input bg-background text-sm placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-ring/20"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-luxury-label">Kategori</label>
            <input
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="HR, IT, Operations..."
              className="w-full h-9 px-3 rounded-md border border-input bg-background text-sm placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-ring/20"
            />
          </div>
          <div className="md:col-span-2 space-y-1.5">
            <label className="text-luxury-label">Deskripsi (opsional)</label>
            <input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Deskripsi singkat dokumen..."
              className="w-full h-9 px-3 rounded-md border border-input bg-background text-sm placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-ring/20"
            />
          </div>
        </div>
      )}

      {/* Bulk category */}
      {files.length > 1 && (
        <div className="space-y-1.5">
          <label className="text-luxury-label">Kategori (untuk semua file)</label>
          <input
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            placeholder="HR, IT, Operations..."
            className="w-full h-9 px-3 rounded-md border border-input bg-background text-sm placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-ring/20"
          />
        </div>
      )}

      {/* Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        {uploadProgress && (
          <p className="text-2xs text-muted-foreground">{uploadProgress}</p>
        )}
        <div className="flex justify-end gap-2 sm:ml-auto">
        <button onClick={onClose} className="px-4 py-2 rounded-md text-sm border border-input hover:bg-accent">
          Batal
        </button>
        <button
          onClick={handleUpload}
          disabled={uploading || files.length === 0}
          className={cn(
            "px-4 py-2 rounded-md text-sm font-medium transition-colors",
            uploading || files.length === 0
              ? "bg-muted text-muted-foreground cursor-not-allowed"
              : "bg-primary text-primary-foreground hover:bg-primary/90"
          )}
        >
          {uploading ? "Mengupload..." : `Upload ${files.length > 0 ? `(${files.length})` : ""}`}
        </button>
        </div>
      </div>
    </div>
  );
}

// === PDF Viewer Modal ===
function PdfViewer({ doc, onClose }: { doc: any; onClose: () => void }) {
  const handleDownload = async () => {
    try {
      await downloadSopFile(doc.id, doc.file_name);
    } catch {
      toast.error("Gagal mengunduh file PDF");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-card rounded-lg shadow-luxury-lg w-full max-w-4xl h-[85vh] flex flex-col overflow-hidden mx-4">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-border">
          <div className="min-w-0">
            <h3 className="text-sm font-semibold truncate">{doc.title}</h3>
            <p className="text-2xs text-muted-foreground">{doc.file_name}</p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleDownload}
              className="p-2 rounded-md hover:bg-accent"
              title="Unduh PDF"
            >
              <Download className="h-4 w-4 text-muted-foreground" />
            </button>
            <button onClick={onClose} className="p-2 rounded-md hover:bg-accent">
              <X className="h-4 w-4 text-muted-foreground" />
            </button>
          </div>
        </div>
        {/* PDF Embed */}
        <div className="flex-1 bg-muted">
          <SopPdfEmbed docId={doc.id} title={doc.title} />
        </div>
      </div>
    </div>
  );
}
