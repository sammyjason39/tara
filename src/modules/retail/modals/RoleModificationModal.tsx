/**
 * Role Modification Modal
 *
 * Assign or modify staff roles.
 * Requirements: 8.1, 16.1
 */

import { FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ModuleModal } from "@/components/shared/ModuleModal";
import { useModuleMutation } from "@/hooks/useModuleQuery";
import { roleModificationSchema, type RoleModificationInput } from "../schemas";
import { useToast } from "@/hooks/use-toast";

interface RoleModificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  employeeId?: string;
}

export function RoleModificationModal({ isOpen, onClose, employeeId = "" }: RoleModificationModalProps) {
  const { toast } = useToast();

  const mutation = useModuleMutation<RoleModificationInput, unknown>(
    "/v1/retail/staff/roles",
    "POST",
    ["/v1/retail/staff"]
  );

  const handleSubmit = async (data: RoleModificationInput) => {
    await mutation.mutateAsync(data);
    toast({ title: "Role updated", description: "Staff role modification saved." });
    onClose();
  };

  return (
    <ModuleModal
      schema={roleModificationSchema}
      defaultValues={{ employeeId, role: "", effectiveDate: "", notes: "" }}
      onSubmit={handleSubmit}
      onCancel={onClose}
      title="Modify Staff Role"
      description="Assign or change a staff member's role."
      isOpen={isOpen}
    >
      {(form) => (
        <div className="space-y-4">
          <FormField
            control={form.control}
            name="employeeId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Employee</FormLabel>
                <FormControl><Input placeholder="Employee ID" {...field} disabled={!!employeeId} /></FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="role"
            render={({ field }) => (
              <FormItem>
                <FormLabel>New Role</FormLabel>
                <FormControl><Input placeholder="e.g. Senior Cashier" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="effectiveDate"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Effective Date</FormLabel>
                <FormControl><Input type="date" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="notes"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Notes (optional)</FormLabel>
                <FormControl><Textarea placeholder="Additional notes..." {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      )}
    </ModuleModal>
  );
}
