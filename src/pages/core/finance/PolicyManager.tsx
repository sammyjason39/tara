// src/pages/core/finance/PolicyManager.tsx
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
import { logService } from "@/core/services/finance/logService";

export default function PolicyManager() {
  const session = useSession();
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [policyForm, setPolicyForm] = useState({
    title: "",
    type: "APPROVAL_LIMIT", // Example types: APPROVAL_LIMIT, PAYMENT_RULE, EXPENSE_POLICY
    description: "",
    threshold: 0,
  });

  // Fetch policies
  const policies = useMemo(
    () => financeService.listPolicies(session.tenantId),
    [session],
  );

  const filteredPolicies = policies.filter((p) =>
    search ? p.title.toLowerCase().includes(search.toLowerCase()) : true,
  );

  const handleSavePolicy = () => {
    financeService.createPolicy(session.tenantId, policyForm);
    logService.log(
      session.tenantId,
      session.userId,
      `Policy created: ${policyForm.title}`,
    );
    setDialogOpen(false);
    setPolicyForm({
      title: "",
      type: "APPROVAL_LIMIT",
      description: "",
      threshold: 0,
    });
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Policy Manager"
        subtitle="Manage finance policies, approval rules, and thresholds for operational control."
        primaryAction={
          <Button onClick={() => setDialogOpen(true)}>New Policy</Button>
        }
        secondaryActions={
          <Input
            placeholder="Search policies"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="min-w-[220px]"
          />
        }
      />

      <WorkspacePanel
        title="Policies List"
        description="All active finance policies with type, threshold, and description."
      >
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
              </tr>
            </thead>
            <tbody>
              {filteredPolicies.map((p) => (
                <tr key={p.id} className="border-t">
                  <td className="p-3 font-medium">{p.title}</td>
                  <td className="p-3 text-muted-foreground">{p.type}</td>
                  <td className="p-3 text-muted-foreground">
                    {p.threshold.toLocaleString()}
                  </td>
                  <td className="p-3">{p.description}</td>
                  <td className="p-3">
                    <ApprovalStatusBadge
                      status={p.active ? "ACTIVE" : "INACTIVE"}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </DataTableShell>
      </WorkspacePanel>

      {/* Dialog: New Policy */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Create Policy</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Input
              placeholder="Title"
              value={policyForm.title}
              onChange={(e) =>
                setPolicyForm({ ...policyForm, title: e.target.value })
              }
            />
            <Input
              placeholder="Type (APPROVAL_LIMIT, PAYMENT_RULE, EXPENSE_POLICY)"
              value={policyForm.type}
              onChange={(e) =>
                setPolicyForm({ ...policyForm, type: e.target.value })
              }
            />
            <Input
              placeholder="Threshold Amount"
              type="number"
              value={policyForm.threshold}
              onChange={(e) =>
                setPolicyForm({
                  ...policyForm,
                  threshold: Number(e.target.value),
                })
              }
            />
            <Input
              placeholder="Description"
              value={policyForm.description}
              onChange={(e) =>
                setPolicyForm({ ...policyForm, description: e.target.value })
              }
            />
            <div className="flex justify-end gap-2">
              <Button onClick={handleSavePolicy}>Save Policy</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
