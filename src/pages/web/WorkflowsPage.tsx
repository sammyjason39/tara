import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Workflow, Save, Play, Power, PowerOff, RefreshCw, ChevronLeft, Upload, FileEdit,
} from "lucide-react";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import { WorkflowCanvas, type WorkflowGraph } from "@/components/workflows/WorkflowCanvas";
import { WorkflowNodeProperties } from "@/components/workflows/WorkflowNodeProperties";
import { WorkflowExecutionPanel } from "@/components/workflows/WorkflowExecutionPanel";
import { WorkflowTestDialog, buildDefaultPayload } from "@/components/workflows/WorkflowTestDialog";

type WorkflowRow = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  category: string;
  trigger_event: string | null;
  is_active: boolean;
  is_system: boolean;
  is_published: boolean;
  has_unpublished_changes: boolean;
  graph: WorkflowGraph;
};

type Catalog = {
  categories: string[];
  trigger_events: string[];
  action_types: Record<string, { label: string; description: string }>;
  operators?: Record<string, { label: string; description: string; needsValue: boolean }>;
  fields?: Array<{ path: string; label: string; group: string; type: string; options?: string[] }>;
  recipient_modes?: Array<{ id: string; label: string }>;
};

const CATEGORY_LABELS: Record<string, string> = {
  leave: "Cuti",
  attendance: "Absensi",
  whatsapp: "WhatsApp",
  onboarding: "Onboarding",
  notification: "Notifikasi",
  employee: "Karyawan",
};

const EMPTY_GRAPH: WorkflowGraph = {
  nodes: [
    {
      id: "trigger-1",
      type: "trigger",
      position: { x: 120, y: 80 },
      data: { label: "Trigger baru", eventType: "leave.request.submitted" },
    },
  ],
  edges: [],
};

function newNodeId(type: string) {
  return `${type}-${Math.random().toString(36).slice(2, 8)}`;
}

function workflowStatusLabel(wf: WorkflowRow) {
  if (wf.is_active) return { text: "Aktif", className: "bg-success/10 text-success" };
  if (wf.is_published && wf.has_unpublished_changes) {
    return { text: "Draft baru", className: "bg-warning/10 text-warning" };
  }
  if (wf.is_published) return { text: "Published", className: "bg-blue-500/10 text-blue-600 dark:text-blue-400" };
  return { text: "Draft", className: "bg-muted text-muted-foreground" };
}

