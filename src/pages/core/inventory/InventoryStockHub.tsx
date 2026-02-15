import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { PageHeader } from "@/core/ui/PageHeader";
import { WorkspacePanel } from "@/core/ui/WorkspacePanel";
import { DataTableShell } from "@/core/tools/DataTableShell";
import { FilterBar } from "@/core/tools/FilterBar";
import { FeedbackAlert } from "@/core/tools/FeedbackAlert";
import { useSession } from "@/core/security/session";
import { inventoryService } from "@/core/services/inventory/inventoryService";
import type { InventoryStockBalance, InventoryItemMaster } from "@/core/types/inventory/inventory";

export default function InventoryStockHub() {
  const session = useSession();
  const [search, setSearch] = useState("");
  const [moduleFilter, setModuleFilter] = useState("");
  const [, setVersion] = useState(0);
  const [selectedBalance, setSelectedBalance] = useState<{ balance: InventoryStockBalance; item: InventoryItemMaster } | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const clearStatus = () => {
    setStatusMessage(null);
    setErrorMessage(null);
  };
  const items = inventoryService.listItems(session.tenantId);
  const balances = inventoryService.listBalances(session.tenantId);
  const itemById = useMemo(
    () => Object.fromEntries(items.map((item) => [item.id, item])),
    [items],
  );

  const filteredBalances = useMemo(
    () =>
      balances.filter((balance) => {
        const item = itemById[balance.itemId];
        if (!item) return false;
        const searchable = `${item.sku} ${item.name} ${balance.locationCode} ${balance.departmentCode ?? ""}`.toLowerCase();
        const searchMatch = search ? searchable.includes(search.toLowerCase()) : true;
        const moduleMatch = moduleFilter
          ? item.moduleTags.some((tag) => tag.toLowerCase() === moduleFilter.toLowerCase())
          : true;
        return searchMatch && moduleMatch;
      }),
    [balances, itemById, moduleFilter, search],
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Stock Hub"
        subtitle="Global -> location -> department stock visibility with module-aware context tags."
        primaryAction={
          <Button
            onClick={() => {
              try {
                inventoryService.runLowStockScan(session.tenantId, session);
                setStatusMessage("Low stock scan completed. Alerts refreshed.");
                setVersion((prev) => prev + 1);
              } catch (err) {
                setErrorMessage("Stock scan failed.");
              }
            }}
          >
            Recompute alerts
          </Button>
        }
        secondaryActions={
          <Input
            placeholder="Filter by module tag (e.g. RETAIL)"
            value={moduleFilter}
            onChange={(event) => setModuleFilter(event.target.value)}
            className="min-w-[220px]"
          />
        }
      />

      <FeedbackAlert message={statusMessage} error={errorMessage} onClear={clearStatus} />

      <WorkspacePanel title="Location + Department Inventory" description="Drill-down stock records across hierarchy layers.">
        <FilterBar searchValue={search} onSearchChange={setSearch} />
        <DataTableShell total={filteredBalances.length} page={1} pageSize={10}>
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-xs uppercase text-muted-foreground">
              <tr>
                <th className="p-3 text-left">SKU</th>
                <th className="p-3 text-left">Item</th>
                <th className="p-3 text-left">Location</th>
                <th className="p-3 text-left">Department</th>
                <th className="p-3 text-left">Qty</th>
                <th className="p-3 text-left">Reorder</th>
                <th className="p-3 text-left">Module Tags</th>
              </tr>
            </thead>
            <tbody>
              {filteredBalances.map((balance) => {
                const item = itemById[balance.itemId];
                if (!item) return null;
                return (
                  <tr
                    key={balance.id}
                    className="cursor-pointer border-t hover:bg-muted/50"
                    onClick={() => setSelectedBalance({ balance, item })}
                  >
                    <td className="p-3 font-medium">{item.sku}</td>
                    <td className="p-3">{item.name}</td>
                    <td className="p-3 text-muted-foreground">{balance.locationCode}</td>
                    <td className="p-3 text-muted-foreground">{balance.departmentCode ?? "GENERAL"}</td>
                    <td className="p-3">{balance.quantity.toLocaleString()}</td>
                    <td className="p-3 text-muted-foreground">{balance.reorderPoint}</td>
                    <td className="p-3 text-xs text-muted-foreground">{item.moduleTags.join(", ")}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </DataTableShell>
      </WorkspacePanel>
      <Dialog open={!!selectedBalance} onOpenChange={() => setSelectedBalance(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Stock Record Detail</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="grid grid-cols-2 text-sm gap-y-2">
              <span className="text-muted-foreground">SKU:</span>
              <span className="font-mono font-bold">{selectedBalance?.item.sku}</span>
              <span className="text-muted-foreground">Item Name:</span>
              <span className="font-semibold">{selectedBalance?.item.name}</span>
              <span className="text-muted-foreground">Location:</span>
              <span>{selectedBalance?.balance.locationCode}</span>
              <span className="text-muted-foreground">Department:</span>
              <span>{selectedBalance?.balance.departmentCode || "GENERAL"}</span>
              <span className="text-muted-foreground">Physical Qty:</span>
              <span className="font-bold text-lg">{selectedBalance?.balance.quantity.toLocaleString()}</span>
              <span className="text-muted-foreground">Reorder Point:</span>
              <span>{selectedBalance?.balance.reorderPoint}</span>
            </div>
            <div className="border-t pt-2">
              <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Module Context</p>
              <div className="flex flex-wrap gap-1">
                {selectedBalance?.item.moduleTags.map(tag => (
                  <span key={tag} className="rounded bg-muted px-1.5 py-0.5 text-[10px]">{tag}</span>
                ))}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
