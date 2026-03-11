import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Target, ShieldCheck } from "lucide-react";
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
  const [loading, setLoading] = useState(true);
  const [leads, setLeads] = useState<SalesLead[]>([]);
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

  const refresh = useCallback(async () => {
    try {
      setLoading(true);
      const data = await salesService.listLeads(session.tenantId, session);
      setLeads(data);
    } catch (err) {
      console.error("Failed to fetch leads:", err);
      setErrorMessage("Failed to load leads pool.");
    } finally {
      setLoading(false);
    }
  }, [session.tenantId, session]);

  useEffect(() => {
    refresh();
  }, [refresh, refreshKey]);

  const filtered = useMemo(() => 
    leads.filter((lead) =>
      search
        ? `${lead.companyName} ${lead.contactName} ${lead.ownerName} ${lead.status}`
            .toLowerCase()
            .includes(search.toLowerCase())
        : true,
    ),
    [leads, search]
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
              onClick={async () => {
                try {
                  await salesService.runSlaSweep(session.tenantId, session);
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
            onClick={async () => {
              if (!companyName || !contactName) return;
              try {
                await salesService.createLead(session.tenantId, session, {
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
          {loading ? (
             <div className="p-8 text-center text-muted-foreground italic">Refreshing lead pool...</div>
          ) : (
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
                        onClick={async (e) => {
                          e.stopPropagation();
                          try {
                            await salesService.updateLeadStatus(
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
                        onClick={async (e) => {
                          e.stopPropagation();
                          try {
                            await salesService.updateLeadStatus(
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
                        onClick={async (e) => {
                          e.stopPropagation();
                          try {
                            await salesService.convertLeadToOpportunity(
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
          )}
        </DataTableShell>
      </WorkspacePanel>
      <Dialog open={!!selectedLead} onOpenChange={() => setSelectedLead(null)}>
        <DialogContent className="max-w-3xl p-0 overflow-hidden" aria-describedby="lead-detail-description">
          <DialogHeader className="sr-only">
            <DialogTitle>Lead Detail</DialogTitle>
          </DialogHeader>
          <div id="lead-detail-description" className="sr-only">View comprehensive lead context and SLAs.</div>
          <div className="grid md:grid-cols-[1fr_2fr]">
            <div className="bg-muted p-6 flex flex-col justify-between">
              <div>
                <Target className="w-8 h-8 text-primary mb-4" />
                <DialogTitle className="text-xl mb-2">Lead Snapshot</DialogTitle>
                <p className="text-sm text-muted-foreground">
                  Qualification and progression tracking for marketing handoff.
                </p>
              </div>
              <div className="bg-primary/5 p-4 rounded-lg mt-8 border border-primary/10">
                <p className="text-xs text-primary font-medium flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4" /> SLA Enforced
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Lifecycle transitions are audited for strict response SLAs.
                </p>
              </div>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                <div className="grid grid-cols-2 text-sm gap-y-3">
                  <span className="text-muted-foreground">Lead ID:</span>
                  <span className="font-mono text-xs truncate max-w-[150px]">{selectedLead?.id}</span>
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
                  <span><Badge variant="outline">{selectedLead?.priority}</Badge></span>
                  <span className="text-muted-foreground">Status:</span>
                  <span><Badge variant="outline">{selectedLead?.status}</Badge></span>
                  <span className="text-muted-foreground">Owner:</span>
                  <span>{selectedLead?.ownerName}</span>
                </div>
                <div className="border-t pt-4 mt-4">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Lifecycle Audit</p>
                  <div className="space-y-2 text-xs text-muted-foreground bg-muted p-3 rounded-md font-mono">
                    <p>Created on {selectedLead?.createdAt?.slice(0, 10)}</p>
                    <p>Last Activity Profile: High Integrity</p>
                  </div>
                </div>
                <div className="flex justify-end pt-4 mt-6 border-t">
                  <Button variant="outline" onClick={() => setSelectedLead(null)}>Close</Button>
                </div>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