export function WorkflowsPage() {
  const queryClient = useQueryClient();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [draftGraph, setDraftGraph] = useState<WorkflowGraph | null>(null);
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [testOpen, setTestOpen] = useState(false);
  const [executionRefresh, setExecutionRefresh] = useState(0);

  const { data: listRes, isLoading } = useQuery({
    queryKey: ["workflows"],
    queryFn: () => api.get("/workflows"),
  });

  const workflows: WorkflowRow[] = listRes?.data ?? [];
  const selected = workflows.find((w) => w.id === selectedId) ?? null;
  const graph = draftGraph ?? selected?.graph ?? EMPTY_GRAPH;
  const hasUnsavedDraft = draftGraph != null;

  const { data: catalogRes } = useQuery({
    queryKey: ["workflows-catalog", selected?.trigger_event],
    queryFn: () =>
      api.get(
        `/workflows/catalog${selected?.trigger_event ? `?trigger_event=${encodeURIComponent(selected.trigger_event)}` : ""}`,
      ),
    enabled: !!selected,
  });

  const catalog: Catalog | undefined = catalogRes?.data;

  const { data: waGroupsRes } = useQuery({
    queryKey: ["whatsapp-groups"],
    queryFn: () =>
      api.get<{ data: Array<{ id: string; subject: string | null }> }>("/workflows/whatsapp/groups"),
    staleTime: 60_000,
  });
  const whatsappGroups = waGroupsRes?.data ?? [];

  const filtered = useMemo(() => {
    if (filterCategory === "all") return workflows;
    return workflows.filter((w) => w.category === filterCategory);
  }, [workflows, filterCategory]);

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: ["workflows"] });
    setExecutionRefresh((n) => n + 1);
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!selected) return;
      await api.put(`/workflows/${selected.id}`, { graph });
    },
    onSuccess: () => {
      toast.success("Draft workflow disimpan");
      invalidateAll();
      setDraftGraph(null);
    },
    onError: (err: Error) => toast.error(err.message || "Gagal menyimpan"),
  });

  const publishMutation = useMutation({
    mutationFn: async () => {
      if (!selected) return;
      if (hasUnsavedDraft) {
        await api.put(`/workflows/${selected.id}`, { graph });
      }
      await api.post(`/workflows/${selected.id}/publish`);
    },
    onSuccess: () => {
      toast.success("Workflow dipublish — siap diaktifkan");
      invalidateAll();
      setDraftGraph(null);
    },
    onError: (err: Error) => toast.error(err.message || "Gagal publish"),
  });

  const activateMutation = useMutation({
    mutationFn: async () => {
      if (!selected) return;
      await api.post(`/workflows/${selected.id}/activate`);
    },
    onSuccess: () => {
      toast.success("Workflow diaktifkan");
      invalidateAll();
    },
    onError: (err: Error) => toast.error(err.message || "Gagal mengaktifkan — publish dulu"),
  });

  const deactivateMutation = useMutation({
    mutationFn: async () => {
      if (!selected) return;
      await api.post(`/workflows/${selected.id}/deactivate`);
    },
    onSuccess: () => {
      toast.success("Workflow dinonaktifkan");
      invalidateAll();
    },
    onError: (err: Error) => toast.error(err.message || "Gagal menonaktifkan"),
  });

  const testMutation = useMutation({
    mutationFn: async (params: {
      employee_id: string;
      actor_employee_id?: string;
      phone?: string;
      employee_name?: string;
    }) => {
      if (!selected) return null;
      const event = buildDefaultPayload(
        selected.trigger_event,
        params.employee_id,
        params.employee_name ?? "Test User",
      );
      return api.post(`/workflows/${selected.id}/test`, {
        employee_id: params.employee_id,
        actor_employee_id: params.actor_employee_id,
        phone: params.phone,
        event,
      });
    },
    onSuccess: (res) => {
      setTestOpen(false);
      const data = res?.data;
      const steps = data?.steps ?? [];
      if (res?.success) {
        toast.success(`Test berhasil — ${steps.length} langkah dieksekusi`);
      } else {
        toast.error(data?.error || res?.message || "Test gagal");
      }
      invalidateAll();
    },
    onError: (err: Error) => toast.error(err.message || "Test gagal"),
  });

  const reseedMutation = useMutation({
    mutationFn: () => api.post("/workflows/seed"),
    onSuccess: () => {
      toast.success("Template workflow diperbarui");
      invalidateAll();
    },
    onError: (err: Error) => toast.error(err.message || "Gagal reseed"),
  });

  const addNode = (type: "condition" | "action") => {
    const id = newNodeId(type);
    const next: WorkflowGraph = {
      nodes: [
        ...graph.nodes,
        {
          id,
          type,
          position: { x: 120 + graph.nodes.length * 40, y: 200 + graph.nodes.length * 60 },
          data:
            type === "condition"
              ? {
                  label: "If / Kondisi",
                  match: "all",
                  rules: [{ field: "employee.role", operator: "eq", value: "Employee" }],
                }
              : {
                  label: "Aksi baru",
                  actionType: "send_notification",
                  config: { recipient_mode: "employee", title: "", content: "" },
                },
        },
      ],
      edges: graph.edges,
    };
    setDraftGraph(next);
    setSelectedNodeId(id);
  };

  const status = selected ? workflowStatusLabel(selected) : null;

  return (
    <div className="h-[calc(100vh-7rem)] flex flex-col gap-4 animate-fade-in">
      <div className="flex items-center justify-between gap-3 shrink-0">
        <div>
          <h1 className="text-luxury-heading text-2xl flex items-center gap-2">
            <Workflow className="h-6 w-6 text-gold" />
            Otomasi Workflow
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Simpan draft → Publish → Aktifkan. Log eksekusi tercatat otomatis.
          </p>
        </div>
        <button
          onClick={() => reseedMutation.mutate()}
          disabled={reseedMutation.isPending}
          className="flex items-center gap-2 px-3 py-2 rounded-md border text-sm hover:bg-accent"
        >
          <RefreshCw className={cn("h-4 w-4", reseedMutation.isPending && "animate-spin")} />
          Reset Template
        </button>
      </div>

      <div className="flex-1 min-h-0 grid grid-cols-12 gap-4">
        <div className="col-span-3 surface-elevated flex flex-col min-h-0">
          <div className="p-3 border-b border-border space-y-2">
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="w-full h-9 px-2 rounded-md border border-input bg-background text-sm"
            >
              <option value="all">Semua kategori</option>
              {(catalog?.categories ?? Object.keys(CATEGORY_LABELS)).map((c) => (
                <option key={c} value={c}>{CATEGORY_LABELS[c] ?? c}</option>
              ))}
            </select>
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {isLoading && <p className="text-sm text-muted-foreground p-3">Memuat...</p>}
            {filtered.map((wf) => {
              const st = workflowStatusLabel(wf);
              return (
                <button
                  key={wf.id}
                  onClick={() => {
                    setSelectedId(wf.id);
                    setDraftGraph(null);
                    setSelectedNodeId(null);
                  }}
                  className={cn(
                    "w-full text-left rounded-md p-3 border transition-colors",
                    selectedId === wf.id
                      ? "border-gold/50 bg-gold/5"
                      : "border-transparent hover:bg-accent",
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-medium leading-snug">{wf.name}</p>
                    <span className={cn("shrink-0 text-2xs px-1.5 py-0.5 rounded font-medium", st.className)}>
                      {st.text}
                    </span>
                  </div>
                  <p className="text-2xs text-muted-foreground mt-1">
                    {CATEGORY_LABELS[wf.category] ?? wf.category}
                    {wf.trigger_event && ` · ${wf.trigger_event}`}
                  </p>
                </button>
              );
            })}
          </div>
        </div>

        <div className="col-span-9 flex flex-col min-h-0 gap-3">
          {!selected ? (
            <div className="flex-1 surface-elevated flex items-center justify-center text-sm text-muted-foreground">
              Pilih workflow dari daftar untuk mengedit
            </div>
          ) : (
            <>
              <div className="surface-elevated p-3 flex items-center justify-between gap-3 shrink-0 flex-wrap">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      onClick={() => setSelectedId(null)}
                      className="p-1 rounded hover:bg-accent lg:hidden"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </button>
                    <h2 className="text-sm font-semibold truncate">{selected.name}</h2>
                    {selected.is_system && (
                      <span className="text-2xs px-1.5 py-0.5 rounded bg-accent text-muted-foreground">Sistem</span>
                    )}
                    {status && (
                      <span className={cn("text-2xs px-1.5 py-0.5 rounded font-medium", status.className)}>
                        {status.text}
                      </span>
                    )}
                    {hasUnsavedDraft && (
                      <span className="text-2xs px-1.5 py-0.5 rounded bg-warning/10 text-warning flex items-center gap-1">
                        <FileEdit className="h-3 w-3" />
                        Belum disimpan
                      </span>
                    )}
                  </div>
                  <p className="text-2xs text-muted-foreground truncate">{selected.description}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">
                  <button
                    onClick={() => addNode("condition")}
                    className="px-2.5 py-1.5 rounded-md border text-xs hover:bg-accent"
                  >
                    + If
                  </button>
                  <button
                    onClick={() => addNode("action")}
                    className="px-2.5 py-1.5 rounded-md border text-xs hover:bg-accent"
                  >
                    + Aksi
                  </button>
                  <button
                    onClick={() => setTestOpen(true)}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border text-xs hover:bg-accent"
                  >
                    <Play className="h-3.5 w-3.5" />
                    Test
                  </button>
                  <button
                    onClick={() => saveMutation.mutate()}
                    disabled={saveMutation.isPending || !hasUnsavedDraft}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border text-xs hover:bg-accent disabled:opacity-50"
                  >
                    <Save className="h-3.5 w-3.5" />
                    Simpan
                  </button>
                  <button
                    onClick={() => publishMutation.mutate()}
                    disabled={
                      publishMutation.isPending ||
                      !(hasUnsavedDraft || !selected.is_published || selected.has_unpublished_changes)
                    }
                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border text-xs hover:bg-accent disabled:opacity-50"
                    title="Publish versi tersimpan ke production"
                  >
                    <Upload className="h-3.5 w-3.5" />
                    Publish
                  </button>
                  {selected.is_active ? (
                    <button
                      onClick={() => deactivateMutation.mutate()}
                      disabled={deactivateMutation.isPending}
                      className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border text-xs text-success hover:bg-accent"
                    >
                      <Power className="h-3.5 w-3.5" />
                      Aktif
                    </button>
                  ) : (
                    <button
                      onClick={() => activateMutation.mutate()}
                      disabled={activateMutation.isPending || !selected.is_published}
                      className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border text-xs text-muted-foreground hover:bg-accent disabled:opacity-50"
                      title={!selected.is_published ? "Publish dulu sebelum aktifkan" : "Aktifkan workflow"}
                    >
                      <PowerOff className="h-3.5 w-3.5" />
                      Aktifkan
                    </button>
                  )}
                </div>
              </div>

              <div className="flex-1 min-h-0 grid grid-cols-4 gap-3">
                <div className="col-span-3 min-h-0 flex flex-col gap-3">
                  <div className="flex-1 min-h-[280px]">
                    <WorkflowCanvas
                      graph={graph}
                      onChange={setDraftGraph}
                      selectedNodeId={selectedNodeId}
                      onSelectNode={setSelectedNodeId}
                    />
                  </div>
                  <div className="surface-elevated p-3 shrink-0">
                    <WorkflowExecutionPanel
                      workflowId={selected.id}
                      refreshKey={executionRefresh}
                    />
                  </div>
                </div>

                <div className="col-span-1 surface-elevated p-3 space-y-3 overflow-y-auto max-h-full">
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    Properti Node
                  </h3>
                  <WorkflowNodeProperties
                    graph={graph}
                    selectedNodeId={selectedNodeId}
                    catalog={catalog}
                    triggerEvent={selected.trigger_event}
                    whatsappGroups={whatsappGroups}
                    onChange={setDraftGraph}
                  />
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {selected && (
        <WorkflowTestDialog
          open={testOpen}
          onClose={() => setTestOpen(false)}
          workflowId={selected.id}
          triggerEvent={selected.trigger_event}
          hasUnsavedDraft={hasUnsavedDraft}
          isRunning={testMutation.isPending}
          onRun={(params) => testMutation.mutate(params)}
        />
      )}
    </div>
  );
}
