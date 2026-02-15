import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { DataTableShell } from "@/core/tools/DataTableShell";
import { FilterBar } from "@/core/tools/FilterBar";
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

export default function OpportunityDesk() {
  const session = useSession();
  const [search, setSearch] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);
  const opportunities = useMemo(
    () => salesService.listOpportunities(session.tenantId),
    [refreshKey, session.tenantId],
  );
  const quotes = useMemo(
    () => salesService.listQuotes(session.tenantId),
    [refreshKey, session.tenantId],
  );
  const filtered = opportunities.filter((op) =>
    search
      ? `${op.accountName} ${op.ownerName} ${op.stage} ${op.health}`
          .toLowerCase()
          .includes(search.toLowerCase())
      : true,
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Opportunities"
        subtitle="Deal lifecycle execution from qualified pipeline to closed outcomes."
        secondaryActions={
          <Input
            placeholder="Search opportunities"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="min-w-[220px]"
          />
        }
      />

      <WorkspacePanel title="Deal board" description="Stage movement, quote context, and close controls.">
        <FilterBar searchValue={search} onSearchChange={setSearch} />
        <DataTableShell total={filtered.length} page={1} pageSize={10}>
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-xs uppercase text-muted-foreground">
              <tr>
                <th className="p-3 text-left">Name</th>
                <th className="p-3 text-left">Owner</th>
                <th className="p-3 text-left">Value</th>
                <th className="p-3 text-left">Stage</th>
                <th className="p-3 text-left">Health</th>
                <th className="p-3 text-left">Quotes</th>
                <th className="p-3 text-left">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((op) => (
                <tr key={op.id} className="border-t">
                  <td className="p-3 font-medium">{op.accountName}</td>
                  <td className="p-3 text-muted-foreground">{op.ownerName}</td>
                  <td className="p-3 text-muted-foreground">
                    {op.amount.toLocaleString()} {op.currency}
                  </td>
                  <td className="p-3">
                    <Select
                      value={op.stage}
                      onValueChange={(value: OpportunityStage) => {
                        salesService.moveOpportunityStage(
                          session.tenantId,
                          session,
                          op.id,
                          value,
                        );
                        setRefreshKey((current) => current + 1);
                      }}
                    >
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue placeholder="Stage" />
                      </SelectTrigger>
                      <SelectContent>
                        {STAGES.map((stage) => (
                          <SelectItem key={stage} value={stage}>
                            {stage}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </td>
                  <td className="p-3">
                    <Badge variant={op.health === "HIGH_RISK" ? "destructive" : "outline"}>
                      {op.health}
                    </Badge>
                  </td>
                  <td className="p-3 text-muted-foreground">
                    {quotes.filter((item) => item.opportunityId === op.id).length}
                  </td>
                  <td className="p-3">
                    <div className="flex flex-wrap gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={op.stage === "CLOSED_WON" || op.stage === "CLOSED_LOST"}
                        onClick={() => {
                          salesService.closeWonOpportunity(session.tenantId, session, op.id);
                          setRefreshKey((current) => current + 1);
                        }}
                      >
                        Close Won
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={op.stage === "CLOSED_WON" || op.stage === "CLOSED_LOST"}
                        onClick={() => {
                          salesService.closeLostOpportunity(
                            session.tenantId,
                            session,
                            op.id,
                            "Lost to competitor pricing.",
                          );
                          setRefreshKey((current) => current + 1);
                        }}
                      >
                        Close Lost
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </DataTableShell>
      </WorkspacePanel>
    </div>
  );
}
