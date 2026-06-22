import React, { useState, useEffect } from "react";
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
import { Input } from "@/components/ui/input";
import { User, Clock, Trash2 } from "lucide-react";
import type { ScheduledShift } from "./ScheduleGrid";

interface EditShiftModalProps {
  isOpen: boolean;
  onClose: () => void;
  shift: ScheduledShift | null;
  onSave: (updatedShift: ScheduledShift) => void;
  onDelete: (shiftId: string) => void;
  availableStaff: { id: string; name: string; role: string }[];
}

export const EditShiftModal: React.FC<EditShiftModalProps> = ({
  isOpen,
  onClose,
  shift,
  onSave,
  onDelete,
  availableStaff,
}) => {
  const [formData, setFormData] = useState<ScheduledShift | null>(null);

  useEffect(() => {
    if (shift) {
      setFormData({ ...shift });
    } else {
      setFormData(null);
    }
  }, [shift]);

  if (!formData) return null;

  const handleSave = () => {
    onSave(formData);
    onClose();
  };

  const handleDelete = () => {
    if (confirm("Are you sure you want to delete this shift block?")) {
      onDelete(formData.id);
      onClose();
    }
  };

  const handleEmployeeChange = (empId: string) => {
    if (empId === "UNASSIGNED") {
      setFormData({ ...formData, employeeId: "NEW", name: "Unassigned" });
      return;
    }
    const emp = availableStaff.find((s) => s.id === empId);
    if (emp) {
      setFormData({
        ...formData,
        employeeId: emp.id,
        name: emp.name,
        role: emp.role,
      });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md bg-white rounded-2xl p-8 border border-border shadow-2xl">
        <DialogHeader className="mb-6">
          <DialogTitle className="text-xl font-black italic tracking-tighter flex items-center gap-3 text-foreground">
            <div className="p-2.5 rounded-2xl bg-primary/5 text-primary">
              <User className="w-5 h-5" />
            </div>
            {formData.name === "Unassigned"
              ? "ASSIGN SHIFT"
              : "EDIT ASSIGNMENT"}
          </DialogTitle>
          <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest pl-14">
            {formData.dayOfWeek === 1
              ? "Monday"
              : formData.dayOfWeek === 2
                ? "Tuesday"
                : formData.dayOfWeek === 3
                  ? "Wednesday"
                  : formData.dayOfWeek === 4
                    ? "Thursday"
                    : formData.dayOfWeek === 5
                      ? "Friday"
                      : formData.dayOfWeek === 6
                        ? "Saturday"
                        : "Sunday"}{" "}
            Block
          </div>
        </DialogHeader>

        <div className="space-y-6">
          <div className="space-y-2">
            <label className="text-[10px] font-black italic uppercase tracking-widest text-muted-foreground">
              Personnel
            </label>
            <Select
              value={
                formData.employeeId === "NEW"
                  ? "UNASSIGNED"
                  : formData.employeeId
              }
              onValueChange={handleEmployeeChange}
            >
              <SelectTrigger className="w-full h-12 bg-secondary/5 border-border text-foreground font-bold italic rounded-xl">
                <SelectValue placeholder="Select Employee..." />
              </SelectTrigger>
              <SelectContent className="bg-white border-border rounded-xl">
                <SelectItem
                  value="UNASSIGNED"
                  className="font-bold italic text-muted-foreground"
                >
                  Unassigned
                </SelectItem>
                {(Array.isArray(availableStaff) ? availableStaff : []).map((emp) => (
                  <SelectItem
                    key={emp.id}
                    value={emp.id}
                    className="font-bold cursor-pointer italic text-xs hover:bg-secondary/5"
                  >
                    {emp.name}{" "}
                    <span className="text-[9px] text-muted-foreground ml-2 uppercase">
                      {emp.role}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-[10px] font-black italic uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
                <Clock className="w-3 h-3" /> Start Time
              </label>
              <Input
                type="time"
                value={formData.startTime}
                onChange={(e) =>
                  setFormData({ ...formData, startTime: e.target.value })
                }
                className="h-12 bg-secondary/5 border-border rounded-xl font-bold italic"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black italic uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
                <Clock className="w-3 h-3" /> End Time
              </label>
              <Input
                type="time"
                value={formData.endTime}
                onChange={(e) =>
                  setFormData({ ...formData, endTime: e.target.value })
                }
                className="h-12 bg-secondary/5 border-border rounded-xl font-bold italic"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black italic uppercase tracking-widest text-muted-foreground">
              Assigned Role
            </label>
            <Input
              value={formData.role}
              onChange={(e) =>
                setFormData({ ...formData, role: e.target.value })
              }
              className="h-12 bg-secondary/5 border-border rounded-xl font-bold italic text-foreground"
            />
          </div>
        </div>

        <DialogFooter className="mt-8 flex justify-between items-center sm:justify-between">
          <Button
            variant="ghost"
            onClick={handleDelete}
            className="text-[10px] font-black italic uppercase tracking-widest text-destructive hover:text-destructive hover:bg-destructive rounded-xl h-11"
          >
            <Trash2 className="w-4 h-4 mr-2" /> Delete
          </Button>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={onClose}
              className="text-[10px] font-black italic uppercase tracking-widest rounded-xl h-11 border-border"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              className="text-[10px] font-black italic uppercase tracking-widest bg-primary hover:bg-primary text-foreground rounded-xl h-11 px-6 shadow-md"
            >
              Confirm
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
