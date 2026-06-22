/**
 * Open Shift Modal
 *
 * Allows an operator to open a new shift with initial cash declaration.
 * Requirements: 8.1, 8.4, 16.1
 */

import { FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { ModuleModal } from "@/components/shared/ModuleModal";
import { useModuleMutation } from "@/hooks/useModuleQuery";
import { openShiftSchema, type OpenShiftInput } from "../schemas";
import { useToast } from "@/hooks/use-toast";

interface OpenShiftModalProps {
  isOpen: boolean;
  onClose: () => void;
  storeId?: string;
  terminalId?: string;
}

export function OpenShiftModal({ isOpen, onClose, storeId = "", terminalId = "" }: OpenShiftModalProps) {
  const { toast } = useToast();

  const mutation = useModuleMutation<OpenShiftInput, unknown>(
    "/v1/retail/shifts/open",
    "POST",
    ["/v1/retail/shifts"]
  );

  const handleSubmit = async (data: OpenShiftInput) => {
    await mutation.mutateAsync(data);
    toast({ title: "Shift opened", description: "New shift started successfully." });
    onClose();
  };

  return (
    <ModuleModal
      schema={openShiftSchema}
      defaultValues={{ storeId, terminalId, openingCash: 0 }}
      onSubmit={handleSubmit}
      onCancel={onClose}
      title="Open Shift"
      description="Declare opening cash to start a new shift."
      isOpen={isOpen}
    >
      {(form) => (
        <div className="space-y-4">
          <FormField
            control={form.control}
            name="storeId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Store ID</FormLabel>
                <FormControl><Input placeholder="Store identifier" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="terminalId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Terminal ID</FormLabel>
                <FormControl><Input placeholder="Terminal identifier" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="openingCash"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Opening Cash Amount</FormLabel>
                <FormControl><Input type="number" min={0} step="0.01" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      )}
    </ModuleModal>
  );
}
