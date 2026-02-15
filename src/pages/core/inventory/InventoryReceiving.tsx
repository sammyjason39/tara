import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/core/ui/PageHeader";
import { WorkspacePanel } from "@/core/ui/WorkspacePanel";
import { DataTableShell } from "@/core/tools/DataTableShell";
import { FilterBar } from "@/core/tools/FilterBar";
import { useSession } from "@/core/security/session";
import { inventoryService } from "@/core/services/inventory/inventoryService";

export default function InventoryReceiving() {
  const session = useSession();
  const [search, setSearch] = useState("");
  const [itemId, setItemId] = useState("");
  const [locationCode, setLocationCode] = useState("JKT-WH");
  const [departmentCode, setDepartmentCode] = useState("PRODUCTION");
  const [quantity, setQuantity] = useState("1");
  const [unitCost, setUnitCost] = useState("0");
  const [, setVersion] = useState(0);

  const queue = inventoryService.listProcurementReceiptQueue(session.tenantId);
  const items = inventoryService.listItems(session.tenantId);
  const filteredQueue = useMemo(
    () =>
      queue.filter((sync) =>
        search
          ? `${sync.finalPoId} ${sync.branchCode} ${sync.status}`
              .toLowerCase()
              .includes(search.toLowerCase())
          : true,
      ),
    [queue, search],
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Receiving Desk"
        subtitle="Procurement goods-receipt synchronization with quantity and mismatch controls."
        secondaryActions={
          <Input
            placeholder="Search receiving queue"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="min-w-[220px]"
          />
        }
      />

      <WorkspacePanel title="Procurement Receipt Queue" description="Pending goods receipt confirmations from Procurement PO release.">
        <FilterBar searchValue={search} onSearchChange={setSearch} />
        <DataTableShell total={filteredQueue.length} page={1} pageSize={10}>
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-xs uppercase text-muted-foreground">
              <tr>
                <th className="p-3 text-left">Final PO</th>
                <th className="p-3 text-left">Branch</th>
                <th className="p-3 text-left">Status</th>
                <th className="p-3 text-left">Issue Count</th>
                <th className="p-3 text-left">Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredQueue.map((sync) => (
                <tr key={sync.id} className="border-t">
                  <td className="p-3 font-medium">{sync.finalPoId}</td>
                  <td className="p-3 text-muted-foreground">{sync.branchCode}</td>
                  <td className="p-3">{sync.status}</td>
                  <td className="p-3">{sync.issueCount}</td>
                  <td className="p-3">
                    <div className="flex flex-wrap gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          const selectedItemId = itemId || items[0]?.id;
                          if (!selectedItemId) return;
                          inventoryService.processProcurementReceipt(session.tenantId, session, {
                            syncId: sync.id,
                            itemId: selectedItemId,
                            quantity: Number(quantity || "1"),
                            unitCost: Number(unitCost || "0"),
                            locationCode,
                            departmentCode,
                            mismatch: false,
                          });
                          setVersion((prev) => prev + 1);
                        }}
                      >
                        Confirm
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          const selectedItemId = itemId || items[0]?.id;
                          if (!selectedItemId) return;
                          inventoryService.processProcurementReceipt(session.tenantId, session, {
                            syncId: sync.id,
                            itemId: selectedItemId,
                            quantity: Number(quantity || "1"),
                            unitCost: Number(unitCost || "0"),
                            locationCode,
                            departmentCode,
                            mismatch: true,
                            mismatchIssueCount: Math.max(sync.issueCount, 1),
                          });
                          setVersion((prev) => prev + 1);
                        }}
                      >
                        Report mismatch
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </DataTableShell>
      </WorkspacePanel>

      <WorkspacePanel title="Receipt Inputs" description="Default posting target used by quick confirmation actions.">
        <div className="grid gap-3 md:grid-cols-5">
          <Input
            placeholder="Item ID (optional)"
            value={itemId}
            onChange={(event) => setItemId(event.target.value)}
          />
          <Input
            placeholder="Location"
            value={locationCode}
            onChange={(event) => setLocationCode(event.target.value.toUpperCase())}
          />
          <Input
            placeholder="Department"
            value={departmentCode}
            onChange={(event) => setDepartmentCode(event.target.value.toUpperCase())}
          />
          <Input
            type="number"
            placeholder="Quantity"
            value={quantity}
            onChange={(event) => setQuantity(event.target.value)}
          />
          <Input
            type="number"
            placeholder="Unit Cost"
            value={unitCost}
            onChange={(event) => setUnitCost(event.target.value)}
          />
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          Changes are applied to quick actions above and support location/department-level postings.
        </p>
      </WorkspacePanel>
    </div>
  );
}
