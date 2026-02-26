import { useCallback, useEffect, useMemo, useState } from "react";
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
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { MoreHorizontal, Trash2, ArrowRightLeft, PackagePlus, Send } from "lucide-react";
import type { InventoryStockBalance, InventoryItemMaster } from "@/core/types/inventory/inventory";
import { TransferDialog } from "./components/TransferDialog";
import { BatchIntakeDialog } from "./components/BatchIntakeDialog";
import { BatchTransferDialog } from "./components/BatchTransferDialog";
import { AdjustmentDialog } from "./components/AdjustmentDialog";
import { ExportButton } from "@/components/shared/ExportButton";
import { ImportDialog } from "@/components/shared/ImportDialog";
import { Upload } from "lucide-react";

type ViewMode = "total" | "branch" | "ecommerce";

export default function InventoryStockHub() {
  const session = useSession();
  const [search, setSearch] = useState("");
  const [moduleFilter, setModuleFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<InventoryItemMaster[]>([]);
  const [balances, setBalances] = useState<InventoryStockBalance[]>([]);
  const [selectedBalance, setSelectedBalance] = useState<{ balance: InventoryStockBalance; item: InventoryItemMaster } | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("branch");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isTransferOpen, setIsTransferOpen] = useState(false);
  const [isBatchIntakeOpen, setIsBatchIntakeOpen] = useState(false);
  const [isBatchTransferOpen, setIsBatchTransferOpen] = useState(false);
  const [isAdjustmentOpen, setIsAdjustmentOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);

  const clearStatus = () => {
    setStatusMessage(null);
    setErrorMessage(null);
  };

  const refresh = useCallback(async () => {
    try {
      const [i, b] = await Promise.all([
        inventoryService.listItems(session.tenantId),
        inventoryService.listBalances(session.tenantId),
      ]);
      setItems(i);
      setBalances(b);
    } catch (err) {
      console.error("Failed to fetch inventory stock hub data:", err);
      setErrorMessage("Failed to load inventory data.");
    } finally {
      setLoading(false);
    }
  }, [session.tenantId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const itemById = useMemo(
    () => Object.fromEntries(items.map((item) => [item.id, item])),
    [items],
  );

  const aggregatedBalances = useMemo(() => {
    if (viewMode !== "total") return balances;
    const map = new Map<string, InventoryStockBalance>();
    balances.forEach(b => {
      const existing = map.get(b.itemId);
      if (existing) {
        existing.quantity += b.quantity;
      } else {
        map.set(b.itemId, { ...b, locationCode: "GLOBAL", departmentCode: "ALL" });
      }
    });
    return Array.from(map.values());
  }, [balances, viewMode]);

  const filteredBalances = useMemo(
    () =>
      aggregatedBalances.filter((balance) => {
        const item = itemById[balance.itemId];
        if (!item) return false;

        // Mode filtering
        if (viewMode === "ecommerce") {
          const isEcom = balance.locationCode?.toLowerCase()?.includes("ecom") || balance.locationCode?.toLowerCase()?.includes("ec");
          if (!isEcom) return false;
        } else if (viewMode === "branch") {
           const isEcom = balance.locationCode?.toLowerCase()?.includes("ecom") || balance.locationCode?.toLowerCase()?.includes("ec");
           if (isEcom && balance.locationCode !== "GLOBAL") return false;
        }

        const searchable = `${item.sku} ${item.name} ${balance.locationCode || ""} ${balance.departmentCode || ""}`.toLowerCase();
        const searchMatch = search ? searchable.includes(search.toLowerCase()) : true;
        const moduleMatch = moduleFilter
          ? (item.moduleTags || []).some((tag) => tag.toLowerCase() === moduleFilter.toLowerCase())
          : true;
        return searchMatch && moduleMatch;
      }),
    [aggregatedBalances, itemById, moduleFilter, search, viewMode],
  );

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === filteredBalances.length) setSelectedIds([]);
    else setSelectedIds(filteredBalances.map(b => b.id));
  };

  const handleBatchDelete = async () => {
    if (!confirm(`Delete ${selectedIds.length} items?`)) return;
    try {
      await inventoryService.batchDeleteItems(session.tenantId, session, selectedIds);
      setStatusMessage("Batch delete successful.");
      refresh();
      setSelectedIds([]);
    } catch (err) {
      setErrorMessage("Batch delete failed.");
    }
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <p className="text-muted-foreground">Loading inventory records...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Stock Hub"
        subtitle="Global -> location -> department stock visibility with module-aware context tags."
        primaryAction={
          <div className="flex items-center gap-2">
            <ExportButton 
              endpoint="/inventory/items/export" 
              filename={`zenvix_inventory_${session.tenantId}.xlsx`} 
            />
            <Button variant="outline" size="sm" onClick={() => setIsImportOpen(true)}>
              <Upload className="mr-2 h-4 w-4" /> Import Items
            </Button>
            <Button
              onClick={async () => {
                try {
                  await inventoryService.runLowStockScan(session.tenantId, session);
                  setStatusMessage("Low stock scan completed. Alerts refreshed.");
                  refresh();
                } catch (err) {
                  setErrorMessage("Stock scan failed.");
                }
              }}
            >
              Recompute alerts
            </Button>
            <Button onClick={() => setStatusMessage("Creation dialog not yet implemented.")}>+ New Item</Button>
          </div>
        }
        secondaryActions={
          <div className="flex items-center gap-2">
            <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as ViewMode)}>
              <TabsList>
                <TabsTrigger value="total">Total</TabsTrigger>
                <TabsTrigger value="branch">Branch</TabsTrigger>
                <TabsTrigger value="ecommerce">Ecommerce</TabsTrigger>
              </TabsList>
            </Tabs>
            <Input
              placeholder="Filter by module tag (e.g. RETAIL)"
              value={moduleFilter}
              onChange={(event) => setModuleFilter(event.target.value)}
              className="min-w-[220px]"
            />
          </div>
        }
      />

      <FeedbackAlert message={statusMessage} error={errorMessage} onClear={clearStatus} />

      <WorkspacePanel title="Location + Department Inventory" description="Drill-down stock records across hierarchy layers.">
        <div className="flex items-center justify-between mb-4 px-1">
          <FilterBar searchValue={search} onSearchChange={setSearch} />
          {selectedIds.length > 0 && (
            <div className="flex items-center gap-2 animate-in fade-in slide-in-from-right-2">
              <span className="text-sm font-medium text-primary">{selectedIds.length} selected</span>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-2">
                    Batch Actions <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem className="gap-2" onClick={() => setIsBatchIntakeOpen(true)}>
                    <PackagePlus className="h-4 w-4" /> Batch Intake
                  </DropdownMenuItem>
                  <DropdownMenuItem className="gap-2" onClick={() => setIsBatchTransferOpen(true)}>
                    <ArrowRightLeft className="h-4 w-4" /> Batch Transfer
                  </DropdownMenuItem>
                  <DropdownMenuItem className="gap-2 text-destructive" onClick={handleBatchDelete}>
                    <Trash2 className="h-4 w-4" /> Delete Selected
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )}
        </div>
        <DataTableShell total={filteredBalances.length} page={1} pageSize={10}>
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-xs uppercase text-muted-foreground">
              <tr>
                <th className="p-3 text-left w-10">
                  <Checkbox 
                    checked={selectedIds.length === filteredBalances.length && filteredBalances.length > 0} 
                    onCheckedChange={toggleSelectAll}
                  />
                </th>
                <th className="p-3 text-left">SKU</th>
                <th className="p-3 text-left">Item</th>
                <th className="p-3 text-left">Location</th>
                <th className="p-3 text-left">Department</th>
                <th className="p-3 text-right">Qty</th>
                <th className="p-3 text-left">Reorder</th>
                <th className="p-3 text-left">Module Tags</th>
              </tr>
            </thead>
            <tbody>
              {filteredBalances.map((balance) => {
                const item = itemById[balance.itemId];
                if (!item) return null;
                const isSelected = selectedIds.includes(balance.id);
                return (
                  <tr
                    key={balance.id}
                    className={`cursor-pointer border-t hover:bg-muted/50 transition-colors ${isSelected ? "bg-primary/5" : ""}`}
                    onClick={() => setSelectedBalance({ balance, item })}
                  >
                    <td className="p-3" onClick={(e) => e.stopPropagation()}>
                      <Checkbox 
                        checked={isSelected} 
                        onCheckedChange={() => toggleSelect(balance.id)}
                      />
                    </td>
                    <td className="p-3 font-medium">{item.sku}</td>
                    <td className="p-3">{item.name}</td>
                    <td className="p-3 text-muted-foreground">{balance.locationCode}</td>
                    <td className="p-3 text-muted-foreground">{balance.departmentCode ?? "GENERAL"}</td>
                    <td className="p-3 text-right font-mono font-bold">{balance.quantity.toLocaleString()}</td>
                    <td className="p-3 text-muted-foreground">{balance.reorderPoint}</td>
                    <td className="p-3 text-xs text-muted-foreground">{(item.moduleTags || []).join(", ")}</td>
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
                {(selectedBalance?.item.moduleTags || []).map(tag => (
                  <span key={tag} className="rounded bg-muted px-1.5 py-0.5 text-[10px]">{tag}</span>
                ))}
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-4">
              <Button size="sm" variant="outline" className="gap-2" onClick={() => setIsTransferOpen(true)}>
                <Send className="h-4 w-4" /> Start Transfer
              </Button>
              <Button size="sm" variant="outline" className="gap-2" onClick={() => setIsAdjustmentOpen(true)}>
                <ArrowRightLeft className="h-4 w-4" /> Adjust Stock
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <TransferDialog 
        open={isTransferOpen} 
        onOpenChange={setIsTransferOpen} 
        selectedBalance={selectedBalance} 
        onSuccess={() => {
          setStatusMessage("Transfer successfully logged.");
          refresh();
        }}
      />

      <BatchIntakeDialog 
        open={isBatchIntakeOpen} 
        onOpenChange={setIsBatchIntakeOpen} 
        onSuccess={() => {
          setStatusMessage("Batch intake successfully processed.");
          refresh();
        }}
      />

      <BatchTransferDialog 
        open={isBatchTransferOpen} 
        onOpenChange={setIsBatchTransferOpen} 
        selectedIds={selectedIds}
        balances={balances}
        onSuccess={() => {
          setStatusMessage("Bulk transfer completed.");
          refresh();
          setSelectedIds([]);
        }}
      />

      <AdjustmentDialog 
        open={isAdjustmentOpen} 
        onOpenChange={setIsAdjustmentOpen} 
        selectedBalance={selectedBalance}
        onSuccess={() => {
          setStatusMessage("Adjustment request submitted for approval.");
          refresh();
        }}
      />

      <ImportDialog
        open={isImportOpen}
        onOpenChange={setIsImportOpen}
        endpoint="/inventory/items/import"
        title="Import Inventory Items"
        onSuccess={() => {
          refresh();
          setIsImportOpen(false);
        }}
      />
    </div>
  );
}
