import { memo } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import { Zap, GitBranch, Play } from "lucide-react";
import { cn } from "@/lib/utils";

type NodeData = {
  label: string;
  eventType?: string;
  scheduleCron?: string;
  field?: string;
  operator?: string;
  value?: string;
  actionType?: string;
};

function BaseNode({
  icon: Icon,
  title,
  subtitle,
  className,
  handles,
}: {
  icon: typeof Zap;
  title: string;
  subtitle?: string;
  className?: string;
  handles: React.ReactNode;
}) {
  return (
    <div className={cn("rounded-lg border bg-card shadow-md min-w-[180px] max-w-[240px]", className)}>
      <Handle type="target" position={Position.Top} className="!bg-muted-foreground !w-2 !h-2" />
      <div className="px-3 py-2.5 space-y-1">
        <div className="flex items-center gap-2">
          <Icon className="h-3.5 w-3.5 shrink-0 opacity-70" />
          <span className="text-xs font-semibold truncate">{title}</span>
        </div>
        {subtitle && <p className="text-2xs text-muted-foreground leading-snug">{subtitle}</p>}
      </div>
      {handles}
    </div>
  );
}

export const TriggerNode = memo(({ data }: NodeProps) => {
  const d = data as NodeData;
  const subtitle = d.scheduleCron
    ? `⏱ ${d.scheduleCron}`
    : d.eventType;
  return (
    <BaseNode
      icon={Zap}
      title={d.label || "Trigger"}
      subtitle={subtitle}
      className="border-gold/40"
      handles={
        <Handle type="source" position={Position.Bottom} className="!bg-gold !w-2 !h-2" />
      }
    />
  );
});

export const ConditionNode = memo(({ data }: NodeProps) => {
  const d = data as NodeData & {
    rules?: Array<{ field: string; operator?: string; value?: string }>;
    match?: string;
  };
  const ruleCount = d.rules?.length ?? (d.field ? 1 : 0);
  const firstRule = d.rules?.[0];
  const subtitle = firstRule
    ? `${d.match === "any" ? "ANY" : "ALL"} · ${firstRule.field} ${firstRule.operator ?? ""} ${firstRule.value ?? ""}`.trim()
    : d.field
      ? `${d.field} ${d.operator ?? ""} ${d.value ?? ""}`.trim()
      : ruleCount > 1
        ? `${ruleCount} rules`
        : undefined;
  return (
    <div className="rounded-lg border border-blue-500/30 bg-card shadow-md min-w-[180px] max-w-[240px]">
      <Handle type="target" position={Position.Top} className="!bg-muted-foreground !w-2 !h-2" />
      <div className="px-3 py-2.5 space-y-1">
        <div className="flex items-center gap-2">
          <GitBranch className="h-3.5 w-3.5 shrink-0 text-blue-500" />
          <span className="text-xs font-semibold">{d.label || "If"}</span>
        </div>
        {subtitle && <p className="text-2xs text-muted-foreground font-mono truncate">{subtitle}</p>}
      </div>
      <Handle
        type="source"
        position={Position.Right}
        id="true"
        style={{ top: "35%" }}
        className="!bg-success !w-2 !h-2"
      />
      <Handle
        type="source"
        position={Position.Right}
        id="false"
        style={{ top: "65%" }}
        className="!bg-destructive !w-2 !h-2"
      />
    </div>
  );
});

export const ActionNode = memo(({ data }: NodeProps) => {
  const d = data as NodeData;
  return (
    <BaseNode
      icon={Play}
      title={d.label || "Action"}
      subtitle={d.actionType?.replace(/_/g, " ")}
      className="border-emerald-500/30"
      handles={
        <Handle type="source" position={Position.Bottom} className="!bg-emerald-500 !w-2 !h-2" />
      }
    />
  );
});

export const workflowNodeTypes = {
  trigger: TriggerNode,
  condition: ConditionNode,
  action: ActionNode,
};
