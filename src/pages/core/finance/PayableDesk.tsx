import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageHeader } from "@/core/ui/PageHeader";
import { WorkspacePanel } from "@/core/ui/WorkspacePanel";
import { DataTableShell } from "@/core/tools/DataTableShell";
import { FilterBar } from "@/core/tools/FilterBar";
import { ApprovalStatusBadge } from "@/core/tools/ApprovalStatusBadge";
import { useSession } from "@/core/security/session";
import { financeService } from "@/core/services/finance/financeService";
import { workflowService } from "@/core/services/hr/workflowService";
import { logService } from "@/core/services/finance/logService";

export default function PayableDesk() {
  const session = useSession();
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState<"pending" | "paid" | "overdue">("pending");

  // Mock: fetch payable records
  const payables = useMemo(
    () => financeService.listPayables(session.tenantId),
    [session],
  );

  const filteredPayables = payables.filter((p) =>
    search ? p.vendor.toLowerCase().includes(search.toLowerCase()) : true,
  );

  const handleMarkPaid = (id: string) => {
    financeService.markPaid(session.tenantId, id);
    logService.log(
      session.tenantId,
      session.userId,
      `Marked payable ${id} as paid`,
    );
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="PayableDesk"
        subtitle="Manage outgoing payments, vendor invoices, and bills efficiently."
        primaryAction={
          <Button onClick={() => alert("Add vendor invoice modal coming soon")}>
            Add Payable
          </Button>
        }
        secondaryActions={
          <Input
            placeholder="Search vendors or invoices"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="min-w-[220px]"
          />
        }
      />

      <WorkspacePanel
        title="Payables WorkQueue"
        description="Invoices and bills requiring action."
      >
        <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)}>
          <TabsList>
            <TabsTrigger value="pending">Pending</TabsTrigger>
            <TabsTrigger value="paid">Paid</TabsTrigger>
            <TabsTrigger value="overdue">Overdue</TabsTrigger>
          </TabsList>

          <TabsContent value="pending" className="mt-4">
            <DataTableShell
              total={filteredPayables.length}
              page={1}
              pageSize={10}
            >
              <table className="w-full text-sm">
                <thead className="bg-muted/40 text-xs uppercase text-muted-foreground">
                  <tr>
                    <th className="p-3 text-left">Vendor</th>
                    <th className="p-3 text-left">Invoice</th>
                    <th className="p-3 text-left">Amount</th>
                    <th className="p-3 text-left">Due Date</th>
                    <th className="p-3 text-left">Status</th>
                    <th className="p-3 text-left">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPayables
                    .filter((p) => p.status === "PENDING")
                    .map((p) => (
                      <tr key={p.id} className="border-t">
                        <td className="p-3">{p.vendor}</td>
                        <td className="p-3">{p.invoiceId}</td>
                        <td className="p-3 text-muted-foreground">
                          {p.amount.toLocaleString()}
                        </td>
                        <td className="p-3">{p.dueDate}</td>
                        <td className="p-3">
                          <ApprovalStatusBadge status={p.status} />
                        </td>
                        <td className="p-3">
                          <Button
                            size="sm"
                            onClick={() => handleMarkPaid(p.id)}
                          >
                            Mark Paid
                          </Button>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </DataTableShell>
          </TabsContent>

          <TabsContent value="paid" className="mt-4">
            <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
              Paid invoices with history, audit, and integration to Ledger and
              Treasury.
            </div>
          </TabsContent>

          <TabsContent value="overdue" className="mt-4">
            <div className="rounded-lg border border-dashed p-4 text-sm text-red-500">
              Overdue bills with reminders and escalation workflow.
            </div>
          </TabsContent>
        </Tabs>
      </WorkspacePanel>
    </div>
  );
}
