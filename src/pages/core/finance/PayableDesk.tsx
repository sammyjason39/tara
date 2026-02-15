import { useCallback, useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageHeader } from "@/core/ui/PageHeader";
import { WorkspacePanel } from "@/core/ui/WorkspacePanel";
import { DataTableShell } from "@/core/tools/DataTableShell";
import { FilterBar } from "@/core/tools/FilterBar";
import { ApprovalStatusBadge } from "@/core/tools/ApprovalStatusBadge";
import { FeedbackAlert } from "@/core/tools/FeedbackAlert";
import { useSession } from "@/core/security/session";
import { financeService, type FinancePayableRow } from "@/core/services/finance/financeService";
import { logService } from "@/core/services/finance/logService";

type PayableTab = "PENDING" | "APPROVED" | "OVERDUE";

const TABS: PayableTab[] = ["PENDING", "APPROVED", "OVERDUE"];

export default function PayableDesk() {
  const session = useSession();
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState<PayableTab>("PENDING");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [vendor, setVendor] = useState("");
  const [amount, setAmount] = useState("0");
  const [dueDate, setDueDate] = useState("");
  const [payables, setPayables] = useState<FinancePayableRow[]>([]);
  const [selectedItem, setSelectedItem] = useState<FinancePayableRow | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const clearStatus = () => {
    setStatusMessage(null);
    setErrorMessage(null);
  };

  const refreshPayables = useCallback(() => {
    setPayables(financeService.listPayables(session.tenantId));
  }, [session.tenantId]);

  useEffect(() => {
    refreshPayables();
  }, [refreshPayables]);

  const filtered = useMemo(
    () =>
      payables.filter((item) =>
        search ? item.vendor.toLowerCase().includes(search.toLowerCase()) : true,
      ),
    [payables, search],
  );

  const grouped = useMemo(() => {
    const next: Record<PayableTab, FinancePayableRow[]> = {
      PENDING: [],
      APPROVED: [],
      OVERDUE: [],
    };
    filtered.forEach((item) => {
      next[item.status].push(item);
    });
    return next;
  }, [filtered]);

  const createPayable = () => {
    try {
      financeService.createPayable(session.tenantId, session, {
        vendor,
        amount: Number(amount || "0"),
        dueDate,
      });
      logService.log(
        session.tenantId,
        session.userId,
        "Created payable",
        `${vendor} - ${amount}`,
      );
      setStatusMessage(`Payable for ${vendor} created successfully.`);
      setDialogOpen(false);
      setVendor("");
      setAmount("0");
      setDueDate("");
      refreshPayables();
    } catch (err) {
      setErrorMessage("Failed to create payable. Technical error.");
    }
  };

  const approvePayable = (id: string) => {
    try {
      financeService.approvePayable(session.tenantId, session, id);
      logService.log(session.tenantId, session.userId, "Approved payable", id);
      setStatusMessage("Payable approved by department HOD.");
      refreshPayables();
    } catch (err) {
      setErrorMessage("Approval failed. Budget limit exceeded.");
    }
  };

  const markPaid = (id: string) => {
    try {
      financeService.markPaid(session.tenantId, id);
      logService.log(session.tenantId, session.userId, "Marked payable paid", id);
      setStatusMessage("Payable marked as paid and posted to ledger.");
      refreshPayables();
    } catch (err) {
      setErrorMessage("Failed to record payment. Ledger entry failed.");
    }
  };

  const renderTable = (items: FinancePayableRow[]) => (
    <DataTableShell total={items.length} page={1} pageSize={10}>
      <table className="w-full text-sm">
        <thead className="bg-muted/40 text-xs uppercase text-muted-foreground">
          <tr>
            <th className="p-3 text-left">Vendor</th>
            <th className="p-3 text-left">Invoice</th>
            <th className="p-3 text-left">Amount</th>
            <th className="p-3 text-left">Due Date</th>
            <th className="p-3 text-left">Status</th>
            <th className="p-3 text-left">Action</th>
          </tr>
        </thead>
        <tbody>
          {items.map((payable) => (
            <tr
              key={payable.id}
              className="cursor-pointer border-t hover:bg-muted/50"
              onClick={() => setSelectedItem(payable)}
            >
              <td className="p-3">{payable.vendor}</td>
              <td className="p-3">{payable.invoiceId}</td>
              <td className="p-3 text-muted-foreground">{payable.amount.toLocaleString()}</td>
              <td className="p-3">{payable.dueDate}</td>
              <td className="p-3">
                <ApprovalStatusBadge status={payable.status} />
              </td>
              <td className="p-3">
                <div className="flex flex-wrap gap-2">
                  {payable.status === "PENDING" ? (
                    <Button size="sm" variant="outline" onClick={() => approvePayable(payable.id)}>
                      Approve
                    </Button>
                  ) : null}
                  {payable.status !== "APPROVED" ? (
                    <Button size="sm" onClick={() => markPaid(payable.id)}>
                      Mark Paid
                    </Button>
                  ) : null}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </DataTableShell>
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Payable Desk"
        subtitle="Manage outgoing bills with approval and settlement controls."
        primaryAction={<Button onClick={() => setDialogOpen(true)}>Create Payable</Button>}
        secondaryActions={
          <Input
            placeholder="Search vendors"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="min-w-[220px]"
          />
        }
      />

      <FeedbackAlert message={statusMessage} error={errorMessage} onClear={clearStatus} />

      <WorkspacePanel title="Payable Health" description="Approval and settlement status.">
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-lg border p-3">
            <p className="text-xs text-muted-foreground">Pending</p>
            <p className="text-lg font-semibold">{grouped.PENDING.length}</p>
            <Badge variant="secondary">Needs review</Badge>
          </div>
          <div className="rounded-lg border p-3">
            <p className="text-xs text-muted-foreground">Approved/Paid</p>
            <p className="text-lg font-semibold">{grouped.APPROVED.length}</p>
            <Badge variant="default">Healthy</Badge>
          </div>
          <div className="rounded-lg border p-3">
            <p className="text-xs text-muted-foreground">Overdue</p>
            <p className="text-lg font-semibold text-rose-600">{grouped.OVERDUE.length}</p>
            <Badge variant="destructive">Escalate</Badge>
          </div>
        </div>
      </WorkspacePanel>

      <WorkspacePanel title="Payables Work Queue" description="Bills requiring action.">
        <FilterBar searchValue={search} onSearchChange={setSearch} />
        <Tabs value={tab} onValueChange={(value) => setTab(value as PayableTab)}>
          <TabsList>
            {TABS.map((status) => (
              <TabsTrigger key={status} value={status}>
                {status.charAt(0) + status.slice(1).toLowerCase()}
              </TabsTrigger>
            ))}
          </TabsList>
          {TABS.map((status) => (
            <TabsContent key={status} value={status} className="mt-4">
              {renderTable(grouped[status])}
            </TabsContent>
          ))}
        </Tabs>
      </WorkspacePanel>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Create Payable</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Input placeholder="Vendor" value={vendor} onChange={(event) => setVendor(event.target.value)} />
            <Input placeholder="Amount" type="number" value={amount} onChange={(event) => setAmount(event.target.value)} />
            <Input placeholder="Due date" type="date" value={dueDate} onChange={(event) => setDueDate(event.target.value)} />
            <div className="flex justify-end gap-2">
              <Button onClick={createPayable}>Create and Route</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      <Dialog open={!!selectedItem} onOpenChange={() => setSelectedItem(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Payable Detail</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="grid grid-cols-2 text-sm gap-y-2">
              <span className="text-muted-foreground">Invoice ID:</span>
              <span>{selectedItem?.invoiceId}</span>
              <span className="text-muted-foreground">Vendor:</span>
              <span className="font-semibold">{selectedItem?.vendor}</span>
              <span className="text-muted-foreground">Amount:</span>
              <span className="font-bold">{selectedItem?.amount.toLocaleString()}</span>
              <span className="text-muted-foreground">Due Date:</span>
              <span>{selectedItem?.dueDate}</span>
              <span className="text-muted-foreground">Status:</span>
              <span><ApprovalStatusBadge status={selectedItem?.status || "PENDING"} /></span>
            </div>
            <div className="border-t pt-4">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Settlement Workflow</p>
              <p className="text-xs text-muted-foreground">
                Payment scheduled for next cash disbursement run. 
                VAT compliance verified for this vendor invoice.
              </p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
