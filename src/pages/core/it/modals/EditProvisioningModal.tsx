import { FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ModuleModal } from "@/components/shared/ModuleModal";
import { useModuleMutation } from "@/hooks/useModuleQuery";
import { editProvisioningSchema, type EditProvisioningInput } from "../schemas";
import { useToast } from "@/hooks/use-toast";

interface EditProvisioningModalProps {
  isOpen: boolean;
  onClose: () => void;
  requestId: string;
  defaultValues: {
    subjectId: string;
    reason: string;
    scope: "full_portal" | "quote" | "invoice";
  };
  onSuccess?: () => void;
}

export function EditProvisioningModal({
  isOpen,
  onClose,
  requestId,
  defaultValues,
  onSuccess,
}: EditProvisioningModalProps) {
  const { toast } = useToast();

  const mutation = useModuleMutation<EditProvisioningInput, unknown>(
    `/v1/it/provisioning/${requestId}`,
    "PUT",
    ["/v1/it/provisioning"]
  );

  const handleSubmit = async (data: EditProvisioningInput) => {
    const payload: any = {
      reason: data.reason,
      scope: data.scope,
    };
    if (data.subjectId.startsWith("EMP")) {
      payload.employeeId = data.subjectId;
    } else {
      payload.supplierId = data.subjectId;
    }
    await mutation.mutateAsync(payload as any);
    toast({
      title: "Request updated",
      description: "Provisioning request updated successfully.",
    });
    onSuccess?.();
    onClose();
  };

  return (
    <ModuleModal
      schema={editProvisioningSchema}
      defaultValues={defaultValues}
      onSubmit={handleSubmit}
      onCancel={onClose}
      title="Edit Provisioning Request"
      isOpen={isOpen}
      description="Update details for an existing provisioning request."
    >
      {(form) => (
        <div className="space-y-4">
          <FormField
            control={form.control}
            name="subjectId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Employee/Supplier ID *</FormLabel>
                <FormControl>
                  <Input placeholder="e.g. EMP001 or SUP001" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="reason"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Reason *</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="Reason for provisioning request..."
                    className="min-h-[80px]"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="scope"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Scope *</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select scope" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="full_portal">Full Portal</SelectItem>
                    <SelectItem value="quote">Quote Only</SelectItem>
                    <SelectItem value="invoice">Invoice Only</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      )}
    </ModuleModal>
  );
}
