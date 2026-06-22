import * as React from "react";
import { useForm, DefaultValues, FieldValues, Path } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2 } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@/components/ui/form";

/**
 * Generic props for the shared modal form component.
 *
 * `T` is a Zod schema type; the form is typed to its inferred output.
 * This pattern is reused across all 8 modules (HR, Finance, Procurement,
 * Sales, Marketing, IT, Inventory, Retail) to provide consistent form
 * validation and user experience.
 */
export interface ModalFormProps<T extends z.ZodType<FieldValues>> {
  /** Zod schema used for client-side validation */
  schema: T;
  /** Initial/default values for the form fields */
  defaultValues: DefaultValues<z.infer<T>>;
  /** Async submit handler — called only when validation passes */
  onSubmit: (data: z.infer<T>) => Promise<void>;
  /** Cancel handler — discards unsaved changes without persisting */
  onCancel: () => void;
  /** Modal title displayed in the dialog header */
  title: string;
  /** Controls modal open/close state */
  isOpen: boolean;
  /** Optional description text shown below the title */
  description?: string;
  /** Render function for form fields. Receives the form instance for field registration. */
  children: (form: ReturnType<typeof useForm<z.infer<T>>>) => React.ReactNode;
}

/**
 * A reusable modal form component that wraps react-hook-form with Zod validation.
 *
 * Features:
 * - Generic Zod schema support for type-safe validation
 * - Inline field-level error messages via FormMessage
 * - Loading state on submit button during async submission
 * - Cancel discards unsaved changes without persisting
 * - Form resets when modal closes or defaults change
 *
 * @example
 * ```tsx
 * const schema = z.object({ name: z.string().min(1) });
 *
 * <ModuleModal
 *   schema={schema}
 *   defaultValues={{ name: "" }}
 *   onSubmit={async (data) => { await api.create(data); }}
 *   onCancel={() => setOpen(false)}
 *   title="Create Employee"
 *   isOpen={isOpen}
 * >
 *   {(form) => (
 *     <FormField
 *       control={form.control}
 *       name="name"
 *       render={({ field }) => (
 *         <FormItem>
 *           <FormLabel>Name</FormLabel>
 *           <FormControl><Input {...field} /></FormControl>
 *           <FormMessage />
 *         </FormItem>
 *       )}
 *     />
 *   )}
 * </ModuleModal>
 * ```
 */
export function ModuleModal<T extends z.ZodType<FieldValues>>({
  schema,
  defaultValues,
  onSubmit,
  onCancel,
  title,
  isOpen,
  description,
  children,
}: ModalFormProps<T>) {
  const form = useForm<z.infer<T>>({
    resolver: zodResolver(schema),
    defaultValues,
  });

  const { isSubmitting } = form.formState;

  // Reset form when modal opens with new defaults or when modal closes
  React.useEffect(() => {
    if (isOpen) {
      form.reset(defaultValues);
    }
  }, [isOpen]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSubmit = form.handleSubmit(async (data) => {
    await onSubmit(data);
  });

  const handleCancel = () => {
    form.reset(defaultValues);
    onCancel();
  };

  // Prevent closing the dialog via overlay click or escape while submitting
  const handleOpenChange = (open: boolean) => {
    if (!open && !isSubmitting) {
      handleCancel();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent
        className="max-h-[85vh] overflow-y-auto sm:max-w-[500px]"
        onPointerDownOutside={(e) => {
          if (isSubmitting) e.preventDefault();
        }}
        onEscapeKeyDown={(e) => {
          if (isSubmitting) e.preventDefault();
        }}
      >
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={handleSubmit} className="space-y-4">
            {children(form)}

            <DialogFooter className="gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={handleCancel}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                {isSubmitting ? "Saving..." : "Save"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

export default ModuleModal;
