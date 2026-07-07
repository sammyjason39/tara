import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { CheckCircle2, ChevronDown, ChevronRight, Clock, FlaskConical, XCircle } from "lucide-react";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";

type StepLog = {
  node_id: string;
  node_type: string;
  label: string;
  status: "completed" | "skipped" | "failed";
  detail?: string;
  at: string;
};

type ExecutionRow = {
  id: string;
  status: string;
  is_test: boolean;
  error: string | null;
  started_at: string;
  completed_at: string | null;
  steps_log: StepLog[];
};

type Props = {
  workflowId: string | null;
  refreshKey?: number;
};

function formatTime(iso: string) {
  return new Date(iso).toLocaleString("id-ID", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function WorkflowExecutionPanel({ workflowId, refreshKey }: Props) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["workflow-executions", workflowId, refreshKey],
    queryFn: () => api.get(`/workflows/${workflowId}/executions?limit=30`),
    enabled: !!workflowId,
  });

  const executions: ExecutionRow[] = data?.data ?? [];

  if (!workflowId) {
    return (
      <p className="text-2xs text-muted-foreground">Pilih workflow untuk melihat log eksekusi</p>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
          Log Eksekusi
        </h3>
        <span className="text-2xs text-muted-foreground">{executions.length} terakhir</span>
      </div>

      {isLoading && <p className="text-2xs text-muted-foreground">Memuat log...</p>}

      {!isLoading && executions.length === 0 && (
        <div className="rounded-md border border-dashed border-border p-4 text-center">
          <Clock className="h-5 w-5 mx-auto text-muted-foreground/40 mb-1" />
          <p className="text-2xs text-muted-foreground">Belum ada eksekusi</p>
        </div>
      )}

      <div className="space-y-1.5 max-h-[280px] overflow-y-auto">
        {executions.map((ex) => {
          const expanded = expandedId === ex.id;
          const steps = (ex.steps_log ?? []) as StepLog[];
          const failed = ex.status === "failed";

          return (
            <div key={ex.id} className="rounded-md border border-border/60 overflow-hidden">
              <button
                type="button"
                onClick={() => setExpandedId(expanded ? null : ex.id)}
                className="w-full flex items-start gap-2 p-2.5 text-left hover:bg-accent/50 transition-colors"
              >
                {expanded ? (
                  <ChevronDown className="h-3.5 w-3.5 mt-0.5 shrink-0 text-muted-foreground" />
                ) : (
                  <ChevronRight className="h-3.5 w-3.5 mt-0.5 shrink-0 text-muted-foreground" />
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {failed ? (
                      <XCircle className="h-3.5 w-3.5 text-destructive shrink-0" />
                    ) : (
                      <CheckCircle2 className="h-3.5 w-3.5 text-success shrink-0" />
                    )}
                    <span className={cn("text-xs font-medium", failed ? "text-destructive" : "text-success")}>
                      {failed ? "Gagal" : "Berhasil"}
                    </span>
                    {ex.is_test && (
                      <span className="inline-flex items-center gap-0.5 text-2xs px-1.5 py-0.5 rounded bg-accent text-muted-foreground">
                        <FlaskConical className="h-3 w-3" />
                        Test
                      </span>
                    )}
                    <span className="text-2xs text-muted-foreground">{formatTime(ex.started_at)}</span>
                  </div>
                  {ex.error && (
                    <p className="text-2xs text-destructive mt-0.5 line-clamp-2">{ex.error}</p>
                  )}
                  {!expanded && steps.length > 0 && (
                    <p className="text-2xs text-muted-foreground mt-0.5">{steps.length} langkah</p>
                  )}
                </div>
              </button>

              {expanded && (
                <div className="border-t border-border/50 bg-muted/20 px-3 py-2 space-y-1.5">
                  {steps.length === 0 ? (
                    <p className="text-2xs text-muted-foreground">Tidak ada langkah tercatat</p>
                  ) : (
                    steps.map((step, i) => (
                      <div key={`${step.node_id}-${i}`} className="flex items-start gap-2 text-2xs">
                        <span
                          className={cn(
                            "mt-0.5 h-1.5 w-1.5 rounded-full shrink-0",
                            step.status === "failed"
                              ? "bg-destructive"
                              : step.status === "skipped"
                                ? "bg-muted-foreground"
                                : "bg-success",
                          )}
                        />
                        <div className="min-w-0">
                          <p className="font-medium">{step.label || step.node_type}</p>
                          {step.detail && (
                            <p className="text-muted-foreground break-words">{step.detail}</p>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
