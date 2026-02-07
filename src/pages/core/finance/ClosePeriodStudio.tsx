// src/pages/core/finance/ClosePeriodStudio.tsx
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { PageHeader } from "@/core/ui/PageHeader";
import { WorkspacePanel } from "@/core/ui/WorkspacePanel";
import { DataTableShell } from "@/core/tools/DataTableShell";
import { FilterBar } from "@/core/tools/FilterBar";
import { ApprovalStatusBadge } from "@/core/tools/ApprovalStatusBadge";
import { useSession } from "@/core/security/session";
import { financeService } from "@/core/services/finance/financeService";
import { workflowService } from "@/core/services/hr/workflowService";
import { logService } from "@/core/services/finance/logService";

type Period = {
  id: string;
  startDate: string;
  endDate: string;
  status: "OPEN" | "CLOSING" | "CLOSED" | "FAILED";
  lockedBy?: string;
  approvalLevel?: number;
};

export default function ClosePeriodStudio() {
  const session = useSession();
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState<"open" | "closing" | "closed" | "failed">(
    "open",
  );
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState<Period | null>(null);

  const periods: Period[] = useMemo(
    () => financeService.listPeriods(session.tenantId),
    [session],
  );

  const filteredPeriods = periods.filter(
    (p) =>
      (!search || `${p.startDate} - ${p.endDate}`.includes(search)) &&
      (tab === "open"
        ? p.status === "OPEN"
        : tab === "closing"
          ? p.status === "CLOSING"
          : tab === "closed"
            ? p.status === "CLOSED"
            : tab === "failed"
              ? p.status === "FAILED"
              : true),
  );

  const handleClosePeriod = (period: Period) => {
    financeService.lockPeriod(session.tenantId, period.id);
    workflowService.routePeriodApproval(session.tenantId, period); // multi-level approval workflow
    logService.log(
      session.tenantId,
      session.userId,
      `Initiated close for period ${period.id}`,
    );
    setDialogOpen(false);
  };

  const handleForceClose = (period: Period) => {
    financeService.forceClosePeriod(session.tenantId, period.id);
    logService.log(
      session.tenantId,
      session.userId,
      `Force-closed period ${period.id}`,
    );
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Close Period Studio"
        subtitle="Manage accounting period closing, approvals, and reconciliation."
        primaryAction={
          <Button onClick={() => setDialogOpen(true)}>Close Period</Button>
        }
        secondaryActions={
          <Input
            placeholder="Search period"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="min-w-[220px]"
          />
        }
      />

      <WorkspacePanel
        title="Accounting Periods"
        description="View and manage period status."
      >
        <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)}>
          <TabsList>
            <TabsTrigger value="open">Open</TabsTrigger>
            <TabsTrigger value="closing">Closing</TabsTrigger>
            <TabsTrigger value="closed">Closed</TabsTrigger>
            <TabsTrigger value="failed">Failed</TabsTrigger>
          </TabsList>

          <TabsContent value="open" className="mt-4">
            <DataTableShell
              total={filteredPeriods.length}
              page={1}
              pageSize={10}
            >
              <table className="w-full text-sm">
                <thead className="bg-muted/40 text-xs uppercase text-muted-foreground">
                  <tr>
                    <th className="p-3 text-left">Period</th>
                    <th className="p-3 text-left">Status</th>
                    <th className="p-3 text-left">Locked By</th>
                    <th className="p-3 text-left">Approval Level</th>
                    <th className="p-3 text-left">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPeriods.map((p) => (
                    <tr key={p.id} className="border-t">
                      <td className="p-3 font-medium">
                        {p.startDate} - {p.endDate}
                      </td>
                      <td className="p-3">
                        <ApprovalStatusBadge status={p.status} />
                      </td>
                      <td className="p-3">{p.lockedBy || "-"}</td>
                      <td className="p-3">{p.approvalLevel || 0}</td>
                      <td className="p-3 space-x-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setSelectedPeriod(p);
                            setDialogOpen(true);
                          }}
                        >
                          Close
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleForceClose(p)}
                        >
                          Force Close
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </DataTableShell>
          </TabsContent>

          {["closing", "closed", "failed"].map((t) => (
            <TabsContent key={t} value={t} className="mt-4">
              <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
                {t.charAt(0).toUpperCase() + t.slice(1)} periods will appear
                here. Integration with Ledger, PayFlow, Treasury ready.
              </div>
            </TabsContent>
          ))}
        </Tabs>
      </WorkspacePanel>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Close Period</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p>
              Are you sure you want to close the period{" "}
              <strong>
                {selectedPeriod?.startDate} - {selectedPeriod?.endDate}
              </strong>
              ?
            </p>
            <p>This will lock all transactions and route for approval.</p>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={() =>
                  selectedPeriod && handleClosePeriod(selectedPeriod)
                }
              >
                Confirm & Route
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
