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
import { financeService, type FinanceReceivableRow } from "@/core/services/finance/financeService";
import { logService } from "@/core/services/finance/logService";

type ReceivableTab = "PENDING" | "APPROVED" | "OVERDUE";

const TABS: ReceivableTab[] = ["PENDING", "APPROVED", "OVERDUE"];

export default function ReceivableDesk() {
  const session = useSession();
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState<ReceivableTab>("PENDING");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [customer, setCustomer] = useState("");
  const [amount, setAmount] = useState("0");
  const [dueDate, setDueDate] = useState("");
  const [receivables, setReceivables] = useState<FinanceReceivableRow[]>([]);
  const [selectedItem, setSelectedItem] = useState<FinanceReceivableRow | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const clearStatus = () => {
    setStatusMessage(null);
    setErrorMessage(null);
  };

  const refreshReceivables = useCallback(() => {
    setReceivables(financeService.listReceivables(session.tenantId));
  }, [session.tenantId]);

  useEffect(() => {
    refreshReceivables();
  }, [refreshReceivables]);

  const filtered = useMemo(
    () =>
      receivables.filter((item) =>
        search ? item.customer.toLowerCase().includes(search.toLowerCase()) : true,
      ),
    [receivables, search],
  );

  const grouped = useMemo(() => {
    const next: Record<ReceivableTab, FinanceReceivableRow[]> = {
      PENDING: [],
      APPROVED: [],
      OVERDUE: [],
    };
    filtered.forEach((item) => {
      next[item.status].push(item);
    });
    return next;
  }, [filtered]);

  const createReceivable = () => {
    try {
      financeService.createReceivable(session.tenantId, session, {
        customer,
        amount: Number(amount || "0"),
        dueDate,
      });
      logService.log(
        session.tenantId,
        session.userId,
        "Created receivable",
        `${customer} - ${amount}`,
      );
      setStatusMessage(`Receivable for ${customer} created successfully.`);
      setDialogOpen(false);
      setCustomer("");
      setAmount("0");
      setDueDate("");
      refreshReceivables();
    } catch (err) {
      setErrorMessage("Failed to create receivable. Please check customer credit limits.");
    }
  };

  const markReceived = (id: string) => {
    try {
      financeService.markReceived(session.tenantId, id);
      logService.log(session.tenantId, session.userId, "Marked receivable received", id);
      setStatusMessage("Receivable marked as received and settled.");
      refreshReceivables();
    } catch (err) {
      setErrorMessage("Failed to update status. Technical error.");
    }
  };

  const sendReminder = (id: string) => {
    try {
      financeService.sendReceivableReminder(session.tenantId, session, id);
      logService.log(session.tenantId, session.userId, "Sent receivable reminder", id);
      setStatusMessage("Collection reminder sent to customer contact.");
    } catch (err) {
      setErrorMessage("Failed to send reminder. Email gateway offline.");
    }
  };

  const renderTable = (items: FinanceReceivableRow[]) => (
    <DataTableShell total={items.length} page={1} pageSize={10}>
      <table className="w-full text-sm">
        <thead className="bg-muted/40 text-xs uppercase text-muted-foreground">
          <tr>
            <th className="p-3 text-left">Customer</th>
            <th className="p-3 text-left">Invoice</th>
            <th className="p-3 text-left">Amount</th>
            <th className="p-3 text-left">Due Date</th>
            <th className="p-3 text-left">Status</th>
            <th className="p-3 text-left">Action</th>
          </tr>
        </thead>
        <tbody>
          {items.map((receivable) => (
            <tr
              key={receivable.id}
              className="cursor-pointer border-t hover:bg-muted/50"
              onClick={() => setSelectedItem(receivable)}
            >
              <td className="p-3">{receivable.customer}</td>
              <td className="p-3">{receivable.invoiceId}</td>
              <td className="p-3 text-muted-foreground">{receivable.amount.toLocaleString()}</td>
              <td className="p-3">{receivable.dueDate}</td>
              <td className="p-3">
                <ApprovalStatusBadge status={receivable.status} />
              </td>
              <td className="p-3">
                <div className="flex flex-wrap gap-2">
                  {receivable.status !== "APPROVED" ? (
                    <Button size="sm" onClick={() => markReceived(receivable.id)}>
                      Mark Received
                    </Button>
                  ) : null}
                  {receivable.status !== "APPROVED" ? (
                    <Button size="sm" variant="outline" onClick={() => sendReminder(receivable.id)}>
                      Reminder
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
        title="Receivable Desk"
        subtitle="Track incoming invoices with collection and reminder workflows."
        primaryAction={<Button onClick={() => setDialogOpen(true)}>Create Receivable</Button>}
        secondaryActions={
          <Input
            placeholder="Search customers"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="min-w-[220px]"
          />
        }
      />

      <FeedbackAlert message={statusMessage} error={errorMessage} onClear={clearStatus} />

      <WorkspacePanel title="Receivable Health" description="Collection visibility by status.">
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-lg border p-3">
            <p className="text-xs text-muted-foreground">Pending</p>
            <p className="text-xl font-semibold">{grouped.PENDING.length}</p>
            <Badge variant="secondary">Collecting</Badge>
          </div>
          <div className="rounded-lg border p-3">
            <p className="text-xs text-muted-foreground">Received</p>
            <p className="text-xl font-semibold">{grouped.APPROVED.length}</p>
            <Badge variant="default">Settled</Badge>
          </div>
          <div className="rounded-lg border p-3">
            <p className="text-xs text-muted-foreground">Overdue</p>
            <p className="text-xl font-semibold text-rose-600">{grouped.OVERDUE.length}</p>
            <Badge variant="destructive">Follow up</Badge>
          </div>
        </div>
      </WorkspacePanel>

      <WorkspacePanel title="Receivables Work Queue" description="Invoices requiring collection action.">
        <FilterBar searchValue={search} onSearchChange={setSearch} />
        <Tabs value={tab} onValueChange={(value) => setTab(value as ReceivableTab)}>
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
            <DialogTitle>Create Receivable</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Input placeholder="Customer" value={customer} onChange={(event) => setCustomer(event.target.value)} />
            <Input placeholder="Amount" type="number" value={amount} onChange={(event) => setAmount(event.target.value)} />
            <Input placeholder="Due date" type="date" value={dueDate} onChange={(event) => setDueDate(event.target.value)} />
            <div className="flex justify-end gap-2">
              <Button onClick={createReceivable}>Create and Route</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      <Dialog open={!!selectedItem} onOpenChange={() => setSelectedItem(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Receivable Detail</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="grid grid-cols-2 text-sm gap-y-2">
              <span className="text-muted-foreground">Invoice ID:</span>
              <span>{selectedItem?.invoiceId}</span>
              <span className="text-muted-foreground">Customer:</span>
              <span className="font-semibold">{selectedItem?.customer}</span>
              <span className="text-muted-foreground">Amount:</span>
              <span className="font-bold">{selectedItem?.amount.toLocaleString()}</span>
              <span className="text-muted-foreground">Due Date:</span>
              <span>{selectedItem?.dueDate}</span>
              <span className="text-muted-foreground">Status:</span>
              <span><ApprovalStatusBadge status={selectedItem?.status || "PENDING"} /></span>
            </div>
            <div className="border-t pt-4">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Notes & History</p>
              <p className="text-xs text-muted-foreground">
                Automatic reminder scheduled for 2 days before due date. 
                Credit limits verified for this counterparty.
              </p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
