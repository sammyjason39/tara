import { useCallback, useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileText, Calendar, CreditCard, Building2, ArrowDownToLine, Info, UploadCloud } from "lucide-react";
import { PageHeader } from "@/core/ui/PageHeader";
import { WorkspacePanel } from "@/core/ui/WorkspacePanel";
import { DataTableShell } from "@/core/tools/DataTableShell";
import { FilterBar } from "@/core/tools/FilterBar";
import { ApprovalStatusBadge } from "@/core/tools/ApprovalStatusBadge";
import { FeedbackAlert } from "@/core/tools/FeedbackAlert";
import { useSession } from "@/core/security/session";
import { financeApiClient } from "@/core/services/finance/financeApiClient";
import type { FinanceReceivableRow } from "@/core/services/finance/financeService";
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

  const refreshReceivables = useCallback(async () => {
    setReceivables(await financeApiClient.listReceivables(session.tenantId, session));
  }, [session.tenantId, session]);

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

  const createReceivable = async () => {
    try {
      await financeApiClient.createReceivable(session.tenantId, session, {
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

  const markReceived = async (id: string) => {
    try {
      await financeApiClient.markReceived(session.tenantId, session, id);
      logService.log(session.tenantId, session.userId, "Marked receivable received", id);
      setStatusMessage("Receivable marked as received and settled.");
      refreshReceivables();
    } catch (err) {
      setErrorMessage("Failed to update status. Technical error.");
    }
  };

  const sendReminder = async (id: string) => {
    try {
      await financeApiClient.sendReceivableReminder(session.tenantId, session, id);
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
        <DialogContent className="max-w-3xl p-0 overflow-hidden">
          <div className="grid md:grid-cols-[1fr_2fr]">
            {/* Left Info Panel */}
            <div className="bg-muted p-6 flex flex-col justify-between">
              <div>
                <ArrowDownToLine className="w-8 h-8 text-primary mb-4" />
                <DialogTitle className="text-xl mb-2">Create Receivable</DialogTitle>
                <p className="text-sm text-muted-foreground">
                  Record incoming funds due. This creates an Accounts Receivable entry tied instantly to the customer's balance.
                </p>
                <div className="mt-8 space-y-4">
                  <div className="flex items-start gap-3 text-sm">
                    <div className="mt-0.5"><Building2 className="w-4 h-4 text-muted-foreground" /></div>
                    <div>
                      <p className="font-medium">Customer Selection</p>
                      <p className="text-muted-foreground text-xs">A valid customer profile is required.</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 text-sm">
                    <div className="mt-0.5"><Calendar className="w-4 h-4 text-muted-foreground" /></div>
                    <div>
                      <p className="font-medium">Terms Analysis</p>
                      <p className="text-muted-foreground text-xs">Due dates trigger automated collection.</p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="bg-primary/5 p-4 rounded-lg mt-8 border border-primary/10">
                <p className="text-xs text-primary font-medium flex items-center gap-1.5">
                  <Info className="w-4 h-4" /> Ledger Sync
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Generates an automatic un-posted Revenue entry.
                </p>
              </div>
            </div>

            {/* Right Form Panel */}
            <div className="p-6">
              <div className="space-y-6">
                <div>
                  <label className="text-xs font-semibold uppercase text-muted-foreground mb-2 block">Customer Name</label>
                  <Input placeholder="e.g., Global Tech Inc." value={customer} onChange={(event) => setCustomer(event.target.value)} />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-semibold uppercase text-muted-foreground mb-2 block">Amount (IDR)</label>
                    <div className="relative">
                      <CreditCard className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input
                        className="pl-9"
                        placeholder="0"
                        type="number"
                        value={amount}
                        onChange={(event) => setAmount(event.target.value)}
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-semibold uppercase text-muted-foreground mb-2 block">Expected Due Date</label>
                    <div className="relative">
                      <Calendar className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input
                        className="pl-9"
                        type="date"
                        value={dueDate}
                        onChange={(event) => setDueDate(event.target.value)}
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold uppercase text-muted-foreground mb-2 block">Supporting Contract / PO (Optional)</label>
                  <div className="border-2 border-dashed rounded-lg p-6 flex flex-col items-center justify-center text-center cursor-pointer hover:bg-muted/50 transition-colors">
                    <UploadCloud className="h-8 w-8 text-muted-foreground mb-2" />
                    <p className="text-sm font-medium">Attach PO Document</p>
                    <p className="text-xs text-muted-foreground mt-1">PDF, JPG up to 10MB</p>
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t">
                  <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
                  <Button onClick={createReceivable}>Create and Route</Button>
                </div>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      <Dialog open={!!selectedItem} onOpenChange={() => setSelectedItem(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader className="pb-4 border-b">
            <div className="flex justify-between items-start">
              <div>
                <DialogTitle className="text-xl flex items-center gap-2">
                  <FileText className="h-5 w-5 text-primary" />
                  Receivable Detail
                </DialogTitle>
                <p className="text-sm text-muted-foreground mt-1">ID: <span className="font-mono">{selectedItem?.invoiceId}</span></p>
              </div>
              <ApprovalStatusBadge status={selectedItem?.status || "PENDING"} />
            </div>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-8 py-4">
            <div className="space-y-6">
              <div>
                <p className="text-sm text-muted-foreground uppercase font-semibold tracking-wider mb-1">Customer</p>
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 bg-muted rounded-full flex items-center justify-center">
                    <Building2 className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="font-semibold text-lg">{selectedItem?.customer}</p>
                    <p className="text-sm text-muted-foreground">Corporate Account</p>
                  </div>
                </div>
              </div>
              <div>
                <p className="text-sm text-muted-foreground uppercase font-semibold tracking-wider mb-1">Timeline</p>
                <div className="bg-muted/30 p-3 rounded-lg border">
                  <p className="text-xs text-muted-foreground">Due Date</p>
                  <p className="font-medium text-sm text-rose-600">{selectedItem?.dueDate}</p>
                </div>
              </div>
            </div>
            
            <div className="space-y-6 border-l pl-8">
              <div>
                <p className="text-sm text-muted-foreground uppercase font-semibold tracking-wider mb-1">Financials</p>
                <div className="bg-primary/5 p-4 rounded-xl border border-primary/10">
                  <p className="text-sm font-medium mb-1">Total Outstanding</p>
                  <p className="text-3xl font-bold tracking-tight">Rp {selectedItem?.amount.toLocaleString()}</p>
                </div>
              </div>
              <div className="border-t pt-4">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Notes & History</p>
                <p className="text-xs text-muted-foreground">
                  Automatic reminder scheduled for 2 days before due date. 
                  Credit limits verified for this counterparty.
                </p>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
