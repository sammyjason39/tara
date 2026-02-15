import { useMemo, useState } from "react";
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
import { FeedbackAlert } from "@/core/tools/FeedbackAlert";
import { useSession } from "@/core/security/session";
import { useTreasury } from "@/hooks/finance/useTreasury";
import { logService } from "@/core/services/finance/logService";

export default function TreasuryMap() {
  const session = useSession();
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [reconcileDialogOpen, setReconcileDialogOpen] = useState(false);
  const [selectedSource, setSelectedSource] = useState<{ id: string; name: string; pending: number } | null>(null);
  const [selectedAccountDetail, setSelectedAccountDetail] = useState<any | null>(null);
  const [selectedTransferDetail, setSelectedTransferDetail] = useState<any | null>(null);
  const [reconcileAmount, setReconcileAmount] = useState(0);
  const [fromSource, setFromSource] = useState("");
  const [toSource, setToSource] = useState("");
  const [amount, setAmount] = useState("1000000");
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const clearStatus = () => {
    setStatusMessage(null);
    setErrorMessage(null);
  };

  const { sources, transfers, createTransfer, reconcileSettlement } =
    useTreasury(session.tenantId, session);

  const filteredSources = useMemo(
    () =>
      sources.filter((src) =>
        search ? src.name.toLowerCase().includes(search.toLowerCase()) : true,
      ),
    [sources, search],
  );

  // Submit inter-account transfer
  const handleTransfer = () => {
    try {
      const transferRequest = {
        fromSourceId: fromSource || sources[0]?.id || "",
        toSourceId: toSource || sources[1]?.id || "",
        amount: Number(amount || "0"),
      };

      createTransfer(transferRequest);

      // Audit log
      logService.log(
        session.tenantId,
        session.userId,
        `Created Transfer: ${JSON.stringify(transferRequest)}`,
      );

      setStatusMessage(`Transfer of ${Number(amount).toLocaleString()} created successfully.`);
      setDialogOpen(false);
    } catch (err) {
      setErrorMessage("Failed to create transfer. Operation aborted.");
    }
  };

  const handleReconcile = () => {
    try {
      if (!selectedSource) return;
      reconcileSettlement(selectedSource.id, reconcileAmount);
      logService.log(
        session.tenantId,
        session.userId,
        `Reconciled ${selectedSource.name} pending settlement: ${reconcileAmount}`,
      );
      setStatusMessage(`Successfully reconciled ${selectedSource.name}.`);
      setReconcileDialogOpen(false);
      setSelectedSource(null);
    } catch (err) {
      setErrorMessage("Reconciliation failed. Technical exception.");
    }
  };


  return (
    <div className="space-y-6">
      {/* Page Header */}
      <PageHeader
        title="Treasury Map"
        subtitle="Real-time cash positioning, liquidity, inter-account transfers, and settlements."
        primaryAction={
          <Button onClick={() => setDialogOpen(true)}>Create Transfer</Button>
        }
        secondaryActions={
          <Input
            placeholder="Search treasury accounts"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="min-w-[220px]"
          />
        }
      />

      <FeedbackAlert message={statusMessage} error={errorMessage} onClear={clearStatus} />

      {/* Liquidity Overview */}
      <WorkspacePanel
        title="Liquidity Overview"
        description="Bank, wallets, cash registers, settlement balances. Click on an account to see details."
      >
        <FilterBar searchValue={search} onSearchChange={setSearch} />
        <DataTableShell total={filteredSources.length} page={1} pageSize={10}>
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-xs uppercase text-muted-foreground">
              <tr>
                <th className="p-3 text-left">Account</th>
                <th className="p-3 text-left">Type</th>
                <th className="p-3 text-left">Balance</th>
                <th className="p-3 text-left">Pending Settlement</th>
              </tr>
            </thead>
            <tbody>
              {filteredSources.map((src) => (
                <tr
                  key={src.id}
                  className="cursor-pointer border-t hover:bg-muted/50"
                  onClick={() => setSelectedAccountDetail(src)}
                >
                  <td className="p-3 font-medium text-foreground">
                    {src.name}
                  </td>
                  <td className="p-3 text-muted-foreground">{src.type}</td>
                  <td className="p-3 text-muted-foreground">
                    {src.balance.toLocaleString()}
                  </td>
                  <td className="p-3 text-muted-foreground">
                    {src.pendingSettlement?.toLocaleString() ?? 0}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </DataTableShell>
      </WorkspacePanel>

      {/* Pending Settlements */}
      <WorkspacePanel
        title="Pending Settlements"
        description="Reconcile gateway settlements to bank accounts."
      >
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredSources
            .filter((src) => (src.pendingSettlement ?? 0) > 0)
            .map((src) => (
              <div
                key={src.id}
                className="flex items-center justify-between rounded-lg border p-4 text-sm"
              >
                <div>
                  <p className="font-semibold text-foreground">{src.name}</p>
                  <p className="text-xs text-muted-foreground">
                    Pending: {src.pendingSettlement?.toLocaleString()}
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setSelectedSource({
                      id: src.id,
                      name: src.name,
                      pending: src.pendingSettlement ?? 0,
                    });
                    setReconcileAmount(src.pendingSettlement ?? 0);
                    setReconcileDialogOpen(true);
                  }}
                >
                  Reconcile
                </Button>
              </div>
            ))}
        </div>
      </WorkspacePanel>

      {/* Transfers Table */}
      <WorkspacePanel
        title="Transfers"
        description="Inter-account transfers and approval workflow. Click to view audit trail."
      >
        <DataTableShell total={transfers.length} page={1} pageSize={10}>
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-xs uppercase text-muted-foreground">
              <tr>
                <th className="p-3 text-left">From</th>
                <th className="p-3 text-left">To</th>
                <th className="p-3 text-left">Amount</th>
                <th className="p-3 text-left">Status</th>
                <th className="p-3 text-left">Requested By</th>
              </tr>
            </thead>
            <tbody>
              {transfers.map((trf) => (
                <tr
                  key={trf.id}
                  className="cursor-pointer border-t hover:bg-muted/50"
                  onClick={() => setSelectedTransferDetail(trf)}
                >
                  <td className="p-3 text-muted-foreground">
                    {trf.fromSourceId}
                  </td>
                  <td className="p-3 text-muted-foreground">
                    {trf.toSourceId}
                  </td>
                  <td className="p-3 text-muted-foreground">
                    {trf.amount.toLocaleString()}
                  </td>
                  <td className="p-3">
                    <ApprovalStatusBadge status={trf.status.toUpperCase()} />
                  </td>
                  <td className="p-3 text-muted-foreground">
                    {trf.requestedBy}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </DataTableShell>
      </WorkspacePanel>

      {/* Transfer Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Create Transfer</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Select value={fromSource} onValueChange={setFromSource}>
              <SelectTrigger>
                <SelectValue placeholder="From source" />
              </SelectTrigger>
              <SelectContent>
                {sources.map((src) => (
                  <SelectItem key={src.id} value={src.id}>
                    {src.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={toSource} onValueChange={setToSource}>
              <SelectTrigger>
                <SelectValue placeholder="To source" />
              </SelectTrigger>
              <SelectContent>
                {sources.map((src) => (
                  <SelectItem key={src.id} value={src.id}>
                    {src.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Input
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="Amount"
            />
            <Button onClick={handleTransfer}>Create and Route</Button>
          </div>
        </DialogContent>
      </Dialog>
      {/* Reconcile Dialog */}
      <Dialog open={reconcileDialogOpen} onOpenChange={setReconcileDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Reconcile Settlement - {selectedSource?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1">
              <span className="text-sm font-medium">Reconcile Amount</span>
              <Input
                type="number"
                value={reconcileAmount}
                onChange={(e) => setReconcileAmount(Number(e.target.value))}
              />
              <p className="text-xs text-muted-foreground">
                Max pending: {selectedSource?.pending.toLocaleString()}
              </p>
            </div>
            <Button className="w-full" onClick={handleReconcile}>Finalize Reconciliation</Button>
          </div>
        </DialogContent>
      </Dialog>
      {/* Account Detail Dialog */}
      <Dialog open={!!selectedAccountDetail} onOpenChange={() => setSelectedAccountDetail(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Account Detail - {selectedAccountDetail?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="grid grid-cols-2 text-sm gap-y-2">
              <span className="text-muted-foreground">Source ID:</span>
              <span>{selectedAccountDetail?.id}</span>
              <span className="text-muted-foreground">Type:</span>
              <span>{selectedAccountDetail?.type}</span>
              <span className="text-muted-foreground">Available Balance:</span>
              <span className="font-bold">{selectedAccountDetail?.balance.toLocaleString()}</span>
              <span className="text-muted-foreground">Pending Settlement:</span>
              <span>{selectedAccountDetail?.pendingSettlement?.toLocaleString() ?? 0}</span>
            </div>
            <div className="border-t pt-4">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Recent Activity</p>
              <div className="rounded-md border border-dashed p-4 text-center text-xs text-muted-foreground">
                No recent transactions for this account found.
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Transfer Detail Dialog */}
      <Dialog open={!!selectedTransferDetail} onOpenChange={() => setSelectedTransferDetail(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Transfer Audit Trail</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="grid grid-cols-2 text-sm gap-y-2">
              <span className="text-muted-foreground">Transfer ID:</span>
              <span>{selectedTransferDetail?.id}</span>
              <span className="text-muted-foreground">From Account:</span>
              <span>{selectedTransferDetail?.fromSourceId}</span>
              <span className="text-muted-foreground">To Account:</span>
              <span>{selectedTransferDetail?.toSourceId}</span>
              <span className="text-muted-foreground">Amount:</span>
              <span className="font-bold text-blue-600">{selectedTransferDetail?.amount.toLocaleString()}</span>
              <span className="text-muted-foreground">Status:</span>
              <span><ApprovalStatusBadge status={selectedTransferDetail?.status.toUpperCase()} /></span>
            </div>
            <div className="border-t pt-4">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Workflow History</p>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between">
                  <span>Created by {selectedTransferDetail?.requestedBy || "system"}</span>
                  <span className="text-muted-foreground">{new Date().toLocaleDateString()}</span>
                </div>
                <div className="flex justify-between">
                  <span>Routing to Approval Engine</span>
                  <span className="text-muted-foreground">PENDING</span>
                </div>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
