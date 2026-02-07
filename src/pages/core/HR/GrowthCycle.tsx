import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { PageHeader } from "@/core/ui/PageHeader";
import { WorkspacePanel } from "@/core/ui/WorkspacePanel";
import { DataTableShell } from "@/core/tools/DataTableShell";
import { FilterBar } from "@/core/tools/FilterBar";
import { useSession } from "@/core/security/session";
import { performanceService } from "@/core/services/hr/performanceService";

export default function GrowthCycle() {
  const session = useSession();
  const [version, setVersion] = useState(0);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [actionOpen, setActionOpen] = useState(false);
  const [cycleName, setCycleName] = useState("Q1 Review");
  const [cycleStart, setCycleStart] = useState("2026-01-01");
  const [cycleEnd, setCycleEnd] = useState("2026-03-31");
  const [cycleDue, setCycleDue] = useState("2026-04-10");
  const [selectedCycle, setSelectedCycle] = useState("");
  const [notes, setNotes] = useState("");
  const [search, setSearch] = useState("");
  const overview = useMemo(() => performanceService.getCycleOverview(session.tenantId, session), [session, version]);
  const filteredCycles = overview.cycles.filter((cycle) =>
    search ? cycle.name.toLowerCase().includes(search.toLowerCase()) : true,
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="GrowthCycle"
        subtitle="Performance OS for reviews, calibration, and promotion readiness."
        primaryAction={
          <Button
            onClick={() => {
              setDialogOpen(true);
            }}
          >
            Create Review Cycle
          </Button>
        }
        secondaryActions={<Input placeholder="Search reviews" className="min-w-[200px]" value={search} onChange={(e) => setSearch(e.target.value)} />}
      />

      <WorkspacePanel title="WorkQueue" description="Review actions and calibration.">
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            onClick={() => {
              setActionOpen(true);
              setSelectedCycle(overview.cycles[0]?.id ?? "");
            }}
          >
            Launch Cycle
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              const target = overview.cycles[0];
              if (target) {
                performanceService.runCalibration(session.tenantId, session, target.id);
                setVersion((prev) => prev + 1);
              }
            }}
          >
            Run Calibration
          </Button>
        </div>
      </WorkspacePanel>

      <WorkspacePanel title="Active Records" description="Review cycles in progress.">
        <FilterBar searchValue={search} onSearchChange={setSearch} />
        <DataTableShell total={filteredCycles.length} page={1} pageSize={10}>
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-xs uppercase text-muted-foreground">
              <tr>
                <th className="p-3 text-left">Cycle</th>
                <th className="p-3 text-left">Status</th>
                <th className="p-3 text-left">Due</th>
              </tr>
            </thead>
            <tbody>
              {filteredCycles.map((cycle) => (
                <tr key={cycle.id} className="border-t">
                  <td className="p-3">{cycle.name}</td>
                  <td className="p-3 text-muted-foreground">{cycle.status}</td>
                  <td className="p-3 text-muted-foreground">{cycle.dueDate}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </DataTableShell>
      </WorkspacePanel>

      <div className="grid gap-6 lg:grid-cols-[1fr_0.8fr]">
        <WorkspacePanel title="Pending Approvals" description="Reviews awaiting approval.">
          <div className="space-y-3 text-sm text-muted-foreground">
            {overview.reviews.slice(0, 4).map((review) => (
              <div key={review.id} className="flex items-center justify-between rounded-lg border p-3">
                <span>{review.employeeId}</span>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    performanceService.requestReviewApproval(session.tenantId, session, review.id, review.employeeId);
                    setVersion((prev) => prev + 1);
                  }}
                >
                  Send to FlowGate
                </Button>
              </div>
            ))}
          </div>
        </WorkspacePanel>

        <WorkspacePanel title="Insights" description="Performance signals.">
          <div className="space-y-3 text-sm text-muted-foreground">
            <div className="flex items-center justify-between rounded-lg border p-3">
              <span>Active cycles</span>
              <span className="font-semibold text-foreground">{overview.activeCycles}</span>
            </div>
            <div className="flex items-center justify-between rounded-lg border p-3">
              <span>Pending reviews</span>
              <span className="font-semibold text-foreground">{overview.pendingReviews}</span>
            </div>
          </div>
        </WorkspacePanel>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Create Review Cycle</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Input value={cycleName} onChange={(e) => setCycleName(e.target.value)} />
            <Input value={cycleStart} onChange={(e) => setCycleStart(e.target.value)} />
            <Input value={cycleEnd} onChange={(e) => setCycleEnd(e.target.value)} />
            <Input value={cycleDue} onChange={(e) => setCycleDue(e.target.value)} />
            <Button
              onClick={() => {
                performanceService.createReviewCycle(session.tenantId, session, {
                  name: cycleName,
                  status: "draft",
                  startDate: cycleStart,
                  endDate: cycleEnd,
                  dueDate: cycleDue,
                });
                setDialogOpen(false);
                setVersion((prev) => prev + 1);
              }}
            >
              Create Cycle
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={actionOpen} onOpenChange={setActionOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Launch Review Cycle</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Select value={selectedCycle} onValueChange={setSelectedCycle}>
              <SelectTrigger>
                <SelectValue placeholder="Select cycle" />
              </SelectTrigger>
              <SelectContent>
                {overview.cycles.map((cycle) => (
                  <SelectItem key={cycle.id} value={cycle.id}>
                    {cycle.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Launch notes" />
            <Button
              onClick={() => {
                if (selectedCycle) {
                  performanceService.launchCycle(session.tenantId, session, selectedCycle);
                }
                setNotes("");
                setActionOpen(false);
                setVersion((prev) => prev + 1);
              }}
            >
              Launch
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
