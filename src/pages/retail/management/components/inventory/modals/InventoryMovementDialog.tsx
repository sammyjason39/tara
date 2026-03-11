import React, { useMemo, useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ArrowDownToLine,
  Lock,
  Truck,
  Send,
  Plus,
  Trash2,
  ChevronLeft,
  ChevronRight,
  MapPin,
  Building2,
  PackageCheck,
  PackagePlus,
  Layers,
  Barcode,
  Printer,
} from "lucide-react";
import type { RetailStore, RetailProduct } from "@/core/types/retail/retail";
import type { SessionContext } from "@/core/security/session";
import { retailService } from "@/core/services/retail/retailService";
import { MOVEMENT_META, type MovementType } from "../movementMeta";
import { useBarcodeScanner } from "@/hooks/useBarcodeScanner";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import type { PrintItem } from "@/components/shared/PostekPrintModal";
import { NewItemFormRow, type NewItemLine } from "@/components/shared/NewItemFormRow";
import {
  generateSkuFromCategory,
  generateBarcode,
} from "@/components/shared/NewItemFormHelpers";

// ─── Types ──────────────────────────────────────────────────────────────────

export type MovementLine = {
  id: string;
  sku: string;
  name: string;
  available?: number;
  qty: number;
  note?: string;
};

export type NewProductLine = NewItemLine;

export type PurchaseMode = "restock" | "new_product" | "mixed";

export type MovementPayload = {
  lines: MovementLine[];
  newProductLines?: NewProductLine[];
  purchaseMode?: PurchaseMode;
  ref: string;
  reason: string;
  uom: string;
  expectedDate?: string;
  destinationStoreId?: string;
  sourceStoreId?: string;
  supplierId?: string;
};

// ─── Props ───────────────────────────────────────────────────────────────────

interface Props {
  type: MovementType;
  open: boolean;
  onClose: () => void;
  stores: RetailStore[];
  selectedStoreId: string;
  tenantId?: string;
  session?: SessionContext;
  items: Array<{
    id: string;
    sku: string;
    name: string;
    available?: number;
    categoryId?: string;
  }>;
  categoryOptions?: { id: string; name: string }[];
  suppliers?: { id: string; name: string }[];
  onSubmit: (data: MovementPayload & { sourceType?: string }) => void;
  onPrintBarcodes?: (items: PrintItem[]) => void;
}

// Local helpers removed, using shared version from NewItemFormRow

// ─── Empty-state helper ───────────────────────────────────────────────────────

const EmptyDropdownNote: React.FC<{ message: string }> = ({ message }) => (
  <div className="flex items-center gap-2 h-10 px-3 rounded-xl bg-slate-50 border border-dashed border-slate-200">
    <span className="text-[10px] font-black italic uppercase tracking-widest text-slate-400">
      {message}
    </span>
  </div>
);

// NewProductRow removed, using NewItemFormRow
// ─── Main Component ───────────────────────────────────────────────────────────

