import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { PageHeader } from "@/core/ui/PageHeader";
import { WorkspacePanel } from "@/core/ui/WorkspacePanel";
import { DataTableShell } from "@/core/tools/DataTableShell";
import { FilterBar } from "@/core/tools/FilterBar";
import { FeedbackAlert } from "@/core/tools/FeedbackAlert";
import { useSession } from "@/core/security/session";
import { salesService } from "@/core/services/sales/salesService";
import type { SalesLead } from "@/core/types/sales/sales";

export default function LeadDesk() {
  const session = useSession();
  const [search, setSearch] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);
  const [companyName, setCompanyName] = useState("");
  const [contactName, setContactName] = useState("");
  const [potentialValue, setPotentialValue] = useState("0");
  const [selectedLead, setSelectedLead] = useState<SalesLead | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const clearStatus = () => {
    setStatusMessage(null);
    setErrorMessage(null);
  };

  const leads = useMemo(
    () => salesService.listLeads(session.tenantId),
    [refreshKey, session.tenantId],
  );
  const filtered = leads.filter((lead) =>
    search
      ? `${lead.companyName} ${lead.contactName} ${lead.ownerName} ${lead.status}`
          .toLowerCase()
          .includes(search.toLowerCase())
      : true,
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Lead Reception and SLA Desk"
        subtitle="Marketing handoff, owner assignment, SLA response control, and qualification flow."
        secondaryActions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={() => {
                try {
                  salesService.runSlaSweep(session.tenantId, session);
                  setStatusMessage("SLA sweep completed. Delinquent leads flagged.");
                  setRefreshKey((value) => value + 1);
                } catch (err) {
                  setErrorMessage("SLA sweep failed.");
                }
              }}
            >
              Run SLA Sweep
            </Button>
            <Input
              placeholder="Search leads"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="min-w-[220px]"
            />
          </div>
        }
      />

      <FeedbackAlert message={statusMessage} error={errorMessage} onClear={clearStatus} />

      <WorkspacePanel title="Create Lead" description="Register qualified demand handoff from marketing/referral channels.">
        <div className="grid gap-3 md:grid-cols-4">
          <Input
            placeholder="Company name"
            value={companyName}
            onChange={(event) => setCompanyName(event.target.value)}
          />
          <Input
            placeholder="Contact name"
            value={contactName}
            onChange={(event) => setContactName(event.target.value)}
          />
          <Input
            placeholder="Potential value"
            type="number"
            value={potentialValue}
            onChange={(event) => setPotentialValue(event.target.value)}
          />
          <Button
            onClick={() => {
              if (!companyName || !contactName) return;
              try {
                salesService.createLead(session.tenantId, session, {
                  companyName,
                  contactName,
                  source: "MARKETING",
                  potentialValue: Number(potentialValue),
                  priority: "HIGH",
                });
                setStatusMessage(`Lead for "${companyName}" created successfully.`);
                setCompanyName("");
                setContactName("");
                setPotentialValue("0");
                setRefreshKey((value) => value + 1);
              } catch (err) {
                setErrorMessage("Failed to create lead.");
              }
            }}
          >
            Add Lead
          </Button>
        </div>
      </WorkspacePanel>

      <WorkspacePanel title="Lead queue" description="Lead acceptance and progression from New to Qualified.">
        <FilterBar searchValue={search} onSearchChange={setSearch} />
        <DataTableShell total={filtered.length} page={1} pageSize={10}>
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-xs uppercase text-muted-foreground">
              <tr>
                <th className="p-3 text-left">Lead</th>
                <th className="p-3 text-left">Contact</th>
                <th className="p-3 text-left">Owner</th>
                <th className="p-3 text-left">Potential</th>
                <th className="p-3 text-left">Priority</th>
                <th className="p-3 text-left">Status</th>
                <th className="p-3 text-left">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((lead) => (
                <tr
                  key={lead.id}
                  className="cursor-pointer border-t hover:bg-muted/50"
                  onClick={() => setSelectedLead(lead)}
                >
                  <td className="p-3 font-medium">{lead.companyName}</td>
                  <td className="p-3 text-muted-foreground">{lead.contactName}</td>
                  <td className="p-3 text-muted-foreground">{lead.ownerName}</td>
                  <td className="p-3 text-muted-foreground">
                    {lead.potentialValue.toLocaleString()} {lead.currency}
                  </td>
                  <td className="p-3">
                    <Badge variant={lead.priority === "URGENT" ? "destructive" : "outline"}>
                      {lead.priority}
                    </Badge>
                  </td>
                  <td className="p-3">
                    <Badge variant={lead.status === "NEW" ? "destructive" : "outline"}>
                      {lead.status}
                    </Badge>
                  </td>
                  <td className="p-3">
                    <div className="flex flex-wrap gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={lead.status !== "NEW" && lead.status !== "ASSIGNED"}
                        onClick={(e) => {
                          e.stopPropagation();
                          try {
                            salesService.updateLeadStatus(
                              session.tenantId,
                              session,
                              lead.id,
                              "CONTACTED",
                            );
                            setStatusMessage("Lead status updated to Contacted.");
                            setRefreshKey((value) => value + 1);
                          } catch (err) {
                            setErrorMessage("Status update failed.");
                          }
                        }}
                      >
                        Contacted
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={lead.status !== "CONTACTED"}
                        onClick={(e) => {
                          e.stopPropagation();
                          try {
                            salesService.updateLeadStatus(
                              session.tenantId,
                              session,
                              lead.id,
                              "QUALIFIED",
                            );
                            setStatusMessage("Lead qualified successfully.");
                            setRefreshKey((value) => value + 1);
                          } catch (err) {
                            setErrorMessage("Qualification failed.");
                          }
                        }}
                      >
                        Qualify
                      </Button>
                      <Button
                        size="sm"
                        disabled={lead.status !== "QUALIFIED"}
                        onClick={(e) => {
                          e.stopPropagation();
                          try {
                            salesService.convertLeadToOpportunity(
                              session.tenantId,
                              session,
                              lead.id,
                            );
                            setStatusMessage("Lead converted to Opportunity.");
                            setRefreshKey((value) => value + 1);
                          } catch (err) {
                            setErrorMessage("Conversion failed.");
                          }
                        }}
                      >
                        Convert
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </DataTableShell>
      </WorkspacePanel>
      <Dialog open={!!selectedLead} onOpenChange={() => setSelectedLead(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Lead Detail</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="grid grid-cols-2 text-sm gap-y-2">
              <span className="text-muted-foreground">Lead ID:</span>
              <span className="font-mono text-xs">{selectedLead?.id}</span>
              <span className="text-muted-foreground">Company:</span>
              <span className="font-semibold">{selectedLead?.companyName}</span>
              <span className="text-muted-foreground">Contact:</span>
              <span>{selectedLead?.contactName}</span>
              <span className="text-muted-foreground">Source:</span>
              <span>{selectedLead?.source}</span>
              <span className="text-muted-foreground">Potential Value:</span>
              <span className="font-bold">
                {selectedLead?.potentialValue.toLocaleString()} {selectedLead?.currency}
              </span>
              <span className="text-muted-foreground">Priority:</span>
              <span>{selectedLead?.priority}</span>
              <span className="text-muted-foreground">Status:</span>
              <span>{selectedLead?.status}</span>
              <span className="text-muted-foreground">Owner:</span>
              <span>{selectedLead?.ownerName}</span>
            </div>
            <div className="border-t pt-4">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Lifecycle Audit</p>
              <div className="space-y-1 text-xs text-muted-foreground">
                <p>• Created on {selectedLead?.createdAt.slice(0, 10)}</p>
                <p>• Last Activity Profile: High Integrity</p>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
