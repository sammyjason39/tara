import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/core/ui/PageHeader";
import { WorkspacePanel } from "@/core/ui/WorkspacePanel";
import { DataTableShell } from "@/core/tools/DataTableShell";
import { FilterBar } from "@/core/tools/FilterBar";
import { useSession } from "@/core/security/session";
import { salesService } from "@/core/services/sales/salesService";

export default function SalesOrderDesk() {
  const session = useSession();
  const [search, setSearch] = useState("");
  const orders = useMemo(
    () => salesService.listOrders(session.tenantId),
    [session.tenantId],
  );
  const filtered = orders.filter((order) =>
    search
      ? `${order.id} ${order.customerName} ${order.status} ${order.inventoryCheck}`
          .toLowerCase()
          .includes(search.toLowerCase())
      : true,
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Sales Orders"
        subtitle="Closed-won opportunities converted to orders with finance and inventory handoff status."
        primaryAction={<Button variant="outline">Create from Opportunity</Button>}
        secondaryActions={
          <Input
            placeholder="Search orders"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="min-w-[220px]"
          />
        }
      />

      <WorkspacePanel title="Order queue" description="Orders awaiting approval and invoicing.">
        <FilterBar searchValue={search} onSearchChange={setSearch} />
        <DataTableShell total={filtered.length} page={1} pageSize={10}>
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-xs uppercase text-muted-foreground">
              <tr>
                <th className="p-3 text-left">Order</th>
                <th className="p-3 text-left">Customer</th>
                <th className="p-3 text-left">Value</th>
                <th className="p-3 text-left">Inventory</th>
                <th className="p-3 text-left">Invoice</th>
                <th className="p-3 text-left">Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((order) => (
                <tr key={order.id} className="border-t">
                  <td className="p-3 font-medium">{order.id}</td>
                  <td className="p-3 text-muted-foreground">{order.customerName}</td>
                  <td className="p-3 text-muted-foreground">
                    {order.amount.toLocaleString()} {order.currency}
                  </td>
                  <td className="p-3">
                    <Badge variant={order.inventoryCheck === "UNAVAILABLE" ? "destructive" : "outline"}>
                      {order.inventoryCheck}
                    </Badge>
                  </td>
                  <td className="p-3 text-muted-foreground">
                    {order.financeInvoiceId ?? "PENDING"}
                  </td>
                  <td className="p-3">
                    <Badge variant={order.status === "INVOICED" ? "secondary" : "outline"}>
                      {order.status}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </DataTableShell>
      </WorkspacePanel>
    </div>
  );
}
