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
import { financeService, type FinanceDocumentRow } from "@/core/services/finance/financeService";
import { logService } from "@/core/services/finance/logService";

type DocumentTab = "ALL" | "PENDING" | "APPROVED" | "REJECTED";

const TABS: DocumentTab[] = ["ALL", "PENDING", "APPROVED", "REJECTED"];

export default function FinanceDocs() {
  const session = useSession();
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState<DocumentTab>("ALL");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [type, setType] = useState("INVOICE");
  const [description, setDescription] = useState("");
  const [docs, setDocs] = useState<FinanceDocumentRow[]>(() =>
    financeService.listDocuments(session.tenantId),
  );
  const [selectedItem, setSelectedItem] = useState<FinanceDocumentRow | null>(null);

  const refreshDocs = useCallback(() => {
    setDocs(financeService.listDocuments(session.tenantId));
  }, [session.tenantId]);

  useEffect(() => {
    refreshDocs();
  }, [refreshDocs]);

  const filteredDocs = useMemo(
    () =>
      docs.filter((doc) => {
        const searchMatch = search ? doc.title.toLowerCase().includes(search.toLowerCase()) : true;
        const tabMatch = tab === "ALL" ? true : doc.status === tab;
        return searchMatch && tabMatch;
      }),
    [docs, search, tab],
  );

  const uploadDoc = () => {
    financeService.uploadDocumentForApproval(session.tenantId, session, {
      title,
      type,
      description,
      file: null,
    });
    logService.log(session.tenantId, session.userId, "Uploaded finance document", title);
    setDialogOpen(false);
    setTitle("");
    setType("INVOICE");
    setDescription("");
    refreshDocs();
  };

  const updateStatus = (id: string, status: "APPROVED" | "REJECTED") => {
    financeService.updateDocumentStatus(session.tenantId, id, status);
    logService.log(session.tenantId, session.userId, "Updated finance document status", `${id} -> ${status}`);
    refreshDocs();
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Finance Docs"
        subtitle="Document control with route-to-approval and audit-ready status tracking."
        primaryAction={<Button onClick={() => setDialogOpen(true)}>Upload Document</Button>}
        secondaryActions={
          <Input
            placeholder="Search documents"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="min-w-[220px]"
          />
        }
      />

      <WorkspacePanel title="Documents Work Queue" description="Document inbox by approval stage.">
        <FilterBar searchValue={search} onSearchChange={setSearch} />
        <Tabs value={tab} onValueChange={(value) => setTab(value as DocumentTab)}>
          <TabsList>
            {TABS.map((status) => (
              <TabsTrigger key={status} value={status}>
                {status.charAt(0) + status.slice(1).toLowerCase()}
              </TabsTrigger>
            ))}
          </TabsList>

          {TABS.map((status) => (
            <TabsContent key={status} value={status} className="mt-4">
              <DataTableShell total={filteredDocs.length} page={1} pageSize={10}>
                <table className="w-full text-sm">
                  <thead className="bg-muted/40 text-xs uppercase text-muted-foreground">
                    <tr>
                      <th className="p-3 text-left">Title</th>
                      <th className="p-3 text-left">Type</th>
                      <th className="p-3 text-left">Description</th>
                      <th className="p-3 text-left">Status</th>
                      <th className="p-3 text-left">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredDocs.map((doc) => (
                      <tr
                        key={doc.id}
                        className="cursor-pointer border-t hover:bg-muted/50"
                        onClick={() => setSelectedItem(doc)}
                      >
                        <td className="p-3 font-medium">{doc.title}</td>
                        <td className="p-3 text-muted-foreground">{doc.type}</td>
                        <td className="p-3 text-muted-foreground">{doc.description}</td>
                        <td className="p-3">
                          <ApprovalStatusBadge status={doc.status} />
                        </td>
                        <td className="p-3">
                          {doc.status === "PENDING" ? (
                            <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                              <Button size="sm" variant="outline" onClick={() => updateStatus(doc.id, "APPROVED")}>
                                Approve
                              </Button>
                              <Button size="sm" variant="destructive" onClick={() => updateStatus(doc.id, "REJECTED")}>
                                Reject
                              </Button>
                            </div>
                          ) : null}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </DataTableShell>
            </TabsContent>
          ))}
        </Tabs>
      </WorkspacePanel>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Upload Finance Document</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Input placeholder="Title" value={title} onChange={(event) => setTitle(event.target.value)} />
            <Select value={type} onValueChange={setType}>
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
            <Input placeholder="Description" value={description} onChange={(event) => setDescription(event.target.value)} />
            <div className="space-y-1">
              <span className="text-xs text-muted-foreground uppercase font-bold">Attachment</span>
              <Input type="file" onChange={() => {}} />
            </div>
            <div className="flex justify-end gap-2">
              <Button onClick={uploadDoc}>Upload and Route</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!selectedItem} onOpenChange={() => setSelectedItem(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Document Detail</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="grid grid-cols-2 text-sm gap-y-2">
              <span className="text-muted-foreground">Document ID:</span>
              <span>{selectedItem?.id}</span>
              <span className="text-muted-foreground">Title:</span>
              <span className="font-semibold">{selectedItem?.title}</span>
              <span className="text-muted-foreground">Type:</span>
              <span className="uppercase">{selectedItem?.type}</span>
              <span className="text-muted-foreground">Description:</span>
              <span>{selectedItem?.description}</span>
              <span className="text-muted-foreground">Status:</span>
              <span><ApprovalStatusBadge status={selectedItem?.status || "PENDING"} /></span>
              <span className="text-muted-foreground">Uploaded At:</span>
              <span>{selectedItem?.uploadedAt.slice(0, 10)}</span>
              <span className="text-muted-foreground">Uploaded By:</span>
              <span>{selectedItem?.uploadedBy || "System"}</span>
            </div>
            <div className="border-t pt-4">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Storage Info</p>
              <p className="text-xs text-muted-foreground italic">
                Vault Location: /finance/ledger-docs/{selectedItem?.id}.pdf
              </p>
              <div className="mt-4">
                <Button size="sm" variant="outline" className="w-full">Download Source File</Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
