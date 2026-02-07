import { useMemo, useRef, useState } from "react";
import type { MouseEvent } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PageHeader } from "@/core/ui/PageHeader";
import { PageShell } from "@/core/ui/PageShell";
import { WorkspacePanel } from "@/core/ui/WorkspacePanel";
import { useSession } from "@/core/security/session";
import {
  createFolder,
  listFiles,
  listFolders,
  listRecycleBin,
  moveFolder,
  moveFile,
  moveToRecycle,
  renameFile,
  renameFolder,
  restoreFromRecycle,
  searchFiles,
} from "@/core/tools/explorer/service";
import { Folder, FileText, FileSpreadsheet, Presentation, File, ChevronRight, ChevronDown, Trash2 } from "lucide-react";

const typeLabel = {
  doc: "Doc",
  sheet: "Sheet",
  slide: "Slide",
  pdf: "PDF",
} as const;

export default function Explorer() {
  const session = useSession();
  const [search, setSearch] = useState("");
  const [version, setVersion] = useState(0);
  const [activeFolder, setActiveFolder] = useState("root");
  const [history, setHistory] = useState<string[]>(["root"]);
  const [historyIndex, setHistoryIndex] = useState(0);
  const [selectedFileId, setSelectedFileId] = useState<string | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [renameFolderId, setRenameFolderId] = useState<string | null>(null);
  const [renameFolderValue, setRenameFolderValue] = useState("");
  const [expanded, setExpanded] = useState<Record<string, boolean>>({ root: true });
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkMoveTarget, setBulkMoveTarget] = useState<string>("root");
  const [lastSelectedIndex, setLastSelectedIndex] = useState<number | null>(null);
  const [viewMode, setViewMode] = useState<"details" | "grid" | "large">("grid");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingValue, setEditingValue] = useState<string>("");
  const [lastClick, setLastClick] = useState<{ id: string; time: number } | null>(null);
  const [sortKey, setSortKey] = useState<"name" | "type" | "folder">("name");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [marquee, setMarquee] = useState<{
    startX: number;
    startY: number;
    x: number;
    y: number;
    active: boolean;
  } | null>(null);
  const fileAreaRef = useRef<HTMLDivElement | null>(null);
  const detailsAreaRef = useRef<HTMLDivElement | null>(null);

  const files = useMemo(() => {
    if (activeFolder === "recycle") {
      const scoped = listRecycleBin(session.tenantId, session);
      if (!search) return scoped;
      const lower = search.toLowerCase();
      return scoped.filter((file) => file.name.toLowerCase().includes(lower));
    }
    const scoped = search
      ? searchFiles(session.tenantId, session, search)
      : listFiles(session.tenantId, session);
    return scoped.filter((file) => file.folderId === activeFolder);
  }, [session, search, version, activeFolder]);

  const folders = useMemo(
    () => listFolders(session.tenantId, session),
    [session, version],
  );

  const selectedFile = useMemo(
    () => files.find((file) => file.id === selectedFileId) ?? null,
    [files, selectedFileId],
  );

  const subfolders = useMemo(
    () => folders.filter((folder) => (folder.parentId ?? "root") === activeFolder),
    [folders, activeFolder],
  );

  const folderMap = useMemo(() => {
    const map = new Map<string, string>();
    map.set("root", "Root");
    folders.forEach((folder) => map.set(folder.id, folder.name));
    return map;
  }, [folders]);

  const folderById = useMemo(() => {
    const map = new Map<string, (typeof folders)[number]>();
    folders.forEach((folder) => map.set(folder.id, folder));
    return map;
  }, [folders]);

  const orderedFiles = useMemo(() => {
    const sorted = [...files].sort((a, b) => {
      const nameA = a.name.toLowerCase();
      const nameB = b.name.toLowerCase();
      if (sortKey === "name") return nameA.localeCompare(nameB);
      if (sortKey === "type") return a.type.localeCompare(b.type);
      const folderA = (folderMap.get(a.folderId ?? "root") ?? "Root").toLowerCase();
      const folderB = (folderMap.get(b.folderId ?? "root") ?? "Root").toLowerCase();
      return folderA.localeCompare(folderB);
    });
    return sortDir === "asc" ? sorted : sorted.reverse();
  }, [files, folderMap, sortKey, sortDir]);

  const orderedFolders = useMemo(
    () => [...subfolders].sort((a, b) => a.name.localeCompare(b.name)),
    [subfolders],
  );

  const canGoBack = historyIndex > 0;
  const canGoForward = historyIndex < history.length - 1;
  const isRecycleView = activeFolder === "recycle";
  const showRecycleEntry = activeFolder === "root";

  const currentBreadcrumb = useMemo(() => {
    if (activeFolder === "recycle") {
      return [
        { id: "root", label: "Root" },
        { id: "recycle", label: "Recycle Bin" },
      ];
    }
    if (activeFolder === "root") return [{ id: "root", label: "Root" }];
    const path: { id: string; label: string }[] = [];
    let currentId: string | undefined = activeFolder;
    while (currentId && currentId !== "root") {
      const current = folderById.get(currentId);
      if (!current) break;
      path.unshift({ id: current.id, label: current.name });
      currentId = current.parentId ?? "root";
    }
    return [{ id: "root", label: "Root" }, ...path];
  }, [activeFolder, folderById]);

  const folderTree = useMemo(() => {
    const grouped: Record<string, typeof folders> = {};
    folders.forEach((folder) => {
      const parent = folder.parentId ?? "root";
      if (!grouped[parent]) grouped[parent] = [];
      grouped[parent].push(folder);
    });
    return grouped;
  }, [folders]);

  const iconForFile = (type: string, size: "sm" | "lg") => {
    const className = size === "lg" ? "h-6 w-6" : "h-4 w-4";
    if (type === "doc") return <FileText className={className} />;
    if (type === "sheet") return <FileSpreadsheet className={className} />;
    if (type === "slide") return <Presentation className={className} />;
    return <File className={className} />;
  };

  const handleDrop = (data: string, folderId: string) => {
    try {
      const ids = JSON.parse(data) as string[];
      ids.forEach((id) => moveFile(session.tenantId, session, id, folderId));
    } catch {
      if (data) moveFile(session.tenantId, session, data, folderId);
    }
    setVersion((prev) => prev + 1);
  };

  const toggleSelect = (fileId: string) => {
    setSelectedIds((prev) =>
      prev.includes(fileId) ? prev.filter((id) => id !== fileId) : [...prev, fileId],
    );
  };

  const handleSelection = (fileId: string, index: number, event: MouseEvent) => {
    const isCtrl = event.ctrlKey || event.metaKey;
    const isShift = event.shiftKey;

    if (isShift && lastSelectedIndex !== null) {
      const start = Math.min(lastSelectedIndex, index);
      const end = Math.max(lastSelectedIndex, index);
      const rangeIds = orderedFiles.slice(start, end + 1).map((file) => file.id);
      setSelectedIds(rangeIds);
      setSelectedFileId(fileId);
      return;
    }

    if (isCtrl) {
      toggleSelect(fileId);
      setSelectedFileId(fileId);
      setLastSelectedIndex(index);
      return;
    }

    setSelectedIds([fileId]);
    setSelectedFileId(fileId);
    setLastSelectedIndex(index);
  };

  const navigateToFolder = (folderId: string, push = true) => {
    setActiveFolder(folderId);
    setSelectedFileId(null);
    setSelectedIds([]);
    if (!push) return;
    setHistory((prev) => {
      const next = prev.slice(0, historyIndex + 1);
      if (next[next.length - 1] !== folderId) next.push(folderId);
      setHistoryIndex(next.length - 1);
      return next;
    });
  };

  const goBack = () => {
    if (!canGoBack) return;
    const nextIndex = historyIndex - 1;
    setHistoryIndex(nextIndex);
    navigateToFolder(history[nextIndex], false);
  };

  const goForward = () => {
    if (!canGoForward) return;
    const nextIndex = historyIndex + 1;
    setHistoryIndex(nextIndex);
    navigateToFolder(history[nextIndex], false);
  };

  const handleSort = (key: "name" | "type" | "folder") => {
    if (sortKey === key) {
      setSortDir((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  const toggleExpand = (folderId: string) => {
    setExpanded((prev) => ({ ...prev, [folderId]: !prev[folderId] }));
  };

  const renderFolderNode = (folderId: string, depth: number): JSX.Element | null => {
    const children = folderTree[folderId] ?? [];
    if (children.length === 0) return null;
    return (
      <div>
        {children.map((folder) => {
          const isExpanded = expanded[folder.id];
          return (
            <div key={folder.id}>
              <div
                className={`flex items-center gap-2 rounded-md px-2 py-1 text-sm ${
                  activeFolder === folder.id ? "bg-muted" : "hover:bg-muted/50"
                }`}
                style={{ paddingLeft: `${depth * 12}px` }}
                draggable
                onClick={() => navigateToFolder(folder.id)}
                onDragStart={(event) => {
                  event.dataTransfer.setData("application/x-folder", folder.id);
                }}
                onDragOver={(event) => event.preventDefault()}
                onDrop={(event) => {
                  const folderPayload = event.dataTransfer.getData("application/x-folder");
                  if (folderPayload && folderPayload !== folder.id) {
                    moveFolder(session.tenantId, session, folderPayload, folder.id);
                    setVersion((prev) => prev + 1);
                    return;
                  }
                  const payload = event.dataTransfer.getData("text/plain");
                  if (payload) handleDrop(payload, folder.id);
                }}
              >
                <button
                  className="flex items-center"
                  onClick={(event) => {
                    event.stopPropagation();
                    toggleExpand(folder.id);
                  }}
                >
                  {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                </button>
                <Folder className="h-4 w-4" />
                <span className="flex-1">{folder.name}</span>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={(event) => {
                    event.stopPropagation();
                    setRenameFolderId(folder.id);
                    setRenameFolderValue(folder.name);
                  }}
                >
                  Rename
                </Button>
              </div>
              {isExpanded ? renderFolderNode(folder.id, depth + 1) : null}
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <PageShell
      header={
        <PageHeader
          title="Explorer"
          subtitle="Department-scoped file explorer with audit and recycle bin."
        />
      }
    >
      <div className="grid gap-6 lg:grid-cols-[240px_1fr]">
        <WorkspacePanel title="Folders" description="Department hierarchy.">
          <div className="space-y-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const name = `New Folder ${folders.length + 1}`;
                const parent =
                  activeFolder === "root" || activeFolder === "recycle" ? undefined : activeFolder;
                createFolder(session.tenantId, session, name, parent);
                setVersion((prev) => prev + 1);
              }}
            >
              New folder
            </Button>
            <div className="space-y-2">
              <div
                className={`flex cursor-pointer items-center gap-2 rounded-md px-2 py-1 text-sm ${
                  activeFolder === "root" ? "bg-muted" : "hover:bg-muted/50"
                }`}
                onClick={() => navigateToFolder("root")}
                onDragOver={(event) => event.preventDefault()}
                onDrop={(event) => {
                  const folderPayload = event.dataTransfer.getData("application/x-folder");
                  if (folderPayload && folderPayload !== "root") {
                    moveFolder(session.tenantId, session, folderPayload, undefined);
                    setVersion((prev) => prev + 1);
                    return;
                  }
                  const payload = event.dataTransfer.getData("text/plain");
                  if (payload) handleDrop(payload, "root");
                }}
              >
                <button
                  className="flex items-center"
                  onClick={(event) => {
                    event.stopPropagation();
                    toggleExpand("root");
                  }}
                >
                  {expanded.root ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                </button>
                <Folder className="h-4 w-4" />
                Root
              </div>
              <div
                className={`flex cursor-pointer items-center gap-2 rounded-md px-2 py-1 text-sm ${
                  activeFolder === "recycle" ? "bg-muted" : "hover:bg-muted/50"
                }`}
                onClick={() => navigateToFolder("recycle")}
              >
                <Trash2 className="h-4 w-4" />
                Recycle Bin
              </div>
              {expanded.root ? renderFolderNode("root", 1) : null}
              {renameFolderId ? (
                <div className="space-y-2">
                  <Input
                    value={renameFolderValue}
                    onChange={(event) => setRenameFolderValue(event.target.value)}
                  />
                  <Button
                    size="sm"
                    onClick={() => {
                      renameFolder(session.tenantId, session, renameFolderId, renameFolderValue);
                      setRenameFolderId(null);
                      setRenameFolderValue("");
                      setVersion((prev) => prev + 1);
                    }}
                  >
                    Save folder name
                  </Button>
                </div>
              ) : null}
            </div>
          </div>
        </WorkspacePanel>

        <div className="space-y-6">
          <WorkspacePanel title="Search" description="Find files in your department scope.">
            <Input
              placeholder="Search files by name"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </WorkspacePanel>

          <WorkspacePanel title="Address" description="Navigate folders like Windows Explorer.">
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <Button size="sm" variant="outline" disabled={!canGoBack} onClick={goBack}>
                Back
              </Button>
              <Button size="sm" variant="outline" disabled={!canGoForward} onClick={goForward}>
                Forward
              </Button>
              <div className="flex flex-wrap items-center gap-2 rounded-md border bg-background px-3 py-2">
                {currentBreadcrumb.map((crumb, index) => (
                  <button
                    key={`${crumb.id}-${index}`}
                    className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
                    onClick={() => navigateToFolder(crumb.id)}
                  >
                    <span className="font-medium text-foreground">{crumb.label}</span>
                    {index < currentBreadcrumb.length - 1 ? <span>/</span> : null}
                  </button>
                ))}
              </div>
            </div>
          </WorkspacePanel>

          <WorkspacePanel title="Files" description="Visible files in your scope.">
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant={viewMode === "details" ? "default" : "outline"}
                  onClick={() => setViewMode("details")}
                >
                  Details
                </Button>
                <Button
                  size="sm"
                  variant={viewMode === "grid" ? "default" : "outline"}
                  onClick={() => setViewMode("grid")}
                >
                  Grid
                </Button>
                <Button
                  size="sm"
                  variant={viewMode === "large" ? "default" : "outline"}
                  onClick={() => setViewMode("large")}
                >
                  Large Icons
                </Button>
              </div>
              {activeFolder !== "recycle" ? (
                <>
                  <Select value={bulkMoveTarget} onValueChange={setBulkMoveTarget}>
                    <SelectTrigger className="w-[200px]">
                      <SelectValue placeholder="Move to folder" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="root">Root</SelectItem>
                      {folders.map((folder) => (
                        <SelectItem key={folder.id} value={folder.id}>
                          {folder.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={selectedIds.length === 0}
                    onClick={() => {
                      selectedIds.forEach((id) => moveFile(session.tenantId, session, id, bulkMoveTarget));
                      setSelectedIds([]);
                      setVersion((prev) => prev + 1);
                    }}
                  >
                    Move selected
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={selectedIds.length === 0}
                    onClick={() => {
                      selectedIds.forEach((id) => moveToRecycle(session.tenantId, session, id));
                      setSelectedIds([]);
                      setVersion((prev) => prev + 1);
                    }}
                  >
                    Delete selected
                  </Button>
                </>
              ) : (
                <Button
                  size="sm"
                  variant="outline"
                  disabled={selectedIds.length === 0}
                  onClick={() => {
                    selectedIds.forEach((id) => restoreFromRecycle(session.tenantId, session, id));
                    setSelectedIds([]);
                    setVersion((prev) => prev + 1);
                  }}
                >
                  Restore selected
                </Button>
              )}
            </div>
            {orderedFiles.length === 0 && orderedFolders.length === 0 ? (
              <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
                No files found.
              </div>
            ) : viewMode === "details" ? (
              <div
                ref={detailsAreaRef}
                className="relative rounded-lg border"
                onMouseDown={(event) => {
                  if (event.button !== 0) return;
                  const target = event.target as HTMLElement;
                  if (target.closest("[data-file-id]")) return;
                  const bounds = detailsAreaRef.current?.getBoundingClientRect();
                  if (!bounds) return;
                  setMarquee({
                    startX: event.clientX - bounds.left,
                    startY: event.clientY - bounds.top,
                    x: event.clientX - bounds.left,
                    y: event.clientY - bounds.top,
                    active: true,
                  });
                  setSelectedIds([]);
                  setSelectedFileId(null);
                }}
                onMouseMove={(event) => {
                  if (!marquee?.active) return;
                  const bounds = detailsAreaRef.current?.getBoundingClientRect();
                  if (!bounds) return;
                  setMarquee((prev) =>
                    prev
                      ? {
                          ...prev,
                          x: event.clientX - bounds.left,
                          y: event.clientY - bounds.top,
                        }
                      : prev,
                  );
                }}
                onMouseUp={() => {
                  if (!marquee?.active) return;
                  const bounds = detailsAreaRef.current?.getBoundingClientRect();
                  if (!bounds) return;
                  const left = Math.min(marquee.startX, marquee.x);
                  const right = Math.max(marquee.startX, marquee.x);
                  const top = Math.min(marquee.startY, marquee.y);
                  const bottom = Math.max(marquee.startY, marquee.y);
                  const nodes = detailsAreaRef.current?.querySelectorAll("[data-file-id]") ?? [];
                  const hits: string[] = [];
                  nodes.forEach((node) => {
                    const rect = node.getBoundingClientRect();
                    const nodeLeft = rect.left - bounds.left;
                    const nodeRight = rect.right - bounds.left;
                    const nodeTop = rect.top - bounds.top;
                    const nodeBottom = rect.bottom - bounds.top;
                    const intersects =
                      nodeLeft < right && nodeRight > left && nodeTop < bottom && nodeBottom > top;
                    if (intersects) {
                      const id = (node as HTMLElement).dataset.fileId;
                      if (id) hits.push(id);
                    }
                  });
                  setSelectedIds(hits);
                  setSelectedFileId(hits[0] ?? null);
                  setMarquee(null);
                }}
                onMouseLeave={() => {
                  if (marquee?.active) setMarquee(null);
                }}
              >
                {marquee?.active ? (
                  <div
                    className="pointer-events-none absolute z-10 border border-primary/70 bg-primary/10"
                    style={{
                      left: Math.min(marquee.startX, marquee.x),
                      top: Math.min(marquee.startY, marquee.y),
                      width: Math.abs(marquee.x - marquee.startX),
                      height: Math.abs(marquee.y - marquee.startY),
                    }}
                  />
                ) : null}
                <table className="w-full text-sm">
                  <thead className="bg-muted/40">
                    <tr>
                      <th className="p-2 text-left">
                        <button
                          className="flex items-center gap-2 font-semibold"
                          onClick={() => handleSort("name")}
                        >
                          Name
                          {sortKey === "name" ? (sortDir === "asc" ? "▲" : "▼") : null}
                        </button>
                      </th>
                      <th className="p-2 text-left">
                        <button
                          className="flex items-center gap-2 font-semibold"
                          onClick={() => handleSort("type")}
                        >
                          Type
                          {sortKey === "type" ? (sortDir === "asc" ? "▲" : "▼") : null}
                        </button>
                      </th>
                      <th className="p-2 text-left">
                        <button
                          className="flex items-center gap-2 font-semibold"
                          onClick={() => handleSort("folder")}
                        >
                          Folder
                          {sortKey === "folder" ? (sortDir === "asc" ? "▲" : "▼") : null}
                        </button>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {showRecycleEntry ? (
                      <tr
                        className="cursor-pointer border-t hover:bg-muted/20"
                        onClick={() => navigateToFolder("recycle")}
                      >
                        <td className="p-2">
                          <div className="flex items-center gap-2">
                            <Trash2 className="h-4 w-4" />
                            <span className="font-medium">Recycle Bin</span>
                          </div>
                        </td>
                        <td className="p-2 text-muted-foreground">System</td>
                        <td className="p-2">Root</td>
                      </tr>
                    ) : null}
                    {orderedFolders.map((folder) => (
                      <tr
                        key={folder.id}
                        className="cursor-pointer border-t hover:bg-muted/20"
                        onClick={() => navigateToFolder(folder.id)}
                        onDragOver={(event) => event.preventDefault()}
                        onDrop={(event) => {
                          const folderPayload = event.dataTransfer.getData("application/x-folder");
                          if (folderPayload && folderPayload !== folder.id) {
                            moveFolder(session.tenantId, session, folderPayload, folder.id);
                            setVersion((prev) => prev + 1);
                            return;
                          }
                          const payload = event.dataTransfer.getData("text/plain");
                          if (payload) handleDrop(payload, folder.id);
                        }}
                        draggable
                        onDragStart={(event) => {
                          event.dataTransfer.setData("application/x-folder", folder.id);
                        }}
                      >
                        <td className="p-2">
                          <div className="flex items-center gap-2">
                            <Folder className="h-4 w-4" />
                            <span className="font-medium">{folder.name}</span>
                          </div>
                        </td>
                        <td className="p-2 text-muted-foreground">Folder</td>
                        <td className="p-2">{folderMap.get(folder.parentId ?? "root") ?? "Root"}</td>
                      </tr>
                    ))}
                    {orderedFiles.map((file, index) => (
                      <ContextMenu key={file.id}>
                        <ContextMenuTrigger asChild>
                          <tr
                            data-file-id={file.id}
                            draggable
                            onDragStart={(event) => {
                              const payload = selectedIds.includes(file.id)
                                ? JSON.stringify(selectedIds)
                                : JSON.stringify([file.id]);
                              event.dataTransfer.setData("text/plain", payload);
                            }}
                            onClick={(event) => {
                              const now = Date.now();
                              if (lastClick?.id === file.id && now - lastClick.time < 600) {
                                if (!isRecycleView) {
                                  setEditingId(file.id);
                                  setEditingValue(file.name);
                                }
                              } else {
                                handleSelection(file.id, index, event);
                              }
                              setLastClick({ id: file.id, time: now });
                            }}
                            className={`cursor-pointer border-t ${
                              selectedIds.includes(file.id) ? "bg-muted/40" : "hover:bg-muted/20"
                            }`}
                          >
                            <td className="p-2">
                              <div className="flex items-center gap-2">
                                <input
                                  type="checkbox"
                                  checked={selectedIds.includes(file.id)}
                                  onChange={() => toggleSelect(file.id)}
                                  onClick={(event) => event.stopPropagation()}
                                />
                                {iconForFile(file.type, "sm")}
                                {editingId === file.id ? (
                                  <Input
                                    value={editingValue}
                                    onChange={(event) => setEditingValue(event.target.value)}
                                    onBlur={() => {
                                      renameFile(session.tenantId, session, file.id, editingValue);
                                      setEditingId(null);
                                      setVersion((prev) => prev + 1);
                                    }}
                                  />
                                ) : (
                                  <span>{file.name}</span>
                                )}
                              </div>
                            </td>
                            <td className="p-2">{typeLabel[file.type]}</td>
                            <td className="p-2">{folderMap.get(file.folderId ?? "root") ?? "Root"}</td>
                          </tr>
                        </ContextMenuTrigger>
                        <ContextMenuContent>
                          <ContextMenuItem
                            onClick={() => {
                              setSelectedFileId(file.id);
                              setPreviewOpen(true);
                            }}
                          >
                            Preview
                          </ContextMenuItem>
                          {isRecycleView ? (
                            <>
                              <ContextMenuSeparator />
                              <ContextMenuItem
                                onClick={() => {
                                  restoreFromRecycle(session.tenantId, session, file.id);
                                  setVersion((prev) => prev + 1);
                                }}
                              >
                                Restore
                              </ContextMenuItem>
                            </>
                          ) : (
                            <>
                              <ContextMenuItem onClick={() => {
                                setEditingId(file.id);
                                setEditingValue(file.name);
                              }}>
                                Rename
                              </ContextMenuItem>
                              <ContextMenuSeparator />
                              <ContextMenuItem
                                onClick={() => {
                                  moveToRecycle(session.tenantId, session, file.id);
                                  setVersion((prev) => prev + 1);
                                }}
                              >
                                Delete
                              </ContextMenuItem>
                            </>
                          )}
                        </ContextMenuContent>
                      </ContextMenu>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div
                ref={fileAreaRef}
                className={`relative grid gap-2 ${
                  viewMode === "large" ? "md:grid-cols-2 xl:grid-cols-4" : "md:grid-cols-2 xl:grid-cols-3"
                }`}
                onMouseDown={(event) => {
                  if (event.button !== 0) return;
                  const target = event.target as HTMLElement;
                  if (target.closest("[data-file-id]")) return;
                  const bounds = fileAreaRef.current?.getBoundingClientRect();
                  if (!bounds) return;
                  setMarquee({
                    startX: event.clientX - bounds.left,
                    startY: event.clientY - bounds.top,
                    x: event.clientX - bounds.left,
                    y: event.clientY - bounds.top,
                    active: true,
                  });
                  setSelectedIds([]);
                  setSelectedFileId(null);
                }}
                onMouseMove={(event) => {
                  if (!marquee?.active) return;
                  const bounds = fileAreaRef.current?.getBoundingClientRect();
                  if (!bounds) return;
                  setMarquee((prev) =>
                    prev
                      ? {
                          ...prev,
                          x: event.clientX - bounds.left,
                          y: event.clientY - bounds.top,
                        }
                      : prev,
                  );
                }}
                onMouseUp={() => {
                  if (!marquee?.active) return;
                  const bounds = fileAreaRef.current?.getBoundingClientRect();
                  if (!bounds) return;
                  const left = Math.min(marquee.startX, marquee.x);
                  const right = Math.max(marquee.startX, marquee.x);
                  const top = Math.min(marquee.startY, marquee.y);
                  const bottom = Math.max(marquee.startY, marquee.y);
                  const nodes = fileAreaRef.current?.querySelectorAll("[data-file-id]") ?? [];
                  const hits: string[] = [];
                  nodes.forEach((node) => {
                    const rect = node.getBoundingClientRect();
                    const nodeLeft = rect.left - bounds.left;
                    const nodeRight = rect.right - bounds.left;
                    const nodeTop = rect.top - bounds.top;
                    const nodeBottom = rect.bottom - bounds.top;
                    const intersects =
                      nodeLeft < right && nodeRight > left && nodeTop < bottom && nodeBottom > top;
                    if (intersects) {
                      const id = (node as HTMLElement).dataset.fileId;
                      if (id) hits.push(id);
                    }
                  });
                  setSelectedIds(hits);
                  setSelectedFileId(hits[0] ?? null);
                  setMarquee(null);
                }}
                onMouseLeave={() => {
                  if (marquee?.active) setMarquee(null);
                }}
              >
                {marquee?.active ? (
                  <div
                    className="pointer-events-none absolute z-10 border border-primary/70 bg-primary/10"
                    style={{
                      left: Math.min(marquee.startX, marquee.x),
                      top: Math.min(marquee.startY, marquee.y),
                      width: Math.abs(marquee.x - marquee.startX),
                      height: Math.abs(marquee.y - marquee.startY),
                    }}
                  />
                ) : null}
                {showRecycleEntry ? (
                  <div
                    className="flex cursor-pointer items-center justify-between rounded-lg border bg-muted/20 p-3 hover:bg-muted/30"
                    onClick={() => navigateToFolder("recycle")}
                  >
                    <div className="flex items-center gap-3">
                      <Trash2 className={viewMode === "large" ? "h-6 w-6" : "h-4 w-4"} />
                      <div>
                        <p className="text-sm font-medium text-foreground">Recycle Bin</p>
                        <p className="text-xs text-muted-foreground">System</p>
                      </div>
                    </div>
                  </div>
                ) : null}
                {orderedFolders.map((folder) => (
                  <div
                    key={folder.id}
                    className="flex cursor-pointer items-center justify-between rounded-lg border bg-muted/20 p-3 hover:bg-muted/30"
                    onClick={() => navigateToFolder(folder.id)}
                    onDragOver={(event) => event.preventDefault()}
                    onDrop={(event) => {
                      const folderPayload = event.dataTransfer.getData("application/x-folder");
                      if (folderPayload && folderPayload !== folder.id) {
                        moveFolder(session.tenantId, session, folderPayload, folder.id);
                        setVersion((prev) => prev + 1);
                        return;
                      }
                      const payload = event.dataTransfer.getData("text/plain");
                      if (payload) handleDrop(payload, folder.id);
                    }}
                    draggable
                    onDragStart={(event) => {
                      event.dataTransfer.setData("application/x-folder", folder.id);
                    }}
                  >
                    <div className="flex items-center gap-3">
                      <Folder className={viewMode === "large" ? "h-6 w-6" : "h-4 w-4"} />
                      <div>
                        <p className="text-sm font-medium text-foreground">{folder.name}</p>
                        <p className="text-xs text-muted-foreground">Folder</p>
                      </div>
                    </div>
                  </div>
                ))}
                {orderedFiles.map((file, index) => (
                  <ContextMenu key={file.id}>
                    <ContextMenuTrigger asChild>
                      <div
                        data-file-id={file.id}
                        draggable
                        onDragStart={(event) => {
                          const payload = selectedIds.includes(file.id)
                            ? JSON.stringify(selectedIds)
                            : JSON.stringify([file.id]);
                          event.dataTransfer.setData("text/plain", payload);
                        }}
                        onClick={(event) => {
                          const now = Date.now();
                          if (lastClick?.id === file.id && now - lastClick.time < 600) {
                            if (!isRecycleView) {
                              setEditingId(file.id);
                              setEditingValue(file.name);
                            }
                          } else {
                            handleSelection(file.id, index, event);
                          }
                          setLastClick({ id: file.id, time: now });
                        }}
                        className={`flex cursor-pointer items-center justify-between rounded-lg border p-3 ${
                          selectedIds.includes(file.id) ? "border-primary" : ""
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <input
                            type="checkbox"
                            checked={selectedIds.includes(file.id)}
                            onChange={() => toggleSelect(file.id)}
                            onClick={(event) => event.stopPropagation()}
                          />
                          {iconForFile(file.type, viewMode === "large" ? "lg" : "sm")}
                          <div>
                            {editingId === file.id ? (
                              <Input
                                value={editingValue}
                                onChange={(event) => setEditingValue(event.target.value)}
                                onBlur={() => {
                                  renameFile(session.tenantId, session, file.id, editingValue);
                                  setEditingId(null);
                                  setVersion((prev) => prev + 1);
                                }}
                              />
                            ) : (
                              <p className="text-sm font-medium text-foreground">{file.name}</p>
                            )}
                            <p className="text-xs text-muted-foreground">
                              Folder: {folderMap.get(file.folderId ?? "root") ?? "Root"}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">{typeLabel[file.type]}</Badge>
                        </div>
                      </div>
                    </ContextMenuTrigger>
                    <ContextMenuContent>
                      <ContextMenuItem
                        onClick={() => {
                          setSelectedFileId(file.id);
                          setPreviewOpen(true);
                        }}
                      >
                        Preview
                      </ContextMenuItem>
                      {isRecycleView ? (
                        <>
                          <ContextMenuSeparator />
                          <ContextMenuItem
                            onClick={() => {
                              restoreFromRecycle(session.tenantId, session, file.id);
                              setVersion((prev) => prev + 1);
                            }}
                          >
                            Restore
                          </ContextMenuItem>
                        </>
                      ) : (
                        <>
                          <ContextMenuItem onClick={() => {
                            setEditingId(file.id);
                            setEditingValue(file.name);
                          }}>
                            Rename
                          </ContextMenuItem>
                          <ContextMenuSeparator />
                          <ContextMenuItem
                            onClick={() => {
                              moveToRecycle(session.tenantId, session, file.id);
                              setVersion((prev) => prev + 1);
                            }}
                          >
                            Delete
                          </ContextMenuItem>
                        </>
                      )}
                    </ContextMenuContent>
                  </ContextMenu>
                ))}
              </div>
            )}
          </WorkspacePanel>

        </div>
      </div>
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>{selectedFile?.name ?? "File preview"}</DialogTitle>
          </DialogHeader>
          {selectedFile ? (
            <div className="grid gap-4 md:grid-cols-[1.4fr_1fr]">
              <div className="space-y-3">
                <div className="rounded-lg border p-4 text-sm text-muted-foreground">
                  {selectedFile.content.slice(0, 400) || "No preview available."}
                </div>
                <div className="flex flex-wrap gap-2">
                  {!isRecycleView ? (
                    <>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setEditingId(selectedFile.id);
                          setEditingValue(selectedFile.name);
                        }}
                      >
                        Rename
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          moveToRecycle(session.tenantId, session, selectedFile.id);
                          setPreviewOpen(false);
                          setVersion((prev) => prev + 1);
                        }}
                      >
                        Move to recycle bin
                      </Button>
                    </>
                  ) : (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        restoreFromRecycle(session.tenantId, session, selectedFile.id);
                        setPreviewOpen(false);
                        setVersion((prev) => prev + 1);
                      }}
                    >
                      Restore
                    </Button>
                  )}
                </div>
              </div>
              <div className="space-y-2 text-sm">
                <div className="rounded-lg border p-4">
                  <div className="text-xs text-muted-foreground">Metadata</div>
                  <div className="mt-2 space-y-1">
                    <div>ID: {selectedFile.id}</div>
                    <div>Type: {typeLabel[selectedFile.type]}</div>
                    <div>Owner: {selectedFile.ownerId}</div>
                    <div>Tenant: {selectedFile.tenantId}</div>
                    <div>Department: {selectedFile.departmentId}</div>
                    <div>Folder: {folderMap.get(selectedFile.folderId ?? "root")}</div>
                    <div>Created: {selectedFile.createdAt.slice(0, 10)}</div>
                    <div>Updated: {selectedFile.updatedAt.slice(0, 10)}</div>
                  </div>
                </div>
                {!isRecycleView ? (
                  <div className="rounded-lg border p-4">
                    <div className="text-xs text-muted-foreground">Move to folder</div>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {folders.map((folder) => (
                        <Button
                          key={folder.id}
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            moveFile(session.tenantId, session, selectedFile.id, folder.id);
                            setVersion((prev) => prev + 1);
                          }}
                        >
                          {folder.name}
                        </Button>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          ) : (
            <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
              Select a file to see preview and metadata.
            </div>
          )}
        </DialogContent>
      </Dialog>
    </PageShell>
  );
}
