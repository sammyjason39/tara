import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PageHeader } from "@/core/ui/PageHeader";
import { WorkspacePanel } from "@/core/ui/WorkspacePanel";
import { DataTableShell } from "@/core/tools/DataTableShell";
import { FilterBar } from "@/core/tools/FilterBar";
import { FeedbackAlert } from "@/core/tools/FeedbackAlert";
import { useSession } from "@/core/security/session";
import { inventoryService } from "@/core/services/inventory/inventoryService";
import { orgService, type Department } from "@/core/services/hr/orgService";
import { hrService } from "@/core/services/hr/hrService";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  MoreHorizontal,
  Trash2,
  ArrowRightLeft,
  PackagePlus,
  Send,
} from "lucide-react";
import type {
  InventoryStockBalance,
  InventoryItemMaster,
} from "@/core/types/inventory/inventory";
import { TransferDialog } from "./components/TransferDialog";
import { BatchIntakeDialog } from "./components/BatchIntakeDialog";
import { BatchTransferDialog } from "./components/BatchTransferDialog";
import { ImageManager } from "./components/ImageManager";
import { Image as ImageIcon } from "lucide-react";
import { AdjustmentDialog } from "./components/AdjustmentDialog";
import { ExportButton } from "@/components/shared/ExportButton";
import { ImportDialog } from "@/components/shared/ImportDialog";
import { Upload } from "lucide-react";
import { ItemCreationTab } from "@/components/shared/ItemCreationTab";
import { TransferDesk } from "./TransferDesk";

type ViewMode = "total" | "branch" | "ecommerce" | "transfers";

const ITEM_CATEGORIES = [
  "ITEM",
  "RAW_MATERIAL",
  "FINISHED_GOOD",
  "SERVICE",
  "CONSUMABLE",
  "ASSET",
  "SPARE_PART",
] as const;

const MODULE_TAG_OPTIONS = [
  "RETAIL",
  "PROCUREMENT",
  "MANUFACTURING",
  "GENERAL",
];

