import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input as UIInput } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertCircle } from "lucide-react";
import { useSession } from "@/core/security/session";
import { useRecordTransfer } from "../hooks/useInventoryQueries";
import type {
  InventoryStockBalance,
  InventoryItemMaster,
} from "@/core/types/inventory/inventory";

interface TransferDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedBalance: {
    balance: InventoryStockBalance;
    item: InventoryItemMaster;
  } | null;
  onSuccess: () => void;
}

export function TransferDialog({
  open,
  onOpenChange,
  selectedBalance,
  onSuccess,
}: TransferDialogProps) {
  const session = useSession();
  const transferMutation = useRecordTransfer();
  const [quantity, setQuantity] = useState(1);
  const [toLocation, setToLocation] = useState("");
  const [toDepartment, setToDepartment] = useState("");
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);

  const reset = () => {
    setQuantity(1);
    setToLocation("");
    setToDepartment("");
    setReason("");
    setError(null);
  };

  const handleTransfer = async () => {
    if (!selectedBalance) return;
    if (!toLocation.trim()) {
      setError("Destination location is required.");
      return;
    }
    if (quantity <= 0) {
      setError("Quantity must be greater than 0.");
      return;
    }
    setError(null);
    try {
      await transferMutation.mutateAsync({
        item_id: selectedBalance.item.id,
        from_location_id: selectedBalance.balance.location_id,
        from_department_id: selectedBalance.balance.department_id,
        to_location_id: toLocation,
        to_department_id: toDepartment || undefined,
        quantity,
        reason: reason || "Stock transfer",
      });
      onSuccess();
      onOpenChange(false);
      reset();
    } catch (err: any) {
      setError(err?.message || "Transfer failed. Please try again.");
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
          <DialogTitle>Transfer Stock</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          {/* Source item info */}
          <div className="rounded-lg bg-muted/60 px-3 py-2 text-sm">
            <p className="font-semibold">
              {selectedBalance?.item.name}{" "}
              <span className="font-mono text-xs text-muted-foreground">
                ({selectedBalance?.item.sku})
              </span>
            </p>
            <p className="text-muted-foreground text-xs mt-0.5">
              From: {selectedBalance?.balance.location_id}
              {selectedBalance?.balance.department_id &&
                ` · ${selectedBalance.balance.department_id}`}{" "}
              — Qty: {selectedBalance?.balance.quantity}
            </p>
          </div>

          {error && (
            <div className="flex items-center gap-2 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {error}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="to-location">
                Destination Location <span className="text-destructive">*</span>
              </Label>
              <UIInput
                id="to-location"
                placeholder="e.g. JKT-WH-B"
                value={toLocation}
                onChange={(e) => setToLocation(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="to-dept">Destination Dept</Label>
              <UIInput
                id="to-dept"
                placeholder="e.g. PRODUCTION"
                value={toDepartment}
                onChange={(e) => setToDepartment(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-1">
            <Label htmlFor="qty">
              Quantity <span className="text-destructive">*</span>
            </Label>
            <UIInput
              id="qty"
              type="number"
              min={1}
              value={quantity}
              onChange={(e) => setQuantity(Number(e.target.value))}
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="reason">Reason</Label>
            <UIInput
              id="reason"
              placeholder="e.g. Replenishment, Rebalancing"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => {
              reset();
              onOpenChange(false);
            }}
            disabled={transferMutation.isPending}
          >
            Cancel
          </Button>
          <Button onClick={handleTransfer} disabled={transferMutation.isPending}>
            {transferMutation.isPending ? "Processing..." : "Execute Transfer"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
