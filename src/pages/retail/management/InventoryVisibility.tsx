import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  Layers,
  ClipboardCheck,
  ArrowLeftRight,
  PlusSquare,
  FileText,
  ShieldCheck,
  RefreshCw,
  Zap,
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";

import { InventoryPageHeader } from "./components/inventory/InventoryPageHeader";
import { InventoryKpiBar } from "./components/inventory/InventoryKpiBar";
import { FiltersBar } from "./components/inventory/FiltersBar";
import { InventoryTable } from "./components/inventory/InventoryTable";
import { StockOpnameTab } from "./components/inventory/StockOpnameTab";
import { OpnameEntry } from "./components/inventory/opname/OpnameTable";
import { MovementsTab, AuditEntry } from "./components/inventory/MovementsTab";
import { ItemCreationTab } from "@/components/shared/ItemCreationTab";
import { StockReportTab } from "./components/inventory/StockReportTab";
import {
  InventoryMovementDialog,
  MovementPayload,
} from "./components/inventory/modals/InventoryMovementDialog";
import {
  PostekPrintModal,
  PrintItem,
} from "@/components/shared/PostekPrintModal";
import { MOVEMENT_META } from "./inventory/inventory.types";
import { CategoryManager } from "@/components/shared/CategoryManager";
import { ItemDetailsModal } from "@/pages/core/inventory/components/ItemDetailsModal";

import { useBarcodeScanner } from "@/hooks/useBarcodeScanner";
import { InventoryGlassHeader } from "@/components/shared/InventoryGlassHeader";
import { InventoryFilterHub } from "@/components/shared/InventoryFilterHub";
import { Package, LayoutGrid, Layers, Globe, ArrowLeftRight, Search, Plus, Filter, LayoutList, LayoutPanelLeft, RefreshCw, Lock } from "lucide-react";
import { useDebounce } from "@/hooks/useDebounce";
import { inventoryService } from "@/core/services/inventory/inventoryService";
import { retailService } from "@/core/services/retail/retailService";
import { crisisManagementService } from "@/core/services/retail/crisisManagementService";
import type { RetailProduct, RetailStore } from "@/core/types/retail/retail";
import type {
  InventoryItemView,
  InventoryFilters,
} from "./components/inventory/types";
import { MovementType } from "./components/inventory/movementMeta";

const PAGE_SIZE = 20;

interface InventoryStats {
  totalSKUs: number;
  totalSOH: number;
  totalATS: number;
  critical: number;
  low: number;
  totalValue?: number;
  currency?: string;
}

// Temporary mock suppliers – replace with retailService.listSuppliers() when the endpoint is available
const MOCK_SUPPLIERS = [
  { id: "sup-1", name: "Bean Brothers" },
  { id: "sup-2", name: "Merch Supply Co" },
  { id: "sup-3", name: "Gift Direct" },
  { id: "sup-4", name: "Direct Import" },
];

const MOCK_AUDIT_LOG: AuditEntry[] = [
  {
    id: "1",
    ts: "2024-03-20 14:30",
    actor: "Admin",
    action: "manual_adjustment",
    sku: "ELEC-MB-P15",
    qty: -5,
    reason: "Damaged stock",
    status: "approved",
  },
  {
    id: "2",
    ts: "2024-03-20 11:20",
    actor: "System",
    action: "stock_receive",
    sku: "FOOD-SNK-LAYS",
    qty: 50,
    reason: "PO-2024-01-01",
    status: "approved",
  },
];

