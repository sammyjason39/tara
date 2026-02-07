import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PageHeader } from "@/core/ui/PageHeader";
import { WorkspacePanel } from "@/core/ui/WorkspacePanel";
import { DataTableShell } from "@/core/tools/DataTableShell";
import { FilterBar } from "@/core/tools/FilterBar";
import { useSession } from "@/core/security/session";
import { documentService } from "@/core/services/hr/documentService";
import { legalService } from "@/core/services/hr/legalService";
import { workflowService } from "@/core/services/hr/workflowService";

export default function VaultSpace() {
  const session = useSession();
  const [search, setSearch] = useState("");
  const [version, setVersion] = useState(0);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [actionType, setActionType] = useState<"contract" | "export" | "attach">("contract");
  const [docTitle, setDocTitle] = useState("HR Document");
  const [docType, setDocType] = useState<"CONTRACT" | "VISA_FILE" | "POLICY" | "PAYROLL_EXPORT" | "KPI_REPORT">("CONTRACT");
  const [notes, setNotes] = useState("");

  const documents = useMemo(() => {
    const items = documentService.listVaultItems(session.tenantId, session);
    if (!search) return items;
    return items.filter((item) => item.title.toLowerCase().includes(search.toLowerCase()));
  }, [session, search, version]);

  const compliance = useMemo(() => legalService.getComplianceCases(session.tenantId, session), [session]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="VaultSpace"
        subtitle="Secure HR document vault and compliance-ready storage."
        primaryAction={
          <Button
            onClick={() => {
              documentService.createVaultItem(session.tenantId, session, {
                title: "Employment Pack",
                type: "CONTRACT",
              });
              setVersion((prev) => prev + 1);
            }}
          >
            Create Folder
          </Button>
        }
        secondaryActions={<Input placeholder="Search vault" className="min-w-[200px]" value={search} onChange={(e) => setSearch(e.target.value)} />}
      />

      <WorkspacePanel title="WorkQueue" description="Document actions and approvals.">
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            onClick={() => {
              setActionType("contract");
              setDocTitle("Employment Contract");
              setDocType("CONTRACT");
              setDialogOpen(true);
            }}
          >
            Generate Contract
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              documentService.exportVault(session.tenantId, session);
            }}
          >
            Export Staff Report
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              setActionType("attach");
              setDocTitle("HR Policy");
              setDocType("POLICY");
              setDialogOpen(true);
            }}
          >
            Attach Document
          </Button>
        </div>
      </WorkspacePanel>

      <WorkspacePanel title="Active Records" description="Document vault inventory.">
        <FilterBar searchValue={search} onSearchChange={setSearch} />
        <DataTableShell total={documents.length} page={1} pageSize={10}>
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-xs uppercase text-muted-foreground">
              <tr>
                <th className="p-3 text-left">Document</th>
                <th className="p-3 text-left">Type</th>
                <th className="p-3 text-left">Status</th>
              </tr>
            </thead>
            <tbody>
              {documents.map((doc) => (
                <tr key={doc.id} className="border-t">
                  <td className="p-3 font-medium text-foreground">{doc.title}</td>
                  <td className="p-3 text-muted-foreground">{doc.type}</td>
                  <td className="p-3 text-muted-foreground">{doc.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </DataTableShell>
      </WorkspacePanel>

      <div className="grid gap-6 lg:grid-cols-[1fr_0.8fr]">
        <WorkspacePanel title="Pending Approvals" description="Legal approvals for documents.">
          <div className="space-y-3 text-sm text-muted-foreground">
            {compliance.contracts.slice(0, 3).map((contract) => (
              <div key={contract.id} className="flex items-center justify-between rounded-lg border p-3">
                <span>{contract.title}</span>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    workflowService.createRequest(session.tenantId, session, {
                      entityType: "CONTRACT",
                      entityId: contract.id,
                      makerDept: session.departmentId,
                      destinationDept: "LEGAL",
                      notes: "VaultSpace routing",
                    });
                  }}
                >
                  Send to FlowGate
                </Button>
              </div>
            ))}
          </div>
        </WorkspacePanel>

        <WorkspacePanel title="Insights" description="Vault health and compliance.">
          <div className="space-y-3 text-sm text-muted-foreground">
            <div className="flex items-center justify-between rounded-lg border p-3">
              <span>Total documents</span>
              <span className="font-semibold text-foreground">{documents.length}</span>
            </div>
            <div className="flex items-center justify-between rounded-lg border p-3">
              <span>Pending renewals</span>
              <span className="font-semibold text-foreground">{compliance.pendingRenewals}</span>
            </div>
          </div>
        </WorkspacePanel>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Document Action</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Input value={docTitle} onChange={(e) => setDocTitle(e.target.value)} />
            <Select value={docType} onValueChange={(value) => setDocType(value as typeof docType)}>
              <SelectTrigger>
                <SelectValue placeholder="Document type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="CONTRACT">Contract</SelectItem>
                <SelectItem value="VISA_FILE">Visa File</SelectItem>
                <SelectItem value="POLICY">Policy</SelectItem>
                <SelectItem value="PAYROLL_EXPORT">Payroll Export</SelectItem>
                <SelectItem value="KPI_REPORT">KPI Report</SelectItem>
              </SelectContent>
            </Select>
            <Textarea
              placeholder="Notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
            <Button
              onClick={() => {
                if (actionType === "contract") {
                  legalService.createContract(session.tenantId, session, {
                    title: docTitle,
                    type: "internal",
                    status: "draft",
                  });
                }
                if (actionType === "attach") {
                  documentService.attachDocument(session.tenantId, session, {
                    title: docTitle,
                    type: docType,
                    metadata: notes ? { notes } : undefined,
                  });
                }
                setDialogOpen(false);
                setNotes("");
                setVersion((prev) => prev + 1);
              }}
            >
              Confirm
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
