import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PageHeader } from "@/core/ui/PageHeader";
import { WorkspacePanel } from "@/core/ui/WorkspacePanel";
import { DataTableShell } from "@/core/tools/DataTableShell";
import { FilterBar } from "@/core/tools/FilterBar";
import { useSession } from "@/core/security/session";
import { legalService } from "@/core/services/hr/legalService";
import { workflowService } from "@/core/services/hr/workflowService";
import { buildTemplatePreview, contractTemplates } from "@/core/tools/docs/TemplateEngine";
import { DocumentViewer } from "@/core/tools/docs/DocumentViewer";

export default function LexBoard() {
  const session = useSession();
  const [version, setVersion] = useState(0);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState(contractTemplates[0]?.id ?? "tpl-employment");
  const [search, setSearch] = useState("");
  const compliance = useMemo(() => legalService.getComplianceCases(session.tenantId, session), [session, version]);
  const filteredContracts = compliance.contracts.filter((contract) =>
    search ? contract.title.toLowerCase().includes(search.toLowerCase()) : true,
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="LexBoard"
        subtitle="Contract intelligence, visa tracking, and compliance routing."
        primaryAction={
          <Button onClick={() => setDialogOpen(true)}>Create Contract</Button>
        }
        secondaryActions={<Input placeholder="Search contracts" className="min-w-[200px]" value={search} onChange={(e) => setSearch(e.target.value)} />}
      />

      <WorkspacePanel title="WorkQueue" description="Legal actions that require follow-up.">
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            onClick={() => {
              const target = compliance.contracts[0];
              if (target) {
                workflowService.createRequest(session.tenantId, session, {
                  entityType: "CONTRACT",
                  entityId: target.id,
                  makerDept: session.departmentId,
                  destinationDept: "LEGAL",
                  notes: "LexBoard routing",
                });
              }
            }}
          >
            Send to FlowGate
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              const target = compliance.contracts[0];
              if (target) {
                legalService.requestRenewal(session.tenantId, session, target.id);
                setVersion((prev) => prev + 1);
              }
            }}
          >
            Request Renewal
          </Button>
        </div>
      </WorkspacePanel>

      <WorkspacePanel title="Active Records" description="Contracts and visa tracking.">
        <FilterBar searchValue={search} onSearchChange={setSearch} />
        <DataTableShell total={filteredContracts.length} page={1} pageSize={10}>
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-xs uppercase text-muted-foreground">
              <tr>
                <th className="p-3 text-left">Contract</th>
                <th className="p-3 text-left">Type</th>
                <th className="p-3 text-left">Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredContracts.map((contract) => (
                <tr key={contract.id} className="border-t">
                  <td className="p-3">{contract.title}</td>
                  <td className="p-3 text-muted-foreground">{contract.type}</td>
                  <td className="p-3 text-muted-foreground">{contract.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </DataTableShell>
      </WorkspacePanel>

      <div className="grid gap-6 lg:grid-cols-[1fr_0.8fr]">
        <WorkspacePanel title="Pending Approvals" description="Legal workflow queue.">
          <div className="space-y-3 text-sm text-muted-foreground">
            {compliance.contracts.slice(0, 4).map((contract) => (
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
                      notes: "LexBoard approval",
                    });
                  }}
                >
                  Route
                </Button>
              </div>
            ))}
          </div>
        </WorkspacePanel>

        <WorkspacePanel title="Insights" description="Compliance risk indicators.">
          <div className="space-y-3 text-sm text-muted-foreground">
            <div className="flex items-center justify-between rounded-lg border p-3">
              <span>Expiring visas</span>
              <span className="font-semibold text-foreground">{compliance.expiringVisas.length}</span>
            </div>
            <div className="flex items-center justify-between rounded-lg border p-3">
              <span>Pending renewals</span>
              <span className="font-semibold text-foreground">{compliance.pendingRenewals}</span>
            </div>
          </div>
        </WorkspacePanel>
      </div>
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Contract Template Builder</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Select value={selectedTemplate} onValueChange={setSelectedTemplate}>
              <SelectTrigger className="w-[240px]">
                <SelectValue placeholder="Select template" />
              </SelectTrigger>
              <SelectContent>
                {contractTemplates.map((tpl) => (
                  <SelectItem key={tpl.id} value={tpl.id}>
                    {tpl.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <DocumentViewer
              title="Template Preview"
              content={buildTemplatePreview(selectedTemplate)}
              onSave={() => {
                legalService.createContract(session.tenantId, session, {
                  title: "Generated Contract",
                  type: "internal",
                  status: "draft",
                });
                setVersion((prev) => prev + 1);
                setDialogOpen(false);
              }}
              onPrint={() => undefined}
            />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
