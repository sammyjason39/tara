// src/pages/core/finance/InvoiceCapture.tsx
import { useMemo, useState } from "react";
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
import { useSession } from "@/core/security/session";
import { financeService } from "@/core/services/finance/financeService";
import { logService } from "@/core/services/logService";

export default function InvoiceCapture() {
  const session = useSession();
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [invoiceForm, setInvoiceForm] = useState({
    vendor: "",
    amount: 0,
    invoiceDate: "",
    dueDate: "",
    file: null as File | null,
  });

  // Fetch invoices
  const invoices = useMemo(
    () => financeService.listInvoices(session.tenantId),
    [session],
  );

  const filteredInvoices = invoices.filter((inv) =>
    search ? inv.vendor.toLowerCase().includes(search.toLowerCase()) : true,
  );

  const handleUploadInvoice = () => {
    if (!invoiceForm.file) return;
    financeService.captureInvoice(session.tenantId, {
      vendor: invoiceForm.vendor,
      amount: invoiceForm.amount,
      invoiceDate: invoiceForm.invoiceDate,
      dueDate: invoiceForm.dueDate,
      file: invoiceForm.file,
    });
    logService.log(
      session.tenantId,
      session.userId,
      `Captured invoice: ${invoiceForm.vendor} - ${invoiceForm.amount}`,
    );
    setDialogOpen(false);
    setInvoiceForm({
      vendor: "",
      amount: 0,
      invoiceDate: "",
      dueDate: "",
      file: null,
    });
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Invoice Capture"
        subtitle="Upload and capture invoices for processing, approval, and payment."
        primaryAction={
          <Button onClick={() => setDialogOpen(true)}>New Invoice</Button>
        }
        secondaryActions={
          <Input
            placeholder="Search invoices"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="min-w-[220px]"
          />
        }
      />

      <WorkspacePanel
        title="Invoice List"
        description="All captured invoices with status and details."
      >
        <FilterBar searchValue={search} onSearchChange={setSearch} />
        <DataTableShell total={filteredInvoices.length} page={1} pageSize={10}>
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-xs uppercase text-muted-foreground">
              <tr>
                <th className="p-3 text-left">Vendor</th>
                <th className="p-3 text-left">Amount</th>
                <th className="p-3 text-left">Invoice Date</th>
                <th className="p-3 text-left">Due Date</th>
                <th className="p-3 text-left">Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredInvoices.map((inv) => (
                <tr key={inv.id} className="border-t">
                  <td className="p-3 font-medium">{inv.vendor}</td>
                  <td className="p-3 text-muted-foreground">
                    {inv.amount.toLocaleString()}
                  </td>
                  <td className="p-3 text-muted-foreground">
                    {inv.invoiceDate}
                  </td>
                  <td className="p-3 text-muted-foreground">{inv.dueDate}</td>
                  <td className="p-3">
                    <ApprovalStatusBadge status={inv.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </DataTableShell>
      </WorkspacePanel>

      {/* Dialog: New Invoice */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Capture Invoice</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Input
              placeholder="Vendor"
              value={invoiceForm.vendor}
              onChange={(e) =>
                setInvoiceForm({ ...invoiceForm, vendor: e.target.value })
              }
            />
            <Input
              placeholder="Amount"
              type="number"
              value={invoiceForm.amount}
              onChange={(e) =>
                setInvoiceForm({
                  ...invoiceForm,
                  amount: Number(e.target.value),
                })
              }
            />
            <Input
              placeholder="Invoice Date (YYYY-MM-DD)"
              type="date"
              value={invoiceForm.invoiceDate}
              onChange={(e) =>
                setInvoiceForm({ ...invoiceForm, invoiceDate: e.target.value })
              }
            />
            <Input
              placeholder="Due Date (YYYY-MM-DD)"
              type="date"
              value={invoiceForm.dueDate}
              onChange={(e) =>
                setInvoiceForm({ ...invoiceForm, dueDate: e.target.value })
              }
            />
            <Input
              type="file"
              onChange={(e) =>
                setInvoiceForm({
                  ...invoiceForm,
                  file: e.target.files?.[0] ?? null,
                })
              }
            />
            <div className="flex justify-end gap-2">
              <Button onClick={handleUploadInvoice}>Upload & Route</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
