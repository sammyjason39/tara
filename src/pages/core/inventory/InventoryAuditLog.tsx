import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/core/ui/PageHeader";
import { WorkspacePanel } from "@/core/ui/WorkspacePanel";
import { DataTableShell } from "@/core/tools/DataTableShell";
import { FilterBar } from "@/core/tools/FilterBar";
import { useSession } from "@/core/security/session";
import { inventoryService } from "@/core/services/inventory/inventoryService";

export default function InventoryAuditLog() {
  const session = useSession();
  const [search, setSearch] = useState("");
  const [, setVersion] = useState(0);
  const movements = inventoryService.listMovements(session.tenantId);
  const cycles = inventoryService.listAuditCycles(session.tenantId);
  const integrations = inventoryService.listIntegrationEvents(session.tenantId);

  const filteredMovements = useMemo(
    () =>
      movements.filter((item) =>
        search
          ? `${item.type} ${item.reason} ${item.referenceId ?? ""}`
              .toLowerCase()
              .includes(search.toLowerCase())
          : true,
      ),
    [movements, search],
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Audit Log"
        subtitle="Immutable activity trail for stock movements, audit cycles, and integration sync events."
        primaryAction={
          <Button
            onClick={() => {
              inventoryService.startAuditCycle(session.tenantId, session, {
                locationCode: "JKT-WH",
                scope: "LOCATION",
              });
              setVersion((prev) => prev + 1);
            }}
          >
            Start Audit Cycle
          </Button>
        }
        secondaryActions={
          <Input
            placeholder="Search audit trail"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="min-w-[220px]"
          />
        }
      />

      <WorkspacePanel title="Movement Ledger" description="Every stock movement is traceable with actor and reason.">
        <FilterBar searchValue={search} onSearchChange={setSearch} />
        <DataTableShell total={filteredMovements.length} page={1} pageSize={10}>
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-xs uppercase text-muted-foreground">
              <tr>
                <th className="p-3 text-left">Timestamp</th>
                <th className="p-3 text-left">Type</th>
                <th className="p-3 text-left">Item</th>
                <th className="p-3 text-left">Qty</th>
                <th className="p-3 text-left">Reason</th>
                <th className="p-3 text-left">Actor</th>
              </tr>
            </thead>
            <tbody>
              {filteredMovements.map((item) => (
                <tr key={item.id} className="border-t">
                  <td className="p-3 text-muted-foreground">{item.createdAt.slice(0, 16).replace("T", " ")}</td>
                  <td className="p-3 font-medium">{item.type}</td>
                  <td className="p-3 text-muted-foreground">{item.itemId}</td>
                  <td className="p-3">{item.quantity}</td>
                  <td className="p-3">{item.reason}</td>
                  <td className="p-3 text-muted-foreground">{item.performedBy}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </DataTableShell>
      </WorkspacePanel>

      <div className="grid gap-6 xl:grid-cols-[1fr_1fr]">
        <WorkspacePanel title="Audit Cycles" description="Open and completed stock count cycles by scope.">
          <DataTableShell total={cycles.length} page={1} pageSize={10}>
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="p-3 text-left">Cycle</th>
                  <th className="p-3 text-left">Scope</th>
                  <th className="p-3 text-left">Location</th>
                  <th className="p-3 text-left">Status</th>
                  <th className="p-3 text-left">Action</th>
                </tr>
              </thead>
              <tbody>
                {cycles.map((cycle) => (
                  <tr key={cycle.id} className="border-t">
                    <td className="p-3 font-medium">{cycle.id}</td>
                    <td className="p-3 text-muted-foreground">{cycle.scope}</td>
                    <td className="p-3 text-muted-foreground">{cycle.locationCode}</td>
                    <td className="p-3">{cycle.status}</td>
                    <td className="p-3">
                      {cycle.status === "OPEN" ? (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            inventoryService.closeAuditCycle(session.tenantId, session, cycle.id, {
                              expectedValue: 1000,
                              countedValue: 990,
                            });
                            setVersion((prev) => prev + 1);
                          }}
                        >
                          Close
                        </Button>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </DataTableShell>
        </WorkspacePanel>

        <WorkspacePanel title="Integration Events" description="Cross-module inventory synchronization events.">
          <DataTableShell total={integrations.length} page={1} pageSize={10}>
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="p-3 text-left">Timestamp</th>
                  <th className="p-3 text-left">Target</th>
                  <th className="p-3 text-left">Type</th>
                  <th className="p-3 text-left">Status</th>
                </tr>
              </thead>
              <tbody>
                {integrations.map((event) => (
                  <tr key={event.id} className="border-t">
                    <td className="p-3 text-muted-foreground">{event.createdAt.slice(0, 16).replace("T", " ")}</td>
                    <td className="p-3 font-medium">{event.target}</td>
                    <td className="p-3 text-muted-foreground">{event.eventType}</td>
                    <td className="p-3">{event.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </DataTableShell>
        </WorkspacePanel>
      </div>
    </div>
  );
}
