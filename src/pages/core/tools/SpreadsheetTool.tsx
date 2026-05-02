import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/core/ui/PageHeader";
import { PageShell } from "@/core/ui/PageShell";
import { WorkspacePanel } from "@/core/ui/WorkspacePanel";
import { useSession } from "@/core/security/session";
import {
  listFileSystem,
  getFile,
  updateFileContent,
  uploadFile,
  deleteFile,
  generateForensicCode,
  moveToRecycle,
} from "@/core/tools/explorer/service";
import { useSearchParams } from "react-router-dom";
import { useEffect } from "react";
import { Download } from "lucide-react";
import { API_BASE_URL } from "@/lib/api-config";
import { useCollaboration } from "@/hooks/useCollaboration";

const COLS = 8;
const ROWS = 20;

const buildGrid = () =>
  Array.from({ length: ROWS }, () => Array.from({ length: COLS }, () => ""));

const toColumnLabel = (index: number) => String.fromCharCode(65 + index);

export default function SpreadsheetTool() {
  const session = useSession();
  const [searchParams] = useSearchParams();
  const fileId = searchParams.get("fileId");

  const [grid, setGrid] = useState<string[][]>(buildGrid);
  const [selected, setSelected] = useState<{ row: number; col: number } | null>(null);
  const [formula, setFormula] = useState("");
  const [version, setVersion] = useState(0);
  const [selectedId, setSelectedId] = useState<string | null>(fileId);
  const [search, setSearch] = useState("");
  const [title, setTitle] = useState("Untitled Sheet");

  const [files, setFiles] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const loadFile = async () => {
      if (fileId) {
        setLoading(true);
        try {
          const file = await getFile(session, fileId);
          setTitle(file.name);
          if (file.content) {
            try {
              setGrid(JSON.parse(file.content));
            } catch {
              // Handle CSV or text content
              setGrid(buildGrid());
            }
          }
          setSelectedId(file.id);
        } catch (err) {
          console.error("Failed to load sheet", err);
        } finally {
          setLoading(false);
        }
      }
    };
    loadFile();
  }, [fileId, session]);

  useEffect(() => {
    const fetchSheets = async () => {
      const { files } = await listFileSystem(session);
      setFiles((Array.isArray(files) ? files : []).filter(f => f.type === "sheet" || f.type === "zsheet" || f.type === "csv"));
    };
    fetchSheets();
  }, [session, version]);

  const { presence, lastChange, broadcastChange } = useCollaboration(
    selectedId,
    session.user_id,
    `${session.first_name} ${session.last_name}`
  );

  useEffect(() => {
    if (lastChange && Array.isArray(lastChange)) {
      setGrid(lastChange);
    }
  }, [lastChange]);

  const total = useMemo(() => {
    if (selected === null) return 0;
    const colValues = grid.map((row) => Number(row[selected.col]) || 0);
    return colValues.reduce((sum, value) => sum + value, 0);
  }, [grid, selected]);

  const updateCell = (row: number, col: number, value: string) => {
    setGrid((prev) => {
      const next = prev.map((r) => [...r]);
      next[row][col] = value;
      broadcastChange(next);
      return next;
    });
  };

  const exportCsv = () => {
    const csv = grid.map((row) => row.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "spreadsheet.csv";
    link.click();
    URL.revokeObjectURL(link.href);
  };

  return (
    <PageShell
      header={
        <PageHeader
          title="Sheets"
          subtitle="Grid-based calculations and exports."
          primaryAction={
            <Button
              onClick={async () => {
                const content = JSON.stringify(grid);
                if (selectedId) {
                  await updateFileContent(session, selectedId, content, title);
                } else {
                  const file = new File([content], `${title}.zsheet`, { type: "application/json" });
                  const record = await uploadFile(session, file);
                  setSelectedId(record.id);
                }
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
              <Button variant="outline" onClick={exportCsv}>
                Export CSV
              </Button>
              <Button 
                variant="default"
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
        <WorkspacePanel title="Explorer" description="Department-scoped spreadsheets.">
          <div className="grid gap-4 md:grid-cols-[1fr_2fr]">
            <div className="space-y-3">
              <Input
                placeholder="Search sheets"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
              <div className="space-y-2">
                {loading ? (
                   <div className="p-4 text-center text-sm text-muted-foreground italic">Loading sheets...</div>
                ) : files.map((file) => (
                  <div key={file.id} className="flex items-center justify-between rounded-lg border p-2">
                    <button
                      className="text-left text-sm font-medium text-foreground"
                      onClick={async () => {
                        setLoading(true);
                        try {
                          const fullFile = await getFile(session, file.id);
                          setSelectedId(fullFile.id);
                          setTitle(fullFile.name);
                          if (fullFile.content) {
                            try {
                              setGrid(JSON.parse(fullFile.content));
                            } catch {
                              setGrid(buildGrid());
                            }
                          }
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
              <div className="rounded-lg border p-4 text-sm text-muted-foreground">
                Selected cell: {selected ? `${toColumnLabel(selected.col)}${selected.row + 1}` : "--"}
              </div>
            </div>
          </div>
        </WorkspacePanel>

        <WorkspacePanel title="Formula bar" description="Use the active cell for quick edits.">
          <div className="flex flex-wrap items-center gap-3">
            <div className="text-sm text-muted-foreground">
              Cell:{" "}
              <span className="font-semibold text-foreground">
                {selected ? `${toColumnLabel(selected.col)}${selected.row + 1}` : "--"}
              </span>
            </div>
            <Input
              value={formula}
              onChange={(event) => setFormula(event.target.value)}
              onBlur={() => {
                if (!selected) return;
                updateCell(selected.row, selected.col, formula);
              }}
              placeholder="Enter value or formula"
            />
            <Button variant="outline" onClick={() => setFormula(String(total))}>
              Sum Column
            </Button>
          </div>
        </WorkspacePanel>

        <WorkspacePanel title="Spreadsheet" description="Click a cell to edit.">
          <div className="overflow-auto rounded-lg border">
            <table className="min-w-full border-collapse text-sm">
              <thead className="bg-muted/40">
                <tr>
                  <th className="w-10 border p-2 text-xs text-muted-foreground">#</th>
                  {Array.from({ length: COLS }).map((_, col) => (
                    <th key={`col-${col}`} className="border p-2 text-xs text-muted-foreground">
                      {toColumnLabel(col)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {grid.map((row, rowIndex) => (
                  <tr key={`row-${rowIndex}`}>
                    <td className="border p-2 text-xs text-muted-foreground">{rowIndex + 1}</td>
                    {row.map((cell, colIndex) => {
                      const isActive =
                        selected?.row === rowIndex && selected?.col === colIndex;
                      return (
                        <td key={`cell-${rowIndex}-${colIndex}`} className="border p-1">
                          <input
                            className={`w-full bg-transparent p-1 text-sm outline-none ${
                              isActive ? "ring-1 ring-primary" : ""
                            }`}
                            value={cell}
                            onFocus={() => {
                              setSelected({ row: rowIndex, col: colIndex });
                              setFormula(cell);
                            }}
                            onChange={(event) =>
                              updateCell(rowIndex, colIndex, event.target.value)
                            }
                          />
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </WorkspacePanel>

        <WorkspacePanel title="Recycle bin" description="Only owners/admins can restore.">
          {listRecycleBin(session.tenant_id, session, "sheet").length === 0 ? (
            <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
              Recycle bin is empty.
            </div>
          ) : (
            <div className="space-y-2">
              {listRecycleBin(session.tenant_id, session, "sheet").map((file) => (
                <div key={file.id} className="flex items-center justify-between rounded-lg border p-2">
                  <div className="text-sm">{file.name}</div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      restoreFromRecycle(session.tenant_id, session, file.id);
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
