import React, { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { InventoryItemView } from "../types";

export type BufferUpdatePayload = {
  id: string;
  minBuffer: number;
  reason: string;
  effectiveDate: string;
  notifyProcurement: boolean;
};

interface Props {
  item: InventoryItemView | null;
  open: boolean;
  onClose: () => void;
  canWrite: boolean;
  onSubmit: (payload: BufferUpdatePayload) => void;
}

export const InventoryStockEditDialog: React.FC<Props> = ({
  item,
  open,
  onClose,
  canWrite,
  onSubmit,
}) => {
  const [buffer, setBuffer] = useState("");
  const [reason, setReason] = useState("");
  const [effectiveDate, setEffectiveDate] = useState("");
  const [notifyProcurement, setNotifyProcurement] = useState(true);

  useEffect(() => {
    if (item) {
      setBuffer(String(item.minBuffer));
      setReason("");
      setEffectiveDate(new Date().toISOString().slice(0, 10));
      setNotifyProcurement(true);
    }
  }, [item]);

  if (!item) return null;

  const valid = buffer !== "" && reason.trim().length >= 5 && effectiveDate;

  const handleSubmit = () => {
    if (!valid) return;
    onSubmit({
      id: item.id,
      minBuffer: Number(buffer),
      reason,
      effectiveDate,
      notifyProcurement,
    });
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-sm rounded-[2rem]">
        <DialogHeader>
          <DialogTitle className="font-black italic tracking-tight">
            {item.name}
          </DialogTitle>
          <DialogDescription className="font-bold italic text-xs">
            {item.sku} • Current SOH: {item.onHand}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest">
                Min Buffer Stock *
              </Label>
              <Input
                type="number"
                min="0"
                value={buffer}
                onChange={(e) => setBuffer(e.target.value)}
                className="h-12 rounded-xl font-bold"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest">
                Effective Date *
              </Label>
              <Input
                type="date"
                value={effectiveDate}
                onChange={(e) => setEffectiveDate(e.target.value)}
                className="h-12 rounded-xl font-bold"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-[10px] font-black uppercase tracking-widest">
              Reason for Change * (min 5 chars)
            </Label>
            <Textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="rounded-xl font-bold resize-none"
              rows={3}
              placeholder="State reason..."
            />
          </div>

          <div className="flex items-center justify-between rounded-xl border border-border px-4 py-3">
            <div className="text-xs font-bold text-muted-foreground">
              Notify procurement / replenish
            </div>
            <Switch
              checked={notifyProcurement}
              onCheckedChange={setNotifyProcurement}
            />
          </div>
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={onClose}
            className="rounded-xl font-black italic"
          >
            Cancel
          </Button>
          <Button
            disabled={!valid}
            onClick={handleSubmit}
            className={cn(
              "rounded-xl font-black italic gap-2",
              canWrite ? "bg-secondary" : "bg-warning hover:bg-warning",
            )}
          >
            {canWrite ? "Save Changes" : "Request Changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
