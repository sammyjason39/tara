import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/core/ui/PageHeader";
import { PageShell } from "@/core/ui/PageShell";
import { WorkspacePanel } from "@/core/ui/WorkspacePanel";
import { useSession } from "@/core/security/session";
import { exportPdf } from "@/core/tools/exportPipeline";
import {
  createFile,
  listFiles,
  listRecycleBin,
  moveToRecycle,
  restoreFromRecycle,
  updateFile,
} from "@/core/tools/explorer/service";

const createFilename = (title: string, ext: string) =>
  `${title.trim().replace(/\s+/g, "-").toLowerCase() || "document"}.${ext}`;

export default function DocumentTool() {
  const session = useSession();
  const [title, setTitle] = useState("Untitled Document");
  const [content, setContent] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [version, setVersion] = useState(0);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const wordCount = useMemo(
    () => (content.trim() ? content.trim().split(/\s+/).length : 0),
    [content],
  );

  const files = useMemo(
    () => (search ? [] : listFiles(session.tenantId, session, "doc")),
    [session, version, search],
  );
  const searchResults = useMemo(
    () =>
      search
        ? listFiles(session.tenantId, session, "doc").filter((file) =>
            file.name.toLowerCase().includes(search.toLowerCase()),
          )
        : [],
    [session, search, version],
  );
  const recycleBin = useMemo(
    () => listRecycleBin(session.tenantId, session, "doc"),
    [session, version],
  );

  const download = (ext: string) => {
    const blob =
      ext === "pdf"
        ? exportPdf({
            tenantId: session.tenantId,
            actor: { userId: session.userId, role: session.role, departmentId: session.departmentId },
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
              onClick={() => {
                if (selectedId) {
                  updateFile(session.tenantId, session, selectedId, { name: title, content });
                } else {
                  const record = createFile(session.tenantId, session, {
                    name: title,
                    type: "doc",
                    content,
                  });
                  setSelectedId(record.id);
                }
                setStatus("Saved locally");
                setVersion((prev) => prev + 1);
              }}
            >
              Save
            </Button>
          }
          secondaryActions={
            <div className="flex items-center gap-2">
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
                {(search ? searchResults : files).map((file) => (
                  <div key={file.id} className="flex items-center justify-between rounded-lg border p-2">
                    <button
                      className="text-left text-sm font-medium text-foreground"
                      onClick={() => {
                        setSelectedId(file.id);
                        setTitle(file.name);
                        setContent(file.content);
                      }}
                    >
                      {file.name}
                    </button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        moveToRecycle(session.tenantId, session, file.id);
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
              onChange={(event) => setContent(event.target.value)}
              placeholder="Start typing here..."
            />
          </div>
        </WorkspacePanel>
        <WorkspacePanel title="Recycle bin" description="Only owners/admins can restore.">
          {recycleBin.length === 0 ? (
            <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
              Recycle bin is empty.
            </div>
          ) : (
            <div className="space-y-2">
              {recycleBin.map((file) => (
                <div key={file.id} className="flex items-center justify-between rounded-lg border p-2">
                  <div className="text-sm">{file.name}</div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      restoreFromRecycle(session.tenantId, session, file.id);
                      setVersion((prev) => prev + 1);
                    }}
                  >
                    Restore
                  </Button>
                </div>
              ))}
            </div>
          )}
        </WorkspacePanel>
      </div>
    </PageShell>
  );
}
