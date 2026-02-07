import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PageHeader } from "@/core/ui/PageHeader";
import { WorkspacePanel } from "@/core/ui/WorkspacePanel";
import { DataTableShell } from "@/core/tools/DataTableShell";
import { FilterBar } from "@/core/tools/FilterBar";
import { useSession } from "@/core/security/session";
import { recruitmentService } from "@/core/services/hr/recruitmentService";

export default function TalentFlow() {
  const session = useSession();
  const [version, setVersion] = useState(0);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [actionOpen, setActionOpen] = useState(false);
  const [requisitionTitle, setRequisitionTitle] = useState("Operations Lead");
  const [openings, setOpenings] = useState("1");
  const [selectedCandidate, setSelectedCandidate] = useState("");
  const [notes, setNotes] = useState("");
  const [search, setSearch] = useState("");
  const candidates = useMemo(
    () => recruitmentService.listCandidates(session.tenantId, session),
    [session, version],
  );
  const stages = useMemo(() => recruitmentService.getPipelineStages(), []);
  const filteredCandidates = candidates.filter((candidate) =>
    search ? candidate.name.toLowerCase().includes(search.toLowerCase()) : true,
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="TalentFlow"
        subtitle="ATS pipeline with FlowGate approval routing."
        primaryAction={
          <Button
            onClick={() => {
              setDialogOpen(true);
            }}
          >
            Create Requisition
          </Button>
        }
        secondaryActions={<Input placeholder="Search candidates" className="min-w-[200px]" value={search} onChange={(e) => setSearch(e.target.value)} />}
      />

      <WorkspacePanel title="WorkQueue" description="Recruitment actions.">
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            onClick={() => {
              const target = candidates[0];
              if (target) {
                recruitmentService.routeCandidate(session.tenantId, session, target.id);
                setVersion((prev) => prev + 1);
              }
            }}
          >
            Send to FlowGate
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              setSelectedCandidate(candidates[0]?.id ?? "");
              setActionOpen(true);
            }}
          >
            Schedule Interview
          </Button>
        </div>
      </WorkspacePanel>

      <WorkspacePanel title="Active Records" description="Candidate pipeline.">
        <FilterBar searchValue={search} onSearchChange={setSearch} />
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {stages.map((stage) => (
            <div key={stage} className="rounded-lg border bg-card p-3">
              <p className="text-sm font-semibold text-foreground capitalize">{stage}</p>
              <div className="mt-3 space-y-2">
                {filteredCandidates
                  .filter((candidate) => candidate.stage === stage)
                  .map((candidate) => (
                    <div key={candidate.id} className="rounded-md border p-2 text-xs">
                      <p className="text-sm font-medium text-foreground">{candidate.name}</p>
                      <p className="text-muted-foreground">{candidate.role}</p>
                    </div>
                  ))}
              </div>
            </div>
          ))}
        </div>
      </WorkspacePanel>

      <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <WorkspacePanel title="Pending Approvals" description="Requisitions awaiting approval.">
          <DataTableShell total={candidates.length} page={1} pageSize={5}>
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="p-3 text-left">Candidate</th>
                  <th className="p-3 text-left">Role</th>
                  <th className="p-3 text-left">Stage</th>
                </tr>
              </thead>
              <tbody>
                {filteredCandidates.slice(0, 5).map((candidate) => (
                  <tr key={candidate.id} className="border-t">
                    <td className="p-3">{candidate.name}</td>
                    <td className="p-3 text-muted-foreground">{candidate.role}</td>
                    <td className="p-3 text-muted-foreground capitalize">{candidate.stage}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </DataTableShell>
        </WorkspacePanel>

        <WorkspacePanel title="Insights" description="Recruitment flow analytics.">
          <div className="space-y-3 text-sm text-muted-foreground">
            <div className="flex items-center justify-between rounded-lg border p-3">
              <span>Total candidates</span>
              <span className="font-semibold text-foreground">{candidates.length}</span>
            </div>
            <div className="flex items-center justify-between rounded-lg border p-3">
              <span>Offers in flight</span>
              <span className="font-semibold text-foreground">
                {candidates.filter((candidate) => candidate.stage === "offer").length}
              </span>
            </div>
          </div>
        </WorkspacePanel>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Create Requisition</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Input value={requisitionTitle} onChange={(e) => setRequisitionTitle(e.target.value)} />
            <Input value={openings} onChange={(e) => setOpenings(e.target.value)} />
            <Button
              onClick={() => {
                recruitmentService.createRequisition(session.tenantId, session, {
                  title: requisitionTitle,
                  departmentId: session.departmentId,
                  status: "open",
                  openings: Number(openings || "1"),
                });
                setDialogOpen(false);
                setVersion((prev) => prev + 1);
              }}
            >
              Submit for Approval
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={actionOpen} onOpenChange={setActionOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Schedule Interview</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Select value={selectedCandidate} onValueChange={setSelectedCandidate}>
              <SelectTrigger>
                <SelectValue placeholder="Select candidate" />
              </SelectTrigger>
              <SelectContent>
                {candidates.map((candidate) => (
                  <SelectItem key={candidate.id} value={candidate.id}>
                    {candidate.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Interview notes" />
            <Button
              onClick={() => {
                if (selectedCandidate) {
                  recruitmentService.scheduleInterview(session.tenantId, session, selectedCandidate, notes);
                }
                setNotes("");
                setActionOpen(false);
              }}
            >
              Confirm
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
