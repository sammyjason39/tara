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
  MoreVertical,
  Trash2,
  ArrowRightLeft,
  ArrowLeftRight,
  PackagePlus,
  Send,
  ClipboardCheck,
  ScanLine,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Zap,
  Box,
  ShieldCheck,
  Package,
  Plus,
  Upload,
  FolderTree,
  Move,
  Globe,
  LayoutGrid,
  Layers,
  LayoutList,
  LayoutPanelLeft,
  Search,
  Filter,
  Image as ImageIcon,
  FileArchive,
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
import { AdjustmentDialog } from "./components/AdjustmentDialog";
import { ExportButton } from "@/components/shared/ExportButton";
import { ImportDialog } from "@/components/shared/ImportDialog";
import { ItemCreationTab } from "@/components/shared/ItemCreationTab";
import { TransferDesk } from "./TransferDesk";
import { useBarcodeScanner } from "@/hooks/useBarcodeScanner";
import { InventoryGlassHeader } from "@/components/shared/InventoryGlassHeader";
import { InventoryFilterHub } from "@/components/shared/InventoryFilterHub";

import { Card } from "@/components/ui/card";
import { Badge as UIBadge } from "@/components/ui/badge";

type ViewMode = "total" | "branch" | "ecommerce" | "transfers" | "opname";

