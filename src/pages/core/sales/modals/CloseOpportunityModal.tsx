import { FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { z } from "zod";
import { ModuleModal } from "@/components/shared/ModuleModal";
import { useModuleMutation } from "@/hooks/useModuleQuery";
import { useToast } from "@/hooks/use-toast";

const closeOpportunitySchema = z.object({
  status: z.enum(["WON", "LOST"]),
  reason: z.string().max(500).optional().or(z.literal("")),
  quoteId: z.string().optional().or(z.literal("")),
});

type CloseOpportunityInput = z.infer<typeof closeOpportunitySchema>;

interface CloseOpportunityModalProps {
  isOpen: boolean;
  onClose: () => void;
  opportunityId: string;
  accountName: string;
  closeAs: "WON" | "LOST";
}

/**
 * Close Opportunity modal — supports closing as WON or LOST.
 */
export function CloseOpportunityModal({
  isOpen,
  onClose,
  opportunityId,
  accountName,
  closeAs,
}: CloseOpportunityModalProps) {
  const { toast } = useToast();

  const mutation = useModuleMutation<CloseOpportunityInput, unknown>(
    `/v1/sales/opportunities/${opportunityId}/close`,
    "PUT",
    ["/v1/sales/opportunities", "/v1/sales/orders", "/v1/sales/dashboard"]
  );

  const handleSubmit = async (data: CloseOpportunityInput) => {
    await mutation.mutateAsync(data);
    if (data.status === "WON") {
      toast({ title: "Victory!", description: `${accountName} closed as WON.` });
    } else {
      toast({ title: "Deal closed", description: `${accountName} closed as LOST.` });
    }
    onClose();
  };

  return (
    <ModuleModal
      schema={closeOpportunitySchema}
      defaultValues={{
        status: closeAs,
        reason: "",
        quoteId: "",
      }}
      onSubmit={handleSubmit}
      onCancel={onClose}
      title={closeAs === "WON" ? "Close Deal — Won" : "Close Deal — Lost"}
      description={`Close "${accountName}" as ${closeAs}.${closeAs === "LOST" ? " Please provide a reason." : ""}`}
      isOpen={isOpen}
    >
      {(form) => (
        <div className="space-y-4">
          {closeAs === "LOST" && (
            <FormField
              control={form.control}
              name="reason"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Reason for Loss</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Price sensitivity, competitor chosen, timing..."
                      className="min-h-[80px]"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}
          {closeAs === "WON" && (
            <FormField
              control={form.control}
              name="quoteId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Associated Quote ID (optional)</FormLabel>
                  <FormControl><Input placeholder="Quote reference..." {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}
        </div>
      )}
    </ModuleModal>
  );
}
