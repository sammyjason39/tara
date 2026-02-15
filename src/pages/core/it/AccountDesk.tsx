import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { ApprovalStatusBadge } from "@/core/tools/ApprovalStatusBadge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { FeedbackAlert } from "@/core/tools/FeedbackAlert";
import { useSession } from "@/core/security/session";
import { procurementService } from "@/core/services/procurement/procurementService";

const accounts = [
  { id: "EMP-00112", user: "Ava Reynolds", action: "Create", status: "PENDING", dept: "Finance" },
  { id: "EMP-00145", user: "Henry Pham", action: "Deactivate", status: "IN_PROGRESS", dept: "Facilities" },
  { id: "EMP-00033", user: "Jessie Allan", action: "Create", status: "APPROVED", dept: "Operations" },
];

export default function AccountDesk() {
  const session = useSession();
  const [search, setSearch] = useState("");
  const [autoProvision, setAutoProvision] = useState(true);
  const [version, setVersion] = useState(0);
  const [selectedAccount, setSelectedAccount] = useState<any | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);

  const clearStatus = () => {
    setStatusMessage(null);
    setErrorMessage(null);
  };
  const supplierAccessQueue = procurementService.listSupplierAccessProvisioning(session.tenantId);

  const filtered = accounts.filter((acc) =>
    search ? acc.user.toLowerCase().includes(search.toLowerCase()) : true,
  );

  return (
    <div className="space-y-6">
      <FeedbackAlert message={statusMessage} error={errorMessage} onClear={clearStatus} />
      <PageHeader
        title="Accounts"
        subtitle="Create/deactivate accounts triggered by HR with audit-first routing."
        primaryAction={<Button onClick={() => setCreateOpen(true)}>New Account</Button>}
        secondaryActions={
          <Input
            placeholder="Search users"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="min-w-[220px]"
          />
        }
      />

      <WorkspacePanel title="Provisioning queue" description="Account actions from HR and Admin.">
        <FilterBar searchValue={search} onSearchChange={setSearch} />
        <DataTableShell total={filtered.length} page={1} pageSize={10}>
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-xs uppercase text-muted-foreground">
              <tr>
                <th className="p-3 text-left">User</th>
                <th className="p-3 text-left">Action</th>
                <th className="p-3 text-left">Department</th>
                <th className="p-3 text-left">Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((acc) => (
                <tr
                  key={acc.id}
                  className="border-t cursor-pointer hover:bg-muted/50"
                  onClick={() => setSelectedAccount(acc)}
                >
                  <td className="p-3 font-medium">{acc.user}</td>
                  <td className="p-3 text-muted-foreground">{acc.action}</td>
                  <td className="p-3 text-muted-foreground">{acc.dept}</td>
                  <td className="p-3">
                    <ApprovalStatusBadge status={acc.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </DataTableShell>
      </WorkspacePanel>

      <WorkspacePanel
        title="Supplier portal provisioning"
        description="Procurement-originated supplier access requests."
      >
        <div className="space-y-3 text-sm">
          {supplierAccessQueue.length === 0 ? (
            <p className="rounded-lg border border-dashed p-3 text-muted-foreground">
              No supplier provisioning requests from Procurement.
            </p>
          ) : (
            supplierAccessQueue.slice(0, 8).map((request) => (
              <div key={request.id} className="flex items-center justify-between rounded-lg border p-3">
                <div>
                  <p className="font-medium text-foreground">
                    Supplier {request.supplierId} / {request.supplierBranchId}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Scope: {request.portalScope} | Status: {request.status}
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={request.status === "PROVISIONED"}
                  onClick={() => {
                    try {
                      procurementService.updateSupplierAccessProvisioningStatus(
                        session.tenantId,
                        session,
                        request.id,
                        "PROVISIONED",
                      );
                      setStatusMessage(`Supplier ${request.supplierId} provisioned for portal.`);
                      setVersion((prev) => prev + 1);
                    } catch (err) {
                      setErrorMessage("Failed to update provisioning status.");
                    }
                  }}
                >
                  Mark provisioned
                </Button>
              </div>
            ))
          )}
        </div>
      </WorkspacePanel>

      <WorkspacePanel
        title="Automation"
        description="Sync provisioning with HR hire/terminate events and approvals."
      >
        <div className="flex items-center gap-3">
          <Switch checked={autoProvision} onCheckedChange={setAutoProvision} id="auto-provision" />
          <Label htmlFor="auto-provision">Auto-provision from HR Hire with IT approval</Label>
        </div>
      </WorkspacePanel>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Provision New Account</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 pt-2">
            <Input placeholder="User Full Name" />
            <Input placeholder="Email Address" />
            <Select>
              <SelectTrigger>
                <SelectValue placeholder="Department" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="finance">Finance</SelectItem>
                <SelectItem value="hr">HR</SelectItem>
                <SelectItem value="ops">Operations</SelectItem>
              </SelectContent>
            </Select>
            <Button
              className="w-full"
              onClick={() => {
                try {
                  setCreateOpen(false);
                  setStatusMessage("System account provisioning request sent to directory services.");
                } catch (err) {
                  setErrorMessage("Failed to initiate provisioning.");
                }
              }}
            >
              Provision Account
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!selectedAccount} onOpenChange={() => setSelectedAccount(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Account Request Detail</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="grid grid-cols-2 text-sm gap-y-2">
              <span className="text-muted-foreground">User:</span>
              <span className="font-semibold">{selectedAccount?.user}</span>
              <span className="text-muted-foreground">Target Dept:</span>
              <span>{selectedAccount?.dept}</span>
              <span className="text-muted-foreground">Action:</span>
              <span className="font-bold">{selectedAccount?.action}</span>
              <span className="text-muted-foreground">Status:</span>
              <span><ApprovalStatusBadge status={selectedAccount?.status || "PENDING"} /></span>
            </div>
            <div className="border-t pt-2 text-xs text-muted-foreground italic">
              Audit Context: Triggered via HR Workflow {selectedAccount?.id}. Manual override available for domain admins.
            </div>
            {selectedAccount?.status === "PENDING" && (
              <Button
                className="w-full"
                size="sm"
                variant="outline"
                onClick={() => {
                  try {
                    setStatusMessage(`Account action for ${selectedAccount.user} marked as processing.`);
                    setSelectedAccount(null);
                  } catch (err) {
                    setErrorMessage("Action failed.");
                  }
                }}
              >
                Start Processing
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
