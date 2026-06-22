/**
 * Edit Shift Modal
 *
 * Edit shift configuration (operator, timing, cash).
 * Requirements: 8.1, 8.4, 16.1
 */

import { FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ModuleModal } from "@/components/shared/ModuleModal";
import { useModuleMutation } from "@/hooks/useModuleQuery";
import { editShiftSchema, type EditShiftInput } from "../schemas";
import { useToast } from "@/hooks/use-toast";

interface EditShiftModalProps {
  isOpen: boolean;
  onClose: () => void;
  shiftId: string;
  defaultValues?: Partial<EditShiftInput>;
}

export function EditShiftModal({ isOpen, onClose, shiftId, defaultValues }: EditShiftModalProps) {
  const { toast } = useToast();

  const mutation = useModuleMutation<EditShiftInput, unknown>(
    `/v1/retail/shifts/${shiftId}`,
    "PATCH",
    ["/v1/retail/shifts"]
  );

  const handleSubmit = async (data: EditShiftInput) => {
    await mutation.mutateAsync(data);
    toast({ title: "Shift updated", description: "Shift configuration saved." });
    onClose();
  };

  return (
    <ModuleModal
      schema={editShiftSchema}
      defaultValues={{
        storeId: defaultValues?.storeId || "",
        terminalId: defaultValues?.terminalId || "",
        employeeId: defaultValues?.employeeId || "",
        openingCash: defaultValues?.openingCash || 0,
        closingCash: defaultValues?.closingCash,
        notes: defaultValues?.notes || "",
      }}
      onSubmit={handleSubmit}
      onCancel={onClose}
      title="Edit Shift"
      description="Modify shift details."
      isOpen={isOpen}
    >
      {(form) => (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="storeId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Store</FormLabel>
                  <FormControl><Input {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="terminalId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Terminal</FormLabel>
                  <FormControl><Input {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          <FormField
            control={form.control}
            name="employeeId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Operator</FormLabel>
                <FormControl><Input placeholder="Employee ID" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="openingCash"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Opening Cash</FormLabel>
                <FormControl><Input type="number" min={0} step="0.01" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="notes"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Notes</FormLabel>
                <FormControl><Textarea placeholder="Shift notes..." {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      )}
    </ModuleModal>
  );
}
