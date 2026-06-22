import { FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ModuleModal } from "@/components/shared/ModuleModal";
import { useModuleMutation } from "@/hooks/useModuleQuery";
import { createProvisioningSchema, type CreateProvisioningInput } from "../schemas";
import { useToast } from "@/hooks/use-toast";

interface CreateProvisioningModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function CreateProvisioningModal({
  isOpen,
  onClose,
  onSuccess,
}: CreateProvisioningModalProps) {
  const { toast } = useToast();

  const mutation = useModuleMutation<CreateProvisioningInput, unknown>(
    "/v1/it/provisioning",
    "POST",
    ["/v1/it/provisioning"]
  );

  const handleSubmit = async (data: CreateProvisioningInput) => {
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
      title: "Provisioning request sent",
      description: `Account provisioning for ${data.subjectId} initiated.`,
    });
    onSuccess?.();
    onClose();
  };

  return (
    <ModuleModal
      schema={createProvisioningSchema}
      defaultValues={{
        subjectId: "",
        reason: "",
        scope: "full_portal",
      }}
      onSubmit={handleSubmit}
      onCancel={onClose}
      title="Provision New Account"
      isOpen={isOpen}
      description="Initiate a provisioning request for a new employee or supplier access portal."
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
