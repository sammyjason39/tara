// src/pages/core/finance/FinanceDocs.tsx
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
import { useSession } from "@/core/security/session";
import { financeService } from "@/core/services/finance/financeService";
import { workflowService } from "@/core/services/hr/workflowService";
import { logService } from "@/core/services/finance/logService";

export default function FinanceDocs() {
  const session = useSession();
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [docForm, setDocForm] = useState({
    title: "",
    type: "INVOICE",
    description: "",
    file: null as File | null,
  });

  // Fetch finance documents
  const documents = useMemo(
    () => financeService.listDocuments(session.tenantId),
    [session],
  );

  const filteredDocs = documents.filter((d) =>
    search ? d.title.toLowerCase().includes(search.toLowerCase()) : true,
  );

  const handleUploadDoc = () => {
    if (!docForm.file) return;
    financeService.uploadDocument(session.tenantId, {
      title: docForm.title,
      type: docForm.type,
      description: docForm.description,
      file: docForm.file,
    });
    logService.log(
      session.tenantId,
      session.userId,
      `Uploaded document: ${docForm.title}`,
    );
    setDialogOpen(false);
    setDocForm({ title: "", type: "INVOICE", description: "", file: null });
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Finance Docs"
        subtitle="Manage all finance documents: invoices, receipts, contracts, and audit attachments."
        primaryAction={
          <Button onClick={() => setDialogOpen(true)}>Upload Document</Button>
        }
        secondaryActions={
          <Input
            placeholder="Search documents"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="min-w-[220px]"
          />
        }
      />

      <WorkspacePanel
        title="Document List"
        description="All finance documents with status and type."
      >
        <FilterBar searchValue={search} onSearchChange={setSearch} />
        <DataTableShell total={filteredDocs.length} page={1} pageSize={10}>
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-xs uppercase text-muted-foreground">
              <tr>
                <th className="p-3 text-left">Title</th>
                <th className="p-3 text-left">Type</th>
                <th className="p-3 text-left">Description</th>
                <th className="p-3 text-left">Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredDocs.map((d) => (
                <tr key={d.id} className="border-t">
                  <td className="p-3 font-medium">{d.title}</td>
                  <td className="p-3 text-muted-foreground">{d.type}</td>
                  <td className="p-3 text-muted-foreground">{d.description}</td>
                  <td className="p-3">
                    <ApprovalStatusBadge status={d.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </DataTableShell>
      </WorkspacePanel>

      {/* Dialog: Upload Document */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Upload Finance Document</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Input
              placeholder="Title"
              value={docForm.title}
              onChange={(e) =>
                setDocForm({ ...docForm, title: e.target.value })
              }
            />
            <Select
              value={docForm.type}
              onValueChange={(v) => setDocForm({ ...docForm, type: v })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Document Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="INVOICE">Invoice</SelectItem>
                <SelectItem value="RECEIPT">Receipt</SelectItem>
                <SelectItem value="CONTRACT">Contract</SelectItem>
                <SelectItem value="PAYMENT_PROOF">Payment Proof</SelectItem>
                <SelectItem value="TAX">Tax Document</SelectItem>
                <SelectItem value="JOURNAL_ENTRY">Journal Entry</SelectItem>
              </SelectContent>
            </Select>
            <Input
              placeholder="Description"
              value={docForm.description}
              onChange={(e) =>
                setDocForm({ ...docForm, description: e.target.value })
              }
            />
            <Input
              type="file"
              onChange={(e) =>
                setDocForm({ ...docForm, file: e.target.files?.[0] ?? null })
              }
            />
            <div className="flex justify-end gap-2">
              <Button onClick={handleUploadDoc}>Upload & Route</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
