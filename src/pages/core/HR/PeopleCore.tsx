import { useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageHeader } from "@/core/ui/PageHeader";
import { WorkspacePanel } from "@/core/ui/WorkspacePanel";
import { DataTableShell } from "@/core/tools/DataTableShell";
import { FilterBar } from "@/core/tools/FilterBar";
import { ApprovalStatusBadge } from "@/core/tools/ApprovalStatusBadge";
import { ActivityThread } from "@/core/tools/activity/ActivityThread";
import { FeedbackAlert } from "@/core/tools/FeedbackAlert";
import { useSession } from "@/core/security/session";
import { peopleService } from "@/core/services/hr/peopleService";
import { staffService } from "@/core/services/hr/staffService";
import { workflowService } from "@/core/services/hr/workflowService";

export default function PeopleCore() {
  const session = useSession();
  const params = useParams();
  const employeeId = params.id ?? "";
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [workflowType, setWorkflowType] = useState<"PERFORMANCE" | "PAYROLL" | "CONTRACT" | "TRAINING">("PERFORMANCE");
  const [destinationDept, setDestinationDept] = useState("HR");
  const [notes, setNotes] = useState("");
  const [listSearch, setListSearch] = useState("");
  const [editForm, setEditForm] = useState({
    roleTitle: "",
    departmentId: "",
    location: "",
    status: "active",
  });
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [selectedDetail, setSelectedDetail] = useState<{ type: string; data: any } | null>(null);
  const [actionOpen, setActionOpen] = useState(false);
  const [actionType, setActionType] = useState<"MOVE" | "REMOVE" | "TERMINATE">("MOVE");
  const [actionReason, setActionReason] = useState("");
  const [targetDept, setTargetDept] = useState("HR");

  const clearStatus = () => {
    setStatusMessage(null);
    setErrorMessage(null);
  };

  const record = useMemo(
    () => peopleService.getEmployee360(session.tenantId, employeeId, session),
    [session, employeeId],
  );

  if (!record) {
    return (
      <WorkspacePanel title="Access restricted" description="You do not have access to this profile.">
        <div className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">
          This employee record is outside your authorized scope.
        </div>
      </WorkspacePanel>
    );
  }

  const { employee, attendance, payrollRuns, contracts, trainings, reviews, workflows } = record;
  const filteredAttendance = attendance.filter((entry) =>
    listSearch ? entry.status.toLowerCase().includes(listSearch.toLowerCase()) : true,
  );
  const filteredPayroll = payrollRuns.filter((run) =>
    listSearch ? run.status.toLowerCase().includes(listSearch.toLowerCase()) : true,
  );
  const filteredContracts = contracts.filter((contract) =>
    listSearch ? contract.title.toLowerCase().includes(listSearch.toLowerCase()) : true,
  );
  const filteredReviews = reviews.filter((review) =>
    listSearch ? review.status.toLowerCase().includes(listSearch.toLowerCase()) : true,
  );

  return (
    <div className="space-y-6">
      <FeedbackAlert message={statusMessage} error={errorMessage} onClear={clearStatus} />
      <PageHeader
        title={`PeopleCore - ${employee.fullName}`}
        subtitle={`${employee.roleTitle} - ${employee.departmentId}`}
        primaryAction={<Button onClick={() => setDialogOpen(true)}>Start Workflow</Button>}
        secondaryActions={<Input placeholder="Search within record" className="min-w-[200px]" />}
      />

      <WorkspacePanel title="WorkQueue" description="Actions and escalations for this employee.">
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => setDialogOpen(true)}>Create Request</Button>
          <Button
            variant="outline"
            onClick={() => {
              try {
                workflowService.createRequest(employee.tenantId, session, {
                  entityType: "PERFORMANCE",
                  entityId: employee.id,
                  makerDept: session.departmentId,
                  destinationDept: "ADMIN",
                  notes: "Escalated from PeopleCore",
                });
                setStatusMessage("Employee record escalated to ADMIN.");
              } catch (err) {
                setErrorMessage("Escalation failed.");
              }
            }}
          >
            Escalate
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              try {
                workflowService.createRequest(employee.tenantId, session, {
                  entityType: "PERFORMANCE",
                  entityId: employee.id,
                  makerDept: session.departmentId,
                  destinationDept: "HR",
                  notes: "PeopleCore routing",
                });
                setStatusMessage("Routed to HR FlowGate.");
              } catch (err) {
                setErrorMessage("Routing failed.");
              }
            }}
          >
            Send to FlowGate
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              setEditForm({
                roleTitle: employee.roleTitle,
                departmentId: employee.departmentId,
                location: employee.location,
                status: employee.status,
              });
              setEditOpen(true);
            }}
          >
            Edit Profile
          </Button>
          <Button
            variant="outline"
            className="border-blue-200 text-blue-700 hover:bg-blue-50"
            onClick={() => {
              setActionType("MOVE");
              setActionOpen(true);
            }}
          >
            Move (Transfer)
          </Button>
          <Button
            variant="outline"
            className="border-amber-200 text-amber-700 hover:bg-amber-50"
            onClick={() => {
              setActionType("REMOVE");
              setActionOpen(true);
            }}
          >
            Remove (Deactivate)
          </Button>
          <Button
            variant="destructive"
            onClick={() => {
              setActionType("TERMINATE");
              setActionOpen(true);
            }}
          >
            Terminate
          </Button>
        </div>
      </WorkspacePanel>

      <WorkspacePanel title="Active Records" description="Employee 360 timeline.">
        <FilterBar
          searchPlaceholder="Search records"
          searchValue={listSearch}
          onSearchChange={setListSearch}
          onReset={() => setListSearch("")}
        />
        <Tabs defaultValue="identity">
          <TabsList className="flex flex-wrap">
            <TabsTrigger value="identity">Identity</TabsTrigger>
            <TabsTrigger value="attendance">Attendance</TabsTrigger>
            <TabsTrigger value="payroll">Payroll</TabsTrigger>
            <TabsTrigger value="contracts">Contracts</TabsTrigger>
            <TabsTrigger value="performance">Performance</TabsTrigger>
          </TabsList>

          <TabsContent value="identity">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-lg border p-4 text-sm">
                <p className="font-semibold text-foreground">Employment</p>
                <p className="text-muted-foreground">Employee code: {employee.employeeCode}</p>
                <p className="text-muted-foreground">Location: {employee.location}</p>
                <p className="text-muted-foreground">Hire date: {employee.hireDate}</p>
              </div>
              <div className="rounded-lg border p-4 text-sm">
                <p className="font-semibold text-foreground">Compensation</p>
                <p className="text-muted-foreground">Base salary: {employee.baseSalary}</p>
                <p className="text-muted-foreground">Hourly rate: {employee.hourlyRate}</p>
                <p className="text-muted-foreground">Status: {employee.status}</p>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="attendance">
            <DataTableShell total={filteredAttendance.length} page={1} pageSize={10}>
              <table className="w-full text-sm">
                <thead className="bg-muted/40 text-xs uppercase text-muted-foreground">
                  <tr>
                    <th className="p-3 text-left">Date</th>
                    <th className="p-3 text-left">Status</th>
                    <th className="p-3 text-left">Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAttendance.map((entry) => (
                    <tr
                      key={entry.id}
                      className="border-t cursor-pointer hover:bg-muted/50"
                      onClick={() => setSelectedDetail({ type: "Attendance", data: entry })}
                    >
                      <td className="p-3">{entry.date}</td>
                      <td className="p-3">{entry.status}</td>
                      <td className="p-3 text-muted-foreground">{(entry as any).notes ?? "--"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </DataTableShell>
          </TabsContent>

          <TabsContent value="payroll">
            <DataTableShell total={filteredPayroll.length} page={1} pageSize={10}>
              <table className="w-full text-sm">
                <thead className="bg-muted/40 text-xs uppercase text-muted-foreground">
                  <tr>
                    <th className="p-3 text-left">Period</th>
                    <th className="p-3 text-left">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPayroll.map((run) => (
                    <tr
                      key={run.id}
                      className="border-t cursor-pointer hover:bg-muted/50"
                      onClick={() => setSelectedDetail({ type: "Payroll Period", data: run })}
                    >
                      <td className="p-3">{run.periodStart} - {run.periodEnd}</td>
                      <td className="p-3">{run.status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </DataTableShell>
          </TabsContent>

          <TabsContent value="contracts">
            <DataTableShell total={filteredContracts.length} page={1} pageSize={10}>
              <table className="w-full text-sm">
                <thead className="bg-muted/40 text-xs uppercase text-muted-foreground">
                  <tr>
                    <th className="p-3 text-left">Contract</th>
                    <th className="p-3 text-left">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredContracts.map((contract) => (
                    <tr
                      key={contract.id}
                      className="border-t cursor-pointer hover:bg-muted/50"
                      onClick={() => setSelectedDetail({ type: "Contract", data: contract })}
                    >
                      <td className="p-3">{contract.title}</td>
                      <td className="p-3">{contract.status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </DataTableShell>
          </TabsContent>

          <TabsContent value="performance">
            <DataTableShell total={filteredReviews.length} page={1} pageSize={10}>
              <table className="w-full text-sm">
                <thead className="bg-muted/40 text-xs uppercase text-muted-foreground">
                  <tr>
                    <th className="p-3 text-left">Cycle</th>
                    <th className="p-3 text-left">Score</th>
                    <th className="p-3 text-left">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredReviews.map((review) => (
                    <tr
                      key={review.id}
                      className="border-t cursor-pointer hover:bg-muted/50"
                      onClick={() => setSelectedDetail({ type: "Performance Review", data: review })}
                    >
                      <td className="p-3">{review.cycleId}</td>
                      <td className="p-3">{review.score ?? "-"}</td>
                      <td className="p-3">{review.status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </DataTableShell>
          </TabsContent>
        </Tabs>
      </WorkspacePanel>

      <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <WorkspacePanel title="Pending Approvals" description="Workflow requests tied to this employee.">
          <div className="space-y-3">
            {workflows.map((flow) => (
              <div key={flow.id} className="flex items-center justify-between rounded-lg border p-3">
                <div>
                  <p className="text-sm font-medium text-foreground">{flow.entityType}</p>
                  <p className="text-xs text-muted-foreground">Cycle {flow.cycle}</p>
                </div>
                <ApprovalStatusBadge status={flow.status} />
              </div>
            ))}
          </div>
        </WorkspacePanel>

        <WorkspacePanel title="Insights" description="Performance and compliance signals.">
          <div className="space-y-3 text-sm text-muted-foreground">
            <div className="flex items-center justify-between rounded-lg border p-3">
              <span>Training assignments</span>
              <span className="font-semibold text-foreground">{trainings.length}</span>
            </div>
            <div className="flex items-center justify-between rounded-lg border p-3">
              <span>Open contracts</span>
              <span className="font-semibold text-foreground">{contracts.length}</span>
            </div>
          </div>
        </WorkspacePanel>
      </div>

      <WorkspacePanel title="Activity Stream" description="Comments, mentions, and audit context.">
        <ActivityThread
          tenantId={session.tenantId}
          entityType="employee"
          entityId={employee.id}
          actorId={session.userId}
        />
      </WorkspacePanel>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Create Workflow Request</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Select value={workflowType} onValueChange={(value) => setWorkflowType(value as typeof workflowType)}>
              <SelectTrigger>
                <SelectValue placeholder="Request type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="PERFORMANCE">Performance</SelectItem>
                <SelectItem value="PAYROLL">Payroll</SelectItem>
                <SelectItem value="CONTRACT">Contract</SelectItem>
                <SelectItem value="TRAINING">Training</SelectItem>
              </SelectContent>
            </Select>
            <Select value={destinationDept} onValueChange={setDestinationDept}>
              <SelectTrigger>
                <SelectValue placeholder="Destination dept" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="HR">HR</SelectItem>
                <SelectItem value="FINANCE">Finance</SelectItem>
                <SelectItem value="LEGAL">Legal</SelectItem>
                <SelectItem value="OPERATIONS">Operations</SelectItem>
                <SelectItem value="ADMIN">Admin</SelectItem>
              </SelectContent>
            </Select>
            <Textarea
              placeholder="Notes for approvers"
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
            />
            <Button
              onClick={() => {
                try {
                  workflowService.createRequest(session.tenantId, session, {
                    entityType: workflowType,
                    entityId: employee.id,
                    makerDept: session.departmentId,
                    destinationDept,
                    notes,
                  });
                  setStatusMessage(`Workflow request for ${workflowType} initialized.`);
                  setNotes("");
                  setDialogOpen(false);
                } catch (err) {
                  setErrorMessage("Failed to create workflow request.");
                }
              }}
            >
              Send to FlowGate
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Sheet open={editOpen} onOpenChange={setEditOpen}>
        <SheetContent className="w-full sm:max-w-lg">
          <SheetHeader>
            <SheetTitle>Edit Employee Profile</SheetTitle>
          </SheetHeader>
          <div className="mt-4 space-y-3">
            <Input
              placeholder="Role title"
              value={editForm.roleTitle}
              onChange={(event) => setEditForm((prev) => ({ ...prev, roleTitle: event.target.value }))}
            />
            <Input
              placeholder="Department ID"
              value={editForm.departmentId}
              onChange={(event) => setEditForm((prev) => ({ ...prev, departmentId: event.target.value }))}
            />
            <Input
              placeholder="Location"
              value={editForm.location}
              onChange={(event) => setEditForm((prev) => ({ ...prev, location: event.target.value }))}
            />
            <Select
              value={editForm.status}
              onValueChange={(value) => setEditForm((prev) => ({ ...prev, status: value }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="on_leave">On leave</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
                <SelectItem value="terminated">Terminated</SelectItem>
              </SelectContent>
            </Select>
            <Button
              onClick={() => {
                try {
                  staffService.updateEmployee(session.tenantId, session, employee.id, {
                    roleTitle: editForm.roleTitle || employee.roleTitle,
                    departmentId: editForm.departmentId || employee.departmentId,
                    location: editForm.location || employee.location,
                    status: editForm.status as typeof employee.status,
                  });
                  setEditOpen(false);
                  setStatusMessage("Employee profile updated successfully.");
                } catch (err) {
                  setErrorMessage("Failed to update employee profile.");
                }
              }}
            >
              Save Changes
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      <Dialog open={!!selectedDetail} onOpenChange={() => setSelectedDetail(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{selectedDetail?.type} Detail</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="grid grid-cols-2 text-sm gap-y-2">
              <span className="text-muted-foreground">Record ID:</span>
              <span className="font-mono">{selectedDetail?.data.id}</span>
              <span className="text-muted-foreground">Status:</span>
              <span><ApprovalStatusBadge status={selectedDetail?.data.status || "UNKNOWN"} /></span>
              {selectedDetail?.type === "Performance Review" && (
                <>
                  <span className="text-muted-foreground">Cycle:</span>
                  <span>{selectedDetail?.data.cycleId}</span>
                  <span className="text-muted-foreground">Score:</span>
                  <span className="font-bold">{selectedDetail?.data.score ?? "Not yet scored"}</span>
                </>
              )}
              {selectedDetail?.type === "Attendance" && (
                <>
                  <span className="text-muted-foreground">Date:</span>
                  <span>{selectedDetail?.data.date}</span>
                </>
              )}
            </div>
            <div className="border-t pt-2 text-xs text-muted-foreground">
              <p>This is a historical record from the PeopleCore data layer. For detailed audit logs, check the Activity Stream.</p>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={actionOpen} onOpenChange={setActionOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Personnel Action: {actionType}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            {actionType === "MOVE" && (
              <div className="space-y-2">
                <label className="text-sm font-medium">Target Department</label>
                <Select value={targetDept} onValueChange={setTargetDept}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select department" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="HR">HR</SelectItem>
                    <SelectItem value="FINANCE">Finance</SelectItem>
                    <SelectItem value="OPERATIONS">Operations</SelectItem>
                    <SelectItem value="SALES">Sales</SelectItem>
                    <SelectItem value="IT">IT</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="space-y-2">
              <label className="text-sm font-medium">Reason for Action</label>
              <Textarea
                placeholder="Required notes for audit and approval chain..."
                value={actionReason}
                onChange={(e) => setActionReason(e.target.value)}
              />
            </div>
            <div className="border-t pt-4">
              <Button
                className="w-full"
                variant={actionType === "TERMINATE" ? "destructive" : "default"}
                onClick={() => {
                  try {
                    if (!actionReason) {
                      setErrorMessage("Reason is required for personnel actions.");
                      return;
                    }
                    if (actionType === "MOVE") {
                      (staffService as any).requestTransfer(employee.tenantId, session, employee.id, targetDept, actionReason);
                      setStatusMessage(`Transfer request for ${employee.fullName} to ${targetDept} initiated.`);
                    } else if (actionType === "REMOVE") {
                      staffService.updateEmployee(employee.tenantId, session, employee.id, { status: "inactive" });
                      setStatusMessage(`${employee.fullName} record deactivated (inactive).`);
                    } else if (actionType === "TERMINATE") {
                      staffService.requestTermination(employee.tenantId, session, employee.id, actionReason);
                      setStatusMessage(`Termination workflow triggered for ${employee.fullName}.`);
                    }
                    setActionOpen(false);
                    setActionReason("");
                  } catch (err: any) {
                    setErrorMessage(err.message || "Personnel action failed.");
                  }
                }}
              >
                Submit for Approval
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}


