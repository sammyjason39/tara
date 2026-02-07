import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/core/ui/PageHeader";
import { PageShell } from "@/core/ui/PageShell";
import { WorkspacePanel } from "@/core/ui/WorkspacePanel";
import { useSession } from "@/core/security/session";
import {
  createFile,
  listFiles,
  listRecycleBin,
  moveToRecycle,
  restoreFromRecycle,
  updateFile,
} from "@/core/tools/explorer/service";

const COLS = 8;
const ROWS = 20;

const buildGrid = () =>
  Array.from({ length: ROWS }, () => Array.from({ length: COLS }, () => ""));

const toColumnLabel = (index: number) => String.fromCharCode(65 + index);

export default function SpreadsheetTool() {
  const session = useSession();
  const [grid, setGrid] = useState<string[][]>(buildGrid);
  const [selected, setSelected] = useState<{ row: number; col: number } | null>(null);
  const [formula, setFormula] = useState("");
  const [version, setVersion] = useState(0);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [title, setTitle] = useState("Untitled Sheet");

  const total = useMemo(() => {
    if (selected === null) return 0;
    const colValues = grid.map((row) => Number(row[selected.col]) || 0);
    return colValues.reduce((sum, value) => sum + value, 0);
  }, [grid, selected]);

  const updateCell = (row: number, col: number, value: string) => {
    setGrid((prev) => {
      const next = prev.map((r) => [...r]);
      next[row][col] = value;
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
              onClick={() => {
                const content = JSON.stringify(grid);
                if (selectedId) {
                  updateFile(session.tenantId, session, selectedId, { name: title, content });
                } else {
                  const record = createFile(session.tenantId, session, {
                    name: title,
                    type: "sheet",
                    content,
                  });
                  setSelectedId(record.id);
                }
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
              <Button variant="outline" onClick={exportCsv}>
                Export CSV
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
                {(search ? listFiles(session.tenantId, session, "sheet").filter((file) => file.name.toLowerCase().includes(search.toLowerCase())) : listFiles(session.tenantId, session, "sheet")).map((file) => (
                  <div key={file.id} className="flex items-center justify-between rounded-lg border p-2">
                    <button
                      className="text-left text-sm font-medium text-foreground"
                      onClick={() => {
                        setSelectedId(file.id);
                        setTitle(file.name);
                        try {
                          const parsed = JSON.parse(file.content) as string[][];
                          setGrid(parsed);
                        } catch {
                          setGrid(buildGrid());
                        }
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
          {listRecycleBin(session.tenantId, session, "sheet").length === 0 ? (
            <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
              Recycle bin is empty.
            </div>
          ) : (
            <div className="space-y-2">
              {listRecycleBin(session.tenantId, session, "sheet").map((file) => (
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
