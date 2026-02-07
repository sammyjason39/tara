import { useCallback, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { PageHeader } from "@/core/ui/PageHeader";
import { WorkspacePanel } from "@/core/ui/WorkspacePanel";
import { DataTableShell } from "@/core/tools/DataTableShell";
import { FilterBar } from "@/core/tools/FilterBar";
import { useSession } from "@/core/security/session";
import { orgService } from "@/core/services/hr/orgService";
import { useBackgroundRefresh } from "@/core/runtime/events/useBackgroundRefresh";

export default function OrgMap() {
  const session = useSession();
  const navigate = useNavigate();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deptName, setDeptName] = useState("New Department");
  const [deptCode, setDeptCode] = useState("NEW");
  const [search, setSearch] = useState("");
  const [actionOpen, setActionOpen] = useState(false);
  const [actionType, setActionType] = useState<"risk" | "requisition" | "route">("risk");
  const [actionDeptId, setActionDeptId] = useState("");
  const [actionNotes, setActionNotes] = useState("");
  const [requisitionTitle, setRequisitionTitle] = useState("Operations Analyst");
  const [requisitionOpenings, setRequisitionOpenings] = useState("1");
  const [version, setVersion] = useState(0);
  const refresh = useCallback(() => setVersion((prev) => prev + 1), []);
  useBackgroundRefresh(refresh, 20000);
  const data = useMemo(() => {
    const items = orgService.getOrgMap(session.tenantId, session);
    if (!search) return items;
    return items.filter((dept) => dept.name.toLowerCase().includes(search.toLowerCase()));
  }, [session, version, search]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="OrgMap"
        subtitle="Department intelligence, staffing levels, and readiness signals."
        primaryAction={<Button onClick={() => setDialogOpen(true)}>New Department</Button>}
        secondaryActions={<Input placeholder="Search departments" className="min-w-[200px]" value={search} onChange={(e) => setSearch(e.target.value)} />}
      />

      <WorkspacePanel title="WorkQueue" description="Department actions requiring attention.">
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            onClick={() => {
              setActionType("risk");
              setActionDeptId(data[0]?.id ?? "");
              setActionOpen(true);
            }}
          >
            Escalate staffing risk
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              setActionType("requisition");
              setActionDeptId(data[0]?.id ?? "");
              setActionOpen(true);
            }}
          >
            Open requisition
          </Button>
        </div>
      </WorkspacePanel>

      <WorkspacePanel title="Active Records" description="Department map and readiness.">
        <FilterBar searchValue={search} onSearchChange={setSearch} />
        <DataTableShell total={data.length} page={1} pageSize={10}>
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-xs uppercase text-muted-foreground">
              <tr>
                <th className="p-3 text-left">Department</th>
                <th className="p-3 text-left">Headcount</th>
                <th className="p-3 text-left">Open Reqs</th>
                <th className="p-3 text-left">Attendance Risk</th>
                <th className="p-3 text-left">Action</th>
              </tr>
            </thead>
            <tbody>
              {data.map((dept) => (
                <tr key={dept.id} className="border-t">
                  <td className="p-3 font-medium text-foreground">{dept.name}</td>
                  <td className="p-3 text-muted-foreground">{dept.headcount}</td>
                  <td className="p-3 text-muted-foreground">{dept.openRequisitions}</td>
                  <td className="p-3 text-muted-foreground">{dept.attendanceRisk}%</td>
                  <td className="p-3">
                    <Button size="sm" variant="outline" onClick={() => navigate("/core/hr/roster")}>
                      Open RosterGrid
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </DataTableShell>
      </WorkspacePanel>

      <div className="grid gap-6 lg:grid-cols-[1fr_0.8fr]">
        <WorkspacePanel title="Pending Approvals" description="Department routing actions.">
          <div className="space-y-3 text-sm text-muted-foreground">
            {data.slice(0, 3).map((dept) => (
              <div key={dept.id} className="flex items-center justify-between rounded-lg border p-3">
                <span>{dept.name}</span>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    orgService.routeDepartment(session.tenantId, session, dept.id, "OrgMap routing");
                    setVersion((prev) => prev + 1);
                  }}
                >
                  Send to FlowGate
                </Button>
              </div>
            ))}
          </div>
        </WorkspacePanel>

        <WorkspacePanel title="Insights" description="Org-level operational overview.">
          <div className="space-y-3 text-sm text-muted-foreground">
            <div className="flex items-center justify-between rounded-lg border p-3">
              <span>Total departments</span>
              <span className="font-semibold text-foreground">{data.length}</span>
            </div>
            <div className="flex items-center justify-between rounded-lg border p-3">
              <span>Open requisitions</span>
              <span className="font-semibold text-foreground">
                {data.reduce((sum, dept) => sum + dept.openRequisitions, 0)}
              </span>
            </div>
          </div>
        </WorkspacePanel>
      </div>
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Create Department</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Input value={deptName} onChange={(e) => setDeptName(e.target.value)} />
            <Input value={deptCode} onChange={(e) => setDeptCode(e.target.value)} />
            <Button
              onClick={() => {
                orgService.createDepartment(session.tenantId, session, {
                  id: `dept-${deptCode.toLowerCase()}`,
                  name: deptName,
                  code: deptCode.toUpperCase(),
                  status: "active",
                });
                setDialogOpen(false);
                setVersion((prev) => prev + 1);
              }}
            >
              Create
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={actionOpen} onOpenChange={setActionOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Department Action</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Input
              placeholder="Department ID"
              value={actionDeptId}
              onChange={(e) => setActionDeptId(e.target.value)}
            />
            {actionType === "requisition" ? (
              <>
                <Input value={requisitionTitle} onChange={(e) => setRequisitionTitle(e.target.value)} />
                <Input value={requisitionOpenings} onChange={(e) => setRequisitionOpenings(e.target.value)} />
              </>
            ) : (
              <Textarea
                placeholder="Notes"
                value={actionNotes}
                onChange={(e) => setActionNotes(e.target.value)}
              />
            )}
            <Button
              onClick={() => {
                if (actionType === "risk") {
                  orgService.escalateStaffingRisk(session.tenantId, session, actionDeptId, actionNotes);
                }
                if (actionType === "requisition") {
                  orgService.openRequisition(session.tenantId, session, {
                    title: requisitionTitle,
                    departmentId: actionDeptId,
                    openings: Number(requisitionOpenings || "1"),
                  });
                }
                if (actionType === "route") {
                  orgService.routeDepartment(session.tenantId, session, actionDeptId, actionNotes);
                }
                setActionNotes("");
                setActionOpen(false);
                setVersion((prev) => prev + 1);
              }}
            >
              Submit
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
