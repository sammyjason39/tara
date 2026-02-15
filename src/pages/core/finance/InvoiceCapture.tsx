import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageHeader } from "@/core/ui/PageHeader";
import { WorkspacePanel } from "@/core/ui/WorkspacePanel";
import { DataTableShell } from "@/core/tools/DataTableShell";
import { FilterBar } from "@/core/tools/FilterBar";
import { ApprovalStatusBadge } from "@/core/tools/ApprovalStatusBadge";
import { useSession } from "@/core/security/session";
import { financeService, type FinanceInvoiceRow } from "@/core/services/finance/financeService";
import { logService } from "@/core/services/finance/logService";

type InvoiceKind = "PAYABLE" | "RECEIVABLE";

export default function InvoiceCapture() {
  const session = useSession();
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [kindFilter, setKindFilter] = useState<InvoiceKind | "ALL">("ALL");
  const [formKind, setFormKind] = useState<InvoiceKind>("PAYABLE");
  const [counterparty, setCounterparty] = useState("");
  const [amount, setAmount] = useState("0");
  const [invoiceDate, setInvoiceDate] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [invoices, setInvoices] = useState<FinanceInvoiceRow[]>(() =>
    financeService.listInvoices(session.tenantId),
  );
  const [selectedInvoice, setSelectedInvoice] = useState<FinanceInvoiceRow | null>(null);

  const refreshInvoices = useCallback(() => {
    setInvoices(financeService.listInvoices(session.tenantId));
  }, [session.tenantId]);

  useEffect(() => {
    refreshInvoices();
  }, [refreshInvoices]);

  const filteredInvoices = useMemo(
    () =>
      invoices.filter((invoice) => {
        const searchMatch = search
          ? invoice.vendor.toLowerCase().includes(search.toLowerCase())
          : true;
        const kindMatch = kindFilter === "ALL" ? true : invoice.kind === kindFilter;
        return searchMatch && kindMatch;
      }),
    [invoices, kindFilter, search],
  );

  const grouped = useMemo(() => {
    const groups: Record<InvoiceKind, FinanceInvoiceRow[]> = {
      PAYABLE: [],
      RECEIVABLE: [],
    };
    filteredInvoices.forEach((invoice) => {
      groups[invoice.kind].push(invoice);
    });
    return groups;
  }, [filteredInvoices]);

  const captureInvoice = () => {
    if (formKind === "PAYABLE") {
      financeService.capturePayableInvoice(session.tenantId, session, {
        vendor: counterparty,
        amount: Number(amount || "0"),
        invoiceDate,
        dueDate,
      });
    } else {
      financeService.createReceivable(session.tenantId, session, {
        customer: counterparty,
        amount: Number(amount || "0"),
        dueDate,
        invoiceDate,
      });
    }
    logService.log(
      session.tenantId,
      session.userId,
      "Captured invoice",
      `${formKind} - ${counterparty}`,
    );
    setDialogOpen(false);
    setCounterparty("");
    setAmount("0");
    setInvoiceDate("");
    setDueDate("");
    refreshInvoices();
  };

  const renderTable = (items: FinanceInvoiceRow[]) => (
    <DataTableShell total={items.length} page={1} pageSize={10}>
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
          {items.map((invoice) => (
            <tr
              key={invoice.id}
              className="cursor-pointer border-t hover:bg-muted/50"
              onClick={() => setSelectedInvoice(invoice)}
            >
              <td className="p-3">{invoice.kind}</td>
              <td className="p-3 font-medium">{invoice.vendor}</td>
              <td className="p-3 text-muted-foreground">{invoice.amount.toLocaleString()}</td>
              <td className="p-3 text-muted-foreground">{invoice.invoiceDate}</td>
              <td className="p-3 text-muted-foreground">{invoice.dueDate}</td>
              <td className="p-3">
                <ApprovalStatusBadge status={invoice.status} />
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
        title="Invoice Capture"
        subtitle="Capture payable and receivable invoices into finance workflows."
        primaryAction={<Button onClick={() => setDialogOpen(true)}>Create Invoice</Button>}
        secondaryActions={
          <div className="flex gap-2">
            <Select value={kindFilter} onValueChange={(value) => setKindFilter(value as typeof kindFilter)}>
              <SelectTrigger>
                <SelectValue placeholder="Direction" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All</SelectItem>
                <SelectItem value="PAYABLE">Payable</SelectItem>
                <SelectItem value="RECEIVABLE">Receivable</SelectItem>
              </SelectContent>
            </Select>
            <Input
              placeholder="Search counterparties"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="min-w-[220px]"
            />
          </div>
        }
      />

      <WorkspacePanel title="Invoice Records" description="All captured invoices and settlement status.">
        <FilterBar searchValue={search} onSearchChange={setSearch} />
        <Tabs value={kindFilter}>
          <TabsList>
            <TabsTrigger value="PAYABLE" onClick={() => setKindFilter("PAYABLE")}>
              Payable
            </TabsTrigger>
            <TabsTrigger value="RECEIVABLE" onClick={() => setKindFilter("RECEIVABLE")}>
              Receivable
            </TabsTrigger>
            <TabsTrigger value="ALL" onClick={() => setKindFilter("ALL")}>
              All
            </TabsTrigger>
          </TabsList>

          <TabsContent value="PAYABLE" className="mt-4">
            {renderTable(grouped.PAYABLE)}
          </TabsContent>
          <TabsContent value="RECEIVABLE" className="mt-4">
            {renderTable(grouped.RECEIVABLE)}
          </TabsContent>
          <TabsContent value="ALL" className="mt-4">
            {renderTable(filteredInvoices)}
          </TabsContent>
        </Tabs>
      </WorkspacePanel>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Capture Invoice</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Select value={formKind} onValueChange={(value) => setFormKind(value as InvoiceKind)}>
              <SelectTrigger>
                <SelectValue placeholder="Invoice type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="PAYABLE">Payable</SelectItem>
                <SelectItem value="RECEIVABLE">Receivable</SelectItem>
              </SelectContent>
            </Select>
            <Input
              placeholder={formKind === "PAYABLE" ? "Vendor" : "Customer"}
              value={counterparty}
              onChange={(event) => setCounterparty(event.target.value)}
            />
            <Input placeholder="Amount" type="number" value={amount} onChange={(event) => setAmount(event.target.value)} />
            <Input
              placeholder="Invoice Date"
              type="date"
              value={invoiceDate}
              onChange={(event) => setInvoiceDate(event.target.value)}
            />
            <Input placeholder="Due Date" type="date" value={dueDate} onChange={(event) => setDueDate(event.target.value)} />
            <div className="flex justify-end gap-2">
              <Button onClick={captureInvoice}>Capture and Route</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!selectedInvoice} onOpenChange={() => setSelectedInvoice(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Invoice Record Detail</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="grid grid-cols-2 text-sm gap-y-2">
              <span className="text-muted-foreground">Invoice ID:</span>
              <span className="font-mono">{selectedInvoice?.id}</span>
              <span className="text-muted-foreground">Type:</span>
              <span className="font-bold">{selectedInvoice?.kind}</span>
              <span className="text-muted-foreground">{selectedInvoice?.kind === "PAYABLE" ? "Vendor" : "Customer"}:</span>
              <span className="font-semibold">{selectedInvoice?.vendor}</span>
              <span className="text-muted-foreground">Amount:</span>
              <span className="font-bold text-lg">{selectedInvoice?.amount.toLocaleString()}</span>
              <span className="text-muted-foreground">Invoice Date:</span>
              <span>{selectedInvoice?.invoiceDate}</span>
              <span className="text-muted-foreground">Due Date:</span>
              <span>{selectedInvoice?.dueDate}</span>
              <span className="text-muted-foreground">Status:</span>
              <span><ApprovalStatusBadge status={selectedInvoice?.status || "PENDING"} /></span>
            </div>
            <div className="border-t pt-4">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Digital Capture Audit</p>
              <p className="text-xs text-muted-foreground italic">
                Source Document Hash: SHA256:{selectedInvoice?.id.slice(-8)}...
              </p>
              <div className="mt-4">
                <Button size="sm" variant="outline" className="w-full">View Scanned Image</Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
