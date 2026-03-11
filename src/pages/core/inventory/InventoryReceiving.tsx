import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/core/ui/PageHeader";
import { WorkspacePanel } from "@/core/ui/WorkspacePanel";
import { DataTableShell } from "@/core/tools/DataTableShell";
import { FilterBar } from "@/core/tools/FilterBar";
import { FeedbackAlert } from "@/core/tools/FeedbackAlert";
import { useSession } from "@/core/security/session";
import { inventoryService } from "@/core/services/inventory/inventoryService";
import { Package, CheckCircle, AlertTriangle } from "lucide-react";

interface ProcurementReceiptItem {
  id: string;
  requisitionId: string;
  supplierId: string;
  supplierName: string;
  supplierBranch?: string;
  title: string;
  category?: string;
  status: string;
  totalAmount: number;
  issuedAt: string;
  expectedDeliveryDate?: string;
}

export default function InventoryReceiving() {
  const session = useSession();
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [queue, setQueue] = useState<ProcurementReceiptItem[]>([]);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Receipt confirmation modal state
  const [selectedPO, setSelectedPO] = useState<ProcurementReceiptItem | null>(null);
  const [isReceiveOpen, setIsReceiveOpen] = useState(false);
  const [receiveLocationId, setReceiveLocationId] = useState("");
  const [receiveItems, setReceiveItems] = useState<
    Array<{ sku: string; quantity: number; unitCost: number }>
  >([{ sku: "", quantity: 1, unitCost: 0 }]);
  const [isProcessing, setIsProcessing] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const q = await inventoryService.listProcurementReceiptQueue(session.tenantId, session);
      setQueue(Array.isArray(q) ? q : []);
    } catch (err) {
      console.error("Failed to fetch procurement receipt queue:", err);
      setErrorMessage("Failed to load receipt queue.");
    } finally {
      setLoading(false);
    }
  }, [session.tenantId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const filteredQueue = useMemo(
    () =>
      queue.filter((po) =>
        search
          ? `${po.title} ${po.supplierName} ${po.status} ${po.id}`
              .toLowerCase()
              .includes(search.toLowerCase())
          : true,
      ),
    [queue, search],
  );

  const handleOpenReceive = (po: ProcurementReceiptItem) => {
    setSelectedPO(po);
    setReceiveItems([{ sku: "", quantity: 1, unitCost: 0 }]);
    setReceiveLocationId("");
    setIsReceiveOpen(true);
  };

  const handleProcessReceipt = async () => {
    if (!selectedPO) return;
    if (!receiveLocationId.trim()) {
      setErrorMessage("Please specify a location ID for stock intake.");
      return;
    }
    const validItems = receiveItems.filter((i) => i.sku.trim() && i.quantity > 0);
    if (validItems.length === 0) {
      setErrorMessage("Please add at least one item with a SKU and quantity.");
      return;
    }
    setIsProcessing(true);
    try {
      await inventoryService.processProcurementReceipt(session.tenantId, session, {
        finalPoId: selectedPO.id,
        locationId: receiveLocationId.trim(),
        items: validItems,
      });
      setStatusMessage(
        `Receipt processed for "${selectedPO.title}" — ${validItems.length} item line(s) added to inventory.`,
      );
      setIsReceiveOpen(false);
      setSelectedPO(null);
      refresh();
    } catch (err: any) {
      setErrorMessage(`Receipt failed: ${err?.message || "Unknown error"}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const statusBadgeVariant = (status: string) => {
    if (status === "RELEASED") return "default";
    if (status === "DELIVERED") return "secondary";
    return "outline";
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <p className="text-muted-foreground">Loading receiving queue...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Receiving Desk"
        subtitle="Procurement goods-receipt sync. Confirm delivered POs to add stock to inventory."
        primaryAction={
          <Button variant="outline" size="sm" onClick={refresh}>
            Refresh Queue
          </Button>
        }
        secondaryActions={
          <Input
            placeholder="Search by title, supplier, or status"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="min-w-[240px]"
          />
        }
      />

      <FeedbackAlert
        message={statusMessage}
        error={errorMessage}
        onClear={() => { setStatusMessage(null); setErrorMessage(null); }}
      />

      <WorkspacePanel
        title="Procurement Receipt Queue"
        description="Approved Final POs awaiting goods receipt confirmation."
      >
        <FilterBar searchValue={search} onSearchChange={setSearch} />
        <DataTableShell total={filteredQueue.length} page={1} pageSize={15}>
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-xs uppercase text-muted-foreground">
              <tr>
                <th className="p-3 text-left">PO Title</th>
                <th className="p-3 text-left">Supplier</th>
                <th className="p-3 text-left">Category</th>
                <th className="p-3 text-right">Amount</th>
                <th className="p-3 text-left">Status</th>
                <th className="p-3 text-left">Expected Delivery</th>
                <th className="p-3 text-left">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredQueue.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-muted-foreground">
                    <div className="flex flex-col items-center gap-2">
                      <Package className="h-8 w-8 opacity-30" />
                      <p>No pending procurement receipts</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredQueue.map((po) => (
                  <tr key={po.id} className="border-t hover:bg-muted/50 transition-colors">
                    <td className="p-3 font-medium">{po.title}</td>
                    <td className="p-3 text-muted-foreground">
                      {po.supplierName}
                      {po.supplierBranch && (
                        <span className="ml-1 text-xs">({po.supplierBranch})</span>
                      )}
                    </td>
                    <td className="p-3 text-muted-foreground">{po.category || "—"}</td>
                    <td className="p-3 text-right font-mono">
                      {Number(po.totalAmount).toLocaleString("en-ID", {
                        style: "currency",
                        currency: "IDR",
                        minimumFractionDigits: 0,
                      })}
                    </td>
                    <td className="p-3">
                      <Badge variant={statusBadgeVariant(po.status)}>{po.status}</Badge>
                    </td>
                    <td className="p-3 text-muted-foreground text-xs">
                      {po.expectedDeliveryDate
                        ? new Date(po.expectedDeliveryDate).toLocaleDateString()
                        : "—"}
                    </td>
                    <td className="p-3">
                      <Button
                        size="sm"
                        variant="outline"
                        className="gap-1"
                        onClick={() => handleOpenReceive(po)}
                      >
                        <CheckCircle className="h-3 w-3" />
                        Receive
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </DataTableShell>
      </WorkspacePanel>

      {/* Receive Dialog */}
      <Dialog open={isReceiveOpen} onOpenChange={(open) => { if (!open) { setIsReceiveOpen(false); setSelectedPO(null); } }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Confirm Goods Receipt</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2 text-sm">
            <div className="rounded bg-muted/40 px-3 py-2">
              <p className="font-semibold">{selectedPO?.title}</p>
              <p className="text-muted-foreground">Supplier: {selectedPO?.supplierName}</p>
            </div>

            <div className="space-y-1">
              <Label htmlFor="recv-location">
                Target Location ID <span className="text-destructive">*</span>
              </Label>
              <Input
                id="recv-location"
                placeholder="e.g. loc-uuid or WH-01"
                value={receiveLocationId}
                onChange={(e) => setReceiveLocationId(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Items Received</Label>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    setReceiveItems((prev) => [...prev, { sku: "", quantity: 1, unitCost: 0 }])
                  }
                >
                  + Add Line
                </Button>
              </div>
              {receiveItems.map((item, idx) => (
                <div key={idx} className="grid grid-cols-3 gap-2">
                  <Input
                    placeholder="SKU"
                    value={item.sku}
                    onChange={(e) =>
                      setReceiveItems((prev) =>
                        prev.map((p, i) => (i === idx ? { ...p, sku: e.target.value } : p)),
                      )
                    }
                  />
                  <Input
                    type="number"
                    placeholder="Qty"
                    value={item.quantity}
                    min={1}
                    onChange={(e) =>
                      setReceiveItems((prev) =>
                        prev.map((p, i) =>
                          i === idx ? { ...p, quantity: Number(e.target.value) } : p,
                        ),
                      )
                    }
                  />
                  <Input
                    type="number"
                    placeholder="Unit Cost"
                    value={item.unitCost}
                    min={0}
                    onChange={(e) =>
                      setReceiveItems((prev) =>
                        prev.map((p, i) =>
                          i === idx ? { ...p, unitCost: Number(e.target.value) } : p,
                        ),
                      )
                    }
                  />
                </div>
              ))}
            </div>

            <div className="flex items-center gap-1 rounded border border-amber-200 bg-amber-50 px-3 py-2 text-amber-800 text-xs dark:bg-amber-950/30 dark:border-amber-800 dark:text-amber-400">
              <AlertTriangle className="h-3 w-3 shrink-0" />
              This will update stock levels for each line item and mark the PO as RECEIVED.
            </div>
          </div>
          <DialogFooter className="pt-2">
            <Button variant="outline" onClick={() => setIsReceiveOpen(false)} disabled={isProcessing}>
              Cancel
            </Button>
            <Button onClick={handleProcessReceipt} disabled={isProcessing}>
              {isProcessing ? "Processing..." : "Confirm Receipt"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
