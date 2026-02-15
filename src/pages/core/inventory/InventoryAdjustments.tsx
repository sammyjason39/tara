import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { PageHeader } from "@/core/ui/PageHeader";
import { WorkspacePanel } from "@/core/ui/WorkspacePanel";
import { DataTableShell } from "@/core/tools/DataTableShell";
import { FilterBar } from "@/core/tools/FilterBar";
import { useSession } from "@/core/security/session";
import { inventoryService } from "@/core/services/inventory/inventoryService";

export default function InventoryAdjustments() {
  const session = useSession();
  const [search, setSearch] = useState("");
  const [itemId, setItemId] = useState("");
  const [locationCode, setLocationCode] = useState("JKT-WH");
  const [departmentCode, setDepartmentCode] = useState("PRODUCTION");
  const [delta, setDelta] = useState("0");
  const [reason, setReason] = useState("");
  const [, setVersion] = useState(0);

  const adjustments = inventoryService.listAdjustments(session.tenantId);
  const items = inventoryService.listItems(session.tenantId);
  const filtered = useMemo(
    () =>
      adjustments.filter((item) =>
        search
          ? `${item.id} ${item.reason} ${item.status}`.toLowerCase().includes(search.toLowerCase())
          : true,
      ),
    [adjustments, search],
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Adjustments"
        subtitle="Approval-gated stock adjustments for high-risk corrections and reconciliation."
        secondaryActions={
          <Input
            placeholder="Search adjustments"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="min-w-[220px]"
          />
        }
      />

      <WorkspacePanel title="Create Adjustment Request" description="Submit stock correction with reason and approval trace.">
        <div className="grid gap-3 md:grid-cols-5">
          <Input
            placeholder={`Item ID (default ${items[0]?.id ?? "N/A"})`}
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
            placeholder="Delta (+/-)"
            value={delta}
            onChange={(event) => setDelta(event.target.value)}
          />
          <Button
            onClick={() => {
              const selectedItem = itemId || items[0]?.id;
              if (!selectedItem) return;
              inventoryService.requestAdjustment(session.tenantId, session, {
                itemId: selectedItem,
                locationCode,
                departmentCode,
                requestedDelta: Number(delta || "0"),
                reason: reason || "Manual stock reconciliation",
              });
              setItemId("");
              setReason("");
              setDelta("0");
              setVersion((prev) => prev + 1);
            }}
          >
            Request Adjustment
          </Button>
        </div>
        <Textarea
          className="mt-3"
          placeholder="Reason"
          value={reason}
          onChange={(event) => setReason(event.target.value)}
        />
      </WorkspacePanel>

      <WorkspacePanel title="Adjustment Queue" description="Pending and completed adjustment approvals.">
        <FilterBar searchValue={search} onSearchChange={setSearch} />
        <DataTableShell total={filtered.length} page={1} pageSize={10}>
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-xs uppercase text-muted-foreground">
              <tr>
                <th className="p-3 text-left">Adjustment</th>
                <th className="p-3 text-left">Item</th>
                <th className="p-3 text-left">Location</th>
                <th className="p-3 text-left">Delta</th>
                <th className="p-3 text-left">Status</th>
                <th className="p-3 text-left">Action</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((item) => (
                <tr key={item.id} className="border-t">
                  <td className="p-3 font-medium">{item.id}</td>
                  <td className="p-3 text-muted-foreground">{item.itemId}</td>
                  <td className="p-3 text-muted-foreground">
                    {item.locationCode}/{item.departmentCode ?? "GENERAL"}
                  </td>
                  <td className="p-3">{item.requestedDelta}</td>
                  <td className="p-3">{item.status}</td>
                  <td className="p-3">
                    {item.status === "PENDING_APPROVAL" ? (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          inventoryService.approveAdjustment(session.tenantId, session, item.id);
                          setVersion((prev) => prev + 1);
                        }}
                      >
                        Approve
                      </Button>
                    ) : null}
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

