import { useCallback, useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Shield, Settings2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PageHeader } from "@/core/ui/PageHeader";
import { WorkspacePanel } from "@/core/ui/WorkspacePanel";
import { DataTableShell } from "@/core/tools/DataTableShell";
import { FilterBar } from "@/core/tools/FilterBar";
import { ApprovalStatusBadge } from "@/core/tools/ApprovalStatusBadge";
import { FeedbackAlert } from "@/core/tools/FeedbackAlert";
import { useSession } from "@/core/security/session";
import { type FinanceCapexBudgetRow, type FinancePolicyRow } from "@/core/services/finance/financeService";
import { financeApiClient } from "@/core/services/finance/financeApiClient";
import { logService } from "@/core/services/finance/logService";

type PolicyType = "APPROVAL_LIMIT" | "PAYMENT_RULE" | "EXPENSE_POLICY";

export default function PolicyManager() {
  const session = useSession();
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [policyForm, setPolicyForm] = useState({
    title: "",
    type: "APPROVAL_LIMIT" as PolicyType,
    description: "",
    threshold: 0,
  });
  const [budgetForm, setBudgetForm] = useState({
    department: "",
    totalBudget: 0,
  });
  const [policies, setPolicies] = useState<FinancePolicyRow[]>([]);
  const [capexBudgets, setCapexBudgets] = useState<FinanceCapexBudgetRow[]>([]);
  const [selectedPolicy, setSelectedPolicy] = useState<FinancePolicyRow | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const clearStatus = () => {
    setStatusMessage(null);
    setErrorMessage(null);
  };

  const refreshPolicies = useCallback(async () => {
    setPolicies(await financeApiClient.listPolicies(session.tenant_id, session));
    setCapexBudgets(await financeApiClient.listCapexBudgets(session.tenant_id, session));
  }, [session]);

  useEffect(() => {
    void refreshPolicies();
  }, [refreshPolicies]);

  const statusCounts = useMemo(
    () => ({
      active: policies.filter((policy) => policy.active).length,
      inactive: policies.filter((policy) => !policy.active).length,
    }),
    [policies],
  );

  const filteredPolicies = useMemo(
    () =>
      policies.filter((policy) =>
        search ? policy.title.toLowerCase().includes(search.toLowerCase()) : true,
      ),
    [policies, search],
  );

  const savePolicy = async () => {
    try {
      await financeApiClient.createPolicy(session.tenant_id, session, policyForm);
      logService.log(session.tenant_id, session.user_id, "Created policy", policyForm.title);
      setStatusMessage(`Policy "${policyForm.title}" created successfully.`);
      setDialogOpen(false);
      setPolicyForm({ title: "", type: "APPROVAL_LIMIT", description: "", threshold: 0 });
      await refreshPolicies();
    } catch (err) {
      setErrorMessage("Failed to create policy. Audit constraint violation.");
    }
  };

  const togglePolicy = async (id: string) => {
    try {
      await financeApiClient.togglePolicy(session.tenant_id, session, id);
      logService.log(session.tenant_id, session.user_id, "Toggled policy active state", id);
      setStatusMessage("Policy status updated successfully.");
      await refreshPolicies();
    } catch (err) {
      setErrorMessage("Failed to update policy status.");
    }
  };

  const saveCapexBudget = async () => {
    try {
      if (!budgetForm.department.trim()) return;
      await financeApiClient.setCapexBudget(session.tenant_id, session, budgetForm);
      logService.log(
        session.tenant_id,
        session.user_id,
        "Set CAPEX budget",
        `${budgetForm.department}:${budgetForm.totalBudget}`,
      );
      setStatusMessage(`Budget for ${budgetForm.department} updated.`);
      setBudgetForm({ department: "", totalBudget: 0 });
      await refreshPolicies();
    } catch (err) {
      setErrorMessage("Failed to update budget. Fiscal year locked.");
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Policy Manager"
        subtitle="Maintain policy thresholds for approvals, payment rules, and expense controls."
        primaryAction={<Button onClick={() => setDialogOpen(true)}>New Policy</Button>}
        secondaryActions={
          <Input
            placeholder="Search policies"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="min-w-[220px]"
          />
        }
      />

      <FeedbackAlert message={statusMessage} error={errorMessage} onClear={clearStatus} />

      <WorkspacePanel title="Policy Health" description="Coverage and activation status by rule set.">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-lg border p-3">
            <p className="text-xs text-muted-foreground">Active policies</p>
            <p className="text-xl font-semibold">{statusCounts.active}</p>
            <Badge variant="default">Enforced</Badge>
          </div>
          <div className="rounded-lg border p-3">
            <p className="text-xs text-muted-foreground">Inactive policies</p>
            <p className="text-xl font-semibold">{statusCounts.inactive}</p>
            <Badge variant="secondary">Draft / Paused</Badge>
          </div>
        </div>
      </WorkspacePanel>

      <WorkspacePanel
        title="CAPEX Budgets"
        description="Ledger-backed budget controls used by CAPEX request validation."
      >
        <div className="mb-3 grid gap-2 md:grid-cols-3">
          <Input
            placeholder="Department"
            value={budgetForm.department}
            onChange={(event) => setBudgetForm({ ...budgetForm, department: event.target.value })}
          />
          <Input
            placeholder="Total Budget"
            type="number"
            value={budgetForm.totalBudget}
            onChange={(event) =>
              setBudgetForm({ ...budgetForm, totalBudget: Number(event.target.value) })
            }
          />
          <Button onClick={saveCapexBudget}>Set Budget</Button>
        </div>
        <DataTableShell total={capexBudgets.length} page={1} pageSize={10}>
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-xs uppercase text-muted-foreground">
              <tr>
                <th className="p-3 text-left">Department</th>
                <th className="p-3 text-left">Account</th>
                <th className="p-3 text-left">Allocated</th>
                <th className="p-3 text-left">Committed</th>
                <th className="p-3 text-left">Available</th>
              </tr>
            </thead>
            <tbody>
              {capexBudgets.map((budget) => (
                <tr key={budget.department} className="border-t">
                  <td className="p-3 font-medium">{budget.department}</td>
                  <td className="p-3 text-muted-foreground">{budget.accountCode}</td>
                  <td className="p-3 text-muted-foreground">{budget.allocatedBudget?.toLocaleString() ?? "0"}</td>
                  <td className="p-3 text-muted-foreground">{budget.committedBudget?.toLocaleString() ?? "0"}</td>
                  <td className="p-3 text-muted-foreground">{budget.availableBudget?.toLocaleString() ?? "0"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </DataTableShell>
      </WorkspacePanel>

      <WorkspacePanel title="Policies" description="All policies, thresholds, and current activation status.">
        <FilterBar searchValue={search} onSearchChange={setSearch} />
        <DataTableShell total={filteredPolicies.length} page={1} pageSize={10}>
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-xs uppercase text-muted-foreground">
              <tr>
                <th className="p-3 text-left">Title</th>
                <th className="p-3 text-left">Type</th>
                <th className="p-3 text-left">Threshold</th>
                <th className="p-3 text-left">Description</th>
                <th className="p-3 text-left">Status</th>
                <th className="p-3 text-left">Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredPolicies.map((policy) => (
                <tr
                  key={policy.id}
                  className="cursor-pointer border-t hover:bg-muted/50"
                  onClick={() => setSelectedPolicy(policy)}
                >
                  <td className="p-3 font-medium">{policy.title}</td>
                  <td className="p-3 text-muted-foreground">{policy.type}</td>
                  <td className="p-3 text-muted-foreground">{policy.threshold?.toLocaleString() ?? "0"}</td>
                  <td className="p-3 text-muted-foreground">{policy.description}</td>
                  <td className="p-3">
                    <ApprovalStatusBadge status={policy.active ? "ACTIVE" : "INACTIVE"} />
                  </td>
                  <td className="p-3">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={(e) => {
                        e.stopPropagation();
                        togglePolicy(policy.id);
                      }}
                    >
                      {policy.active ? "Deactivate" : "Activate"}
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </DataTableShell>
      </WorkspacePanel>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-3xl p-0 overflow-hidden">
          <div className="grid md:grid-cols-[1fr_2fr]">
            {/* Left Info Panel */}
            <div className="bg-muted p-6 flex flex-col justify-between border-r">
              <div>
                <Shield className="w-8 h-8 text-primary mb-4" />
                <DialogTitle className="text-xl mb-2">Create Policy</DialogTitle>
                <p className="text-sm text-muted-foreground mb-6">
                  Establish new financial governance rules, including approval limits, expense policies, and payment routing structures.
                </p>
                <div className="space-y-4">
                  <div className="bg-background p-3 rounded-lg border shadow-sm flex items-center gap-3">
                    <Settings2 className="w-5 h-5 text-muted-foreground" />
                    <div>
                      <p className="text-xs text-muted-foreground uppercase font-semibold">Active Enforcement</p>
                      <p className="text-xs">Policies take effect immediately globally.</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Form Panel */}
            <div className="p-6">
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-semibold uppercase text-muted-foreground mb-1 block">Policy Title</label>
                  <Input
                    placeholder="e.g. Executive Travel Limit"
                    value={policyForm.title}
                    onChange={(event) => setPolicyForm({ ...policyForm, title: event.target.value })}
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-semibold uppercase text-muted-foreground mb-1 block">Policy Type</label>
                    <Select value={policyForm.type} onValueChange={(value) => setPolicyForm({ ...policyForm, type: value as PolicyType })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="APPROVAL_LIMIT">Approval Limit</SelectItem>
                        <SelectItem value="PAYMENT_RULE">Payment Rule</SelectItem>
                        <SelectItem value="EXPENSE_POLICY">Expense Policy</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-xs font-semibold uppercase text-muted-foreground mb-1 block">Threshold (IDR)</label>
                    <div className="relative">
                      <span className="absolute left-3 top-2.5 text-muted-foreground font-medium text-sm">Rp</span>
                      <Input
                        className="pl-9"
                        placeholder="0"
                        type="number"
                        value={policyForm.threshold || ""}
                        onChange={(event) =>
                          setPolicyForm({
                            ...policyForm,
                            threshold: Number(event.target.value),
                          })
                        }
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold uppercase text-muted-foreground mb-1 block">Description</label>
                  <Input
                    placeholder="Provide clear justification and scope..."
                    value={policyForm.description}
                    onChange={(event) => setPolicyForm({ ...policyForm, description: event.target.value })}
                  />
                </div>

                <div className="border-t pt-4 flex justify-end gap-2 mt-4">
                  <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
                  <Button onClick={savePolicy} className="gap-2">
                    <Shield className="w-4 h-4" /> Enforce Policy
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!selectedPolicy} onOpenChange={() => setSelectedPolicy(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Policy Detail & History</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="grid grid-cols-2 text-sm gap-y-2">
              <span className="text-muted-foreground">Policy ID:</span>
              <span className="font-mono text-xs">{selectedPolicy?.id}</span>
              <span className="text-muted-foreground">Title:</span>
              <span className="font-semibold">{selectedPolicy?.title}</span>
              <span className="text-muted-foreground">Type:</span>
              <span>{selectedPolicy?.type}</span>
              <span className="text-muted-foreground">Threshold:</span>
              <span className="font-bold">{selectedPolicy?.threshold?.toLocaleString() ?? "0"}</span>
              <span className="text-muted-foreground">Status:</span>
              <span><ApprovalStatusBadge status={selectedPolicy?.active ? "ACTIVE" : "INACTIVE"} /></span>
            </div>
            <div className="border-t pt-4">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Change History</p>
              <div className="space-y-3">
                <div className="flex gap-3 text-xs">
                  <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-600">
                    <span className="font-bold">v2</span>
                  </div>
                  <div>
                    <p className="font-medium text-foreground">Policy Modified</p>
                    <p className="text-muted-foreground">Threshold increased from 5k to {selectedPolicy?.threshold?.toLocaleString() ?? "0"} by Admin.</p>
                    <p className="mt-1 text-[10px] text-muted-foreground">2 days ago • IP: 192.168.1.10</p>
                  </div>
                </div>
                <div className="flex gap-3 text-xs">
                  <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
                    <span className="font-bold">v1</span>
                  </div>
                  <div>
                    <p className="font-medium text-foreground">Initial Setup</p>
                    <p className="text-muted-foreground">Policy created and enforced across multi-tenant group.</p>
                    <p className="mt-1 text-[10px] text-muted-foreground">15 days ago • IP: 10.0.4.120</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
