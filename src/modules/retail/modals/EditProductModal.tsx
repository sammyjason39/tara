/**
 * Edit Product Modal
 *
 * Edit product details (name, SKU, pricing, category).
 * Requirements: 8.1, 16.1
 */

import { FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ModuleModal } from "@/components/shared/ModuleModal";
import { useModuleMutation } from "@/hooks/useModuleQuery";
import { editProductSchema, type EditProductInput, PRODUCT_STATUSES } from "../schemas";
import { useToast } from "@/hooks/use-toast";

interface EditProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  productId: string;
  defaultValues?: Partial<EditProductInput>;
}

export function EditProductModal({ isOpen, onClose, productId, defaultValues }: EditProductModalProps) {
  const { toast } = useToast();

  const mutation = useModuleMutation<EditProductInput, unknown>(
    `/v1/retail/products/${productId}`,
    "PATCH",
    ["/v1/retail/products"]
  );

  const handleSubmit = async (data: EditProductInput) => {
    await mutation.mutateAsync(data);
    toast({ title: "Product updated", description: `"${data.name}" saved.` });
    onClose();
  };

  return (
    <ModuleModal
      schema={editProductSchema}
      defaultValues={{
        name: defaultValues?.name || "",
        sku: defaultValues?.sku || "",
        barcode: defaultValues?.barcode || "",
        description: defaultValues?.description || "",
        categoryId: defaultValues?.categoryId || "",
        basePrice: defaultValues?.basePrice || 0,
        unit: defaultValues?.unit || "",
        status: defaultValues?.status || "active",
      }}
      onSubmit={handleSubmit}
      onCancel={onClose}
      title="Edit Product"
      description="Update product details and pricing."
      isOpen={isOpen}
    >
      {(form) => (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Product Name</FormLabel>
                  <FormControl><Input {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="sku"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>SKU</FormLabel>
                  <FormControl><Input {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="basePrice"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Base Price</FormLabel>
                  <FormControl><Input type="number" min={0} step="0.01" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="unit"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Unit</FormLabel>
                  <FormControl><Input placeholder="pcs, kg, ltr" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          <FormField
            control={form.control}
            name="categoryId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Category</FormLabel>
                <FormControl><Input placeholder="Category ID" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="status"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Status</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {PRODUCT_STATUSES.map((s) => (
                      <SelectItem key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</SelectItem>
                    ))}
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
