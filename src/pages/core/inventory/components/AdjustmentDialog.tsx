import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertCircle } from "lucide-react";
import { inventoryService } from "@/core/services/inventory/inventoryService";
import { useSession } from "@/core/security/session";
import type {
  InventoryStockBalance,
  InventoryItemMaster,
} from "@/core/types/inventory/inventory";

interface AdjustmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedBalance: {
    balance: InventoryStockBalance;
    item: InventoryItemMaster;
  } | null;
  onSuccess: () => void;
}

export function AdjustmentDialog({
  open,
  onOpenChange,
  selectedBalance,
  onSuccess,
}: AdjustmentDialogProps) {
  const session = useSession();
  const [delta, setDelta] = useState(0);
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reset = () => {
    setDelta(0);
    setReason("");
    setError(null);
  };

  const newQty = (selectedBalance?.balance.quantity || 0) + delta;

  const handleAdjust = async () => {
    if (!selectedBalance) return;
    if (delta === 0) {
      setError("Please enter a non-zero delta.");
      return;
    }
    if (!reason.trim()) {
      setError("Reason is required for audit purposes.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await inventoryService.requestAdjustment(session.tenantId, session, {
        itemId: selectedBalance.item.id,
        locationCode: selectedBalance.balance.locationCode,
        departmentCode: selectedBalance.balance.departmentCode,
        requestedDelta: delta,
        reason,
      });
      onSuccess();
      onOpenChange(false);
      reset();
    } catch (err: any) {
      setError(err?.message || "Failed to submit adjustment.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) reset();
        onOpenChange(o);
      }}
    >
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Stock Adjustment Request</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          {/* Item info */}
          <div className="rounded-lg bg-muted/60 px-3 py-2 text-sm">
            <p className="font-semibold">
              {selectedBalance?.item.name}{" "}
              <span className="font-mono text-xs text-muted-foreground">
                ({selectedBalance?.item.sku})
              </span>
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {selectedBalance?.balance.locationCode}
              {selectedBalance?.balance.departmentCode &&
                ` · ${selectedBalance.balance.departmentCode}`}
              {" — "}Current Qty: {selectedBalance?.balance.quantity}
            </p>
          </div>

          {error && (
            <div className="flex items-center gap-2 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {error}
            </div>
          )}

          <div className="space-y-1">
            <Label htmlFor="delta">
              Quantity Delta{" "}
              <span className="text-muted-foreground text-xs">(+/- amount)</span>
            </Label>
            <Input
              id="delta"
              type="number"
              value={delta}
              onChange={(e) => setDelta(Number(e.target.value))}
            />
            <p className="text-xs text-muted-foreground">
              {delta !== 0 && (
                <>
                  {selectedBalance?.balance.quantity} → <strong>{newQty}</strong>
                  {newQty < 0 && (
                    <span className="ml-1 text-destructive">
                      (Warning: will go negative)
                    </span>
                  )}
                </>
              )}
            </p>
          </div>

          <div className="space-y-1">
            <Label htmlFor="adj-reason">
              Reason <span className="text-destructive">*</span>
            </Label>
            <Input
              id="adj-reason"
              placeholder="e.g. Damage write-off, Cycle count correction"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              This adjustment will go to the approval queue.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => {
              reset();
              onOpenChange(false);
            }}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button onClick={handleAdjust} disabled={loading || delta === 0}>
            {loading ? "Submitting..." : "Submit Adjustment"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
