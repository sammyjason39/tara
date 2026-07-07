import { Plus, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { WorkflowGraph } from "./WorkflowCanvas";

type FieldDef = {
  path: string;
  label: string;
  group: string;
  type: string;
  options?: string[];
};

type CatalogSlice = {
  fields?: FieldDef[];
  operators?: Record<string, { label: string; description: string; needsValue: boolean }>;
  action_types?: Record<string, { label: string; description: string }>;
  trigger_events?: string[];
  recipient_modes?: Array<{ id: string; label: string }>;
};

type ConditionRule = { field: string; operator: string; value?: string };

type Props = {
  graph: WorkflowGraph;
  selectedNodeId: string | null;
  catalog?: CatalogSlice;
  triggerEvent: string | null;
  onChange: (graph: WorkflowGraph) => void;
};

export function WorkflowNodeProperties({
  graph,
  selectedNodeId,
  catalog,
  triggerEvent,
  onChange,
}: Props) {
  const selectedNode = graph.nodes.find((n) => n.id === selectedNodeId) ?? null;
  if (!selectedNode) {
    return <p className="text-2xs text-muted-foreground">Klik node untuk mengedit</p>;
  }

  const patchNode = (patch: Record<string, unknown>) => {
    if (!selectedNodeId) return;
    onChange({
      ...graph,
      nodes: graph.nodes.map((n) =>
        n.id === selectedNodeId ? { ...n, data: { ...n.data, ...patch } } : n,
      ),
    });
  };

  const patchConfig = (key: string, value: string) => {
    if (!selectedNodeId) return;
    onChange({
      ...graph,
      nodes: graph.nodes.map((n) => {
        if (n.id !== selectedNodeId) return n;
        const config = { ...(n.data.config as Record<string, string> | undefined), [key]: value };
        return { ...n, data: { ...n.data, config } };
      }),
    });
  };

  const fields = catalog?.fields ?? [];
  const fieldsByGroup = fields.reduce<Record<string, FieldDef[]>>((acc, f) => {
    (acc[f.group] ??= []).push(f);
    return acc;
  }, {});

  const rules: ConditionRule[] =
    (selectedNode.data.rules as ConditionRule[] | undefined)?.length
      ? (selectedNode.data.rules as ConditionRule[])
      : selectedNode.data.field
        ? [{
            field: String(selectedNode.data.field),
            operator: String(selectedNode.data.operator ?? "eq"),
            value: String(selectedNode.data.value ?? ""),
          }]
        : [{ field: "employee.role", operator: "eq", value: "" }];

  const setRules = (nextRules: ConditionRule[], match?: "all" | "any") => {
    patchNode({
      rules: nextRules,
      match: match ?? (selectedNode.data.match as "all" | "any") ?? "all",
      field: undefined,
      operator: undefined,
      value: undefined,
    });
  };

  return (
    <div className="space-y-3">
      <Field
        label="Label"
        value={String(selectedNode.data.label ?? "")}
        onChange={(v) => patchNode({ label: v })}
      />

      {selectedNode.type === "trigger" && (
        <div className="space-y-1">
          <label className="text-2xs text-muted-foreground">Event trigger</label>
          <select
            value={String(selectedNode.data.eventType ?? triggerEvent ?? "")}
            onChange={(e) => patchNode({ eventType: e.target.value })}
            className="w-full h-8 px-2 rounded-md border border-input bg-background text-xs"
          >
            {(catalog?.trigger_events ?? []).map((ev) => (
              <option key={ev} value={ev}>{ev}</option>
            ))}
          </select>
        </div>
      )}

      {selectedNode.type === "condition" && (
        <div className="space-y-2">
          <div className="space-y-1">
            <label className="text-2xs text-muted-foreground">Match</label>
            <select
              value={String(selectedNode.data.match ?? "all")}
              onChange={(e) => patchNode({ match: e.target.value, rules })}
              className="w-full h-8 px-2 rounded-md border border-input bg-background text-xs"
            >
              <option value="all">Semua (AND)</option>
              <option value="any">Salah satu (OR)</option>
            </select>
          </div>

          {rules.map((rule, idx) => (
            <div key={idx} className="rounded-md border border-border/60 p-2 space-y-2 bg-accent/20">
              <div className="flex items-center justify-between">
                <span className="text-2xs font-medium text-muted-foreground">Rule {idx + 1}</span>
                {rules.length > 1 && (
                  <button
                    type="button"
                    onClick={() => setRules(rules.filter((_, i) => i !== idx))}
                    className="p-1 rounded hover:bg-destructive/10 text-destructive"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                )}
              </div>

              <FieldSelect
                label="Field"
                value={rule.field}
                fieldsByGroup={fieldsByGroup}
                onChange={(v) => {
                  const next = [...rules];
                  next[idx] = { ...next[idx], field: v };
                  setRules(next);
                }}
              />

              <div className="space-y-1">
                <label className="text-2xs text-muted-foreground">Operator</label>
                <select
                  value={rule.operator}
                  onChange={(e) => {
                    const next = [...rules];
                    next[idx] = { ...next[idx], operator: e.target.value };
                    setRules(next);
                  }}
                  className="w-full h-8 px-2 rounded-md border border-input bg-background text-xs"
                >
                  {Object.entries(catalog?.operators ?? {}).map(([key, meta]) => (
                    <option key={key} value={key}>{meta.label} ({key})</option>
                  ))}
                </select>
              </div>

              {catalog?.operators?.[rule.operator]?.needsValue !== false && (
                <ValueInput
                  label="Nilai"
                  value={rule.value ?? ""}
                  fieldDef={fields.find((f) => f.path === rule.field)}
                  onChange={(v) => {
                    const next = [...rules];
                    next[idx] = { ...next[idx], value: v };
                    setRules(next);
                  }}
                />
              )}
            </div>
          ))}

          <button
            type="button"
            onClick={() => setRules([...rules, { field: "employee.role", operator: "eq", value: "" }])}
            className="flex items-center gap-1 text-2xs text-gold hover:text-gold/80"
          >
            <Plus className="h-3 w-3" />
            Tambah rule
          </button>

          <p className="text-2xs text-muted-foreground leading-relaxed">
            Contoh: <code className="text-2xs">employee.role</code> eq Supervisor, atau{" "}
            <code className="text-2xs">payload.content</code> contains resign
          </p>
        </div>
      )}

      {selectedNode.type === "action" && (
        <>
          <div className="space-y-1">
            <label className="text-2xs text-muted-foreground">Tipe aksi</label>
            <select
              value={String(selectedNode.data.actionType ?? "send_notification")}
              onChange={(e) => patchNode({ actionType: e.target.value })}
              className="w-full h-8 px-2 rounded-md border border-input bg-background text-xs"
            >
              {Object.entries(catalog?.action_types ?? {}).map(([key, meta]) => (
                <option key={key} value={key}>{meta.label}</option>
              ))}
            </select>
          </div>

          {(selectedNode.data.actionType === "send_notification" ||
            selectedNode.data.actionType === "send_whatsapp" ||
            selectedNode.data.actionType === "notify_by_role") && (
            <>
              <div className="space-y-1">
                <label className="text-2xs text-muted-foreground">Penerima</label>
                <select
                  value={String((selectedNode.data.config as any)?.recipient_mode ?? "employee")}
                  onChange={(e) => patchConfig("recipient_mode", e.target.value)}
                  className="w-full h-8 px-2 rounded-md border border-input bg-background text-xs"
                >
                  {(catalog?.recipient_modes ?? []).map((m) => (
                    <option key={m.id} value={m.id}>{m.label}</option>
                  ))}
                </select>
              </div>

              {((selectedNode.data.config as any)?.recipient_mode === "role" ||
                selectedNode.data.actionType === "notify_by_role") && (
                <Field
                  label="Role"
                  value={String((selectedNode.data.config as any)?.role ?? "HR_Admin")}
                  onChange={(v) => patchConfig("role", v)}
                  options={["SuperAdmin", "HR_Admin", "Supervisor", "Employee"]}
                />
              )}

              {((selectedNode.data.config as any)?.recipient_mode === "department") && (
                <Field
                  label="Departemen"
                  value={String((selectedNode.data.config as any)?.department ?? "{{employee.department}}")}
                  onChange={(v) => patchConfig("department", v)}
                />
              )}

              {((selectedNode.data.config as any)?.recipient_mode === "field") && (
                <FieldSelect
                  label="Field ID penerima"
                  value={String((selectedNode.data.config as any)?.recipient_field ?? "employee.id")}
                  fieldsByGroup={fieldsByGroup}
                  onChange={(v) => patchConfig("recipient_field", v)}
                />
              )}

              <Field
                label={selectedNode.data.actionType === "send_whatsapp" ? "Pesan WA" : "Judul"}
                value={String(
                  (selectedNode.data.config as any)?.title ??
                    (selectedNode.data.config as any)?.message ??
                    "",
                )}
                onChange={(v) =>
                  patchConfig(
                    selectedNode.data.actionType === "send_whatsapp" ? "message" : "title",
                    v,
                  )
                }
                multiline
              />
              {selectedNode.data.actionType === "send_notification" && (
                <Field
                  label="Isi notifikasi"
                  value={String((selectedNode.data.config as any)?.content ?? "")}
                  onChange={(v) => patchConfig("content", v)}
                  multiline
                  hint="Gunakan {{employee.full_name}}, {{payload.reason}}, dll."
                />
              )}
            </>
          )}

          {selectedNode.data.actionType === "set_variable" && (
            <>
              <Field
                label="Nama variabel"
                value={String((selectedNode.data.config as any)?.key ?? "")}
                onChange={(v) => patchConfig("key", v)}
              />
              <Field
                label="Nilai"
                value={String((selectedNode.data.config as any)?.value ?? "")}
                onChange={(v) => patchConfig("value", v)}
                hint="Bisa pakai template {{employee.role}}"
              />
            </>
          )}

          {selectedNode.data.actionType === "escalate_hr" && (
            <Field
              label="Alasan eskalasi"
              value={String((selectedNode.data.config as any)?.reason ?? "")}
              onChange={(v) => patchConfig("reason", v)}
              multiline
            />
          )}
        </>
      )}
    </div>
  );
}

function FieldSelect({
  label,
  value,
  fieldsByGroup,
  onChange,
}: {
  label: string;
  value: string;
  fieldsByGroup: Record<string, FieldDef[]>;
  onChange: (v: string) => void;
}) {
  return (
    <div className="space-y-1">
      <label className="text-2xs text-muted-foreground">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full h-8 px-2 rounded-md border border-input bg-background text-xs font-mono"
      >
        {Object.entries(fieldsByGroup).map(([group, items]) => (
          <optgroup key={group} label={group}>
            {items.map((f) => (
              <option key={f.path} value={f.path}>{f.label}</option>
            ))}
          </optgroup>
        ))}
        {value && !Object.values(fieldsByGroup).flat().some((f) => f.path === value) && (
          <option value={value}>{value}</option>
        )}
      </select>
    </div>
  );
}

function ValueInput({
  label,
  value,
  fieldDef,
  onChange,
}: {
  label: string;
  value: string;
  fieldDef?: FieldDef;
  onChange: (v: string) => void;
}) {
  if (fieldDef?.options?.length) {
    return (
      <div className="space-y-1">
        <label className="text-2xs text-muted-foreground">{label}</label>
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full h-8 px-2 rounded-md border border-input bg-background text-xs"
        >
          <option value="">— pilih —</option>
          {fieldDef.options.map((opt) => (
            <option key={opt} value={opt}>{opt}</option>
          ))}
        </select>
      </div>
    );
  }
  return <Field label={label} value={value} onChange={onChange} />;
}

function Field({
  label,
  value,
  onChange,
  multiline,
  hint,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  multiline?: boolean;
  hint?: string;
  options?: string[];
}) {
  return (
    <div className="space-y-1">
      <label className="text-2xs text-muted-foreground">{label}</label>
      {options ? (
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full h-8 px-2 rounded-md border border-input bg-background text-xs"
        >
          {options.map((o) => (
            <option key={o} value={o}>{o}</option>
          ))}
        </select>
      ) : multiline ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          rows={3}
          className="w-full px-2 py-1.5 rounded-md border border-input bg-background text-xs resize-none font-mono"
        />
      ) : (
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full h-8 px-2 rounded-md border border-input bg-background text-xs"
        />
      )}
      {hint && <p className={cn("text-2xs text-muted-foreground")}>{hint}</p>}
    </div>
  );
}
