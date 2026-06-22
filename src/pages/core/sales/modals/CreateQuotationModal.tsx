import { useState } from "react";
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { ModuleModal } from "@/components/shared/ModuleModal";
import { useModuleMutation } from "@/hooks/useModuleQuery";
import { createSimpleQuoteSchema, type CreateSimpleQuoteInput } from "../schemas";
import { useToast } from "@/hooks/use-toast";
import type { SalesOpportunity } from "@/core/types/sales/sales";

interface CreateQuotationModalProps {
  isOpen: boolean;
  onClose: () => void;
  opportunities: SalesOpportunity[];
}

/**
 * Quotation creation modal.
 *
 * Uses the simple quote schema (amount + discountPercent) for backward compatibility
 * with existing backend. The line item calculation logic (qty × unitPrice - discount)
 * is available in the schemas module for future use when the backend supports full line items.
 */
export function CreateQuotationModal({ isOpen, onClose, opportunities }: CreateQuotationModalProps) {
  const { toast } = useToast();

  const mutation = useModuleMutation<CreateSimpleQuoteInput, unknown>(
    "/v1/sales/quotes",
    "POST",
    ["/v1/sales/quotes", "/v1/sales/dashboard"]
  );

  const defaultOpp = opportunities.length > 0 ? opportunities[0] : null;

  const handleSubmit = async (data: CreateSimpleQuoteInput) => {
    await mutation.mutateAsync(data);
    toast({ title: "Quotation created", description: "New proposal generated successfully." });
    onClose();
  };

  return (
    <ModuleModal
      schema={createSimpleQuoteSchema}
      defaultValues={{
        opportunityId: defaultOpp?.id || "",
        amount: defaultOpp?.amount || 0,
        discountPercent: 0,
        notes: "",
      }}
      onSubmit={handleSubmit}
      onCancel={onClose}
      title="Generate Quotation"
      description="Create a versioned proposal for an active deal."
      isOpen={isOpen}
    >
      {(form) => (
        <div className="space-y-4">
          <FormField
            control={form.control}
            name="opportunityId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Target Opportunity</FormLabel>
                <Select
                  onValueChange={(val) => {
                    field.onChange(val);
                    const opp = opportunities.find((o) => o.id === val);
                    if (opp) {
                      form.setValue("amount", opp.amount);
                    }
                  }}
                  defaultValue={field.value}
                >
                  <FormControl>
                    <SelectTrigger><SelectValue placeholder="Select opportunity" /></SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {opportunities.map((o) => (
                      <SelectItem key={o.id} value={o.id}>
                        {o.accountName} ({o.amount.toLocaleString()})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="amount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Amount</FormLabel>
                  <FormControl><Input type="number" min={0} {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="discountPercent"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Discount (%)</FormLabel>
                  <FormControl><Input type="number" min={0} max={100} {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          <FormField
            control={form.control}
            name="notes"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Notes</FormLabel>
                <FormControl><Input placeholder="Pricing includes enterprise-tier support..." {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      )}
    </ModuleModal>
  );
}
