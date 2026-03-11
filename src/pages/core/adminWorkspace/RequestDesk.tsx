import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { PageHeader } from "@/core/ui/PageHeader";
import { WorkspacePanel } from "@/core/ui/WorkspacePanel";
import { DataTableShell } from "@/core/tools/DataTableShell";
import { FilterBar } from "@/core/tools/FilterBar";
import { FeedbackAlert } from "@/core/tools/FeedbackAlert";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { FileText, ShieldCheck } from "lucide-react";

import { useEffect, useCallback } from "react";
import { useSession } from "@/core/security/session";
import { adminService } from "@/core/services/adminService";

export default function RequestDesk() {
  const session = useSession();
  const [search, setSearch] = useState("");
  const [form, setForm] = useState({ title: "", department: "", details: "" });
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState<any>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const data = await adminService.getRequests(session.tenantId, session);
      setRequests(data);
    } catch (err) {
      console.error("Failed to fetch requests", err);
    } finally {
      setLoading(false);
    }
  }, [session]);

  useEffect(() => {
    refresh();
  }, [refresh]);

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
            onClick={async () => {
              try {
                if (!form.title || !form.department) {
                  throw new Error("Missing fields");
                }
                await adminService.createRequest(session.tenantId, session, {
                  type: "general", // Can be extended
                  title: form.title,
                  description: form.details,
                  metadata: { department: form.department }
                });
                setStatusMessage("Request submitted to intake queue.");
                setForm({ title: "", department: "", details: "" });
                refresh();
              } catch (err) {
                setErrorMessage("Failed to submit request. Please fill required fields.");
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
              {loading ? (
                <tr>
                  <td colSpan={3} className="p-3 text-center text-muted-foreground">Loading...</td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={3} className="p-3 text-center text-muted-foreground">No requests found.</td>
                </tr>
              ) : (
                filtered.map((req) => (
                  <tr
                    key={req.id}
                    className="cursor-pointer border-t hover:bg-muted/50"
                    onClick={() => setSelectedRequest(req)}
                  >
                    <td className="p-3 font-medium">{req.title}</td>
                    <td className="p-3 text-muted-foreground">{req.metadata?.department || "General"}</td>
                    <td className="p-3 text-muted-foreground"><Badge variant="outline">{req.status}</Badge></td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </DataTableShell>
      </WorkspacePanel>

      <Dialog open={!!selectedRequest} onOpenChange={() => setSelectedRequest(null)}>
        <DialogContent className="max-w-3xl p-0 overflow-hidden" aria-describedby="request-detail-description">
          <DialogHeader className="sr-only">
            <DialogTitle>Request Details</DialogTitle>
          </DialogHeader>
          <div id="request-detail-description" className="sr-only">View comprehensive details and routing status of an internal request.</div>
          <div className="grid md:grid-cols-[1fr_2fr]">
            <div className="bg-muted p-6 flex flex-col justify-between">
              <div>
                <FileText className="w-8 h-8 text-primary mb-4" />
                <DialogTitle className="text-xl mb-2">Request Snapshot</DialogTitle>
                <p className="text-sm text-muted-foreground">
                  View and manage cross-department service requests.
                </p>
              </div>
              <div className="bg-primary/5 p-4 rounded-lg mt-8 border border-primary/10">
                <p className="text-xs text-primary font-medium flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4" /> Routing Integrity
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Requests are secured by centralized workflow rules.
                </p>
              </div>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                <div className="grid grid-cols-2 text-sm gap-y-3">
                  <span className="text-muted-foreground">Request ID:</span>
                  <span className="font-mono text-xs truncate max-w-[150px]">{selectedRequest?.id}</span>
                  <span className="text-muted-foreground">Title:</span>
                  <span className="font-semibold">{selectedRequest?.title}</span>
                  <span className="text-muted-foreground">Originating Dept:</span>
                  <span>{selectedRequest?.metadata?.department || "General"}</span>
                  <span className="text-muted-foreground">Current Status:</span>
                  <span><Badge variant="outline">{selectedRequest?.status}</Badge></span>
                </div>
                <div className="border-t pt-4 mt-4">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Intake Status</p>
                  <p className="text-xs text-muted-foreground bg-muted p-3 rounded-md">
                    This request is currently in the intake state and awaiting initial HOD vetting before being pushed to FlowGate.
                  </p>
                </div>
                <div className="flex justify-end pt-4 mt-6 border-t">
                  <Button variant="outline" onClick={() => setSelectedRequest(null)}>Close</Button>
                </div>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
