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
import { retailService } from "@/core/services/retail/retailService";
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
import { CategoryManager } from "@/components/shared/CategoryManager";
import { ImageManager } from "./components/ImageManager";
import { FolderTree, Move, MoreVertical } from "lucide-react";
import { Image as ImageIcon } from "lucide-react";
import { AdjustmentDialog } from "./components/AdjustmentDialog";
import { ExportButton } from "@/components/shared/ExportButton";
import { ImportDialog } from "@/components/shared/ImportDialog";
import { Upload } from "lucide-react";
import { ItemCreationTab } from "@/components/shared/ItemCreationTab";
import { TransferDesk } from "./TransferDesk";
import { useBarcodeScanner } from "@/hooks/useBarcodeScanner";
import { InventoryGlassHeader } from "@/components/shared/InventoryGlassHeader";
import { InventoryFilterHub } from "@/components/shared/InventoryFilterHub";
import { Package, LayoutGrid, Layers, Globe, ArrowLeftRight, Search, Plus, Filter, LayoutList, LayoutPanelLeft } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge as UIBadge } from "@/components/ui/badge";

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
  const [selectedLocationId, setSelectedLocationId] = useState<string>("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isTransferOpen, setIsTransferOpen] = useState(false);
  const [isBatchIntakeOpen, setIsBatchIntakeOpen] = useState(false);
  const [isBatchTransferOpen, setIsBatchTransferOpen] = useState(false);
  const [isAdjustmentOpen, setIsAdjustmentOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [isCategoryManagerOpen, setIsCategoryManagerOpen] = useState(false);
  const [dynamicCategories, setDynamicCategories] = useState<any[]>([]);
  const [isReclassifyOpen, setIsReclassifyOpen] = useState(false);
  const [selectedItemForReclassify, setSelectedItemForReclassify] = useState<any>(null);
  const [newCategoryId, setNewCategoryId] = useState("");

  useBarcodeScanner((barcode) => {
    setSearch(barcode);
    setStatusMessage(`Scanned barcode: ${barcode}`);
  });

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
      const locFilter = selectedLocationId || undefined;
      const [i, b, d, locs, cats, channels] = await Promise.all([
        inventoryService.listItems(session.tenant_id, session, locFilter),
        inventoryService.listBalances(session.tenant_id, session, locFilter),
        orgService.getOrgMap(session.tenant_id, session),
        hrService.listLocations(session.tenant_id, session),
        inventoryService.listCategories(session.tenant_id, session),
        retailService.listChannels(session.tenant_id, session),
      ]);
      setItems(i);
      setBalances(b);
      setDepartments(d);
      
      // Merge locations with ecommerce channels
      const ecommerceLocations = channels
        .filter(c => c.type === "ecommerce" || c.type === "DIRECT" || c.type === "OWNED")
        .map(c => ({
          id: c.id,
          name: `${c.name} (Ecommerce)`,
          code: c.id, // Fallback to ID for code
          address: "Online",
          type: "ecommerce"
        }));

      setLocations([...locs, ...ecommerceLocations]);
      setDynamicCategories(cats);
    } catch (err) {
      console.error("Failed to fetch inventory stock hub data:", err);
      setErrorMessage("Failed to load inventory data.");
    } finally {
      setLoading(false);
    }
  }, [session, selectedLocationId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const itemById = useMemo(
    () => Object.fromEntries((Array.isArray(items) ? items : []).map((item) => [item.id, item])),
    [items],
  );

  const locationByCode = useMemo(
    () => Object.fromEntries((Array.isArray(locations) ? locations : []).map((loc) => [loc.code, loc])),
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
    else setSelectedIds((Array.isArray(filteredBalances) ? filteredBalances : []).map((b) => b.id));
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
    <div className="p-8 space-y-8 bg-slate-950 min-h-screen text-white">
      <InventoryGlassHeader
        title="Stock Hub"
        subtitle="Global -> location -> department stock visibility with module-aware context tags."
        icon={Package}
        stats={[
          { label: "Total Items", value: items.length },
          { label: "Total Stock", value: balances.reduce((acc, b) => acc + b.quantity, 0) },
          { label: "Locations", value: locations.length },
        ]}
        actions={
          <div className="flex items-center gap-3">
             <Button
              variant="outline"
              size="lg"
              className="rounded-2xl border-white/10 bg-slate-900/40 backdrop-blur-md font-black italic text-xs uppercase tracking-widest gap-2 h-14 px-6 text-white hover:bg-slate-800"
              onClick={() => setIsCategoryManagerOpen(true)}
            >
              <FolderTree className="h-4 w-4" /> Categories
            </Button>
            <Button 
              size="lg"
              className="rounded-2xl bg-slate-900 text-white font-black italic text-xs uppercase tracking-widest gap-2"
              onClick={() => setIsNewItemOpen(true)}
            >
              <Plus className="h-4 w-4" /> New Item
            </Button>
          </div>
        }
      />

      <FeedbackAlert
        message={statusMessage}
        error={errorMessage}
        onClear={clearStatus}
      />

      <div className="max-w-[1600px] mx-auto space-y-8">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <Tabs
            value={viewMode}
            onValueChange={(v) => setViewMode(v as ViewMode)}
            className="w-auto"
          >
            <TabsList className="h-14 p-1.5 bg-slate-900/40 backdrop-blur-md border border-white/10 rounded-[1.2rem] shadow-xl">
              {[
                { id: "total", label: "Global", icon: Globe },
                { id: "branch", label: "Branches", icon: LayoutPanelLeft },
                { id: "ecommerce", label: "Ecommerce", icon: LayoutList },
                { id: "transfers", label: "Transfers", icon: ArrowLeftRight },
              ].map((t) => (
                <TabsTrigger
                  key={t.id}
                  value={t.id}
                  className="rounded-xl px-6 font-black italic text-[10px] uppercase tracking-widest data-[state=active]:bg-white data-[state=active]:text-slate-950 text-slate-400 transition-all gap-2"
                >
                  <t.icon className="w-3.5 h-3.5" />
                  {t.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>

          <div className="flex items-center gap-3">
             <ExportButton
              endpoint="/inventory/items/export"
              filename={`zenvix_inventory_${session.tenant_id}.xlsx`}
            />
            <Button
              variant="outline"
              size="lg"
              className="rounded-2xl border-white/10 bg-slate-900/40 backdrop-blur-md font-black italic text-xs uppercase tracking-widest gap-2 h-14 px-6 text-white hover:bg-slate-800"
              onClick={() => setIsImportOpen(true)}
            >
              <Upload className="h-4 w-4" /> Import
            </Button>
            <Button
              variant="outline"
              size="lg"
              className="rounded-2xl border-white/10 bg-slate-900/40 backdrop-blur-md font-black italic text-xs uppercase tracking-widest gap-2 h-14 px-6 text-white hover:bg-slate-800"
              onClick={async () => {
                try {
                  await inventoryService.runLowStockScan(session.tenant_id, session);
                  setStatusMessage("Low stock scan completed. Alerts refreshed.");
                  refresh();
                } catch (err) {
                  setErrorMessage("Stock scan failed.");
                }
              }}
            >
              Sync
            </Button>
          </div>
        </div>

        {viewMode !== "transfers" && (
          <InventoryFilterHub
            search={search}
            onSearchChange={setSearch}
            category={newItemCategory}
            onCategoryChange={(v) => {
              // Note: reusing category state for filtering if needed, or just search
              // In this view, category filter usually happens via search or specialized dropdown
            }}
            categories={dynamicCategories.map(c => ({ id: c.id, name: c.name }))}
            location={selectedLocationId}
            onLocationChange={setSelectedLocationId}
            locations={locations
              .filter(l => {
                if (viewMode === "branch") return l.type !== "ecommerce";
                if (viewMode === "ecommerce") return l.type === "ecommerce";
                return true;
              })
              .map(l => ({ id: l.id, name: l.name }))}
            moduleTag={moduleFilter}
            onModuleTagChange={setModuleFilter}
            onStatusChange={(v) => {}}
          />
        )}
      </div>

      {viewMode === "transfers" ? (
        <div className="max-w-[1600px] mx-auto">
          <TransferDesk />
        </div>
      ) : (
        <Card className="max-w-[1600px] mx-auto rounded-[2.5rem] border-white/5 bg-slate-900/30 backdrop-blur-3xl shadow-2xl overflow-hidden border border-white/10">
          <div className="p-8 border-b border-white/40 flex items-center justify-between bg-slate-900/5">
            <div>
              <h2 className="text-2xl font-black tracking-tighter text-white uppercase italic leading-none">
                Stock Hub
              </h2>
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400 mt-2">
                Real-time visibility across {viewMode} hierarchy
              </p>
            </div>
            {selectedIds.length > 0 && (
              <div className="flex items-center gap-3 animate-in fade-in slide-in-from-right-2">
                <UIBadge className="bg-indigo-500/10 text-indigo-500 border-indigo-500/20 px-3 py-1 font-bold italic text-[10px] uppercase">
                  {selectedIds.length} SELECTED
                </UIBadge>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="rounded-xl border-white/5 bg-slate-950/50 font-black italic text-[10px] uppercase tracking-widest gap-2 text-white hover:bg-slate-900">
                      Actions <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="rounded-2xl border-white/50 backdrop-blur-xl shadow-2xl">
                    <DropdownMenuItem
                      className="gap-2 font-bold italic"
                      onClick={() => setIsBatchIntakeOpen(true)}
                    >
                      <PackagePlus className="h-4 w-4" /> Batch Intake
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      className="gap-2 font-bold italic"
                      onClick={() => setIsBatchTransferOpen(true)}
                    >
                      <ArrowRightLeft className="h-4 w-4" /> Batch Transfer
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      className="gap-2 text-destructive font-bold italic"
                      onClick={handleBatchDelete}
                    >
                      <Trash2 className="h-4 w-4" /> Delete Selected
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            )}
          </div>
          <div className="p-4">
          <DataTableShell total={filteredBalances.length} page={1} pageSize={10}>
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-white/5 text-[10px] uppercase text-slate-500 border-b border-white/5">
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
                  <th className="p-3 text-right w-10">Actions</th>
                </tr>
              </thead>
              <tbody>
                {(Array.isArray(filteredBalances) ? filteredBalances : []).map((balance) => {
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
                      <td className="p-3 text-right" onClick={(e) => e.stopPropagation()}>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              className="gap-2"
                              onClick={() => {
                                setSelectedItemForReclassify(item);
                                setNewCategoryId("");
                                setIsReclassifyOpen(true);
                              }}
                            >
                              <Move className="h-4 w-4" /> Change Category
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="gap-2"
                              onClick={() => {
                                setSelectedItemForImages({ id: item.id, name: item.name });
                                setIsImageManagerOpen(true);
                              }}
                            >
                              <ImageIcon className="h-4 w-4" /> Manage Images
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="gap-2 text-destructive"
                              onClick={() => handleDelete(item.id)}
                            >
                              <Trash2 className="h-4 w-4" /> Delete Item
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </DataTableShell>
          </div>
        </Card>
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
              categoryOptions={
                dynamicCategories.length > 0
                  ? dynamicCategories.map((c) => ({ id: c.name, name: c.name }))
                  : [
                      { id: "all", name: "All Categories" },
                      ...ITEM_CATEGORIES.map((c) => ({ id: c, name: c })),
                    ]
              }
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
      <CategoryManager
        isOpen={isCategoryManagerOpen}
        onClose={() => setIsCategoryManagerOpen(false)}
        onCategoriesChange={refresh}
      />

      <Dialog open={isReclassifyOpen} onOpenChange={setIsReclassifyOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reclassify Item</DialogTitle>
            <DialogDescription>
              Move <strong>{selectedItemForReclassify?.name}</strong> to a different category.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Select New Category</Label>
              <Select value={newCategoryId} onValueChange={setNewCategoryId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a category" />
                </SelectTrigger>
                <SelectContent>
                  {dynamicCategories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>
                      {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsReclassifyOpen(false)}>
              Cancel
            </Button>
            <Button
              disabled={!newCategoryId}
              onClick={async () => {
                try {
                  await inventoryService.updateItemCategory(
                    session.tenant_id,
                    session,
                    selectedItemForReclassify.id,
                    newCategoryId,
                  );
                  setStatusMessage("Item reclassified successfully.");
                  setIsReclassifyOpen(false);
                  refresh();
                } catch (err: any) {
                  setErrorMessage(err.message || "Failed to reclassify item.");
                }
              }}
            >
              Update Category
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
