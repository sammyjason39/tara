import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { FileText, Search, X, Download, FolderOpen } from "lucide-react";
import { cn } from "@/lib/utils";
import { SopPdfEmbed, downloadSopFile } from "@/components/SopPdfEmbed";
import { toast } from "sonner";

export function MobileSopPage() {
  const [search, setSearch] = useState("");
  const [viewingDoc, setViewingDoc] = useState<any>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["sop-documents"],
    queryFn: () => api.get("/sop"),
    placeholderData: { data: [] },
  });

  const allDocs = data?.data || [];

  const filteredDocs = allDocs.filter((doc: any) => {
    if (search.trim() === "") return true;
    return [doc.title, doc.description, doc.category]
      .some((f) => f?.toLowerCase().includes(search.toLowerCase()));
  });

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  if (viewingDoc) {
    return (
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-card">
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium truncate">{viewingDoc.title}</p>
            <p className="text-2xs text-muted-foreground">{viewingDoc.file_name}</p>
          </div>
          <div className="flex items-center gap-1 shrink-0 ml-2">
            <button
              type="button"
              onClick={async () => {
                try {
                  await downloadSopFile(viewingDoc.id, viewingDoc.file_name);
                } catch {
                  toast.error("Gagal mengunduh file PDF");
                }
              }}
              className="p-2 rounded-md hover:bg-accent"
            >
              <Download className="h-4 w-4 text-muted-foreground" />
            </button>
            <button onClick={() => setViewingDoc(null)} className="p-2 rounded-md hover:bg-accent">
              <X className="h-4 w-4 text-muted-foreground" />
            </button>
          </div>
        </div>
        {/* PDF */}
        <div className="flex-1 bg-muted">
          <SopPdfEmbed docId={viewingDoc.id} title={viewingDoc.title} />
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      {/* Header */}
      <div>
        <h1 className="text-lg font-semibold">Dokumen SOP</h1>
        <p className="text-2xs text-muted-foreground">Panduan operasional perusahaan</p>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Cari SOP..."
          className="w-full h-10 pl-9 pr-4 rounded-md border border-input bg-background text-sm placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-ring/20"
        />
      </div>

      {/* List */}
      <div className="space-y-2">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="p-3 rounded-md border border-border flex items-center gap-3">
              <div className="h-9 w-9 rounded bg-muted animate-pulse" />
              <div className="flex-1 space-y-1.5">
                <div className="h-3.5 w-32 bg-muted rounded animate-pulse" />
                <div className="h-3 w-20 bg-muted/60 rounded animate-pulse" />
              </div>
            </div>
          ))
        ) : filteredDocs.length === 0 ? (
          <div className="py-12 text-center">
            <FolderOpen className="h-10 w-10 mx-auto text-muted-foreground/30 mb-2" />
            <p className="text-sm text-muted-foreground">Tidak ada dokumen SOP</p>
          </div>
        ) : (
          filteredDocs.map((doc: any) => (
            <button
              key={doc.id}
              onClick={() => setViewingDoc(doc)}
              className="w-full text-left p-3 rounded-md border border-border hover:border-gold/50 hover:bg-accent/30 transition-colors flex items-center gap-3"
            >
              <div className="h-9 w-9 rounded bg-red-500/10 flex items-center justify-center shrink-0">
                <FileText className="h-4.5 w-4.5 text-red-500" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{doc.title}</p>
                <div className="flex items-center gap-1.5 text-2xs text-muted-foreground mt-0.5">
                  {doc.category && (
                    <span className="px-1 py-0.5 rounded bg-accent text-foreground/70 font-medium">{doc.category}</span>
                  )}
                  <span>{formatSize(doc.file_size)}</span>
                </div>
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  );
}
