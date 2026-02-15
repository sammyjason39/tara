import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PageHeader } from "@/core/ui/PageHeader";
import { WorkspacePanel } from "@/core/ui/WorkspacePanel";
import { useSession } from "@/core/security/session";
import { salesService } from "@/core/services/sales/salesService";
import type { OpportunityStage } from "@/core/types/sales/sales";

const STAGES: OpportunityStage[] = [
  "NEW",
  "CONTACTED",
  "QUALIFIED",
  "PROPOSAL",
  "NEGOTIATION",
  "CLOSED_WON",
  "CLOSED_LOST",
];

export default function PipelineBoard() {
  const session = useSession();
  const [refreshKey, setRefreshKey] = useState(0);

  const pipeline = useMemo(
    () => salesService.getPipelineByStage(session.tenantId),
    [refreshKey, session.tenantId],
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Pipeline Board"
        subtitle="Kanban pipeline with stage probability and audit-backed stage transitions."
        secondaryActions={<Button variant="outline" onClick={() => setRefreshKey((value) => value + 1)}>Refresh</Button>}
      />

      <WorkspacePanel title="Pipeline Execution" description="Move opportunities across lifecycle stages from New to Closed.">
        <div className="grid gap-3 xl:grid-cols-4 2xl:grid-cols-7">
          {STAGES.map((stage) => (
            <div key={stage} className="rounded-lg border bg-card">
              <div className="flex items-center justify-between border-b px-3 py-2">
                <p className="text-xs font-semibold uppercase text-muted-foreground">{stage}</p>
                <Badge variant="outline">{pipeline[stage].length}</Badge>
              </div>
              <div className="space-y-2 p-2">
                {pipeline[stage].map((item) => (
                  <div key={item.id} className="space-y-2 rounded-md border p-2">
                    <p className="text-sm font-medium">{item.accountName}</p>
                    <p className="text-xs text-muted-foreground">
                      {item.amount.toLocaleString()} {item.currency}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Prob: {item.probability}% | Health: {item.health}
                    </p>
                    <div className="flex items-center gap-2">
                      <Select
                        value={item.stage}
                        onValueChange={(value: OpportunityStage) => {
                          salesService.moveOpportunityStage(
                            session.tenantId,
                            session,
                            item.id,
                            value,
                          );
                          setRefreshKey((current) => current + 1);
                        }}
                      >
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue placeholder="Move stage" />
                        </SelectTrigger>
                        <SelectContent>
                          {STAGES.map((candidate) => (
                            <SelectItem key={candidate} value={candidate}>
                              {candidate}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </WorkspacePanel>
    </div>
  );
}
