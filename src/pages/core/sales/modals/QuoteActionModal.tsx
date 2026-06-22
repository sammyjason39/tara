import { FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { z } from "zod";
import { ModuleModal } from "@/components/shared/ModuleModal";
import { useModuleMutation } from "@/hooks/useModuleQuery";
import { useToast } from "@/hooks/use-toast";

const quoteActionSchema = z.object({
  action: z.enum(["submit", "approve", "reject", "send"]),
  comment: z.string().max(500).optional().or(z.literal("")),
});

type QuoteActionInput = z.infer<typeof quoteActionSchema>;

interface QuoteActionModalProps {
  isOpen: boolean;
  onClose: () => void;
  quoteId: string;
  action: "submit" | "approve" | "reject" | "send";
}

const ACTION_ENDPOINTS: Record<string, { path: string; method: "PUT" }> = {
  submit: { path: "submit", method: "PUT" },
  approve: { path: "decision", method: "PUT" },
  reject: { path: "decision", method: "PUT" },
  send: { path: "send", method: "PUT" },
};

const ACTION_TITLES: Record<string, string> = {
  submit: "Submit for Approval",
  approve: "Approve Quotation",
  reject: "Reject Quotation",
  send: "Send to Customer",
};

/**
 * Quote action modal — handles submit, approve, reject, send operations.
 */
export function QuoteActionModal({ isOpen, onClose, quoteId, action }: QuoteActionModalProps) {
  const { toast } = useToast();
  const endpoint = ACTION_ENDPOINTS[action];

  const mutation = useModuleMutation<QuoteActionInput, unknown>(
    `/v1/sales/quotes/${quoteId}/${endpoint.path}`,
    endpoint.method,
    ["/v1/sales/quotes"]
  );

  const handleSubmit = async (data: QuoteActionInput) => {
    // For approve/reject, send the correct payload
    const payload: Record<string, unknown> = {};
    if (action === "approve") payload.approved = true;
    if (action === "reject") payload.approved = false;
    if (data.comment) payload.comment = data.comment;

    await mutation.mutateAsync({ ...data, ...payload } as any);
    toast({ title: `Quote ${action}ed`, description: `Operation completed successfully.` });
    onClose();
  };

  return (
    <ModuleModal
      schema={quoteActionSchema}
      defaultValues={{
        action,
        comment: "",
      }}
      onSubmit={handleSubmit}
      onCancel={onClose}
      title={ACTION_TITLES[action]}
      description={`Confirm ${action} action for this quotation.`}
      isOpen={isOpen}
    >
      {(form) => (
        <div className="space-y-4">
          {(action === "reject" || action === "approve") && (
            <FormField
              control={form.control}
              name="comment"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Comment (optional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder={action === "reject" ? "Reason for rejection..." : "Approval notes..."}
                      className="min-h-[60px]"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}
          <p className="text-sm text-muted-foreground">
            {action === "submit" && "This will move the quotation to Pending Approval status."}
            {action === "approve" && "This will approve the quotation and mark it ready to send."}
            {action === "reject" && "This will reject the quotation and return it to draft."}
            {action === "send" && "This will transmit the approved quotation to the customer."}
          </p>
        </div>
      )}
    </ModuleModal>
  );
}