export const InventoryMovementDialog: React.FC<Props> = ({
  type,
  open,
  onClose,
  stores,
  selectedStoreId,
  tenantId,
  session,
  items,
  categoryOptions = [],
  suppliers = [],
  onSubmit,
  onPrintBarcodes,
}) => {
  const { toast } = useToast();

  // ── Common state ──────────────────────────────────────────────────────────
  const [ref, setRef] = useState("");
  const [reason, setReason] = useState("");
  const [uom, setUom] = useState("units");
  const [expectedDate, setExpectedDate] = useState("");
  const [destinationStoreId, setDestinationStoreId] = useState("");
  const [sourceStoreId, setSourceStoreId] = useState("");
  const [supplierId, setSupplierId] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [selectedLines, setSelectedLines] = useState<MovementLine[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [allItems, setAllItems] = useState(items);
  const [isFetchingItems, setIsFetchingItems] = useState(false);
  const ITEMS_PER_PAGE = 20;

  // ── Receive from Purchase state ───────────────────────────────────────────
  const [purchaseMode, setPurchaseMode] = useState<PurchaseMode>("restock");
  const [newProductLines, setNewProductLines] = useState<NewProductLine[]>([]);

  // ── Derived ───────────────────────────────────────────────────────────────
  const currentStore = useMemo(
    () => stores.find((s) => s.id === selectedStoreId),
    [stores, selectedStoreId],
  );
  const meta = MOVEMENT_META[type];
  const otherStores = useMemo(
    () => stores.filter((s) => s.id !== selectedStoreId),
    [stores, selectedStoreId],
  );

  const isPO = type === "request_po";
  const isTransferOut = type === "transfer_out";
  const isReceiveTransfer = type === "receive_transfer";
  const isReceivePurchase = type === "receive_purchase";

  // ── Fetch all items when dialog opens ─────────────────────────────────────
  useEffect(() => {
    if (!open) return;
    if (!tenantId || !session) {
      setAllItems(items);
      return;
    }
    setIsFetchingItems(true);
    retailService
      .listInventory(tenantId, session, { pageSize: 9999 })
      .then((data) => {
        setAllItems(
          data.map((p: RetailProduct) => ({
            id: p.id,
            sku: p.sku,
            name: p.name,
            available: p.metadata?.available ?? p.stock ?? 0,
            categoryId: p.categoryId || "",
          })),
        );
      })
      .catch(() => setAllItems(items))
      .finally(() => setIsFetchingItems(false));
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Validation ────────────────────────────────────────────────────────────
  const validReason = reason.trim().length >= 5;
  const validDate = !!expectedDate || meta.dir === "out";

  const validLines = (() => {
    if (isReceivePurchase) {
      if (purchaseMode === "restock") return selectedLines.length > 0;
      if (purchaseMode === "new_product")
        return (
          newProductLines.length > 0 &&
          newProductLines.every((l) => l.name.trim() && l.sku.trim())
        );
      // mixed
      return (
        selectedLines.length > 0 ||
        (newProductLines.length > 0 &&
          newProductLines.every((l) => l.name.trim() && l.sku.trim()))
      );
    }
    return selectedLines.length > 0;
  })();

  const validDestination = !isTransferOut || !!destinationStoreId;
  const validSource = !isReceiveTransfer || !!sourceStoreId;

  const valid =
    validReason && validLines && validDestination && validSource && validDate;

  // ── Item picker helpers ───────────────────────────────────────────────────
  const addLine = (item: {
    id: string;
    sku: string;
    name: string;
    available?: number;
  }) => {
    setSelectedLines((prev) => {
      const existing = prev.find((l) => l.id === item.id);
      if (existing) {
        return prev.map((l) =>
          l.id === item.id ? { ...l, qty: l.qty + 1 } : l,
        );
      }
      return [...prev, { ...item, qty: 1, note: "" }];
    });
  };

  const updateLine = (id: string, changes: Partial<MovementLine>) => {
    setSelectedLines((prev) =>
      prev.map((l) => (l.id === id ? { ...l, ...changes } : l)),
    );
  };

  const removeLine = (id: string) => {
    setSelectedLines((prev) => prev.filter((l) => l.id !== id));
  };

  const filteredItems = useMemo(() => {
    const q = search.toLowerCase();
    return allItems.filter(
      (i) =>
        (!q ||
          i.name.toLowerCase().includes(q) ||
          i.sku.toLowerCase().includes(q)) &&
        (categoryFilter === "all" || i.categoryId === categoryFilter),
    );
  }, [allItems, search, categoryFilter]);

  const totalPages = Math.ceil(filteredItems.length / ITEMS_PER_PAGE);
  const paginatedItems = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredItems.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredItems, currentPage]);

  // ── New product helpers ───────────────────────────────────────────────────
  const addNewProductLine = () => {
    setNewProductLines((prev) => [
      ...prev,
      {
        tempId: `np-${Date.now()}`,
        name: "",
        sku: "",
        barcode: "",
        categoryId: "",
        price: 0,
        qty: 1,
      },
    ]);
  };

  const updateNewProductLine = (
    id: string,
    changes: Partial<NewProductLine>,
  ) => {
    setNewProductLines((prev) =>
      prev.map((l) => (l.tempId === id ? { ...l, ...changes } : l)),
    );
  };

  const removeNewProductLine = (id: string) => {
    setNewProductLines((prev) => prev.filter((l) => l.tempId !== id));
  };

  const handlePrintNewProduct = (line: NewProductLine) => {
    if (!onPrintBarcodes) return;
    onPrintBarcodes([
      {
        id: line.tempId,
        sku: line.sku,
        name: line.name,
        barcode: line.barcode || line.sku,
        price: line.price,
      },
    ]);
  };

  // ── Barcode scanner ───────────────────────────────────────────────────────
  useBarcodeScanner((barcode) => {
    if (open) {
      setSearch(barcode);
      const item = items.find((i) => i.sku === barcode);
      if (item) {
        addLine(item);
        toast({
          title: "Item Scanned",
          description: `${item.name} added to list.`,
        });
      } else {
        toast({
          title: "SKU Not Found",
          description: `Barcode: ${barcode}`,
          variant: "destructive",
        });
      }
    }
  });

  // ── Submit ────────────────────────────────────────────────────────────────
  const handleSubmit = () => {
    if (!valid) return;
    onSubmit({
      lines: selectedLines,
      newProductLines: isReceivePurchase ? newProductLines : undefined,
      purchaseMode: isReceivePurchase ? purchaseMode : undefined,
      ref,
      reason,
      uom,
      expectedDate: expectedDate || undefined,
      destinationStoreId: isTransferOut ? destinationStoreId : undefined,
      sourceStoreId: isReceiveTransfer ? sourceStoreId : undefined,
      supplierId: type === "receive_po" ? supplierId : undefined,
    });
    // Reset
    setSelectedLines([]);
    setNewProductLines([]);
    setRef("");
    setReason("");
    setExpectedDate("");
    setDestinationStoreId("");
    setSourceStoreId("");
    setSupplierId("");
    setCategoryFilter("all");
    setUom("units");
    setCurrentPage(1);
    setPurchaseMode("restock");
    onClose();
  };

  // ── Render helpers ────────────────────────────────────────────────────────

  const renderItemPicker = () => (
    <div className="space-y-4">
      <h3 className="text-xs font-black uppercase tracking-widest text-slate-800 italic">
        1. Item Discovery
      </h3>

      <div className="grid grid-cols-2 gap-3">
        <Input
          placeholder="Search SKU or Name..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setCurrentPage(1);
          }}
          className="h-10 rounded-xl font-bold bg-slate-50 border-none shadow-inner text-xs"
        />
        <Select
          value={categoryFilter}
          onValueChange={(val) => {
            setCategoryFilter(val);
            setCurrentPage(1);
          }}
        >
          <SelectTrigger className="h-10 rounded-xl font-bold bg-slate-50 border-none shadow-inner text-xs">
            <SelectValue placeholder="All Category" />
          </SelectTrigger>
          <SelectContent className="rounded-xl font-bold italic">
            <SelectItem value="all">All Category</SelectItem>
            {categoryOptions
              .filter((c) => c.id !== "all")
              .map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                </SelectItem>
              ))}
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-[1.5rem] border-2 border-slate-50 overflow-hidden shadow-sm bg-white flex flex-col min-h-[320px]">
        <div className="grid grid-cols-12 bg-slate-50 text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 px-4 py-3">
          <div className="col-span-8 italic">Item SKU &amp; Name</div>
          <div className="col-span-2 italic">Stock</div>
          <div className="col-span-2 text-right italic">Add</div>
        </div>
        <div className="flex-1 divide-y divide-slate-50 overflow-y-auto max-h-[280px]">
          {isFetchingItems && (
            <div className="h-full flex items-center justify-center py-16 text-slate-300">
              <div className="text-xs font-black italic uppercase tracking-widest animate-pulse">
                Loading…
              </div>
            </div>
          )}
          {!isFetchingItems &&
            paginatedItems.map((item) => (
              <div
                key={item.id}
                className="grid grid-cols-12 items-center px-4 py-3 text-sm gap-2 hover:bg-slate-50/50 transition-colors group"
              >
                <div className="col-span-8">
                  <div className="font-black italic text-slate-800 truncate text-[12px]">
                    {item.name}
                  </div>
                  <div className="text-[9px] font-mono font-bold text-slate-400 uppercase tracking-tighter">
                    {item.sku}
                  </div>
                </div>
                <div className="col-span-2 text-[11px] font-black text-blue-600 italic">
                  {item.available ?? 0}
                </div>
                <div className="col-span-2 flex justify-end">
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-8 w-8 p-0 rounded-lg hover:bg-blue-600 hover:text-white transition-all group-hover:scale-110"
                    onClick={() => addLine(item)}
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          {!isFetchingItems && filteredItems.length === 0 && (
            <div className="h-full flex flex-col items-center justify-center py-16 text-slate-300">
              <div className="text-xs font-black italic uppercase tracking-widest opacity-50">
                No items match your search
              </div>
            </div>
          )}
        </div>
        {/* Pagination */}
        <div className="px-4 py-3 border-t border-slate-50 bg-slate-50/30 flex flex-col gap-2 md:flex-row md:items-center md:justify-between shrink-0">
          <span className="text-[9px] font-black italic uppercase tracking-widest text-slate-400">
            Page {currentPage} of {Math.max(1, totalPages)} •{" "}
            {filteredItems.length} items
          </span>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              className="h-7 w-7 p-0"
              disabled={currentPage <= 1}
              onClick={() => setCurrentPage((p) => p - 1)}
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </Button>
            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter(
                (p) =>
                  p >= Math.max(1, currentPage - 2) &&
                  p <= Math.min(totalPages, currentPage + 2),
              )
              .map((pNum) => (
                <Button
                  key={pNum}
                  size="sm"
                  variant={pNum === currentPage ? "default" : "outline"}
                  className="h-7 w-7 p-0 text-[10px] font-black"
                  onClick={() => setCurrentPage(pNum)}
                >
                  {pNum}
                </Button>
              ))}
            <Button
              size="sm"
              variant="outline"
              className="h-7 w-7 p-0"
              disabled={currentPage >= totalPages}
              onClick={() => setCurrentPage((p) => p + 1)}
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );

  const renderNewProductPanel = () => (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-black uppercase tracking-widest text-emerald-700 italic flex items-center gap-2">
          <PackagePlus className="w-4 h-4" /> New Products
        </h3>
        <Button
          size="sm"
          variant="outline"
          className="h-7 gap-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest border-emerald-200 text-emerald-700 hover:bg-emerald-50"
          onClick={addNewProductLine}
        >
          <Plus className="w-3 h-3" /> Add Item
        </Button>
      </div>
      {newProductLines.length === 0 ? (
        <div className="rounded-[1.5rem] border-2 border-dashed border-emerald-100 bg-emerald-50/30 flex flex-col items-center justify-center py-10 text-center gap-2">
          <PackagePlus className="w-8 h-8 text-emerald-300" />
          <p className="text-[10px] font-black italic uppercase tracking-widest text-emerald-400">
            No new products added yet.
            <br />
            Click "Add Item" to begin.
          </p>
        </div>
      ) : (
        <div className="space-y-6 max-h-[520px] overflow-y-auto pr-2 pb-4">
          {newProductLines.map((line) => (
            <NewItemFormRow
              key={line.tempId}
              line={line}
              categoryOptions={categoryOptions}
              onChange={updateNewProductLine}
              onRemove={removeNewProductLine}
              onPrint={handlePrintNewProduct}
            />
          ))}
        </div>
      )}
    </div>
  );

  // ── Left column content depends on movement type ──────────────────────────
  const renderLeftColumn = () => {
    if (isReceivePurchase) {
      // Mode selector
      const modes: {
        key: PurchaseMode;
        label: string;
        icon: React.ReactNode;
        desc: string;
      }[] = [
        {
          key: "restock",
          label: "Restock",
          icon: <PackageCheck className="w-4 h-4" />,
          desc: "Existing items from master list",
        },
        {
          key: "new_product",
          label: "New Product",
          icon: <PackagePlus className="w-4 h-4" />,
          desc: "Create new item & barcode",
        },
        {
          key: "mixed",
          label: "Mixed",
          icon: <Layers className="w-4 h-4" />,
          desc: "Both restock and new items",
        },
      ];
      return (
        <div className="space-y-6">
          {/* Mode selector */}
          <div className="space-y-3">
            <h3 className="text-xs font-black uppercase tracking-widest text-slate-800 italic">
              1. Purchase Type
            </h3>
            <div className="grid grid-cols-3 gap-3">
              {modes.map((m) => (
                <button
                  key={m.key}
                  onClick={() => setPurchaseMode(m.key)}
                  className={cn(
                    "rounded-[1rem] border-2 p-4 text-left transition-all",
                    purchaseMode === m.key
                      ? "border-emerald-400 bg-emerald-50 shadow-sm"
                      : "border-slate-100 bg-white hover:border-emerald-200 hover:bg-emerald-50/30",
                  )}
                >
                  <div
                    className={cn(
                      "mb-2",
                      purchaseMode === m.key
                        ? "text-emerald-600"
                        : "text-slate-400",
                    )}
                  >
                    {m.icon}
                  </div>
                  <div
                    className={cn(
                      "font-black italic text-[11px] uppercase tracking-widest",
                      purchaseMode === m.key
                        ? "text-emerald-700"
                        : "text-slate-700",
                    )}
                  >
                    {m.label}
                  </div>
                  <div className="text-[9px] font-bold text-slate-400 mt-0.5 leading-tight">
                    {m.desc}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Restock picker */}
          {(purchaseMode === "restock" || purchaseMode === "mixed") && (
            <div>
              {purchaseMode === "mixed" && (
                <h4 className="text-[10px] font-black uppercase tracking-widest text-blue-600 italic mb-3 flex items-center gap-1.5">
                  <PackageCheck className="w-3.5 h-3.5" /> Existing Items
                  (Restock)
                </h4>
              )}
              {renderItemPicker()}
            </div>
          )}

          {/* New product form */}
          {(purchaseMode === "new_product" || purchaseMode === "mixed") && (
            <div>
              {purchaseMode === "mixed" && (
                <div className="border-t-2 border-dashed border-slate-100 pt-6" />
              )}
              {renderNewProductPanel()}
            </div>
          )}
        </div>
      );
    }

    // Default: item picker for all other types
    return renderItemPicker();
  };

  // ── Right column: config sections ─────────────────────────────────────────
  const renderContextSection = () => {
    // Stock Transfer → Destination location
    if (isTransferOut) {
      return (
        <div className="bg-indigo-50/50 rounded-[1.5rem] p-5 border border-indigo-100 space-y-3">
          <Label className="text-[10px] font-black uppercase tracking-widest text-indigo-600 flex items-center gap-2">
            <MapPin className="w-3.5 h-3.5" /> Transfer Destination *
          </Label>
          {otherStores.length === 0 ? (
            <>
              <EmptyDropdownNote message="No other locations registered" />
              <p className="text-[9px] italic text-slate-400 font-bold">
                Register additional store locations to enable inter-store
                transfers.
              </p>
            </>
          ) : (
            <Select
              value={destinationStoreId}
              onValueChange={setDestinationStoreId}
            >
              <SelectTrigger className="h-10 rounded-xl font-bold bg-white border-indigo-100 text-xs">
                <SelectValue placeholder="Select destination location..." />
              </SelectTrigger>
              <SelectContent className="rounded-xl font-bold italic">
                {otherStores.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    <span className="font-black">{s.name}</span>
                    {s.address && (
                      <span className="text-slate-400 ml-2 text-[10px]">
                        {s.address}
                      </span>
                    )}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
      );
    }

    // Receive from PO → Supplier
    if (type === "receive_po") {
      return (
        <div className="bg-emerald-50/50 rounded-[1.5rem] p-5 border border-emerald-100 space-y-3">
          <Label className="text-[10px] font-black uppercase tracking-widest text-emerald-600 flex items-center gap-2">
            <Building2 className="w-3.5 h-3.5" /> Supplier *
          </Label>
          {suppliers.length === 0 ? (
            <>
              <EmptyDropdownNote message="No suppliers registered" />
              <p className="text-[9px] italic text-slate-400 font-bold">
                Register suppliers in Procurement → Supplier Desk to populate
                this list.
              </p>
            </>
          ) : (
            <Select value={supplierId} onValueChange={setSupplierId}>
              <SelectTrigger className="h-10 rounded-xl font-bold bg-white border-emerald-100 text-xs">
                <SelectValue placeholder="Select supplier..." />
              </SelectTrigger>
              <SelectContent className="rounded-xl font-bold italic">
                {suppliers.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
      );
    }

    // Receive Transfer → Source location
    if (isReceiveTransfer) {
      return (
        <div className="bg-emerald-50/50 rounded-[1.5rem] p-5 border border-emerald-100 space-y-3">
          <Label className="text-[10px] font-black uppercase tracking-widest text-emerald-600 flex items-center gap-2">
            <MapPin className="w-3.5 h-3.5" /> Transferring From *
          </Label>
          {otherStores.length === 0 ? (
            <>
              <EmptyDropdownNote message="No other locations registered" />
              <p className="text-[9px] italic text-slate-400 font-bold">
                Register additional store locations to enable inter-store
                transfers.
              </p>
            </>
          ) : (
            <Select value={sourceStoreId} onValueChange={setSourceStoreId}>
              <SelectTrigger className="h-10 rounded-xl font-bold bg-white border-emerald-100 text-xs">
                <SelectValue placeholder="Select source location..." />
              </SelectTrigger>
              <SelectContent className="rounded-xl font-bold italic">
                {otherStores.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    <span className="font-black">{s.name}</span>
                    {s.address && (
                      <span className="text-slate-400 ml-2 text-[10px]">
                        {s.address}
                      </span>
                    )}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
      );
    }

    return null;
  };

  // ── Selected lines panel (right column) ───────────────────────────────────
  const renderSelectedLines = () => {
    const showRestockLines =
      !isReceivePurchase ||
      purchaseMode === "restock" ||
      purchaseMode === "mixed";
    const showNewProductSummary =
      isReceivePurchase &&
      (purchaseMode === "new_product" || purchaseMode === "mixed");

    return (
      <div className="space-y-3">
        <div className="flex justify-between items-center">
          <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
            {showNewProductSummary && showRestockLines
              ? `Selected (${selectedLines.length + newProductLines.length})`
              : `Selected Items (${showNewProductSummary ? newProductLines.length : selectedLines.length})`}
          </Label>
          {(selectedLines.length > 0 || newProductLines.length > 0) && (
            <button
              onClick={() => {
                setSelectedLines([]);
                setNewProductLines([]);
              }}
              className="text-[9px] font-black uppercase tracking-widest text-red-500 hover:underline"
            >
              Clear All
            </button>
          )}
        </div>
        <div className="rounded-[1.5rem] border-2 border-slate-50 overflow-hidden shadow-sm flex flex-col bg-slate-50/10 min-h-[160px] max-h-[260px]">
          <div className="grid grid-cols-12 bg-slate-50 text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 px-4 py-3">
            <div className="col-span-8 italic">Item Info</div>
            <div className="col-span-4 text-right italic pr-4">Qty</div>
          </div>
          <div className="flex-1 divide-y divide-slate-50 overflow-y-auto bg-white">
            {/* Restock lines */}
            {showRestockLines &&
              selectedLines.map((line) => (
                <div
                  key={line.id}
                  className="grid grid-cols-12 items-center px-4 py-3 text-sm gap-2 hover:bg-slate-50/50 transition-colors"
                >
                  <div className="col-span-8 flex items-center gap-3">
                    <button
                      className="text-red-300 hover:text-red-500 transition-colors"
                      onClick={() => removeLine(line.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                    <div>
                      <div className="font-black italic text-slate-800 truncate text-[11px]">
                        {line.name}
                      </div>
                      <div className="text-[9px] font-mono font-bold text-slate-400 uppercase tracking-tighter">
                        {line.sku}
                      </div>
                    </div>
                  </div>
                  <div className="col-span-4">
                    <Input
                      type="number"
                      min="1"
                      value={line.qty}
                      onChange={(e) =>
                        updateLine(line.id, {
                          qty: Math.max(1, Number(e.target.value) || 1),
                        })
                      }
                      className="h-8 rounded-lg font-black italic border-slate-100 text-center text-blue-600 text-[11px] px-1"
                    />
                  </div>
                </div>
              ))}
            {/* New product summary lines */}
            {showNewProductSummary &&
              newProductLines.map((line) => (
                <div
                  key={line.tempId}
                  className="grid grid-cols-12 items-center px-4 py-3 text-sm gap-2 hover:bg-emerald-50/50 transition-colors"
                >
                  <div className="col-span-8 flex items-center gap-3">
                    <button
                      className="text-red-300 hover:text-red-500 transition-colors"
                      onClick={() => removeNewProductLine(line.tempId)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                    <div>
                      <div className="flex items-center gap-1">
                        <PackagePlus className="w-3 h-3 text-emerald-500" />
                        <div className="font-black italic text-slate-800 truncate text-[11px]">
                          {line.name || "(unnamed)"}
                        </div>
                      </div>
                      <div className="text-[9px] font-mono font-bold text-emerald-400 uppercase tracking-tighter">
                        {line.sku || "—"}
                      </div>
                    </div>
                  </div>
                  <div className="col-span-4">
                    <Input
                      type="number"
                      min="1"
                      value={line.qty}
                      onChange={(e) =>
                        updateNewProductLine(line.tempId, {
                          qty: Math.max(1, parseInt(e.target.value) || 1),
                        })
                      }
                      className="h-8 rounded-lg font-black italic border-slate-100 text-center text-emerald-600 text-[11px] px-1"
                    />
                  </div>
                </div>
              ))}
            {/* Empty state */}
            {selectedLines.length === 0 && newProductLines.length === 0 && (
              <div className="h-full flex flex-col items-center justify-center py-10 text-slate-300 px-6 text-center">
                <div className="text-[9px] font-black italic uppercase tracking-widest opacity-50 leading-relaxed">
                  Initial list is empty.
                  <br />
                  Search and add items to begin.
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  // ─── Main render ──────────────────────────────────────────────────────────
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-[1200px] rounded-[2rem] max-h-[95vh] flex flex-col p-0 overflow-hidden">
        {/* Header */}
        <div className="px-8 py-6 border-b bg-white shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4 text-left">
              <div
                className={`w-14 h-14 rounded-2xl bg-${meta.color}-50 flex items-center justify-center`}
              >
                {meta.dir === "in" ? (
                  <ArrowDownToLine
                    className={`w-7 h-7 text-${meta.color}-600`}
                  />
                ) : (
                  <Truck className={`w-7 h-7 text-${meta.color}-600`} />
                )}
              </div>
              <div>
                <DialogTitle className="text-2xl font-black italic tracking-tighter">
                  {meta.label}
                </DialogTitle>
                <DialogDescription className="font-bold italic text-[10px] uppercase tracking-[0.2em] text-blue-600">
                  {currentStore?.name} •{" "}
                  <span className="text-slate-400">
                    {currentStore?.address || "No Address Set"}
                  </span>
                </DialogDescription>
              </div>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-8">
          <div className="grid grid-cols-12 gap-8">
            {/* Left Column */}
            <div className="col-span-12 lg:col-span-7 space-y-6">
              {renderLeftColumn()}
            </div>

            {/* Right Column */}
            <div className="col-span-12 lg:col-span-5 space-y-6 border-l pl-8">
              <h3 className="text-xs font-black uppercase tracking-widest text-blue-600 italic">
                2. Request Configuration
              </h3>

              {/* Selected lines */}
              {renderSelectedLines()}

              {/* Context-specific section (destination / supplier / source) */}
              {renderContextSection()}

              {/* Dates & UOM */}
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  {meta.dir === "in" && (
                    <div className="space-y-1.5">
                      <Label className="text-[9px] font-black uppercase tracking-widest text-slate-400 font-bold italic">
                        Expected Date *
                      </Label>
                      <Input
                        type="date"
                        value={expectedDate}
                        onChange={(e) => setExpectedDate(e.target.value)}
                        className="h-10 rounded-xl font-bold bg-slate-50 border-none text-[11px]"
                      />
                    </div>
                  )}
                  <div className="space-y-1.5">
                    <Label className="text-[9px] font-black uppercase tracking-widest text-slate-400 font-bold italic">
                      Unit Measure
                    </Label>
                    <Select value={uom} onValueChange={setUom}>
                      <SelectTrigger className="h-10 rounded-xl font-bold bg-slate-50 border-none text-[11px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl font-bold italic">
                        {["units", "boxes", "cases"].map((u) => (
                          <SelectItem key={u} value={u} className="text-[11px]">
                            {u.toUpperCase()}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-[9px] font-black uppercase tracking-widest text-slate-400 font-bold italic">
                    Note / Justification *
                  </Label>
                  <Textarea
                    placeholder="Why is this movement required?"
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    className="rounded-xl font-bold resize-none bg-slate-50 border-none text-xs min-h-[60px]"
                    rows={2}
                  />
                </div>
              </div>

              <div className="bg-amber-50/50 border border-amber-100 rounded-xl p-3 text-[10px] font-bold italic text-amber-700 flex items-start gap-3">
                <Lock className="w-3.5 h-3.5 text-amber-500 mt-0.5 shrink-0" />
                <p className="leading-relaxed">
                  Total{" "}
                  {selectedLines.length +
                    (isReceivePurchase ? newProductLines.length : 0)}{" "}
                  items. Request will be routed to HOD for secure verification
                  before fulfillment.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-8 py-6 border-t bg-slate-50/80 shrink-0">
          <div className="flex justify-end gap-3">
            <Button
              variant="ghost"
              onClick={onClose}
              className="rounded-xl font-black italic uppercase tracking-widest text-xs h-12 px-6"
            >
              Discard
            </Button>
            <Button
              disabled={!valid}
              onClick={handleSubmit}
              className={cn(
                "rounded-xl font-black italic uppercase tracking-widest text-xs h-12 px-8 gap-2 shadow-lg transition-all",
                valid
                  ? "bg-slate-900 text-white hover:bg-slate-800 hover:scale-105 active:scale-95 shadow-slate-200"
                  : "bg-slate-100 text-slate-400",
              )}
            >
              <Send className="w-4 h-4" /> Send Request
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