export default function InventoryStockHub() {
  const session = useSession();
  const [search, setSearch] = useState("");
  const [moduleFilter, setModuleFilter] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("ALL");
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<InventoryItemMaster[]>([]);
  const [balances, setBalances] = useState<InventoryStockBalance[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [locations, setLocations] = useState<
    Array<{ id: string; name: string; code: string; address: string; type: string }>
  >([]);
  const [selectedBalance, setSelectedBalance] = useState<{
    balance: InventoryStockBalance;
    item: InventoryItemMaster;
  } | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("branch");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isTransferOpen, setIsTransferOpen] = useState(false);
  const [isBatchIntakeOpen, setIsBatchIntakeOpen] = useState(false);
  const [isBatchTransferOpen, setIsBatchTransferOpen] = useState(false);
  const [isAdjustmentOpen, setIsAdjustmentOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);

  // New Item Dialog state
  const [isNewItemOpen, setIsNewItemOpen] = useState(false);
  const [newItemName, setNewItemName] = useState("");
  const [newItemSku, setNewItemSku] = useState("");
  const [newItemBarcode, setNewItemBarcode] = useState("");
  const [newItemPrice, setNewItemPrice] = useState<number>(0);
  const [newItemDescription, setNewItemDescription] = useState("");
  const [newItemCategory, setNewItemCategory] = useState<string>("ITEM");
  const [newItemDepartmentId, setNewItemDepartmentId] = useState<string>("");
  const [newItemUom, setNewItemUom] = useState("PCS");
  const [newItemModuleTag, setNewItemModuleTag] = useState("GENERAL");
  const [newItemStatus, setNewItemStatus] = useState<"pending" | "active">("pending");
  const [isCreating, setIsCreating] = useState(false);

  // Image Manager state
  const [isImageManagerOpen, setIsImageManagerOpen] = useState(false);
  const [selectedItemForImages, setSelectedItemForImages] = useState<{ id: string, name: string } | null>(null);

  const resetNewItemForm = () => {
    setNewItemName("");
    setNewItemSku("");
    setNewItemBarcode("");
    setNewItemPrice(0);
    setNewItemDescription("");
    setNewItemCategory("ITEM");
    setNewItemDepartmentId("");
    setNewItemUom("PCS");
    setNewItemModuleTag("GENERAL");
    setNewItemStatus("pending");
  };

  const handleCreateItem = async () => {
    if (!newItemName.trim()) {
      setErrorMessage("Item name is required.");
      return;
    }
    setIsCreating(true);
    try {
      await inventoryService.createItem(session.tenant_id, session, {
        sku: newItemSku.trim() || "",
        barcode: newItemBarcode.trim() || undefined,
        name: newItemName.trim(),
        category: newItemCategory as InventoryItemMaster["category"],
        uom: newItemUom,
        basePrice: newItemPrice,
        description: newItemDescription.trim() || undefined,
        moduleTags: [newItemModuleTag],
        departmentId: newItemDepartmentId || undefined,
        status: newItemStatus,
      });
      setStatusMessage(
        `Item "${newItemName}" created successfully. ${newItemStatus === "pending" ? "Pending HOD approval." : ""}`,
      );
      setIsNewItemOpen(false);
      resetNewItemForm();
      refresh();
    } catch (err: unknown) {
      setErrorMessage(
        `Failed to create item: ${(err as Error)?.message || "Unknown error"}`,
      );
    } finally {
      setIsCreating(false);
    }
  };

  const clearStatus = () => {
    setStatusMessage(null);
    setErrorMessage(null);
  };

  const refresh = useCallback(async () => {
    try {
      const [i, b, d, locs] = await Promise.all([
        inventoryService.listItems(session.tenant_id, session),
        inventoryService.listBalances(session.tenant_id, session),
        orgService.getOrgMap(session.tenant_id, session),
        hrService.listLocations(session.tenant_id, session),
      ]);
      setItems(i);
      setBalances(b);
      setDepartments(d);
      setLocations(locs);
    } catch (err) {
      console.error("Failed to fetch inventory stock hub data:", err);
      setErrorMessage("Failed to load inventory data.");
    } finally {
      setLoading(false);
    }
  }, [session]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const itemById = useMemo(
    () => Object.fromEntries(items.map((item) => [item.id, item])),
    [items],
  );

  const locationByCode = useMemo(
    () => Object.fromEntries(locations.map((loc) => [loc.code, loc])),
    [locations],
  );

  const aggregatedBalances = useMemo(() => {
    if (viewMode !== "total") return balances;
    const map = new Map<string, InventoryStockBalance>();
    balances.forEach((b) => {
      const existing = map.get(b.itemId);
      if (existing) {
        existing.quantity += b.quantity;
      } else {
        map.set(b.itemId, {
          ...b,
          locationCode: "GLOBAL",
          departmentCode: "ALL",
        });
      }
    });
    return Array.from(map.values());
  }, [balances, viewMode]);

  const filteredBalances = useMemo(
    () =>
      (Array.isArray(aggregatedBalances) ? aggregatedBalances : []).filter((balance) => {
        const item = itemById[balance.itemId];
        if (!item) return false;

        const locInfo = locationByCode[balance.locationCode || ""];
        const isEcomLoc =
          locInfo?.type === "ECOMMERCE" ||
          balance.locationCode?.toLowerCase()?.includes("ecom") ||
          balance.locationCode?.toLowerCase()?.includes("ec");

        const hasEcomTag = (item.moduleTags || []).some(
          (tag) => tag.toUpperCase() === "ECOMMERCE" || tag.toUpperCase() === "RETAIL",
        );

        // Mode filtering
        if (viewMode === "ecommerce") {
          if (!isEcomLoc && !hasEcomTag) return false;
        } else if (viewMode === "branch") {
          // In branch mode, we show everything that isn't specifically ecom-only
          if (isEcomLoc && balance.locationCode !== "GLOBAL") return false;
        }

        const searchable =
          `${item.sku} ${item.name} ${balance.locationCode || ""} ${balance.departmentCode || ""}`.toLowerCase();
        const searchMatch = search
          ? searchable.includes(search.toLowerCase())
          : true;
        const moduleMatch = moduleFilter
          ? (item.moduleTags || []).some(
              (tag) => tag.toLowerCase() === moduleFilter.toLowerCase(),
            )
          : true;
        
        const itemDeptId = (item as Record<string, unknown>).departmentId;
        const departmentMatch = departmentFilter === "ALL" 
          ? true 
          : balance.departmentCode === departmentFilter || itemDeptId === departmentFilter;

        return searchMatch && moduleMatch && departmentMatch;
      }),
    [aggregatedBalances, itemById, moduleFilter, search, viewMode, departmentFilter, locationByCode],
  );

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? (Array.isArray(prev) ? prev : []).filter((i) => i !== id) : [...prev, id],
    );
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === filteredBalances.length) setSelectedIds([]);
    else setSelectedIds(filteredBalances.map((b) => b.id));
  };

  const handleBatchDelete = async () => {
    if (!confirm(`Delete ${selectedIds.length} items?`)) return;
    try {
      await inventoryService.batchDeleteItems(
        session.tenant_id,
        session,
        selectedIds,
      );
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
              filename={`zenvix_inventory_${session.tenant_id}.xlsx`}
            />
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsImportOpen(true)}
            >
              <Upload className="mr-2 h-4 w-4" /> Import Items
            </Button>
            <Button
              onClick={async () => {
                try {
                  await inventoryService.runLowStockScan(
                    session.tenant_id,
                    session,
                  );
                  setStatusMessage(
                    "Low stock scan completed. Alerts refreshed.",
                  );
                  refresh();
                } catch (err) {
                  setErrorMessage("Stock scan failed.");
                }
              }}
            >
              Recompute alerts
            </Button>
            <Button onClick={() => setIsNewItemOpen(true)}>+ New Item</Button>
          </div>
        }
        secondaryActions={
          <div className="flex items-center gap-2">
            <Tabs
              value={viewMode}
              onValueChange={(v) => setViewMode(v as ViewMode)}
            >
              <TabsList>
                <TabsTrigger value="total">Total</TabsTrigger>
                <TabsTrigger value="branch">Branch</TabsTrigger>
                <TabsTrigger value="ecommerce">Ecommerce</TabsTrigger>
                <TabsTrigger value="transfers">Manage Transfers</TabsTrigger>
              </TabsList>
            </Tabs>
            <Input
              placeholder="Filter by module tag (e.g. RETAIL)"
              value={moduleFilter}
              onChange={(event) => setModuleFilter(event.target.value)}
              className="min-w-[220px]"
            />
            <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Department: All" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Departments</SelectItem>
                {departments.map(dept => (
                  <SelectItem key={dept.id} value={dept.id}>{dept.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        }
      />

      <FeedbackAlert
        message={statusMessage}
        error={errorMessage}
        onClear={clearStatus}
      />

      {viewMode === "transfers" ? (
        <TransferDesk />
      ) : (
        <WorkspacePanel
          title="Location + Department Inventory"
          description="Drill-down stock records across hierarchy layers."
        >
          <div className="flex items-center justify-between mb-4 px-1">
            <FilterBar searchValue={search} onSearchChange={setSearch} />
            {selectedIds.length > 0 && (
              <div className="flex items-center gap-2 animate-in fade-in slide-in-from-right-2">
                <span className="text-sm font-medium text-primary">
                  {selectedIds.length} selected
                </span>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button disabled title="Not available yet" variant="outline" size="sm" className="gap-2">
                      Batch Actions <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      className="gap-2"
                      onClick={() => setIsBatchIntakeOpen(true)}
                    >
                      <PackagePlus className="h-4 w-4" /> Batch Intake
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      className="gap-2"
                      onClick={() => setIsBatchTransferOpen(true)}
                    >
                      <ArrowRightLeft className="h-4 w-4" /> Batch Transfer
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      className="gap-2 text-destructive"
                      onClick={handleBatchDelete}
                    >
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
                      checked={
                        selectedIds.length === filteredBalances.length &&
                        filteredBalances.length > 0
                      }
                      onCheckedChange={toggleSelectAll}
                    />
                  </th>
                  <th className="p-3 text-left w-12"></th>
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
                      <td className="p-3">
                        <div 
                          className="w-10 h-10 rounded border bg-muted/50 flex items-center justify-center overflow-hidden cursor-pointer hover:border-primary transition-colors"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedItemForImages({ id: item.id, name: item.name });
                            setIsImageManagerOpen(true);
                          }}
                        >
                          {item.image_url ? (
                            <img 
                              src={item.image_url.startsWith("/v1") 
                                ? `http://localhost:3001${item.image_url}` 
                                : item.image_url} 
                              alt={item.name} 
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <ImageIcon className="h-4 w-4 text-muted-foreground" />
                          )}
                        </div>
                      </td>
                      <td className="p-3 font-medium">{item.sku}</td>
                      <td className="p-3">{item.name}</td>
                      <td className="p-3 text-muted-foreground">
                        {balance.locationCode}
                      </td>
                      <td className="p-3 text-muted-foreground">
                        {balance.departmentCode ?? "GENERAL"}
                      </td>
                      <td className="p-3 text-right font-mono font-bold">
                        {balance.quantity.toLocaleString()}
                      </td>
                      <td className="p-3 text-muted-foreground">
                        {balance.reorderPoint}
                      </td>
                      <td className="p-3 text-xs text-muted-foreground">
                        {(item.moduleTags || []).join(", ")}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </DataTableShell>
        </WorkspacePanel>
      )}
      <Dialog
        open={!!selectedBalance}
        onOpenChange={(open) => { if (!open) setSelectedBalance(null); }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Stock Record Detail</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="grid grid-cols-2 text-sm gap-y-2">
              <span className="text-muted-foreground">SKU:</span>
              <span className="font-mono font-bold">
                {selectedBalance?.item.sku}
              </span>
              <span className="text-muted-foreground">Item Name:</span>
              <span className="font-semibold">
                {selectedBalance?.item.name}
              </span>
              <span className="text-muted-foreground">Location:</span>
              <span>{selectedBalance?.balance.locationCode}</span>
              <span className="text-muted-foreground">Department:</span>
              <span>
                {selectedBalance?.balance.departmentCode || "GENERAL"}
              </span>
              <span className="text-muted-foreground">Physical Qty:</span>
              <span className="font-bold text-lg">
                {selectedBalance?.balance.quantity.toLocaleString()}
              </span>
              <span className="text-muted-foreground">Reorder Point:</span>
              <span>{selectedBalance?.balance.reorderPoint}</span>
            </div>
            <div className="border-t pt-2">
              <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Module Context
              </p>
              <div className="flex flex-wrap gap-1">
                {(selectedBalance?.item.moduleTags || []).map((tag) => (
                  <span
                    key={tag}
                    className="rounded bg-muted px-1.5 py-0.5 text-[10px]"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-4">
              <Button
                size="sm"
                variant="outline"
                className="gap-2"
                onClick={() => {
                  // Close detail first, then open transfer dialog
                  setSelectedBalance(null);
                  setTimeout(() => setIsTransferOpen(true), 50);
                }}
              >
                <Send className="h-4 w-4" /> Start Transfer
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="gap-2"
                onClick={() => {
                  // Close detail first, then open adjustment dialog
                  setSelectedBalance(null);
                  setTimeout(() => setIsAdjustmentOpen(true), 50);
                }}
              >
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

      {/* New Item Creation Dialog */}
      <Dialog
        open={isNewItemOpen}
        onOpenChange={(open) => {
          setIsNewItemOpen(open);
          if (!open) resetNewItemForm();
        }}
      >
        <DialogContent
          className="max-w-6xl rounded-[2.5rem] p-0 border-none shadow-2xl bg-slate-50 overflow-hidden h-[90vh] flex flex-col"
        >
          <div className="flex-1 overflow-y-auto pt-6 px-1">
            <ItemCreationTab
              canWrite={true}
              session={session}
              tenantId={session.tenant_id}
              categoryOptions={[
                { id: "all", name: "All Categories" },
                ...ITEM_CATEGORIES.map((c) => ({ id: c, name: c })),
              ]}
              onSuccess={() => {
                setIsNewItemOpen(false);
                refresh();
              }}
            />
          </div>
        </DialogContent>
      </Dialog>

      {selectedItemForImages && (
        <ImageManager
          itemId={selectedItemForImages.id}
          itemName={selectedItemForImages.name}
          isOpen={isImageManagerOpen}
          onClose={() => {
            setIsImageManagerOpen(false);
            setSelectedItemForImages(null);
          }}
          onImagesUpdated={refresh}
        />
      )}
    </div>
  );
}
