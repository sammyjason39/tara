import { useCallback, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/core/ui/PageHeader";
import { WorkspacePanel } from "@/core/ui/WorkspacePanel";
import { DataTableShell } from "@/core/tools/DataTableShell";
import { FilterBar } from "@/core/tools/FilterBar";
import { WorkflowRequestCard } from "@/core/tools/WorkflowRequestCard";
import { ApprovalStatusBadge } from "@/core/tools/ApprovalStatusBadge";
import { useSession } from "@/core/security/session";
import { hrWorkstreamService } from "@/core/services/hr/hrWorkstreamService";
import { workflowService } from "@/core/services/hr/workflowService";
import { useBackgroundRefresh } from "@/core/runtime/events/useBackgroundRefresh";

export default function PulseDesk() {
  const session = useSession();
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 10;
  const [version, setVersion] = useState(0);
  const [statusFilter, setStatusFilter] = useState("all");

  const refresh = useCallback(() => setVersion((prev) => prev + 1), []);
  useBackgroundRefresh(refresh, 20000);

  const pulseItems = useMemo(() => {
    const items = hrWorkstreamService.getPulseItems(session.tenantId, session);
    let filtered = items;
    if (statusFilter !== "all") {
      filtered = filtered.filter((item) => item.status.toLowerCase() === statusFilter);
    }
    if (!search) return filtered;
    return filtered.filter((item) => item.title.toLowerCase().includes(search.toLowerCase()));
  }, [session, search, statusFilter, version]);

  const pendingApprovals = useMemo(
    () => workflowService.listRequests(session.tenantId).filter((flow) => flow.status === "PENDING"),
    [session, version],
  );

  const pagedItems = useMemo(() => {
    const start = (page - 1) * pageSize;
    return pulseItems.slice(start, start + pageSize);
  }, [pulseItems, page, pageSize]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="PulseDesk"
        subtitle="Operational command inbox for HR workstreams."
        primaryAction={
          <Button
            onClick={() => {
              workflowService.createRequest(session.tenantId, session, {
                entityType: "LEAVE",
                entityId: session.userId,
                makerDept: session.departmentId,
                destinationDept: "HR",
                notes: "PulseDesk request",
              });
              refresh();
            }}
          >
            Create Request
          </Button>
        }
        secondaryActions={
          <Input
            placeholder="Search workstreams"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="min-w-[200px]"
          />
        }
      />

      <WorkspacePanel title="WorkQueue" description="High urgency items that need immediate action.">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {pulseItems.slice(0, 6).map((item) => (
            <WorkflowRequestCard
              key={item.id}
              title={item.title}
              subtitle={item.source}
              status={item.status}
              urgency={item.urgency}
              owner={item.owner}
              actionLabel={item.nextAction}
              onAction={() => navigate("/core/hr/flowgate")}
            />
          ))}
        </div>
      </WorkspacePanel>

      <WorkspacePanel title="Active Records" description="Live operational stream.">
        <FilterBar
          searchValue={search}
          onSearchChange={setSearch}
          searchPlaceholder="Search pulse items"
          filters={
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <select
                className="h-9 rounded-md border bg-background px-3 text-sm"
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
              >
                <option value="all">All status</option>
                {Array.from(new Set(pulseItems.map((item) => item.status.toLowerCase()))).map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            </div>
          }
          onReset={() => {
            setSearch("");
            setStatusFilter("all");
          }}
        />
        <DataTableShell
          title="Pulse items"
          subtitle="Workflow, compliance, payroll, and attendance signals."
          total={pulseItems.length}
          page={page}
          pageSize={pageSize}
          onPageChange={setPage}
        >
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-xs uppercase text-muted-foreground">
              <tr>
                <th className="p-3 text-left">Item</th>
                <th className="p-3 text-left">Owner</th>
                <th className="p-3 text-left">Urgency</th>
                <th className="p-3 text-left">Status</th>
              </tr>
            </thead>
            <tbody>
              {pagedItems.map((item) => (
                <tr key={item.id} className="border-t">
                  <td className="p-3">
                    <div className="font-medium text-foreground">{item.title}</div>
                    <div className="text-xs text-muted-foreground">{item.source}</div>
                  </td>
                  <td className="p-3 text-sm text-muted-foreground">{item.owner}</td>
                  <td className="p-3">
                    <Badge variant="outline">{item.urgency}</Badge>
                  </td>
                  <td className="p-3">
                    <ApprovalStatusBadge status={item.status.toUpperCase()} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </DataTableShell>
      </WorkspacePanel>

      <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <WorkspacePanel title="Pending Approvals" description="Requests waiting on your department.">
          <div className="space-y-3">
            {pendingApprovals.slice(0, 5).map((flow) => (
              <div key={flow.id} className="flex items-center justify-between rounded-lg border p-3">
                <div>
                  <p className="text-sm font-medium text-foreground">{flow.entityType}</p>
                  <p className="text-xs text-muted-foreground">Dept: {flow.destinationDept}</p>
                </div>
                <ApprovalStatusBadge status={flow.status} />
              </div>
            ))}
          </div>
        </WorkspacePanel>

        <WorkspacePanel title="Insights" description="Operational signals and risk exposure.">
          <div className="space-y-3 text-sm text-muted-foreground">
            <div className="flex items-center justify-between rounded-lg border p-3">
              <span>Total pulse items</span>
              <span className="font-semibold text-foreground">{pulseItems.length}</span>
            </div>
            <div className="flex items-center justify-between rounded-lg border p-3">
              <span>Pending approvals</span>
              <span className="font-semibold text-foreground">{pendingApprovals.length}</span>
            </div>
            <div className="flex items-center justify-between rounded-lg border p-3">
              <span>High urgency items</span>
              <span className="font-semibold text-foreground">
                {pulseItems.filter((item) => item.urgency >= 80).length}
              </span>
            </div>
          </div>
        </WorkspacePanel>
      </div>
    </div>
  );
}
