import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { workflowService } from "@/core/services/hr/workflowService";
import { logService } from "@/core/services/finance/logService";

export default function LedgerCore() {
  const session = useSession();
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState<"journals" | "invoices" | "payroll">(
    "journals",
  );
  const [dialogOpen, setDialogOpen] = useState(false);
  const [entry, setEntry] = useState({
    account: "",
    type: "DEBIT",
    amount: 0,
    description: "",
  });

  // Fetch journals from mock service
  const journals = useMemo(
    () => financeService.listJournals(session.tenantId),
    [session],
  );

  const filteredJournals = journals.filter((j) =>
    search ? j.account.toLowerCase().includes(search.toLowerCase()) : true,
  );

  const handleCreateJournal = () => {
    financeService.createJournal(session.tenantId, entry);
    logService.log(
      session.tenantId,
      session.userId,
      `Created Journal Entry: ${JSON.stringify(entry)}`,
    );
    setDialogOpen(false);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="LedgerCore"
        subtitle="Comprehensive ledger management: journals, invoices, payroll, and tax compliance."
        primaryAction={
          <Button onClick={() => setDialogOpen(true)}>New Journal Entry</Button>
        }
        secondaryActions={
          <Input
            placeholder="Search journals"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="min-w-[220px]"
          />
        }
      />

      <WorkspacePanel
        title="Ledger WorkQueue"
        description="Pending approvals, alerts, and adjustments."
      >
        <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)}>
          <TabsList>
            <TabsTrigger value="journals">Journals</TabsTrigger>
            <TabsTrigger value="invoices">Invoices</TabsTrigger>
            <TabsTrigger value="payroll">Payroll</TabsTrigger>
          </TabsList>

          <TabsContent value="journals" className="mt-4">
            <FilterBar searchValue={search} onSearchChange={setSearch} />
            <DataTableShell
              total={filteredJournals.length}
              page={1}
              pageSize={10}
            >
              <table className="w-full text-sm">
                <thead className="bg-muted/40 text-xs uppercase text-muted-foreground">
                  <tr>
                    <th className="p-3 text-left">Account</th>
                    <th className="p-3 text-left">Type</th>
                    <th className="p-3 text-left">Amount</th>
                    <th className="p-3 text-left">Description</th>
                    <th className="p-3 text-left">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredJournals.map((j) => (
                    <tr key={j.id} className="border-t">
                      <td className="p-3">{j.account}</td>
                      <td className="p-3 text-muted-foreground">{j.type}</td>
                      <td className="p-3 text-muted-foreground">
                        {j.amount.toLocaleString()}
                      </td>
                      <td className="p-3">{j.description}</td>
                      <td className="p-3">
                        <ApprovalStatusBadge status={j.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </DataTableShell>
          </TabsContent>

          <TabsContent value="invoices" className="mt-4">
            <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
              Invoice management coming soon (mock service ready). Supports
              billing, recurring invoices, and approval workflow.
            </div>
          </TabsContent>

          <TabsContent value="payroll" className="mt-4">
            <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
              Payroll posting, salary disbursement, and integration with HR
              module (mock ready).
            </div>
          </TabsContent>
        </Tabs>
      </WorkspacePanel>

      {/* Dialog: New Journal Entry */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Create Journal Entry</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Input
              placeholder="Account"
              value={entry.account}
              onChange={(e) => setEntry({ ...entry, account: e.target.value })}
            />
            <Select
              value={entry.type}
              onValueChange={(v) => setEntry({ ...entry, type: v })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="DEBIT">Debit</SelectItem>
                <SelectItem value="CREDIT">Credit</SelectItem>
              </SelectContent>
            </Select>
            <Input
              placeholder="Amount"
              type="number"
              value={entry.amount}
              onChange={(e) =>
                setEntry({ ...entry, amount: Number(e.target.value) })
              }
            />
            <Input
              placeholder="Description"
              value={entry.description}
              onChange={(e) =>
                setEntry({ ...entry, description: e.target.value })
              }
            />
            <div className="flex justify-end gap-2">
              <Button onClick={handleCreateJournal}>Submit & Route</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
