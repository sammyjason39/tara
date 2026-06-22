import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ShieldHalf, Lock, AlertTriangle } from "lucide-react";
import type { Employee } from "@/core/types/hr/employee";

interface RoleModificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  staff: Employee | null;
  onSubmit: (newRole: string, reason: string) => Promise<void>;
}

const AVAILABLE_ROLES = [
  "Cashier",
  "Shift Supervisor",
  "Store Manager",
  "Inventory Specialist",
  "Retail HOD",
];

export const RoleModificationModal: React.FC<RoleModificationModalProps> = ({
  isOpen,
  onClose,
  staff,
  onSubmit,
}) => {
  const [newRole, setNewRole] = useState("");
  const [reason, setReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!staff) return null;

  const handleSubmit = async () => {
    if (!newRole || !reason) return;
    setIsSubmitting(true);
    await onSubmit(newRole, reason);
    setIsSubmitting(false);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md bg-secondary border-border p-8 rounded-2xl shadow-[0_20px_60px_rgba(0,0,0,0.4)] text-foreground">
        <DialogHeader className="mb-6">
          <DialogTitle className="text-xl font-black italic tracking-tighter flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-warning text-warning">
              <ShieldHalf className="w-6 h-6" />
            </div>
            MODIFY PERMISSIONS
          </DialogTitle>
          <div className="text-[10px] font-black text-warning uppercase tracking-widest mt-2 pl-14">
            Security Clearance Override
          </div>
        </DialogHeader>

        <div className="space-y-6">
          <div className="p-4 rounded-3xl bg-warning border border-warning/20 flex gap-4">
            <AlertTriangle className="w-6 h-6 text-warning shrink-0" />
            <div className="text-[10px] font-bold italic text-warning uppercase leading-relaxed">
              Warning: Elevating access scope requires an audit trail entry.
              This action will be logged into the Zenvix Vault permanently.
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-[10px] font-black italic uppercase tracking-widest text-muted-foreground block mb-2">
                Target Personnel
              </label>
              <div className="h-12 bg-secondary/60 rounded-xl border border-white/5 flex items-center px-4 font-bold text-sm text-muted-foreground/60">
                {staff.fullName} ({staff.roleTitle})
              </div>
            </div>

            <div>
              <label className="text-[10px] font-black italic uppercase tracking-widest text-muted-foreground block mb-2">
                New Assignable Role
              </label>
              <Select value={newRole} onValueChange={setNewRole}>
                <SelectTrigger className="w-full h-12 bg-secondary/60 border-border text-foreground font-bold italic rounded-xl">
                  <SelectValue placeholder="Select Governance Role..." />
                </SelectTrigger>
                <SelectContent className="bg-secondary/60 border-border text-foreground rounded-xl">
                  {(Array.isArray(AVAILABLE_ROLES) ? AVAILABLE_ROLES : []).map((role) => (
                    <SelectItem
                      key={role}
                      value={role}
                      className="font-bold cursor-pointer italic text-xs hover:bg-secondary"
                    >
                      {role}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-[10px] font-black italic uppercase tracking-widest text-muted-foreground block mb-2">
                Required: Justification
              </label>
              <textarea
                className="w-full h-24 bg-secondary/60 border-border text-foreground rounded-xl p-4 font-bold italic text-sm placeholder:text-muted-foreground focus:border-warning outline-none resize-none transition-colors"
                placeholder="Enter cryptographic audit reason..."
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              />
            </div>
          </div>
        </div>

        <DialogFooter className="mt-8 gap-3 sm:gap-0">
          <Button
            variant="ghost"
            onClick={onClose}
            className="text-[10px] font-black italic uppercase tracking-widest text-muted-foreground hover:text-foreground hover:bg-secondary/60 rounded-xl h-11"
          >
            Cancel Protocol
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!newRole || !reason || isSubmitting}
            className="text-[10px] font-black italic uppercase tracking-widest bg-warning hover:bg-warning text-foreground rounded-xl h-11 px-6 shadow-[0_0_15px_rgba(245,158,11,0.2)]"
          >
            <Lock className="w-3.5 h-3.5 mr-2" /> Sign & Modify
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
