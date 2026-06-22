import { FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { ModuleModal } from "@/components/shared/ModuleModal";
import { useModuleMutation } from "@/hooks/useModuleQuery";
import { convertLeadSchema, type ConvertLeadInput } from "../schemas";
import { useToast } from "@/hooks/use-toast";

interface ConvertLeadModalProps {
  isOpen: boolean;
  onClose: () => void;
  leadId: string;
  leadCompany: string;
  leadContact: string;
  leadValue: number;
}

/**
 * Lead-to-Opportunity conversion modal.
 *
 * Carries over:
 * - Company name → accountName
 * - Contact person → contactName
 * - Potential value → amount
 *
 * Sets lead status to "CONVERTED" on the backend.
 */
export function ConvertLeadModal({
  isOpen,
  onClose,
  leadId,
  leadCompany,
  leadContact,
  leadValue,
}: ConvertLeadModalProps) {
  const { toast } = useToast();

  const mutation = useModuleMutation<ConvertLeadInput, unknown>(
    `/v1/sales/leads/${leadId}/convert`,
    "POST",
    ["/v1/sales/leads", "/v1/sales/opportunities", "/v1/sales/dashboard"]
  );

  const handleSubmit = async (data: ConvertLeadInput) => {
    await mutation.mutateAsync(data);
    toast({
      title: "Lead converted",
      description: `${leadCompany} converted to Strategic Opportunity.`,
    });
    onClose();
  };

  return (
    <ModuleModal
      schema={convertLeadSchema}
      defaultValues={{
        leadId,
        expectedCloseDate: "",
        probability: 20,
      }}
      onSubmit={handleSubmit}
      onCancel={onClose}
      title="Convert Lead to Opportunity"
      description={`Convert ${leadCompany} (${leadContact}, value: ${leadValue.toLocaleString()}) into an opportunity. Company, contact, and potential value will be carried over.`}
      isOpen={isOpen}
    >
      {(form) => (
        <div className="space-y-4">
          <div className="rounded-lg bg-muted p-4 text-sm space-y-1">
            <p><span className="font-semibold">Company:</span> {leadCompany}</p>
            <p><span className="font-semibold">Contact:</span> {leadContact}</p>
            <p><span className="font-semibold">Value:</span> {leadValue.toLocaleString()}</p>
          </div>
          <FormField
            control={form.control}
            name="probability"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Initial Probability (%)</FormLabel>
                <FormControl><Input type="number" min={0} max={100} {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="expectedCloseDate"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Expected Close Date (optional)</FormLabel>
                <FormControl><Input type="date" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      )}
    </ModuleModal>
  );
}
