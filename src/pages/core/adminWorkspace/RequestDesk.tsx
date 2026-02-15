import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { PageHeader } from "@/core/ui/PageHeader";
import { WorkspacePanel } from "@/core/ui/WorkspacePanel";
import { DataTableShell } from "@/core/tools/DataTableShell";
import { FilterBar } from "@/core/tools/FilterBar";
import { FeedbackAlert } from "@/core/tools/FeedbackAlert";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const requests = [
  { id: "REQ-1201", title: "Laptop replacement", dept: "IT", status: "Pending" },
  { id: "REQ-1199", title: "New vendor onboarding", dept: "Procurement", status: "Assigned" },
  { id: "REQ-1194", title: "Marketing budget increase", dept: "Finance", status: "Escalated" },
];

export default function RequestDesk() {
  const [search, setSearch] = useState("");
  const [form, setForm] = useState({ title: "", department: "", details: "" });
  const [selectedRequest, setSelectedRequest] = useState<any>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const clearStatus = () => {
    setStatusMessage(null);
    setErrorMessage(null);
  };

  const filtered = requests.filter((req) =>
    search ? req.title.toLowerCase().includes(search.toLowerCase()) : true,
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Request Intake"
        subtitle="Capture cross-department requests with HOD approvals."
        secondaryActions={
          <Input
            placeholder="Search requests"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="min-w-[220px]"
          />
        }
      />

      <FeedbackAlert message={statusMessage} error={errorMessage} onClear={clearStatus} />

      <WorkspacePanel title="New request" description="Create and submit for approval.">
        <div className="grid gap-3 md:grid-cols-3">
          <Input
            placeholder="Title"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
          />
          <Input
            placeholder="Department"
            value={form.department}
            onChange={(e) => setForm({ ...form, department: e.target.value })}
          />
          <Textarea
            placeholder="Details"
            value={form.details}
            onChange={(e) => setForm({ ...form, details: e.target.value })}
            className="md:col-span-3"
          />
        </div>
        <div className="mt-3 flex justify-end">
          <Button
            onClick={() => {
              try {
                if (!form.title || !form.department) {
                  throw new Error("Missing fields");
                }
                setStatusMessage("Request submitted to intake queue.");
                setForm({ title: "", department: "", details: "" });
              } catch (err) {
                setErrorMessage("Please fill required fields.");
              }
            }}
          >
            Submit
          </Button>
        </div>
      </WorkspacePanel>

      <WorkspacePanel title="Intake queue" description="Newly submitted requests.">
        <FilterBar searchValue={search} onSearchChange={setSearch} />
        <DataTableShell total={filtered.length} page={1} pageSize={10}>
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-xs uppercase text-muted-foreground">
              <tr>
                <th className="p-3 text-left">Request</th>
                <th className="p-3 text-left">Department</th>
                <th className="p-3 text-left">Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((req) => (
                <tr
                  key={req.id}
                  className="cursor-pointer border-t hover:bg-muted/50"
                  onClick={() => setSelectedRequest(req)}
                >
                  <td className="p-3 font-medium">{req.title}</td>
                  <td className="p-3 text-muted-foreground">{req.dept}</td>
                  <td className="p-3 text-muted-foreground">{req.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </DataTableShell>
      </WorkspacePanel>

      <Dialog open={!!selectedRequest} onOpenChange={() => setSelectedRequest(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Request Details</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="grid grid-cols-2 text-sm gap-y-2">
              <span className="text-muted-foreground">Request ID:</span>
              <span className="font-mono font-bold">{selectedRequest?.id}</span>
              <span className="text-muted-foreground">Title:</span>
              <span className="font-semibold">{selectedRequest?.title}</span>
              <span className="text-muted-foreground">Originating Dept:</span>
              <span>{selectedRequest?.dept}</span>
              <span className="text-muted-foreground">Current Status:</span>
              <span className="font-medium text-amber-600">{selectedRequest?.status}</span>
            </div>
            <div className="border-t pt-2 text-xs text-muted-foreground">
              <p>This request is currently in the intake state and awaiting initial HOD vetting before being pushed to FlowGate.</p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
