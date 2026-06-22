import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input as UIInput } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertCircle } from "lucide-react";
import { useSession } from "@/core/security/session";
import { useBatchTransfer } from "../hooks/useInventoryQueries";
import type { InventoryStockBalance } from "@/core/types/inventory/inventory";

interface BatchTransferDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedIds: string[];
  balances: InventoryStockBalance[];
  onSuccess: () => void;
}

export function BatchTransferDialog({ open, onOpenChange, selectedIds, balances, onSuccess }: BatchTransferDialogProps) {
  const session = useSession();
  const batchTransferMutation = useBatchTransfer();
  const [toLocation, setToLocation] = useState("");
  const [toDepartment, setToDepartment] = useState("");
  const [reason, setReason] = useState("Batch Internal Transfer");
  const [error, setError] = useState<string | null>(null);

  const selectedBalances = (Array.isArray(balances) ? balances : []).filter(b => selectedIds.includes(b.id));

  const handleBatchTransfer = async () => {
    if (!toLocation.trim()) {
      setError("Destination location is required.");
      return;
    }
    setError(null);
    try {
      const transfers = (Array.isArray(selectedBalances) ? selectedBalances : []).map(b => ({
        item_id: b.item_id,
        from_location_id: b.location_id,
        from_department_id: b.department_id,
        to_location_id: toLocation,
        to_department_id: toDepartment || undefined,
        quantity: b.quantity,
        reason: reason || "Batch transfer",
      }));
      await batchTransferMutation.mutateAsync({ transfers });
      onSuccess();
      onOpenChange(false);
      setToLocation(""); setToDepartment(""); setError(null);
    } catch (err: any) {
      setError(err?.message || "Batch transfer failed. Check all selections.");
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) { setError(null); } onOpenChange(o); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Batch Stock Transfer</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="rounded bg-muted p-2 text-xs">
            <p className="font-semibold mb-1">Items to Move ({selectedIds.length}):</p>
            <ul className="list-disc ml-4 opacity-80 max-h-24 overflow-y-auto">
              {(Array.isArray(selectedBalances) ? selectedBalances : []).map(b => (
                 <li key={b.id}>{b.item_id} from {b.location_id} ({b.quantity} units)</li>
              ))}
            </ul>
          </div>

          {error && (
            <div className="flex items-center gap-2 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {error}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="batch-to-loc">Destination Location <span className="text-destructive">*</span></Label>
              <UIInput
                id="batch-to-loc"
                placeholder="Loc Code"
                value={toLocation}
                onChange={e => setToLocation(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="batch-to-dept">Destination Dept</Label>
              <UIInput
                id="batch-to-dept"
                placeholder="Dept Code"
                value={toDepartment}
                onChange={e => setToDepartment(e.target.value)}
              />
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="batch-reason">Reason</Label>
            <UIInput
              id="batch-reason"
              placeholder="e.g. Consolidation"
              value={reason}
              onChange={e => setReason(e.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => { setError(null); onOpenChange(false); }} disabled={batchTransferMutation.isPending}>Cancel</Button>
          <Button onClick={handleBatchTransfer} disabled={batchTransferMutation.isPending || !toLocation}>
            {batchTransferMutation.isPending ? "Moving..." : "Perform Bulk Move"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
