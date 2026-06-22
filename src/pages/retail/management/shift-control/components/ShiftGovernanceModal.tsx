import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ShieldAlert, AlertTriangle, Fingerprint } from "lucide-react";

interface ShiftGovernanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPublish: (reason: string) => Promise<void>;
  affectedShiftsCount: number;
}

export const ShiftGovernanceModal: React.FC<ShiftGovernanceModalProps> = ({
  isOpen,
  onClose,
  onPublish,
  affectedShiftsCount,
}) => {
  const [reason, setReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!reason) return;
    setIsSubmitting(true);
    await onPublish(reason);
    setIsSubmitting(false);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md bg-secondary border-border p-8 rounded-2xl shadow-[0_20px_60px_rgba(0,0,0,0.4)] text-foreground">
        <DialogHeader className="mb-6">
          <DialogTitle className="text-xl font-black italic tracking-tighter flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-primary/20 text-primary">
              <ShieldAlert className="w-6 h-6" />
            </div>
            PUBLISH SCHEDULE
          </DialogTitle>
          <div className="text-[10px] font-black text-primary/80 uppercase tracking-widest mt-2 pl-14">
            Core HR Synchronization
          </div>
        </DialogHeader>

        <div className="space-y-6">
          <div className="p-4 rounded-3xl bg-primary/20 border border-primary flex gap-4">
            <AlertTriangle className="w-6 h-6 text-primary shrink-0" />
            <div className="text-[10px] font-bold italic text-primary/70 uppercase leading-relaxed">
              You are about to publish {affectedShiftsCount} shift assignments
              to the Zenvix Core HR module. Once published, devices will enforce
              these schedules for clock-in/out protocols.
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-[10px] font-black italic uppercase tracking-widest text-muted-foreground block mb-2">
                Mandatory: Publication Justification
              </label>
              <textarea
                className="w-full h-24 bg-secondary/60 border-border text-foreground rounded-xl p-4 font-bold italic text-sm placeholder:text-muted-foreground focus:border-primary outline-none resize-none transition-colors"
                placeholder="E.g., Weekly Schedule generation approved by..."
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              />
            </div>
          </div>

          <div className="flex items-center gap-3 text-muted-foreground">
            <Fingerprint className="w-4 h-4" />
            <span className="text-[9px] font-black italic uppercase tracking-widest">
              Superadmin Audit Subsystem Auto-Attached
            </span>
          </div>
        </div>

        <DialogFooter className="mt-8 gap-3 sm:gap-0">
          <Button
            variant="ghost"
            onClick={onClose}
            className="text-[10px] font-black italic uppercase tracking-widest text-muted-foreground hover:text-foreground hover:bg-secondary/60 rounded-xl h-11"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!reason || isSubmitting}
            className="text-[10px] font-black italic uppercase tracking-widest bg-primary hover:bg-primary text-foreground rounded-xl h-11 px-6 shadow-[0_0_15px_rgba(99,102,241,0.2)]"
          >
            Commit payload
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