interface OpnameEntry {
  item_id: string;
  sku: string;
  name: string;
  systemCount: number;
  actualCount: number;
  timestamp: string;
  type: "NORMAL" | "NEW_DISCOVERY" | "ANOMALY";
  reason?: string;
  notes?: string;
  barcode?: string;
}

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
  const [categoryFilter, setCategoryFilter] = useState("all");
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
  const [isImageImportOpen, setIsImageImportOpen] = useState(false);
  const [isCategoryManagerOpen, setIsCategoryManagerOpen] = useState(false);
  const [dynamicCategories, setDynamicCategories] = useState<any[]>([]);
  const [page, setPage] = useState(1);
  const pageSize = 30;
  const [totalCount, setTotalCount] = useState(0);
  const [dashboardStats, setDashboardStats] = useState<any | null>(null);
  const [isReclassifyOpen, setIsReclassifyOpen] = useState(false);
  const [selectedItemForReclassify, setSelectedItemForReclassify] = useState<any>(null);
  const [newCategoryId, setNewCategoryId] = useState("");

  // Opname state
  const [opnameActive, setOpnameActive] = useState(false);
  const [opnameEntries, setOpnameEntries] = useState<OpnameEntry[]>([]);
  const [isSubmittingOpname, setIsSubmittingOpname] = useState(false);
  const opnameDiscrepancyWidth = useMemo(() => {
    if (opnameEntries.length === 0) return 0;
    return (opnameEntries.filter(e => e.actualCount !== e.systemCount).length / opnameEntries.length) * 100;
  }, [opnameEntries]);

  // Discovery / Anomaly Dialog state
  const [isDiscoveryOpen, setIsDiscoveryOpen] = useState(false);
  const [discoveryBarcode, setDiscoveryBarcode] = useState("");
  const [discoveryName, setDiscoveryName] = useState("");
  const [discoverySku, setDiscoverySku] = useState("");
  const [discoveryCategory, setDiscoveryCategory] = useState("ITEM");
  const [discoveryType, setDiscoveryType] = useState<"NEW_DISCOVERY" | "ANOMALY">("NEW_DISCOVERY");
  const [discoveryReason, setDiscoveryReason] = useState("");
  const [discoveryNotes, setDiscoveryNotes] = useState("");
  const [isProcessingDiscovery, setIsProcessingDiscovery] = useState(false);

  useBarcodeScanner((barcode) => {
    if (viewMode === "opname" && opnameActive) {
      handleOpnameScan(barcode);
    } else {
      setSearch(barcode);
      setStatusMessage(`Scanned barcode: ${barcode}`);
    }
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

  const handleOpnameScan = useCallback((barcode: string) => {
    const item = items.find(i => i.barcode === barcode || i.sku === barcode || i.id === barcode);
    if (!item) {
      setDiscoveryBarcode(barcode);
      setDiscoveryName("");
      setDiscoverySku("");
      setDiscoveryType("NEW_DISCOVERY");
      setDiscoveryReason("");
      setDiscoveryNotes("");
      setIsDiscoveryOpen(true);
      return;
    }

    setOpnameEntries(prev => {
      const existing = prev.find(e => e.item_id === item.id);
      if (existing) {
        return prev.map(e => e.item_id === item.id ? { ...e, actualCount: e.actualCount + 1, timestamp: new Date().toLocaleTimeString() } : e);
      }
      
      const balance = balances.find(b => b.item_id === item.id && (selectedLocationId ? b.location_id === selectedLocationId : true));
      
      return [{
        item_id: item.id,
        sku: item.sku,
        name: item.name,
        systemCount: balance?.quantity || 0,
        actualCount: 1,
        timestamp: new Date().toLocaleTimeString(),
        type: "NORMAL"
      }, ...prev];
    });
    setStatusMessage(`Added ${item.name} to audit list.`);
  }, [items, balances, selectedLocationId]);

  const handleManualDiscovery = () => {
    setDiscoveryBarcode("");
    setDiscoveryName("");
    setDiscoverySku("");
    setDiscoveryType("NEW_DISCOVERY");
    setDiscoveryReason("");
    setDiscoveryNotes("");
    setIsDiscoveryOpen(true);
  };

  const generateSystemBarcode = () => {
    setDiscoveryBarcode(`ZVX-${Date.now()}`);
    setStatusMessage("System barcode generated.");
  };

  const startOpname = () => {
    if (!selectedLocationId && viewMode !== "total") {
      setErrorMessage("Please select a location first to compare system stock.");
    }
    setOpnameEntries([]);
    setOpnameActive(true);
    setStatusMessage("Opname session started.");
  };

  const submitOpname = async () => {
    if (opnameEntries.length === 0) return;
    setIsSubmittingOpname(true);
    try {
      await inventoryService.submitBulkAdjustment(
        session.tenant_id,
        session,
        opnameEntries.map(e => ({
          item_id: e.item_id,
          location_id: selectedLocationId || session.location_id,
          actual_count: e.actualCount,
          reason: e.type === "NORMAL" ? "Stock Opname Audit" : `Audit Discovery: ${e.reason}`,
          notes: e.notes || `Audit Type: ${e.type}`
        }))
      );
      setStatusMessage("Opname session submitted for reconciliation.");
      setOpnameActive(false);
      setOpnameEntries([]);
      refresh();
    } catch (err) {
      setErrorMessage("Failed to submit opname results.");
    } finally {
      setIsSubmittingOpname(false);
    }
  };

  const handleDiscovery = async () => {
    if (discoveryType === "NEW_DISCOVERY" && (!discoveryName.trim() || !discoverySku.trim() || !discoveryBarcode.trim())) {
      setErrorMessage("Please fill in all item details for stock addition.");
      return;
    }
    if (!discoveryReason.trim()) {
      setErrorMessage("Reason is mandatory for audit discovery.");
      return;
    }

    setIsProcessingDiscovery(true);
    try {
      if (discoveryType === "NEW_DISCOVERY") {
        // Register new item
        const newItem = await inventoryService.createItem(session.tenant_id, session, {
          sku: discoverySku,
          barcode: discoveryBarcode,
          name: discoveryName.trim(),
          category: discoveryCategory as any,
          uom: "PCS",
          base_price: 0,
          module_tags: ["GENERAL"],
          status: "active",
          description: discoveryNotes
        });

        setOpnameEntries(prev => [{
          item_id: newItem.id,
          sku: newItem.sku,
          name: newItem.name,
          systemCount: 0,
          actualCount: 1,
          timestamp: new Date().toLocaleTimeString(),
          type: "NEW_DISCOVERY",
          reason: discoveryReason,
          notes: discoveryNotes,
          barcode: discoveryBarcode
        }, ...prev]);
        setStatusMessage(`Successfully registered ${newItem.name} and added to audit.`);
        refresh();
      } else {
        // Handle Anomaly
        const anomalyId = `ANOM-${Date.now()}`;
        setOpnameEntries(prev => [{
          item_id: anomalyId,
          sku: discoverySku || "UNKNOWN",
          name: discoveryName || "Unknown Anomaly",
          systemCount: 0,
          actualCount: 1,
          timestamp: new Date().toLocaleTimeString(),
          type: "ANOMALY",
          reason: discoveryReason,
          notes: discoveryNotes,
          barcode: discoveryBarcode
        }, ...prev]);
        setStatusMessage(`Anomaly recorded for investigation.`);
      }

      setIsDiscoveryOpen(false);
    } catch (err) {
      setErrorMessage("Discovery processing failed.");
    } finally {
      setIsProcessingDiscovery(false);
    }
  };

  const refresh = useCallback(async (targetPage = page) => {
    setLoading(true);
    try {
      const locFilter = selectedLocationId || undefined;
      const [i, b, d, locs, cats, channels, stats] = await Promise.all([
        inventoryService.listItems(session.tenant_id, session, locFilter, targetPage, pageSize, search, categoryFilter),
        inventoryService.listBalances(session.tenant_id, session, locFilter, undefined, targetPage, pageSize, search, categoryFilter),
        orgService.getOrgMap(session.tenant_id, session),
        hrService.listLocations(session.tenant_id, session),
        inventoryService.listCategories(session.tenant_id, session),
        retailService.listChannels(session.tenant_id, session),
        inventoryService.getDashboard(session.tenant_id, session, locFilter),
      ]);
      setItems(i);
      setBalances(b);
      setDepartments(d);
      setDashboardStats(stats);
      
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
      
      const total = (b as any).meta?.total || b.length;
      setTotalCount(total);
    } catch (err) {
      console.error("Failed to fetch inventory stock hub data:", err);
      setErrorMessage("Failed to load inventory data.");
    } finally {
      setLoading(false);
    }
  }, [session, selectedLocationId, search, page]);

  useEffect(() => {
    refresh(page);
  }, [page]);

  useEffect(() => {
    setPage(1);
    refresh(1);
  }, [search, selectedLocationId, viewMode, categoryFilter]);


  const itemById = useMemo(
    () => Object.fromEntries((Array.isArray(items) ? items : []).map((item) => [item.id, item])),
    [items],
  );

  const locationById = useMemo(
    () => Object.fromEntries((Array.isArray(locations) ? locations : []).map((loc) => [loc.id, loc])),
    [locations],
  );

  const aggregatedBalances = useMemo(() => {
    if (viewMode !== "total") return balances;
    const map = new Map<string, InventoryStockBalance>();
    balances.forEach((b) => {
      const existing = map.get(b.item_id);
      if (existing) {
        existing.quantity += b.quantity;
      } else {
        map.set(b.item_id, {
          ...b,
          location_id: "GLOBAL",
          department_id: "ALL",
        });
      }
    });
    return Array.from(map.values());
  }, [balances, viewMode]);

  const filteredBalances = useMemo(
    () =>
      (Array.isArray(aggregatedBalances) ? aggregatedBalances : []).filter((balance) => {
        const item = balance.item || itemById[balance.item_id];
        if (!item) return false;

        const locInfo = locationById[balance.location_id || ""];
        const isEcomLoc =
          locInfo?.type === "ecommerce" ||
          locInfo?.type === "ECOMMERCE" ||
          balance.location_id?.toLowerCase()?.includes("e-com");

        const hasEcomTag = (item.module_tags || []).some(
          (tag) => tag.toUpperCase() === "ECOMMERCE" || tag.toUpperCase() === "RETAIL",
        );

        // Mode filtering
        if (viewMode === "ecommerce") {
          if (!isEcomLoc && !hasEcomTag) return false;
        } else if (viewMode === "branch") {
          // In branch mode, we show everything that isn't specifically ecom-only
          if (isEcomLoc && balance.location_id !== "GLOBAL") return false;
        }

        const searchable =
          `${item.sku} ${item.name} ${balance.location_id || ""} ${balance.department_id || ""}`.toLowerCase();
        const searchMatch = search
          ? searchable.includes(search.toLowerCase())
          : true;
        const moduleMatch = moduleFilter
          ? (item.module_tags || []).some(
              (tag) => tag.toLowerCase() === moduleFilter.toLowerCase(),
            )
          : true;
        
        const itemDeptId = (item as Record<string, unknown>).department_id;
        const departmentMatch = departmentFilter === "ALL" 
          ? true 
          : balance.department_id === departmentFilter || itemDeptId === departmentFilter;

        return searchMatch && moduleMatch && departmentMatch;
      }),
    [aggregatedBalances, itemById, moduleFilter, search, viewMode, departmentFilter, locationById],
  );

  const paginatedBalances = useMemo(() => {
    return filteredBalances;
  }, [filteredBalances]);

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? (Array.isArray(prev) ? prev : []).filter((i) => i !== id) : [...prev, id],
    );
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === paginatedBalances.length) setSelectedIds([]);
    else setSelectedIds((Array.isArray(paginatedBalances) ? paginatedBalances : []).map((b) => b.id));
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
          { label: "Total Items", value: dashboardStats?.total_items || items.length },
          { label: "Total Stock", value: dashboardStats?.total_on_hand_qty || 0 },
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
            onValueChange={(v) => {
              setViewMode(v as ViewMode);
              setPage(1);
            }}
            className="w-auto"
          >
            <TabsList className="h-14 p-1.5 bg-slate-900/40 backdrop-blur-md border border-white/10 rounded-[1.2rem] shadow-xl">
              {[
                { id: "total", label: "Global", icon: Globe },
                { id: "branch", label: "Branches", icon: LayoutPanelLeft },
                { id: "ecommerce", label: "Ecommerce", icon: LayoutList },
                { id: "transfers", label: "Transfers", icon: ArrowLeftRight },
                { id: "opname", label: "Stock Taking", icon: ClipboardCheck },
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
              <Upload className="h-4 w-4" /> Import Data
            </Button>
            <Button
              variant="outline"
              size="lg"
              className="rounded-2xl border-white/10 bg-slate-900/40 backdrop-blur-md font-black italic text-xs uppercase tracking-widest gap-2 h-14 px-6 text-white hover:bg-slate-800"
              onClick={() => setIsImageImportOpen(true)}
            >
              <FileArchive className="h-4 w-4" /> Bulk Images
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
            category={categoryFilter}
            onCategoryChange={(v) => {
              setCategoryFilter(v);
              setPage(1);
            }}
            categories={dynamicCategories.map(c => ({ id: c.id, name: c.name }))}
            location={selectedLocationId}
            locationLabel={viewMode === "ecommerce" ? "Ecommerce" : "Location"}
            onLocationChange={(v) => {
              setSelectedLocationId(v);
              setPage(1);
            }}
            locations={locations
              .filter(l => {
                if (viewMode === "branch") return l.type !== "ecommerce";
                if (viewMode === "ecommerce") return l.type === "ecommerce";
                return true;
              })
              .map(l => ({ id: l.id, name: l.name }))}
            moduleTag={moduleFilter}
            onModuleTagChange={(v) => {
              setModuleFilter(v);
              setPage(1);
            }}
            onStatusChange={(v) => {}}
          />
        )}
      </div>

      {viewMode === "transfers" && (
        <div className="max-w-[1600px] mx-auto">
          <TransferDesk />
        </div>
      )}

      {viewMode === "opname" && (
        <div className="max-w-[1600px] mx-auto space-y-8">
          {!opnameActive ? (
            <Card className="rounded-[3rem] border-white/5 bg-slate-900/40 backdrop-blur-3xl shadow-2xl overflow-hidden border border-white/10 p-16 text-center space-y-8">
              <div className="w-24 h-24 rounded-[2rem] bg-indigo-500/20 flex items-center justify-center mx-auto shadow-2xl shadow-indigo-500/20">
                <ClipboardCheck className="w-12 h-12 text-indigo-400" />
              </div>
              <div className="max-w-2xl mx-auto space-y-4">
                <h2 className="text-4xl font-black italic tracking-tighter uppercase text-white leading-none">
                  Inventory Audit Terminal
                </h2>
                <p className="text-slate-400 font-bold italic text-sm">
                  Initialize a global stock opname session. Compare physical counts with real-time ledger balances across your selected organizational nodes.
                </p>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto py-8">
                { [
                  { icon: ScanLine, label: "Precision Scan", desc: "Scan barcodes to sync" },
                  { icon: Zap, label: "Real-time Sync", desc: "Live ledger comparison" },
                  { icon: ShieldCheck, label: "Audit Trace", desc: "Approval-gated commit" },
                ].map((f, i) => (
                  <div key={i} className="bg-white/5 rounded-[2rem] p-8 border border-white/5 space-y-3">
                    <f.icon className="w-6 h-6 text-indigo-400 mx-auto" />
                    <div className="text-xs font-black italic uppercase text-white">{f.label}</div>
                    <div className="text-[10px] text-slate-500 font-bold uppercase tracking-tight leading-relaxed">{f.desc}</div>
                  </div>
                )) }
              </div>
              <div className="max-w-md mx-auto space-y-4 py-8">
                <div className="space-y-2 text-left">
                  <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 ml-2">Audit Target Location</label>
                  <Select value={selectedLocationId} onValueChange={setSelectedLocationId}>
                    <SelectTrigger className="h-14 rounded-2xl bg-slate-950/50 border-white/10 shadow-2xl font-black italic text-sm text-white">
                      <SelectValue placeholder="CHOOSE AUDIT ZONE..." />
                    </SelectTrigger>
                    <SelectContent className="rounded-2xl bg-slate-900 border-white/10 text-white">
                      {locations.map(loc => (
                        <SelectItem key={loc.id} value={loc.id} className="font-bold italic">{loc.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest text-center mt-2 italic">
                    {selectedLocationId ? "ZONE_LOCKED: ACTIVE_SYNC" : "PLEASE SELECT A ZONE TO INITIALIZE LEDGER"}
                  </p>
                </div>
              </div>

              <Button
                size="lg"
                onClick={startOpname}
                disabled={!selectedLocationId}
                className="h-20 px-12 rounded-[1.5rem] bg-white text-slate-950 font-black italic uppercase tracking-widest text-sm gap-3 shadow-2xl hover:scale-105 transition-transform disabled:opacity-30 disabled:hover:scale-100"
              >
                <Zap className="w-6 h-6 fill-current" /> Start Audit Session
              </Button>

            </Card>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {(() => {
                const discrepancyWidth = opnameEntries.length > 0 
                  ? (opnameEntries.filter(ent => ent.actualCount !== ent.systemCount).length / opnameEntries.length) * 100 
                  : 0;
                return (
                  <>
                    <div className="lg:col-span-2 space-y-8">
                <Card className="rounded-[2.5rem] border-white/5 bg-slate-900/30 backdrop-blur-3xl shadow-2xl overflow-hidden border border-white/10">
                  <div className="p-8 border-b border-white/10 flex items-center justify-between bg-white/5">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-2xl bg-indigo-500/20 flex items-center justify-center">
                        <ScanLine className="w-6 h-6 text-indigo-400 animate-pulse" />
                      </div>
                      <div>
                        <h3 className="text-lg font-black italic text-white uppercase tracking-tighter">Live Session Stream</h3>
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Awaiting hardware input or manual entry</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Button 
                        variant="outline" 
                        onClick={handleManualDiscovery}
                        className="h-10 px-4 rounded-xl border-white/10 bg-white/5 text-white font-black italic uppercase tracking-widest text-[9px] gap-2 hover:bg-white/10"
                      >
                        <Plus className="w-4 h-4 text-indigo-400" /> Discovery
                      </Button>
                    </div>
                  </div>
                  
                  <div className="p-8">
                    {opnameEntries.length === 0 ? (
                      <div className="py-24 text-center opacity-20">
                        <Box className="w-24 h-24 text-slate-500 mx-auto mb-6" />
                        <p className="text-xs font-black italic uppercase tracking-[0.3em]">Scanner Ready</p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {opnameEntries.map((e, i) => {
                          const variance = e.actualCount - e.systemCount;
                          return (
                            <div key={i} className="group p-6 rounded-[2rem] bg-white/5 border border-white/5 hover:bg-white/10 hover:border-white/10 transition-all flex items-center justify-between shadow-lg">
                              <div className="flex items-center gap-6">
                                <div className="w-14 h-14 rounded-2xl bg-slate-950/50 flex items-center justify-center text-slate-500 group-hover:text-indigo-400 transition-colors">
                                  <Box className="w-7 h-7" />
                                </div>
                                <div>
                                  <div className="flex items-center gap-2">
                                    <div className="text-base font-black text-white italic tracking-tight">{e.name}</div>
                                    {e.type === "NEW_DISCOVERY" && <UIBadge className="bg-emerald-500 text-white border-none text-[8px] h-4 font-black italic">NEW DISCOVERY</UIBadge>}
                                    {e.type === "ANOMALY" && <UIBadge className="bg-red-500 text-white border-none text-[8px] h-4 font-black italic">ANOMALY</UIBadge>}
                                  </div>
                                  <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-0.5">
                                    {e.sku} • {e.timestamp} {e.barcode ? `• BC: ${e.barcode}` : ""}
                                  </div>
                                  {e.reason && (
                                    <div className="text-[9px] font-bold text-indigo-400/80 uppercase tracking-tight mt-1 italic">
                                      Reason: {e.reason}
                                    </div>
                                  )}
                                </div>
                              </div>
                              
                              <div className="flex items-center gap-12">
                                <div className="text-center">
                                  <div className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">System</div>
                                  <div className="text-xl font-black text-slate-400 italic">{e.systemCount}</div>
                                </div>
                                <div className="text-center">
                                  <div className="text-[9px] font-black text-indigo-400 uppercase tracking-widest mb-1 italic">Actual</div>
                                  <div className="flex items-center gap-4">
                                    <button 
                                      onClick={() => setOpnameEntries(prev => prev.map((entry, idx) => idx === i ? { ...entry, actualCount: Math.max(0, entry.actualCount - 1) } : entry))}
                                      className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-white"
                                    >-</button>
                                    <div className="text-2xl font-black text-white italic min-w-[2rem]">x{e.actualCount}</div>
                                    <button 
                                      onClick={() => setOpnameEntries(prev => prev.map((entry, idx) => idx === i ? { ...entry, actualCount: entry.actualCount + 1 } : entry))}
                                      className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-white"
                                    >+</button>
                                  </div>
                                </div>
                                <div className="text-right min-w-[80px]">
                                  <div className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Variance</div>
                                  <div className={`text-xl font-black italic ${variance === 0 ? "text-emerald-500" : variance > 0 ? "text-blue-500" : "text-red-500"}`}>
                                    {variance > 0 ? `+${variance}` : variance}
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </Card>
              </div>

              <div className="space-y-8">
                <Card className="rounded-[2.5rem] border-none bg-slate-900 shadow-3xl overflow-hidden relative">
                   <div className="absolute -right-8 -bottom-8 opacity-10 pointer-events-none rotate-12">
                      <RefreshCw className="w-48 h-48 text-indigo-500" />
                   </div>
                   <div className="p-10 space-y-8 relative">
                      <div>
                        <h3 className="text-[10px] font-black uppercase tracking-[0.4em] text-indigo-400 italic">Session Reconciliation</h3>
                        <div className="mt-8 grid grid-cols-2 gap-4">
                          <div className="p-6 bg-black/40 rounded-[1.5rem] border border-white/5 shadow-inner">
                            <div className="text-[8px] font-black text-slate-600 uppercase tracking-widest mb-1">Standard Items</div>
                            <div className="text-3xl font-black text-white italic">{opnameEntries.filter(e => e.type === "NORMAL").length}</div>
                          </div>
                          <div className="p-6 bg-black/40 rounded-[1.5rem] border border-white/5 shadow-inner">
                            <div className="text-[8px] font-black text-emerald-500 uppercase tracking-widest mb-1 italic">Discoveries</div>
                            <div className="text-3xl font-black text-emerald-500 italic">
                              {opnameEntries.filter(e => e.type === "NEW_DISCOVERY").length}
                            </div>
                          </div>
                        </div>
                        <div className="mt-4 p-6 bg-red-500/10 rounded-[1.5rem] border border-red-500/20 shadow-inner flex items-center justify-between">
                          <div>
                            <div className="text-[8px] font-black text-red-500 uppercase tracking-widest mb-1 italic">Detected Anomalies</div>
                            <div className="text-3xl font-black text-red-500 italic">
                              {opnameEntries.filter(e => e.type === "ANOMALY").length}
                            </div>
                          </div>
                          <div className="w-10 h-10 rounded-xl bg-red-500/20 flex items-center justify-center">
                            <AlertCircle className="w-5 h-5 text-red-500" />
                          </div>
                        </div>
                      </div>

                      <div className="space-y-4">
                        <div className="flex justify-between text-[10px] font-black uppercase italic">
                          <span className="text-slate-500">Discrepancy Vector</span>
                          <span className="text-red-500">
                            {opnameEntries.filter(e => e.actualCount !== e.systemCount).length} Anomalies
                          </span>
                        </div>
                        <div className="h-2 bg-black/40 rounded-full overflow-hidden border border-white/5">
                          <div 
                            className="h-full bg-red-500 transition-all duration-1000" 
                            style={{ width: `${opnameDiscrepancyWidth}%` }}
                          ></div>
                        </div>
                      </div>

                      <div className="pt-4 flex flex-col gap-3">
                        <Button
                          onClick={submitOpname}
                          disabled={opnameEntries.length === 0 || isSubmittingOpname}
                          className="h-16 rounded-2xl bg-white text-slate-950 font-black italic uppercase tracking-widest text-xs gap-2 shadow-2xl hover:scale-[1.02] transition-transform"
                        >
                          {isSubmittingOpname ? <RefreshCw className="w-5 h-5 animate-spin" /> : <CheckCircle2 className="w-5 h-5" />} 
                          Commit Audit to Ledger
                        </Button>
                        <Button
                          variant="ghost"
                          onClick={() => {
                            if (confirm("Discard session? All uncommitted data will be lost.")) {
                              setOpnameActive(false);
                              setOpnameEntries([]);
                            }
                          }}
                          className="h-12 rounded-2xl text-slate-500 hover:text-red-500 font-black italic uppercase tracking-widest text-[9px]"
                        >
                          Abort Session
                        </Button>
                      </div>
                   </div>
                </Card>

                <div className="p-8 rounded-[2rem] bg-indigo-500/5 border border-indigo-500/20 flex gap-5 items-center italic">
                  <AlertCircle className="w-8 h-8 text-indigo-400 shrink-0" />
                  <p className="text-[11px] text-indigo-200/60 font-bold leading-relaxed">
                    Audits are recorded with your digital signature. Large variances will trigger a mandatory management review.
                  </p>
                </div>
              </div>
          </>
        );
      })()}
            </div>
          )}
      </div>
    )}

      {viewMode !== "transfers" && viewMode !== "opname" && (
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
          <DataTableShell 
            total={totalCount} 
            page={page} 
            pageSize={pageSize}
            onPageChange={setPage}
          >
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-white/5 text-[10px] uppercase text-slate-500 border-b border-white/5">
                  <th className="p-3 text-left w-10">
                    <Checkbox
                      checked={
                        selectedIds.length === paginatedBalances.length &&
                        paginatedBalances.length > 0
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
                {(Array.isArray(paginatedBalances) ? paginatedBalances : []).map((balance) => {
                  const item = balance.item || itemById[balance.item_id];
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
                        {balance.location_id}
                      </td>
                      <td className="p-3 text-muted-foreground">
                        {balance.department_id || "GENERAL"}
                      </td>
                      <td className="p-3 text-right font-mono font-bold">
                        {balance.quantity?.toLocaleString()}
                      </td>
                      <td className="p-3 text-muted-foreground">
                        {balance.reorder_point}
                      </td>
                      <td className="p-3 text-xs text-muted-foreground">
                        {(item.module_tags || []).join(", ")}
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
              <span>{selectedBalance?.balance.location_id}</span>
              <span className="text-muted-foreground">Department:</span>
              <span>
                {selectedBalance?.balance.department_id || "GENERAL"}
              </span>
              <span className="text-muted-foreground">Physical Qty:</span>
              <span className="font-bold text-lg">
                {selectedBalance?.balance.quantity?.toLocaleString()}
              </span>
              <span className="text-muted-foreground">Reorder Point:</span>
              <span>{selectedBalance?.balance.reorder_point}</span>
            </div>
            <div className="border-t pt-2">
              <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Module Context
              </p>
              <div className="flex flex-wrap gap-1">
                {(selectedBalance?.item.module_tags || []).map((tag) => (
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
        endpoint="inventory/items/import"
        title="Import Inventory Items"
        type="DATA"
        onSuccess={() => {
          refresh();
        }}
      />

      <ImportDialog
        open={isImageImportOpen}
        onOpenChange={setIsImageImportOpen}
        endpoint="inventory/items/import/images"
        title="Bulk Image Migration"
        type="IMAGES"
        onSuccess={() => {
          refresh();
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
      <Dialog open={isDiscoveryOpen} onOpenChange={setIsDiscoveryOpen}>
        <DialogContent className="rounded-[2.5rem] border-white/10 bg-slate-900 text-white shadow-2xl max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black italic tracking-tighter uppercase text-indigo-400">
              Audit Discovery Terminal
            </DialogTitle>
            <DialogDescription className="text-slate-400 font-bold italic">
              Classify and record items found during physical audit that are not synchronized with the digital ledger.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-6">
            <div className="grid grid-cols-2 gap-4">
              <Button 
                variant={discoveryType === "NEW_DISCOVERY" ? "default" : "outline"}
                onClick={() => setDiscoveryType("NEW_DISCOVERY")}
                className={`h-20 rounded-2xl flex flex-col items-center justify-center gap-1 border-white/10 ${discoveryType === "NEW_DISCOVERY" ? "bg-white text-slate-950" : "bg-white/5 text-white"}`}
              >
                <PackagePlus className="w-6 h-6" />
                <span className="text-[10px] font-black uppercase italic">Add to Stock</span>
              </Button>
              <Button 
                variant={discoveryType === "ANOMALY" ? "default" : "outline"}
                onClick={() => setDiscoveryType("ANOMALY")}
                className={`h-20 rounded-2xl flex flex-col items-center justify-center gap-1 border-white/10 ${discoveryType === "ANOMALY" ? "bg-red-500 text-white" : "bg-white/5 text-white"}`}
              >
                <AlertCircle className="w-6 h-6" />
                <span className="text-[10px] font-black uppercase italic">Mark as Anomaly</span>
              </Button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Barcode</Label>
                  <div className="flex gap-2">
                    <Input 
                      value={discoveryBarcode} 
                      onChange={e => setDiscoveryBarcode(e.target.value)}
                      placeholder="SCAN OR ENTER..."
                      className="h-12 rounded-xl bg-white/5 border-white/10 text-white font-bold italic uppercase"
                    />
                    {!discoveryBarcode && (
                      <Button onClick={generateSystemBarcode} variant="outline" className="h-12 w-12 shrink-0 rounded-xl border-white/10 bg-white/5">
                        <RefreshCw className="w-4 h-4 text-indigo-400" />
                      </Button>
                    )}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">SKU</Label>
                  <Input 
                    value={discoverySku} 
                    onChange={e => setDiscoverySku(e.target.value)}
                    placeholder="ENTER SKU..."
                    className="h-12 rounded-xl bg-white/5 border-white/10 text-white font-bold italic uppercase"
                  />
                </div>
              </div>

              {discoveryType === "NEW_DISCOVERY" && (
                <>
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Item Name</Label>
                    <Input 
                      value={discoveryName} 
                      onChange={e => setDiscoveryName(e.target.value)}
                      placeholder="PRODUCT DESCRIPTION..."
                      className="h-12 rounded-xl bg-white/5 border-white/10 text-white font-bold italic uppercase"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Category</Label>
                    <Select value={discoveryCategory} onValueChange={setDiscoveryCategory}>
                      <SelectTrigger className="h-12 rounded-xl bg-white/5 border-white/10 text-white font-bold italic">
                        <SelectValue placeholder="SELECT CATEGORY..." />
                      </SelectTrigger>
                      <SelectContent className="bg-slate-900 border-white/10 text-white">
                        {ITEM_CATEGORIES.map(c => (
                          <SelectItem key={c} value={c} className="font-bold italic">{c}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </>
              )}

              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Reason for {discoveryType === "ANOMALY" ? "Anomaly" : "Stock Addition"}</Label>
                <Input 
                  value={discoveryReason} 
                  onChange={e => setDiscoveryReason(e.target.value)}
                  placeholder="E.G. FOUND UNREGISTERED IN BIN 04..."
                  className="h-12 rounded-xl bg-white/5 border-white/10 text-white font-bold italic uppercase"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Notes / Details</Label>
                <Input 
                  value={discoveryNotes} 
                  onChange={e => setDiscoveryNotes(e.target.value)}
                  placeholder="ADDITIONAL CONTEXT..."
                  className="h-12 rounded-xl bg-white/5 border-white/10 text-white font-bold italic uppercase"
                />
              </div>
            </div>
          </div>

          <DialogFooter className="gap-3">
            <Button variant="ghost" onClick={() => setIsDiscoveryOpen(false)} className="rounded-xl font-black italic uppercase text-[10px] tracking-widest text-slate-500">Cancel</Button>
            <Button 
              onClick={handleDiscovery} 
              disabled={isProcessingDiscovery || !discoveryReason.trim()}
              className={`h-14 px-8 rounded-xl font-black italic uppercase tracking-widest text-xs gap-2 ${discoveryType === "ANOMALY" ? "bg-red-500 text-white hover:bg-red-600" : "bg-white text-slate-950 hover:bg-slate-200"}`}
            >
              {isProcessingDiscovery ? <RefreshCw className="w-4 h-4 animate-spin" /> : (discoveryType === "ANOMALY" ? <AlertCircle className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />)} 
              {discoveryType === "ANOMALY" ? "Log Anomaly" : "Add to Audit"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
