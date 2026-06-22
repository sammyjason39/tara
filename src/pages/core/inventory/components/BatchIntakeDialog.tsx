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
import { AlertCircle, Plus, Trash2 } from "lucide-react";
import { useSession } from "@/core/security/session";
import { useBatchIntake } from "../hooks/useInventoryQueries";

interface BatchIntakeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

const emptyRow = () => ({
  item_id: "",
  location_id: "",
  department_id: "",
  quantity: 1,
  unit_cost: 0,
  reason: "Batch Intake",
});

export function BatchIntakeDialog({
  open,
  onOpenChange,
  onSuccess,
}: BatchIntakeDialogProps) {
  const session = useSession();
  const batchMutation = useBatchIntake();
  const [items, setItems] = useState([emptyRow()]);
  const [error, setError] = useState<string | null>(null);

  const addItem = () => setItems((prev) => [...prev, emptyRow()]);

  const removeItem = (idx: number) =>
    setItems((prev) => (Array.isArray(prev) ? prev : []).filter((_, i) => i !== idx));

  const updateItem = (idx: number, field: string, value: any) =>
    setItems((prev) =>
      (Array.isArray(prev) ? prev : []).map((item, i) => (i === idx ? { ...item, [field]: value } : item)),
    );

  const reset = () => {
    setItems([emptyRow()]);
    setError(null);
  };

  const handleBatchIntake = async () => {
    const valid = (Array.isArray(items) ? items : []).filter((i) => i.item_id.trim() && i.quantity > 0);
    if (valid.length === 0) {
      setError("Add at least one row with a Product ID and quantity > 0.");
      return;
    }
    setError(null);
    try {
      await batchMutation.mutateAsync(valid);
      onSuccess();
      onOpenChange(false);
      reset();
    } catch (err: any) {
      setError(err?.message || "Batch intake failed. Please check all rows.");
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
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Batch Stock Intake</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          {error && (
            <div className="flex items-center gap-2 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {error}
            </div>
          )}

          <table className="w-full text-sm">
            <thead>
              <tr className="text-muted-foreground border-b text-xs uppercase">
                <th className="p-2 text-left">Product ID / SKU</th>
                <th className="p-2 text-left">Location / Dept</th>
                <th className="p-2 text-left w-24">Qty</th>
                <th className="p-2 text-left w-28">Unit Cost</th>
                <th className="p-2 w-10"></th>
              </tr>
            </thead>
            <tbody>
              {(Array.isArray(items) ? items : []).map((item, idx) => (
                <tr key={idx} className="border-b">
                  <td className="p-2">
                    <input
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                      placeholder="SKU or ID"
                      value={item.item_id}
                      onChange={(e) => updateItem(idx, "item_id", e.target.value)}
                    />
                  </td>
                  <td className="p-2 space-y-1">
                    <input
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                      placeholder="Location ID"
                      value={item.location_id}
                      onChange={(e) =>
                        updateItem(idx, "location_id", e.target.value)
                      }
                    />
                    <input
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                      placeholder="Dept ID (opt.)"
                      value={item.department_id}
                      onChange={(e) =>
                        updateItem(idx, "department_id", e.target.value)
                      }
                    />
                  </td>
                  <td className="p-2">
                    <input
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                      type="number"
                      min={1}
                      value={item.quantity}
                      onChange={(e) =>
                        updateItem(idx, "quantity", Number(e.target.value))
                      }
                    />
                  </td>
                  <td className="p-2">
                    <input
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                      type="number"
                      min={0}
                      value={item.unit_cost}
                      onChange={(e) =>
                        updateItem(idx, "unit_cost", Number(e.target.value))
                      }
                    />
                  </td>
                  <td className="p-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeItem(idx)}
                      disabled={items.length === 1}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <Button
            variant="outline"
            size="sm"
            className="w-full gap-2"
            onClick={addItem}
          >
            <Plus className="h-4 w-4" /> Add Row
          </Button>
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => {
              reset();
              onOpenChange(false);
            }}
            disabled={batchMutation.isPending}
          >
            Cancel
          </Button>
          <Button onClick={handleBatchIntake} disabled={batchMutation.isPending}>
            {batchMutation.isPending ? "Processing..." : "Confirm Batch Intake"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
