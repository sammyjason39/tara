import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/core/ui/PageHeader";
import { PageShell } from "@/core/ui/PageShell";
import { WorkspacePanel } from "@/core/ui/WorkspacePanel";
import { useSession } from "@/core/security/session";
import { exportPdf } from "@/core/tools/exportPipeline";
import { Download } from "lucide-react";
import { API_BASE_URL } from "@/lib/api-config";
import {
  listFileSystem,
  getFile,
  updateFileContent,
  uploadFile,
  deleteFile,
  generateForensicCode,
  moveToRecycle,
  restoreFromRecycle,
} from "@/core/tools/explorer/service";
import { useSearchParams } from "react-router-dom";
import { useEffect } from "react";
import { useCollaboration } from "@/hooks/useCollaboration";

const createFilename = (title: string, ext: string) =>
  `${title.trim().replace(/\s+/g, "-").toLowerCase() || "document"}.${ext}`;

export default function DocumentTool() {
  const session = useSession();
  const [searchParams] = useSearchParams();
  const fileId = searchParams.get("fileId");
  
  const [title, setTitle] = useState("Untitled Document");
  const [content, setContent] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [version, setVersion] = useState(0);
  const [selectedId, setSelectedId] = useState<string | null>(fileId);
  const [search, setSearch] = useState("");

  const [files, setFiles] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const loadFile = async () => {
      if (fileId) {
        setLoading(true);
        try {
          const file = await getFile(session, fileId);
          setTitle(file.name);
          setContent(file.content || "");
          setSelectedId(file.id);
        } catch (err) {
          console.error("Failed to load file", err);
        } finally {
          setLoading(false);
        }
      }
    };
    loadFile();
  }, [fileId, session]);

  useEffect(() => {
    const fetchDocs = async () => {
      const { files } = await listFileSystem(session);
      setFiles((Array.isArray(files) ? files : []).filter(f => f.type === "doc" || f.type === "zdoc" || f.type === "txt"));
    };
    fetchDocs();
  }, [session, version]);

  const { presence, lastChange, broadcastChange } = useCollaboration(
    selectedId,
    session.user_id,
    `${session.first_name} ${session.last_name}`
  );

  useEffect(() => {
    if (lastChange && typeof lastChange === "string") {
      setContent(lastChange);
    }
  }, [lastChange]);

  const handleContentChange = (val: string) => {
    setContent(val);
    broadcastChange(val);
  };

  const wordCount = useMemo(
    () => (content.trim() ? content.trim().split(/\s+/).length : 0),
    [content],
  );

  const filteredFiles = useMemo(
    () => {
      if (!search) return files;
      return (Array.isArray(files) ? files : []).filter((file) =>
        file.name.toLowerCase().includes(search.toLowerCase())
      );
    },
    [files, search]
  );

  const download = (ext: string) => {
    const blob =
      ext === "pdf"
        ? exportPdf({
            tenantId: session.tenant_id,
            actor: { userId: session.user_id, role: session.role, departmentId: session.department_id },
            filename: createFilename(title, ext),
            content,
            source: "docs",
          })
        : new Blob([content], { type: "text/plain;charset=utf-8" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = createFilename(title, ext);
    link.click();
    URL.revokeObjectURL(link.href);
  };

  return (
    <PageShell
      header={
        <PageHeader
          title="Docs"
          subtitle="Compose, edit, and export documents."
          primaryAction={
            <Button
              onClick={async () => {
                if (selectedId) {
                  await updateFileContent(session, selectedId, content, title);
                } else {
                  const file = new File([content], createFilename(title, "zdoc"), { type: "text/plain" });
                  const record = await uploadFile(session, file);
                  setSelectedId(record.id);
                }
                setStatus("Changes saved to library");
                setVersion((prev) => prev + 1);
              }}
            >
              Save to Explorer
            </Button>
          }
          secondaryActions={
            <div className="flex items-center gap-3">
              <div className="flex -space-x-2 overflow-hidden mr-2">
                {Object.values(presence).map((p, i) => (
                  <div 
                    key={i} 
                    title={p.userName}
                    className="inline-block h-8 w-8 rounded-full ring-2 ring-background bg-primary/10 flex items-center justify-center text-[10px] font-bold border"
                  >
                    {p.userName.split(" ").map(n => n[0]).join("")}
                  </div>
                ))}
              </div>
              <Button variant="outline" onClick={() => window.print()}>
                Print
              </Button>
              <Button variant="outline" onClick={() => download("txt")}>
                Export TXT
              </Button>
              <Button variant="outline" onClick={() => download("docx")}>
                Export DOCX
              </Button>
              <Button variant="outline" onClick={() => download("pdf")}>
                Export PDF
              </Button>
              <Button 
                variant="default" 
                className="bg-primary/90"
                disabled={!selectedId}
                onClick={async () => {
                  const code = await generateForensicCode(session);
                  const url = `${API_BASE_URL}/explorer/files/${selectedId}/download?traceId=${code}&watermarkText=CONFIDENTIAL`;
                  window.open(url, "_blank");
                }}
              >
                <Download className="mr-2 h-4 w-4" />
                Secure Export
              </Button>
            </div>
          }
        />
      }
    >
      <div className="space-y-6">
        <WorkspacePanel title="Explorer" description="Department-scoped documents.">
          <div className="grid gap-4 md:grid-cols-[1fr_2fr]">
            <div className="space-y-3">
              <Input
                placeholder="Search documents"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
              <div className="space-y-2">
                {loading ? (
                  <div className="p-4 text-center text-sm text-muted-foreground italic">Loading documents...</div>
                ) : filteredFiles.map((file) => (
                  <div key={file.id} className="flex items-center justify-between rounded-lg border p-2">
                    <button
                      className="text-left text-sm font-medium text-foreground"
                      onClick={async () => {
                        setLoading(true);
                        try {
                          const fullFile = await getFile(session, file.id);
                          setSelectedId(fullFile.id);
                          setTitle(fullFile.name);
                          setContent(fullFile.content || "");
                        } finally {
                          setLoading(false);
                        }
                      }}
                    >
                      {file.name}
                    </button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={async () => {
                        await moveToRecycle(session, file.id);
                        setVersion((prev) => prev + 1);
                      }}
                    >
                      Delete
                    </Button>
                  </div>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <Input value={title} onChange={(event) => setTitle(event.target.value)} />
              <p className="text-xs text-muted-foreground">
                {status ? status : "Autosave disabled (DB-ready)."}
              </p>
              <div className="rounded-lg border p-4 text-sm text-muted-foreground">
                Words: <span className="font-semibold text-foreground">{wordCount}</span>
              </div>
            </div>
          </div>
        </WorkspacePanel>

        <WorkspacePanel
          title="Editor"
          description="Start drafting your document content."
        >
          <div className="space-y-3">
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" onClick={() => setContent((prev) => prev + "**bold** ")}>
                Bold
              </Button>
              <Button variant="outline" size="sm" onClick={() => setContent((prev) => prev + "_italic_ ")}>
                Italic
              </Button>
              <Button variant="outline" size="sm" onClick={() => setContent((prev) => prev + "\n- List item")}>
                Bullet
              </Button>
              <Button variant="outline" size="sm" onClick={() => setContent((prev) => prev + "\n### Heading")}>
                Heading
              </Button>
            </div>
            <textarea
              className="min-h-[320px] w-full rounded-lg border bg-background p-4 text-sm text-foreground outline-none"
              value={content}
              onChange={(event) => handleContentChange(event.target.value)}
              placeholder="Start typing here..."
            />
          </div>
        </WorkspacePanel>
        <WorkspacePanel title="Audit Tracking" description="Forensic history of this document.">
          <div className="space-y-2">
             {selectedId ? (
                <div className="text-sm text-muted-foreground">
                  View edit history and forensic logs in the File Explorer.
                </div>
             ) : (
               <p className="text-sm italic text-muted-foreground">Select a file to see its audit status.</p>
             )}
          </div>
        </WorkspacePanel>
      </div>
    </PageShell>
  );
}
