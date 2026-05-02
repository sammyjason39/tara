import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { BookOpen, CheckCircle2, AlertTriangle, Plus } from "lucide-react";
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
import { financeApiClient } from "@/core/services/finance/financeApiClient";
import { logService } from "@/core/services/finance/logService";
import type {
  FinanceInvoiceRow,
  FinanceJournalRow,
} from "@/core/services/finance/financeService";
import type { PayrollEntry, PayrollEstimate } from "@/core/types/finance/payrollTypes";

type LedgerTab = "journals" | "invoices" | "payroll";

const toPeriod = () => {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  return `${now.getFullYear()}-${month}`;
};

export default function LedgerCore() {
  const session = useSession();
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState<LedgerTab>("journals");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [payrollDialogOpen, setPayrollDialogOpen] = useState(false);
  const [entry, setEntry] = useState<{
    description: string;
    ref: string;
    lines: Array<{
      accountCode: string;
      description: string;
      debit: number;
      credit: number;
    }>;
  }>({
    description: "",
    ref: "",
    lines: [
      { accountCode: "", description: "", debit: 0, credit: 0 },
      { accountCode: "", description: "", debit: 0, credit: 0 },
    ],
  });

  const totalDebits = useMemo(
    () => entry.lines.reduce((sum, l) => sum + l.debit, 0),
    [entry.lines],
  );
  const totalCredits = useMemo(
    () => entry.lines.reduce((sum, l) => sum + l.credit, 0),
    [entry.lines],
  );
  const isBalanced = useMemo(
    () =>
      Math.abs(totalDebits - totalCredits) < 0.01 && entry.lines.length >= 2,
    [totalDebits, totalCredits, entry.lines.length],
  );

  const addLine = () => {
    setEntry({
      ...entry,
      lines: [
        ...entry.lines,
        { accountCode: "", description: "", debit: 0, credit: 0 },
      ],
    });
  };

  const removeLine = (index: number) => {
    const newLines = entry.(Array.isArray(lines) ? lines : []).filter((_, i) => i !== index);
    setEntry({ ...entry, lines: newLines });
  };

  const updateLine = (
    index: number,
    updates: Partial<{
      accountCode: string;
      description: string;
      debit: number;
      credit: number;
    }>,
  ) => {
    const newLines = [...entry.lines];
    newLines[index] = { ...newLines[index], ...updates };
    setEntry({ ...entry, lines: newLines });
  };
  const [payrollPeriod, setPayrollPeriod] = useState(toPeriod());
  const [payrollEstimates, setPayrollEstimates] = useState<PayrollEstimate[] | null>(null);
  const [isEstimating, setIsEstimating] = useState(false);
  const [isPosting, setIsPosting] = useState(false);
  const [journals, setJournals] = useState<FinanceJournalRow[]>([]);
  const [invoices, setInvoices] = useState<FinanceInvoiceRow[]>([]);
  const [payrollEntries, setPayrollEntries] = useState<PayrollEntry[]>([]);
  const [selectedJournal, setSelectedJournal] =
    useState<FinanceJournalRow | null>(null);
  const [selectedInvoice, setSelectedInvoice] =
    useState<FinanceInvoiceRow | null>(null);
  const [selectedPayroll, setSelectedPayroll] = useState<PayrollEntry | null>(
    null,
  );
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const clearStatus = () => {
    setStatusMessage(null);
    setErrorMessage(null);
  };

  const refreshLedger = useCallback(async () => {
    const [payrollRows, journalRows, invoiceRows] = await Promise.all([
      financeApiClient.getPayrollEntries(session.tenant_id, session),
      financeApiClient.listJournals(session.tenant_id, session),
      financeApiClient.listInvoices(session.tenant_id, session),
    ]);
    setPayrollEntries(payrollRows);
    setJournals(journalRows);
    setInvoices(invoiceRows);
  }, [session]);

  useEffect(() => {
    void refreshLedger();
  }, [refreshLedger]);

  const filteredJournals = useMemo(
    () =>
      (Array.isArray(journals) ? journals : []).filter((journal) =>
        search
          ? `${journal.account} ${journal.description}`
              .toLowerCase()
              .includes(search.toLowerCase())
          : true,
      ),
    [journals, search],
  );

  const filteredInvoices = useMemo(
    () =>
      (Array.isArray(invoices) ? invoices : []).filter((invoice) =>
        search
          ? `${invoice.vendor} ${invoice.id} ${invoice.kind}`
              .toLowerCase()
              .includes(search.toLowerCase())
          : true,
      ),
    [invoices, search],
  );

  const filteredPayroll = useMemo(
    () =>
      (Array.isArray(payrollEntries) ? payrollEntries : []).filter((payroll) =>
        search
          ? `${payroll.employeeId} ${payroll.period}`
              .toLowerCase()
              .includes(search.toLowerCase())
          : true,
      ),
    [payrollEntries, search],
  );

  const handleCreateJournal = async () => {
    if (!isBalanced) {
      setErrorMessage("Journal entry must be balanced (Debits = Credits).");
      return;
    }
    try {
      await financeApiClient.createJournal(session.tenant_id, session, entry);
      logService.log(
        session.tenant_id,
        session.user_id,
        "Created Journal Entry",
        `${entry.description} (${entry.lines.length} lines)`,
      );
      setStatusMessage(`Journal entry created successfully.`);
      setDialogOpen(false);
      setEntry({
        description: "",
        ref: "",
        lines: [
          { accountCode: "", description: "", debit: 0, credit: 0 },
          { accountCode: "", description: "", debit: 0, credit: 0 },
        ],
      });
      void refreshLedger();
    } catch (err) {
      setErrorMessage(
        "Failed to create journal entry. Access denied or invalid data.",
      );
    }
  };

  const calculateEstimates = async () => {
    setIsEstimating(true);
    setErrorMessage(null);
    try {
      const estimates = await financeApiClient.estimatePayroll(
        session.tenant_id,
        session,
        payrollPeriod,
      );
      setPayrollEstimates(estimates);
    } catch (err) {
      setErrorMessage("Failed to calculate payroll estimates.");
    } finally {
      setIsEstimating(false);
    }
  };

  const runPayrollPosting = async () => {
    setIsPosting(true);
    setErrorMessage(null);
    try {
      await financeApiClient.runPayroll(
        session.tenant_id,
        session,
        payrollPeriod,
      );

      setStatusMessage(
        `Payroll posting for period ${payrollPeriod} completed successfully.`,
      );
      setPayrollDialogOpen(false);
      setPayrollEstimates(null);
      void refreshLedger();
    } catch (err) {
      setErrorMessage("Payroll posting failed. Check department budgets.");
    } finally {
      setIsPosting(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Ledger Core"
        subtitle="Unified ledger workspace for journals, invoices, and payroll postings."
        primaryAction={
          <Button onClick={() => setDialogOpen(true)}>
            Create Journal Entry
          </Button>
        }
        secondaryActions={
          <Input
            placeholder="Search journals, invoices, or payroll"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="min-w-[220px]"
          />
        }
      />

      <FeedbackAlert
        message={statusMessage}
        error={errorMessage}
        onClear={clearStatus}
      />

      <WorkspacePanel
        title="Ledger Work Queue"
        description="Operational posting and review across accounting records."
      >
        <FilterBar searchValue={search} onSearchChange={setSearch} />
        <Tabs value={tab} onValueChange={(value) => setTab(value as LedgerTab)}>
          <TabsList>
            <TabsTrigger value="journals">Journals</TabsTrigger>
            <TabsTrigger value="invoices">Invoices</TabsTrigger>
            <TabsTrigger value="payroll">Payroll</TabsTrigger>
          </TabsList>

          <TabsContent value="journals" className="mt-4">
            <DataTableShell
              total={filteredJournals.length}
              page={1}
              pageSize={10}
            >
              <table className="w-full text-sm">
                <thead className="bg-muted/40 text-xs uppercase text-muted-foreground">
                  <tr>
                    <th className="p-3 text-left">ID</th>
                    <th className="p-3 text-left">Description</th>
                    <th className="p-3 text-right">Total Amount</th>
                    <th className="p-3 text-left">Date</th>
                    <th className="p-3 text-left">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredJournals.map((journal) => (
                    <tr
                      key={journal.id}
                      className="cursor-pointer border-t hover:bg-muted/50"
                      onClick={() => setSelectedJournal(journal)}
                    >
                      <td className="p-3 font-medium">
                        {journal.id.slice(0, 8)}
                      </td>
                      <td className="p-3">{journal.description}</td>
                      <td className="p-3 text-right font-mono">
                        {journal.amount.toLocaleString()}
                      </td>
                      <td className="p-3 text-muted-foreground">
                        {journal.createdAt.slice(0, 10)}
                      </td>
                      <td className="p-3">
                        <ApprovalStatusBadge status={journal.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </DataTableShell>
          </TabsContent>

          <TabsContent value="invoices" className="mt-4">
            <DataTableShell
              total={filteredInvoices.length}
              page={1}
              pageSize={10}
            >
              <table className="w-full text-sm">
                <thead className="bg-muted/40 text-xs uppercase text-muted-foreground">
                  <tr>
                    <th className="p-3 text-left">Direction</th>
                    <th className="p-3 text-left">Counterparty</th>
                    <th className="p-3 text-left">Amount</th>
                    <th className="p-3 text-left">Invoice Date</th>
                    <th className="p-3 text-left">Due Date</th>
                    <th className="p-3 text-left">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredInvoices.map((invoice) => (
                    <tr
                      key={invoice.id}
                      className="cursor-pointer border-t hover:bg-muted/50"
                      onClick={() => setSelectedInvoice(invoice)}
                    >
                      <td className="p-3">{invoice.kind}</td>
                      <td className="p-3">{invoice.vendor}</td>
                      <td className="p-3 text-muted-foreground">
                        {invoice.amount.toLocaleString()}
                      </td>
                      <td className="p-3 text-muted-foreground">
                        {invoice.invoiceDate}
                      </td>
                      <td className="p-3 text-muted-foreground">
                        {invoice.dueDate}
                      </td>
                      <td className="p-3">
                        <ApprovalStatusBadge status={invoice.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </DataTableShell>
          </TabsContent>

          <TabsContent value="payroll" className="mt-4">
            <div className="mb-4 flex justify-end">
              <Button onClick={() => setPayrollDialogOpen(true)}>
                Run Payroll Posting
              </Button>
            </div>
            <DataTableShell
              total={filteredPayroll.length}
              page={1}
              pageSize={10}
            >
              <table className="w-full text-sm">
                <thead className="bg-muted/40 text-xs uppercase text-muted-foreground">
                  <tr>
                    <th className="p-3 text-left">Period</th>
                    <th className="p-3 text-left">Batch</th>
                    <th className="p-3 text-left">Net Salary</th>
                    <th className="p-3 text-left">Purpose</th>
                    <th className="p-3 text-left">Status</th>
                    <th className="p-3 text-left">Updated</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPayroll.map((entryRow) => (
                    <tr
                      key={entryRow.id}
                      className="cursor-pointer border-t hover:bg-muted/50"
                      onClick={() => setSelectedPayroll(entryRow)}
                    >
                      <td className="p-3">{entryRow.period}</td>
                      <td className="p-3">{entryRow.employeeId}</td>
                      <td className="p-3 text-muted-foreground">
                        {entryRow.netSalary.toLocaleString()}
                      </td>
                      <td className="p-3 text-xs text-muted-foreground">
                        Standard Payroll Run
                      </td>
                      <td className="p-3">
                        <ApprovalStatusBadge
                          status={(entryRow.status || "PENDING").toUpperCase()}
                        />
                      </td>
                      <td className="p-3 text-muted-foreground">
                        {entryRow.updatedAt.slice(0, 10)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </DataTableShell>
          </TabsContent>
        </Tabs>
      </WorkspacePanel>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-6xl p-0 overflow-hidden">
          <div className="grid md:grid-cols-[1fr_3fr]">
            {/* Left Info Panel */}
            <div className="bg-muted p-6 flex flex-col justify-between border-r">
              <div>
                <BookOpen className="w-8 h-8 text-primary mb-4" />
                <DialogTitle className="text-xl mb-2">Create Journal Entry</DialogTitle>
                <p className="text-sm text-muted-foreground mb-6">
                  Post double-entry transactions directly to the General Ledger. Ensuring the accounting equation remains perfectly balanced.
                </p>
                <div className="space-y-4">
                  <div className="bg-background p-3 rounded-lg border shadow-sm">
                    <p className="text-xs text-muted-foreground uppercase font-semibold mb-1">Status</p>
                    <div className="flex items-center gap-2">
                      {isBalanced ? (
                        <><CheckCircle2 className="w-4 h-4 text-green-500" /> <span className="font-semibold text-sm text-green-600">Perfectly Balanced</span></>
                      ) : (
                        <><AlertTriangle className="w-4 h-4 text-destructive" /> <span className="font-semibold text-sm text-destructive">Imbalanced Entry</span></>
                      )}
                    </div>
                  </div>
                  <div className="bg-background p-3 rounded-lg border shadow-sm flex justify-between items-center">
                    <span className="text-xs text-muted-foreground uppercase font-semibold">Total Debits</span>
                    <span className="font-semibold text-sm">Rp {totalDebits.toLocaleString()}</span>
                  </div>
                  <div className="bg-background p-3 rounded-lg border shadow-sm flex justify-between items-center">
                    <span className="text-xs text-muted-foreground uppercase font-semibold">Total Credits</span>
                    <span className="font-semibold text-sm">Rp {totalCredits.toLocaleString()}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Form Panel */}
            <div className="p-6 overflow-y-auto max-h-[85vh]">
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-semibold uppercase text-muted-foreground">
                      Description
                    </label>
                    <Input
                      placeholder="e.g., Monthly Rent Adjustment"
                      value={entry.description}
                      onChange={(e) =>
                        setEntry({ ...entry, description: e.target.value })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-semibold uppercase text-muted-foreground">
                      Reference (Optional)
                    </label>
                    <Input
                      placeholder="REF-001"
                      value={entry.ref}
                      onChange={(e) => setEntry({ ...entry, ref: e.target.value })}
                    />
                  </div>
                </div>

                <div className="rounded-lg border shadow-sm">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/50 text-xs uppercase text-muted-foreground font-semibold">
                      <tr>
                        <th className="p-3 text-left">Account Code</th>
                        <th className="p-3 text-left">Line Description</th>
                        <th className="p-3 text-right">Debit</th>
                        <th className="p-3 text-right">Credit</th>
                        <th className="p-3 w-10"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {entry.lines.map((line, idx) => (
                        <tr key={idx} className="hover:bg-muted/20">
                          <td className="p-2">
                            <Input
                              placeholder="Account"
                              value={line.accountCode}
                              onChange={(e) =>
                                updateLine(idx, { accountCode: e.target.value })
                              }
                              className="h-8 border-none focus-visible:ring-0 shadow-none bg-transparent"
                            />
                          </td>
                          <td className="p-2">
                            <Input
                              placeholder="Description"
                              value={line.description}
                              onChange={(e) =>
                                updateLine(idx, { description: e.target.value })
                              }
                              className="h-8 border-none focus-visible:ring-0 shadow-none bg-transparent"
                            />
                          </td>
                          <td className="p-2">
                            <Input
                              type="number"
                              value={line.debit || ""}
                              onChange={(e) =>
                                updateLine(idx, {
                                  debit: Number(e.target.value),
                                  credit: 0,
                                })
                              }
                              className="h-8 border-none focus-visible:ring-0 shadow-none bg-transparent text-right"
                            />
                          </td>
                          <td className="p-2">
                            <Input
                              type="number"
                              value={line.credit || ""}
                              onChange={(e) =>
                                updateLine(idx, {
                                  credit: Number(e.target.value),
                                  debit: 0,
                                })
                              }
                              className="h-8 border-none focus-visible:ring-0 shadow-none bg-transparent text-right"
                            />
                          </td>
                          <td className="p-2 text-center">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 text-destructive"
                              onClick={() => removeLine(idx)}
                              disabled={entry.lines.length <= 2}
                            >
                              &times;
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="flex items-center justify-between border-t pt-4">
                  <Button variant="outline" size="sm" onClick={addLine} className="gap-2">
                    <Plus className="w-4 h-4" /> Add Line Item
                  </Button>
                  <div className="flex items-center gap-3">
                    <Button variant="outline" onClick={() => setDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button
                      onClick={handleCreateJournal}
                      disabled={!isBalanced || !entry.description}
                    >
                      Post to General Ledger
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={payrollDialogOpen} onOpenChange={setPayrollDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Run Payroll Posting</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="flex items-center gap-4">
              <div className="flex-1 space-y-1">
                <label className="text-xs font-medium text-muted-foreground uppercase">
                  Select Period
                </label>
                <Input
                  type="month"
                  value={payrollPeriod}
                  onChange={(event) => {
                    setPayrollPeriod(event.target.value);
                    setPayrollEstimates(null);
                  }}
                  disabled={isEstimating || isPosting}
                />
              </div>
              <div className="pt-5">
                <Button 
                  variant="secondary" 
                  onClick={calculateEstimates}
                  disabled={isEstimating || isPosting || !payrollPeriod}
                >
                  {isEstimating ? "Calculating..." : "Calculate Draft"}
                </Button>
              </div>
            </div>

            {payrollEstimates && (
              <div className="border rounded-md mt-4 overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-muted text-xs uppercase text-muted-foreground">
                    <tr>
                      <th className="p-3 text-left font-medium">Department</th>
                      <th className="p-3 text-right font-medium">Headcount</th>
                      <th className="p-3 text-right font-medium">Total Gross</th>
                      <th className="p-3 text-right font-medium">Total Net</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y text-right">
                    {payrollEstimates.map((est, i) => (
                      <tr key={i} className="hover:bg-muted/50 transition-colors">
                        <td className="p-3 text-left font-medium">{est.department}</td>
                        <td className="p-3">{est.employeeCount}</td>
                        <td className="p-3">${est.totalGross.toLocaleString()}</td>
                        <td className="p-3">${est.totalNet.toLocaleString()}</td>
                      </tr>
                    ))}
                    {payrollEstimates.length === 0 && (
                      <tr>
                        <td colSpan={4} className="p-6 text-center text-muted-foreground">
                          No active employees found for this period.
                        </td>
                      </tr>
                    )}
                  </tbody>
                  {payrollEstimates.length > 0 && (
                    <tfoot className="bg-muted/30 font-bold divide-y text-right">
                      <tr>
                        <td className="p-3 text-left">Totals</td>
                        <td className="p-3">
                          {payrollEstimates.reduce((sum, e) => sum + e.employeeCount, 0)}
                        </td>
                        <td className="p-3 border-t">
                          ${payrollEstimates.reduce((sum, e) => sum + e.totalGross, 0).toLocaleString()}
                        </td>
                        <td className="p-3 border-t">
                          ${payrollEstimates.reduce((sum, e) => sum + e.totalNet, 0).toLocaleString()}
                        </td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            )}

            <div className="flex justify-end gap-3 pt-4 border-t mt-4">
              <Button 
                variant="outline" 
                onClick={() => setPayrollDialogOpen(false)}
                disabled={isEstimating || isPosting}
              >
                Cancel
              </Button>
              <Button 
                onClick={runPayrollPosting}
                disabled={isEstimating || isPosting || !payrollEstimates || payrollEstimates.length === 0}
              >
                {isPosting ? "Posting to Ledger..." : "Confirm & Post"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Journal Detail Dialog */}
      <Dialog
        open={!!selectedJournal}
        onOpenChange={() => setSelectedJournal(null)}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Journal Entry Details</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="grid grid-cols-2 text-sm gap-y-2 border-b pb-4">
              <span className="text-muted-foreground font-semibold uppercase text-xs">
                Journal ID
              </span>
              <span className="font-mono">{selectedJournal?.id}</span>
              <span className="text-muted-foreground font-semibold uppercase text-xs">
                Description
              </span>
              <span className="font-semibold">
                {selectedJournal?.description}
              </span>
              <span className="text-muted-foreground font-semibold uppercase text-xs">
                Created At
              </span>
              <span>{selectedJournal?.createdAt}</span>
              <span className="text-muted-foreground font-semibold uppercase text-xs">
                Status
              </span>
              <span>
                <ApprovalStatusBadge
                  status={selectedJournal?.status || "POSTED"}
                />
              </span>
            </div>

            <div className="rounded border">
              <table className="w-full text-xs">
                <thead className="bg-muted/50 uppercase text-muted-foreground font-semibold">
                  <tr>
                    <th className="p-2 text-left">Account</th>
                    <th className="p-2 text-left">Description</th>
                    <th className="p-2 text-right">Debit</th>
                    <th className="p-2 text-right">Credit</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {selectedJournal?.lines?.map((line, idx) => (
                    <tr key={idx}>
                      <td className="p-2 font-medium">{line.accountCode}</td>
                      <td className="p-2">{line.description}</td>
                      <td className="p-2 text-right">
                        {line.debit > 0 ? line.debit.toLocaleString() : "-"}
                      </td>
                      <td className="p-2 text-right">
                        {line.credit > 0 ? line.credit.toLocaleString() : "-"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Invoice Detail Dialog */}
      <Dialog
        open={!!selectedInvoice}
        onOpenChange={() => setSelectedInvoice(null)}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Invoice Record Detail</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="grid grid-cols-2 text-sm gap-y-2">
              <span className="text-muted-foreground">Invoice ID:</span>
              <span>{selectedInvoice?.id}</span>
              <span className="text-muted-foreground">Direction:</span>
              <span>{selectedInvoice?.kind}</span>
              <span className="text-muted-foreground">Counterparty:</span>
              <span className="font-semibold">{selectedInvoice?.vendor}</span>
              <span className="text-muted-foreground">Amount:</span>
              <span className="font-bold">
                {selectedInvoice?.amount.toLocaleString()}
              </span>
              <span className="text-muted-foreground">Date:</span>
              <span>{selectedInvoice?.invoiceDate}</span>
              <span className="text-muted-foreground">Due Date:</span>
              <span>{selectedInvoice?.dueDate}</span>
              <span className="text-muted-foreground">Status:</span>
              <span>
                <ApprovalStatusBadge
                  status={selectedInvoice?.status || "PENDING"}
                />
              </span>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Payroll Detail Dialog */}
      <Dialog
        open={!!selectedPayroll}
        onOpenChange={() => setSelectedPayroll(null)}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Payroll Batch Detail</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="grid grid-cols-2 text-sm gap-y-2">
              <span className="text-muted-foreground">Batch ID:</span>
              <span>{selectedPayroll?.id}</span>
              <span className="text-muted-foreground">Period:</span>
              <span className="font-semibold">{selectedPayroll?.period}</span>
              <span className="text-muted-foreground">Net Amount:</span>
              <span className="font-bold">
                {selectedPayroll?.netSalary.toLocaleString()}
              </span>
              <span className="text-muted-foreground">Employee Reference:</span>
              <span>{selectedPayroll?.employeeId}</span>
              <span className="text-muted-foreground">Purpose:</span>
              <span className="text-blue-600 font-medium">
                Standard Payroll Run / Monthly Disbursement
              </span>
              <span className="text-muted-foreground">Status:</span>
              <span>
                <ApprovalStatusBadge
                  status={selectedPayroll?.status.toUpperCase() || "APPROVED"}
                />
              </span>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