const InventoryVisibility = () => {
  const { session, updateBranch } = useAuth();
  const { toast } = useToast();

  const [inventory, setInventory] = useState<InventoryItemView[]>([]);
  const [totalItems, setTotalItems] = useState(0);
  const [stats, setStats] = useState<InventoryStats | null>(null);
  const [stores, setStores] = useState<RetailStore[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedStoreId, setSelectedStoreId] = useState("");
  const [isAggregating, setIsAggregating] = useState(false);
  const [lastSync, setLastSync] = useState<string | null>(null);
  
  const handleStoreChange = (id: string) => {
    setSelectedStoreId(id);
    setPage(1);
    const store = stores.find((s) => s.id === id);
    if (store) {
      updateBranch(store.locationId || store.id);
    }
  };

  const selectedStore = useMemo(
    () => stores.find((s) => s.locationId === session?.location_id || s.id === session?.location_id),
    [stores, session?.location_id],
  );

  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState<InventoryFilters>({
    search: "",
    category: "all",
    status: "all",
    type: "all",
    sortBy: "name-asc",
  });

  // Debounce search to prevent infinite loops / excessive API calls
  const debouncedSearch = useDebounce(filters.search, 400);

  const [dynamicCategories, setDynamicCategories] = useState<
    { id: string; name: string }[]
  >([]);
  const [detailItem, setDetailItem] = useState<InventoryItemView | null>(null);
  const [movementType, setMovementType] = useState<MovementType | null>(null);
  const [isCategoryManagerOpen, setIsCategoryManagerOpen] = useState(false);
  const [isReclassifyOpen, setIsReclassifyOpen] = useState(false);
  const [selectedItemForReclassify, setSelectedItemForReclassify] = useState<InventoryItemView | null>(null);
  const [newCategoryId, setNewCategoryId] = useState("");

  // Unified Postek Print Modal
  const [printItems, setPrintItems] = useState<PrintItem[]>([]);

  const [opnameActive, setOpnameActive] = useState(false);
  const [opnameEntries, setOpnameEntries] = useState<OpnameEntry[]>([]);
  const [opnameFilters, setOpnameFilters] = useState<InventoryFilters>({
    search: "",
    category: "all",
    status: "all",
    type: "all",
    sortBy: "name-asc",
  });
  const [barcodeInput, setBarcodeInput] = useState("");
  const [pendingItems, setPendingItems] = useState<InventoryItemView[]>([]);
  const [isApproving, setIsApproving] = useState(false);

  const canWrite = ["OWNER", "COMPANY_ADMIN", "DEPT_HEAD"].includes(
    session?.role || "",
  );

  const tenantId = session?.tenant_id;
  const userId = session?.user_id;
  const locationId = session?.location_id;

  const isFetchingRef = React.useRef(false);
  const fetchInventory = useCallback(async () => {
    if (!tenantId || !session || isFetchingRef.current) return;
    
    isFetchingRef.current = true;
    setIsLoading(true);
    try {
      const data = await retailService.listInventory(tenantId, session, {
        categoryId: filters.category !== "all" ? filters.category : undefined,
        type: filters.type !== "all" ? filters.type : undefined,
        q: debouncedSearch || undefined,
        page: page,
        pageSize: PAGE_SIZE,
        locationId: locationId,
      });

      if (!data) {
        setInventory([]);
        return;
      }

      const items = Array.isArray(data) ? data : (data as any).items || [];
      const totalCount = data.meta?.total ?? items.length;

      const mapped: InventoryItemView[] = items.map((p: any) => ({
        id: p.id,
        sku: p.sku,
        name: p.name,
        category: p.categoryName || "Uncategorized",
        categoryId: p.categoryId || "",
        onHand: p.metadata?.stock_on_hand ?? p.stock ?? 0,
        reserved: p.metadata?.reserved ?? 0,
        available: p.metadata?.available ?? p.stock ?? 0,
        minBuffer: p.metadata?.minBuffer ?? 0,
        status: (p.status as InventoryItemView["status"]) || "ok",
        barcode: p.barcode,
        price: p.price,
        unit: p.unit,
        type: p.type,
        description: p.description,
        imageUrl: p.image_url || p.imageUrl,
      }));
      setInventory(mapped);
      setTotalItems(totalCount);

      const sData = await retailService.getInventoryStats(tenantId, session, {
        locationId: locationId
      });
      if (sData) {
        setStats({
          totalSKUs: sData.totalItems ?? 0,
          totalSOH: sData.totalSOH ?? 0,
          totalATS: sData.totalATS ?? 0,
          critical: sData.critical ?? 0,
          low: sData.lowStock ?? 0,
          totalValue: sData.totalValue,
          currency: sData.currency,
        });
      }

      setLastSync(new Date().toLocaleTimeString());
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
      isFetchingRef.current = false;
    }
  }, [
    tenantId,
    session,
    debouncedSearch,
    filters.category,
    filters.type,
    locationId,
    page,
  ]);

  const fetchPendingItems = useCallback(async () => {
    if (!tenantId || !session) return;
    try {
      const items = await retailService.listPendingItems(tenantId, session);
      const mapped: InventoryItemView[] = (Array.isArray(items) ? items : []).map((p) => ({
        id: p.id,
        sku: p.sku,
        name: p.name,
        category: p.categoryName || "Uncategorized",
        categoryId: p.categoryId || "",
        onHand: 0,
        reserved: 0,
        available: 0,
        minBuffer: 10,
        status: "pending" as InventoryItemView["status"],
        barcode: p.barcode,
        price: p.price,
        unit: p.unit,
        type: p.type,
        description: p.description,
      }));
      setPendingItems(mapped);
    } catch (err) {
      console.error("Failed to fetch pending items", err);
    }
  }, [tenantId, session]);

  const fetchCategories = useCallback(async () => {
    if (!tenantId || !session) return;
    try {
      const data = await retailService.listCategories(tenantId, session);
      setDynamicCategories(data);
    } catch (error) {
      console.error("Failed to fetch categories", error);
    }
  }, [tenantId, session]);

  const fetchStores = useCallback(async () => {
    if (!tenantId || !session) return;
    try {
      const [storesData, channelsData] = await Promise.all([
        retailService.listStores(tenantId, session),
        retailService.listChannels(tenantId, session)
      ]);
      
      const ecommerceStores = (Array.isArray(channelsData) ? channelsData : [])
        .filter(c => c.type === "ecommerce" || c.type === "DIRECT" || c.type === "OWNED")
        .map(c => ({
          id: c.id,
          name: `${c.name} (Ecommerce)`,
          locationId: c.branchId || c.id,
          type: "warehouse" as any,
          status: "active" as any,
          code: c.id,
          tenantId: tenantId,
          infrastructureRegistry: {},
          supplyConfig: {},
          operationalConfig: {},
          channelBinding: {},
          governance: { license_status: "active", activation_source: "Cloud", compliance_level: 1, audit_frequency_tier: "standard" }
        }));

      const combined = [...storesData, ...ecommerceStores];
      setStores(combined);
      
      if (combined.length > 0 && !locationId) {
        const firstStore = combined[0];
        updateBranch(firstStore.locationId || firstStore.id);
        setSelectedStoreId(firstStore.id);
      }
    } catch (error) {
      console.error(error);
    }
  }, [tenantId, session, locationId, updateBranch]);

  // Sync selectedStoreId with locationId from session
  useEffect(() => {
    if (locationId && stores.length > 0) {
      const store = stores.find((s) => (s.locationId || s.id) === locationId);
      if (store) {
        setSelectedStoreId(store.id);
      }
    }
  }, [locationId, stores]);

  useEffect(() => {
    if (tenantId) {
      fetchStores();
      fetchCategories();
    }
  }, [tenantId, fetchStores, fetchCategories]);

  useEffect(() => {
    if (tenantId) {
      fetchInventory();
      fetchPendingItems();
    }
  }, [fetchInventory, fetchPendingItems, tenantId]);

  // Reset page when filters or store changes
  useEffect(() => {
    setPage(1);
  }, [
    debouncedSearch,
    filters.category,
    filters.status,
    filters.type,
    locationId,
  ]);

  const handleFilterChange = (patch: Partial<InventoryFilters>) => {
    setFilters((prev) => ({ ...prev, ...patch }));
    setPage(1);
  };

  const handleSync = useCallback(async () => {
    if (!session || !locationId) return;
    setIsLoading(true);
    try {
      await retailService.syncInventory(tenantId!, session, {
        locationId,
      });
      fetchInventory();
      toast({
        title: "Inventory Synced",
        description: "Stock levels updated from ERP.",
      });
    } catch (err) {
      console.error(err);
      toast({
        title: "Sync Failed",
        description: "Could not fetch latest ERP data.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [session, locationId, tenantId, toast, fetchInventory]);

  const statusBadge = (status: string) => {
    switch (status.toLowerCase()) {
      case "in stock":
      case "ok":
      case "active":
        return "bg-emerald-50 text-success";
      case "low stock":
      case "low":
        return "bg-amber-50 text-amber-600";
      case "out of stock":
      case "critical":
      case "discontinued":
        return "bg-red-50 text-red-600";
      case "pending":
        return "bg-primary/5 text-primary animate-pulse";
      default:
        return "bg-secondary/10 text-muted-foreground";
    }
  };

  const categoryOptions = useMemo(() => {
    return [{ id: "all", name: "All Categories" }, ...dynamicCategories];
  }, [dynamicCategories]);

  const filtered = useMemo(() => {
    return (Array.isArray(inventory) ? inventory : []).filter((item) => {
      const matchesSearch =
        !filters.search ||
        item.name.toLowerCase().includes(filters.search.toLowerCase()) ||
        item.sku.toLowerCase().includes(filters.search.toLowerCase());
      const matchesCategory =
        filters.category === "all" || item.categoryId === filters.category;
      const matchesStatus =
        filters.status === "all" ||
        item.status.toLowerCase() === filters.status.toLowerCase();
      return matchesSearch && matchesCategory && matchesStatus;
    });
  }, [inventory, filters]);

  const total = totalItems;
  const totalPages = Math.ceil(total / PAGE_SIZE);

  const handleCategoryClick = (catId: string) => {
    setFilters((prev) => ({ ...prev, category: catId }));
  };

  const handleMovementSubmit = useCallback(
    (
      data: MovementPayload & { sourceType?: string; sourceStoreId?: string },
    ) => {
      const typeLabel = movementType
        ? MOVEMENT_META[movementType].label
        : "Movement";

      console.log("MOVEMENT_REQUEST_SUBMIT", {
        type: movementType,
        locationId,
        actor: session?.userId,
        payload: data,
      });

      toast({
        title: `${typeLabel} Submitted`,
        description: `Request for ${data.lines.length} items logged and pending HOD approval.`,
      });

      setMovementType(null);
    },
    [movementType, locationId, session?.userId, toast],
  );


  // ── Opname handlers ───────────────────────────────────────
  const startOpname = useCallback(() => {
    setOpnameEntries([]);
    setOpnameActive(true);
    toast({
      title: "Opname Session Started",
      description: "Scan items to begin physical count audit.",
    });
  }, [toast]);

  const handleBarcodeKeyDown = useCallback(
    async (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key !== "Enter") return;
      const sku = barcodeInput.trim();
      if (!sku) return;

      setBarcodeInput("");

      let product = inventory.find((i) => i.sku === sku || i.barcode === sku);

      if (!product && tenantId && session) {
        setIsUpdating(true);
        try {
          const masterResults = await retailService.listInventory(tenantId, session, {
            q: sku,
            pageSize: 1,
          });
          const items = Array.isArray(masterResults) ? masterResults : (masterResults as any).items || [];
          const masterItem = items[0];
          
          if (masterItem) {
            product = {
              id: masterItem.id,
              sku: masterItem.sku,
              name: masterItem.name,
              category: masterItem.categoryName || "Uncategorized",
              categoryId: masterItem.categoryId || "",
              onHand: 0,
              reserved: 0,
              available: 0,
              minBuffer: 0,
              status: masterItem.status || "ok",
              barcode: masterItem.barcode,
              price: masterItem.price,
              unit: masterItem.unit,
              type: masterItem.type,
              description: masterItem.description,
            };
          }
        } catch (err) {
          console.error("[Opname] Master lookup failed:", err);
        } finally {
          setIsUpdating(false);
        }
      }

      if (!product) {
        toast({
          title: "Item Not Found",
          description: `SKU/Barcode ${sku} was not found in the master catalog.`,
          variant: "destructive",
        });
        return;
      }

      setOpnameEntries((prev) => {
        const idx = prev.findIndex((entry) => entry.sku === product!.sku);

        if (idx !== -1) {
          const updated = [...prev];
          updated[idx] = {
            ...updated[idx],
            counted: Number(updated[idx].counted || 0) + 1,
          };
          toast({
            title: "Count Incremented",
            description: `${product!.name}: ${updated[idx].counted}`,
          });
          return updated;
        }

        toast({ title: "Item Added", description: product!.name });
        return [
          ...prev,
          {
            id: product!.id,
            sku: product!.sku,
            name: product!.name,
            expected: product!.onHand,
            counted: 1,
            status: product!.status,
            categoryId: product!.categoryId,
          },
        ];
      });
    },
    [barcodeInput, inventory, tenantId, session, toast],
  );

  const submitOpname = useCallback(async () => {
    if (opnameEntries.length === 0) {
      toast({
        title: "Empty Audit",
        description: "No items scanned.",
        variant: "destructive",
      });
      return;
    }

    if (!tenantId || !session || !locationId) {
      toast({
        title: "Context Missing",
        description: "Please select a branch first.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      await retailService.submitOpname(tenantId, session, {
        locationId: locationId!,
        items: (Array.isArray(opnameEntries) ? opnameEntries : []).map((e: any) => ({
          productId: e.id,
          sku: e.sku,
          countedQty: e.counted,
          expectedQty: e.expected,
          notes: e.notes,
        })),
      });

      toast({
        title: "Opname Submitted",
        description: `Logged ${opnameEntries.length} items to stock history.`,
      });

      setOpnameActive(false);
      setOpnameEntries([]);
      fetchInventory();
    } catch (err) {
      console.error(err);
      toast({
        title: "Submission Failed",
        description: "Error saving opname records.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  }, [
    opnameEntries,
    toast,
    tenantId,
    session,
    locationId,
    fetchInventory,
  ]);


  const handleCountChange = useCallback((index: number, value: string) => {
    setOpnameEntries((prev) =>
      (Array.isArray(prev) ? prev : []).map((entry, i) =>
        i === index
          ? { ...entry, counted: value === "" ? "" : Number(value) }
          : entry,
      ),
    );
  }, []);

  // Global barcode scanner integration for multi-workflow
  useBarcodeScanner((barcode) => {
    if (!opnameActive && !movementType && !editItem && !detailItem) {
      const item = inventory.find((i) => i.sku === barcode);
      if (item) {
        toast({
          title: "Quick Lookup",
          description: `${item.name} | Stock: ${item.onHand}`,
        });
      }
    }
  });

  return (
    <div className="p-8 space-y-8 bg-background min-h-screen flex flex-col text-foreground">
      <InventoryGlassHeader
        title="Retail Inventory"
        subtitle={`${selectedStore?.name ?? "Select Store"} • Operations Gateway`}
        icon={Package}
        stats={[
          { label: "Branch SKUs", value: stats?.totalSKUs ?? 0 },
          { label: "Branch SOH", value: stats?.totalSOH ?? 0 },
          { 
            label: "Branch Value", 
            value: stats?.totalValue ? new Intl.NumberFormat("en-US", {
              style: "currency",
              currency: stats.currency || "USD",
              minimumFractionDigits: 0,
              maximumFractionDigits: 0,
            }).format(stats.totalValue) : "0", 
            color: "text-emerald-500" 
          },
        ]}
        actions={
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="lg"
              onClick={handleSync}
              disabled={isLoading}
              className="h-14 px-6 rounded-2xl border-border bg-secondary/40 backdrop-blur-md font-black italic text-xs uppercase tracking-widest gap-2 text-foreground hover:bg-secondary/60"
            >
              <RefreshCw className={cn("w-4 h-4", isLoading && "animate-spin")} />
              Sync
            </Button>

            {!canWrite && (
              <Badge className="bg-amber-500 text-foreground border-none font-black italic text-[10px] uppercase px-4 h-14 rounded-2xl flex items-center gap-2">
                <Lock className="w-4 h-4" /> View Only
              </Badge>
            )}
          </div>
        }
      />

      <div className="flex-1">
        <Tabs defaultValue="ledger" className="flex flex-col">
          <div className="max-w-[1600px] mx-auto pt-4 shrink-0">
            <TabsList className="h-14 p-1.5 bg-white/70 backdrop-blur-md border border-white rounded-[1.2rem] shadow-sm w-full md:w-auto overflow-x-auto overflow-y-hidden no-scrollbar">
              {[
                { val: "ledger", label: "Ledger", icon: Layers },
                { val: "opname", label: "Opname", icon: ClipboardCheck },
                { val: "movements", label: "Movements", icon: ArrowLeftRight },
                { val: "approvals", label: "Approvals", icon: ShieldCheck },
                { val: "creation", label: "Creation", icon: PlusSquare },
                { val: "report", label: "Report", icon: FileText },
              ].map((t) => (
                <TabsTrigger
                  key={t.val}
                  value={t.val}
                  className="rounded-xl px-6 font-black italic text-[10px] uppercase tracking-widest data-[state=active]:bg-secondary data-[state=active]:text-foreground transition-all gap-2"
                >
                  <t.icon className="w-3.5 h-3.5" />
                  {t.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </div>

          <TabsContent value="ledger" className="flex-1 m-0 p-8">
            <div className="max-w-[1600px] mx-auto space-y-8">
              {stats && (
                <InventoryKpiBar stats={stats} isAggregating={isLoading} />
              )}
              <InventoryFilterHub
                search={filters.search}
                onSearchChange={(v) => setFilters(prev => ({ ...prev, search: v }))}
                category={filters.category}
                onCategoryChange={(v) => setFilters(prev => ({ ...prev, category: v }))}
                categories={categoryOptions}
                type={filters.type}
                onTypeChange={(v) => setFilters(prev => ({ ...prev, type: v }))}
                status={filters.status}
                onStatusChange={(v) => setFilters(prev => ({ ...prev, status: v }))}
                location={locationId || ""}
                onLocationChange={(v) => updateBranch(v)}
                locations={stores.map(s => ({ id: s.locationId || s.id, name: s.name }))}
                sortBy={filters.sortBy}
                onSortChange={(v) => setFilters(prev => ({ ...prev, sortBy: v as any }))}
                advancedActions={
                  canWrite && (
                    <div className="flex gap-3">
                       <Button
                        variant="outline"
                        size="lg"
                        className="rounded-2xl border-border bg-secondary/40 backdrop-blur-md font-black italic text-xs uppercase tracking-widest gap-2 h-14 px-6 text-foreground hover:bg-secondary/60"
                        onClick={() => setIsCategoryManagerOpen(true)}
                      >
                        Categories
                      </Button>
                      <Button 
                        size="lg"
                        className="rounded-2xl bg-secondary text-foreground font-black italic text-xs uppercase tracking-widest gap-2 h-14 px-8"
                        onClick={() => setDetailItem({} as InventoryItemView)}
                      >
                        <Plus className="h-4 w-4" /> Add SKU
                      </Button>
                    </div>
                  )
                }
              />
              <Card className="rounded-2xl border-border bg-secondary/30 backdrop-blur-3xl shadow-2xl overflow-hidden border">
                <InventoryTable
                  items={inventory}
                  isLoading={isLoading}
                  page={page}
                  pageSize={PAGE_SIZE}
                  totalPages={totalPages}
                  totalItems={totalItems}
                  currentCount={inventory.length}
                  onPageChange={setPage}
                  statusBadge={statusBadge}
                  onEdit={(item) => setDetailItem(item)}
                  onPrint={(item) => {
                    setPrintItems([
                      {
                        id: item.id,
                        sku: item.sku,
                        name: item.name,
                        barcode: item.barcode || item.sku,
                        price: item.price,
                      },
                    ]);
                  }}
                  onMovement={(type) => setMovementType(type)}
                  onReclassify={(item) => {
                    setSelectedItemForReclassify(item);
                    setNewCategoryId(item.categoryId || "");
                    setIsReclassifyOpen(true);
                  }}
                  onCategoryClick={handleCategoryClick}
                  onRowClick={(item) => setDetailItem(item)}
                />
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="opname" className="flex-1 m-0 p-8">
            <div className="max-w-5xl mx-auto space-y-8">
              <StockOpnameTab
                storeName={selectedStore?.name}
                opnameActive={opnameActive}
                opnameEntries={opnameEntries}
                filters={opnameFilters}
                categoryOptions={categoryOptions}
                onFiltersChange={(patch) =>
                  setOpnameFilters((prev) => ({ ...prev, ...patch }))
                }
                barcodeInput={barcodeInput}
                onStart={startOpname}
                onDiscard={() => setOpnameActive(false)}
                onSubmit={submitOpname}
                onBarcodeChange={setBarcodeInput}
                onBarcodeKeyDown={handleBarcodeKeyDown}
                onCountChange={handleCountChange}
                onEntryChange={setOpnameEntries}
                isLoading={isSubmitting}
                statusBadge={statusBadge}
                selectedStoreId={locationId || ""}
              />
            </div>
          </TabsContent>

          <TabsContent value="movements" className="flex-1 m-0 p-8">
            <MovementsTab
              canWrite={canWrite}
              auditLog={MOCK_AUDIT_LOG}
              selectedStoreId={locationId || ""}
              onMovement={(type) => setMovementType(type)}
            />
          </TabsContent>

          <TabsContent value="creation" className="flex-1 m-0 p-8">
            <ItemCreationTab
              canWrite={canWrite}
              session={session}
              tenantId={tenantId}
              categoryOptions={categoryOptions}
            />
          </TabsContent>

          <TabsContent value="approvals" className="flex-1 m-0 p-8">
            <div className="max-w-7xl mx-auto space-y-6">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <h2 className="text-2xl font-black italic tracking-tight">
                    Pending SKU Approvals
                  </h2>
                  <p className="text-muted-foreground text-sm font-medium">
                    Items waiting for HOD verification before entering
                    inventory.
                  </p>
                </div>
                <Button
                  onClick={fetchPendingItems}
                  variant="outline"
                  size="sm"
                  className="rounded-xl gap-2 font-bold italic text-xs uppercase"
                >
                  <RefreshCw
                    className={cn("w-4 h-4", isApproving && "animate-spin")}
                  />{" "}
                  Refresh
                </Button>
              </div>

              {pendingItems.length === 0 ? (
                <div className="h-[400px] rounded-2xl bg-secondary/5 border-2 border-dashed border-slate-200 flex flex-col items-center justify-center text-center p-8">
                  <div className="w-16 h-16 rounded-2xl bg-white shadow-sm flex items-center justify-center mb-4">
                    <ShieldCheck className="w-8 h-8 text-muted-foreground/60" />
                  </div>
                  <h3 className="text-lg font-black italic tracking-tight">
                    All Clear!
                  </h3>
                  <p className="text-muted-foreground text-sm font-medium mt-1">
                    No items currently awaiting approval.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {(Array.isArray(pendingItems) ? pendingItems : []).map((item) => (
                    <Card
                      key={item.id}
                      className="rounded-[2rem] border-none shadow-xl overflow-hidden bg-white p-6 border-l-4 border-l-indigo-600"
                    >
                      <div className="flex justify-between items-start mb-4">
                        <Badge className="bg-primary/5 text-primary hover:bg-primary/10 rounded-lg text-[10px] font-black italic uppercase">
                          Pending Approval
                        </Badge>
                        <span className="text-[10px] font-black uppercase text-muted-foreground italic">
                          {item.sku}
                        </span>
                      </div>
                      <h4 className="text-lg font-black italic tracking-tight leading-tight mb-1">
                        {item.name}
                      </h4>
                      <p className="text-xs text-muted-foreground font-medium mb-4">
                        {item.category} • {item.unit}
                      </p>

                      <div className="grid grid-cols-2 gap-4 mb-6">
                        <div className="bg-secondary/5 rounded-2xl p-3">
                          <p className="text-[9px] font-black uppercase text-muted-foreground italic mb-1">
                            Price
                          </p>
                          <p className="text-sm font-black italic text-foreground">
                            ${item.price}
                          </p>
                        </div>
                        <div className="bg-secondary/5 rounded-2xl p-3">
                          <p className="text-[9px] font-black uppercase text-muted-foreground italic mb-1">
                            Type
                          </p>
                          <p className="text-sm font-black italic text-foreground">
                            {item.type}
                          </p>
                        </div>
                      </div>

                      <div className="flex gap-3">
                        <Button
                          className="flex-1 rounded-xl h-10 font-black italic uppercase text-[10px] tracking-widest bg-success hover:bg-emerald-700 text-foreground"
                          disabled={isApproving}
                          onClick={async () => {
                            setIsApproving(true);
                            try {
                              await retailService.approveItem(
                                tenantId!,
                                session!,
                                item.id,
                              );
                              toast({
                                title: "Approved",
                                description: `${item.sku} is now active.`,
                              });
                              fetchPendingItems();
                              fetchInventory();
                            } catch (e) {
                              toast({
                                title: "Error",
                                description: "Failed to approve item.",
                                variant: "destructive",
                              });
                            } finally {
                              setIsApproving(false);
                            }
                          }}
                        >
                          Approve
                        </Button>
                        <Button
                          variant="outline"
                          className="flex-1 rounded-xl h-10 font-black italic uppercase text-[10px] tracking-widest text-red-600 border-red-100 hover:bg-red-50"
                          disabled={isApproving}
                          onClick={async () => {
                            setIsApproving(true);
                            try {
                              await retailService.rejectItem(
                                tenantId!,
                                session!,
                                item.id,
                              );
                              toast({
                                title: "Rejected",
                                description: `${item.sku} was rejected.`,
                              });
                              fetchPendingItems();
                            } catch (e) {
                              toast({
                                title: "Error",
                                description: "Failed to reject item.",
                                variant: "destructive",
                              });
                            } finally {
                              setIsApproving(false);
                            }
                          }}
                        >
                          Reject
                        </Button>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="report" className="flex-1 m-0 p-8">
            <StockReportTab
              canWrite={canWrite}
              session={session}
              stores={stores}
              selectedStoreId={locationId || ""}
            />
          </TabsContent>
        </Tabs>
      </div>

      {/* ── Dialogs ── */}
      <InventoryMovementDialog
        type={movementType ?? "request_po"}
        open={!!movementType}
        onClose={() => setMovementType(null)}
        stores={stores}
        selectedStoreId={locationId || ""}
        tenantId={tenantId}
        session={session ?? undefined}
        items={inventory}
        categoryOptions={categoryOptions}
        suppliers={MOCK_SUPPLIERS}
        onSubmit={handleMovementSubmit}
        onPrintBarcodes={(barcodeItems) => setPrintItems(barcodeItems)}
      />
      <ItemDetailsModal
        item={detailItem}
        open={!!detailItem}
        onOpenChange={(open) => !open && setDetailItem(null)}
        onUpdated={fetchInventory}
        categories={dynamicCategories}
      />
      <PostekPrintModal
        open={printItems.length > 0}
        onClose={() => setPrintItems([])}
        items={printItems}
      />
      <CategoryManager
        isOpen={isCategoryManagerOpen}
        onClose={() => setIsCategoryManagerOpen(false)}
        onCategoriesChange={fetchCategories}
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
                  {categoryOptions.filter(c => c.id !== "all").map((cat) => (
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
                if (!selectedItemForReclassify || !session?.tenant_id) return;
                try {
                  await inventoryService.updateItemCategory(
                    session.tenant_id,
                    session,
                    selectedItemForReclassify.id,
                    newCategoryId,
                  );
                  toast({
                    title: "Success",
                    description: "Item reclassified successfully.",
                  });
                  setIsReclassifyOpen(false);
                  fetchInventory();
                } catch (err: any) {
                  toast({
                    title: "Error",
                    description: err.message || "Failed to reclassify item.",
                    variant: "destructive",
                  });
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
};

export default InventoryVisibility;
