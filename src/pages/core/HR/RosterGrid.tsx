import { useCallback, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { PageHeader } from "@/core/ui/PageHeader";
import { WorkspacePanel } from "@/core/ui/WorkspacePanel";
import { DataTableShell } from "@/core/tools/DataTableShell";
import { FilterBar } from "@/core/tools/FilterBar";
import { useSession } from "@/core/security/session";
import { staffService } from "@/core/services/hr/staffService";
import { trainingService } from "@/core/services/hr/trainingService";
import { useBackgroundRefresh } from "@/core/runtime/events/useBackgroundRefresh";

export default function RosterGrid() {
  const session = useSession();
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [department, setDepartment] = useState<string>("all");
  const [status, setStatus] = useState<string>("all");
  const [page, setPage] = useState(1);
  const [roleTitle, setRoleTitle] = useState<string>("all");
  const [version, setVersion] = useState(0);
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [actionOpen, setActionOpen] = useState(false);
  const [actionType, setActionType] = useState<"training" | "review" | "payroll" | "import">("training");
  const [actionEmployeeId, setActionEmployeeId] = useState("");
  const [actionProgramId, setActionProgramId] = useState("");
  const [actionNotes, setActionNotes] = useState("");
  const [importSource, setImportSource] = useState("CSV upload");
  const [editEmployeeId, setEditEmployeeId] = useState<string | null>(null);
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    departmentId: "",
    roleTitle: "",
    location: "",
    status: "active",
    employmentType: "full_time",
    baseSalary: "0",
  });
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const refresh = useCallback(() => setVersion((prev) => prev + 1), []);
  useBackgroundRefresh(refresh, 20000);

  const departments = useMemo(() => staffService.listDepartments(session.tenantId, session), [session]);
  const statusOptions = useMemo(() => staffService.getStatusOptions(), []);
  const roleTitles = useMemo(() => staffService.listRoleTitles(session.tenantId, session), [session]);
  const programs = useMemo(() => trainingService.listPrograms(session.tenantId, session), [session]);

  const staff = useMemo(() => {
    return staffService.listStaff(
      session.tenantId,
      session,
      { search, departmentId: department, status: status as "all", roleTitle },
      { page, pageSize: 10 },
    );
  }, [session, search, department, status, roleTitle, page, version]);

  const selectedEmployee = useMemo(
    () => staff.items.find((emp) => emp.id === editEmployeeId) ?? null,
    [staff.items, editEmployeeId],
  );

  const resetForm = () =>
    setForm({
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
      departmentId: departments[0]?.id ?? "",
      roleTitle: roleTitles[0] ?? "Staff",
      location: "HQ",
      status: "active",
      employmentType: "full_time",
      baseSalary: "0",
    });

  return (
    <div className="space-y-6">
      {statusMessage && (
        <div className="rounded-lg bg-emerald-50 border border-emerald-100 p-3 text-emerald-900 text-sm animate-in fade-in slide-in-from-top-1">
          {statusMessage}
        </div>
      )}
      {errorMessage && (
        <div className="rounded-lg bg-rose-50 border border-rose-100 p-3 text-rose-900 text-sm">
          {errorMessage}
        </div>
      )}
      <PageHeader
        title="RosterGrid"
        subtitle="Enterprise workforce directory with instant search and bulk actions."
        primaryAction={<Button onClick={() => {
          resetForm();
          setCreateOpen(true);
        }}>New Employee</Button>}
        secondaryActions={
          <Input
            placeholder="Search people, role, department"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="min-w-[220px]"
          />
        }
      />

      <WorkspacePanel title="WorkQueue" description="Bulk actions for operational HR tasks.">
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            onClick={() => {
              setActionType("training");
              setActionEmployeeId(staff.items[0]?.id ?? "");
              setActionProgramId(programs[0]?.id ?? "");
              setActionOpen(true);
            }}
          >
            Assign Training
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              setActionType("review");
              setActionEmployeeId(staff.items[0]?.id ?? "");
              setActionOpen(true);
            }}
          >
            Request Review
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              setActionType("payroll");
              setActionEmployeeId(staff.items[0]?.id ?? "");
              setActionOpen(true);
            }}
          >
            Open Payroll Case
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              setActionType("import");
              setActionOpen(true);
            }}
          >
            Import Staff CSV
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              staffService.exportStaff(session.tenantId, session);
              setStatusMessage("Staff directory exported to CSV.");
              setTimeout(() => setStatusMessage(null), 3000);
            }}
          >
            Export Report
          </Button>
        </div>
      </WorkspacePanel>

      <WorkspacePanel title="Active Records" description="Live staff directory.">
        <FilterBar
          searchPlaceholder="Search staff"
          searchValue={search}
          onSearchChange={setSearch}
          filters={
            <div className="flex flex-wrap items-center gap-2">
              <Select value={department} onValueChange={setDepartment}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Department" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All departments</SelectItem>
                  {departments.map((dept) => (
                    <SelectItem key={dept.id} value={dept.id}>
                      {dept.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All status</SelectItem>
                  {statusOptions.map((option) => (
                    <SelectItem key={option} value={option}>
                      {option.replace("_", " ")}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={roleTitle} onValueChange={setRoleTitle}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Role title" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All roles</SelectItem>
                  {roleTitles.map((title) => (
                    <SelectItem key={title} value={title}>
                      {title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          }
          onReset={() => {
            setSearch("");
            setDepartment("all");
            setStatus("all");
            setRoleTitle("all");
          }}
        />

        <DataTableShell
          title="Staff directory"
          subtitle="Click a row to open PeopleCore."
          total={staff.total}
          page={staff.page}
          pageSize={staff.pageSize}
          onPageChange={setPage}
        >
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-xs uppercase text-muted-foreground">
              <tr>
                <th className="p-3 text-left">Employee</th>
                <th className="p-3 text-left">Role</th>
                <th className="p-3 text-left">Department</th>
                <th className="p-3 text-left">Status</th>
                <th className="p-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {staff.items.map((employee) => (
                <tr
                  key={employee.id}
                  className="border-t cursor-pointer hover:bg-muted/30"
                  onClick={() => navigate(`/core/hr/people/${employee.id}`)}
                >
                  <td className="p-3">
                    <div className="font-medium text-foreground">{employee.fullName}</div>
                    <div className="text-xs text-muted-foreground">{employee.email}</div>
                  </td>
                  <td className="p-3 text-sm text-muted-foreground">{employee.roleTitle}</td>
                  <td className="p-3 text-sm text-muted-foreground">{employee.departmentId}</td>
                  <td className="p-3 text-sm text-muted-foreground">{employee.status}</td>
                  <td className="p-3 text-right">
                    <div onClick={(event) => event.stopPropagation()}>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button size="sm" variant="outline">Actions</Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => navigate(`/core/hr/people/${employee.id}`)}>
                            Open PeopleCore
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => {
                              setEditEmployeeId(employee.id);
                              setForm({
                                firstName: employee.firstName,
                                lastName: employee.lastName,
                                email: employee.email,
                                phone: employee.phone ?? "",
                                departmentId: employee.departmentId,
                                roleTitle: employee.roleTitle,
                                location: employee.location,
                                status: employee.status,
                                employmentType: employee.employmentType,
                                baseSalary: String(employee.baseSalary ?? 0),
                              });
                              setEditOpen(true);
                            }}
                          >
                            Edit Profile
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => {
                              staffService.requestTermination(session.tenantId, session, employee.id, "RosterGrid request");
                              setStatusMessage(`Termination workflow initiated for ${employee.fullName}.`);
                              setTimeout(() => setStatusMessage(null), 4000);
                              refresh();
                            }}
                          >
                            Request Termination
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </DataTableShell>
      </WorkspacePanel>

      <div className="grid gap-6 lg:grid-cols-[1fr_0.7fr]">
        <WorkspacePanel title="Pending Approvals" description="Open workflow items tied to workforce.">
          <div className="space-y-3 text-sm text-muted-foreground">
            {staff.items.slice(0, 4).map((employee) => (
              <div key={employee.id} className="flex items-center justify-between rounded-lg border p-3">
                <span>{employee.fullName}</span>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    staffService.requestPerformanceReview(session.tenantId, session, employee.id);
                    setStatusMessage(`Performance review requested for ${employee.fullName}.`);
                    setTimeout(() => setStatusMessage(null), 3000);
                    refresh();
                  }}
                >
                  Send to FlowGate
                </Button>
              </div>
            ))}
          </div>
        </WorkspacePanel>

        <WorkspacePanel title="Insights" description="Live workforce status snapshot.">
          <div className="space-y-3 text-sm text-muted-foreground">
            <div className="flex items-center justify-between rounded-lg border p-3">
              <span>Total staff</span>
              <span className="font-semibold text-foreground">{staff.total}</span>
            </div>
            <div className="flex items-center justify-between rounded-lg border p-3">
              <span>Active</span>
              <span className="font-semibold text-foreground">
                {staff.items.filter((item) => item.status === "active").length}
              </span>
            </div>
          </div>
        </WorkspacePanel>
      </div>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Create Employee</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3 md:grid-cols-2">
            <Input placeholder="First name" value={form.firstName} onChange={(e) => setForm((prev) => ({ ...prev, firstName: e.target.value }))} />
            <Input placeholder="Last name" value={form.lastName} onChange={(e) => setForm((prev) => ({ ...prev, lastName: e.target.value }))} />
            <Input placeholder="Email" value={form.email} onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))} />
            <Input placeholder="Phone" value={form.phone} onChange={(e) => setForm((prev) => ({ ...prev, phone: e.target.value }))} />
            <Select value={form.departmentId} onValueChange={(value) => setForm((prev) => ({ ...prev, departmentId: value }))}>
              <SelectTrigger>
                <SelectValue placeholder="Department" />
              </SelectTrigger>
              <SelectContent>
                {departments.map((dept) => (
                  <SelectItem key={dept.id} value={dept.id}>
                    {dept.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input placeholder="Role title" value={form.roleTitle} onChange={(e) => setForm((prev) => ({ ...prev, roleTitle: e.target.value }))} />
            <Input placeholder="Location" value={form.location} onChange={(e) => setForm((prev) => ({ ...prev, location: e.target.value }))} />
            <Select value={form.status} onValueChange={(value) => setForm((prev) => ({ ...prev, status: value }))}>
              <SelectTrigger>
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                {statusOptions.map((option) => (
                  <SelectItem key={option} value={option}>
                    {option.replace("_", " ")}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={form.employmentType} onValueChange={(value) => setForm((prev) => ({ ...prev, employmentType: value }))}>
              <SelectTrigger>
                <SelectValue placeholder="Employment type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="full_time">Full time</SelectItem>
                <SelectItem value="part_time">Part time</SelectItem>
                <SelectItem value="contractor">Contractor</SelectItem>
                <SelectItem value="intern">Intern</SelectItem>
              </SelectContent>
            </Select>
            <Input placeholder="Base salary" value={form.baseSalary} onChange={(e) => setForm((prev) => ({ ...prev, baseSalary: e.target.value }))} />
          </div>
          <Button
            onClick={() => {
              staffService.createEmployee(session.tenantId, session, {
                employeeCode: `EMP-${Date.now()}`,
                firstName: form.firstName,
                lastName: form.lastName,
                fullName: `${form.firstName} ${form.lastName}`.trim(),
                email: form.email,
                phone: form.phone,
                departmentId: form.departmentId || departments[0]?.id || session.departmentId,
                roleTitle: form.roleTitle,
                location: form.location,
                status: form.status as "active",
                employmentType: form.employmentType as "full_time",
                baseSalary: Number(form.baseSalary || "0"),
                hourlyRate: 0,
                hireDate: new Date().toISOString().slice(0, 10),
              });
              setCreateOpen(false);
              setStatusMessage("New employee record created and provisioned.");
              setTimeout(() => setStatusMessage(null), 3000);
              refresh();
            }}
          >
            Save Employee
          </Button>
        </DialogContent>
      </Dialog>

      <Sheet open={editOpen} onOpenChange={setEditOpen}>
        <SheetContent className="w-full sm:max-w-lg">
          <SheetHeader>
            <SheetTitle>Edit Employee</SheetTitle>
          </SheetHeader>
          {selectedEmployee ? (
            <div className="mt-4 space-y-3">
              <Input placeholder="First name" value={form.firstName} onChange={(e) => setForm((prev) => ({ ...prev, firstName: e.target.value }))} />
              <Input placeholder="Last name" value={form.lastName} onChange={(e) => setForm((prev) => ({ ...prev, lastName: e.target.value }))} />
              <Input placeholder="Email" value={form.email} onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))} />
              <Input placeholder="Role title" value={form.roleTitle} onChange={(e) => setForm((prev) => ({ ...prev, roleTitle: e.target.value }))} />
              <Select value={form.departmentId} onValueChange={(value) => setForm((prev) => ({ ...prev, departmentId: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Department" />
                </SelectTrigger>
                <SelectContent>
                  {departments.map((dept) => (
                    <SelectItem key={dept.id} value={dept.id}>
                      {dept.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                onClick={() => {
                  staffService.updateEmployee(session.tenantId, session, selectedEmployee.id, {
                    firstName: form.firstName,
                    lastName: form.lastName,
                    fullName: `${form.firstName} ${form.lastName}`.trim(),
                    email: form.email,
                    roleTitle: form.roleTitle,
                    departmentId: form.departmentId || selectedEmployee.departmentId,
                  });
                  setEditOpen(false);
                  setStatusMessage("Employee profile updated.");
                  setTimeout(() => setStatusMessage(null), 3000);
                  refresh();
                }}
              >
                Save Changes
              </Button>
            </div>
          ) : (
            <div className="mt-4 rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
              Select a record to edit.
            </div>
          )}
        </SheetContent>
      </Sheet>

      <Dialog open={actionOpen} onOpenChange={setActionOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Quick Action</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            {actionType === "import" ? (
              <>
                <Input value={importSource} onChange={(e) => setImportSource(e.target.value)} />
                <Button
                  onClick={() => {
                    staffService.importStaff(session.tenantId, session, importSource);
                    setStatusMessage("Staff data imported and merged.");
                    setActionOpen(false);
                    setTimeout(() => setStatusMessage(null), 3000);
                    refresh();
                  }}
                >
                  Run Import
                </Button>
              </>
            ) : (
              <>
                <Select value={actionEmployeeId} onValueChange={setActionEmployeeId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select employee" />
                  </SelectTrigger>
                  <SelectContent>
                    {staff.items.map((emp) => (
                      <SelectItem key={emp.id} value={emp.id}>
                        {emp.fullName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {actionType === "training" ? (
                  <Select value={actionProgramId} onValueChange={setActionProgramId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Training program" />
                    </SelectTrigger>
                    <SelectContent>
                      {programs.map((program) => (
                        <SelectItem key={program.id} value={program.id}>
                          {program.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : null}
                <Textarea
                  placeholder="Notes"
                  value={actionNotes}
                  onChange={(e) => setActionNotes(e.target.value)}
                />
                <Button
                  onClick={() => {
                    if (actionType === "training" && actionEmployeeId && actionProgramId) {
                      trainingService.assignTraining(session.tenantId, session, {
                        employeeId: actionEmployeeId,
                        programId: actionProgramId,
                      });
                      setStatusMessage("Training program assigned successfully.");
                    } else if (actionType === "review" && actionEmployeeId) {
                      staffService.requestPerformanceReview(session.tenantId, session, actionEmployeeId);
                      setStatusMessage("Performance review flow started.");
                    } else if (actionType === "payroll" && actionEmployeeId) {
                      staffService.openPayrollCase(session.tenantId, session, actionEmployeeId);
                      setStatusMessage("Payroll case opened for IT reconciliation.");
                    }
                    setActionNotes("");
                    setActionOpen(false);
                    setTimeout(() => setStatusMessage(null), 3000);
                    refresh();
                  }}
                >
                  Run Action
                </Button>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
