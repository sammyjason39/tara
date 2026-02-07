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

export default function ReceivableDesk() {
  const session = useSession();
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState<"pending" | "received" | "overdue">("pending");

  // Mock: fetch receivable records
  const receivables = useMemo(
    () => financeService.listReceivables(session.tenantId),
    [session],
  );

  const filteredReceivables = receivables.filter((r) =>
    search ? r.customer.toLowerCase().includes(search.toLowerCase()) : true,
  );

  const handleMarkReceived = (id: string) => {
    financeService.markReceived(session.tenantId, id);
    logService.log(
      session.tenantId,
      session.userId,
      `Marked receivable ${id} as received`,
    );
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="ReceivableDesk"
        subtitle="Manage incoming payments, invoices, and collections efficiently."
        primaryAction={
          <Button onClick={() => alert("Add invoice modal coming soon")}>
            Add Invoice
          </Button>
        }
        secondaryActions={
          <Input
            placeholder="Search customers or invoices"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="min-w-[220px]"
          />
        }
      />

      <WorkspacePanel
        title="Receivables WorkQueue"
        description="Invoices and payments requiring attention."
      >
        <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)}>
          <TabsList>
            <TabsTrigger value="pending">Pending</TabsTrigger>
            <TabsTrigger value="received">Received</TabsTrigger>
            <TabsTrigger value="overdue">Overdue</TabsTrigger>
          </TabsList>

          <TabsContent value="pending" className="mt-4">
            <DataTableShell
              total={filteredReceivables.length}
              page={1}
              pageSize={10}
            >
              <table className="w-full text-sm">
                <thead className="bg-muted/40 text-xs uppercase text-muted-foreground">
                  <tr>
                    <th className="p-3 text-left">Customer</th>
                    <th className="p-3 text-left">Invoice</th>
                    <th className="p-3 text-left">Amount</th>
                    <th className="p-3 text-left">Due Date</th>
                    <th className="p-3 text-left">Status</th>
                    <th className="p-3 text-left">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredReceivables
                    .filter((r) => r.status === "PENDING")
                    .map((r) => (
                      <tr key={r.id} className="border-t">
                        <td className="p-3">{r.customer}</td>
                        <td className="p-3">{r.invoiceId}</td>
                        <td className="p-3 text-muted-foreground">
                          {r.amount.toLocaleString()}
                        </td>
                        <td className="p-3">{r.dueDate}</td>
                        <td className="p-3">
                          <ApprovalStatusBadge status={r.status} />
                        </td>
                        <td className="p-3">
                          <Button
                            size="sm"
                            onClick={() => handleMarkReceived(r.id)}
                          >
                            Mark Received
                          </Button>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </DataTableShell>
          </TabsContent>

          <TabsContent value="received" className="mt-4">
            <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
              Received invoices will appear here. Integration with bank
              reconciliation ready.
            </div>
          </TabsContent>

          <TabsContent value="overdue" className="mt-4">
            <div className="rounded-lg border border-dashed p-4 text-sm text-red-500">
              Overdue invoices with reminders and follow-ups.
            </div>
          </TabsContent>
        </Tabs>
      </WorkspacePanel>
    </div>
  );
}
