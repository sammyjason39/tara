import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { FeedbackAlert } from "@/core/tools/FeedbackAlert";
import { useSession } from "@/core/security/session";
import { procurementService } from "@/core/services/procurement/procurementService";
import {
  itService,
  type ProvisioningRequest,
} from "@/core/services/it/itService";
import { CreateProvisioningModal } from "./modals/CreateProvisioningModal";
import { EditProvisioningModal } from "./modals/EditProvisioningModal";

export default function AccountDesk() {
  const session = useSession();
  const [search, setSearch] = useState("");
  const [autoProvision, setAutoProvision] = useState(true);
  const [version, setVersion] = useState(0);
  const [provisioningQueue, setProvisioningQueue] = useState<
    ProvisioningRequest[]
  >([]);
  const [supplierQueue, setSupplierQueue] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAccount, setSelectedAccount] = useState<any | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editData, setEditData] = useState<any>({});

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [itReqs, supReqs] = await Promise.all([
          itService.getProvisioningRequests(session.tenant_id, session),
          procurementService.listSupplierAccessProvisioning(
            session.tenant_id,
            session,
          ),
        ]);
        setProvisioningQueue(itReqs);
        setSupplierQueue(supReqs);
      } catch (err) {
        setErrorMessage("Failed to fetch provisioning requests.");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [session.tenant_id, session, version]);

  const clearStatus = () => {
    setStatusMessage(null);
    setErrorMessage(null);
  };

  const filtered = (Array.isArray(provisioningQueue) ? provisioningQueue : []).filter((acc) =>
    search
      ? (acc.employeeId || "").toLowerCase().includes(search.toLowerCase())
      : true,
  );

  return (
    <div className="space-y-6">
      <FeedbackAlert
        message={statusMessage}
        error={errorMessage}
        onClear={clearStatus}
      />
      <PageHeader
        title="Accounts"
        subtitle="Create/deactivate accounts triggered by HR with audit-first routing."
        primaryAction={
          <Button onClick={() => setCreateOpen(true)}>New Account</Button>
        }
        secondaryActions={
          <Input
            placeholder="Search IDs"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="min-w-[220px]"
          />
        }
      />

      <WorkspacePanel
        title="Provisioning queue"
        description="Account actions from HR and Admin."
      >
        <FilterBar searchValue={search} onSearchChange={setSearch} />
        <DataTableShell total={filtered.length} page={1} pageSize={10}>
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-xs uppercase text-muted-foreground">
              <tr>
                <th className="p-3 text-left">Subject ID</th>
                <th className="p-3 text-left">Scope</th>
                <th className="p-3 text-left">Reason</th>
                <th className="p-3 text-left">Status</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={4} className="p-3 text-center">
                    Loading...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td
                    colSpan={4}
                    className="p-3 text-center text-muted-foreground"
                  >
                    No account requests found.
                  </td>
                </tr>
              ) : (
                (Array.isArray(filtered) ? filtered : []).map((acc) => (
                  <tr
                    key={acc.id}
                    className="border-t cursor-pointer hover:bg-muted/50"
                    onClick={() => setSelectedAccount(acc)}
                  >
                    <td className="p-3 font-medium">
                      {acc.employeeId || acc.supplierId || "N/A"}
                    </td>
                    <td className="p-3 text-muted-foreground truncate max-w-[150px]">
                      {acc.scope}
                    </td>
                    <td className="p-3 text-muted-foreground truncate max-w-[200px]">
                      {acc.reason}
                    </td>
                    <td className="p-3">
                      <ApprovalStatusBadge status={acc.status.toUpperCase()} />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </DataTableShell>
      </WorkspacePanel>

      <WorkspacePanel
        title="Supplier portal provisioning"
        description="Procurement-originated supplier access requests."
      >
        <div className="space-y-3 text-sm">
          {loading ? (
            <p className="p-3 text-center">Loading...</p>
          ) : supplierQueue.length === 0 ? (
            <p className="rounded-lg border border-dashed p-3 text-muted-foreground">
              No supplier provisioning requests from Procurement.
            </p>
          ) : (
            supplierQueue.slice(0, 8).map((request) => (
              <div
                key={request.id}
                className="flex items-center justify-between rounded-lg border p-3"
              >
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
                  onClick={async () => {
                    try {
                      await procurementService.updateSupplierAccessProvisioningStatus(
                        session.tenant_id,
                        session,
                        request.id,
                        "PROVISIONED",
                      );
                      setStatusMessage(
                        `Supplier ${request.supplierId} provisioned for portal.`,
                      );
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
          <Switch
            checked={autoProvision}
            onCheckedChange={setAutoProvision}
            id="auto-provision"
          />
          <Label htmlFor="auto-provision">
            Auto-provision from HR Hire with IT approval
          </Label>
        </div>
      </WorkspacePanel>

      <CreateProvisioningModal
        isOpen={createOpen}
        onClose={() => setCreateOpen(false)}
        onSuccess={() => {
          setStatusMessage("Provisioning request sent successfully.");
          setVersion((prev) => prev + 1);
        }}
      />

      <Dialog
        open={!!selectedAccount}
        onOpenChange={() => setSelectedAccount(null)}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Account Request Detail</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="grid grid-cols-2 text-sm gap-y-2">
              <span className="text-muted-foreground">Subject ID:</span>
              <span className="font-semibold">
                {selectedAccount?.employeeId || selectedAccount?.supplierId}
              </span>
              <span className="text-muted-foreground">Reason:</span>
              <span>{selectedAccount?.reason}</span>
              <span className="text-muted-foreground">Scope:</span>
              <span className="font-bold">{selectedAccount?.scope}</span>
              <span className="text-muted-foreground">Status:</span>
              <span>
                <ApprovalStatusBadge
                  status={(selectedAccount?.status || "PENDING").toUpperCase()}
                />
              </span>
            </div>
            <div className="border-t pt-2 text-xs text-muted-foreground italic">
              Audit Context: Triggered via System Workflow {selectedAccount?.id}
              . Manual override available for domain admins.
            </div>
            {selectedAccount?.status.toLowerCase() === "requested" && (
              <div className="flex gap-2">
                <Button
                  className="flex-1"
                  size="sm"
                  variant="outline"
                  onClick={async () => {
                    try {
                      await itService.markAsProvisioned(
                        session.tenant_id,
                        session,
                        selectedAccount.id,
                        session.user_id,
                      );
                      setStatusMessage(
                        `Account action for ${selectedAccount.employeeId || selectedAccount.supplierId} marked as provisioned.`,
                      );
                      setVersion((prev) => prev + 1);
                      setSelectedAccount(null);
                    } catch (err) {
                      setErrorMessage("Action failed.");
                    }
                  }}
                >
                  Mark Provisioned
                </Button>
                <Button
                  variant="outline"
                  className="flex-1"
                  size="sm"
                  onClick={() => {
                    setEditData({
                      id: selectedAccount.id,
                      subjectId:
                        selectedAccount.employeeId ||
                        selectedAccount.supplierId,
                      reason: selectedAccount.reason,
                      scope: selectedAccount.scope,
                    });
                    setSelectedAccount(null);
                    setEditOpen(true);
                  }}
                >
                  Edit
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={async () => {
                    try {
                      await itService.deleteProvisioningRequest(
                        session.tenant_id,
                        session,
                        selectedAccount.id,
                      );
                      setStatusMessage("Provisioning request deleted.");
                      setVersion((v) => v + 1);
                      setSelectedAccount(null);
                    } catch (e) {
                      setErrorMessage("Failed to delete request.");
                    }
                  }}
                >
                  Delete
                </Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <EditProvisioningModal
        isOpen={editOpen}
        onClose={() => setEditOpen(false)}
        requestId={editData.id || ""}
        defaultValues={{
          subjectId: editData.subjectId || "",
          reason: editData.reason || "",
          scope: editData.scope || "full_portal",
        }}
        onSuccess={() => {
          setStatusMessage("Provisioning request updated.");
          setVersion((prev) => prev + 1);
        }}
      />
    </div>
  );
}
